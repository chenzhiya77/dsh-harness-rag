# harness 构成观测台:构成快照(工厂发布 + run.start 承载)— 设计文档

- 日期:2026-09-10
- 分支:实施时定(听用户指令)
- 上游调研:`../../AGENT_HARNESS_VISUALIZATION_RESEARCH.md`、`../../HARNESS_EXECUTION_FLOW_MAP.md`(十段执行流图)
- 相邻产品线:`2026-09-09-workbench-agent-assembly-design.md`(工作台丙1 / 画布,**不是本 spec 的对象**,边界与术语避让见 §3)
- 计划文档:`../plans/2026-09-10-harness-constitution-snapshot.md`

## 1. 目标

本 spec 只做一件事:**让"这个 run 实际装配出来的 harness 长什么样"成为一个可查询的事实。**

今天的现状是:一次 run 究竟装了哪些 middleware(AGENTS.md 编号的 35 槽里**约 14 个是 optional**,随 config 与 runtime flag 变;实测还有一个**按 agent 追加、编号里根本没有**的,见 §6.6.3)、挂了哪些工具、authorization Layer 1 从目录里**删掉了什么**、deferred 工具有多少个、skill 策略是否收窄了工具集——**这些全部在 `_make_lead_agent` 里算完就丢了**,没有任何持久化痕迹。用户问"为什么我的 agent 没有某个工具",今天没有任何 UI 或 API 能回答。

产出是一个**只读、run 级、代码派生**的构成快照,挂在既有 `run.start` 事件上。它是构成观测台(流程可视化)这条产品线的**数据地基**:后续的阶段投影、实时脉冲、开发者/终端用户双视图全部消费这一份快照,不再各自反推。

**明确不做**:前端渲染(§5)、⑧ 六道闸门的埋点(§5)、新端点(§6.7)、任何执行语义改动。

## 2. 背景与现状(2026-09-10 代码核查,全部带行号)

### 2.1 组装路径:两个 `create_agent` 站点,middleware 未绑定局部变量

`make_lead_agent(config)`(`agents/lead_agent/agent.py:643`)是 LangGraph 图工厂,docstring 明写 **"keep the signature compatible with LangGraph Server"**(:644),因此**返回类型不可改**。它解析 checkpoint 模式后转调 `_make_lead_agent`(:671,:688)。

`_make_lead_agent` 有**两个** `create_agent` 返回点:

| 站点 | 行号 | 分支 | middleware 表达式位置 |
|---|---|---|---|
| bootstrap | :835-862 | `is_bootstrap=True` | :838-850,**内联**在 `create_agent(middleware=...)` 参数里 |
| 常规 | :916-946 | 默认 / custom agent | :919-932,**同样内联** |

两处的形状都是 `normalize_middleware_state_schemas(build_middlewares(...), mode)` 直接作为关键字参数传入,**没有绑定到任何局部变量**。`build_middlewares` 定义在 :373(前置注释 :368-372 记录了位次不变量,如 ClarificationMiddleware 必须最后)。

这是本 spec 唯一需要**改动既有组装代码**的原因(§6.2)。

**为什么构成必须在组装现场取,而不能从编译图读回**:`docs/HARNESS_EXECUTION_FLOW_MAP.md` §10 记录了一条勘查结论——**wrap-only 中间件(只实现 `wrap_model_call` / `wrap_tool_call`,没有 `before_model` / `after_model`)不会成为编译图节点,占比约 15/34 ≈ 44%**,而这一半恰好是安全与治理逻辑:Clarification、InputSanitization、SkillActivation / SkillToolPolicy、Guardrail、ReadBeforeWrite、ToolErrorHandling、SandboxAudit。

即"从编译图反解构成"不只是跨版本易碎(§11),它**结构性地看不见 44% 的链,而且看不见的正是最有解释力的那一半**。这是本 spec 选择"在组装现场交出局部变量"而非任何图侧读取方案的根本原因。

> **该比例已于 2026-09-10 独立实测确认**:grep 全部 middleware 文件的 hook 定义,34 个具名 middleware 中**恰好 15 个只实现 `wrap_*` 而无任何 `before_model`/`after_model`/`before_agent`/`after_agent`**,即 15/34 ≈ 44%,与勘查文档一致。注意同一来源的另一条断言(tag 接入率 2/34)**已被证伪**(§2.7 实测为 4/35),所以这份文档的数字要逐条核，不能整体采信或整体否定。

### 2.2 快照所需的事实全部已在局部作用域内

| 事实 | 行号(常规站点) | 行号(bootstrap 站点) |
|---|---|---|
| runtime flags(`is_plan_mode` / `subagent_enabled` / `max_concurrent_subagents` / `max_total_subagents` / `non_interactive`) | :709-714 | 同 |
| `agent_name` / `is_bootstrap` | :713,:715 | 同 |
| `available_skills` / `agent_config` | :717-718 | — |
| `thinking_enabled` / `reasoning_effort` | :727-728 | :727-728 |
| `model_name`(解析 + 授权后) | :736-740 | 同 |
| checkpoint `mode` | :696-699 | 同 |
| `raw_tools` = `get_available_tools(...)` | :891 | :801 附近 |
| authorization 候选 → 授权后差集 | :895-907 | 同形状 |
| `final_tools` / `setup`(deferred) | :908-909 | :828-829 |
| `mcp_routing_middleware` | :910-914 | :830-834 |
| `skill_setup` | :869-873 | — |

**结论:快照不需要任何新的解析逻辑,只需要把已经算出来的局部变量记录下来。** 这与丙1 的能力清单端点形成对比——后者必须**主动调**枚举函数,因而有冷启动成本与 MCP discovery 副作用风险(丙1 spec §6.1、Task 0 Step 3);本 spec 是搭在**已经发生**的组装上,**零额外解析成本**,丙1 的那项前置核实对本 spec 不适用。

### 2.3 worker 每个 run 重新调工厂,harness 内无 agent 缓存

`runtime/runs/worker.py:814-820`:

```python
agent_factory_kwargs: dict[str, Any] = {"config": initial_runnable_config}
if ctx.app_config is not None and _agent_factory_supports_app_config(agent_factory):
    agent_factory_kwargs["app_config"] = ctx.app_config
from deerflow.extensions import bind_agent_build_extensions
with bind_agent_build_extensions(extensions):
    agent = agent_factory(**agent_factory_kwargs)
```

全 harness grep `_agent_cache|agent_cache|lru_cache.*make_lead|cached_graph` **零命中**。即:

- **Gateway worker 路径**:每个 run 组装一次,图对象每 run 新建。
- **`DeerFlowClient` 嵌入式路径**:有 agent 缓存(cache key 含完整 Principal,见 `backend/AGENTS.md` Embedded Client 节),组装每个 cache key 一次。

载体必须同时兼容这两种频率(§4)。

`bind_agent_build_extensions` 的 `with` 块在 :819-820 就退出;`backend/AGENTS.md` 明确记录这类 graph-build 绑定是"a ContextVar scoped to synchronous construction, so it has already exited by the time the lead agent delegates"。**ContextVar 载体的生命周期不够**(§11 否决备选)。

### 2.4 journal 侧:现成的推送先例与承载点

- `RunJournal` 在 `worker.py:656-662` 创建,**早于** :820 的工厂调用,也早于 :922/:933 的 `agent.astream`。
- `journal.py:815-817` 的 `set_first_human_message(content)` 是**"worker 显式往 journal 推一个事实"**的现成先例(纯赋值 + 截断 2000 字符)。
- `run.start` 的唯一发射点是 `journal.py:325-333`,在 `on_chain_start(parent_run_id=None)` 里:

```python
self._put(
    event_type=RUN_START_EVENT.event_type,
    category=RUN_START_EVENT.category,
    content={"chain": chain_name},
    metadata={"caller": caller, **(metadata or {})},
)
```

回调只能看见 `serialized` / `metadata` / `tags`,**看不见组装出来的 middleware 列表与工具目录**。所以快照必须被**推进来**,不能在回调里拉。

- `_put()`(`journal.py:646-656`)是**纯内存 buffer append**,无 IO。
- `run_inline = True`(:218-222):"Every callback only updates in-memory run state or schedules async IO"。`tests/blocking_io/test_run_journal_callbacks.py` 把这条钉成 CI 门禁。
- `deerflow_loop_bound = True`(:212-216):subagent 跑在另一线程的持久事件循环上,**隔离循环的 context copier 必须不继承 journal**。

### 2.5 契约余量:`run.start` 加字段不是破坏性变更

`contracts/run_event_stream_contract.json:75-89`:

```jsonc
{
  "event_type": "run.start",
  "category": "trace",
  "producer": "RunJournal.on_chain_start(parent_run_id=None)",
  "content_schema": {
    "type": "object",
    "required": ["chain"],
    "properties": {"chain": {"type": ["string", "null"]}},
    "additionalProperties": true        // ← 余量在这里
  },
  "metadata_schema": { ..., "additionalProperties": true }
}
```

`content_schema` 只 `required: ["chain"]` 且 `additionalProperties: true`,**新增 `constitution` 字段无需新 event_type、无需新 category、不破坏任何既有消费者**。

`category: "trace"` 的定义(契约 :64)是 **"Execution evidence that is excluded from message projections"** —— 即它不进消息投影,不会被 IM 通道的 `_accumulate_stream_text` allowlist 捡到(§6.7 的关键安全属性)。

事件定义在 `runtime/events/catalog.py:58`:`RUN_START_EVENT = RunEventDefinition("run.start", "trace")`。

### 2.6 读取路径已存在,无需新端点

`app/gateway/routers/thread_runs.py:1403-1426` 的 `GET /api/threads/{id}/runs/{rid}/events` 已支持 `event_types` 查询参数(:1407),逗号分割(:1418)后传入 `event_store.list_events(event_types=types, ...)`(:1422)。既有消费者先例:`context:memory` 就是靠 `?event_types=context:memory` 查的。

### 2.7 旁路纪律的现成范本(⑧ 用,本 spec 引用其形状)

`record_middleware`(`journal.py:819-831`)的四个既有调用点形状完全一致:

```python
journal = context.get("__run_journal")
if journal is None:
    return                       # 拿不到就静默跳过
try:
    journal.record_middleware(TAG, name=..., hook=..., action=..., changes={...})
except Exception:
    logger.warning(...)          # 审计失败绝不影响执行
```

`guardrails/middleware.py:86-89` 把契约写明:**"audit persistence is best-effort and must never change tool execution behavior. Runtimes without `__run_journal` (including embedded and subagent execution) skip persistence."**

`__run_journal` 注入点:`worker.py:771-776`(注释说明双下划线前缀标记 runtime 内部通道)。

**当前接入率(2026-09-10 实测):4 / 35。** 全 harness grep `record_middleware\(` 只有四个调用点——`guardrails/middleware.py:115`、`safety_finish_reason_middleware.py:320`、`skill_activation_middleware.py:300` 与 `:539`,对应 `catalog.py:79-82` 的四个 tag(`guardrail` / `safety_termination` / `skill_activation` / `skill_secrets`)。

> **修正一条过期记载**:`docs/HARNESS_EXECUTION_FLOW_MAP.md` §10 记的是"接入率 2/34,只有 summarization 与 title"。本次核查证伪——**summarization 与 title 都没有调用点**,实际发事件的是上述四个。⑧ 的埋点规划以本 spec 的实测为准。

**记录内容的纪律先例**:`safety_finish_reason_middleware.py:292-295` 明确**不记录 tool arguments**——"those are the very content the provider filtered; persisting them would defeat the purpose of the safety filter"。本 spec 沿用同一纪律(§6.5)。

## 3. 与相邻产品线的边界(术语避让 + 不合并)

丙1 spec §3 已经为两条线立法。本 spec **继承该立法,不另造术语**。

| 维度 | 工作台丙1(画布) | 本线(构成观测台 / 流程可视化) |
|---|---|---|
| 产物来源 | **用户创作**的资产(`SOUL.md` / `config.yaml` / 未来 workflow JSON) | **代码派生**,只读 |
| 生命周期 | 要存 / 改 / 引用 / 导出 | **无生命周期**,run 结束即定格 |
| 时间点 | 设计时(某个具名 agent) | 运行时(某一次具体 run) |
| 覆盖维度 | `tool_groups` / `skills` / `model` 三项 | **含 middleware 链**、authorization 删除项、optional 开关实际生效情况、deferred setup |
| 可编辑 | 是 | **否**(middleware 位次不变量被测试钉死,不可编排) |
| 端点 | 新增 `GET /api/agents/{name}/capabilities` | **不新增**,复用 `?event_types=run.start` |

**术语裁决(沿用丙1 spec §3,本 spec 不新造):**

- 本线使用 **构成**(Constitution)。丙1 spec §3 已把该词划归 harness 观测台线,并把「能力清单」划归丙1。
- **禁用 装配 / Assemble** —— 丙1 spec §3 划归丙1 的 UI 文案。因此本 spec 的代码命名统一用 `constitution`,**不用 `assembly`**,避免两条线在代码层撞词。
- **禁用 Canvas / Studio / 单用 Flow** —— 丙1 spec §3 已裁决。

**唯一 sanctioned 共享点:`run_events` 遥测**(与 `@xyflow/react`)。本 spec 把快照挂在 `run.start` 上,正是走这个共享点,**不共享数据模型、不共享端点、不共享 schema**。

**一处主动对齐(不是合并):** 丙1 spec §11.1 要求 `tools[]` / `skills[]` 条目字段名按可复用设计(`name` / `source` / `group` / `opt_in`),理由是"同一套节点描述形状,两种过滤范围"。本 spec 的 `tools.mounted[]` 条目**沿用 `name` / `source` / `group` 三个字段名与 `source` 取值域(`tool_group` / `skill` / `mcp` / `builtin`)**,以免仓库里出现第三种工具描述词汇(同类病理见知识库的三套文件类型系统)。**信封形状各自独立,不共用类型定义**——两者真值条件不同:丙1 从存储声明派生(不知道 authorization 删了什么),本 spec 从真实组装派生。

## 4. 载体裁决:进程内 WeakKeyDictionary 注册表

**裁决:新增 `deerflow/agents/constitution_record.py`,持有一个 `WeakKeyDictionary[compiled_graph, dict]`。**

必须同时满足四个约束:

1. `make_lead_agent` 返回类型不可变(:644 的 LangGraph Server 签名契约)
2. 两条路径的组装频率不同(§2.3):worker 每 run 一次、client 每 cache key 一次
3. 不能依赖 journal(TUI 走 `DeerFlowClient` 无 journal,但照样应该能读到构成)
4. 不能泄漏(每 run 新建的图不能被永久持有)

WeakKeyDictionary 满足全部四条:worker 路径下发布→查询→图出作用域→弱引用自动回收,字典恒小;client 路径下一条记录被多次查询,不重算;注册表本身与 journal 无耦合。

```python
_RECORDS: WeakKeyDictionary[Any, dict] = WeakKeyDictionary()

def publish_constitution(graph: Any, record: dict) -> None:
    try:
        _RECORDS[graph] = record
    except TypeError:                 # 图不可弱引用 → 降级,绝不影响组装
        logger.warning("constitution snapshot unpublished: graph not weak-referenceable")

def constitution_for(graph: Any) -> dict | None:
    try:
        return _RECORDS.get(graph)
    except TypeError:                 # 不可哈希 → 视为无记录
        return None
```

**两个函数都必须吞 `TypeError`**:图不可弱引用或不可哈希时降级为"无快照",不能因为一个观测埋点炸掉 agent 构建。这条要单测钉住(§10)。

#### 4.1 已实测:编译图确实可弱引用且可哈希(Task 0 Step 1,2026-09-10)

**判定:条件①成立(两者皆可),按本节注册表实施;§8 风险 1 关闭。** 实测环境 `langgraph 1.2.9` / `langchain 1.3.14` / `langchain-core 1.4.9`,用一个一次性脚本(`.deer-flow/probe_weakref.py`,已删)直接跑 `create_agent(...)` 的返回值:

| 事实 | 实测结果 | 为什么它重要 |
|---|---|---|
| 返回类型 | `langgraph.graph.state.CompiledStateGraph` | 与裸 `StateGraph.compile()` **同一个类**(`type(...) is` 为真)——中间件数量不改变类型 |
| **可弱引用** | ✅ `weakref.ref(graph)` 成功 | WeakKeyDictionary 的前置条件 |
| **可哈希** | ✅ 且 `type(g).__hash__ is object.__hash__`(身份哈希),`type(g).__eq__ is object.__eq__`(**没有自定义值相等**) | 身份哈希是关键:若它定义了 `__eq__` 而不定义 `__hash__`,实例会变成不可哈希 |
| 注册表往返 | ✅ `wkd[graph] = record` → `wkd.get(graph)` 命中;两个不同图是**两个不同的键** | 单条发布不会误命中别的 run |
| **回收** | ✅ 丢掉强引用 + `gc.collect()` 后条目**消失**(2 → 1 → 0) | worker 路径"每 run 新建图"不泄漏,这正是本节选注册表而非持有列表的理由 |
| 两个降级分支可达 | ✅ 非弱引用对象(`__slots__` 无 `__weakref__`)→ `TypeError`;不可哈希对象 → `TypeError`;且**不可哈希对象仍可弱引用** | 两个 `except TypeError` 覆盖的是**两种独立**失败模式,不是冗余 |
| 带 middleware 的变体 | ✅ 类型、弱引用、哈希行为全不变 | 生产两个站点**恒定**传 middleware,必须确认这一点不改变结论 |

