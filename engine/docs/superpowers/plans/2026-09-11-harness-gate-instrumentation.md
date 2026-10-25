# harness 闸门埋点(⑧ 运行时事件)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让"哪一道闸门这一次真的动了手"成为可查询的事实。在 6 个闸门中间件里各加一个**旁路**调用,把决策记成既有的 `middleware:{tag}` 事件。零新 event_type、零新 category、零新端点、零迁移、零新依赖、零执行语义改动。

**Architecture:** 见 `../specs/2026-09-11-harness-gate-instrumentation-design.md`。通道与惯用法都是**现成**的:`RunJournal.record_middleware(tag, *, name, hook, action, changes)` 加 4 个既有调用点(`guardrails/middleware.py:115`、`safety_finish_reason_middleware.py:320`、`skill_activation_middleware.py:300`/`:539`),本计划再加 6 个。`__run_journal` 由 worker 注入 runtime context(`worker.py:776`),中间件经 `request.runtime.context` 取;拿不到就静默跳过。唯一的签名改动是 `tool_search`(加一个注入型 `runtime: Runtime`,与该目录 5 个既有工具同款,**已被先例证明不进模型 schema**)。

**Tech Stack:** 后端 Python 3.12 + LangChain `AgentMiddleware` / `ToolCallRequest`;`deerflow.tools.types.Runtime`;既有 `RunJournal` / `RunEventStore` / `contracts/run_event_stream_contract.json`。**前端本期零改动。**

**测试运行命令(全程统一):**
```bash
cd backend && PYTHONPATH=. .venv/Scripts/python.exe -m pytest tests/test_gate_instrumentation.py -q --basetemp .pytest-tmp -p no:cacheprovider
cd backend && PYTHONPATH=. .venv/Scripts/python.exe -m pytest tests/test_run_event_stream_contract.py -q --basetemp .pytest-tmp -p no:cacheprovider
cd backend && .venv/Scripts/python.exe -m ruff check . && .venv/Scripts/python.exe -m ruff format --check .
```

**关键事实(已核实,细节与行号见 spec §2):**
- **tag 上限 21 字符**(`catalog.py:82`: 32 − `len("middleware:")`),契约 `tag_schema` 同值。六个新 tag 全部 ≤ 14。
- **六处埋点的决策行**:`read_before_write_middleware.py:108-113`(sync)/ `:139-144`(async) · `tool_progress_middleware.py:399-411` · `subagent_limit_middleware.py:131-166` · `sandbox_audit_middleware.py:507-509` / `:525-527` · `skill_tool_policy_middleware.py:346-348` / `:361-363` · `tool_search.py:159-170` + `mcp_routing_middleware.py:104-119`。
- **`changes` 纪律**:只记决策事实,**绝不记被拦下的内容**(命令正文 / 文件内容 / 检索词 / secret 值)——沿用 `safety_finish_reason_middleware.py:292-295`。
- **`tool_progress` 只在状态真的变化时记**;该状态机滞回(连续 3 次问题才升级,好结果归零回到 active,blocked 终态),所以事件量级是每 run 十几次以内,不是洪水。
- **`subagent_limit.cap` 是新信息**:今天靠 `remaining_total == 0` 反推(`:160`),没存下来。
- **`tool_promotion` 的来源是新信息**:`tool_search`(模型)与 `McpRoutingMiddleware`(自动)写同一个 `promoted` 载荷,reducer 按 `catalog_hash` + 名字并集合并(`thread_state.py:135-153`),**没有任何来源字段**——所以"谁提的"只在代码路径里。
- **`SkillToolPolicy` 的来源**:`_active_policy` 返回 `(source, paths)`,`source` 区分 `slash` 与 `skill_context`(`:76-92`)。
- **门禁用窄集合,不要用后端全量**(本机全量有 155 条环境红)。

---

## File Structure

**新建:**
- `backend/tests/test_gate_instrumentation.py` —— 6 个 tag 的语义断言 + 旁路不变量

