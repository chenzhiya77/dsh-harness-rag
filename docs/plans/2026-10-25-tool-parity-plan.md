# 工具面对齐修复 Plan

**Spec:** [2026-10-25-tool-parity-spec.md](../specs/2026-10-25-tool-parity-spec.md)
**Status:** 实施完成（2026-10-25；源码与运行时包 `0.1.0-2`；托管冒烟已用本地 fake 模型覆盖六件真实调用；G11 已另案实施并提交）
**Date:** 2026-10-25
**Architecture:** 引擎新增 `POST /api/knowledge-bases/{kb_id}/tools`，按 `name` 分派六件工具，直接复用主树同名 `_*_impl`；引用编号由引擎按 `(user_id, run_id)` 的有界缓存持有，三路共用。插件 `src/tools.ts` 从 `recall-test` 适配改为工具端点：逐工具参数、原生载荷 + `kb_id` / `kb_name` 回显、`run_id` 取宿主 agent 的实时回合相位（`exec.agent.phase.turn`）。面板 `recall-test` 一字不动。`engine/UPSTREAM.md` 改为分叉记录，三份对外文档同批对齐；引擎改完重建运行时包。

**硬约束**：只改 `E:\app\python\agent\dsh-harness-rag`；`engine/` 按 D1 B 可直接改，主树 `deer-flow` 只读零改动；不碰 `src/runtime/supervisor.ts` 与 `tests/runtime_supervisor.test.ts`（并行会话改动），不碰既有未提交的 `docs/plans/*`；`node_modules/`、`dist/`、运行时 zip 不纳入提交；token 与任何 `api_key` 不落日志、不进面板、不进提交面；DSH 整重启候令；提交候令；提交信息英文 Conventional ASCII；仓无 remote 不推送。

## 决策基线（2026-10-25 冻结）

| 决策 | 冻结值 |
| --- | --- |
| D2 数据面 | 甲：新增工具专用端点，`recall-test` 不动 |
| D3 引用编号 | 甲：引擎按用户 + 回合持有计数器，三路共用一套连续编号 |
| D4 参数面 | 甲：逐工具按主树给参数；graph 去掉 `top_k`，wiki 默认 3，hybrid 才有 `doc_id` |
| D5 读取面 | 甲：`chunk_id` 可单独续读，工具级拒绝走 200 + message |
| D6 输出面 | 甲：透传工具原生载荷，面板专用字段不进模型面 |
| D7 默认值 | 甲：hybrid 5 / wiki 3 / graph 配置 8 / read 20–50；零计数不列 |
| D8 文档 | 甲：与代码同批同步 README、手册、等价表、UPSTREAM |
| G11 回答纪律 | **不在本 plan**；另立 spec（宿主 agent 级 `systemPrompt.section`） |

**不包含**：G11、面板 UI / 召回测试形态、检索 / 图谱 / 百科算法、Qdrant schema、主树改动、整树 re-vendor、旧工具输出兼容层（未发布）。

**TDD 通用要求**：每个实现 Task 先 RED、再 GREEN；GREEN 后做 neuter（取掉本次关键分支 / 透传），确认对应用例转红，再还原；门禁在改动后全绿；实测回填写进各 Task。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无（探针在仓外，验后删除）。

- [x] **宿主回合面**：真栈日志取证（`~/.dsh/sessions/.../session-a59b4afa…`）：`turn/start` 在 `seq=24` 带 `data.turn=2`，随后 `tool/call` 在 `seq=32` 带 `data.turn=2/step=1`；`dsh-tools` 的 Code Mode 分支直接用 `exec.agent.session.append(...)`，证明工具执行期 `exec.agent` 可读。（当时据本仓类型认定 `Session.events` 可读；随包运行时无此成员，最终取源见下方 2026-10-25 晚修订。）
- [x] **回合缓存方案**：用 `WeakMap` 以 `agent.session` 对象为键缓存 `{ seq, turn }`；`Session.seq` 即日志长度，`events.length` 与之一致；每次从上次 `seq` 扫到末尾，取不到（维护任务 / 无事件）时 `run_id` 省略，引擎每次从 1 起。（**未采用**：运行时 `Session` 无 `events`；最终实现见下方取源修订。）
- [x] **引擎 impl 面**：`_hybrid_search_impl`（`hybrid_search_tool.py:31`）、`_graph_search_impl`（`graph_search_tool.py:175`）、`_wiki_search_impl`（`wiki_search_tool.py:33`）、`_list_documents_impl` / `_read_document_impl`（`knowledge_documents_tool.py:28/97`）、`_list_wiki_entries_impl`（`wiki_entries_tool.py:25`）签名与默认值已核；均接受 `store` / `wiki_store` 注入，可直接复用，不复制算法。
- [x] **runtime 依赖**：`resolve_kb_scope` 读 `runtime.context['kb_id']`，`resolve_runtime_user_id` 依次取 `server_info` / configurable / `context['user_id']` / ContextVar / 默认用户；`can_access` 只读；`SimpleNamespace(context={...})` 足够。
- [x] **图谱配置**：`recall_test` 的 `_graph_call` 传 11 个配置项（`knowledge_service.py:1187-1211`）；`rag.graph_evidence_limit` 默认 8（`config.example.yaml:2684`）；抽 `_graph_search_kwargs(rag, evidence_limit)` 供 `recall-test` 与新方法共用。
- [x] **路由与鉴权**：`knowledge_bases.router` 前缀 `/api/knowledge-bases`；`_require_kb_access` / `_user_id` / `_service` 可复用；现有无 `/tools` 路由；Pydantic v2 判别联合可直接作 body。
- [x] **懒加载与启动成本**：`_load_search_impls`（`knowledge_service.py:74-87`）全局变量模式；文档工具 impl 同样懒加载。入口冷导入实测约 6.3 s（兄弟 venv，含首次加载），改后按同法对照。
- [x] **引用计数器**：`claim_citation_range` / `CITATION_OFFSET_KEY`（`citation_counter.py:17-31`）；`tests/knowledge/tools/test_citation_numbering.py` 覆盖三路共享编号；面板 `_user_facing` 仍剥注记。
- [x] **面板回归基线**：`tests/knowledge/test_recall_test_api.py` **22/22** 通过（兄弟 venv + 指定 config）；当前投影 key / summary 长度 / 无 `citation_no` 的断言面已记在测试里。
- [x] **插件测试面**：`tests/tool_gating.test.ts` 用 mock fetch + 假 exec；`defineTool` 暴露 `parameters` / `output`；Node 22.20.0 直接跑 `.ts`（全量 **220/220**，恢复 `@deepseek-ai/cordis` 4.0.5 后）。
- [x] **运行时包**：`scripts/build-runtime-pack.mjs` 读 `engine/backend/`、`engine/config.example.yaml`、`engine/backend/uv.lock`；`engineCommit` 取 `engineRoot` 的 `git rev-parse --short HEAD`；`runtimeVersion` / `engineVersion` 由 `runtime.json` 当前 pack 与参数决定。**并行会话正在改此脚本与 `package.json`**（`build:runtime` 入口、`--print-inputs` / `--engine-commit`），Task 7 实施时以当前 `--help` 为准，不覆盖其改动。
- [x] **文档落点**：`engine/UPSTREAM.md` 仍有 `byte-identical / 不得编辑 / 重新 vendor`；`engine/README.md` 仍有「源码快照」；`README.md` / `docs/plugin-manual.md` / `docs/equivalence.md` 已被并行提交 `5b898f3` 改成**按现状保守描述**（`id` / 需 `doc_id` / 面板行），本 plan 是修复后逐句升级，不是回退。
- [x] **工作区基线**：HEAD `d7787c3`；`engine/backend` 代码零 diff；并行会话已提交 README / engine docs / supervisor 等；工作树仅有本对 spec/plan 未跟踪文件 + 并行会话正在改的 `package.json` / `scripts/build-runtime-pack.mjs` / `docs/plugin-manual.md`（构建脚本段），不碰。

