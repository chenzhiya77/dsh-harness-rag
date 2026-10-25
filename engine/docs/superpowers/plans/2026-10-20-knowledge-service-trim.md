# 主体二最小知识服务 —— 裁剪与引擎切换 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Spec:** [2026-10-20-knowledge-service-trim-design.md](../specs/2026-10-20-knowledge-service-trim-design.md)
**Status:** ✅ 完成（2026-10-20 D1–D8 全甲；Task 0–5 全落，门禁过；两仓提交链见文末）。
**Parent:** 插件线步骤记录（`dsh-harness-rag` 仓）§8。

**Architecture:** 在主体二新增独立最小入口 `app/gateway/knowledge_app.py`（只挂知识三 router＋`/health`，生命周期只做持久化＋知识 worker），先用未裁 monolith 在 8020 验证环境与数据，再用最小入口等价验证，随后删产品面，最后把插件默认指向 8020 并真栈验收。

**硬约束**：deer-flow 只读；所有改动与数据只落主体二；检索/摄取/百科/图谱/评测逻辑零改动；Qdrant 共享期只读验证、单写者；DSH 整重启需候令；提交候令（两个仓各自成链）。

---

## Task 0 — 落点核实（只读）

> 2026-10-20 已随本对完成。

- [x] 插件调用面：只触达 `knowledge_bases`／`rag_config`／`models` 三 router（`src/kb_proxy.ts:76-286`、`src/tools.ts:36-42`）。
- [x] 最小启动所需：知识服务零 `app.*` import；router 只依赖 `app.state.knowledge_service`＋`request.state.user`；auth-off 由 AuthMiddleware 注入合成 admin，CSRF 自动跳过；`/health` 与公共路径已有先例。
- [x] 主体二现状：HEAD `b650e2496`；无 `.venv`、无 `.deer-flow`；`config.yaml`／`models_config.json`／`.env` 与主体一逐字节相同；`rag_config.json` 较旧。
- [x] 数据面：DB 154M＋`knowledge/` 18M；`documents.storage_path` 为绝对路径需改写；38 行文档中 31 件源文件缺失（t3 库 7 件齐全）；Qdrant 6333 共享。
- [x] 端口：8001 主体一在跑；8010 Docker/WSL 占用；8020 空闲。
- [x] 停点：无（D1–D8 待裁）。

**实测**：插件端点清单（代理 60+ 子路径）全部落在三 router；`app/gateway/services/knowledge_service.py` 无 `app.*` import；`knowledge_bases.py:156-167` 的 `_service`/`_user_id` 为唯一 app 状态耦合；`app.py:337-372` 知识 worker/service 装配、`:378-401` UMAP 预热、`:433-441` worker 停止可直接照搬；`deps.py` 与 `services/__init__.py` 仍拉 langgraph/agent 模块（依赖瘦身另案）。数据实况：`t3-panel-acceptance` 7 件源文件全在，旧四库 31 件缺失；`rag_config.json` 主体一 10-18、主体二 10-05。体量：frontend 30M／backend 42M／docs 19M；git 3102 件。

## Task 1 — 环境＋数据快照＋未裁 parity（8020）