**MRO 解释了原因**:`CompiledStateGraph` → `Pregel` → `PregelProtocol` → `Runnable` → `ABC`/`Generic` → `object`,全程无 `__slots__`,实例带 `__dict__` → 天然支持弱引用。

**为什么这条结论要带版本号**:身份哈希与弱引用能力都是**上游实现细节**,不是契约。若未来 `langgraph` 给 `Pregel` 加 `__eq__`(或加 `__slots__`),载体就会**静默降级**成"无快照"——因为本节的两个函数刻意吞 `TypeError`,不会有任何东西变红。因此 §10 加一条**看门测试**把这个假设钉在当前行为上,让上游升级变成一次显式失败而不是无声失效。

## 5. 范围裁决

**本 spec 不做,且各有归属:**

| 不做的事 | 归属 | 理由 |
|---|---|---|
| ⑧ 六道闸门埋点(ReadBeforeWrite 拦截 / ToolProgress WARNED-BLOCKED / subagent 限额截断 / deferred 提升) | 另立 spec | 纯旁路,照抄 §2.7 的 `record_middleware` 形状,与本 spec 无耦合,可独立实施 |
| subagent 侧 `loop_capped` / `token_capped` | **无需新 spec** | 通道已存在:`SubagentResult.stop_reason` → `task_tool._task_result_command` → `make_subagent_additional_kwargs` → `subagent_stop_reason` → 落进 `subagent.end`。前端只需渲染 |
| **subagent 的构成快照** | **本 spec 不做 → §12 第 7 项** | **不是硬墙,我一度说错了。** 只有 **journal 通道**跨不过去(`deerflow_loop_bound=True`,journal 被摘除);但 §4 的注册表是**进程级** `WeakKeyDictionary`,子代理图由 `build_subagent_runtime_middlewares` 经同一个 `create_agent` 组装 → **注册表里本来就有它**。所以只差"谁来把记录送出去":沿用 `stop_reason` 那条**现成**的加性字段通道即可(`SubagentResult` 里带一份,worker 侧写进 `subagent.end`)。**时序约束**:`constitution_for(graph)` 必须在子代理图仍存活时读(在 `_aexecute` 内、图释放前),不能等执行器返回后再查——否则弱引用已被回收。 |
| 前端构成视图渲染 | 另立 spec | 本 spec 只定数据契约;渲染涉及 stage 投影、双受众文案、i18n、路由资产预算 |
| 新读取端点 | **不做** | §2.6 已证明 `?event_types=run.start` 够用 |
| 十段流图里的 **②③⑨** 三段 | **不做** | 已判定为管道而非构成:② nginx 无 run 事件、③ 发生在 run_id 存在之前、⑨ 是纯序列化(其 `gap` 帧恢复已由前端 `core/api/api-client.ts` 自行呈现并 `toast.warning`,不需要构成快照参与)。画成盒子只会给用户无法行动的信息 |
| **①** 的设计时预览("这次 run 会用什么") | **不做** | 属**设计时**(某个具名 agent)而非**运行时**(某一次 run),归丙1 的 `GET /api/agents/{name}/capabilities`(§3 的不合并原则)。构成快照是事后事实,回答不了"按下发送之前会得到什么"。今天 composer 里 plan mode 由 `mode` 静默派生(`core/threads/hooks.ts:2240`)且无任何呈现——那个缺口在丙1 侧,不在本线 |
| 十段流图里的 **④⑥** 两段(准入拒绝 / worker 预检失败) | **本 spec 不做,但已认领 → §12 第 5 项** | 它们不是构成,但**是十段里可行动性最高的一段**:后端已给出类型化状态码与具体 `detail`(实测清单见 §12 第 5 项),前端却把它们全部塌进一条会消失的 toast(`core/threads/hooks.ts:1864`)。用本节同一把尺子("画成盒子只会给用户无法行动的信息")量,这两段恰恰最该被呈现,**不能以"管道"为由一并否掉**。原表把 ①②③④⑥⑨ 作一行排除,是一次过度归并,2026-09-10 已就地拆开 |

## 6. 设计

### 6.1 注册表模块

新建 `backend/packages/harness/deerflow/agents/constitution_record.py`:纯数据 + 注册表,**不 import LangGraph、不 import `app.*`**(受 `tests/test_harness_boundary.py` 约束)。

导出:`publish_constitution(graph, record)`、`constitution_for(graph)`、`build_constitution_record(**facts)`、`STAGE_OF_MIDDLEWARE`(§6.6)、`MAX_CONSTITUTION_BYTES`、`MAX_TOOL_NAMES`。

`build_constitution_record` 负责字段收集、stage 映射与**截断**,是纯函数,可单测。

### 6.2 工厂侧发布(唯一非旁路改动)

两个站点都要改。改法是把 middleware 表达式提成局部变量,然后发布:

```python
# agent.py:919-932 现状 → 改为
middlewares = normalize_middleware_state_schemas(
    build_middlewares(config, model_name=model_name, agent_name=agent_name, ...),
    mode,
)
graph = create_agent(
    model=create_chat_model(...),
    tools=final_tools,
    middleware=middlewares,
    system_prompt=apply_prompt_template(...),
    state_schema=get_thread_state_schema(mode),
)
publish_constitution(graph, build_constitution_record(
    middlewares=middlewares,
    tools=final_tools,
    deferred_setup=setup,
    authorization_candidates=authorization_candidates,
    authorized_tools=authorized_tools,
    model_name=model_name,
    thinking_enabled=thinking_enabled,
    reasoning_effort=reasoning_effort,
    agent_name=agent_name,
    is_bootstrap=False,
    checkpoint_mode=mode,
    skill_setup=skill_setup,
    mcp_routing_built=mcp_routing_middleware is not None,
    app_config=resolved_app_config,
    is_plan_mode=is_plan_mode,
    subagent_enabled=subagent_enabled,
    max_concurrent_subagents=max_concurrent_subagents,
    max_total_subagents=max_total_subagents,
    non_interactive=non_interactive,
))
return graph
```

bootstrap 站点同形状,只有 `is_bootstrap=True` 不同。

> **一处与本文早期草稿不符的实测更正**:草稿写"bootstrap 无 `agent_name` / `skill_setup`",**代码里两个都有**——`skill_setup` 是 `if is_bootstrap:` 分支内部自己构建的(`build_skill_search_setup(bootstrap_skills, ...)`),`agent_name` 在函数作用域内。**两个都照传**(bootstrap 记下"这是为哪个 agent 做的引导装配"比留空更有用)。Task 2 的实现因此把两个站点的事实列表写成同一个形状,只差 `is_bootstrap`。

**实现形状(Task 2 落地)**:两个站点都把构建与发布收敛到同一个模块级助手,避免把 20 行 try/except 抄两遍:

```python
def _publish_constitution_snapshot(graph: Any, **facts: Any) -> None:
    """Record which harness this run actually assembled. Observability only."""
    try:
        publish_constitution(graph, build_constitution_record(**facts))
    except Exception:
        logger.warning("constitution snapshot unpublished", exc_info=True)
```

**`constitution_record` 的模块级导入是安全的**,但前提是它自己不 import `deerflow.tools`:为此 `_tool_source` 里的 `is_mcp_tool` **改成了函数级导入**(`agent.py` 一直懒加载 `deerflow.tools` 就是在躲循环依赖,模块级拉进来会把它带进导入链)。

**传入的是 `authorization_candidates` 与 `authorized_tools` 两个列表,由 `build_constitution_record` 算差集**,而不是在工厂里算——保持工厂侧只做"交出局部变量",派生逻辑集中在可单测的纯函数里。

**两条实施约束(Task 1 落地时确定,Task 2 照此接线):**

1. **`app_config` 是必需的入参,别漏。** 快照里有两个字段只能从它读:`tools.auto_promote_top_k`(`tool_search.auto_promote_top_k`)与 `skills.deferred_discovery`。两个都是 `getattr` 链读取、缺了会静默落默认值(`0` / `False`)——这正是本 spec 最讨厌的那类"看起来有答案的错答案",所以调用点必须显式传 `resolved_app_config`。
2. **`agent_name` 必须走 `build_middlewares` 的第三个位置参数,不能塞进 `config["configurable"]`。** 它决定 `_extra_agent_middlewares` 是否追加 `DeepResearchMiddleware`;塞进 configurable 会**静默**装出默认链而不是 rag 链(我的 Task 1 测试第一版就是这么写错的,guard test 当场抓出来了——这也是那条 guard test 的第一个真实战果)。

**值与顺序完全不变**,但确实动了组装代码,两处都要动。

### 6.3 journal 承载

`journal.py` 加 setter,照抄 `set_first_human_message`(:815-817)的形状:

```python
def set_constitution(self, record: dict) -> None:
    """Attach the run's derived harness constitution (pure assignment, no IO)."""
    self._constitution = record
```

`on_chain_start(parent_run_id=None)`(:325-333)改为**只在第一次**带上:

```python
content = {"chain": chain_name}
if self._constitution is not None and not self._constitution_emitted:
    content["constitution"] = self._constitution
    self._constitution_emitted = True
self._put(event_type=..., category=..., content=content, metadata=...)
```

**为什么需要 first-time-only 守卫(已实测确认,2026-09-10 Task 0 Step 2):**

静态链路:`_stream_once` 在用户轮调用一次(`worker.py:979`),之后 **goal continuation 循环里每轮再调用一次**(`worker.py:996`);每次 `_stream_once` **恰好调用一次 `agent.astream`**(:922 单模式 / :933 多模式分支)。journal 只在基础 config 的 `callbacks` 里挂一次(:783-784),而 `_continuation_runnable_config()` 是 `dict(config)`(:805-812)——**同一个 callbacks 列表**,所以每一次 astream 都带着同一个 journal。

**实测(真实 `create_agent` 图 + 真实 `RunJournal` + `MemoryRunEventStore`,两个连续 `astream` 模拟"用户轮 + 一次 continuation"):**

| 观察 | 结果 |
|---|---|
| 用户轮后根级 `on_chain_start` 数 | 1 |
| continuation 后根级 `on_chain_start` 数 | **2** |
| **journal 实收 `run.start` 事件数** | **2**(`seq` 1 与 7) |
| 嵌套 chain start(被 journal 过滤掉) | 6 − 2 = 4 |

结论:**一次 run 会发多条 `run.start`,守卫是必需而不是冗余。** 没有它,每个 continuation 都会再存一份 35 项快照——快照在每个 goal 循环里重复,正是要避免的。

> **两条实测边界(同一探针)**:① 图跑 **model→tools→model** 多超步(带 checkpointer)时,单次 astream 仍然只有 **1** 次根级 start —— 所以"一次 astream = 一条 `run.start`",与超步数无关;② `subgraphs=True` 单模式下仍是 **1** 次 —— **子图流式不产生额外根级 start**(与 `deerflow_loop_bound` 把 journal 从 subagent 回调里摘掉一致)。③ 多模式 `["values","messages"]` 变体**未能验证**:`GenericFakeChatModel` 在流式多模式下产不出 generation,是探针假模型的限制,不是产品结论。**若日后要重现,用真实模型或换一个可流式的假模型。**

`set_constitution` 必须是**纯赋值**:`run_inline = True`(:218-222)+ `tests/blocking_io/test_run_journal_callbacks.py` 把"回调只做内存活"钉成 CI 门禁。

### 6.4 worker 接线

`worker.py` 在 :820 之后、:922/:933 的 `astream` 之前:

```python
if journal is not None:
    record = constitution_for(agent)
    if record is not None:
        journal.set_constitution(record)
```

顺序安全性:journal 在 :656 已建,`on_chain_start` 只在 astream 时触发,中间没有图调用。

`agent_factory` 是可注入的(`_agent_factory_supports_app_config(agent_factory)`,:815),自定义工厂不发布 → `constitution_for` 返回 `None` → `run.start` 保持今天的样子。**fail-open 到"无快照",不 fail-closed。**

### 6.5 快照字段与上限

```jsonc
{
  "schema_version": 1,
  "model": {"name": "dashscope:qwen3-max", "thinking_enabled": true, "reasoning_effort": null},
  "agent": {"name": "rag", "is_bootstrap": false},
  "checkpoint_mode": "full",
  "runtime_flags": {
    "is_plan_mode": false, "subagent_enabled": true,
    "max_concurrent_subagents": 3, "max_total_subagents": 6, "non_interactive": false
  },
  "stages": [
    {"key": "intake",   "loop": false, "members": 2,  "gates": 0, "handoff_gates": 0},
    {"key": "context",  "loop": true,  "members": 12, "gates": 0, "handoff_gates": 0},
    {"key": "model",    "loop": true,  "members": 3,  "gates": 5, "handoff_gates": 0},
    {"key": "tools",    "loop": true,  "members": 4,  "gates": 5, "handoff_gates": 1},
    {"key": "epilogue", "loop": false, "members": 2,  "gates": 0, "handoff_gates": 0}
  ],
  "middlewares": [
    {"name": "ThreadDataMiddleware", "stage": "intake", "kind": "member",
     "hooks": ["before_agent"], "frequency": "once_per_run"},
    {"name": "TitleMiddleware", "stage": "epilogue", "kind": "member",
     "hooks": ["after_model"], "frequency": "per_model_call"},
    {"name": "LoopDetectionMiddleware", "stage": "model", "kind": "overlay", "overlay_kind": "guard",
     "hooks": ["before_agent", "after_agent", "after_model", "wrap_model_call"], "frequency": "per_model_call"},
    {"name": "ClarificationMiddleware", "stage": "tools", "kind": "overlay",
     "overlay_kind": "handoff", "exits_run": true,
     "hooks": ["wrap_tool_call"], "frequency": "per_tool_call"}
  ],
  "tools": {
    "mounted": [{"name": "hybrid_search", "source": "tool_group", "group": "rag"}],
    "mounted_count": 23,
    "deferred_names": ["mcp_x__y"],
    "deferred_count": 12,
    "auto_promote_top_k": 3,
    "truncated": false
  },
  "tool_authorization": {"removed": ["dangerous_tool"], "removed_count": 1},
  "skills": {
    "available_count": 8, "deferred_discovery": false,
    "describe_skill_bound": false
  },
  "mcp_routing_built": true
}
```

> **`skills.active_names` 已删除(2026-09-11)。** 它原先写死为 `[]`(`constitution_record.py:419`),而**结构上不可能有别的值**:快照在**图构建时**产生(`_make_lead_agent`),而 skill 激活发生在**图运行中** ⇒ 构建时必然为空。留着它等于邀请前端把"没有 skill 激活"渲染成一个事实(而用户刚打过 `/skill-name`)。**前端要这个信息就读 `middleware:skill_activation` 事件**(通道已存在)。趁 `6c350316` 未推送、零消费者,删除免费。

**`hooks[]` 与 `frequency` 的分工(2026-09-10 裁决:取消 `mixed`,如实报出 hook 集合):**

- **`hooks[]` 是原始事实** —— 该 middleware 实际覆写了哪些 hook,由 §10 的覆写探测得出,按**固定枚举顺序**排列(`before_agent` → `after_agent` → `before_model` → `wrap_model_call` → `after_model` → `wrap_tool_call`),让测试可以钉等值。**顺序是契约的一部分**,因为它决定序列化字节,同一条链必须每次产出同一串。
- **`frequency` 是派生字段** —— 服务端按固定规则从 `hooks[]` 算出,取值**收敛为三个**:`once_per_run` / `per_model_call` / `per_tool_call`。派生规则(写死在服务端,guard test 钉规则本身):
  1. 含任一 model 相位 hook(`before_model` / `wrap_model_call` / `after_model`)→ `per_model_call`;
  2. 否则含 `wrap_tool_call` → `per_tool_call`;
  3. 否则(只剩 agent 相位 hook)→ `once_per_run`。
- **`mixed` 已取消。** 旧口径的第四值 `mixed` 覆盖 9/34 ≈ 26%,它的真实含义只是"这个 middleware 实现了多个 hook"——那不是一种频率,是**把信息缺口伪装成一个取值**;而且它与 §6.6.2 自己的原则冲突(frequency 被定为**代码事实**、探测得出、不写第二张表以免漂移,那么最忠实的代码事实就是 hook 集合本身,`mixed` 是对它的一次有损压缩)。26% 的条目渲染出来写着"视情况",等于四分之一个视图没有答案。
- **渲染含义**:需要"每圈都跑 / 每 run 一次 / 每次工具调用"这种粗粒度时读 `frequency`(它仍是 §6.6.2 那个"让脉冲知道该绕几圈"的轴);需要知道**具体是哪几个 hook** 时读 `hooks[]`(`LoopDetection` 的 `mixed` 变成 `["before_agent","after_agent","after_model","wrap_model_call"]`,开发者档可以如实展开:它在 agent 两端和 model 之后各有一手)。**不再有任何条目落进"视情况"。**

**上限**(房子风格已有先例:`MAX_FORM_SERIALIZED_BYTES` = 16KB、`set_first_human_message` 截 2000、`SUBAGENT_STEP_MAX_CHARS`、`_REASON_MESSAGE_LIMIT`):

- `MAX_CONSTITUTION_BYTES = 16 * 1024`,对齐表单先例。超限 → 先丢 `tools.mounted` 明细只留 `mounted_count`,再超限则丢 `middlewares` 明细只留 `stages` 汇总,并置 `truncated: true`。**降级顺序是固定的**,以保证最有解释力的字段(`tool_authorization.removed`)最后才丢。
- `MAX_TOOL_NAMES = 200`。**它同时约束 `tools.mounted` 与 `tools.deferred_names` 两个列表**(各自截断到同一上限),`tools.truncated: true` 表示其中任一被截。**只约束 `mounted` 是本条风险的实际来源**:`deferred_names` 的长度由第三方 MCP server 决定,既不受本仓代码也不受本机配置约束(见 §6.5.1)。