**实测（2026-10-25）**：

- **宿主回合面**：从真实会话 `session-a59b4afa-a90c-47fe-b955-0c6ceefc2466` 解出的日志里，`{"type":"turn/start","seq":24,"data":{"turn":2}}` 先于同回合的 `{"type":"tool/call","seq":32,"data":{"turn":2,"step":1,…}}`；`dsh-tools/lib/index.js:1216-1264` 在工具执行里直接读 `exec.agent.session`。⇒ `run_id = <agent.id>:<turn>` 可在工具 body 内同步取到；无需新事件订阅。
  - **2026-10-25 晚修订**：本行原写「`Session.events` 为公开面」——那是按本仓 `node_modules` 类型（dsh-session 0.0.1-rc.5）读出的；随包运行时是 0.2.1-rc.2，`Session` 已无 `events`，同步事件读取整体标弃用。最终取源改为 `exec.agent.phase.turn`（证据见 [G11 plan](2026-10-25-rag-soul-section-plan.md) Task 5）。
- **引擎测试环境**：`engine/backend` 没有 `.venv`；用兄弟仓 `E:\app\python\agent\harness-rag\backend\.venv\Scripts\python.exe`（3.12.13）＋ `PYTHONPATH=engine/backend/packages/harness;engine/backend` ＋ `DEER_FLOW_CONFIG_PATH=E:/app/python/agent/harness-rag/config.yaml` 跑通 `test_recall_test_api.py` 22/22；不新建 venv（C/E 盘均紧张）。
- **插件环境**：并行会话的安装/裁剪一度把 `@deepseek-ai/cordis` 移入 `node_modules/.ignored`，导致 `node --test` 报模块缺失；从 `.ignored` 恢复后全量 220/220。`pnpm run typecheck` 会触发 `pnpm install` 并因私有 `@deepseek-ai/dsh-type-meta` 404 失败；`.ignored` 里有 `typescript` 与 `@types`，但 `@deepseek-ai/cordis` 缺 `lib/types`（编译包剥离了 `.d.ts`）。Task 4 前从 DSH `app.asar` 的根级 `@deepseek-ai/cordis` 补 `.d.ts` 或用临时 tsconfig `paths` 映射；门禁记录实际命令。
- **图谱配置**：`recall_test` 的 `_graph_call` 逐项传 `reranker/per_entity_cap/per_edge_cap/hop0_guarantee/evidence_limit/graph_rerank/rerank_threshold/hop_penalty/neighbor_min_score/max_expanded_nodes/hub_degree_threshold`；工具端点抽同一助手，`evidence_limit=rag.graph_evidence_limit`。
- **面板基线**：当前 `recall-test` 测试断言了 vector `hits` 的 7 个键、wiki `summary=content[:120]`、graph 的 `trace` 透传与 `_user_facing` 剥注记；新端点不得改动这些。

---

## Task 1 — 引擎工具端点与三路检索语义（TDD）

> 动到的文件：`engine/backend/app/gateway/routers/knowledge_bases.py`、`engine/backend/app/gateway/services/knowledge_service.py`、`engine/backend/tests/knowledge/test_tool_call_api.py`（新增）。

- [x] 先写测试（TestClient + 现有 `service` fixture 模式）：
  - 路由存在；未知 KB 404、无权限 403、无鉴权 401。
  - 判别联合：六个 `name` 可进；未知 `name` 422；多余字段 422；`top_k` 0/21、`hops` 3、`limit` 0/51 均 422。
  - 分派参数：monkeypatch `ks_module._hybrid_search_impl` / `_graph_search_impl` / `_wiki_search_impl`，断言 `doc_id` / `entity` / `hops` / `title` / `top_k` 原样传入；graph 的 `evidence_limit` 取配置（默认 8），不再取 `top_k`。
  - 透传：impl 返回的 `results` / `entries` / `trace` / `message` 不被裁剪；message 保留「引用编号…照抄 `citation_no`」注记。（2026-10-25 D6 修订：宿主 `callTool` 剥离该注记，见 [G11 spec](2026-10-25-rag-soul-section-spec.md) §3.6。）
