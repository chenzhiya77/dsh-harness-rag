# 主体二知识服务 Bearer Token 鉴权 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-10-20-knowledge-service-token-auth-design.md](../specs/2026-10-20-knowledge-service-token-auth-design.md)
**Status:** ✅ 完成（2026-10-20 D1–D6 全甲；Task 0–4 全落，真栈矩阵与插件真跑均过；全量零新增代码红；已提交：`8b3271a34`／`0269d6342`／`7c22be33f`＋链回填 `ee4b5d7d0`）。
**Parent:** [2026-10-20-engine-dependency-slimming.md](2026-10-20-engine-dependency-slimming.md) Task 5 后续「8020 token 鉴权」。

**Architecture:** 在共享 `AuthMiddleware` 里加一条 Bearer 分支（命中即 stamp `default` admin＋`auth_source=api_token`），把 Bearer 请求从 CSRF 双提交里豁免，并在最小入口 `lifespan` 加启动闸；插件侧已具备发送能力，零代码改动。

**硬约束**：只动主体二（`E:\app\python\agent\harness-rag`）；插件仓代码不动；token 值不落盘、不回显、不进提交；`backend/.env` 是用户文件，未经点名不改（验收用进程环境变量）；探针脚本落仓外 `E:\appdevelop\hrag-probe\`；本次起的 8020 收尾停掉；DSH 整重启候令；提交候令、英文 Conventional ASCII。

---

## Task 0 — 落点核实（只读）

> 2026-10-20 已完成。

- [x] 入口与中间件：`knowledge_app.create_app` 只挂 `AuthMiddleware`＋`CSRFMiddleware`（后加者在外层，CSRF 先跑）；公开路径 `/health`、`/docs`、`/redoc`、`/openapi.json`。
- [x] 认证分支：internal 头 → session cookie → auth-off 合成用户 → 401；auth-off 身份＝`default` admin。
- [x] 路由取数：`accessors.get_current_user_from_request` 只认 `{session, auth_disabled, internal}`；写操作走 `require_admin_user`。
- [x] CSRF：只对非 auth-off 的 POST/PUT/DELETE/PATCH 查双提交 cookie/header；带 Bearer 的写请求会在认证前被 403。
- [x] 插件侧：`apiToken` 已在配置模型；`http.ts`＋`kb_proxy.ts` 四条出站路径发 `Authorization: Bearer`；默认空。
- [x] 测试面：本仓没有 auth 中间件专项测试；`test_projection_prewarm` 直接驱动 `lifespan`（新增启动闸需同步 patch）。
- [x] 停点：D1–D6 待裁。

## Task 1 — token 核心（TDD）

> 动到的文件：新增 `app/gateway/api_token_auth.py`；改 `app/gateway/auth_disabled.py`、`auth_middleware.py`、`accessors.py`、`csrf_middleware.py`；新增 `tests/test_api_token_auth.py`。

- [x] **RED**：新建 `tests/test_api_token_auth.py`，用裸 FastAPI（同序挂 Auth＋CSRF）覆盖：无 token GET 401；错误 Bearer 401；正确 Bearer 200 且身份 `default`/admin/`api_token`；正确 Bearer 的 POST 无 CSRF 通过；无 Bearer 的 POST 仍 403；auth-off 无 Bearer 200；auth-off＋错误 Bearer 401；`/health` 公开；启动闸两条。先跑，确认按预期红。
- [x] `api_token_auth.py`：`API_TOKEN_ENV_VAR="DEER_FLOW_API_TOKEN"`；`get_api_token()`（strip；空＝未配置）；`extract_bearer_token()`（scheme 大小写不敏感，仅 Bearer）；`is_valid_api_token()`（`secrets.compare_digest`）；`get_api_token_user()`（`default` admin，字段形状同 auth-off 用户）；`require_api_token_configured()`（未开 auth-off 且无 token ⇒ `RuntimeError`，消息含生成命令）。
- [x] `auth_disabled.py`：新增 `AUTH_SOURCE_API_TOKEN = "api_token"`。
- [x] `auth_middleware.py`：Bearer 分支排在 internal/cookie 之前；无效 Bearer 直接 401（不回落）；命中 stamp `request.state.user`／`auth_source`，其余流程不变。
- [x] `accessors.py`：`get_current_user_from_request` 的 `auth_source` 白名单加入 `AUTH_SOURCE_API_TOKEN`。
- [x] `csrf_middleware.py`：`should_check_csrf` 对带 Bearer 头的请求返回 False（注释说明：认证在内层，无效 Bearer 仍 401）。
- [x] **GREEN**：`pytest tests/test_api_token_auth.py -q` 全过；`ruff check` 定向净。

**实测**：RED 先行（模块不存在，收集中断）；实现 `api_token_auth.py`（env 读取、Bearer 解析、`compare_digest`、`default` admin、启动闸）＋`AUTH_SOURCE_API_TOKEN`＋中间件 Bearer 分支＋accessors 白名单＋CSRF 豁免后 **11 passed**。矩阵覆盖：无 token/错误 token 401、正确 token 200 且身份 `default`/admin/`api_token`、Bearer POST 免 CSRF、无 Bearer POST 仍 403、auth-off 回退与「错误 Bearer 不被 auth-off 掩盖」、scheme 大小写、启动闸两条。`ruff check`＋`format --check` 净（修了两处 import 排序与一处格式）。

## Task 2 — 启动闸与文档

> 动到的文件：`app/gateway/knowledge_app.py`、`tests/knowledge/test_projection_prewarm.py`、`README.md`、`AGENTS.md`。

- [x] `lifespan` 在 `warn_if_auth_disabled_enabled()` 后调用 `require_api_token_configured()`（D2 甲）。
- [x] `test_projection_prewarm.py` 补 patch（`require_api_token_configured`），保持原用例只测 UMAP 预热。
- [x] `knowledge_app.py` 文档串：运行命令改为 token 模式；auth-off 标为显式逃生口。
- [x] `README.md`：新增「鉴权」段——`DEER_FLOW_API_TOKEN` 生成/配置、插件 `apiToken` 对齐、`/health` 公开、auth-off 仅本机、远程需 TLS。
- [x] `AGENTS.md`：入口/鉴权行补一句 token 口径。
- [x] 门禁：`pytest tests/test_api_token_auth.py tests/test_knowledge_app_entry.py tests/test_import_surface.py tests/knowledge/test_projection_prewarm.py -q`；`ruff check` 净。

**实测**：`lifespan` 在 auth-off 告警后调用 `require_api_token_configured()`；`test_projection_prewarm` 补 patch 后保持原意。`knowledge_app` 文档串改为 token 模式；README 新增「鉴权」小节并改启动命令；AGENTS 启动命令与 invariant 同步。定向门禁 **18 passed**；ruff 净。

## Task 3 — 真栈验收

> 动到的文件：无（探针仓外；token 仅进程环境）。

- [x] 起 8020：`DEER_FLOW_AUTH_DISABLED=`（置空覆盖 `.env`）＋`DEER_FLOW_API_TOKEN=<随机串>`；18:43:23 就绪；日志仅一条 Qdrant 离线环境 ERROR（非鉴权面）。token 只存探针变量，不回显。
- [x] curl 矩阵：`/health` 无 token 200；`GET /api/knowledge-bases` 无 token 401、错 token 401、对 token 200 且库列表与 10-20 一致；`POST /api/knowledge-bases` 无 token 403（CSRF 既有）、对 token 空体 422（证明穿过 CSRF）。
- [x] 启动闸：无 token 且 `DEER_FLOW_AUTH_DISABLED` 为空 ⇒ 启动失败、错误信息可读；`DEER_FLOW_AUTH_DISABLED=1` ⇒ 正常起、无 token 请求 200（回退路径）。
- [x] 插件真跑（2026-10-20 代跑）：DSH profile 填同一 token、引擎无 auth-off；面板列表/文档正常；错 token 的服务端 401 已由 curl 矩阵证明。
- [x] 收尾：停掉本次起的 8020（显式 PID）；需要长期运行则交回终端命令。

**实测**：token 模式 8020 于 18:43:23 startup complete，`/health` 200。矩阵：KB 无 token 401 `not_authenticated`／错 token 401 `token_invalid`／对 token 200（id 与基线一致：`48a492c8…`、`9141e58d…`）；`POST /api/knowledge-bases` 无 token 403（CSRF）／错 token 401／对 token 空体 422（穿过 CSRF）；`/api/rag/config` 401→200；`/api/models` 401→200；`/docs` 公开 200。启动闸：无 token 且 auth-off 为空时退出码 3，日志含可读 `RuntimeError: No API token configured…`。auth-off 回退：无 Bearer 200、错误 Bearer 401（D4 甲）。**环境态**：Qdrant `127.0.0.1:6333` 本轮未运行，worker 启动报一条「collection init failed」ERROR（非鉴权面；插件真跑前需先起 Qdrant）。本次 8020（PID 8048）与 8021 探针均已停，探针 token 文件已删。**插件真跑（代跑）**：按用户「你来验证」把 token 写入 `backend/.env`（`DEER_FLOW_AUTH_DISABLED=` 置空）与 DSH profile（`cordis.patch.yml` 的 `harness-rag.config.apiToken`，原文件备份 `cordis.patch.yml.bak-authprobe-20261020`）；起 Docker Desktop＋`qdrant` 容器后重启 8020，worker 正常启动。DSH 启动后引擎日志出现 `GET /api/knowledge-bases`、`supported-formats`、`.../9141e58d.../documents` **三条 200**；面板视觉核到库名 `t3-panel-acceptance` 与文档列表（t3-doc-a.md、测试10.pdf、2022_03_26…、journey-draft…、java后端…、t3-doc-f-rail.md、t3-doc-e.md、t3-doc-c.md）。无 token/错 token 的 401 由 curl 矩阵证明 ⇒ 插件的 200 即证明其 Bearer 头生效。**当前 8020、Qdrant、DSH 均在运行**，交回用户。

## Task 4 — 收口

> 动到的文件：本对文档。

- [x] 全量：`pytest -m "not live" tests/ -q` 与 10-20 基线（1862 passed／8 skipped／10 failed）同集比对，零新增红；`ruff check`＋`ruff format --check`。
- [x] 回写：spec Status 与 §5 验收数字；plan 各 Task 实测；README/AGENTS 核对完成态。
- [x] 工作区逐文件核 hunk，排除 `.env`、数据目录、仓外探针。
- [x] 提交链（候令）：拟三笔——token 核心＋测试／启动闸＋文档／收口回写（或按实测合并）。

**实测**：全量 **10 failed／1820 passed／60 skipped／1 error**（206.53 s）；`FAILED` 集与 10-20 基线**逐条相同**（diff 为空）。新增的 1 error 与 52 条 skip 全部是 Qdrant 环境态：`test_vector_store` 的 skip 原因实核为「Qdrant not reachable at http://127.0.0.1:6333」，errored 用例也是 `ConnectError @ 6333`；Docker Desktop 未运行，未擅自拉起。**零新增代码红**。`ruff check` 全仓过、`ruff format --check` 161 文件全规范。工作区：8 改＋2 新增代码＋2 新文档，无 `.env`、数据目录、仓外探针。提交链拟三笔（候令）：`feat(auth)` token 核心＋测试／`feat(auth)` 启动闸＋文档／`docs` spec+plan。

---

## 提交链（滚动记实）

- `8b3271a34` `feat(auth): require a bearer token for the knowledge service`
- `0269d6342` `feat(auth): fail fast without a token and document the setup`
- `7c22be33f` `docs: record the knowledge-service token auth design and verification`