#### 6.5.1 实测:真实载荷只有 16 KB 的三分之一(Task 0 Step 3,2026-09-10)

本机真实 `config.yaml` + `extensions_config.json` 装配,载荷按**下界口径**构造(所有行写成 `kind:"member"` + `stage:"context"`,不含 `overlay_kind`/`exits_run`;`tool_authorization.removed`、`skills`、`deferred_names` 全为空):

| 组成 | 字节 | 说明 |
|---|---|---|
| `middlewares[]`(25 条,含 `hooks[]`) | **3,574** | 每条约 143 B;`hooks[]` 约占其中 15-25% |
| `tools.mounted`(15 个工具名) | ~1,000 | 每名约 65-70 B |
| 其余字段(stages / flags / skills / authorization) | ~1,100 | |
| **合计** | **5,656**(含 MCP 工具 5,742) | **约 16 KB 的 35%** |

**结论:常规配置不紧,还有约一倍余量。** `hooks[]` 相对旧口径的增量约 **1 KB(8%)**,**不是主因**——它一度被本 spec 写成承压原因,2026-09-10 实测纠正。

**实现落地后的复测(Task 1 完成,2026-09-10):真实模块 + 真实链 27 条 → `serialized_size` = 6,122 B = 16 KB 的 37.4%。** 比上表的 5,656 B 高约 8%,差额来自上表是**下界口径**(所有行写死 `kind:"member"` + `stage:"context"`,不含 `overlay_kind`/`exits_run`,且只 25 行),而真实载荷带上了 27 行、真实的 stage/kind/overlay 字段。**结论不变,量级不变**——"下界"这个标注是对的,以后要引用就引用 **6.1 KB / 37%** 这个实测值。同一轮复测还确认了 `Σ(stages[].members+gates+handoff_gates) == len(middlewares)` 在真实链上成立。

**真正会把它推向上限的是工具名清单。** `mounted` 随挂载工具数走(本次 15 个);**`deferred_names` 才是最大的不确定性**——本次为空只因为 `tool_search` 默认关闭,一旦开启且配了多个 MCP server,一个 server 就能吐几十个工具名,封顶 200 个名字约 **5 KB**。这也是 §6.5 那条把 `MAX_TOOL_NAMES` 同时套到两个列表上的理由。

预算若真逼近上限,可用杠杆是**下调 `MAX_TOOL_NAMES`** 与走上面那条固定降级序,**不能按受众裁字段**——§6.8 的裁决是"服务端只发一份真相,前端按模式选择读哪几个字段",给开发者档多发/少发一份 `hooks[]` 就等于把两条线拆成两套载荷,是那份裁决明确拒绝的。

> **另一条实测口径提醒**:`stages[]` 的计数必须**来自本次实际挂载的链**,不是 §6.6.3 那张表的合计。本机实测只挂了 **25 条**(intake 2 / context 9 / model 3 member+3 gate / tools 2 member+3 gate+1 handoff / epilogue 2),而表的合计是 **34**——差在 9 个 optional 未生效(Guardrail / ToolProgress / TokenBudget / McpRouting / DeferredToolFilter / ViewImage / Todo / SubagentLimit / DeepResearch)。**样例里那些计数是示意值,照抄表的合计就会描述"可能装什么"而不是"这次装了什么"**,正好是本 spec 存在的理由的反面。§10 用一条关系不变量钉住它。

**绝不记录**(沿用 `safety_finish_reason_middleware.py:292-295` 的纪律):

- tool schema 全文 / 参数定义
- system prompt 正文(含 `SOUL.md`)
- 任何 secret、`required-secrets` 的**值**(名字可以,值不行——对齐 `middleware:skill_secrets` 只记 skill 与 secret 名)
- 被 guardrail 或 safety filter 拦下的具体内容

### 6.6 stage 归属表 + 防腐 guard test

**stage 由服务端拥有**(它是契约,不是前端猜的)。

#### 6.6.1 裁决:五段**环形** + 闸门覆盖层,不是七段、也不是线性五格

初版提过七段(`intake / context / model / tools / guards / synthesis / delivery`),**已否决**,三条理由:

1. **`guards` 不是一个位次**。Guardrail / SandboxAudit / ReadBeforeWrite / ToolProgress / ToolErrorHandling 是 `wrap_tool_call`,发生在工具调用**内部**;SubagentLimit / LoopDetection / TokenBudget / SafetyFinishReason 是 `after_model`,发生在模型响应**之后**。它们不是一个顺序步骤,是**包裹在别的步骤外面的层**。把它们画成管道上的第六格是错的。
2. **`synthesis` 与 `delivery` 一个装了三种频率、一个几乎是空的**。`synthesis` 里 TerminalResponse 是 model 侧的 recovery 闸门、Title 实测是 `after_model`(**每圈检查**)、Todo 是每圈的状态维护——三种不同频率挤在一格;`delivery` 里只有 Memory(`after_agent`,每 run 一次),而真正的交付事实 `run.delivery` 回执产自 worker,**根本不在 middleware 链内**。把"每圈都走的位次"和"结束时走一次的收尾"混在一条线性管道里,会让脉冲动画无处可走。
   > 初版这条理由写的是"Title 与 Memory 都是 `after_agent`",**已被 §6.6.2 的 hook 实测推翻**(Title 是 `after_model`)。结论不变,但依据换成了上面这个——记录在此以免日后有人按错误的旧依据重新论证。
3. **分布失衡**:七段版里 guards 9 个、delivery 1 个。一段装 9 个、一段装 1 个,通常说明分类是硬凑的。

**二次裁决(2026-09-10,用户批"环形"):布局是环形,不是线性五格。**

否决七段之后,初版落到"五段线性管道"。这个形状**也已被否决**,理由是否决七段的第 2 条自己给出的:真实时间结构是

```
intake(每 run 一次) → [ context → model ⇄ tools ] × N 圈 → epilogue(每 run 一次)
```

线性五格把 `context` 画成"第二步",而它 12 个成员**每圈都走**;`model ⇄ tools` 的双向循环被画成两个先后格子;`epilogue` 里的 Title 实测 `after_model`(每圈检查,§6.6.2),却要画在最后一格。初版对此的补救是给 `frequency` 加**文字标注**("每圈检查")——那是**用文字补形状的债**:五个格子里第几个亮了,与"这件事每圈都在发生",是两个互相矛盾的信号同时出现在同一张图上。

**环 ≠ 洋葱。** §11 否决的是"按包裹深度同心分层"的洋葱视图(它确实承载不了"走到哪");环形是把**同一条线性管道首尾接起来**,它同时承载:

- **位次** —— 指针沿环走,`intake` 是入口弧、`epilogue` 是出口弧,满足用户"流程走到哪"的原始需求;
- **圈结构** —— 循环体就是环本身,走 N 圈是指针绕 N 圈,不需要任何文字标注来解释;
- **闸门** —— 仍作徽标挂在 `model` / `tools` 两段弧上,不占弧长。

**代价(明码记录,不粉饰):** ① 环形布局在窄面板里比五个格子贵,React Flow 的自动布局对环形不友好,大概率要手写极坐标定位;② `epilogue` 的出口弧与 `handoff` 闸门(`Command(goto=END)`)的"提前离场"需要单独画一条离开环的边,否则"交给用户了"在环上无处可去;③ 资产预算要重新过 `pnpm perf:check`。**这三条都在前端 spec 里付,不影响本 spec 的数据契约。**

**新增字段:`stages[].loop`(布尔)。** 环形渲染必须知道哪几段构成循环体。这个事实**由服务端拥有**,不让前端从 key 顺序推("首尾之间就是循环体")——§6.6.4 已经写明理由:让前端按名字猜结构,加一个 stage 就会静默错位而没有任何测试变红。而且本 spec 已经存在**第六个 stage**:`extension` 兜底段(§6.6.3),它在环上的位置是开放项(§8 风险 11),前端推导必然在这一步猜错。`loop` 是布尔,不违反 §6.8 的策展投影不变量(`stages[]` 里仍然没有任何 middleware 真名)。

**裁决后的形状:**

| kind | 取值 | 含义 | 渲染 |
|---|---|---|---|
| 环上阶段 | `intake` / `context` / `model` / `tools` / `epilogue` | 有位次;`loop: true` 的三段构成循环体 | 环上的弧段;`intake` 是入口弧、`epilogue` 是出口弧,指针沿环走 N 圈 |
| 覆盖层 | `overlay_kind: "guard"` | 包裹 `model` 或 `tools`,拦不拦/封不封/要不要硬停 | 挂在所属弧段上的闸门徽标,**不占弧长** |
| 覆盖层 | `overlay_kind: "handoff"` + `exits_run: true` | 中断到 END、把控制权交回人 | 与 guard 视觉不同:不是"被拦",是"交给你了";渲染为一条**离开环**的边 |

`epilogue` 容纳**目的上属于 run 级收尾**的成员(Title / Memory)与 worker 侧的 ⑩ 交付事实(`run.delivery` / `workspace_changes`)。三者 producer 与频率都不同:Memory 是 `after_agent`(每 run 一次),**Title 实测是 `after_model`(每圈检查)**(§6.6.2),交付事实产自 worker 而非 middleware。因此 `epilogue` 的 `members` 计数**只数 middleware**,交付事实由前端另从 `run.delivery` 事件读。

> **环形解决不了的一项残留矛盾,必须留在文字层:** Title 按**目的**归 `epilogue`(出口弧),但按 **hook** 是 `after_model`(每圈触发)。也就是说它坐在环的出口上、却每圈都在跑。环形把 `context`/`model`/`tools` 的循环结构变成了形状,但这一项**没有形状可表达**——它需要 `frequency` 标注("每圈检查")兜住。这不是分类失败,是"按它改变了什么归类"这条规则(§6.6.2 轴一)的必然产物:一个成员的目的与它的触发时机可以分属环上两处。**渲染时不得假定出口弧只在末尾亮一次。**

#### 6.6.2 分类规则:**stage 与 frequency 是两个独立的轴**

**轴一 —— stage,按"它改变了什么"归类,不按"它实现了哪个 hook"归类。** hook 决定它能否成为编译图节点(§2.1),但不决定它的语义角色。据此:

- `ToolOutputBudget` / `ToolResultSanitization` 虽然 hook 是 `wrap_tool_call`,但**目的是改变重新进入上下文的内容** → 归 `context`,不归 `tools`。
- `SkillActivation` 注入 SKILL.md 正文 → `context`;`SkillToolPolicy` 收窄工具集 → `tools`。**这两者是两个独立 middleware,所以"一个 middleware 跨两阶段"的歧义在此自然消解。**
- `Todo` 维护的是跨轮可见状态 → `context`(它同时贡献 `write_todos` 工具,归 `tools` 也说得通,**记为已知歧义**,见 §8)。
- `TerminalResponse` 对空的模型终止响应重试 → `model` 的 guard 覆盖层(recovery 性质,但仍属"包裹 model")。

**轴二 —— frequency,由实测的 hook 决定,与 stage 无关。** 原始事实是 `hooks[]`(实测覆写了哪些 hook,§6.5);`frequency` 是**从它派生的三值渲染分类**:`once_per_run` / `per_model_call` / `per_tool_call`。

> **`mixed` 已取消(2026-09-10 裁决)。** 旧口径把"实现了多个 hook"压成第四值 `mixed`,覆盖 9/34 ≈ 26%。它的问题不是不精确,而是**方向错了**:本节说 frequency 是"代码事实、探测得出、不写第二张表以免与代码漂移"——那么最忠实的代码事实就是 **hook 集合本身**,`mixed` 是对它的一次有损压缩,而且是往"信息缺口"方向压(26% 的条目渲染出来写着"视情况")。改为如实发 `hooks[]` + 服务端派生的三值 `frequency`,两边都保住:粗粒度渲染读派生值,开发者档读原始集合。派生规则见 §6.5。
>
> **代价:** 每条明细多一个 `hooks[]` 数组(34 条 × 1-4 个名),撑 16KB 预算——Task 0 Step 3 的体积实测必须按新口径量(§6.5 上限节)。旧的 4/15/6/9 分布作废:25 条单相位项的派生值不变,**原 9 条 `mixed` 按 §6.5 规则重新归类**——其中 8 条含 model 相位 hook(`ToolOutputBudget` / `Todo` / `SkillToolPolicy` / `DeferredToolFilter` / `ToolProgress` / `LoopDetection` / `TokenBudget` / `TerminalResponse`)落 `per_model_call`,**`Sandbox` 是那个例外**:它的 hook 只有 `before_agent` / `after_agent` / `wrap_tool_call`,没有 model 相位,因此落 `per_tool_call`。**新分布由实现实测后写回本节与 §10 测试,不要沿用旧数字。**

**为什么必须两个轴:`Title` 是决定性案例。** 它的**目的**是 run 级的(第一轮完整交互后生成会话标题,归 `epilogue`),但它的 **hook 是 `after_model`**(`title_middleware.py:230`),即**每圈都触发**,由内部逻辑决定这一圈要不要真的生成。若只有 stage 一个轴,渲染器会把 Title 画成"结束时走一次",而它其实每圈都在跑 —— 脉冲动画会说谎。

**2026-09-10 实测(`grep` 各 middleware 的 hook 定义)纠正了初版表的三处:**

| 槽 | 初版假设 | 实测 | 影响 |
|---|---|---|---|
| 1 InputSanitization | `intake`,开头一次 | `wrap_model_call` only → **每圈** | **挪到 `context`**;`intake` 只剩两个纯 `before_agent`,故事变干净 |
| 14 DynamicContext | 每圈注入日期与记忆 | `before_agent` only → **每 run 一次** | frequency 标注修正;这也解释了它为何能"保持系统提示词静态以复用前缀缓存" |
| 21 Title | `after_agent` | `after_model` → **每圈** | 保留在 `epilogue`(按目的),但 frequency 必须独立记录 |

实测后的 frequency 分布(34 个具名):`once_per_run` 4 · `per_model_call` 15 · `per_tool_call` 6 · `mixed` 9。**—— 这行已作废(2026-09-10 取消 `mixed`):**`mixed` 那 9 条按 §6.5 的派生规则重新归类——**只含 agent 相位 + `wrap_tool_call` 的 `Sandbox` 落 `per_tool_call`,其余 8 条(`ToolOutputBudget` / `Todo` / `SkillToolPolicy` / `DeferredToolFilter` / `ToolProgress` / `LoopDetection` / `TokenBudget` / `TerminalResponse`)都含 model 相位 hook,落 `per_model_call`**,即预期新分布 **4 / 23 / 7**。**这是按 §6.6.3 的 hook 列推算的,不是实测**——实现后以探测结果为准并在 §10 钉死;若对不上,先怀疑探测(基类 no-op 陷阱),再怀疑这张推算表。

**渲染含义**:五段不是五个时间点。真实时间结构是

```
intake(每 run 一次) → [ context → model ⇄ tools ] × N 圈 → epilogue(每 run 一次)
```

**这个结构正是 §6.6.1 选择环形布局的原因**:`loop: true` 的三段是环的循环体,`intake` / `epilogue` 是入口弧与出口弧,N 圈是指针绕环 N 次。线性五格无法表达它(见 §6.6.1 的二次裁决)。

圈数计数器已经存在:`llm.ai.response` 的 `metadata.llm_call_index`(`journal.py:486`)。**但前端今天零消费者**——2026-09-10 grep `llm_call_index` 在 `frontend/src` 零命中;通道是通的(与 `subagent.step` 分页回填同一个 `?event_types=` 机制),只是没有代码读它。这是"实时脉冲"缺的第二个数据源,归属见 §12 第 6 项。

`epilogue` 里的 Title 因为 hook 是 `after_model`,在环上应当**画在出口弧内但标注"每圈检查"**——这是环形也消不掉的一项残留矛盾,见 §6.6.1 末尾的说明。

#### 6.6.3 完整归属表(34 具名 + 2 扩展槽)

`STAGE_OF_MIDDLEWARE` 放在 `constitution_record.py`,与 `runtime/events/catalog.py` 同级。位次序号沿用 `backend/AGENTS.md` Middleware Chain 节的编号;「干什么」一列的人话说明同样源自该节,用作**开发者档 tooltip 文案的种子**。

**`frequency` 一列是 2026-09-10 实测各文件 hook 定义的结果,不是从文档推的**;2026-09-10 取消 `mixed` 后,列里记的是按 §6.5 规则从实测 hook 集合**派生**的三值。**同一轮探测产出的原始 hook 集合才是 payload 里的 `hooks[]`**(§6.5)——它比这列更细,且是机器可钉的等值对象;本表不再逐行抄它,由 §10 测试对 34 个具名 middleware 逐项钉死。

> **人话列是文档,不是契约——不进快照 payload。** 快照只发 middleware 真名 + stage + `hooks[]` + `frequency`(§6.5),人话说明由前端 i18n 拥有(§6.8)。把说明塞进事件会同时撑爆 16KB 预算、把文案责任错误地放到服务端、并让改一个字变成契约变更。