- [x] 请求模型：六个扁平模型 + `name` Literal 判别；`run_id: str | None`（长度/字符集有界）；`extra="forbid"`；hybrid `query` 必填非空；graph `query` / `entity`、wiki `query` / `title`、read `doc_id` / `chunk_id` 均可缺——缺时由 impl 返回 200 引导语（与主树工具一致，不强行 422）。
- [x] 路由：`POST /{kb_id}/tools`，复用 `_require_kb_access` / `_user_id`；工具级拒绝（无参数、未就绪、找不到）返回 200 + message；鉴权/库级错误保持 404/403。
- [x] 服务 `run_tool(...)`：三路检索分派到现有 `_*_impl`，传 `self.store` / `self.vector_store` / `self.graph_store`；图谱配置参数抽 `_graph_search_kwargs(rag, evidence_limit)`，`recall-test` 与新方法共用；`recall-test` 的响应形状与测试不变。
- [x] 不改 `RecallTestRequest`、`recall_test` 的投影与 `_user_facing`；面板测试 `test_recall_test_api.py` 全绿。
- [x] 门禁：`pytest tests/knowledge/test_tool_call_api.py tests/knowledge/test_recall_test_api.py -q`；`ruff check app tests`；`ruff format --check app tests`。

**实测（2026-10-25）**：

- **实现**：`knowledge_bases.py` 增 `ToolCallBase` + 六个扁平模型 + `ToolCall` 判别联合（`name` 为 discriminator，`extra="forbid"`，`run_id` 限 `[A-Za-z0-9._:-]{1,200}`），新增 `POST /{kb_id}/tools`；路由把 `body.model_dump()` 拆成 `name` / `run_id` / `args` 交给 `KnowledgeService.run_tool`。任一寻址参数缺失时仍进 impl，由 impl 返回 200 引导语；hybrid 的空白 `query` 在模型层 422。
- **服务**：新增 `_graph_search_kwargs(rag, evidence_limit)`（11 个配置项）与 `run_tool`；`hybrid_search` 传 `doc_id/top_k`，`graph_search` 传 `entity/hops` 且 `evidence_limit=rag.graph_evidence_limit`（默认 8），`wiki_search` 传 `title/top_k`。`recall_test` 的 `_graph_call` 改用同一助手，响应形状与 22 条面板测试零变化。`_tool_runtime` 目前是 `SimpleNamespace(context={kb_id,user_id})`，`run_id` 留给 Task 2。
- **测试**：新增 `tests/knowledge/test_tool_call_api.py` **13/13**（404/403、hybrid doc_id、graph entity/hops/evidence_limit=8、wiki title/top_k=3、缺参 200、7 组 422、原生字段与 citation 注记透传）；与 `test_recall_test_api.py` 合计 **35/35**。neuter（`doc_id=args.get("doc_id")` 改成 `doc_id=None`）⇒ hybrid 用例转红，还原后全绿。
- **门禁**：`ruff check` 与 `ruff format --check` 三文件均干净。
- **未做**：文档工具的 `run_tool` 分派（Task 3）；`run_id` 尚未接入计数器（Task 2）。

---

## Task 2 — 引用编号 run 缓存（TDD）

> 动到的文件：`engine/backend/app/gateway/services/citation_runs.py`（新增）、`knowledge_service.py`、`engine/backend/tests/knowledge/test_tool_call_citation.py`（新增）。

- [x] 先写测试：`CitationRunCache` 同 run 连续分配（第一次 1–2、第二次 3–4）；不同 run 重置；无 `run_id` 每次重置；TTL 过期重置；超过 256 条淘汰最旧；不同 `user_id` 隔离。
- [x] 实现 `CitationRunCache`：`OrderedDict`，key `(user_id, run_id)`，上限 256、TTL 1 小时，`monotonic` 可注入；只存 `{citation_offset}` 等小字典。
- [x] `KnowledgeService.__init__` 增 `self._citation_runs = CitationRunCache()`；`_tool_runtime(kb_id, user_id, run_id)` 取/建 context，写入 `kb_id` / `user_id`，返回 `SimpleNamespace(context=ctx)`。
- [x] 工具端点所有六件工具都用 `_tool_runtime`；`run_id` 缺省 ⇒ 新 dict（每次从 1 起）；`run_id` 存在但过期 ⇒ 新 dict。
- [x] 集成测试：让 mock impl 调 `claim_citation_range`（或直接用真实 impl 的 citation 段）→ 同一 `run_id` 两次调用编号连续；换 `run_id` 从 1 起；返回 message 的区间与实际 `citation_no` 一致。
- [x] 门禁：`pytest tests/knowledge/test_tool_call_citation.py tests/knowledge/tools/test_citation_numbering.py -q`；`ruff`。

**实测（2026-10-25）**：

- **实现**：新增 `app/gateway/services/citation_runs.py`，`CitationRunCache` 用 `OrderedDict` 存 `(user_id, run_id) → (saved_at, context)`；TTL 从创建起算（默认 3600 s），命中 `move_to_end`，超 256 条淘汰最旧；时钟可注入。`KnowledgeService.__init__` 持有 `self._citation_runs`；`_tool_runtime` 把缓存 context 写回 `kb_id` / `user_id` 后交给 `claim_citation_range`，无 `run_id` 时每次新建 dict。
- **行为**：同一 `run_id` 两次 hybrid 调用得到 `citation_no` `[1,2]` → `[3,4]`，第二次 message 的区间为 `[3]-[4]`；换 `run_id` 回到 `[1,2]`；不带 `run_id` 每次 `[1,2]`。编号仍由 impl 自己写进 `citation_no` / message，路由不重写。
- **测试**：`test_tool_call_citation.py` **5/5**（同键共享、TTL、LRU、同 run 连续、无 run 重置）；与 `test_tool_call_api.py`、`test_recall_test_api.py` 合计 **40/40**。neuter（`_tool_runtime` 永远返回新 dict）⇒ 同 run 用例转红，还原后全绿。
- **门禁**：`ruff check` / `ruff format --check` 三文件干净。
- **边界**：缓存不按库拆分（同一回合跨库仍共用编号）；引擎重启清零；面板 `recall-test` 不经过此缓存，仍每次从 1 起并剥注记。

