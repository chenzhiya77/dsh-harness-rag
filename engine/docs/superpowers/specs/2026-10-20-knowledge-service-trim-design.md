# 主体二最小知识服务 —— 裁剪与引擎切换 Spec

**Status:** ✅ 实施完成（2026-10-20 D1–D8 全甲；Task 0–5 全落，门禁过；已提交：`fcc4cdf8b`／`b0537d535`／`27bf9e006`／链回填 `06b3a7097`）。
**Date:** 2026-10-20
**配套 plan:** [2026-10-20-knowledge-service-trim.md](../plans/2026-10-20-knowledge-service-trim.md)
**Parent:** 插件线步骤记录（`dsh-harness-rag` 仓）§8「裁剪、引擎指向切换＝后置」。

## 1. 范围与来源

主体二 `E:\app\python\agent\harness-rag` 是主体一 `deer-flow` 的完整复制（HEAD `b650e2496`，`upstream` 指向主体一）。本对把主体二从「全量 DeerFlow 复制」收成**一个最小 Python 知识服务**，只承载 DSH 插件实际调用的 API 面，并完成插件引擎指向切换。

- 首期范围：最小入口＋产品面裁剪＋数据快照＋插件切换＋真栈验收。
- 行为口径：**检索/摄取/百科/图谱/评测逻辑零改动**；只改装配、部署面与指向。
- 主体一（deer-flow）保持只读；本对所有代码与数据改动只落主体二。

## 2. Task 0 侦察结论（只读，2026-10-20）

### 2.1 插件实际调用面

插件代理（`src/kb_proxy.ts:18` `KB_PROXY_ROUTE`）与工具（`src/tools.ts`）只触达三个后端 router：

| Router | 前缀 | 覆盖调用 |
| --- | --- | --- |
| `knowledge_bases` | `/api/knowledge-bases` | 库 CRUD、文档（列表/上传/删除/重试/原文/切片/文件/视频流）、`recall-test`、`graph`、`chunk-positions`、`vector-projection`、`eval`（题库/合成/运行/趋势）、`wiki`（条目/生成/重生成）、`manual-knowledge`、`reindex`、`supported-formats` |
| `rag_config` | `/api/rag/config` | 功能模型读写、迁移状态、五类探测（embedding/dimensions/connectivity/sparse/asr） |
| `models` | `/api/models`、`/api/models/config` | 模型目录与映射 |

无任何 thread/run/agent/channel/skill/memory/browser 调用。

### 2.2 最小启动所需（实读）

- `knowledge_service.py` **零 `app.*` import**（纯 `deerflow.knowledge.*`）；`knowledge_bases.py:156-167` 只依赖 `request.app.state.knowledge_service` 与 `request.state.user`（AuthMiddleware 注入）。
- 必做生命周期：配置加载＋日志 → `init_engine_from_config()`（persistence bootstrap）→ `KnowledgeStore`／`VectorStore`／`KnowledgeIndexWorker`／`KnowledgeService` → UMAP 预热（可选）→ serve；退出时停 worker、取消预热、关引擎。
- 认证：`DEER_FLOW_AUTH_DISABLED=1` 时 AuthMiddleware 直接注入合成 admin（`auth_middleware.py:130-136`）；CSRF 在 auth-off 下整段跳过（`csrf_middleware.py:45-46`）。两条中间件必须保留，否则 `_user_id` 401。
- `/health` 路由与 AuthMiddleware 公共路径已存在（`app.py:805`、`auth_middleware.py:33`），最小入口应保留。

### 2.3 主体二现状

| 项 | 实况 |
| --- | --- |
| 代码 | 完整复制；HEAD `b650e2496`；`M README.md`＋10 件 untracked docs（与复制点一致） |
| 依赖环境 | **无** `backend/.venv` |
| 数据 | **无** `backend/.deer-flow` |
| 配置 | `config.yaml`／`models_config.json`／`.env` 与主体一**逐字节相同**；`rag_config.json` 较旧（10-05 vs 主体一 10-18），需同步 |
| remote | 仅 `upstream`→本地主体一 |
| 体量 | git 3102 件；frontend 30M／backend 42M／docs 19M／skills 874K／contracts 38K |

### 2.4 数据面