> **命名要求(硬):本表的 middleware 名必须逐字等于真实 `type(mw).__name__`。** 它同时是 `STAGE_OF_MIDDLEWARE` 的键、guard test 的断言对象、快照 `middlewares[].name` 的值、以及前端 i18n 文案表的键(§12 第 2 项)——**这四个东西共用同一个字符串,差一个字符就四处同时静默失配**。
>
> **已经踩到一次(2026-09-10 Step 3 实测发现)**:槽 18 的真名是 **`DeerFlowSummarizationMiddleware`**(带 `DeerFlow` 前缀),不是"Summarization"。本表与 `docs/HARNESS_EXECUTION_FLOW_MAP.md` §4.1 都用了短名——**这是文档的省略,不是代码的类名**。已就地修正。
>
> **验证方法(实现 Task 1 时必做)**:列出真实链的全部 `type(mw).__name__`,与本表逐一对照;`test_constitution_record.py` 的归属表断言必须用**真名**,并断言 `set(真实链类名) == set(STAGE_OF_MIDDLEWARE.keys())` 之类的双向覆盖,而不是只断言"每个真名都能查到归属"(后者查不到才发现,前者差一个就红)。

| # | middleware | stage | kind | frequency | 干什么(人话) |
|---|---|---|---|---|---|
| 4 | ThreadData | intake | member | once_per_run | 建这个会话专属的 workspace / uploads / outputs 目录 |
| 5 | Uploads | intake | member | once_per_run | 把新上传的文件清单注入对话(仅 lead) |
| 1 | InputSanitization | context | member | per_model_call | 消毒用户输入,原文另存到 `original_user_content`;排在最外层,所以里面每一层看到的都是消毒过的 |
| 2 | ToolOutputBudget | context | member | per_model_call | 工具输出太大就外置成文件,上下文里只留摘要 + `read_file` 引用 |
| 3 | ToolResultSanitization | context | member | per_tool_call | 中和远程内容(网页抓取/搜索)里的 `<system-reminder>` 一类框架标签,防止伪造可信上下文 |
| 7 | DanglingToolCall | context | member | per_model_call | 给没有回应的 tool_call 补占位 ToolMessage(例如用户中途打断) |
| 14 | DynamicContext | context | member | **once_per_run** | 注入当前日期与记忆,作为隐藏 `<system-reminder>`;保持系统提示词静态以复用前缀缓存 |
| 15 | SkillActivation | context | member | per_model_call | 识别 `/skill-name`,把该 skill 的 SKILL.md 正文注入本轮上下文 |
| 17 | DurableContext | context | member | per_model_call | 把委派记录与 skill 引用存进 ThreadState,压缩后仍然可见 |
| 18 | **DeerFlowSummarization** *(optional)* | context | member | per_model_call | 接近 token 上限时把旧消息压成 `summary_text`(**真名带 `DeerFlow` 前缀**,见下方命名要求) |
| 19 | Todo *(optional, plan mode)* | context | member | per_model_call | plan mode 下提供 `write_todos` 工具并维护清单(**已知歧义**,§8 风险 7) |
| 23 | ViewImage *(optional, vision)* | context | member | per_model_call | 把图片转 base64 注入隐藏消息,模型调用后再移除 |
| 26 | SystemMessageCoalescing | context | member | per_model_call | 把多条 SystemMessage 合成一条开头的(严格 provider 会拒非开头的 system 消息) |
| — | **DeepResearch** *(仅 `rag` agent)* | context | member | per_model_call | `context.deep_research=true` 时追加强制的三路径检索指令(`agent.py:674-685` 的 `_extra_agent_middlewares`) |
| 8 | LLMErrorHandling | model | member | per_model_call | provider 挂了转成可恢复的 AI 消息,让图干净收尾而不是崩 |
| 20 | TokenUsage *(optional)* | model | member | per_model_call | 记 token 账;子 agent 的用量按消息位置并回派发它的那条 AI 消息 |
| 33 | ModelLengthFinishReason | model | member | per_model_call | 因长度被截断时记 `stop_reason=model_length_capped`,保留原内容 |
| 27 | SubagentLimit *(optional)* | model | overlay / guard | per_model_call | 截断超额的 `task` 调用(每响应并发上限 + 每 run 总量上限),并附一条可见的限额说明 |
| 28 | LoopDetection *(optional)* | model | overlay / guard | per_model_call | 检测到重复 tool_call 循环就硬停,清掉工具调用强制出最终答案 |
| 29 | TokenBudget *(optional)* | model | overlay / guard | per_model_call | 每 run token 上限;到阈值剥掉在飞轮次的工具调用,强制收尾 |
| 32 | TerminalResponse | model | overlay / guard | per_model_call | 模型返回空的终止消息就注入恢复提示重试一次;再空则落成可见错误 |
| 34 | SafetyFinishReason *(optional)* | model | overlay / guard | per_model_call | 被内容过滤终止时压制工具执行 |
| 6 | Sandbox | tools | member | per_tool_call | 申请沙箱,把 `sandbox_id` 写进 state;`after_agent` 负责释放 |
| 16 | SkillToolPolicy | tools | member | per_model_call | 按激活 skill 的 `allowed-tools` 收窄工具集(既过滤 schema 也拦执行) |
| 24 | McpRouting *(optional)* | tools | member | per_model_call | 按路由提示自动提升匹配的 deferred MCP 工具 schema |
| 25 | DeferredToolFilter *(optional)* | tools | member | per_model_call | 把 deferred(MCP)工具的 schema 藏起来,直到被 `tool_search` 或槽 24 提升 |
| 9 | Guardrail | tools | overlay / guard | per_tool_call | 工具调用前的授权 + guardrail 双闸,fail-closed;授权在外层,可先于外部 guardrail 拒绝 |
| 10 | SandboxAudit | tools | overlay / guard | per_tool_call | 审计并分类 shell 命令;**命令位置**的替换(`$(curl u)` 直接执行)会被拦,值位置(`x=$(curl u)`)放过 |
| 11 | ReadBeforeWrite *(optional)* | tools | overlay / guard | per_tool_call | 没先读过这个文件(内容哈希不匹配)就不许写;写不刷新标记,连续编辑必须重读 |
| 12 | ToolProgress *(optional)* | tools | overlay / guard | per_model_call | 同一个工具反复没有新信息 → ACTIVE→WARNED→BLOCKED 三态,按错误类别决定升级速度 |
| 13 | ToolErrorHandling | tools | overlay / guard | per_tool_call | 工具抛异常转成错误 ToolMessage 并打上 `deerflow_tool_meta`,让 run 继续而不是中断 |
| 35 | Clarification | tools | overlay / **handoff**(`exits_run: true`) | per_tool_call | 拦下 `ask_clarification`,写出人类输入卡片,`Command(goto=END)` 把控制权交回给用户 |
| 21 | Title | epilogue | member | **per_model_call** | 第一轮完整交互后自动生成会话标题;**hook 是 `after_model`,每圈都检查**,由内部逻辑决定这一圈要不要真的生成 |
| 22 | Memory | epilogue | member | once_per_run | 把对话排队给**异步**记忆抽取(去抖 30s),不在本 run 内完成 |
| 30 | custom middlewares *(optional)* | 见下 | — | 视实现 | 代码里通过 `build_middlewares(custom_middlewares=...)` 传进来的 |
| 31 | configured extension middlewares *(optional)* | 见下 | — | 视实现 | `config.yaml` / `extensions_config.json` 的 `middlewares` 声明的第三方插件类,由 `IsolatedMiddleware` 包裹、失败开放 |

**`DeepResearch` 是本次实测的新发现,`backend/AGENTS.md` 的 35 槽编号里没有它。** 它由 `_extra_agent_middlewares(agent_name)`(`agent.py:674-685`)按 agent 名追加,**只有 `rag` agent 会装**。这正是 guard test(§6.6.4)存在的意义:它会在实施第一天就因为这个未登记的 middleware 变红,而不是等到有人发现 `rag` agent 的构成图少了一格。

**位次不变量(顺序不是随便排的,改之前先读 `backend/AGENTS.md`):** 槽 1 必须最外(否则内层看到未消毒输入)· 槽 16 必须紧跟槽 15、且紧挨槽 17 之前(assembly 与 compiled-graph 测试钉死)· 槽 11 在槽 12/13 之外(被拦的写不消耗 ToolProgress 名额)· 槽 34 注册在槽 32/30/31 之后(LangChain 的 `after_model` 是逆序派发,这样它反而最先跑)· **槽 35 必须最后**。

合计:`intake` 2、`context` **12**、`model` 3 member + 5 gate、`tools` 4 member + 5 gate + 1 handoff、`epilogue` 2 = **34 具名 + 2 扩展槽**。

**其中约 14 个是 optional**(表中已标),所以**每次 run 实际装的数量是变的**——这正是构成快照存在的理由:静态文档只能说"可能有这些",说不了"这一次实际装了哪几个"。槽 30/31 还是可装 0..N 个的**列表槽**,因此实际链长既能少于 34 也能多于它。

**`context` 是最厚的一层(12 个),这是真实分布而非分类失败**——它与用户勘查文档 `HARNESS_EXECUTION_FLOW_MAP.md` 的"上下文治理九层"一节相互印证。

**extension middleware 不新造分类**:`packages/extension-api/` 已有语义 placement 枚举(`MODEL_LOGICAL` / `MODEL_PHYSICAL` / `TOOL_VISIBLE` / `TOOL_RAW` / `STANDARD`,见 `backend/AGENTS.md` Extension System 节),映射为 `MODEL_* → model`、`TOOL_* → tools`、`STANDARD → extension`;无法映射的落 `stage: "extension"`,**不硬塞进五段**。custom middlewares(槽 30)无 placement 声明,一律落 `extension`。

#### 6.6.4 guard test(防腐的唯一保障)

装配一次真实链(lead 与 subagent 各一次,含 optional 全开),断言每个 middleware 类名都在 `STAGE_OF_MIDDLEWARE` 里有归属,漏一个就红。这与仓库既有的 `_BASELINE_TABLE_NAMES` 钉 `0001_baseline.upgrade()` 输出是同一种纪律。脚手架已存在:`tests/test_extension_ordering.py`、`tests/test_extension_placement_guarantees.py`、`tests/test_extension_stack_wiring.py` 已经在装配真实链并钉位次。

**为什么 stage 表必须在服务端**:如果让前端自己按名字猜分组,那么加一个 middleware 就会在前端静默落到"未分类",图开始说谎却没有任何测试会红。

### 6.7 前端投递方式:fetch-once,**不上 SSE**

`run.start` 是持久化的 run_event,而 SSE 只承载 LangGraph stream modes(`values` / `messages-tuple` / `updates` / `debug` / `tasks` / `checkpoints` / `custom`)。**构成快照不会自动出现在 SSE 流里。**

裁决:前端在 `onCreated` 之后 fetch 一次

```
GET /api/threads/{thread_id}/runs/{run_id}/events?event_types=run.start
```

**刻意不额外发 custom stream 事件**,两条理由:

1. ~~**IM 通道安全**:……**新增 custom stream 事件则要重新过一次 allowlist 审查**~~ **——这条理由已于 2026-09-11 核实并更正,结论不变、依据换掉(见下方更正框)。**
2. 构成在一个 run 内**不变**(goal continuation 也不变,§6.3 的守卫正是为此),fetch-once 语义正确。

> **更正框(2026-09-11):"新增 custom stream 事件要重过 IM allowlist 审查"这个前提不成立。**
>
> **真实边界是订阅,不是 allowlist。** IM 通道订阅的 stream mode 是白名单且**不含 `custom`**:
> ```python
> # app/channels/manager.py:75
> STREAM_MODES = ["messages-tuple", "values"]      # ← 不含 custom
> MESSAGE_STREAM_EVENTS = ("messages-tuple", "messages")
> ```
> `_accumulate_stream_text` 的 docstring 也写明它只处理 `messages-tuple`。**Buzz 事故是 `messages-tuple` 泄漏**(隐藏 `HumanMessage` 被当助手回复发出去),而 `custom` 是**另一个 stream mode**,IM 不订阅它、worker 也不会为 IM 的 run 产生 custom 帧。
>
> **而且仓里已经这么干了**:子代理的 `task_*` 就是**双发**——`deerflow.utils.custom_events.emit_custom_event`(SSE custom)+ 落 `run_events`(供重载),前端今天靠它实时更新 subtask 卡(`hooks.ts:1832`)。这是本仓"实时 + 可回填"的**既定范式**。
>
> **所以本条的结论(fetch-once、不给构成发流式事件)保持不变,但理由只剩第 2 条**:构成是 run 级静态事实、run 内不变、无流式价值。**别再传"SSE 危险"这条错规则**——它会把后续项(尤其 §12 第 6 项实时脉冲)逼进"不能发 SSE"的死角,而闸门事件恰恰**必须**走 SSE(见 `2026-09-11-harness-gate-instrumentation-design.md` §4.6)。

### 6.8 双受众投影:一份真相,两层渲染

用户明确要求**开发者与终端用户都要看**。裁决:**不发两套事件**(两套必然腐烂)。

- **服务端只发一份真相**:真实 middleware 类名、真实工具名、真实删除项。
- **stage 分类法服务端拥有**(§6.6),**文案与 i18n 前端拥有**(前端已多语言,`core/i18n/locales/`)。服务端只发 `key`,**不发中文标签**。
- **字段分工(这是两档视图不腐烂的关键)**:
  - **终端用户视图只读 `stages[]`** —— 里面只有 `key`、`loop` 与计数(`members` / `gates` / `handoff_gates`),**没有任何 middleware 真名**。
  - **开发者视图读 `stages[]` + `middlewares[]`** —— 按 stage 分组,展开看真名、`kind` / `overlay_kind`、`hooks[]`,以及后续 ⑧ 事件带来的 `changes`。
- 两档共用同一次 fetch,前端按模式选择读哪几个字段,**不存在两套事件、两个端点或两份快照**。

#### 6.8.1 裁决:两档是**两个独立组件**,不是同一视图的详略开关(2026-09-10)

初版把用户档写成"开发者档的过滤版",并为此设了"防止退化成过滤版"的告示。**这个框定是错的,已否决**:两档消费的**证据来源不同**,所以它们不是详略关系,而是**两种心智模型**。

| | 开发者档 | 终端用户档 |
|---|---|---|
| 想回答的问题 | 这次装了什么、哪一层拦了这一下 | agent 现在在干什么 |
| 静态证据 | `middlewares[]`(真名 / `kind` / `overlay_kind` / `hooks[]` / `frequency`) | `stages[]` 的**形状与顺序**(环 + `key` + `loop`) |
| 动态证据 | ⑧ 的闸门事件(`changes`) | ⑧ 的闸门事件 + ⑩ 的 `run.delivery` |
| 文案 | middleware 真名 + 人话 tooltip(i18n 按真名索引) | 每段的整句人话(i18n 按 stage key 索引) |
| 心智模型 | 学会**五段分类法 + 两个轴**(本 spec 新造,无行业先例,§8 风险 8) | **"工具调用时间线"**——用户已从 Cursor / Claude Code / LangGraph Studio 建立的那个直觉 |

**落地要求(硬):两档必须是两个组件,不是一个视图加详略开关。** 理由不是审美,是上面那张表:一个组件不可能同时用两套词汇表和两种时间结构。

**由此收窄 `stages[]` 的职责(这是本节唯一影响契约的结论,但不动 schema):**

- `stages[]` 对**用户档**提供的是**环的形状 + 段顺序 + `key`**(用来选文案)。**不承担"给用户看的数字"。**
- §6.8 那张双档对照表里的用户档六行文案,**逐行核过:零行来自计数字段**——它们分别来自 stage `key`→i18n、⑧ 运行时事件、`run.delivery`。
- 所以计数字段(`members`/`gates`/`handoff_gates`)服务的是**开发者档的折叠态**(展开前显示"context 9 项 · 3 道闸门")。`stages[]` 必须继续独立于 `middlewares[]` 存在,但"它是用户档唯一输入"这句话要按上面的口径理解——**它是用户档"静态部分"的唯一输入,动态部分来自 ⑧ 与 ⑩**。
- **为什么值得保留计数而不是砍掉**:砍掉就得让开发者档从 `middlewares[]` 自己按 stage 数一遍,那正是 §6.6.4 禁止的"让前端按名字猜结构";而且 `members` 是**实际挂载数**(§6.5.1),不是表的合计,这个数本身就是"这次和上次不一样"的证据。

**同一次 run 在两档下的样子(钉住意图:两档的措辞必须来自各自那套词汇表,§6.8.1):**

| stage | 开发者档 | 终端用户档 |
|---|---|---|
| intake | `InputSanitization` / `ThreadData` / `Uploads` | 收到了你的问题 |
| context | 10 项,含 `Summarization` 已触发压缩 | 在回忆相关内容 |
| model | `qwen3-max` · thinking on · 第 3 圈 · 5 道闸门 | 在思考 |
| tools | `hybrid_search` → 5 条命中 · 5 道闸门 + 1 道交接 | 在查知识库 |
| tools(闸门触发时) | `ToolProgressMiddleware` → `BLOCKED` | 有个工具连续失败,已停用 |
| epilogue | `Title` / `Memory` 已排队 · `run.delivery` satisfied=true | 完成了,产出 3 个文件 |

**"有个工具连续失败,已停用"那一行是这个东西的全部价值** —— 今天用户看到的是 agent 突然不说话,他会以为坏了。该行由 ⑧ 的运行时事件驱动,不是由本 spec 的静态快照驱动;快照只负责说明"这里有 5 道闸门"。