---

## Task 3 — 文档 / 清单工具语义（TDD）

> 动到的文件：`knowledge_service.py`、`engine/backend/tests/knowledge/test_tool_call_documents.py`（新增）。

- [x] 懒加载补齐：`_list_documents_impl`、`_read_document_impl`、`_list_wiki_entries_impl`；不把 LangChain 工具模块拉进入口启动路径。
- [x] 分派：
  - `list_knowledge_documents` → `_list_documents_impl(runtime, store=self.store)`；返回 `documents[{doc_id,name,status,chunk_count}]` + 计数 message。
  - `read_knowledge_document` → `_read_document_impl(runtime, doc_id=…, chunk_id=…, offset=…, limit=…, store=self.store)`；`chunk_id` 优先；返回 `doc` / `items` / `total` / `offset` / `has_more` / `message`；items 含 `entities`（去重 cap 10）与 `truncated`（>2000 字）。
  - `list_wiki_entries` → `_list_wiki_entries_impl(runtime, store=self.store, wiki_store=self.wiki_store)`；返回标题 / 状态 / `updated_at` + 计数 message。
- [x] 测试：
  - 清单：三篇文档（ready / failed / 处理中）⇒ `doc_id` 键、计数与状态一致；内部字段 `id` / `storage_path` 不外泄。
  - 读取：`doc_id` 分页；只传 `chunk_id` 的中心窗；超长切片 `truncated` + `entities` cap 10；不存在 / 跨库 / 未就绪三种拒绝是 200 + 可读 message（`limit` 51 的 422 在 Task 1 请求模型用例覆盖）。
  - 百科清单：就绪 / 待更新计数；零计数类别不列。
  - Qdrant 集成：本任务未新增（读取路径不依赖 Qdrant），留待 Task 5 真栈。
- [x] 门禁：`pytest tests/knowledge/test_tool_call_documents.py tests/knowledge/tools/test_knowledge_documents_tool.py tests/knowledge/tools/test_wiki_entries_tool.py -q`；`ruff`。

**实测（实施期回填）**：
- **RED**：`run_tool` 未接文档分派时，6 个新用例全部失败于 `ValueError: unknown tool: ...`。
- **GREEN**：接上 `_load_document_impls()`（惰性导入 `knowledge_documents_tool` / `wiki_entries_tool`）与三路分派后 **6/6**；与三路检索 / 引用计数 / 面板用例合计 **46/46**；Task 3 门禁三文件 **22/22**。
- **neuter**（去掉 `chunk_id=args.get("chunk_id")` 透传）⇒ 中心窗与切片不存在两条用例转红（2 failed / 4 passed），还原后 6/6。
- **门禁**：`ruff check app tests` 全过、`ruff format --check app tests` 166 文件已格式化（首次 check 报 import 排序，`ruff check --fix` 后复检干净）。
- **边界**：分派只负责把参数原样交给 impl；分页 / 拒绝文案 / `truncated` / `entities` 上限全部由现有 impl 承担。`run_tool` 不再为文档工具加载 `get_app_config`。

---

## Task 4 — 插件六件适配（TDD）

> 动到的文件：`src/tools.ts`、`tests/tool_gating.test.ts`。

- [x] 先改测试：
  - 六件工具都请求 `/api/knowledge-bases/{kb}/tools`；body 的 `name` 映射为 `hybrid_search` / `graph_search` / `wiki_search` / `list_knowledge_documents` / `read_knowledge_document` / `list_wiki_entries`。
  - hybrid 带 `query` / `top_k` / `doc_id`；graph 带 `query` / `entity` / `hops` 且无 `top_k` / `doc_id`；wiki 带 `query` / `title` / `top_k`；read 允许只传 `chunk_id`；list 两件无参数。
  - `run_id`：假 exec 的 `agent.phase.turn` 是当前回合 ⇒ `run_id='<session>:<turn>'`；下一回合变号；无 turn / 无 agent ⇒ 省略。
  - 输出：`results` / `entries` / `trace` / `score_source` / `doc` / `truncated` 原样透传；`kb_id` / `kb_name` 仍回显；不再产出 `query` / `score_type` / `elapsed_ms`。
  - 参数 schema：hybrid `query` 必填；graph `query` / `entity` / `hops` 均非必填；wiki `query` / `title` / `top_k` 均非必填；read `doc_id` / `chunk_id` 非必填；list 两件无参数。缺寻址参数时由引擎返回 200 引导语，不由 schema 拒绝。
- [x] `src/tools.ts`：
  - 用 `callTool(config, kbId, name, args, signal, runId)` 替换 `recallTest`；删 `segmentOf` / `envelopeMeta` / 旧 `clampTopK`。
  - 逐工具 `parameters` 与 description（主树语义；去掉 `recall-test` 字样；graph/wiki 不再宣称 `doc_id`）。
  - 输出 schema 按 spec §4.6；保留 `kb_id` / `kb_name`。
  - `citationRunId(exec)`：读 `exec.agent.phase.turn`，`run_id = <agent.id>:<turn>`；取不到返回 `undefined`（2026-10-25 晚据托管冒烟改定，见 [G11 plan](2026-10-25-rag-soul-section-plan.md) Task 5）。