**修改:**
- `backend/packages/harness/deerflow/agents/middlewares/read_before_write_middleware.py`
- `backend/packages/harness/deerflow/agents/middlewares/tool_progress_middleware.py`
- `backend/packages/harness/deerflow/agents/middlewares/subagent_limit_middleware.py`
- `backend/packages/harness/deerflow/agents/middlewares/sandbox_audit_middleware.py`
- `backend/packages/harness/deerflow/agents/middlewares/skill_tool_policy_middleware.py`
- `backend/packages/harness/deerflow/agents/middlewares/mcp_routing_middleware.py`
- `backend/packages/harness/deerflow/tools/builtins/tool_search.py`(加注入参数 + 埋点)
- `backend/packages/harness/deerflow/runtime/events/catalog.py`(6 个 tag 常量 + 并入 `MIDDLEWARE_EVENT_TAGS`)
- `contracts/run_event_stream_contract.json`(`known_tags` 补 6 个)
- `backend/docs/RUN_EVENT_STREAM.md`(tag 清单 + 每个 `changes` 形状)
- `backend/tests/test_run_event_stream_contract.py`(语义断言挂在既有 parametrize 之上)

**不新建、不修改**:任何前端文件;任何 `pyproject.toml`;任何迁移;`deerflow/constants.py`(无新 event_type/category)。

---

## Task 0: 前置核实(**两项都在写 spec 时做完了,Task 1 只需沿用结论**)

- [x] **Step 1(`tool_search` 加注入参数会不会进模型 schema)——已完成(2026-09-11)**:取既有先例工具实测——`present_file_tool` 的内层签名是 `['runtime', 'filepaths', 'tool_call_id']`,而**模型可见**的 `args` 只有 `{"filepaths": {...}}`。**注入参数被 LangChain 挡在模型 schema 之外**,结论成立。→ Task 1 在 `tool_search` 上补一条断言把这条钉住。
- [x] **Step 2(`tool_progress` 事件量)——已完成(2026-09-11,代码定界)**:滞回状态机(`stagnation_threshold=3`、好结果归零、`blocked` 终态),上界 ≈ 问题调用数/3 + 1,峰值每 run 十几次。**不需要真栈测量。**

## Task 1: 通道与契约(**先做,让 6 个埋点有 tag 可用**)

**Files:** Modify `runtime/events/catalog.py`、`contracts/run_event_stream_contract.json`、`backend/docs/RUN_EVENT_STREAM.md`;Modify `tests/test_run_event_stream_contract.py`

- [x] **Step 1(先写红测试):** 在 `test_run_event_stream_contract.py` 里加:① 6 个新 tag 都在 `MIDDLEWARE_EVENT_TAGS` 里且**都 ≤ 21**;② 契约 `known_tags` 与 `MIDDLEWARE_EVENT_TAGS` **集合相等**(双向,防止只改一边);③ 每个新 tag 的 `changes` 形状能过契约的 `content_schema`(用 §4 的样例 `changes` 各造一条真事件)。
- [x] **Step 2:** `catalog.py` 加六个常量(`MIDDLEWARE_READ_GATE_TAG` / `_TOOL_PROGRESS_TAG` / `_SUBAGENT_LIMIT_TAG` / `_TOOL_PROMOTION_TAG` / `_SANDBOX_AUDIT_TAG` / `_SKILL_POLICY_TAG`),并入 `MIDDLEWARE_EVENT_TAGS`(既有四个保留)。
- [x] **Step 3:** `contracts/run_event_stream_contract.json` 的 `dynamic_event_patterns[0].known_tags` 补 6 个;**`tag_schema.maxLength` 保持 21 不动**。
- [x] **Step 4:** `backend/docs/RUN_EVENT_STREAM.md` 的 middleware tag 段落:列出 10 个 tag(4 旧 + 6 新),每个新 tag 写一句"何时发 + `changes` 字段"。
- [x] **Step 5:** 转绿 + `ruff check` / `format --check`。

## Task 2: 四个"拦截类"埋点

**Files:** Modify 四个中间件;Create `tests/test_gate_instrumentation.py`

