# harness 闸门埋点(⑧ 运行时事件)— 设计文档

- 日期:2026-09-11
- 分支:沿用 `feat/rag-knowledge-base`(与构成快照同支)
- 上游:构成快照 spec `2026-09-10-harness-constitution-snapshot-design.md`,本 spec 是它的 **§12 第 1 项**
- 相邻:`../../HARNESS_EXECUTION_FLOW_MAP.md` §5(闸门层)、`../../AGENT_HARNESS_VISUALIZATION_RESEARCH.md`

## 1. 目标

构成快照回答"**这次装了哪些闸门**";本 spec 回答"**哪一道闸门这一次真的动了手**"。

这是同一句话的后半截,也是用户最初的痛点:**agent 突然不说话了,他以为坏了**。快照只能说"这里有 5 道闸门",说不了"第 3 道刚把 `write_file` 拦了"。补齐它,⑧ 的运行时叙事才成立,§12 第 6 项(实时脉冲)也才有第二个数据源。

**做法:复用已存在的事件通道,不新增 event_type。** `RunJournal.record_middleware(tag, *, name, hook, action, changes)` 已有 4 个生产调用点,本 spec 再加 6 个。

**本期不做**:前端渲染(§12 第 2 项,另立 spec)、实时脉冲(§12 第 6 项,依赖本项 + 前端)、新 event_type / category / 端点 / 迁移 / 依赖、任何执行语义改动。

## 2. 已核实的前提(2026-09-11 勘查,带行号)

### 2.1 通道与既定纪律

- 事件形状:`event_type = "middleware:{tag}"`,`category = "middleware"`(`runtime/events/catalog.py:77-82`)。
- **tag 上限 21 字符**(`MIDDLEWARE_EVENT_TAG_MAX_LENGTH = RUN_EVENT_TYPE_MAX_LENGTH - len("middleware:")` = 32 − 11);契约 `contracts/run_event_stream_contract.json` 的 `tag_schema` 同样是 `maxLength: 21`。
- 现有 tag 常量与契约 `known_tags` 各 4 个:`guardrail` / `safety_termination` / `skill_activation` / `skill_secrets`。
- **现成惯用法**(`guardrails/middleware.py:84-122`,本 spec 逐字沿用):
  1. `journal = context.get("__run_journal")`,**拿不到就静默 return**;
  2. 组 `changes`;
  3. `try: journal.record_middleware(...) except Exception: warning` —— **审计失败绝不影响执行**。
- **`__run_journal` 由 worker 注入 runtime context**(`runtime/runs/worker.py:776`)。embedded 客户端与 subagent 没有它 → 自然跳过,与"旁路"定位一致。
- 既有 4 个消费者不受影响:`routers/thread_runs.py` 已把 `middleware:*` 从消息 API 滤掉。

### 2.2 六个埋点的可达性(逐个核实)

| 埋点 | hook | runtime 可达性 |
|---|---|---|
| ReadBeforeWriteMiddleware | `wrap_tool_call` 98 / `awrap_tool_call` 126 | ✅ `request.runtime` 是 `ToolCallRequest` 的字段,且**该文件已在用**(`:170` 的 `getattr(request.runtime, "context", None)`) |
| ToolProgressMiddleware | `wrap_tool_call` 485 / `awrap_tool_call` 508 | ✅ 同上 |
| SubagentLimitMiddleware | `after_model` 169 / `aafter_model` 173 | ✅ 已签名收 `runtime`(`:160` 已在写 `runtime.context["stop_reason"]`) |
| **SandboxAuditMiddleware** | `wrap_tool_call` 498 / `awrap_tool_call` 516 | ✅ 同上 |
| **SkillToolPolicyMiddleware** | `wrap_tool_call` 337 / `awrap_tool_call` 352 | ✅ 同类(其 `_active_policy` 已在读 `request.runtime.context`,`:77`) |
| deferred 提升(`tool_search` + McpRouting) | `tool_search` 是 `@tool` 闭包(`tool_search.py:146`);McpRouting 是 `before_model` 122 | ⚠️ **`tool_search` 目前没有 runtime 参数**,见 §4.3 |