- [x] 门禁：`node --test tests/tool_gating.test.ts`；`node --test tests/*.test.ts`；`pnpm run typecheck`。

**实测（实施期回填）**：
- **RED**：新测试先对 HEAD 版 `src/tools.ts` 跑（临时 `git show` 覆盖，trap 原样还原，前后 sha1 一致）⇒ **9 failed / 9 passed**：端点、`run_id`、五条透传、绑定回显、参数 schema 全部转红；旧版无 `run_id` 的两条用例按预期仍绿。
- **GREEN**：`tests/tool_gating.test.ts` **19/19**；插件全量 `node --test tests/*.test.ts` **231/231**。
- **实现**：新增 `callTool`（`/tools` + `name` + 原生参数；`run_id` 有则附）与 `citationRunId`（`run_id = <agent.id>:<turn>`，取宿主实时回合相位）；六件工具改为原生载荷原地构造（不再有 `segmentOf` / `envelopeMeta` / `clampTopK` / 面板字段），输出 schema 按 spec §4.6，`kb_id` / `kb_name` 仍回显。
- **neuter**（`citationRunId` 恒返回 `undefined`）⇒ 回合复用用例转红（1 failed / 18 passed），还原后 19/19。
- **回合关闭边界**：扫描同时处理 `turn/end`（同号则清空当前回合）——已完成回合后的维护调用不复用旧编号；新增「omitted after the turn closes」用例。（该用例随后续取源改动合并进「无 turn ⇒ 省略」，见 G11 plan Task 5。）
- **typecheck**：`pnpm run typecheck` 仍被 pnpm 预跑 `install` 挡住（私有 `@deepseek-ai/dsh-type-meta` 404）；绕过方式为 `node_modules/.bin/tsc -p tsconfig.json --pretty false`。初次运行只报四处 `@deepseek-ai/cordis` 缺声明；从 npmmirror 取同版本 4.0.5 tarball，把包内 `lib/types` 补回本地 `node_modules/@deepseek-ai/cordis/lib/types`（gitignored 环境修复）后，完整 tsc **exit 0**。`src/tools.ts` 单文件 tsc 亦 exit 0。
- **并行改动**：并行会话曾在 `src/tools.ts` 删去一句提到 DeerFlow 的注释；本次重写保持「不出现 DeerFlow」的口径。
- **未做**：`node --check client.js` 与真栈调用留给 Task 5。

---

## Task 5 — 门禁与真栈验收

> 动到的文件：无（证据在仓外）。

- [x] 引擎：定向三组 + `pytest tests/knowledge/ -q` 全量；`ruff check app tests`；`ruff format --check app tests`。
- [x] 插件：`node --test tests/tool_gating.test.ts`；`node --test tests/*.test.ts`；`pnpm run typecheck`；`node --check client.js`（未改，仅回归）。
- [x] 真栈（引擎 + Qdrant，两篇文档的临时库）：
  - hybrid 带 `doc_id` 只命中该篇；graph `entity` 直取 + `hops=1/2`；wiki `title` 直取全文。
  - 向量命中含 `doc_id` / `chunk_index` / `entities` / `citation_no`；wiki 命中含全文 / `updated_at` / `citation_no`。
  - 同一 `run_id` 两次检索编号连续；换 `run_id` 从 1 起；面板 `recall-test` 仍无编号注记。
  - 只传 `chunk_id` 读中心窗；不存在 / 跨库 / 未就绪拒绝可读；清单 `doc_id` + 计数。
- [x] 面板回归：`recall-test` 三路响应的 key 集合与改前对照一致；上传 / 列表 / 切片抽屉 / Wiki 抽屉零变化。
- [ ] DSH 托管（Task 7 后）：绑定会话真实调用六件工具，确认 tool body 带 `run_id`、输出字段齐全、引用编号跨调用连续。
- [x] 工作区审计：引擎 diff 只含预期文件；主树零 diff；并行会话文件未动。

**验收对照**：

| Spec | 判据 | 证据 |
| --- | --- | --- |
| G1 | `doc_id` 单文档过滤生效 | Task 1/5：真栈 doc-a / doc-b 各只命中本篇 + 单测 |
| G2 | graph `entity` / `hops` 生效 | Task 1/5：真栈 `Gateway` → 实体 / 关系 / 证据 + 单测 |
| G3 | wiki `title` 直取全文 | Task 1/5：真栈完整正文 + `source_chunk_ids` + 单测 |
| G4 | 向量命中四字段齐全 | Task 1/5：真栈 `doc_id` / `chunk_index` / `entities` / `citation_no` + 单测 |
| G5 | wiki 命中全文 / `updated_at` / 编号 | Task 1/5：真栈编号 5 + 单测 |
| G6 | 同回合编号连续、新回合从 1 起 | Task 2/5：真栈同一 run 1–5 连续；无 run 每次 1 起 |
| G7 | `chunk_id` 单参、`doc` / `entities` / `truncated` / 拒绝 | Task 3/5：真栈中心窗 + 200 拒绝 + 单测 |
| G8 | 清单 `doc_id` + 计数 | Task 3/5：真栈两篇 + 计数 + 单测 |
| G9 | 默认值 / 边界 / `extra` 422 | Task 1/3/4：请求模型 422 + 参数 schema 用例 |
| G10 | 文档与实测逐句对齐 | Task 6：文档扫描零命中 + 静态计数复核 |
| D1 | `UPSTREAM.md` 分叉记录、包可重建 | Task 6 完成分叉记录；Task 7 待提交后构建 |
| 回归 | `recall-test` 与面板零变化 | Task 5：135/135 + 面板 22/22 + 真栈面板 key / 无编号 |

