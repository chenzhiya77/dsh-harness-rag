# Harness RAG 知识服务（内置引擎）

DSH 插件 `dsh-harness-rag` 的内置引擎：只提供知识库 HTTP API。

本目录是内置引擎的源码快照（上游 `harness-rag`），不包含 agent 运行时、IM 通道、调度器、工作台前端与部署编排。

## 拓扑

```text
DSH 插件（host half + client half）
        │  HTTP  127.0.0.1:8020
        ▼
本服务 ──┬── SQLite        backend/.deer-flow/data/deerflow.db
         ├── 上传原件      backend/.deer-flow/data/knowledge/<kb_id>/
         ├── Qdrant        127.0.0.1:6333（由宿主提供；集合 kb_chunks / kb_entities /
         │                 kb_wiki_entries / kb_manual_cards）
         └── 配置          config.yaml + models_config.json + rag_config.json + backend/.env
```

## 快速开始

要求：Python 3.12、[uv](https://docs.astral.sh/uv/)、可用的 Qdrant。

```bash
cd backend
uv sync --inexact

cp ../config.example.yaml ../config.yaml
cp ../models_config.example.json ../models_config.json
cp ../rag_config.example.json ../rag_config.json   # 可选；界面保存时写入
```

默认安装已包含 ragas（L2 评测依赖），无需再加 `--extra ragas`。

密钥放 `backend/.env`（嵌入、重排、解析、VLM、ASR 等按需）。Qdrant 地址取 `config.yaml` 的 `rag.qdrant_url`。

启动（Bearer token；`/health` 公开）。先在 `backend/.env` 设置 `DEER_FLOW_API_TOKEN`，并移除/置空 `DEER_FLOW_AUTH_DISABLED`：

```bash
cd backend
.venv/Scripts/python.exe -m uvicorn \
  app.gateway.knowledge_app:app --host 127.0.0.1 --port 8020
# Linux / macOS: .venv/bin/python -m uvicorn ...
```

```bash
curl http://127.0.0.1:8020/health
# {"status":"healthy","service":"harness-rag-knowledge"}
```

### 鉴权

- 服务端：`backend/.env` 写入 `DEER_FLOW_API_TOKEN=<token>`（生成：`python -c "import secrets; print(secrets.token_urlsafe(32))"`）。未配置 token 且未设 `DEER_FLOW_AUTH_DISABLED=1` 时服务拒绝启动。
- 客户端：除 `/health` 外的请求带 `Authorization: Bearer <同一 token>`，否则 401；插件在配置里填 `apiToken`。
- `DEER_FLOW_AUTH_DISABLED=1` 是本机回环的显式逃生口：只对不带 Bearer 的请求生效，启动时告警，不做鉴权。
- 远程部署请置于 TLS 反向代理之后。

数据冷启动时自动执行数据库迁移。仓库不含知识数据快照；从旧部署迁移时：

1. 用 `sqlite3.Connection.backup` 复制 `.deer-flow/data/deerflow.db`（WAL 下不要直接拷文件），并跑一次 `PRAGMA integrity_check`；
2. 把副本中 `documents.storage_path` 的绝对路径前缀改成当前数据目录；
3. 复制 `.deer-flow/data/knowledge/` 与根 `rag_config.json`。

## API 面

| 路由 | 用途 |
| --- | --- |
| `/health` | 存活探针 |
| `/api/knowledge-bases` | 库 CRUD；文档上传/列表/重试/删除/原文/切片/文件/视频流；`recall-test`、`graph`、`chunk-positions`、`vector-projection`、`eval`、`wiki`、`manual-knowledge`、`reindex`、`supported-formats` |
| `/api/rag/config` | RAG 功能模型配置（读合并态；写 `rag_config.json`）及迁移/重灌/探测 |
| `/api/models` | 模型目录（设置面读写 `models_config.json`） |

不提供 `threads` / `runs` / `channels` / `mcp` / `skills` / `scheduler` / 上传代理等产品路由。

## 配置

| 文件 | 作用 |
| --- | --- |
| `config.yaml` | 应用、数据库、RAG 默认值（operator 维护） |
| `models_config.json` | 模型目录（API 可写） |
| `rag_config.json` | RAG 功能模型覆盖（API 可写，缺省回落 `config.yaml`） |
| `backend/.env` | 各类密钥 |

DashScope 的 Qwen3 混合思考模型默认开启思考。模型条目需声明 `supports_thinking: true` 与 `when_thinking_disabled.extra_body.enable_thinking: false`，否则图谱抽取腿会为每片生成数千 reasoning token（单切片实测 4–5 分钟；显式关闭后约 30 秒）。

`DEER_FLOW_AUTH_DISABLED=1` 会注入本机管理员身份并跳过 CSRF。它只允许绑定 `127.0.0.1`，不得用于共享或生产环境；token 鉴权另案。

## 代码结构

```text
backend/app/gateway/knowledge_app.py       最小入口（lifespan + 三个 router + /health）
backend/app/gateway/routers/               knowledge_bases / rag_config / models
backend/app/gateway/services/              knowledge_service / rag_migration / rag_reembed
backend/packages/harness/deerflow/         知识库核心：解析、切分、嵌入、索引、图谱、百科、评测
backend/packages/extension-api/            扩展契约（保留依赖）
backend/tests/knowledge/                   知识库测试
```

## 已裁剪

- 顶层：`frontend/`、`docker/`、`skills/`、`contracts/`、`deploy/`、`pr-build/`。
- 后端：`app/channels/`、`app/scheduler/`、`app/gateway/github/`、非知识 routers、monolith `app/gateway/app.py`。
- 测试与文档：非知识测试、产品文档与翻译 README、部署脚本。
- Qdrant 由宿主提供；本目录不含 compose 或容器编排。

## 依赖与启动面

两处 `pyproject.toml` 的 base 依赖只保留知识服务实际使用的包：

- 运行时：FastAPI/uvicorn、SQLAlchemy＋aiosqlite/alembic、Qdrant 客户端、LangChain/LangGraph（模型与检索工具）、markitdown（文档解析）。
- 鉴权：bcrypt、PyJWT、email-validator（登录态与 admin 校验）。
- 模型 provider：`openai-compatible`／`deepseek`／`anthropic` 三种（`/api/models` 的 allowlist）。

IM 通道、agent/sandbox/浏览器、LangGraph API server/CLI、duckdb、langfuse 等不再安装。harness 中的休眠模块仍在源码树里，但对应包未安装；需要时按模块补装。`tiktoken`／`langgraph-sdk` 由 openai/langgraph 传递安装。

实测：裁剪后 site-packages 226 → 167 个包、685 → 419.4 MB；默认安装加入 ragas 评测依赖后为 199 个包、707 MB（+287.6 MB）；入口导入 3.70 s／1,708 模块（5 次中位，裁剪期实测）。首次 `recall-test` 会一次性加载三个检索工具模块。

## 开发

```bash
cd backend
uv sync --inexact
.venv/Scripts/python.exe -m pytest tests/ -q      # Linux/macOS: .venv/bin/python -m pytest
.venv/Scripts/python.exe -m ruff check app tests
.venv/Scripts/python.exe -m ruff format --check app tests
```

`tests/knowledge/` 中依赖 Qdrant 的用例在 `127.0.0.1:6333` 不可达时自动跳过。

## 归属

知识库能力由本项目自行实现；源码树中的 DeerFlow harness 框架部分按 MIT 保留上游声明，见上级 `THIRD_PARTY_NOTICES.md`。