**唯一需要签名改动的是 `tool_search`**:当前签名 `def tool_search(query: str, tool_call_id: Annotated[str, InjectedToolCallId]) -> Command`,没有 runtime;而同目录的 `present_file_tool` / `hybrid_search` / `graph_search` / `list_uploaded_files` / `review_skill_package` **都通过 `deerflow.tools.types.Runtime`**(= `ToolRuntime[dict[str, Any], ThreadState]`,`tools/types.py:11`)注入。加一个注入型参数与该先例同款,不是新机制。

### 2.3 两条提升路径可区分,但**在状态里查不到**

`tool_search` 返回 `Command(update={"promoted": {...}, "messages": [ToolMessage(name="tool_search")]})`(`tool_search.py:159-170`);`McpRoutingMiddleware._state_update` 返回裸状态更新(`mcp_routing_middleware.py:104-119`)。

两者写**同一个 `promoted` 载荷形状**,reducer `merge_promoted`(`agents/thread_state.py:135-153`)按 `catalog_hash` + 名字并集合并——**没有来源字段**。"是模型自己搜的,还是路由自动提的"**只存在于代码路径里**。本 spec 把它记下来(§4.3),这是相对现状的唯一信息增益。

## 3. 范围裁决

### 3.1 入选规则与六个埋点

**规则:闸门改变了执行结果(拦截 / 截断 / 放出一批新工具)→ 记一条事件。** 按此规则,本期入选 **6 处**:

| # | 埋点 | 谁动了手 | tag(新) | 长度 |
|---|---|---|---|---|
| 1 | ReadBeforeWrite | 没先读就写:拦下一次 `write_file` / `str_replace` | `read_gate` | 9 ✓ |
| 2 | ToolProgress | 同一工具反复没新信息:升到 WARNED / BLOCKED | `tool_progress` | 13 ✓ |
| 3 | SubagentLimit | 超出并发或总量上限,`task` 调用被丢弃 | `subagent_limit` | 14 ✓ |
| 4 | deferred 提升 | `tool_search` 或 McpRouting 把隐藏的 MCP 工具 schema 放出来 | `tool_promotion` | 14 ✓ |
| 5 | **SandboxAudit** | 命令位置替换(`$(curl u)`)直接执行 → `bash` 被拦 | `sandbox_audit` | 12 ✓ |
| 6 | **SkillToolPolicy** | 激活 skill 的 `allowed-tools` 之外的工具被执行 → 拦下 | `skill_policy` | 12 ✓ |

> **⑤⑥ 是本次勘查新增,构成快照 spec §12 第 1 项只列了四条,这里对它做一处修正。** 证据:① `sandbox_audit_middleware.py:507-509`(sync)/`:525-527`(async)——`verdict == "block"` 时返回 `_build_block_message`,命令**没被执行**;② `skill_tool_policy_middleware.py:346-348` / `:361-363`——`_blocked_tool_message` 返回 error ToolMessage。
>
> 为什么必须一起做:入选规则是"闸门改变了执行结果",而这两处**正是**在拦。只做四条会产出一个自相矛盾的视图——bash 被拦、skill 越权被拦都静默,而用户问的恰恰是"为什么这个工具不能用了"。
>
> **裁决(2026-09-11,用户批"6 个"):本期做 6 处。** 6 个 tag 全部发布;`sandbox_audit` 的 `warn` 档与 `tool_promotion` 的 `query` 仍为开放项(§7 风险 4/5)。

**各 tag 长度全部 ≤ 21**,命名沿用既有风格(下划线分词)。

### 3.2 不做,且各有归属

| 不做的事 | 归属 | 理由 |
|---|---|---|
| subagent 侧 `loop_capped` / `token_capped` | **零后端改动,前端只需渲染** | 通道已存在:`SubagentResult.stop_reason` → `_task_result_command` → `make_subagent_additional_kwargs` → `subagent_stop_reason` → 落进 `subagent.end`(`task_tool.py:205-221`、`:518-525` 复核) |
| LoopDetection / TokenBudget / SafetyFinishReason / ModelLengthFinishReason | **已覆盖,但是另一条通道** | 它们**不改单次工具调用**,而是硬停整轮并把原因写进 `runtime.context["stop_reason"]`,由 worker 收到 run 记录上(`worker.py:1030-1046` 的注释逐条列出 `loop_capped` / `token_capped` / `safety_capped` / `subagent_limit_capped` / `model_length_capped`)。给它们再发 per-call 事件是重复表达 |
| Guardrail / SafetyTermination / SkillActivation / SkillSecrets | — | **已有埋点**(4 个既有调用点) |
| 前端把 6 个 tag 渲染出来 | §12 第 2 项 | 本 spec 只发事件 |
| 实时脉冲的消费端 | §12 第 6 项 | 依赖本项 + 前端构成视图 |
| `ToolOutputBudget` / `ToolResultSanitization` / `InputSanitization` / `LLMErrorHandling` / `TerminalResponse` | — | **它们不拦工具调用**:前者改内容与外置、后两者改形态与恢复。按入选规则不入选 |