**实测（实施期回填）**：
- **引擎定向**：`tests/knowledge/tools/` + 三份 `test_tool_call_*` + `test_recall_test_api.py` 合计 **135/135**；`ruff check app tests` 全过、`ruff format --check app tests` 166 文件已格式化。
- **引擎全量**：`pytest tests/knowledge/ -q`（操作员 config）**1674 passed / 19 failed / 4 skipped**；19 条全部落在本次未改的模块：多数是 config 缺 `rag.embedding_base_url`（embedder/API/chunk-edit 测试走真实构建），另有 RAG agent 资产回退与 ragas 依赖。把同一 config 复制到仓外加 `embedding_base_url` 后 `--lf`：**14 条转绿**，剩 5 条为真实 API 鉴权（chunk-edit ×3）、Ark 默认地址、RAG agent 目录回退，均不经过本次改动。定向 135 条含全部本次契约面。
- **插件**：`tests/tool_gating.test.ts` **19/19**；全量 `node --test tests/*.test.ts` **231/231**；`node --check client.js` 通过。`pnpm run typecheck` 仍被 pnpm 预跑 install（私有 `@deepseek-ai/dsh-type-meta` 404）挡住；绕过用 `node_modules/.bin/tsc -p tsconfig.json --pretty false`，补回 `@deepseek-ai/cordis@4.0.5` 的 `lib/types` 后 **exit 0**（环境修复，gitignored）。
- **真栈探针**（临时测试文件，验后删除；FastAPI route → service → 真 impl → SQLite + Qdrant，只把远端 embedding/rerank 换成关键词确定性假件）：
  - 清单：`doc-a` / `doc-b` 各 2 片，`chunk_count` 正确，无内部 `id`。
  - hybrid `doc_id=doc-a` ⇒ 命中 `[('doc-a',0),('doc-a',1)]`；`doc_id=doc-b` ⇒ `[('doc-b',1),('doc-b',0)]`，编号 `[1,2]`。过滤是范围约束不是相关度阈值，所以 scoped 查询会返回该篇的最近切片（与主树一致）。
  - graph `entity=Gateway,hops=2` ⇒ 实体 `Gateway/MinerU`、关系「调用」、证据 `doc-a#0000` 编号 3、`doc-b#0000` 编号 4（与 hybrid 同一 `run_id`，连续）。
  - wiki `title=Beta` ⇒ 完整正文、`source_chunk_ids=['doc-b#0000']`、编号 5。
  - read `chunk_id=doc-b#0001,limit=1` ⇒ `doc={doc_id:doc-b,name:beta.md}`、`total=2`、`offset=1`、items `[1]`。
  - 面板 `recall-test` 同库同查询：hits 键为 `chunk_id/chunk_position/doc_name/heading_path/page/rank/score/text`，`citation_no` 全部缺失（`[None,None,None]`）；面板 22 条契约测试仍绿。
- **工作区**：主树 `git status --short` 空；本仓 `engine/` diff 只含 `knowledge_bases.py` / `knowledge_service.py`（另有并行会话的 `engine/README.md` / `UPSTREAM.md`），临时探针已删除。
- **未做**：DSH 托管真调用待 Task 7 重建运行时包后执行。

---

## Task 6 — 文档与 UPSTREAM（D1 / D8）

> 动到的文件：`engine/UPSTREAM.md`、`engine/README.md`、`README.md`、`docs/plugin-manual.md`、`docs/equivalence.md`。

- [x] `engine/UPSTREAM.md` 改为**分叉记录**：
  - 保留来源仓库 / 分支 / 基准 commit / vendored 日期 / 方法；
  - 状态改为「当前仓库为唯一主仓，`engine/` 已分叉，本地改动为准」；
  - 增「本地分叉记录」表（本笔：工具端点 + 引用 run 缓存 + 文档工具语义）；
  - 更新节改为「人工 diff / cherry-pick，不再 `git archive` 覆盖」；保留测试与运行时包重建步骤。
- [x] `engine/README.md`：「源码快照」改「后端目录」；API 表增 `/api/knowledge-bases/{kb_id}/tools`；归属节保持「知识库能力本项目自行实现，DeerFlow harness 框架部分按 MIT」。
- [x] 根 `README.md`：§检索 / §文档感知逐句核——连续编号、每篇 `doc_id`、单文档检索、`chunk_id` 中心窗、`truncated`、清单计数；README 已写「回答策略与引用呈现由 DSH 模型/宿主决定」，G11 落地前保持这句，不升级为强制纪律。（2026-10-25 晚 G11 落地后已改为写明检索纪律。）
- [x] `docs/plugin-manual.md` 工具表：六件逐条改（graph `entity` / `hops`；wiki `title`；list docs `doc_id` + 计数；read `chunk_id` 单参 + `truncated`；list entries 计数）。
- [x] `docs/equivalence.md`：§151「等价（同一端点）」改为「工具端点复用同一实现，面板召回测试独立」；§152/153 同步 read / list 描述；增一行「回答纪律（SOUL）｜主树 SOUL.md｜插件未注入｜G11 另案」。（该行与注已于 G11 落地后更新为「已移植检索纪律」。）
- [x] 扫描：工具 description 无 `recall-test`；`UPSTREAM.md` 无 `byte-identical / 不得编辑 / re-vendor`；README 无未实现承诺。
- [x] 门禁：`grep` 三条扫描 + 逐文件 diff 复核；`node --check client.js`（未改）。

