# RAG 功能模型配置增量设计 — 2026-09-10

> 成果取向：让 RAG 各分工模型从「只能改后端 config.yaml + env」变成「设置 → 模型 → 功能模型」里可选可填，
> 并支持密钥落盘（掩码 + 原子写）。本增量**不重做**已交付的对话模型配置（provider 白名单 / models_config.json / 两步向导），
> 而是复用同一条 seam。

## Problem Statement

1. **RAG 有 6 个模型角色，全部只能改后端**（本增量追加第 7 个：评测 judge，详见
   plan `2026-09-10-rag-functional-model-config.md` 的「增量（2026-09-11）」）：
   | 角色 | 字段 | 今天的数据源 |
   |---|---|---|
   | 图谱抽取 LLM | `rag.extract_model` | 已是 `models:` 条目名（`create_chat_model(get_app_config().rag.extract_model)`，`knowledge/graph/extractor.py:117`） |
   | 评测 judge | `rag.judge_model` | `models:` 条目名或 `dashscope:<id>`；UI 触发的评测传 `None` ⇒ 主模型（`knowledge/eval/factory.py:66`、`knowledge/eval/ondemand.py:408`） |
   | 图片/视频 caption | `rag.vlm_model`（+ legacy `vlm_base_url` / `vlm_api_key_env`） | 独立 OpenAI 兼容客户端；`vlm_model` 命名 `models:` 条目 ⇒ 模型 id/endpoint/key 全取该条目（`knowledge/vlm_target.py`），命名不到 ⇒ 旧路径（`vlm_base_url` + 文件 key/env） |
   | embedding | `rag.embedding_model` | DashScope 专用 dense+sparse；key **固定** env `DASHSCOPE_EMBEDDING_API_KEY`（`knowledge/embedder.py:36`，注释明写 never from config） |
   | rerank | `rag.rerank_model` | DashScope rerank API；key **固定** env `DASHSCOPE_RERANK_API_KEY`（`knowledge/reranker.py:31`） |
   | ASR（视频） | `rag.video.asr_provider` / `asr_model` | funasr / whisper 运行时 |
   | 解析 token | `MINERU_API_TOKEN` | env |
2. **密钥无法通过配置传入**：embedding/rerank 的 env 名写死在代码里，VLM/ASR 只配「env 变量名」而不是值 ⇒ 前端填 key 无处可放。
3. **没有前端入口**：知识库页 6 个 middle tab 无设置位（只有 `middle-tabs.tsx`），设置页只有「模型」分区且只覆盖对话模型。

## Solution

1. **入口：设置 → 模型 分区内加视图切换**（segmented：「对话模型 / 功能模型」）。共享同一页外壳与 admin 门控，
   但**数据模型是两套**——embedding/rerank/ASR 不是 chat 模型，硬塞进对话模型那套 provider 白名单会表达不出语义。
2. **存储：新增 API 可写的 `rag_config.json`**（与 `models_config.json` 同级、同为 gitignored），
   `AppConfig.from_file()` 载入时**按字段合并覆盖** config.yaml 的 `rag:`（文件优先；`video` 等嵌套块深合并）。
3. **密钥落盘 + 掩码**：文件存值，读接口一律回 `********` 哨兵，写接口收哨兵即「保留原值」；
   env 仍是**回退**（文件未设 → 用 env），保证既有运维部署零改动。原子写 + 写锁 + support-bundle 脱敏。
4. **热重载**：`rag` **不在** `STARTUP_ONLY_FIELDS`（已核实：注册表 14 项不含 rag），且消费点都在调用时
   `get_app_config()` 现读 ⇒ 把新文件纳入既有热重载签名后，**改完下一次入库/检索即生效，无需重启**。
5. **全局单套，不做 per-KB**：embedding 维度 **1024 写死在向量库**（`knowledge/vector_store.py:122`，
   四个 collection + 向量空间投影共用）⇒ 换 embedding 模型受维度约束，且**已入库的库必须重建索引**，
   不能当"随手切换"。UI 在改 embedding 时给出明确告警。

## User Stories

1. As an admin, I want to pick the graph-extraction model from my already-configured chat models, so that I don't re-enter credentials.
2. As an admin, I want to set the embedding/rerank model *names and keys* in the UI, so that tuning retrieval no longer needs a backend edit + restart.
3. As an admin, I want to configure the caption VLM (model + base_url + key), so that image/video captions can point at my own endpoint.
4. As an admin, I want to choose the ASR provider/model and paste the MinerU token, so that the ingestion pipeline is configurable end to end.
5. As an admin, I want to switch between chat models and functional models in one page, so that I don't hunt for a second settings area.
6. As an admin, I want a warning when changing the embedding model, so that I know existing knowledge bases need re-indexing.
7. As an operator, I want env vars to keep working as a fallback, so that existing deployments need no change.
8. As an operator, I want the key never returned by the API, masked in reads, redacted in support bundles, and gitignored, so that RAG credentials stay comparable to the model keys.
9. As a non-admin, I want the functional-model view denied, so that RAG credentials remain admin-only.
10. As a developer, I want `config.yaml` to remain the operator-trusted source (never written by the API), so that the trust boundary doesn't move.

## Implementation Decisions