## 4. 设计

### 4.1 `changes` 的纪律(先于形状)

**只记决策事实,绝不记被拦下的内容**(沿用 `safety_finish_reason_middleware.py:292-295` 的"不记 tool arguments")。具体:

- **不记命令正文、不记文件内容、不记检索词、不记 secret 值**;
- 记的是:哪个工具、哪一档、为什么、数量。

### 4.2 四个"拦截类"埋点的形状

**(a) `read_gate`** —— `read_before_write_middleware.py`,拦截点 `:108-113`(sync)/ `:139-144`(async),紧邻 `return normalize_tool_result(blocked)`:

```python
{"tool_name": ..., "tool_call_id": ..., "path": ..., "reason": "no_current_read_mark"}
```

`path` 是虚拟路径,与 `workspace_changes` 同口径。**不记文件内容。**

**(b) `tool_progress`** —— `tool_progress_middleware.py`,状态机升级点 `:399-411`,`action` 取 `"warn"` / `"block"`:

```python
{"tool_name": ..., "from_phase": "active"|"warned", "to_phase": "warned"|"blocked",
 "consecutive_problems": ..., "error_type": ..., "block_reason": ...}
```

**只在状态真的变化时记**(`new_state != state`)。否则同一 tool 每次调用都发一条,前端脉冲会被噪音淹没。

**(c) `subagent_limit`** —— `subagent_limit_middleware.py:131-166`:

```python
{"dropped_count": ..., "requested_count": ..., "allowed": ...,
 "cap": "per_response_concurrency"|"per_run_total",
 "prior_delegations": ..., "remaining_total": ...}
```

**`cap` 是新信息**:今天"哪条上限先到"要靠 `remaining_total == 0` 反推(`:160` 的注释与代码),没有存下来。记下它,前端才能说人话:"本轮并发满了" vs "这次 run 的委派额度用完了"。

**(d) `sandbox_audit`** —— `sandbox_audit_middleware.py:507-509` / `:525-527`:

```python
{"tool_name": "bash", "verdict": "block", "reason": <reject_reason 或 "security violation detected">}
```

**绝不记 `command`**(它是 tool arguments)。同步/异步两条路径都要埋(现有审计日志也是两处都记,可参照)。

**(e) `skill_policy`** —— `skill_tool_policy_middleware.py:346-348` / `:361-363`:

```python
{"tool_name": ..., "policy_source": "slash"|"skill_context", "active_path_count": ...}
```

`policy_source` 来自 `_active_policy` 的 `policy[0]`(该函数已区分 slash 与 skill_context 两个来源,`:76-92`)。只记**数量**不记全部白名单,避免 payload 随 skill 变大。

### 4.3 `tool_promotion` 与"来源"字段

用一个 tag,两条路径各自在 `changes` 里注明来源:

```python
{"source": "model"|"auto_routing", "names": [...], "count": ...}
```

- `model`:`tool_search` 闭包(`tool_search.py:159-170`)。**不记 `query`**(它是模型写的检索词,与 tool arguments 同性质——见 §4.1)。
- `auto_routing`:`McpRoutingMiddleware`(`:104-119`),额外记 `top_k`(该中间件的上限,`matched[: self._top_k]`)。

`names` 截断到与构成快照同一上限(`MAX_TOOL_NAMES`),避免两处阈值漂移。

### 4.4 每个 per-call tag 必须带 `tool_call_id`(2026-09-11 加,加性补丁)

**为什么**:构成快照 spec §12.1 裁过"**闸门通知长在既有的工具卡上**",而"挂到**哪一张**卡上"需要 `tool_call_id`。**当前 6 个 tag 里只有 `read_gate` 有**(2026-09-11 复核):