**实测（实施期回填）**：
- **UPSTREAM**：改为「Engine upstream and fork record」；来源 / 分支 / 基准 `b34b2d572` / 快照日期与方法保留；新增「Local fork changes」（`/tools` 路由、服务分派、`citation_runs.py`、三份契约测试、engine README）；更新节改为手工 cherry-pick，不再 `git archive`。`byte-identical / 不得编辑 / 重新 vendor` 已全清。
- **发现的构建事实（已回写 spec D1）**：builder 只在 `<engine>/.git` 存在时读 HEAD，否则读 `UPSTREAM.md` 的 `Commit` 行；`engine/` 没有自己的 `.git` 且 builder 不向上找仓根。若保留原 `Commit` 行，manifest 会把分叉前的基准提交当成当前引擎提交。处理：表中改名 `Base commit`（正则不再命中），构建必须显式 `--engine-commit "$(git rev-parse --short=9 HEAD)"`；spec D1 与验收 10、插件手册构建命令已同步。
- **engine README**：开头改「后端源码目录，2026-10-25 起在本仓分叉维护」；API 表 `knowledge-bases` 行加入 `tools`；懒加载说明改为检索 / 文档工具按需导入。
- **根 README**：三路检索补 `doc_id` / `chunk_index` / 实体 / `citation_no` 与 wiki 全文 / `title` 直取；文档感知改原生 `doc_id`、`chunk_id` 单参中心窗、`truncated`、聚合计数、200 + message 拒绝；状态表标「六件契约与主树工具组对齐」。静态计数更新为 25 TS / 5,830 行、104 个引擎测试文件 / 1,571 个 `def test_`。
- **插件手册**：六件逐条改参数与返回；补 `/tools` 端点与回合编号说明；构建命令改为显式 `--engine-commit`。
- **等价表**：§11 三行升级为「等价」（工具端点直通主树实现 / 原生字段 / 单参 `chunk_id` / 拒绝语义）；新增 SOUL 行标 G11 另案；注改为「工具面已对齐，整体 RAG agent 不记等价」。（G11 落地后该行改标「已移植检索纪律」，注同步。）
- **扫描**：`byte-identical / 不得编辑 / 重新 vendor / 源码快照 / 仍需 doc_id / 面板原样 / 仅 120 / 不空返 / 快照布局 / 主键 id` 全部零命中；`node --check client.js` 通过。

---

## Task 7 — 运行时包重建（托管验收）

> 动到的文件：`runtime.json`（脚本回填 size / sha / engineCommit）；zip 在仓外。

- [x] 在引擎 / 插件提交后（`engineCommit` 指向真实提交），按**当时**的构建脚本 CLI 执行；并行会话已把它改成 `pnpm run build:runtime`（默认 `dist/`，`--update-manifest` 回填），实施时先读 `--help`，不覆盖其改动。**必须显式传 `--engine-commit "$(git rev-parse --short=9 HEAD)"`**：`engine/` 没有自己的 `.git`，builder 不向上找仓根。要求 `uv` 0.11.2、`gh` 可用。
- [x] 验证 zip 含新模块（`app/gateway/services/citation_runs.py`、新路由 / 模型）与 `runtime-manifest.json`；`runtime.json` 的 size / sha / engineCommit 回填正确；`runtimeVersion` / `engineVersion` 按发布规则递增。
- [ ] 托管冒烟：`DSH_HARNESS_RAG_PACK=<zip>` 起本地服务 → 绑定会话 → 模型真实调用六件工具 → 引用编号连续、字段齐全。
- [x] 若环境缺 `uv` / `gh` / 网络：记录阻塞，托管验收不宣称通过；源码模式验收不受影响。
- [x] zip、`dist/`、运行时缓存不纳入提交。

**实测（实施期回填）**：
- **环境**：`uv 0.11.2`、`gh 2.98.0`、Node `22.20.0` 均可用；`yauzl` / `yazl` 被并行安装裁掉后，从 `node_modules/.ignored` 恢复到本地（gitignored，不提交）。
- **输入核对**：`node scripts/build-runtime-pack.mjs --engine ./engine --print-inputs` 无 override ⇒ 按设计失败（`UPSTREAM.md has no readable "Commit" row; pass --engine-commit <sha>`）；加 `--engine-commit "$(git rev-parse --short=9 HEAD)"` ⇒ 解析为 `d7787c316 (--engine-commit)`，工具链 Python 3.12.13 / Qdrant 1.20.0 / uv 0.11.2 / gh 2.98.0。
- **提交前停手（历史）**：本笔改动尚未提交时，`d7787c316` 不包含它们；此时构建会把旧提交写进 `runtime-manifest.json` / `runtime.json`，与包内容不符。按 plan 的「提交后构建」停在此处。
- **解除**：提交链第 1 笔 `c78e80b` 已包含全部引擎代码；提交完成后按计划构建。
- **构建**（exit 0）：`node scripts/build-runtime-pack.mjs --engine ./engine --engine-commit a4942966b --runtime-version 0.1.0-2 --update-manifest`；产物 `dist/harness-rag-runtime-win32-x64-0.1.0-2.zip`，20,075 entries、315.0 MB zipped / 840.4 MB unpacked；`sha256=05cc423b…b0bd015`；包内确认 `engine/backend/app/gateway/services/citation_runs.py`、新 `knowledge_bases.py`、`runtime-manifest.json`。`runtime.json` 回填 size 330,283,067 / unpacked 881,202,485 / sha / `engineCommit=a4942966b`，与 zip 实测一致；`runtimeVersion=0.1.0-2`。`engineVersion` 无独立规则与 CLI，保持 `0.1.0`，由 `engineCommit` 区分内容。
- **托管冒烟（部分）**：隔离 `DSH_HOME=E:/app/python/agent/dsh-harness-rag-sbx`，`dsh --profile sbx --from-default-profile web` + `plugin add link:` + `DSH_HARNESS_RAG_PACK=<zip>` 起 web 宿主；40 s 后 `service.json` 就绪（knowledge `8022`、Qdrant `6336/6337`），`/health` 健康，`/api/knowledge-bases` 可建库。用插件 `buildToolDefinitions`（假 session 绑定 + 真 HTTP）实调：`hrag_list_documents` 返回原生 `doc_id` / `chunk_count`；`hrag_read_document(chunk_id=…)` 返回 `doc` / 中心窗 / `total`；`hrag_list_wiki_entries` 返回原生计数；`graph` / `wiki` 缺参返回 200 引导语。**未覆盖**：沙箱没有模型与 embedding 配置，未做「模型自主选择六件工具」、语义检索命中与跨调用编号的真宿主验收；这部分不宣称通过，源码真栈（Task 5）已覆盖语义与编号。宿主进程树已停，端口已关；沙箱文件保留在仓外。
- **未纳入提交**：zip、`dist/`、沙箱与运行时缓存；只提交 `runtime.json`。