**统一形状**(每个埋点都是同一段,照 `guardrails/middleware.py:84-122` 抄):

```python
journal = getattr(getattr(request, "runtime", None), "context", None)
journal = journal.get("__run_journal") if isinstance(journal, dict) else None
if journal is not None:
    try:
        journal.record_middleware(tag=..., name=type(self).__name__, hook=..., action=..., changes={...})
    except Exception:
        logger.warning("... audit failed", exc_info=True)
```

- [x] **Step 1(先写红测试 —— 四个 tag 各一条语义断言):**
  - `read_gate`:未读先写 → 恰好一条,含被拦工具名与路径;**断言序列化文本里搜不到文件内容**(用一个内容哨兵);
  - `tool_progress`:`active→warned` 一条、`warned→blocked` 再一条;**同态重复不重复记**;
  - `subagent_limit`:超并发 → `cap="per_response_concurrency"`;总量用尽 → `cap="per_run_total"` 且 `dropped_count` 正确;
  - `sandbox_audit`:命令位置替换被拦 → 一条,`verdict="block"`;**断言序列化文本里搜不到那条命令**;
  - `skill_policy`:越权工具 → 一条,`policy_source` 与 `active_path_count` 正确。
- [x] **Step 2(先写红测试 —— 两条不变量,最重要):**
  - **旁路**:注入 `record_middleware` 必抛异常的 journal → 6 个场景的**执行结果与不埋点时逐字节相同**;
  - **静默**:不注入 `__run_journal` → 6 个场景照常执行、不抛。
- [x] **Step 3:** 实现四个埋点(`read_gate` / `tool_progress` / `subagent_limit` / `sandbox_audit` / `skill_policy` 共 5 处,`tool_progress` 记 warn 与 block 两档)。
- [x] **Step 4:** 转绿 + 该四个中间件的**既有测试**一起跑(确认没改判定行为)+ `ruff`。

## Task 3: deferred 提升埋点(**含唯一签名改动**)

**Files:** Modify `tools/builtins/tool_search.py`、`agents/middlewares/mcp_routing_middleware.py`;Modify `tests/test_gate_instrumentation.py`

- [x] **Step 1(先写红测试):** ① 模型路径 → `source="model"`;② 自动路径 → `source="auto_routing"` 且带 `top_k`;③ **两条路径的 `changes` 可区分**(spec §2.3 的信息增益);④ `names` 超过上限时被截断;**⑤ `tool_search` 的模型可见 `args` 里仍然没有 `runtime`**(Task 0 Step 1 的结论钉在这里)。
- [x] **Step 2:** `tool_search` 加 `runtime: Runtime` 注入参数(照 `present_file_tool` 的写法),在返回 `Command` 之前埋点。
- [x] **Step 3:** `McpRoutingMiddleware._state_update` 在返回前埋点(`source="auto_routing"`,带 `top_k`)。
- [x] **Step 4:** 转绿 + `tests/test_tool_search.py`、`test_mcp_routing_*.py` 一起跑 + `ruff`。

## Task 4: 全量验证 + 手工验收

- [x] **Step 1:** 窄集合门禁:
```bash
cd backend && PYTHONPATH=. .venv/Scripts/python.exe -m pytest \
  tests/test_gate_instrumentation.py tests/test_run_event_stream_contract.py \
  tests/test_read_before_write_middleware.py tests/test_tool_progress_middleware.py \
  tests/test_subagent_limit_middleware.py tests/test_sandbox_audit_middleware.py \
  tests/test_skill_tool_policy_middleware.py tests/test_tool_search.py \
  tests/test_mcp_routing_auto_promote.py tests/test_harness_boundary.py \
  -q --basetemp .pytest-tmp -p no:cacheprovider
```
- [x] **Step 2:** 手工验收(真栈;**用私有端口,不要占 8001** —— 本机 8001 上已有用户自己的网关,同端口双绑定会随机投递):
  1. 起 `uvicorn app.gateway.app:app --port 8099`(带 `DEER_FLOW_AUTH_DISABLED=1`);
  2. 跑一个**注定触发闸门**的 run:让 agent 直接 `write_file` 一个没读过的文件(触发 `read_gate`);
  3. `GET /api/threads/{tid}/runs/{rid}/events?event_types=middleware:read_gate` 确认拿到事件,且 `changes` 里**没有文件内容**;
  4. 若条件允许再验一条 `tool_progress`(让某工具连续失败)。