| tag | 需要传 | 怎么改 |
|---|---|---|
| `read_gate` | ✅ 已有 | `read_before_write_middleware.py:219` |
| `tool_progress` | **单值** | id 已在作用域(`request.tool_call["id"]`) |
| `sandbox_audit` | **单值** | `:416` 已算出 `tool_call_id`,只是没进 `changes` |
| `skill_policy` | **单值** | 同上 |
| `subagent_limit` | **数组 `dropped_tool_call_ids`** | 它**按批**丢(`indices_to_drop`),单值没有意义;用数组让前端能把**每一个**被丢的调用标出来 |
| `tool_promotion` | **不适用** | 它不拦任何工具调用 |

**三处的 id 都已在作用域里**(`ToolCallRequest.tool_call["id"]`),改动是纯粹的字段补充,**加性、不改任何既有字段**。

> **一件相关但不同的事,别捆进来**:`sandbox_audit` 与 `skill_policy` 的**拦截消息**是裸 `ToolMessage`,零 `deerflow_tool_meta` 标记(grep `normalize_tool_result` / `TOOL_META_KEY` 命中均为 0),而 `tool_progress` 自盖 meta、`read_before_write` 走 `normalize_tool_result`。**这不影响"挂卡"**——消息自带 `tool_call_id` + `name`,前端照样定位。它影响的是 **ToolProgress 的分类**(裸消息 → `_parse_tool_meta` 返回 `None` → 打 warning 并**跳过计数**)。**那是既有行为,与本 spec 无关**;要修应另开(它会改变 ToolProgress 的计数与既有用例的期望)。

### 4.5 契约与文档同步(5 处,与构成快照同规矩)

1. **生产者代码** —— 6 个埋点的中间件 + `tool_search`;
2. `runtime/events/catalog.py` —— 新增 6 个 tag 常量并并入 `MIDDLEWARE_EVENT_TAGS`(**必须走这个元组**,否则契约测试看不见它们);
3. `contracts/run_event_stream_contract.json` —— `dynamic_event_patterns[0].known_tags` 补 6 个;
4. `backend/docs/RUN_EVENT_STREAM.md` —— tag 清单 + 每个新 tag 的 `changes` 形状;
5. `tests/test_run_event_stream_contract.py` —— 既有 `@pytest.mark.parametrize("tag", MIDDLEWARE_EVENT_TAGS)` 自动覆盖新 tag 的**形状**;每个 tag 的**语义**另测(§6)。

`deerflow/constants.py` **无需改动**(无新 event_type / category —— 该文件只有 32/16 两个长度常量,构成快照 Task 3 已核对过同一结论)。

### 4.6 双发:闸门事件同时走 custom SSE 与 run_events(2026-09-11 加,本 spec 的核心补丁)

**问题(2026-09-11 复核确认)**:闸门事件只落 `run_events`,而 **`_put` 只在 buffer 攒够 `flush_threshold = 20` 时刷**(`journal.py:231` 的默认值;生产全仓**只有一处**构造 journal——`worker.py:656`,**没传这个参数**),且**无时间兜底**。闸门事件一次 run 通常个位数 ⇒ **run 结束前读不到**。而 §1 的宣称是"回答 **agent 为什么突然不说话**"——**不实时的话,那个问题到得太晚**。

> 先例确实存在但不可直接套用:`progress_flush_interval = 5.0`(`journal.py:233`,注释 "for active run visibility")解决的正是同一问题,**但它刷的是"进度上报"(`run_manager.update_run_progress`),不是事件 buffer**;而且**光刷早也不够**——2026-09-11 全量核查前端:**`run_events` / token usage / run 状态都没有 `refetchInterval`**(只有侧边栏 thread-search、知识页、定时任务三处有轮询),前端在 run 进行中**唯一的 live 通道是 SSE**。

**裁决:闸门事件双发——custom SSE(实时)+ run_events(重载/回填)。** 照搬本仓既定范式:`deerflow.utils.custom_events.emit_custom_event`,子代理的 `task_*` 就是这么做且前端已在消费(`hooks.ts:1832`)。