**信任模型已就位,不产生新泄露面**:`GET /runs/{rid}/events` 的调用者本来就是 thread owner,终端用户的浏览器**今天就已经收到完整原始事件流**,只是前端没渲染大部分。middleware 真名不是秘密。

**终端用户视图必须是策展投影而非原始内部的过滤子集**——依据是 arXiv:2507.11473(*Chain-of-Thought Monitorability*,OpenAI/Anthropic/DeepMind 等约 40 位作者联署)对"展示出来的推理可能不忠实"的警告。上面的字段分工就是这条原则的落地:用户档读不到 `middlewares[]` / `tool_authorization` 明细,**不是靠前端忍住不渲染,而是靠它拿到的那个数组里根本没有**。

## 7. 失败模式(全部降级,不影响执行)

| 情况 | 行为 |
|---|---|
| 编译图不可弱引用 / 不可哈希 | `publish_constitution` / `constitution_for` 吞 `TypeError`,warning,无快照 |
| 自定义 `agent_factory` 不发布 | `constitution_for` 返回 `None`,`run.start` 保持原样 |
| 无 event store / embedded / subagent | 无 journal;记录仍留在注册表(TUI 可直读) |
| 快照超 16KB | 按 §6.5 固定顺序降级 + `truncated: true` |
| goal continuation 多次根调用 | 只有第一次带 `constitution` |
| `build_constitution_record` 自身抛异常 | 工厂侧包 try/except,warning,**绝不让观测埋点阻断 agent 构建** |

最后一条是硬要求:发布调用必须包在 try/except 里,与 §2.7 的旁路纪律一致。

## 8. 风险与开放项

1. ~~**编译图能否作 WeakKeyDictionary 的键(最高优先,阻塞)**~~ **已实测关闭(2026-09-10,Task 0 Step 1):可弱引用 + 可哈希,且是身份哈希(`object.__hash__`,无自定义 `__eq__`);注册表往返与 GC 回收都验过** → **不走** §11 的"图上挂属性"次选分支,按 §4 实施。实测明细见 §4.1(`langgraph 1.2.9` / `langchain 1.3.14`)。**残余风险**:弱引用能力与身份哈希是上游实现细节,未来 `langgraph` 若给 `Pregel` 加 `__eq__` 或 `__slots__` 会**静默降级**成"无快照"(§4 的两个函数刻意吞 `TypeError`)——由 §10 的看门测试把它变成显式失败。
2. ~~**`run.start` 在 goal continuation 下的实际发射次数**~~ **已实测关闭(2026-09-10,Task 0 Step 2):一次 run(用户轮 + 1 次 continuation)真实发出 2 条 `run.start`(实测 journal 收到 2 条,`seq` 1 与 7)** → §6.3 的 first-time-only 守卫是**必需**,不是冗余。同探针还确认:多超步图单次 astream 仍只发 1 条;**`subgraphs=True` 不产生额外根级 start**。明细见 §6.3。**未验项**:多模式 `["values","messages"]` 变体被 `GenericFakeChatModel` 的流式限制卡住(假模型产不出 generation),但"一次 astream = 一条 `run.start`"是 Pregel 根 runnable 的性质,与 stream_mode 个数无关。
3. ~~**快照真实体积**~~ **已实测关闭(2026-09-10,Task 0 Step 3):真实载荷 5,656 B(含 MCP 工具 5,742 B),约 16 KB 的 35%,不紧。** 明细与归因见 §6.5.1。**修正一条被写错的归因**:承压变量**不是 `hooks[]`**(增量约 1 KB),而是**工具名清单**,其中 **`deferred_names` 最大且本仓无法约束**(由第三方 MCP server 决定长度)。因此 `MAX_TOOL_NAMES` 必须**同时**覆盖 `tools.mounted` 与 `tools.deferred_names`(§6.5)。**残余**:实测用的是本机精简配置(3 个 MCP server 只启用 1 个),MCP 重的部署没有覆盖;结论"不紧"只在工具名 ≤ 数十个的量级成立。
4. ~~**`build_middlewares` 的返回类型**~~ **已实测关闭(2026-09-10,Task 0 Step 3):它返回 `list`**(`isinstance(mws, list)` 为真,且 docstring 明写 "Returns: List of middleware instances")。§6.2 的 hoist 写法与 Task 1 的入参类型无需调整。
5. ~~**wrap-only 比例未独立复核**~~ **已实测确认(2026-09-10):15/34 ≈ 44%**,与勘查文档一致(§2.1)。同一轮 hook 实测还纠正了归属表三处(§6.6.2),并发现下面这条新风险。**Step 3 又用"实现将要用的那套 hook 探测器"独立复算了一次**:真实链里 12 个 wrap-only,加上本机未挂载的 Guardrail / DeferredToolFilter / DeepResearch 恰好 = 15 → **探测器与 grep 口径一致**,§10 的对账判据成立。
6. **`backend/AGENTS.md` 的 35 槽编号不完整——存在按 agent 追加的 middleware**:`DeepResearchMiddleware` 由 `_extra_agent_middlewares(agent_name)`(`agent.py:674-685`)追加,**只有 `rag` agent 会装**,AGENTS.md 的位次表里没有它。含义有两条:① `STAGE_OF_MIDDLEWARE` 必须覆盖它,否则 `rag` agent 的构成图会少一格;② **guard test 不能只装配默认链**,必须把 `agent_name="rag"` 的链也装配一次,否则这个漏洞测不出来。将来若再加按 agent 追加的 middleware,同一漏洞会重现——guard test 的多 agent 覆盖是唯一的防线。
7. **归属表有已知歧义项,已按规则裁决但可被推翻**:§6.6.2 记录了 `Todo`(维护跨轮可见状态 → `context`,但它同时贡献 `write_todos` 工具 → `tools` 也说得通)与 `TerminalResponse`(recovery 性质,却归入 `model` 的 guard 覆盖层)。这些是按"改变了什么"规则裁决的结果,**不是唯一正确答案**。若前端渲染出来发现某项归错了阶段,改的是 `STAGE_OF_MIDDLEWARE` 一行 + guard test 的期望值,**不影响快照 schema**,所以返工成本低——但要在前端视图落地后回头校一次。
8. **五个英文 stage key 是本 spec 的新造词,无行业先例**:`intake` / `context` / `model` / `tools` / `epilogue` 不由任何标准定义(OTel GenAI semconv 只有 span,OpenInference 只有 `graph.node.*`,AG-UI 有 `STEP_STARTED/FINISHED` 但不规定步骤语义)。**真正面向用户的决定是中文文案,不是这五个 key**——key 只是标识符,前端 i18n 映射到"接收 / 备料 / 思考 / 执行 / 收尾"一类措辞。文案属于前端 spec(§12 第 2 项),本 spec 只冻结 key 集合,因为 guard test 与 `stages[]` 都依赖它稳定。
9. ~~**开放项:本线是否需要自己的分期编号**~~ **已裁决(2026-09-10):不引入独立编号体系。** 本线的"二期"**直接指 §12 的 #1-#7**,引用时一律写"§12 第 N 项"。理由:丙1 那条线已占用 丙1→甲→乙→丙2 一套编号,而本 spec §3 与丙1 spec §3 都把"把相邻线的路线图当成新概念的定义"列为要避免的病理——再发一套甲乙丙只会让人分不清哪套属于哪条线。**可推翻**:若日后本线要跨多个 spec 排序,再引入编号也只需给 §12 的七项套一层名字,不构成返工。
10. **开放项**:若未来 `tool_groups` 声明需要暴露给前端装配面板,丙1 spec §6.4 已裁决并入其 capabilities 端点。本 spec 的快照**不承担**该职责,两者不要互相借用字段。
11. ~~**开放项:`extension` 兜底段在环上的位置未定**~~ **已裁决(2026-09-10):它是 `kind: "member"` 的环外附加带,`loop: false`,画在出口弧外侧。**
    - **为什么是 member 而不是 overlay**:它确实是链上的**位次成员**(`backend/AGENTS.md` 明确其位置"在 built-in / custom 之后、terminal-response / safety / clarification 尾部之前"),只是**没有 stage 归属**;`overlay_kind` 的语义是"包裹 `model` 或 `tools`"(guard / handoff),而 extension 是"站在链上某一位",两者不是一回事。
    - **为什么 `loop: false`**:它们的触发时机跟随各自实现的 hook,不由环的循环体决定;把它们画进循环体会让"绕几圈"多出无意义的成员。
    - **只覆盖未映射的那部分**:按 §6.6.3 的 placement 映射,能映射到 `MODEL_*` / `TOOL_*` 的 extension **本来就落进 `model` / `tools`**,只有 `STANDARD` 与无 placement 声明的 custom middlewares 落 `extension`。
    - **这条也正是 `stages[].loop` 必须由服务端拥有的原因**(§6.6.1):前端若推"首尾之间就是循环体",遇到第六个 stage 必然猜错。本 spec 冻结两件事:`extension` 是合法 stage 取值,且它的 `loop` 是一个**显式写定的固定值**(§10 有对应断言)。