- [x] **Step 3:** 按冻结信息提交(沿用 `feat/rag-knowledge-base`),提交信息写 why;回写交付纪要。

---

## 交付纪要(2026-09-11,全部完成)

- **新增**:`agents/middlewares/gate_events.py`(共享旁路助手 `record_gate_event`,两条不变量集中在一处)、`tests/test_gate_instrumentation.py`(20 例:9 条语义 + 11 条不变量)。
- **修改**:六个闸门中间件(各 1-2 处埋点)、`tools/builtins/tool_search.py`(加注入参数 `runtime: Runtime`)、`runtime/events/catalog.py`(6 个 tag 常量并入 `MIDDLEWARE_EVENT_TAGS`)、`contracts/run_event_stream_contract.json`(`known_tags` 4→10)、`backend/docs/RUN_EVENT_STREAM.md`(新增 "Gate Events" 小节)、`tests/test_run_event_stream_contract.py`(双向集合断言 + 6 条形状)。
- **测试**:`test_gate_instrumentation.py` **20 passed**;窄集合门禁 **557 passed / 0 failed**(六个中间件的既有测试 + 契约 + 宪法 + harness 边界);`ruff check` / `format --check` 干净。
- **revert 证明(教科书式)**:把 `record_gate_event` 改成空操作 → **9 条语义断言全红、11 条不变量全绿**——正好把"记录逻辑"与"旁路不变量"分离开,证明两组用例各自有牙。
- **手工验收(真栈真 HTTP,PASS)**:私有端口 `:8099`(本机 8001 有用户自己的网关,同端口双绑定会随机投递);预建一个 workspace 文件(缺文件时闸门按设计 fail-open),让 agent 不读直写 → 拿到 1 条 `middleware:read_gate`,`changes` 与契约样例**逐字一致**,且序列化文本里**搜不到文件正文**。同一 run 只发这 1 条闸门事件(没动手的闸门保持沉默)。
- **规格修正**:入选规则"改变了执行结果的闸门"跑全后,埋点数从计划的 4 个变 **6 个**(补 `sandbox_audit` 与 `skill_policy`),经用户 2026-09-11 批"6 个"。
- **未做(开放项,spec §7 风险 4/5)**:`sandbox_audit` 的 `warn` 档、`tool_promotion` 的 `query`。

### 追加补丁(2026-09-11 第二轮,用户从侧窗发现 → 复核 → 落笔)

用户报了两组问题,复核后**一组成立需修、一组部分成立**。三处改动:

1. **双发(spec §4.6,本 spec 第二核心)**:闸门事件原先**只落 run_events**,而 `_put` 只在 buffer 攒够 `flush_threshold = 20` 时刷(生产**只有 `worker.py:656` 一处**构造 journal、未覆盖该值),**且无时间兜底** ⇒ 闸门事件一次 run 通常个位数,**run 结束前读不到**。而 §1 的宣称是"回答 agent 为什么突然不说话"——**不实时就等于答得太晚**。
   **修法**:`record_gate_event` 内部双发——custom SSE 帧(实时)+ 既有 run_events(重载/回填),**同一个 payload**。照搬仓里 `task_*` 的既定范式。
   **两条复核结论推翻了原判断**:(a) **"光刷 flush 就通了"不成立**——全量核查前端:`run_events`/token usage/run 状态**都没有 `refetchInterval`**,run 进行中唯一的 live 通道是 SSE;(b) **"闸门事件上 SSE 危险得多"前提不成立**——IM 的隔离边界是**订阅**(`app/channels/manager.py:75` 的 `STREAM_MODES = ["messages-tuple","values"]` **不含 custom**),Buzz 事故是 `messages-tuple` 泄漏,与 custom 无关。**构成快照 spec §6.7 那条"新增 custom 事件要重过 allowlist"的前提已就地更正**(结论不变、依据换掉)。
   **实测**:探针验过 **sync/async 共用的助手可直接双发**(6 个埋点全在共用函数里、不能 await;在 async hook 里调同步 `emit_custom_event` **不报错、帧到达**)——**不必拆 `_emit`/`_aemit` 两套**(`safety_finish_reason` 那套拆法是因为它的调用点分两处、可以 await)。