**IM 安全性(2026-09-11 核实,不是推断)**:IM 通道的隔离边界是**订阅**,不是 allowlist —— `app/channels/manager.py:75` 的 `STREAM_MODES = ["messages-tuple", "values"]` **不含 `custom`**,`_accumulate_stream_text` 也只消费 `messages-tuple`。Buzz 事故是 **`messages-tuple` 泄漏**,与 `custom` 无关;IM 的 run 里根本不会产生 custom 帧。**构成快照 spec §6.7 那条"新增 custom 事件要重过 allowlist"的前提已就地更正**(结论不变、依据换掉)。

**实现要点(已实测,2026-09-11)**:

- **同步助手可直接双发,不必拆 sync/async 两套。** 我的 6 个埋点全部落在 **sync/async 共用的函数**里(例如 `_truncate_task_calls` 同时被 `after_model` 与 `aafter_model` 调用),**不能 `await`**;而探针实测:**在 async hook 里调用同步的 `emit_custom_event` 不报错、帧正常到达**(`async_path: "ok"`,`custom_frames: 1`)。所以 `record_gate_event` 内部即可完成双发。
  > 注意与 `safety_finish_reason_middleware` 的差别:它**拆了** `_emit_event` / `_aemit_event` 两套,那是因为它的调用点本身分 sync/async 两处、可以 await。**本 spec 的埋点在共用函数里,拆不开,也不需要拆。**
- **writer 的获取**:`from langgraph.config import get_stream_writer`(仓内既有先例:`safety_finish_reason_middleware.py:235`、`llm_error_handling_middleware.py:742`),包在 try/except 里;**拿不到就只落 run_events**(embedded 客户端、非 streaming 调用)。
- **事件形状**:`{"type": "<tag>", ...changes}` —— 与 `task_*` / `safety_termination` 同款,`type` 非空字符串是回调派发的前提。
- **best-effort**:与落 run_events 同级——**SSE 发失败也绝不抛**,只 warning(`emit_custom_event` 自己已吞 `Exception` 并 re-raise `GraphBubbleUp`,沿用即可)。

**范围声明**:双发只给**闸门事件**;构成快照**仍然 fetch-once 不上 SSE**(它是 run 级静态事实,run 内不变,无流式价值 —— 构成快照 spec §6.7 的结论不变)。**这两件事的投递方式不同,因为它们的时效性不同**,不要合并。

## 5. 失败模式(全部降级)

| 情况 | 行为 |
|---|---|
| 无 `__run_journal`(embedded / subagent / 无 event store) | 6 个调用点全部静默 return |
| `record_middleware` 抛异常 | try/except + warning,**绝不影响这次工具调用** |
| `runtime.context` 不是 dict / 为 None | 取 journal 前先判类型(照 `read_before_write_middleware.py:170`) |
| `tool_search` 被直接调用(测试 / 旧调用点) | runtime 是注入型;直接调用需显式传,与 5 个既有 Runtime 注入工具同款 |

## 6. 测试(TDD)

- **每个 tag 一条语义断言**(`tests/test_gate_instrumentation.py`,真实中间件实例 + `MemoryRunEventStore`):
  - `read_gate`:未读先写 → 有且仅有一条 `middleware:read_gate`,含被拦工具名与路径,**且序列化文本里搜不到文件内容**;
  - `tool_progress`:`active→warned` 记一条、`warned→blocked` 再记一条;**同态重复不重复记**;
  - `subagent_limit`:超并发 → `cap="per_response_concurrency"`;总量用尽 → `cap="per_run_total"` 且 `dropped_count` 正确;
  - `sandbox_audit`:命令位置替换被拦 → 一条,`verdict="block"`,**序列化文本里搜不到那条命令**;
  - `skill_policy`:越权工具 → 一条,`policy_source` 正确;
  - `tool_promotion`:模型路径 → `source="model"`;自动路径 → `source="auto_routing"`;**两条路径产出可区分的 `changes`**(§2.3 的信息增益,必须钉住)。
- **旁路不变量(最重要的一条)**:**埋点全部失败时,工具调用结果与埋点前逐字节相同。** 做法:注入一个 `record_middleware` 必抛异常的 journal,断言 6 个场景的执行结果不受影响。
- **无 journal 时静默**:不注入 `__run_journal`,6 个场景照常执行、不抛。
- **tag 长度**:断言 6 个新 tag ≤ 21(契约测试的 `tag_schema` 也会查,但显式断言能给出更清楚的失败信息)。