- 主体一 `backend/.deer-flow` 181M；`data/deerflow.db` 154M（含跑量/线程表）＋`data/knowledge` 18M。
- `documents.storage_path` 是**绝对路径**，全部指向主体一数据目录（`E:\app\python\agent\deer-flow\backend\.deer-flow\data\...`）；拷贝后必须改写，否则引擎仓不自洽。
- 38 件文档行中 **31 件源文件已缺**（测试1/测试2/评测冒烟/验收图文档），仅 `t3-panel-acceptance` 的 7 件齐全；缺失是主体一既有状态，不影响召回/三检索验收。
- Qdrant `127.0.0.1:6333` 为外部共享实例（集合按 `kb_` 前缀）；两服务同时写入有竞态风险。

### 2.5 端口

| 端口 | 现状 |
| --- | --- |
| 8001 | 主体一网关（当前在跑） |
| 8010 | Docker/WSL relay 占用，不可用 |
| 8020 | **空闲**（建议主体二固定端口） |

## 3. 目标形态

```text
uvicorn app.gateway.knowledge_app:app --host 127.0.0.1 --port 8020
```

- 一个进程、一个入口，只挂 `knowledge_bases`＋`rag_config`＋`models`＋`/health`。
- 不加载：LangGraph runtime、IM channels、scheduler、memory、skills/browser、extensions。
- 本地回环＋auth-off 起步；保留 `apiToken` 通道与两条中间件，后续可切 token 鉴权。
- 数据自洽：库数据（SQLite 快照＋`knowledge/` 文件）全在引擎仓内，路径改写指向引擎仓。
- 同一知识语义：三检索、摄取、百科、图谱、评测与主体一逐条一致。

## 4. 决策表（D1–D8）

| # | 题 | 选项 | 建议 |
| --- | --- | --- | --- |
| D1 | 最小入口形态 | 甲＝新增独立入口 `app/gateway/knowledge_app.py`（monolith 保留作对照，Task 3 再删）；乙＝直接裁 monolith | **甲**（先并存验证，删除后置） |
| D2 | 端口与并存 | 甲＝主体二固定 **8020**，插件默认改 8020（与主体一 8001 并存）；乙＝主体二接管 8001（停主体一）；丙＝8001 按需换进程 | **甲**（两产品可同时跑，引擎身份明确） |
| D3 | 认证 | 甲＝最小服务 auth-off（仅 127.0.0.1；中间件与 `apiToken` 管道保留）；乙＝首期即做 token 鉴权 | **甲**（先对齐现插件用法；鉴权另案） |
| D4 | 数据策略 | 甲＝SQLite `sqlite3` backup 快照＋拷贝 `knowledge/`＋改写 `storage_path` 前缀＋同步 `rag_config.json`；Qdrant 共用但只读验证。乙＝直接共读主体一数据目录（不改路径）；丙＝新建库重灌 | **甲**（引擎仓自洽；缺失文件按原状保留） |
| D5 | 裁剪边界 | 甲＝第一刀只裁产品/部署面（frontend/docker/skills/contracts/channels/scheduler/github/非知识 routers/monolith/非知识测试），保留 harness 依赖；依赖瘦身另案。乙＝一刀含依赖瘦身 | **甲**（先拿到可运行最小面；依赖瘦身需 import 审计） |
| D6 | 插件指向落地 | 甲＝改插件包默认（`cordis.patch.yml`＋`presets/knowledge.patch.yml`＋README/等价表）→ 整重启 DSH；乙＝只在 DSH profile 覆写 config | **甲**（仓库为唯一真源） |
| D7 | 验收面 | 甲＝T6 同题三检索＋面板读写（列库/列文档/召回/上传＋job/重建）＋后端日志；乙＝只跑三检索 | **甲**（覆盖读写两条路） |
| D8 | 引擎仓文档 | 甲＝重写 README 为「最小知识服务」（定位/启动/配置/数据/裁剪清单）＋本对落 `docs/superpowers`；乙＝保留原 DeerFlow README | **甲**（对外只写完成态） |

**2026-10-20 拍定：D1–D8 全甲。**

## 5. 裁剪清单（第一刀）

**保留**

- `backend/`（`app/gateway` 中知识所需模块、`app/gateway/services/knowledge_service.py`、`app/gateway/auth*`、`deps`、`run_models` 等被依赖件；`packages/harness` 与 `packages/extension-api`）。
- `config.yaml`、`models_config.json`、`rag_config.json`、`.env`、`uv.lock`、`pyproject.toml`。
- `backend/tests/knowledge/**`、RAG 配置/召回相关测试、`backend/tests/support` 所需夹具。
- 本对文档与知识能力相关 docs。

