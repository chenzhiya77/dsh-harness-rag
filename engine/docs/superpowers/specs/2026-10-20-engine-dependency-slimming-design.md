# 主体二引擎依赖瘦身 —— Spec

**Status:** ✅ 实施完成（2026-10-20 D1–D6 全甲；Task 1–5 全落，门禁过；已提交：`4b11bef14`…`433aa3021`＋链回填 `ce519b564`）。
**Date:** 2026-10-20
**配套 plan:** [2026-10-20-engine-dependency-slimming.md](../plans/2026-10-20-engine-dependency-slimming.md)
**Parent:** [2026-10-20-knowledge-service-trim-design.md](2026-10-20-knowledge-service-trim-design.md) D5「只裁产品/部署面不瘦依赖，另案」。

## 1. 范围与目标

主体二已是最小知识服务，但安装与启动仍背着完整 DeerFlow 的底座：`backend/pyproject.toml` 拉着已删除的 IM 通道依赖，`packages/harness/pyproject.toml` 拉着 agent/sandbox/API-server 链，入口导入时还会把 LangGraph runtime 与工具目录整个拉起来。本对只做三件事：

1. **依赖声明收敛**：base 依赖只保留知识服务实际用到的包；休眠模块所需的包不再随安装进入环境。
2. **启动面解耦**：去掉最小入口对 LangGraph runtime、工具目录、扩展加载器的导入副作用。
3. **死代码清理**：删除已无调用方的 run-lifecycle 与 app 层残留模块。

行为口径：**API 面、检索/摄取/百科/图谱/评测逻辑零改动**；`config.yaml`／`rag_config.json`／数据目录不动；主体一保持只读。

## 2. Task 0 侦察结论（只读，2026-10-20）

### 2.1 启动导入现状

以引擎 venv 实测 `import app.gateway.knowledge_app`（warm FS，两次）：

| 指标 | 现状 |
| --- | --- |
| 导入墙钟 | **6.25–6.31 s** |
| 模块数 | **2,871** |
| 一级分支归因 | `auth_disabled` 1,637 模块（`deerflow.runtime.__init__` 连带 langgraph/langchain）／`routers` 662／fastapi 129／auth middleware 78 |

隔离测量（各自新进程，cold/warm 基本一致）：

| 目标 | 墙钟 | 模块 |
| --- | --- | --- |
| `deerflow.runtime.user_context` | 3.60 s | 2,005 |
| `app.gateway.services`（run lifecycle） | 5.82 s | 2,763 |
| `app.gateway.deps` | 5.88 s | 2,754 |
| `deerflow.tools.builtins.graph_search_tool` | 5.53 s | 2,669 |
| `app.gateway.services.knowledge_service` | 5.93 s | 2,792 |

三个根因：①`deerflow/runtime/__init__.py` 急切重导出 runs/checkpointer；`user_context` 是它的子模块，任何 `from deerflow.runtime.user_context import ...` 都会执行整包 `__init__`；②`app/gateway/services/__init__.py`（1,462 行 run lifecycle）无调用方，却因 `knowledge_service` 是它的子模块而被执行；③`deerflow/tools/__init__.py` 与 `builtins/__init__.py` 急切导入完整工具目录，三个检索工具只是要用其中的 `_impl`。

模拟上述解耦后：**2.80–2.99 s / 2,155–2,180 模块**（同一探针，预热文件缓存）。

### 2.2 死代码（全仓 grep 零调用方）

| 文件 | 说明 |
| --- | --- |
| `app/gateway/services/__init__.py` | 1,462 行 run lifecycle；仅 `run_models` 一个内部依赖 |
| `app/gateway/deps.py` | 15 个 run 期 accessor＋3 个轻量 accessor；routers 只用后三个 |
| `app/gateway/context_usage.py` | 无调用方 |
| `app/gateway/langgraph_auth.py` | 无调用方；唯一 `langgraph_sdk` 直接 import |
| `app/gateway/run_models.py` | 只被 `services/__init__.py` 使用 |
| `app/gateway/checkpoint_lineage.py` | 无调用方 |
| `app/gateway/browser_capability.py` | 无调用方 |
| `app/gateway/pagination.py` | 无调用方 |
| `app/gateway/path_utils.py` | 无调用方 |
| `app/gateway/trace_middleware.py` | 无调用方 |
| `app/gateway/utils.py` | 只被 `services/__init__.py` 使用 |

`app/gateway/auth/*` 中被这些模块间接引用的 `reset_admin`／`credential_file`／`user_provisioning`／`oidc*` 不删：鉴权栈（D5 甲）整体保留，作为后续 8020 token 鉴权的落点。

### 2.3 依赖声明实况

**backend（可直接删 9 项）**：`lark-oapi`／`slack-sdk`／`python-telegram-bot`／`markdown-to-mrkdwn`／`wecom-aibot-python-sdk`／`dingtalk-stream`／`sse-starlette`／`e2b-code-interpreter`／`langgraph-sdk`（仅删声明，仍由 langgraph 传递安装）。保留 `python-multipart`（`UploadFile`）、`email-validator`（`EmailStr`）、`bcrypt`／`pyjwt`（鉴权栈）。

**harness base（无 kept import，17 项）**：`agent-client-protocol`／`agent-sandbox`／`croniter`／`exa-py`／`kubernetes`／`langchain-mcp-adapters`／`langchain-google-genai`／`langfuse`／`langgraph-api`／`langgraph-cli`／`langgraph-runtime-inmem`／`langgraph-sdk`／`tavily-python`／`firecrawl-py`／`duckdb`／`tiktoken`／`e2b-code-interpreter`。`tiktoken` 只被 agent memory 直接 import（openai/langchain-openai 仍会传递安装）；`langgraph-sdk` 仍由 langgraph 传递安装。`ddgs`／`readabilipy`／`markdownify` 保留：保留测试会解析 `config.yaml` 的休眠 web 工具，删除会让 `test_rag_agent_assembly` 直接红。