## 7. 风险与开放项

1. ~~**`tool_search` 加注入参数会不会进模型 schema?**~~ **已实测关闭(2026-09-11,用先例工具直接验证)**:取一个同样用 `Runtime` 注入的既有工具看它**模型可见**的 args:
   ```
   $ PYTHONPATH=. .venv/Scripts/python.exe -c "from deerflow.tools.builtins.present_file_tool import present_file_tool; print(present_file_tool.args)"
   {"filepaths": {...}}        # 只有 filepaths
   ```
   而同一工具的内层函数签名是 `['runtime', 'filepaths', 'tool_call_id']` —— **注入参数存在,但被 LangChain 挡在模型 schema 之外**。所以 `tool_search` 加 `runtime: Runtime` 与该先例同级,不会让模型看见它。**Task 1 仍应补一条断言**把这条事实在 `tool_search` 上钉住(它成了本 spec 唯一改签名的工具)。
2. ~~**`tool_progress` 的事件量未实测。**~~ **已用代码定界(2026-09-11),不需要真栈测量**:该状态机是**滞回**的 —— 升级需要连续 `stagnation_threshold = 3` 次问题(`tool_progress_middleware.py:200`),一次好结果就把计数归零并回到 `active`(`:392-395`),而 `blocked` 是**终态**(`:371-372`)。所以每个 (thread, tool) 的转场上界约为 `问题调用数 / 3 + 1`,且 `blocked` 只可能有一次。再叠加 `LoopDetectionMiddleware` 对重复 tool_call 的硬停,病态重复跑不起来。**结论:量级是"每 run 个位数到十几次",不是 per-call 洪水。** 真栈计数降级为可选(前端要聚合的话仍可自己去做,那属 §12 第 2 项)。
3. **6 个 tag 的 `changes` 形状发布后即成契约**,改名要走契约变更。**最脆的一处是 `subagent_limit.cap` 的两个取值**:今天靠 `remaining_total == 0` 反推,若将来上限逻辑变成三条,这里会**静默少一档**。guard test 钉住两个取值。
4. **开放项:`tool_promotion` 是否记 `query`。** 我按 §4.1 纪律选了不记。若前端发现"没有检索词就解释不了为什么搜出这几个",再回来改——但那时它已是发布过的契约字段。
5. **开放项:是否把 `sandbox_audit` 的 `warn` 档也记。** 本期只记 `block`(入选规则是"改变执行结果",warn 不改)。若前端想展示"这条命令被提醒了",需另判——**但 warn 是每次 bash 都可能触发的低频噪声,默认不开**。

## 8. 向后兼容与影响面

- **不新增** event_type / category / 端点 / 表 / 迁移 / 依赖。
- **不改**任何闸门的判定逻辑:只加"记一条事件"的旁路调用。
- **`tool_search` 加一个注入参数** —— 唯一的签名改动,且它是**框架内建工具**,不是用户代码。
- 既有 `middleware:{tag}` 消费者不受影响(消息 API 已过滤该前缀)。

## 9. 测试阶梯

```bash
cd backend && PYTHONPATH=. .venv/Scripts/python.exe -m pytest tests/test_gate_instrumentation.py tests/test_run_event_stream_contract.py -q --basetemp .pytest-tmp -p no:cacheprovider
cd backend && PYTHONPATH=. .venv/Scripts/python.exe -m pytest <受影响的中间件既有测试> tests/test_harness_boundary.py -q --basetemp .pytest-tmp -p no:cacheprovider
cd backend && .venv/Scripts/python.exe -m ruff check . && .venv/Scripts/python.exe -m ruff format --check .
```

**门禁用窄集合,不要用后端全量**(本机全量有 155 条环境红,不可当门禁——见构成快照 plan 的阶梯记录)。窄集合 = 本 spec 的闸门测试 + 契约测试 + 6 个中间件各自的既有测试 + harness 边界。

## 10. 后续项(依赖排序)

1. **本 spec**(6 个埋点)—— 天级。
2. **§12 第 2 项 前端构成视图** —— 它的 spec 可以引用本 spec 定下的 6 个 `changes` 形状。
3. **§12 第 6 项 实时脉冲** —— 需要本 spec 的事件 + 第 2 项已渲染的环 + `llm_call_index`。