- **文件与模型**：`packages/harness/deerflow/config/rag_config_file.py`，`RagConfigFile`（`extra="forbid"`），
  字段为可选的 `embedding_model` / `embedding_api_key` / `rerank_model` / `rerank_api_key` / `vlm_model` /
  `vlm_base_url` / `vlm_api_key` / `video`（`asr_provider` / `asr_model` / `caption_model`）/ `extract_model` /
  `judge_model` / `qdrant_url` / `mineru_api_token`；路径解析镜像 `ModelsConfig.resolve_config_path`
  （显式参数 → `DEER_FLOW_RAG_CONFIG_PATH` → 项目根搜索；搜索模式下文件可选）。
- **密钥字段命名**：`*_api_key` 是**值**；`vlm_api_key_env` 保留为回退用的 **env 变量名**，语义写进字段描述。
- **合并**：新增 `merge_rag_config(yaml_rag: dict, ui: RagConfigFile) -> dict`，逐字段覆盖（`None` 视为未声明），
  `video` 深合并；与 `merge_ui_models` 同风格、纯函数、可 node 式单测。
- **消费者**：`RagConfig` 增 `embedding_api_key` / `rerank_api_key` / `vlm_api_key` / `mineru_api_token`（全部 `str | None`），
  `embedder.py` / `reranker.py` / `captioner.py`(×2) 的 key 解析改为 `config 值 ?? 环境变量`；
  env 名常量保留为回退默认。
- **API**：`GET/PUT /api/rag/config`（**admin 门控**，`require_admin_user`）。GET 回
  `{field: value}` + `api_key` 一律哨兵 + `source`（`config_file` / `ui`）; PUT 整集合写**只动 `rag_config.json`**，
  收哨兵=保留、`422` 拒绝未声明字段（`extra="forbid"`），`null` 视为「不写该字段」。
- **热重载**：`_get_rag_config_signature()` 并入 `get_app_config` 的 reload 判定（镜像 `_get_models_config_signature`）。
- **前端**：`core/rag/`（types/api/hooks，TanStack Query）与设置页内的视图切换；
  「功能模型」视图的字段分区：图谱抽取（**下拉选已配模型**）、caption VLM、embedding、rerank、ASR、服务与 token
  （qdrant_url / MinerU）；embedding 变更时行内告警「已有知识库需重建索引」。
- **不在 v1**：探测/测试连接按钮（不做凭证探测，与对话模型的 validate 端点不同——这里没有「模型是否存在」的统一口径）；
  graph 质量旋钮（`graph_*` / `entity_merge_similarity` …）、`worker_concurrency`、`extract_rate_limit_rps` 等调优项仍只走 config.yaml；
  per-KB 覆盖；新增 embedding/rerank provider（客户端是 DashScope 专用实现，v1 只暴露模型名与密钥，provider 固定）。

## Testing Decisions

- **Seam B** `backend/tests/test_rag_config_file.py`：文件优先逐字段覆盖 / `video` 深合并 / 文件缺失或空 → 回退 config.yaml /
  形状错误 → 明确报错 / 原子写无残留 / 哨兵保留 / 只改 rag 文件也触发 `get_app_config` 重载。
- **Seam B（消费者）** `backend/tests/test_knowledge_*`：key 解析 `config ?? env`（文件设了用文件；未设回退 env 常量）。
- **Seam A** `backend/tests/test_rag_config_api.py`：非 admin 403 / GET 掩码 + source / PUT 拒绝未知字段 422 /
  PUT 只写 non-None 字段 / 哨兵保留（读盘断言原 key 不变）/ PUT 后 `get_app_config().rag` 反映（热重载）/ 不写 config.yaml。
- **支持** `tests/test_support_bundle.py`：新增 `rag-summary.json` 且 key 被脱敏。
- **Seam C node** `frontend/tests/unit/rag/*.test.ts`：PUT payload 组装（未改动的 key 以哨兵提交、`null` 不提交）、
  视图切换的状态、embedding 变更告警的判定纯函数。
- **Seam C dom** `frontend/tests/unit/settings/functional-models.dom.test.tsx`：视图切换（对话/功能）、
  抽取模型下拉来自 `useModels`、掩码展示 + 「不改就保留」、embedding 变更告警、
  三态（loading / 403 / 空）。
- 先例：`test_models_config.py` / `test_models_config_api.py` / `models-settings-page.dom.test.tsx` / `models-capability-wizard.dom.test.tsx`。

## Out of Scope

- 探测/连通性测试端点（RAG 各角色没有统一的「列模型」接口；embedding/rerank 是 DashScope 专用 RPC）。
- graph/wiki 质量与调优旋钮、`worker_concurrency`、`extract_rate_limit_rps`、`video.enabled`（运营开关，留在 config.yaml）。
- per-KB 模型覆盖；多 embedding provider（需分别为每个 provider 写客户端，另立增量）。
- 已入库知识库的自动重建索引（本增量只做告警，不做迁移）。
- 把 RAG 模型也纳入对话模型列表（会让 embedding/rerank 出现在聊天模型选择器里，语义错误）。

## Further Notes

- **可行性依据（已实测）**：`rag ∉ STARTUP_ONLY_FIELDS`；`embedder.py:75` / `reranker.py:61` / `extractor.py:117`
  都在调用时 `get_app_config()` 现读 ⇒ 热重载路径成立。
- **硬约束**：embedding 维度 1024 与 collection/投影同源，换模型受维度限制；UI 必须把「换 embedding ⇒ 需重建索引」讲明。
- **信任边界**：`rag_config.json` 与 `models_config.json` 同级——admin 可写、文件 gitignored、读接口只回哨兵、
  support-bundle 脱敏；`config.yaml` 永不被 API 写。