2. **每个 per-call tag 补 `tool_call_id`(spec §4.4)**:§12.1 裁过"闸门通知长在既有工具卡上",而挂到**哪张**卡需要 id——原先 6 个 tag 里**只有 `read_gate` 有**。补:`tool_progress`(取 `result.tool_call_id`)、`sandbox_audit`(`:416` 已算出、只是没进 changes)、`skill_policy` 各一个单值;**`subagent_limit` 用数组 `dropped_tool_call_ids`**(它按批丢,单值没意义);`tool_promotion` 不适用。
3. **删 `skills.active_names`(构成快照 spec §6.5)**:它写死 `[]`,而**结构上不可能有别的值**——快照在**图构建时**产生、激活在**图运行中**发生。留着等于请前端把"无激活"渲染成一个事实(而用户刚打过 `/skill-name`)。**前端要就读 `middleware:skill_activation`**。

**追加后的验证**:`test_gate_instrumentation.py` **24 passed**(新增 4 条双发用例);窄集合门禁 **593 passed / 0 failed**;`ruff check` / `format --check` 干净。
**双发的 revert 证明**:把 `_emit_gate_frame` 改成空操作 → **3 条双发断言转红**(第 4 条只断言"拦截仍发生",保持绿——正确),撤销即绿。
**真栈验收(直接解析 SSE 流,PASS)**:私有端口 `:8099`;触发一次 `read_gate` 拦截后,流里共 **14 帧 = metadata 1 / values 11 / **custom 1** / end 1**,**那唯一一个 custom 帧就是 `read_gate`**,带 `tool_call_id`;另一条腿(查 `?event_types=middleware:read_gate`)**同一条事件、同一个 id** ⇒ **双发两条腿都对上**;且直播那条腿**不含文件正文**。

**另两条经复核不成立(未改代码,记为已知限制,见构成快照 spec §8 风险 13)**:① 子代理**步骤事件走另一条 buffer、阈值 25** 与 journal 的 20 不同**不是不一致**——它服务的读者不同,实时部分走 custom SSE(`task_running`,前端 `hooks.ts:1832` 已在消费),`run_events` 那份是给重载的;② 脉冲拿不到 **per-middleware** 精度**不是缺口**——设计承诺的是 **stage 级**,而 stage 级现成够用(`llm.human.input` / `llm.ai.response` + `llm_call_index` / `llm.tool.result` / `run.delivery`)。

## 完成判据

- 6 个 tag 全部经 `MIDDLEWARE_EVENT_TAGS` 发布,契约 `known_tags` 与之双向相等,全部 ≤ 21 字符
- 6 个语义断言绿(每个 tag 一条),两条不变量绿(旁路失败不影响执行 / 无 journal 静默)
- **`tool_search` 的模型可见 args 里没有 `runtime`**(断言)
- 六个中间件的既有测试全绿(判定行为未变)
- 窄集合门禁全绿;`ruff check` / `format --check` 干净
- 手工验收:真栈上拿到至少一条 `middleware:read_gate`,且载荷不含被拦内容

## 不在本计划内

前端渲染(§12 第 2 项)· 实时脉冲(§12 第 6 项)· subagent 侧 `loop_capped`/`token_capped`(通道已存在,前端渲染即可)· `sandbox_audit` 的 `warn` 档(开放项)· `tool_promotion` 的 `query`(开放项)· 四个已有 tag 的任何改动