---

## Task 8 — 收口与提交链

> 动到的文件：spec / plan。

- [x] 复跑 Task 5 全部门禁；回写 spec Status、plan 各 Task 实测与验收表。
- [x] 逐文件核 hunk；排除并行会话文件、既有 docs/plans 改动、`node_modules/`、zip。
- [x] 提交链（候令；英文 Conventional；2026-10-25 按实际文件边界执行）：
  1. `feat(engine): expose model-facing knowledge tool endpoints`（端点 + 引用缓存 + 文档分派 + 三份引擎测试）— `c78e80b`
  2. `feat(tools): align the six hrag tool contracts with the main tree` — `36c76fc`
  3. `docs(engine): record the fork and the explicit build commit` — `26cdab7`
  4. `docs(tools): sync the product docs with the aligned tool surface` — `84f037d`
  5. `docs(plan): close out the tool parity pair` — `a494296`
  6. `build(runtime): rebuild the pack at 0.1.0-2` — `486973c`
  7. `docs(plan): record the runtime pack acceptance` — 本文件所在提交
- [x] 提交后回填 `engine/UPSTREAM.md` 的分叉记录与提交链；仓无 remote，不推送。

**实测（实施期回填）**：
- **末次门禁**：引擎 `test_tool_call_* + recall-test` **46/46**；`ruff check` / `ruff format --check` 全过；插件 `tool_gating` **19/19**、全量 **231/231**、`tsc` **exit 0**、`node --check client.js` 通过。
- **状态回写**：spec Status 改「已实施（运行时包 `0.1.0-2` 已重建；托管模型冒烟部分覆盖）」；plan Status 改「实施完成」；验收表 G1–G10 / D1 / 回归逐行补证据。
- **hunk 审计（提交前 HEAD `d7787c316`）**：
  - 纯本笔：`engine/backend/app/gateway/routers/knowledge_bases.py`、`services/knowledge_service.py`、`services/citation_runs.py`、三份 `test_tool_call_*`、`src/tools.ts`、`tests/tool_gating.test.ts`、`docs/equivalence.md`、spec / plan。
  - 纯并行会话（不纳入本笔）：`THIRD_PARTY_NOTICES.md`、`client.js`、`package.json`、`scripts/build-runtime-pack.mjs`。
  - 交织（本笔与并行会话都改）：`README.md`（产品页归属句 + 本笔检索 / 文档节 / 计数）、`docs/plugin-manual.md`（构建段 + 本笔工具表 / 构建命令）、`engine/README.md`（归属句 + 本笔分叉 / API / 懒加载）、`engine/UPSTREAM.md`（并行 7 行 + 本笔整篇分叉记录）。实际按整文件提交，包含并行会话同向的归属 / 构建措辞；纯并行文件未动。
  - `node_modules/`（补装的 `@deepseek-ai/cordis/lib/types`、`typescript`、`@types`、`yauzl`、`yazl`）与 `dist/` / zip 均不提交。
- **提交链调整**：原计划把引擎端点与引用缓存拆成两笔；但两处改动在 `knowledge_service.py` 内交织，拆笔需要重构中间版本，回滚价值低于出错风险，故合并为第 1 笔（端点 + 引用缓存 + 文档分派 + 三份测试）；其余按引擎文档 / 产品文档 / plan / 运行时包 / 收口分笔，共 7 笔。仓无 remote，不推送。
- **提交**：`c78e80b` → `36c76fc` → `26cdab7` → `84f037d` → `a494296` → `486973c` → 本文件所在提交；工作树只剩并行会话的 `THIRD_PARTY_NOTICES.md` / `client.js` / `package.json` / `scripts/build-runtime-pack.mjs`。
- **Task 7**：运行时包 `0.1.0-2` 已构建并回填 `runtime.json`；托管冒烟完成「包可启动 + 插件工具真 HTTP 往返」，模型自主调用与语义检索未在沙箱覆盖，如实记在 Task 7。
- **收尾状态（2026-10-25 晚）**：G11 SOUL 回答纪律已实施并提交（`3eb0414` / `623a79a` / `4fd7653`，见 [G11 plan](2026-10-25-rag-soul-section-plan.md)）；沙箱模型冒烟已由本地 fake 提供方补齐（六件真实调用、同回合引用连续、未绑定无注入），真实模型冒烟仍另案。

---

## 后续（不在本 plan）

- **G11 回答纪律**：另立 spec，用宿主 agent 级 `systemPrompt.section`，在绑定会话挂 `hrag_*` 时同步挂纪律段、解绑即卸；本 plan 的文档任务在此之前只能按「工具描述提示」口径写，不能宣称强制纪律已实现。

## 风险与回退

- **回合号取不到**：`run_id` 省略 ⇒ 引擎每次从 1 起；文档与验收明确这是退路，不假装连续。Task 0 先证宿主面。
- **run 缓存内存**：只存小 dict，256 条 / 1 小时 TTL；引擎重启清零，与主树进程内计数一致。
- **面板回归**：`recall-test` 与工具端点共用 `_impl`；改 impl 的 message / 默认值时，面板测试与响应 key 对照是回归门。
- **图谱 `trace` 噪声**：按主树透传；若模型回答变嘈杂，D6 再单独裁剪，等价表同步。
- **运行时包**：构建重、依赖 `uv` / `gh`；缺环境时只交源码验收，不宣称托管通过。
- **分叉漂移**：上游 `harness-rag` 后续改动不能整树覆盖；`UPSTREAM.md` 记录基准与人工同步策略。