**删除**

- `frontend/`（30M）、`docker/`（改为一行「Qdrant 由宿主提供」说明）、`skills/`、`contracts/`。
- `backend/app/channels/`、`backend/app/scheduler/`、`backend/app/gateway/github/`、`backend/app/gateway/assets/`（如无认证页引用）。
- 非知识 routers：`agents` `artifacts` `assistants_compat` `auth`（仅路由；`app/gateway/auth` 包保留供中间件） `browser` `channel_connections` `channels` `console` `feedback` `features` `github_webhooks` `input_polish` `integrations` `mcp` `memory` `runs` `scheduled_tasks` `skills` `suggestions` `thread_runs` `threads` `uploads`。
- monolith 入口 `app/gateway/app.py`（最小入口验证通过后）。
- 非知识测试（`blocking_io`、`monocle` 等）与无关 docs；保留历史设计文档可后议。

## 6. 失败/边界语义

- **Qdrant 共享**：快照验证期只做读（列表/召回/图谱/wiki 查询），不做上传/重建/重抽；两服务不得同时写。发现写入需求 ⇒ 暂停主体一 worker 或改用独立 Qdrant（另案）。
- **DB 快照**：必须走 `sqlite3` backup API（WAL 下文件拷贝可能撕裂）；快照后校验 `PRAGMA integrity_check`。
- **路径改写**：只改 `documents.storage_path` 前缀（主体一 data 目录 → 主体二 data 目录）；缺失文件保持原缺失，不伪造。
- **删码顺序**：先最小入口跑通，再删 monolith/产品面；每刀后跑一次 boot＋知识 API 冒烟，红了就停。
- **DSH 指向**：`backendUrl` 属 host 侧配置，改包默认后需**整重启 DSH**（关窗重开不够）。
- **auth-off**：仅绑 `127.0.0.1`；启动日志保留告警；不得进共享/生产环境。
- **端口**：8010 被 Docker/WSL 占用；固定 8020 并写进文档与插件配置。

## 7. 非目标与另案

- **依赖瘦身**（backend pyproject 的 IM/e2b、harness 的 agent/sandbox 链）＝另案；`app/gateway/services/__init__.py` 与 `deps.py` 仍会拉入 langgraph/agent 模块，需 import 审计后再拆。
- **token 鉴权**、**新库初始化/迁移交付**、**缺失源文件清理**均另案。
- 检索优化三组（证据窗四细节/零配置降级链/中英桥）不进本对。
- 不移植工作台前端；主体一保留为全量产品。

## 8. 验收

1. **未裁 parity**：主体二 monolith 于 8020 起（auth-off）→ `/health` 200；`/api/knowledge-bases` 与主体一一致（测试、t3-panel-acceptance）；t3 文档 7 件；`recall-test` 三路结果与主体一**逐 id/分数相同**。
2. **最小入口 parity**：`app.gateway.knowledge_app:app` 于 8020 起 → 同上四条全过；日志无 agent/IM/scheduler 初始化。
3. **裁剪后**：删码后仍可启动，知识定向测试与 ruff 全绿；仓库不再含 frontend/docker/skills/contracts 与非知识 routers。
4. **切换真跑**：插件默认指向 8020＋DSH 整重启 → 面板列库/列文档/召回/百科正常；上传一件小文档出 `hrag-ingest` job 至 ready；重建出 `hrag-reindex`；T6 同题三工具结果与基线一致。
5. **文档一致性**：引擎 README、插件 README/等价表、插件步骤记录 §8 均为完成态。

## 9. 对照（与主体一）

| 面 | 主体一（deer-flow 全栈） | 本对（主体二最小服务） |
| --- | --- | --- |
| 进程 | Gateway＋前端＋nginx＋IM/调度 | 单进程知识 API |
| 入口 | `app.gateway.app:app` | `app.gateway.knowledge_app:app` |
| 生命周期 | LangGraph runtime＋IM＋调度＋记忆＋知识 worker | 持久化＋知识 worker（＋UMAP 预热） |
| API 面 | 全量 routers | 3 个知识 router＋`/health` |
| 数据 | 全量产品 DB | 同一知识语义的快照（路径自洽） |
```