> 动到的文件：主体二 `backend/.venv`（新）、`backend/.deer-flow/`（新）、`rag_config.json`；快照脚本落仓外 `E:\appdevelop\hrag-probe\`。

- [x] 装依赖：`cd backend && uv sync --frozen`（按 `uv.lock`），确认 `backend/.venv/Scripts/python.exe` 可用。
- [x] DB 快照：仓外脚本用 `sqlite3.Connection.backup` 从主体一 `backend/.deer-flow/data/deerflow.db` 生成一致性副本到主体二同路径；`PRAGMA integrity_check` 过。
- [x] 文件与配置：拷 `data/knowledge/`（18M）到主体二；拷主体一现行 `rag_config.json`（10-18 版）。
- [x] 路径改写：仅改副本 `documents.storage_path` 前缀（主体一 data 目录 → 主体二 data 目录），逐行核 38 行。
- [x] 起未裁 monolith：`app.gateway.app:app` @ `127.0.0.1:8020`，`DEER_FLOW_AUTH_DISABLED=1`。
- [x] parity 四条：`/health` 200；`/api/knowledge-bases` 两库同名同 id；t3 文档 7 件；`recall-test` 三路结果与主体一逐 id/分数相同。
- [x] 收尾：停 8020 实例；记录启动日志里的非知识初始化项（memory/skills projection 等）供 Task 2 对照。

**实测**：`uv sync --frozen` 成功（`.venv` 就绪）；快照脚本 `_engine_snapshot.py`（仓外）产出 `deerflow.db` 161,378,304 B，`integrity_check=ok`；文档 38 行、路径改写 38 行、旧前缀残留 0；文件 7 在／31 缺（旧四库缺失，与主体一一致）；`rag_config.json` 同步。8020 monolith（auth-off）16s 就绪，`/health` 200；两库（测试、t3-panel-acceptance）同名同 id；t3 文档 7 件；vector 3 命中与 graph 8 实体/2 证据与主体一逐 id/分数全等。**wiki 首启进程分数与主体一有微差、名次互换；干净重启后逐位一致**（0.662098／0.366335／0.36588）——首启偏差判为启动态/上游别名波动，登记待复现；重启后三路 parity 全过。启动日志的非知识项：skill projection、memory warm、LangGraph runtime、ChannelService（0 通道）、knowledge worker——Task 2 最小入口应去掉前四项。8020 已停。

> 2026-10-20 复核补记：主体一 HEAD 实为 `372b2f4b0`（图检索 trace 透传），主体二仍在 `b650e2496`；该笔只动 `knowledge_service.py` 的 graph 段，不影响本 Task parity。**主体二同步到该笔＝Task 3 前置**（`git fetch upstream && cherry-pick 372b2f4b0`）。

## Task 2 — 最小入口（`app/gateway/knowledge_app.py`）

> 动到的文件：主体二 `backend/app/gateway/knowledge_app.py`（新）；仓外 boot 探针。

- [x] 入口：`create_app()` 装配 `/health`＋`knowledge_bases`／`rag_config`／`models` 三 router；注册 `RagConfigurationError` 处理器；挂 AuthMiddleware＋CSRFMiddleware（Trace 可选）。
- [x] lifespan：配置＋日志 → `init_engine_from_config(config.database)` → `KnowledgeStore`／`VectorStore`／`KnowledgeIndexWorker`／`KnowledgeService` → UMAP 预热（best-effort）；退出停 worker、取消预热、`close_engine`。
- [x] 不加载：LangGraph runtime、IM、scheduler、memory、skills/browser、extensions。
- [x] 冒烟：8021（或 8020）起最小入口 → `/health`、两库、t3 文档、三路 recall-test 与 Task 1 基线全等；日志无 agent/IM/scheduler 初始化。
- [x] 门禁：`python -c "import app.gateway.knowledge_app"` 过；`ruff check` 定向净。

**实测**：新增 `backend/app/gateway/knowledge_app.py`（三 router＋`/health`，lifespan 只做配置/日志→持久化→KnowledgeWorker/KnowledgeService→UMAP 预热；退出停 worker、取消预热、`close_engine`）。新增 `backend/tests/test_knowledge_app_entry.py` 钉路由面（三 router 在，`/api/threads|runs|channels` 不在）。`tests/knowledge/test_projection_prewarm.py` 的 lifespan 测试改指最小入口；`test_recall_test_api.py`、`test_rag_configuration_error.py` 的 `create_app` 导入同步改。8020 起 2s 就绪；两库同 id、t3 文档 7 件；三路 recall 与 Task 1 基线逐 id/分数全等（仅 `elapsed_ms` 不同）。日志无 LangGraph/IM/scheduler/skill projection/memory warm。ruff 净。

## Task 3 — 裁剪产品面＋README

> 动到的文件：主体二删除清单（spec §5）＋`README.md`。

- [x] 第一刀：删 `frontend/`、`docker/`、`skills/`、`contracts/`；`docker/` 位置留一行「Qdrant 由宿主提供」说明。
- [x] 第二刀：删 `backend/app/channels/`、`backend/app/scheduler/`、`backend/app/gateway/github/`。
- [x] 第三刀：删非知识 routers＋monolith `app.py`（最小入口已验证后）；收敛 `routers/__init__.py`。
- [x] 第四刀：删非知识测试与无关 docs；保留知识测试与夹具。
- [x] README 重写：最小知识服务定位、启动命令（8020）、配置（config/models/rag_config）、数据（快照与路径）、裁剪清单、API 面。
- [x] 每刀后：boot 探针（`/health`＋三路 recall-test）＋定向测试＋ruff；红即停并回退该刀。

**实测**：四刀全落，另随带清掉部署/开发残留（`deploy/`、`pr-build/`、产品/部署 workflow、`.agent/`、根翻译 README 与产品文档、`backend/samples`）。`routers/__init__.py` 收敛为三件；23 个非知识 router、monolith `app.py`、channels/scheduler/gateway-github 删除；测试删 565 件、保留 124 件（`knowledge/**`＋RAG 配置/models/迁移/入口）；`backend/tests/fixtures/{rag_config,rag_eval}` 保留。README 重写；`AGENTS.md` 重写、`backend/AGENTS.md`/`CLAUDE.md`/`README.md` 删除；根 Makefile 收为六目标、`backend/Makefile` 入口改 `knowledge_app`；`docker/README.md` 留 Qdrant 说明；pre-commit 去 frontend 钩子，workflow 留 backend-unit/lint/rag-eval（lint 去 frontend job）。合计删除 2,025 件跟踪文件；每刀后 boot 探针过。最终 8020 重启 2s 就绪，三路 recall 仍仅 `elapsed_ms` 差；定向 91 测试过；全量 `--collect-only` 1,878 件零错误；`ruff check` 净、`ruff format --check` 167 文件全规范。残留：`app/gateway` 仍存少量被依赖件与未用件（`browser_capability` 等），按 D5 归依赖瘦身另案。

## Task 4 — 切换与真栈验收（插件仓）

> 动到的文件：插件仓 `cordis.patch.yml`、`presets/knowledge.patch.yml`、`README.md`、`docs/equivalence.md`。

- [x] 插件默认 `backendUrl` → `http://127.0.0.1:8020`（包补丁＋preset＋README/等价表同步）。
- [x] DSH 整重启（候令）：确认插件行加载新配置。
- [x] 面板读：列库（测试/t3-panel-acceptance）／列文档（t3 七件）／召回三路／百科条目正常。
- [x] 面板写：上传一件小文档 → `hrag-ingest` job 至 `ready`；重建索引 → `hrag-reindex`；我的条目读写。
- [x] 三工具真跑（他手跑，固定题面）：`星野摄影 银河 曝光`、`top_k=3`、`kb_id=9141e58…`；结果与 T6 基线逐 id/分数相同。
- [x] 日志取证：8020 侧 recall-test ×3 与上传/重建请求；无 5xx。

**实测**：插件默认已改 8020，DSH 整重启后右栏请求落在 8020（列库／supported-formats／文档 200）。①面板读：两库、t3 文档 9 件（本轮新增 `t3-doc-a.md` 与一张 PNG）全部 ready；百科条目 48。②面板写：上传 `t3-doc-a.md` → `ready · 1 slices`（4 分 10 秒）；重建 → `succeeded`（1 分 12 秒）；我的条目建卡 201／删卡 204。③三工具同题：vector 3 条 `chunk_id`＋分数逐字同基线（0.978004／0.269392／0.072026）；wiki 3 条同（manual 0.662098／wiki 0.366335／0.36588）；graph 8 实体＋2 证据 id 全同，证据 rerank 分数有第三位抖动（连续两次 0.72147／0.72307／0.72116）——**graph 的「分数逐字相同」不是稳定判据**，判据收敛为 id／排名／实体集合。④插件事务零 5xx。
**两项现场发现（已修）**：
- 上传后列表白屏跳动：`DocsView.load()` 每次 `refreshToken` 都翻 `loading`，与主树 react-query「重取保留旧数据」不一致；照同文件切片抽屉 `hasDataRef` 先例改为**首载/切库才显示 loading，同库刷新静默**。
- 4 分钟解析慢：不是解析——`qwen3.8-flash` 在 DashScope 兼容模式默认开思考，模型条目未声明 `supports_thinking`／`when_thinking_disabled`，抽取腿每片生成数千 reasoning token。online 复跑 token 明细：两轮 109.4s＋183.1s，reasoning 5,033／12,362；补 `enable_thinking: false` 后同文本 27.8s、reasoning 归零。config.yaml 与 README 配置节已补说明。
**残留**：重建的 wiki 向量批在 04:48:11–14 遇 DashScope 500，按 best-effort 跳过但整单仍报 `succeeded`；如需全量刷新可再重建一次。

## Task 5 — 收口（门禁＋文档回写＋提交候令）

> 动到的文件：本对＋引擎 README＋插件步骤记录§8／README／等价表。

- [x] 门禁：定向 pytest（`tests/knowledge/**`＋RAG 配置/召回 API）＋`ruff check`＋boot 探针；记录通过数。
- [x] 回写：本对 Status/实测；插件步骤记录 §8 引擎切换段；插件 README Status；等价表「后端/引擎」行如受影响则改。
- [x] 两仓提交链分列；提交候令。

**实测**：①定向 91 passed（app 入口／召回 API／prewarm／rag 配置错误）；全量保留面 **1860 passed／8 skipped／10 failed**，失败集与主体一同一批用例逐条相同（缺失可选依赖外的既有环境红：真实密钥在位、MinerU、aiosqlite loop、probe 夹具），**引擎独有失败 0**；其中 3 条 RAGAS 用例补可选依赖 skip，1 条 boot-snapshot 源断言改指 `knowledge_app.py`。②`ruff check` 净、`ruff format --check` 167 文件全规范；8020 boot 探针 `/health` 200、三路召回仍与基线同 id。③插件门禁：`node --check client.js`、6 个 `src/*.ts` strip-types、客户端冒烟默认 78 PASS／hostless 78 PASS。④回写：本对 Status＋Task 1–4 实测、插件步骤记录 §8、插件 README Status 与部署节、引擎 README 配置节（Qwen 思考开关说明）；等价表无后端地址行，无需改。

---

## 提交链（滚动记实）

**主体二（harness-rag）**（2026-10-20）

- [x] `2eb49e54d` feat(rag): pass the graph retrieval trace through the recall test response（挑拣主体一 `372b2f4b0`）。
- [x] `fcc4cdf8b` feat(rag): add the minimal knowledge-service entrypoint。
- [x] `b0537d535` chore: trim the repository to the knowledge service（2,035 件，含测试口径修）。
- [x] `27bf9e006` docs(rag): add the knowledge-service trim spec and plan。

> `config.yaml` 的 Qwen 思考开关是本地 operator 配置（gitignored），不入库；README 已记录写法。

**插件仓（dsh-harness-rag）**（2026-10-20）

- [x] `c2dd542` feat: default the backend URL to the minimal knowledge service。
- [x] `4761a42` fix: keep the document list during background refresh。