**harness base（保留）**：`deerflow-extension-api`／`dotenv`／`httpx`／`langchain`／`langchain-anthropic`／`langchain-deepseek`／`langchain-openai`／`langgraph`／`langgraph-checkpoint-sqlite`／`markitdown[all,xlsx]`／`pydantic`／`pyyaml`／`qdrant-client`／`networkx`／`numpy`／`sqlalchemy[asyncio]`／`aiosqlite`／`alembic`／`openai`／`cryptography`／`packaging`。`langchain-anthropic` 保留是因为 `/api/models` 的 `PROVIDER_ALLOWLIST`（openai-compatible／anthropic／deepseek）允许写入该 provider。

可删包的自身文件体积（venv 实测）：`duckdb` 36.1 MB、`lark-oapi` 17.7、`kubernetes` 16.2、`python-telegram-bot` 3.4、`langgraph-api` 2.4、`langfuse` 2.3、`slack-sdk` 1.5、`agent-sandbox` 1.2、`e2b` 1.2、`firecrawl-py` 1.1、其余 <0.5；**直接合计约 85 MB**，另有传递卸载（kubernetes/agent-sandbox/e2b/langfuse 的依赖树）。

### 2.4 运行面约束

- 引擎 venv 当前未装 `umap`／`ragas`／`pymupdf`／`python-calamine`／`scenedetect`／`funasr`／`whisper`；可选功能维持「装了才启用」现状，本对不改变 extras 结构。
- `markitdown` 在装，PDF/Office 解析路径可用；`pymupdf4llm` 是可选加速层。
- 8020 与 Qdrant `127.0.0.1:6333` 的共享写入口径不变：验收期单写者，parity 用既有 t3 库。

## 3. 目标形态

```text
启动：uvicorn app.gateway.knowledge_app:app --host 127.0.0.1 --port 8020
导入：≤4.5 s / ≤1,800 模块（实测 3.70 s / 1,708；现状 6.3 s / 2,871）
安装：backend base 9 项移除；harness base 17 项移除；site-packages 685 → 419.4 MB（-38.8%）
代码：services 包只剩 knowledge_service／rag_migration／rag_reembed；deps.py 拆为 accessors.py
```

> 目标修正：Task 0 的 3.0 s 模拟值在计时前预导入了 config/authz 等模块，系统性偏低。实施后真实基线为 4.1–5.5 s／1,713 模块（qdrant／networkx／sqlalchemy 等知识面依赖保留），故目标改为 ≤4.5 s／≤1,800 模块。

## 4. 决策表（D1–D6）

| # | 题 | 选项 | 建议 |
| --- | --- | --- | --- |
| D1 | 瘦身范围 | 甲＝依赖声明＋启动解耦＋app 死代码，harness 休眠子包保留；乙＝再删 harness 死子包（agents/community/sandbox/runtime 等）；丙＝只改 backend pyproject | **甲**（收益已覆盖安装/启动，乙的删除量远大于收益且会打断保留测试） |
| D2 | harness 依赖基线 | 甲＝按「知识服务导入闭包＋模型 allowlist」收 base，休眠模块所需包直接删；乙＝挪进 extras 保留可装；丙＝不动 harness | **甲**（休眠模块在引擎中不可达；extras 结构保持不变） |
| D3 | 启动解耦方式 | 甲＝runtime/tools/builtins/guardrails/authz/agents 懒初始化＋`ExtensionSpec` 迁到 `deerflow.config`＋accessors 拆分＋三个检索工具延迟到首次 recall；乙＝只删 app 死模块；丙＝不解耦 | **甲**（实测降 2.2 s／1,158 模块） |
| D4 | 死代码处置 | 甲＝删 §2.2 的 11 个文件（`services/__init__.py` 置空保留包）；乙＝保留待用 | **甲**（全仓零调用方） |
| D5 | 鉴权栈 | 甲＝保留 bcrypt/pyjwt/email-validator/authz 全套；乙＝裁成 auth-off only | **甲**（8020 token 鉴权是已登记下一步，不在本对拆桥） |
| D6 | 锁与环境 | 甲＝`uv lock`＋`uv sync` 实删并记录体积差；乙＝只改声明不同步 | **甲**（否则测不到真实安装面） |

## 5. 验收

- 导入探针：`import app.gateway.knowledge_app` 实测 **2,871→1,708 模块、6.3→3.70 s**（5 次中位；目标 ≤4.5 s／≤1,800 模块）。
- 安装面：site-packages **226→167 个包、685→419.4 MB（-265.6 MB，-38.8%）**；`uv lock` 纯删除 47 个包条目。
- 行为等价：`/health` 200；两库与文档列表同 id；三路 recall——vector 3 条 id＋分数逐字相同、wiki 3 条 entry_id＋分数相同、graph 8 实体/2 证据/1 关系/trace 相同；`/api/rag/config`、`/api/models` 200。
- 门禁：保留测试全量与 10-20 基线同集比对（零新增红）＋`ruff check`＋`ruff format --check`。
- 稳态：8020 两次冷启均正常；日志无新增 error。

## 6. 不做

- 不删 harness 休眠子包与其测试（D1 甲）。
- 不改检索/摄取/百科/图谱/评测逻辑与任何 API 形状。
- 不动 extras（postgres/redis/umap/ragas/pymupdf/tui/monocle 等）与主体一。
- 不在此对补 8020 token 鉴权（另案）。