12. ~~**开放项:环形布局的实现成本未评估**~~ **已裁决(2026-09-11,用户批「手写 SVG」):环形用 SVG 画,不引 React Flow。** 五段弧用 SVG path / `stroke-dasharray`,标签与闸门徽标用 DOM 叠层,展开面板是普通列表(按 stage 分组)。**零新依赖**,资产预算不再是约束。证据(2026-09-11 实测,四条):
    - **React Flow 今天完全不在任何聊天包里**:`src/` 全量 grep 只有 `ai-elements/` 那 9 个包装组件 import `@xyflow/react`,而它们**零外部消费者** ⇒ 引它是**净新增**成本,不是沉没成本。(`.next` 里那个含 "xyflow" 字样的 chunk 是**被打包的 `package.json` 元数据**,不是 React Flow 的代码——别据此误判"已经在包里了"。)
    - **实测体积 ≈ 93 KB gzip**(`@xyflow/react` 58,564 B + `@xyflow/system` 34,242 B,取自包产物),而线程路由实测 **js 4,092,559 / 预算 4,100,000**,**只剩 7,441 字节余量(0.18%)**。
    - **那套包装组件在环形里用不了,且不许改**:`ai-elements/node.tsx` 把 Handle 硬编码成 `Position.Left`(target) + `Position.Right`(source),是"左进右出"的二部图约定;环要的是首尾相接绕圈。而 `ai-elements/**` 是 registry 生成物、eslint 已 ignore、`frontend/AGENTS.md:281` 明令不可手改 ⇒ **用 React Flow 也得自己写包装**。
    - **极坐标数学两种方案都得手写**:React Flow **不附带布局引擎**(dagre/elk 要另装,且 dagre 是分层 DAG 布局),而 5 段固定语义的弧**不需要布局引擎** ⇒ 引它省不掉最难那步,只多一层坐标系转换 + 视口模型 + 边/Handle 路由;而 `Canvas` 包装已经把 `panOnDrag`/`zoomOnDoubleClick` 关掉了,等于为用不上的视口付费。
    - **反方证据(不藏)**:① 预算表本身过期(自 #4622 未更新、不在 CI)且用户已决定不重校 ⇒ 93 KB 是**设计成本**而非门禁问题;② spec §3 裁决过与丙1 共享 `@xyflow/react` —— 但"共享一个库"≠"这条路由必须装它";丙1 的能力清单是**真的二部图**(agent → tools 一对多),React Flow 在那儿挣得到它的钱,**本环不共享该结论**。
    - **顺带答掉一个子裁决**:"`pnpm perf:check` 资产预算"在 SVG 方案下**不再是约束**;只有改选 React Flow 才需要接受 +93 KB。
    - **若退回"线性五格 + 圈数徽标"折中**:`stages[].loop` 仍然要发(圈数徽标也要知道哪三段在循环体内),数据契约不受影响。**该折中仍可作为退路**,但本裁决不选它。
13. **已知限制(2026-09-11 复核,不是缺口,是设计边界)** —— 三条都**不需要新代码**,前端 spec 按此设计即可:
    - **脉冲只能到 stage 级,拿不到 per-middleware 精度。** `intake` 的两步(ThreadData / Uploads)与 `context` 的多数成员**不发任何事件**(12 个里只有 `SkillActivation` 有 tag),指针走过它们无迹可寻。**但设计从没承诺 per-middleware** —— §6.6.2 的时间结构与 §12 第 6 项的两个数据源都是 **stage 级**,而 stage 级现成够用:`llm.human.input`(在**首次** `on_chat_model_start` 发,即"备料完成、开始思考")· `llm.ai.response`(带 `llm_call_index`)· `llm.tool.result` · `run.delivery`。另核实:`on_chat_model_start` **只自增计数器、不发事件**,所以一次 model 调用期间后端无事件;但前端本就有 live 信号(AI 文本块在 `messages-tuple` 里流式到达),"正在思考"不需要新事件源。
    - **subagent 侧看不到三样东西,其中两样是有意为之**:① **子代理构成** = §12 第 7 项(已裁决,不是缺陷);② **子代理内部的闸门事件永不记录** = **设计如此**(`deerflow_loop_bound=True` 不继承 journal),别去"修"那个循环边界;③ 子代理**步骤事件**走另一条 buffer(`_SubagentEventBuffer`,`FLUSH_THRESHOLD = 25` + `subagent.end` 时急切刷,`worker.py:494`/`:516`)——**阈值 25 与 journal 的 20 不同不是不一致**:两者服务的读者不同,步骤事件的**实时**部分走 custom SSE(`task_running`,前端 `hooks.ts:1832` 已在消费),`run_events` 那份是**给重载/回填**的。
    - **闸门事件的实时性依赖"双发"。** 闸门事件只落 `run_events` 时**run 结束前读不到**(`flush_threshold = 20` 且生产**只有 `worker.py:656` 一处**构造 journal、未覆盖该值;`_put` 无时间兜底);而前端在 run 进行中**没有 run 级轮询**。所以闸门事件必须走 **custom SSE** 才谈得上实时 —— 修法与 IM 安全性依据见闸门埋点 spec §4.6。**构成快照本身仍 fetch-once**(run 级静态事实),两者投递方式不同,因为时效性不同,不要合并。

## 9. 向后兼容与影响面

- **不改** `make_lead_agent` 的签名与返回类型(:644 的 LangGraph Server 契约)。
- **不改**任何 middleware 的位次、语义或顺序;§6.2 的 hoist 是纯表达式提取,值与顺序不变。
- **不改** `run.start` 的既有字段;`content.chain` 与 `metadata.caller` 原样保留。
- **不新增** event_type、category、端点、数据库表、迁移。
- **不改** `AgentConfig` schema,**不 bump** `config_version`。
- **不改** SSE stream modes 与 IM 通道的发布 allowlist。
- **不新增** Python 依赖(`tenki-sandbox` 已从 PyPI 下架,任何 `pyproject.toml` 改动都会触发注定失败的 universal 重解析)。
- **唯一的"成本型"影响(不是逻辑影响,但要知道):`run_events` 的持久化体积每个 run 增加约 5.7 KB(§6.5.1 实测)。** 因为 `run.start` 是**会被写进 store** 的事件(memory / JSONL / DB 三种后端;多 worker 强制 db),所以这份快照不是只飞一次的 SSE 帧。影响面:① 每个 thread 的事件行总量变大(单 run 一次,不随 goal continuation 重复——§6.3 的守卫就是为此);② `GET /runs/{rid}/events` 的响应体略大(前端只读一次,§6.7);③ **不构成 schema/迁移影响**,也**不改变任何既有消费方**的解析(纯加性字段 + `additionalProperties: true`)。**可观测性**:真的超标时 `tools.truncated` / 顶层 `truncated` 会置位,不会静默膨胀。**MCP 重的部署**是唯一需要留意的场景(`deferred_names` 由第三方 server 决定长度,§6.5)。
- 新增:`agents/constitution_record.py` + 其测试。
- 修改:`agents/lead_agent/agent.py`(两个站点)、`runtime/journal.py`(setter + `on_chain_start`)、`runtime/runs/worker.py`(接线)、`runtime/events/catalog.py`、`contracts/run_event_stream_contract.json`、`backend/docs/RUN_EVENT_STREAM.md`、`backend/AGENTS.md`。
- **契约同步 5 处**(`backend/AGENTS.md` 明文要求):producer 代码、`deerflow/constants.py`、`runtime/events/catalog.py`、`contracts/run_event_stream_contract.json`、`backend/docs/RUN_EVENT_STREAM.md`,加 `tests/test_run_event_stream_contract.py`。本 spec 不改 `constants.py` 的上限常量(无新 event_type),**已于 Task 3 打开核对确认无需变动**——该文件只有 `RUN_EVENT_TYPE_MAX_LENGTH = 32` 与 `RUN_EVENT_CATEGORY_MAX_LENGTH = 16` 两个常量,本次既没有新 event_type 也没有新 category,`middleware:` 的 21 字符后缀上限亦不涉及(那张表沿用 §12 第 1 项的 `record_middleware`)。

## 10. 测试(TDD)

后端 TDD 强制(`backend/AGENTS.md`)。

- **`tests/test_constitution_record.py`**(纯函数,无外部依赖):
  - `build_constitution_record` 的字段完整性与 stage 映射
  - **§6.6.3 归属表逐项钉死**:**34 个具名 middleware**(33 + `DeepResearchMiddleware`)全覆盖;`intake`=2 / `context`=**12** / `model`=3 member+5 gate / `tools`=4 member+5 gate+1 handoff / `epilogue`=2;`overlay_kind="handoff"` 全链**有且仅有** Clarification 一项,且它带 `exits_run: true`。这张表一改测试就红,是 §6.6 裁决的执行机制。**断言必须用真实类名**(§6.6.3 的命名要求):`DeerFlowSummarizationMiddleware` 而不是 "Summarization"——**Step 3 实测已发现文档里的短名与真名不一致**,真名是 `type(mw).__name__`
  - **真名双向覆盖**(§6.6.3 命名要求的执行机制):断言**真实链的类名集合与 `STAGE_OF_MIDDLEWARE` 的键集合互相覆盖**(`set(real) ⊆ set(table)` 且 `set(table) ⊆ set(real)`,按链分别做)。**单向断言不够**——"每个真名都能查到归属"会在表里多出一条孤儿键时保持绿色,而孤儿的后果是前端 i18n 文案表多一条永不渲染的文案、少一条要渲染的文案(§12 第 2 项)
  - **`stages[]` 计数来自实际挂载的链,不是表的合计**(§6.5.1 的实测口径):断言 `Σ(stages[].members + gates + handoff_gates) == len(middlewares)`,并用一个**精简配置**的固定装置断言总和不等于表的 34。**本机实测:同一套代码在本机 `config.yaml` 下只挂 25 条**(intake 2 / context 9 / model 3+3 / tools 2+3+1 / epilogue 2)——9 个 optional 未生效(Guardrail / ToolProgress / TokenBudget / McpRouting / DeferredToolFilter / ViewImage / Todo / SubagentLimit / DeepResearch)。**照抄表的合计就会描述"可能装什么",正是本 spec 存在的理由的反面**;这条测试是唯一会拦住它的东西
  - **`hooks[]` 轴钉死**(§6.5、§6.6.2):**34 个具名 middleware 逐个断言其 `hooks[]` 集合**(等值断言,含顺序),而不是只断言一个聚合分布——集合是原始事实,分布是它的函数,钉住集合就钉住了分布。同时断言**派生规则三个分支各至少一个案例**:含 model 相位 hook → `per_model_call`(`Title`,只有 `["after_model"]`)、只有 `wrap_tool_call` → `per_tool_call`(`Clarification`)、只剩 agent 相位 → `once_per_run`(`ThreadData`);**并单独断言 `Sandbox` 走的是"无 model 相位"那一支**(`["before_agent","after_agent","wrap_tool_call"]` → `per_tool_call`,它是旧 `mixed` 9 条里唯一的例外,不写这条就分不出"规则错"与"少写一个 hook")。单点断言三个反直觉项——`DynamicContext` 的 `hooks` 是 `["before_agent"]` 且 frequency `once_per_run`(不是每圈)、`Title=per_model_call`(不是 `after_agent`)、`InputSanitization` 的 stage 是 `context`(不是 `intake`);并**与 wrap-only 实测对账**:"只实现 `wrap_*`"的恰好 15 个,对不上就是探测写错了(§6.6.2 的基类 no-op 陷阱)。**`mixed` 不再是合法取值,断言它不出现。** 聚合分布(旧口径 4/15/6/9 → 预计 4/23/7,§6.6.2)只作记录,不作为等值断言——实测后写回即可
  - **策展投影不变量(§6.8 的执行机制)**:断言 `stages[]` 序列化后的文本里**不含任何 middleware 类名**——只允许 `key`、`loop` 与计数(`members` / `gates` / `handoff_gates`)。这条测试保障的是"**用户档拿不到真名,不是靠前端忍住不渲染**"(§6.8 的策展投影原则):没有它,某次重构把真名塞进 `stages[]` 不会有任何其他测试变红,而用户档会静默开始显示内部词汇
  - **`loop` 标记钉死**(§6.6.1 环形裁决的执行机制):`intake` / `epilogue` 为 `false`,`context` / `model` / `tools` 为 `true`;`extension` 兜底段的 `loop` 取值必须是**一个被显式断言的固定值**(不是"碰巧算出来"),因为它是前端无法从 key 顺序推导的那一段(§8 风险 11)。**这条测试是"环形循环体由服务端拥有、不让前端猜"的唯一保障**
  - 16KB 超限时的**固定降级顺序**(先丢 tools 明细、再丢 middlewares 明细,`tool_authorization.removed` 最后丢)+ `truncated: true`;注意 `stages[]` 是**用户档静态部分**的唯一输入、也是开发者档折叠态的输入(§6.8.1),**任何降级都不得削减它**
  - **`MAX_TOOL_NAMES` 同时截断 `tools.mounted` 与 `tools.deferred_names`**(§6.5):两个列表各自按同一上限截断,任一被截都置 `tools.truncated: true` 并保留对应的 `*_count` 真值。**必须两条各测一次**——只测 `mounted` 会漏掉 §8 风险 3 里真正不受本仓约束的那一半(`deferred_names` 的长度由第三方 MCP server 决定)
  - authorization 差集计算(candidates 有、authorized 无 → 进 `removed`)
  - extension middleware 的 placement 映射(`MODEL_*→model`、`TOOL_*→tools`、`STANDARD→extension`),未映射落 `extension`
  - **绝不出现**被禁内容:断言序列化结果里不含 prompt 正文、tool schema、secret 值
- **`tests/test_constitution_registry.py`**:发布→查询往返;**不可弱引用对象**的降级(注入一个 `__weakref__` 被禁的类型,断言 `publish` 不抛、`constitution_for` 返回 None);**不可哈希对象**同样降级,且断言这两种失败模式是独立可达的(不可哈希对象**仍然**可弱引用,§4.1);弱引用回收后条目消失(`gc.collect()` 后断言)。
- **载体看门测试**(`tests/test_constitution_registry.py`,§4.1 的执行机制):对**真实 `create_agent(...)` 的返回值**断言 ① `weakref.ref(graph)` 不抛;② `type(graph).__hash__ is object.__hash__` 且 `type(graph).__eq__ is object.__eq__`;③ 两个独立图的 `hash()` 不相等。**这条测的不是我们的代码,是上游的实现细节**——`langgraph` 未来若给 `Pregel` 加 `__eq__` 或 `__slots__`,载体就会静默降级成"无快照"而没有任何东西变红(§4 的两个函数刻意吞 `TypeError`);这条断言把那次升级变成一次显式失败。失败时的处置是**重新评估载体**(不是删掉这条测试),因为静默无快照比构建期报错更难发现。
- **stage guard test**(可并入 `test_constitution_record.py`):装配**四条**真实链——默认 lead、optional 全开的 lead、**`agent_name="rag"`**、subagent(`build_subagent_runtime_middlewares`)——断言每个 middleware 类名都有 stage 归属。**缺 `rag` 那条,这个测试对"按 agent 追加"这一整类漏洞是瞎的**(§8 风险 6)
- **`tests/test_lead_agent_constitution.py`**:**两个** `create_agent` 站点都发布(bootstrap 那条最易漏);`make_lead_agent` 的返回类型与签名未变(钉住 :644 的 LangGraph Server 契约);hoist 后 middleware 列表的**内容与顺序与改动前逐项相同**(这是 §6.2 唯一非旁路改动的安全网);`build_constitution_record` 抛异常时 agent 仍然构建成功
- **`tests/test_run_journal_constitution.py`**:`set_constitution` 是纯赋值(无 IO,过 blocking-IO 门禁);`run.start` 带 `constitution`;**未 set 时 `run.start` 与今天逐字节相同**;goal continuation 下**只有第一条带 `constitution`**。断言按 Task 0 Step 2 的实测结论定死(§6.3):**用户轮 + 1 次 continuation 的 run 共产生 2 条 `run.start`,其中恰好 1 条带 `constitution`,且是 `seq` 最小的那条**——**同时把 2 这个发射数本身钉住**,因为它一旦变化(上游让 goal 循环不再重复触发根 chain,或反过来触发更多次),守卫的前提就变了,而那时**不该只有前端发现快照重复或缺失**。守卫的变量名也应可断言(`_constitution_emitted` 只能让第一次通过)。
- **`tests/test_run_worker_constitution.py`**:worker 在工厂发布后接线成功;自定义 `agent_factory` 不发布时不炸、`run.start` 保持原样;`journal is None`(无 event store)时跳过
- **契约同步**:`tests/test_run_event_stream_contract.py` 加 `run.start.content.constitution` 的形状断言;确认既有"两个视图与全部 producer 组必须一致"的断言仍通过

**验证阶梯:**

```bash
cd backend && make test          # 离线全量
cd backend && make lint          # ruff
cd backend && make format        # 推送前必跑(CI 强制 ruff format --check)
cd backend && PYTHONPATH=. uv run pytest tests/test_constitution_record.py tests/test_lead_agent_constitution.py -v
```

前端本期无改动,故 `pnpm check` / `pnpm test` / `pnpm perf:check` 不在本 spec 的验证阶梯内。

## 11. 否决备选

- **改 `make_lead_agent` 返回 `(graph, record)`**:直接违反 :644 的 "keep the signature compatible with LangGraph Server",且 `langgraph.json` 注册的图工厂契约会被破坏。
- **用 ContextVar 发布**:`bind_agent_build_extensions` 的 `with` 块在 `worker.py:819-820` 就退出,`backend/AGENTS.md` 明确记录这类 graph-build 绑定"在 lead agent 委派前就已退出"。生命周期覆盖不到 worker 的后续接线,且 ContextVar 在跨线程/跨循环时行为难预测。
- **往编译图对象上挂属性(`graph.__deerflow_constitution__ = ...`)**:比注册表简单,但 monkey-patch 第三方对象跨 LangChain 版本易碎,且双下划线属性名有撞车风险。仅当 §8 风险 1 实测证明图**不可弱引用**时才退到此分支。
- **从编译图反解 middleware 顺序(读 `.nodes` / `.builder`)**:**决定性理由是它结构性地看不见约 44% 的链**(§2.1)——wrap-only 中间件不成为图节点,而缺席的正是 Clarification、InputSanitization、SkillToolPolicy、Guardrail、ReadBeforeWrite、SandboxAudit 这些安全与治理逻辑;其次才是逆向工程 LangChain 内部结构跨版本必烂,以及恢复不出"哪些 optional 生效了"与"authorization 删了什么"。必须从组装现场的局部变量取。
- **新开一个 `harness.constitution` event_type**:需要新 category(≤16 字符)、新 event_type(≤32 字符)、契约与 catalog 双改、消费者要学新类型。而 `run.start` 的 `additionalProperties: true` 已经免费提供承载位(§2.5),且 `category: "trace"` 天然不进消息投影(§6.7 的安全属性)。新开事件是纯成本。
- **新开 `GET /api/runs/{rid}/constitution` 端点**:`?event_types=run.start` 已存在且有 `context:memory` 的消费先例(§2.6)。新端点意味着新鉴权、新测试、新文档,零收益。
- **把快照做成 config 派生(每 run 重新按 config 算一遍,不碰工厂)**:会与**真正编译进图的东西漂移**——optional middleware 的生效条件、authorization Layer 1 的删除结果、deferred setup 的实际内容都依赖运行时上下文(`runtime.context` 是 caller-mergeable 的),纯 config 推导会算出"应该装什么"而不是"实际装了什么"。而"实际装了什么"正是本 spec 唯一的价值。
- **发两套事件(开发者一套、终端用户一套)**:两套必然腐烂。§6.8 的裁决是一份真相 + 两层渲染,stage 分类法服务端拥有、文案前端拥有。
- **把 ⑧ 的六道闸门埋点并入本 spec**:两者耦合度为零(⑧ 照抄 §2.7 的 `record_middleware` 形状,不碰工厂、不碰契约 schema),合并只会让本 spec 的唯一非旁路改动被埋在一堆旁路改动里,评审时看不清风险面。分开实施。
- **与丙1 的能力清单端点共用类型定义 / 共用解析函数**:两者真值条件不同(存储声明 vs 真实组装),共用会把"配置里写了什么"和"运行时装了什么"混成一个概念,违反丙1 spec §3 与本 spec §3 的不合并原则。仅对齐 `name`/`source`/`group` 字段名与 `source` 取值域。
- **用 React Flow 画环(2026-09-11 实测后否决)**:四条理由。① **它是净新增成本**:`src/` 只有 `ai-elements/` 那 9 个包装组件 import 它,而它们零外部消费者 ⇒ 实测 **≈93 KB gzip**(`@xyflow/react` 58,564 B + `@xyflow/system` 34,242 B),而线程路由只剩 **7,441 字节**余量。② **包装组件在环形里用不了且不许改**:`ai-elements/node.tsx` 把 Handle 硬编码成 Left/target + Right/source(左进右出),`ai-elements/**` 是 registry 生成物、`frontend/AGENTS.md:281` 明令不可手改 ⇒ 引它也得自写包装。③ **省不掉最难那步**:React Flow 不附带布局引擎(dagre/elk 另装;dagre 是分层 DAG),5 段固定语义的弧不需要布局引擎,极坐标数学两方案都得手写。④ **为用不上的视口付费**:`Canvas` 包装已经把 `panOnDrag`/`zoomOnDoubleClick` 关掉了,而环的位次由 tests 钉死、**不可编排、无可拖拽**。⑤ 代价面:不引它则该路由零新增依赖。**注意反向证据**:预算表过期且不在 CI,所以这条是设计成本而非门禁;**且本否决不适用于丙1 的能力清单**——那是真的二部图(agent → tools),React Flow 在那儿有正当理由。
- **把十段流图全部画出来**:②③⑨ 三段是管道、① 的设计时预览归丙1(§5),画成盒子只给用户无法行动的信息,且会稀释 ⑦⑧⑩ 三段的解释力。**但 ④⑥ 不在此列**——它们不是构成却可行动性最高,已单独认领为 §12 第 5 项。初版把 ①②③④⑥⑨ 一并否掉是过度归并。
- **七段线性阶段(`intake`/`context`/`model`/`tools`/`guards`/`synthesis`/`delivery`)**:本 spec 的初版提案,**已否决**,三条理由见 §6.6.1——`guards` 不是位次而是包裹层(且跨 `model` 与 `tools` 两个挂载点)、`synthesis` 与 `delivery` 的成员是 `after_agent` 只走一次而非每圈都走、分布失衡(一段 9 个一段 1 个)。
- **把阶段当"角色"而非"位次",画成分层/洋葱视图**(包裹层画外圈、位次层画内圈):这在结构上最诚实——wrap-only 中间件约占 44%(§2.1),它们本来就没有位次槽。**否决理由是与需求不符**:用户的原话是"用户可以看到自己问了问题后 agent 是怎么去工作的,**流程走到哪**",那是位次概念;洋葱图按**包裹深度**同心分层,没有"沿路前进"的路径,因此承载不了"走到哪"的脉冲动画。
  > **这条否决的理由只对洋葱成立,不能连带否掉环形——初版曾把它当成拒绝一切非线性布局的依据,是一处过度推广,2026-09-10 已修正。** 环 ≠ 洋葱:洋葱是按包裹深度分层,环是把**同一条线性管道首尾接起来**,它有明确的前进路径,因此**同时**承载位次(指针沿环走)与圈结构(绕 N 圈)。环形已被采纳(§6.6.1 的二次裁决)。洋葱仍然否决;若日后用户改口要"看清包裹关系"而非"看清进度",**洋葱**(不是环)应当重新评估。
- **五段线性管道(初版采纳、现已否决)**:七段被否之后的落点,**2026-09-10 由环形取代**。否决理由是它无法表达 §6.6.2 自己写出的真实时间结构 `intake → [context → model ⇄ tools] × N 圈 → epilogue`:`context` 的 12 个成员每圈都走却被画成"第二步",`model ⇄ tools` 的双向循环被画成两个先后格子,补救手段是给 `frequency` 加文字标注("每圈检查")——**用文字补形状的债**,且"第几格亮了"与"这件事每圈都在发生"是两个互相矛盾的信号同时出现在一张图上。改环形的代价见 §6.6.1;它带出的两项**都已裁决**——`extension` 的位置(§8 风险 11)与**环形怎么实现(§8 风险 12:手写 SVG,不引 React Flow)**。**`middlewares[]` 的 `kind` 字段在两个方案下都必须存在**(区分占位次的成员与不占位次的闸门),它不是线性方案的专属遗产。

## 12. 非目标与后续

**本期不做**:前端构成视图、⑧ 六道闸门埋点、**subagent 的构成快照**(§12 第 7 项)、stage 文案与 i18n、构成快照的历史对比(diff 两个 run 的构成)、跨 run 聚合统计、任何写入路径。

**本线的后续项(依赖排序,非偏好排序):**

1. **⑧ 闸门埋点**(天级,纯旁路)——**已另立 spec:`2026-09-11-harness-gate-instrumentation-design.md`**(2026-09-11 立项)。原文四项走 `middleware:{tag}`(ReadBeforeWrite 拦截、ToolProgress WARNED/BLOCKED、subagent 限额截断、deferred 工具提升);**新 spec 的勘查把「改变了执行结果的闸门」这条规则跑全,补上两处同类**:`SandboxAudit`(命令位置替换会被拦)与 `SkillToolPolicy`(越权工具会被拦)——**共 6 个埋点**,见新 spec §3.1(该处标注为**可被否决**)。subagent 侧 `loop_capped` / `token_capped` **零后端改动**,通道已存在(`stop_reason` → `subagent.end`),只需前端渲染。前置:新增 tag ≤21 字符(已核实为 32 − 11 = 21,六个新 tag 全部 ≤ 14)。
2. **前端构成视图**(另立 spec)——消费本 spec 的 `run.start.constitution` + ⑧ 的事件。**布局已裁决为环形**(§6.6.1),**环形怎么实现也已裁决(2026-09-11):手写 SVG,不引 React Flow**(§8 风险 12,含四条实测证据)。**已裁决不用再议的**:两档是**两个独立组件**(§6.8.1);`extension` 是 `kind:"member"` 的环外附加带、`loop:false`(§8 风险 11);⑧ 的闸门通知**长在既有工具卡上**;**构成上头部栏、⑩ 交付层留在内联**(§12.1,2026-09-11 修订——原"两者共用内联锚点"已撤销);环形与预算无关(SVG 零依赖)。**落点已裁决(2026-09-11):头部栏触发器 + Dialog,不新增路由、不新增顶级入口**(详见 §12.1)。原"落哪个路由"的三候选(A thread 内嵌 / B 独立路由 / C 头部弹层)**由 C 变体胜出**——但**不是**我原先描述的"头部弹层放不下环",而是**头部只放触发器、环开在 Dialog**,理由见 §12.1。**`middlewares[]` 的 tooltip 文案已冻结**(§13),前端 spec 不再重新裁决。

   > **✅ 本项已交付(2026-09-12)。** 另立的前端 spec = `2026-09-12-harness-constitution-frontend-design.md`,实施计划 = `plans/2026-09-12-harness-constitution-frontend.md`(六个 Task 全绿,提交 `4da65ce3` → `12f1cf02` + 本 Task 6)。交付内容:头部触发器 + Dialog、环形(手写 SVG)、两档独立组件、67 key 文案全量落盘 + 三处 guard、`run.start` 即时落库(见下)。**真栈真浏览器验收 17/17 过**(系统 Chrome + Playwright,私有 `:8099`),含窄屏 375px 不溢出、刷新后闸门通知仍在、**run 进行中 686ms 即可读到**(§12.1 那条决定性理由)。
   >
   > **两处只有真浏览器才暴露的缺陷(单测当时全绿)**,都已修并各自补了测试:①**新对话的第一次 run 看不到构成**——`liveRunId` 被"线程切换即清空"的重置效果抹掉,而新线程的 `threadId` 从 undefined 变真实值正好触发它;改成 run id 与所属 thread **成对携带**后不再需要重置效果。②**一次读到空就被永久缓存**——`run.start` 在 run 创建后 0.17–2.2s 才落库(实测),而页面拿到 run id 就立刻问,空答案被 `staleTime: Infinity` 锁住整轮;`fetchConstitution` 改为有界重问。
   >
   > **本项零新依赖**(环形手写 SVG,§8 风险 12 已裁)⇒ `pnpm perf:check` **不再是本项的约束**;文案 **67 条**(§13 的 60 + 前端 spec §8.3 新批的 7)落 `zh-CN.ts` / `en-US.ts` / **`types.ts`** 三文件,guard test 三处(§13.6)。

   **本项必须一并交付 i18n 文案表的防腐机制(2026-09-10 裁决,2026-09-11 更新为三处)。** §6.6.3 的人话列不进 payload、归前端 i18n,于是文案表是**按 middleware 真名索引**的。服务端那张 stage 表有 guard test 防腐(漏一个 middleware 就红,§6.6.4),**前端这张文案表目前没有任何对账机制**——加一个 middleware,开发者档会静默显示成 `XxxMiddleware` 类名,没有任何测试会红。腐烂风险从服务端搬到了前端,防线没跟着搬。**文案与三处测试的完整定义见 §13**(60 key × 2 = 120 条,不是原写的 78 条)。**要求三处测试:**

   1. **前端 locale**(`frontend/tests/unit/…`):断言 zh-CN 与 en-US 两个 locale 对**一份 checked-in 的密钥清单**里每个 key 都有非空条目,且没有多余条目(双向等值,防止改名后留下孤儿文案)。
   2. **前端类型**(同文件或相邻):断言 `types.ts` 的 `constitution` 块与同一清单一致。**漏一个 key 会在 TS 编译期就红,但孤儿 key 不会** —— 所以要显式断言,不能只靠编译。
   3. **后端**(`backend/tests/test_constitution_i18n_keys.py`):断言那份 checked-in 清单与 `STAGE_OF_MIDDLEWARE` 的键集**逐项相等**。后端测试读另一个模块的仓库文件在本仓有先例(`backend/tests/test_compose_default_bind_host.py` 读 `docker/` 的 compose 文件),纪律同 §6.6.4 引的 `_BASELINE_TABLE_NAMES` 钉 `0001_baseline.upgrade()`——**改了服务端表而没同步清单,CI 就红**。

   **为什么不让前端从 `hooks[]`/`error` 之类的运行期数据里取 key**:文案是**静态穷举**的,必须能在构建期校验;靠运行期发现漏文案,等价于让用户先看到类名。
3. **十段流图里的 ⑩ 交付层**(~~零后端改动~~)——`run.delivery` 回执已带 `produced_paths` / `presented_paths` / `matched_paths` / `verification` / `stage` / `satisfied`,`workspace_changes` 也已存在且前端有 `core/workspace-changes/`。这是"agent 最后拿出了什么"的现成故事,可与构成视图同期做。**按 §6.6.1 它渲染在 `epilogue`(环的出口弧)内**,与 Title / Memory 同弧但 producer 不同,所以它不进 `stages[].members` 计数。**注意 `run.delivery` 今天前端零消费者**——2026-09-10 grep `run.delivery` / `produced_paths` / `presented_paths` 在 `frontend/src` 全部零命中,而后端三个发射点已存在(`runtime/runs/worker.py:136`、`runtime/runs/manager.py:995`、`runtime/journal.py:885-891`)。所以本项是"零后端改动"里最大的一块纯前端增量。

   > **✅ 已交付(2026-09-12)。** 另立 spec = `2026-09-12-harness-delivery-layer-design.md`,plan = `plans/2026-09-12-harness-delivery-layer.md`。**两处前提被核实推翻,均已就地更正**:
   >
   > **① "零后端改动"不成立(用户 2026-09-12 裁 a:先补声明)。** `run.delivery` **有生产者却声明里没有它**——契约的 12 个 `event_type` 里没有、`catalog.py` 零命中、`RUN_EVENT_STREAM.md` 无、**连契约的 `known_gaps` 都没登记**。UI 要依赖它,就得先把形状钉住(尤其是 `stage`/`satisfied` 这几个判定位),否则一次 worker 重构就会静默失配。补齐落 **4 处 + 7 条契约测试**(`bf7592f7`),`constants.py` 无需改动,类别必须沿用 `outputs`(`change_event_category` 是破坏性变更)。
   >
   > **② §8 那条"后端把 `_DELIVERY_INCOMPLETE_ERROR` 放在 `error` 字段里、界面必须能与它对上"——前提不成立。** 2026-09-12 真栈实测:该 run 的 **`RunResponse` 根本没有 `error` 字段**(`routers/thread_runs.py:150-168`),`run.error` 事件也没发(终态事件只有 `run.end`,而它按已知缺口永远写 `success`)。**所以后端把 run 标成 `error` 却不告诉任何人为什么** ——核查一个真实失败 run:状态 `error`、消息**在任何 API 上都取不到**。含义有两层:(a) 本项那一行**目前是用户唯一的线索**(实测截图上 agent 自己说 "Done.",界面别处一片正常,只有那行红字说出真相)——这抬高了它的价值,而不是降低;(b) "界面与后端对得上"这条判据只能退到**状态级**(`status=error`)与回执自己的字段,拿不到消息级;把那条消息**暴露出来**属于第 5 项(④⑥ 失败类型化)的活,已记为其输入。
   >
   > 交付内容:3 条 `delivery.*` 文案 + checked-in 清单 + 两处 guard(`4da65ce3` 之后:`08d67e46`)· 前端数据层 `core/delivery/`(`f8b28c66`)· **文件卡上那一行**(成功安静/失败醒目,`5c02446e`,**不入环、对 `constitution-*` 零改动**)· **真栈真浏览器三条腿 11/11**(系统 Chrome + Playwright,私有 `:8099`):成功态 `已交出 1/1 个产物`(muted)· 失败态 `产出了 1 个，一个都没交出`(destructive,且该 run 后端确实 `error`)· 产出为空的 run **卡片在、行不在**。
4. **⑤ 状态机做外框**~~(零后端改动)~~——`RunRow.status` 是权威(`run.end` 永远说成功,**不能信**),`stream_replay_gap`、`CancelOutcome` 七种结果、`orphan_recovered` 均已存在。**今天前端只有 `stream_replay_gap` 被呈现**(`core/api/api-client.ts` → `core/threads/hooks.ts:1807-1824` 全量重置 + `toast.warning`);`CancelOutcome` 与 `orphan_recovered` 在 `frontend/src` **零命中**,停止按钮(`components/workspace/input-box.tsx:1154-1162`)不区分取消结果,也没有类型化的 run 状态徽标(只有 `thread.isLoading` / `thread.error` 两个内部态)。

   **交付状态(2026-09-12)**:✅ 已交付 —— 设计见 `2026-09-12-harness-run-status-failure-design.md`、实施见同名 plan;徽标只读 `RunRow.status`,`success` **零呈现**(真栈两次实测,且证明锚点确实渲染)。两处按实测收窄:① 它**不是零后端改动**(与第 5 项共用那个加性 `error` 字段);② **被停止的 run 若没有收尾 assistant 气泡,徽标不呈现** —— 实测其消息停在工具态、共享锚点只接受 `assistant` 组(文件卡同病),**用户裁定为正确行为**("读者自己停的,本就没有结局可说")。真栈四条腿:占用/运行期失败/成功零呈现通过,配置类(400)从 UI 不可达(已证:选择器只列已允许模型;且 `rag-chat-model:` 那个键**全仓无人读**)。提交 `e2ad45b0`→`6cfaee23`(**未推送**)。
5. **④⑥ run 准入与预检失败的类型化呈现**(2026-09-10 新认领;§5 已把这两段从"管道不画"里摘出)——**关键事实:后端已经类型化了,缺口在前端。** `app/gateway/services/__init__.py` 的准入路径逐类给出可判别的状态码与具体 `detail`:

   | 失败 | 状态码 | 位置 | 用户该做什么 |
   |---|---|---|---|
   | 请求体校验失败 | 422 | `services/__init__.py:1074`、`:1082` | 通常是前端 bug,不是用户可行动项 |
   | 模型不在 allowlist | 400 | `:1102-1105`(`Model {name!r} is not in the configured model allowlist`) | **换模型** |
   | thread 不存在 | 404 | `:1129` | 回列表 |
   | **一线程一活跃 run 冲突** | **409** | `:1264`(`create_or_reject`,底层是 `uq_runs_thread_active` 部分唯一索引) | **等上一个跑完 / 停掉它** |
   | 未实现的 SDK 选项 | 501 | `:1266` | 通常是前端 bug |
   | checkpoint 模式不兼容 | 409 / 503 | `runtime/checkpoint_mode.py` 的 `CheckpointModeMismatchError`(threads 路由带 cause 与 thread id 转 409)/ `CheckpointModeReconfigurationError`(转 503) | **按匹配模式重启** |

   ⑥ worker 预检侧:`worker.py:588-593` 的注释与 `backend/AGENTS.md` 都记录了 journal 构造**被刻意移到预检之前**(#4272),所以预检失败(checkpoint 校验失败、等待上一个 run finalize 时被取消、沙箱获取失败)照样落终态 + 一条零投递回执,`stop_reason=orphan_recovered` 也已存在。**今天这些全部塌进一条会消失的 toast**:`core/threads/hooks.ts:1864` 的 `toast.error(getStreamErrorMessage(error))`,而 `getStreamErrorMessage`(`:1467-1488`)透传后端 `message`、拿不到就落 `"Request failed."`。三类可行动性完全不同的失败(等/停、改 config、换模型)共用同一条无归属、无操作、会消失的呈现。

   **前置核实(决定它是零后端改动还是需要补字段):** SSE 流已建立**之后**的失败走的是 `run.error` 事件还是 `error` SSE 帧,其 payload 是否带**可判别的 reason 字段**(而不是只有自由文本 `detail`)?若只有自由文本,前端按字符串匹配就是在猜——那时需要后端补一个 reason 枚举,本项就**不是**零后端改动。流建立**之前**的失败(上表的 400/404/409/422/501/503)已经有状态码可判,可以直接做。

   **与第 4 项共用呈现位**:第 4 项讲"run 怎么结束的",本项讲"run 为什么没开始 / 没跑完"。两者必须落在同一个位置、同一套视觉语言,否则用户会看到两种不同的失败样式。

   **交付状态(2026-09-12)**:✅ 已交付 —— 设计见 `2026-09-12-harness-run-status-failure-design.md` §4/§5、实施见同名 plan。**三条前提被实测更正**(都记在那份 spec 里):① 它**不是"零后端改动"** —— post-stream 今天**没有任何字段**承载原因,已补加性字段 `RunResponse.error`(`e2ad45b0`);② "全部塌进 `hooks.ts:1864` 那条 toast"**落点说错了** —— 实测是**共享的 `onError`**(`hooks.ts:1879`),因为 SDK 的 `StreamManager.start` 不 await 队列、`enqueue` 也不 rethrow ⇒ **`await thread.submit(...)` 永不 reject**,`:2413` 那个 catch 接不到这些状态码;③ 由此带出一条原计划没有的约束:**失败时那条用户消息会被 `onError` 清掉**,而 §4.1 的 pre-stream 锚点正是它 ⇒ **用户裁定保留那条消息**(只对 plain send,replay 路径保留会出重影)。交付:两个纯分类入口 + 投影 + 查询层(`1a32c2d0`)、pre-stream 入口与保留(`457ed28a`)、7 条文案 + 前后端两处 guard(`502b54b5`)、徽标 + 失败条 + 两段式锚点(`7fedd88f`)、真栈验收中查出的 `enabled` 真缺陷及修复(`6cfaee23`)。**已裁:`422`/`501` 不呈现**;**文案里只有 `details` 是动作文字**,其余四句的指令写在句子本身(用户裁决)。真栈:占用 409 与运行期失败两条腿通过,配置类(400)从 UI 不可达(已证)。**均未推送。**
6. **实时脉冲("流程走到哪")**(2026-09-10 补入)——§1 承诺了"后续的阶段投影、**实时脉冲**、双视图全部消费这一份快照",但原 §12 的四项里**没有对应工作项**,这是一处 spec 内部不一致,本项补上。**它需要两个数据源,缺一不可:**
   - **⑧ 闸门的运行时事件** —— 第 1 项,另立 spec,还没写。没有它,脉冲只能说"走到 model 了",说不了"这里被拦了一下"。
   - **圈数计数器 `llm.ai.response` 的 `metadata.llm_call_index`**(`runtime/journal.py:486`)—— 已存在,但**前端零消费者**(2026-09-10 grep `llm_call_index` 在 `frontend/src` 零命中)。通道是通的:与 `subagent.step` 的分页回填同一个 `?event_types=` 机制(`routers/thread_runs.py:1403-1426`),只是没有代码读它。没有它,环形渲染画得出环、**画不出指针绕了第几圈**。

   **两条形状约束:** ① 脉冲必须沿**环**走 N 圈(§6.6.1),不是五格依次点亮——这是环形布局存在的全部理由;② 构成快照仍然是 **fetch-once**(run 内不变,§6.7),**脉冲是第二条数据通道**,不要把两者混成一次拉取,否则会把 run 级静态事实错误地当成流式数据处理。

   **依赖排序:本项在第 1 项与第 2 项之后**(需要闸门事件 + 需要环已渲染出来)。**两项前置均已交付**。

   > **spec + plan 已成对(2026-09-13):`2026-09-13-harness-live-pulse-design.md` / `../plans/2026-09-13-harness-live-pulse.md`(5 个 Task)。** 起草时核实出**本文上面那句"通道是通的"只对了一半**:闸门事件确实实时(#1 双发),但 **`llm_call_index` 挂在 journal 事件上、没有实时通道**(全仓实时 custom 发射者只有 5 个,不含它)—— 那句"通"指的是**分页回填**,不是实时。⇒ "实时性从哪来"由此成为裁决点 D1;**Task 0 探针先跑**(私有 `:8099`,3 条真 run 证明客户端从既有 live 状态推出的圈数与 `llm_call_index` **逐条相等**),**用户据此裁 A(前端派生,零后端改动)**;D2(一圈 = 一次 model→tools 往返、闸门不在环上重复)与 D3(只在 Dialog 内)亦已裁。**开工前无需再议。**
7. **subagent 的构成快照**(2026-09-10 新认领;**不是硬墙**——§5 已就地纠正"做不了"的说法)——委派出去的子代理有自己的 middleware 链(`build_subagent_runtime_middlewares`,与 lead 不同:摘要中间件的插入位置在后、没有 lead-only 的那些),今天**完全没有记录**,所以构成图只能讲 lead 的故事、画不出委派树。
   **机制(复用现成通道,不新开)**:§4 的注册表是**进程级**的,子代理图同样经 `create_agent` 组装 → **它已经在注册表里**;唯一跨不过去的是 journal(`deerflow_loop_bound=True` 把 journal 从子代理回调里摘除)。所以照 `stop_reason` 的**现成先例**走加性字段:`_aexecute` 在图仍存活时 `constitution_for(graph)` → 塞进 `SubagentResult` → `task_tool` 侧写进 `subagent.end`(通道已存在,§5 第一行就是它的先例)。
   **时序约束(易踩)**:读取必须在 `_aexecute` **内部**、图释放之前。等执行器返回后再查注册表,弱引用可能已被回收 → 静默拿到 `None`。这与 §4 的回收语义是同一件事的两面。
   **契约影响**:`contracts/subagent_status_contract.json` 需加一个加性字段(与 `stop_reason` 同样是 optional,老消费者忽略);`subagent.end` 的载荷形状要过 §9 那套 5 处同步。
   **代价**:多一处**非旁路改动**(子代理构建器,与 §6.2 的 lead 站点同类),因此不适合并进本 spec(本 spec 的唯一非旁路改动已经要评审了);且它让"委派树"真正成立,产品收益大,值得单列。

### 12.1 跨项约束:与既有 run 作用域 UI 的整合点(2026-09-10;**2026-09-11 修订**)

**这一条管的是"别做完才发现和现有 UI 打架"**,适用于第 2/3/4/5 项:

- **⑧ 的闸门通知长在既有的工具卡上,不另开一处。** `Guardrail` / `SandboxAudit` / `ReadBeforeWrite` / `ToolProgress` 拦的都是**某一次工具调用**,而工具卡(`messages/message-group.tsx` 的步骤项)就是它的自然归属;现有的 `deerflow_tool_meta`(`status` / `error_type` / `recoverable_by_model` / `recommended_next_action`)已经是这些闸门在结果上的残留痕迹。**另开一个"闸门面板"会让同一次工具调用的信息分裂在两处。**

- **构成视图与 ⑩ 交付层"共用同一个锚点"已撤销,改成按信息性质拆开(2026-09-11 用户裁决)。**

  原裁决(2026-09-10)让两者共用"本次 run 最后一条 assistant 气泡"。**它的真实来源是一条反重复规则**——`frontend/AGENTS.md` 的 "Any future run-scoped display belongs in the same place — **do not hang one off every message**"——**管的是"别每条消息挂一份",不是"必须内联"**。2026-09-11 复核后发现这两件事其实是**两类信息**,继续绑在一处会让脉冲无处可放:

  | | 信息性质 | 落点 |
  |---|---|---|
  | **⑩ 交付层**(`run.delivery`:"这次拿出了什么") | **对话内容** | **留在内联**——本次 run 最后一条 assistant 气泡(与 `workspace-change` 卡一致) |
  | **构成**(:"harness 怎么装的 / 走到哪了") | **chrome / 元信息** | **上头部栏**(与 `ContextUsageBadge` / `ArtifactTrigger` / token 用量一致) |

  **决定性论据(实时脉冲,第 6 项)**:内联锚点是**本次 run 最后一条 assistant 气泡**,而它在 run 跑完之前并不确定——"流程走到哪"必须在**运行过程中**看。头部是稳定且始终在屏幕上的位置,内联不是。

  **反重复规则本身仍然有效**:构成**不在消息流里再渲染一份**。头部是它唯一的落点。

- **头部栏的形态已裁决(2026-09-11):`h-12` 头部只放触发器,环开在 Dialog 里。**

  - **头部放不下环**:`app/workspace/chats/[thread_id]/page.tsx:281` 的 header 是 `h-12`(48px,`absolute top-0 z-30`)。所以头部是**触发器**,内容是 **Dialog 居中弹窗**。
  - **触发器照抄 `ArtifactTrigger` 的形状**:`variant="ghost"` + `Tooltip` + `<span className="hidden sm:inline">` 标签 + `aria-label`。**不新增顶级入口、不新增路由**(这就是原"落哪个路由"那个裁决的答案:它活在既有 thread 视图里)。
  - **Dialog 尺寸**:仓里 `DialogContent` 默认 `sm:max-w-lg`(512px),业务里有用到 `max-w-2xl` / `max-w-5xl` 的先例。环需要近似方形的区域(5 段弧 + 弧上标签),**建议 `sm:max-w-2xl` 起步**,具体由前端 spec 定。
  - **`Dialog` 而非右侧面板**(用户 2026-09-11 裁决):右侧面板是**互斥**的(`ArtifactTrigger` 开时会 `sidecar?.close()`),放构成会挤掉产物/浏览器/sidecar;Dialog 空间更宽松且不参与那套互斥。**代价**:Dialog 会挡住对话——对"边跑边看"是减分项,**但头部触发器上的实时小状态(脉冲)仍然可见**,所以不致命。
  - **唯一需要实测的风险是拥挤**:头部右簇已有 **6 项**(定时任务 · token/上下文 · sidecar · 浏览器 · 导出 · 产物),加它成**第 7 项**;且标签在 `sm` 以下已隐藏(`hidden sm:inline`),**窄屏全靠图标**。前端 spec 必须验窄屏(移动端视口),必要时把它收进溢出菜单。
  - **不可拖动**(与环形裁决同源):34 条 middleware 的顺序是语义(Clarification 必须最后、SkillToolPolicy 必须紧跟 SkillActivation),**改顺序就是改行为** ⇒ 它是**只读仪表**,不是可编辑画布(可拖拽画布是丙1/甲那条线)。可交互的只有:点弧段展开成员 · 悬停 tooltip · 点闸门徽标看它拦了什么 · 点成员跳去对应工具卡。

- **不要与 subtask 卡重复表达同一件事**:委派的可视化已经由 subtask 卡承担(含步骤时间线与实时状态)。第 7 项落地时,子代理构成应当是**那张卡的展开内容**,不是新的一张卡。

**编号:已裁决不引入独立体系(§8 风险 9)。** 本线的"二期"= 上面这七项,引用时写"§12 第 N 项";丙1 的 甲/乙/丙 编号归丙1,两条线不共用词汇。

**为后续项预留的形状**(本期必须按此产出,否则返工):

- **`stages[]` 是终端用户视图「静态部分」的唯一输入**(§6.8.1;用户档的动态内容来自 ⑧ 与 ⑩ 的运行时事件),条目形状为 `{key, loop, members, gates, handoff_gates}`——**只有 key、`loop` 与计数,绝不含 middleware 真名**。它必须独立于 `middlewares[]` 存在,不能靠前端从明细推导:用户档只用它的 `key` / `loop` / 顺序,**开发者档折叠态用它的计数**;两侧都不许从 `middlewares[]` 反推,否则要么用户档静默显示内部词汇、要么前端在"按名字猜结构"(§6.6.4 禁止)。这条由 §10 的"策展投影不变量"测试钉住。**`loop` 是环形渲染(§6.6.1)的必要输入**:它标记哪三段构成循环体,前端不得从 key 顺序推导("首尾之间就是循环体"),因为 `extension` 兜底段是第六个合法 stage 取值(§8 风险 11),推导在那一步必然猜错。即便前端最终退回线性折中布局,`loop` 仍然要发——圈数徽标也要知道循环体是哪几段。
- **`middlewares[]` 是开发者视图的明细输入**,条目形状为 `{name, stage, kind, hooks, frequency}` 加覆盖层专属的 `{overlay_kind, exits_run}`。**不要写成扁平字符串数组**——前端要靠 `kind` 区分"占位次的成员"与"不占位次的闸门",靠 `frequency` 区分"每 run 一次"与"每圈都跑",否则 §6.6.1 与 §6.6.2 的两个裁决在渲染层就都丢了(Title 会被画成只在末尾亮一次,而它实测每圈都触发)。**`hooks[]` 与 `frequency` 必须都在**:前者是原始代码事实(可展开给开发者档看"到底哪几个 hook"),后者是从它派生的三值粗分类(渲染"该绕几圈"用);**`mixed` 已废除,不是合法取值**(§6.5)。
- **前端 i18n 文案表的密钥清单是 `middlewares[].name` 的静态穷举**(34 具名 + 5 个 stage key),不是从任何运行期数据推的;两条 guard test 分别钉"文案表 ↔ 清单"与"清单 ↔ `STAGE_OF_MIDDLEWARE` 键集",见 §12 第 2 项。
- **五个 stage key 集合在本 spec 冻结**(`intake` / `context` / `model` / `tools` / `epilogue`,加 extension 兜底)。中文文案属前端 spec(§8 风险 8),但 key 一旦发布就是契约,改名要走 `schema_version`。`frequency` 的**三个**取值(`once_per_run` / `per_model_call` / `per_tool_call`)同理冻结——**注意取消一个取值和新增一个一样是契约变更**:`mixed` 是在发布前(本期)取消的,因此免费;一旦 `schema_version: 1` 发出去,再去掉或用满一个取值都要走版本变更。
- `tools.mounted[]` 的 `name`/`source`/`group` 与丙1 spec §11.1 对齐,便于两条线在同一张卡片视觉语言下渲染(丙1 spec §6.3 定义了卡片四要素与确定性标记位)。
- `schema_version: 1` 从第一天就有,后续加字段时前端可据此降级。
## 13. 冻结文案(2026-09-11 用户批,前端 spec 直接消费)

**这一节把 §8 风险 8 里"文案属于前端 spec"那条兑现掉**:文案由用户 2026-09-11 逐条批定,**前端 spec 不再重新裁决文案,只消费**。落 **三个文件**:`src/core/i18n/locales/zh-CN.ts` / `en-US.ts` / **`types.ts`**(类型定义必须同步——原方案漏了这一个)。

> **计数更正**:原方案记的"78 条"是 **39 个 key × 2 locale 的条目数**,而且既漏算了两类又没算 tooltip。实际 **60 个 key × 2 = 120 条**:核心 26 + tooltip 34。

**键前缀统一为 `constitution.*`**,`types.ts` 里对应一个 `constitution` 块。

### 13.1 环上的段名(静态,画在弧上)

| key | zh-CN | en-US |
|---|---|---|
| `constitution.stage.intake` | 接收 | Intake |
| `constitution.stage.context` | 备料 | Context |
| `constitution.stage.model` | 思考 | Model |
| `constitution.stage.tools` | 执行 | Tools |
| `constitution.stage.epilogue` | 收尾 | Wrap-up |
| `constitution.stage.extension` | 扩展 | Extension |

### 13.2 指针到某段时显示的一句(动态)

| key | zh-CN | en-US |
|---|---|---|
| `constitution.activity.intake` | 收到了你的问题 | Got your message |
| `constitution.activity.context` | 在准备上下文 | Preparing context |
| `constitution.activity.model` | 在思考 | Thinking |
| `constitution.activity.tools` | 在调用工具 | Using tools |
| `constitution.activity.epilogue` | 正在收尾 | Wrapping up |

### 13.3 闸门触发时的话(用户档的全部价值所在)

**来源是 ⑧ 的 6 个 gate tag**(`2026-09-11-harness-gate-instrumentation-design.md`),**不是**本 spec 的静态快照。快照只负责说明"这里有 5 道闸门"。

| key | zh-CN | en-US |
|---|---|---|
| `constitution.gate.read_gate` | 有个文件没先读就想改，已拦下 | Blocked a write to a file that wasn't read first |
| `constitution.gate.tool_progress` | 某个工具连续没给出新信息，已停用 | A tool kept returning nothing new, so it was disabled |
| `constitution.gate.subagent_limit` | 同时派出的子任务太多，已收窄 | Too many subtasks at once — trimmed |
| `constitution.gate.tool_promotion` | 放出了一批之前隐藏的工具 | Released some previously hidden tools |
| `constitution.gate.sandbox_audit` | 有条命令有风险，没让它执行 | A command looked risky, so it didn't run |
| `constitution.gate.skill_policy` | 当前技能不允许用这个工具 | The active skill doesn't allow that tool |

### 13.4 开发者档的两个轴与视图自身

| key | zh-CN | en-US |
|---|---|---|
| `constitution.frequency.once_per_run` | 每 run 一次 | once per run |
| `constitution.frequency.per_model_call` | 每圈 | per model call |
| `constitution.frequency.per_tool_call` | 每次工具调用 | per tool call |
| `constitution.kind.member` | 位次成员 | member |
| `constitution.kind.gate` | 闸门 | gate |
| `constitution.kind.handoff` | 交接 | handoff |
| `constitution.title` | 本次 run 的构成 | This run's harness |
| `constitution.a11y.segment` | 环上第 N 段，共 M 项 | Segment N of M |
| `constitution.a11y.total` | 共 N 项 | N items |

### 13.5 34 条 middleware tooltip

每条一句话,**只描述它做什么,不抄实现细节**。绑定的是 `middlewares[].name`(真实类名,§6.6.3 的命名要求:必须逐字等于 `type(mw).__name__`)。

| middleware 真名 | zh-CN | en-US |
|---|---|---|
| `ThreadDataMiddleware` | 建这个会话专属的工作目录 | Creates this conversation's own working directories |
| `UploadsMiddleware` | 告诉你我看到了刚上传的文件 | Notes the files you just uploaded |
| `InputSanitizationMiddleware` | 先给用户输入做消毒，原文另存备用 | Sanitizes your input first, keeping the original aside |
| `ToolOutputBudgetMiddleware` | 工具返回太长就存成文件，对话里只留摘要 | Long tool output goes to a file; only a summary stays |
| `ToolResultSanitizationMiddleware` | 清掉外部网页内容里伪装的系统标签 | Strips fake system tags from fetched web content |
| `DanglingToolCallMiddleware` | 给没收到回应的工具调用补个占位 | Backfills a placeholder for tool calls that got no reply |
| `DynamicContextMiddleware` | 注入今天的日期和你的记忆 | Injects today's date and your memory |
| `SkillActivationMiddleware` | 你打 `/技能名` 时把该技能正文读进来 | Loads a skill's body when you type `/skill-name` |
| `DurableContextMiddleware` | 把委派记录与技能引用存进状态，压缩后仍在 | Keeps delegation and skill records visible through compaction |
| `DeerFlowSummarizationMiddleware` | 快装满时把旧对话压成摘要 | Compresses old turns into a summary near the context limit |
| `TodoMiddleware` | 计划模式下提供待办清单 | Provides the todo list in plan mode |
| `ViewImageMiddleware` | 把图片转成模型能看的形式 | Converts images into something the model can see |
| `SystemMessageCoalescingMiddleware` | 把多条系统消息合成一条 | Merges multiple system messages into one |
| `DeepResearchMiddleware` | 只有 rag agent 装：强制三路检索 | rag agent only: enforces the three-path retrieval |
| `LLMErrorHandlingMiddleware` | 模型挂了转成可恢复的提示，别让整轮崩掉 | Turns a provider failure into a recoverable message |
| `TokenUsageMiddleware` | 记 token 用量 | Records token usage |
| `ModelLengthFinishReasonMiddleware` | 因长度被截断时记下原因 | Records why an answer was cut off by length |
| `SubagentLimitMiddleware` | 超过并发或总量上限的子任务调用会被砍掉 | Drops subtask calls past the concurrency or per-run cap |
| `LoopDetectionMiddleware` | 发现反复调同样的工具就硬停 | Hard-stops the turn when identical tool calls repeat |
| `TokenBudgetMiddleware` | 到 token 上限就强制收尾 | Forces a wrap-up at the token budget |
| `TerminalResponseMiddleware` | 模型回了空内容就提示重试一次 | Retries once when the model returns nothing |
| `SafetyFinishReasonMiddleware` | 被内容过滤终止时不让工具继续跑 | Suppresses tool calls after a content-filter stop |
| `SandboxMiddleware` | 申请沙箱，收尾时释放 | Acquires the sandbox and releases it at the end |
| `SkillToolPolicyMiddleware` | 按当前技能的 allowed-tools 收窄工具集 | Narrows the toolset to the active skill's allowed tools |
| `McpRoutingMiddleware` | 按你说的话自动放出匹配的 MCP 工具 | Auto-releases matching MCP tools based on your message |
| `DeferredToolFilterMiddleware` | 藏起还没放出的 MCP 工具 schema | Hides MCP tool schemas until they're released |
| `GuardrailMiddleware` | 工具执行前的授权 + 护栏双闸 | Authorization and guardrail gates before any tool runs |
| `SandboxAuditMiddleware` | 有风险位置的命令替换会被拦下 | Blocks command substitution in command position |
| `ReadBeforeWriteMiddleware` | 没先读过这个文件就不许改 | Won't let a file be modified before it's read |
| `ToolProgressMiddleware` | 工具反复没新信息就先警告、再停用 | Warns, then disables a tool that keeps returning nothing new |
| `ToolErrorHandlingMiddleware` | 工具报错转成消息，让 run 继续 | Turns tool exceptions into messages so the run continues |
| `ClarificationMiddleware` | 需要你确认时把控制权交回给你 | Hands control back to you when it needs your input |
| `TitleMiddleware` | 第一轮后自动给会话起标题 | Names the conversation after the first exchange |
| `MemoryMiddleware` | 把对话排队给异步记忆抽取 | Queues the conversation for async memory extraction |

### 13.6 guard test 的落点(从"两侧"改"三处")

原方案写"两条测试,一条在每侧",**实测后发现要多钉一处**:

1. **前端 locale 测试**:`zh-CN` 与 `en-US` 对**一份 checked-in 密钥清单**双向等值(每个 key 有非空条目、且无孤儿条目)。
2. **前端类型测试**:`types.ts` 的 `constitution` 块与同一清单一致(漏一个 key 会 TS 编译失败,但**孤儿 key 不会** —— 所以要显式断言)。
3. **后端**:`backend/tests/test_constitution_i18n_keys.py` 断言该清单与 `STAGE_OF_MIDDLEWARE` 的键集逐项相等(先例:`test_compose_default_bind_host.py` 读 `docker/` 的 compose,纪律同 `_BASELINE_TABLE_NAMES` 钉 `0001_baseline.upgrade()`)。
