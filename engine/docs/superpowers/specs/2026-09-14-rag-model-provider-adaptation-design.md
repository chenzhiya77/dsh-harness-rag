# RAG 模型 provider 适配（嵌入 / 重排 / 解析）— 设计文档

**日期：** 2026-09-14
**状态：** **已实现**（2026-09-15）。四项裁定已落（§2）；**Task 0 五项探针已完成（§8，2026-09-14）⇒ 本地 provider 的接口可冻结**；plan 已写并**全部交付**（`plans/2026-09-14-rag-model-provider-adaptation.md`，P0–P4 六项 Task 勾满）。
实现期对**两处**做了与本文不同的选择，均已写进 plan 的对应 Task：① `parse_backend` 下发时补 `-http-client` 后缀（上游公开取值带后缀，短名会被 400 拒）；② `external` 稀疏来源的形状由 P3 定为 **TEI**（`POST /embed_sparse`），allowlist 的 id 随之从占位名改成 `tei-sparse`。
**上游背景：** 本 spec 是 `2026-09-10-rag-functional-model-config-design.md` 的**扩展**——那份解决了「RAG 功能模型可在设置页里选」，但选的是**模型名**，没有 **provider 维度**。裁定清单见 §2。

---

## 1. 目标与范围

让 RAG 的三条外部依赖可以接**本地**或**外部其他**模型/服务：

| 对象 | 今天 | 目标 |
| --- | --- | --- |
| 嵌入 | 只有阿里百炼（DashScope 原生接口） | 可接本地/外部；**稀疏仍走双路** |
| 重排 | 只有阿里百炼 | 可接本地/外部 |
| 文档解析 | 只有 MinerU 官方云 API | 云 + 本地（**轻客户端形态**，见 §2 D2） |

**范围**：配置 schema、provider 实现、设置页控件、索引兼容性。
**不在范围**：检索语义（见 §6）。

---

## 2. 已裁定（2026-09-14，均由用户裁定）

| # | 议题 | 裁定 | 后果 |
| --- | --- | --- | --- |
| — | 稀疏方案 | **A**：保住 dense + sparse 双路命名向量与 RRF，**集合 schema 与检索代码零改动** | 稀疏这一路必须有人出——同 provider 同出 / 另配稀疏 provider（`external`）/ 本地 BM25，三选一（§4.2） |
| **D1** | 解析的本地承载方式 | **A 本地 HTTP 服务**（MinerU 的 `mineru-api` / router） | 与现有客户端同构，改造 = 换端点 + 换协议形状；不自管子进程 |
| **D2** | 支持的部署形态 | **A 只支持轻客户端形态**：MinerU 作为 http-client 对接内网的 OpenAI 兼容服务 | **`pipeline` 出局**（见 §6）；保留 `vlm` / `hybrid`，**本机不需要 GPU** |
| **D3** | provider 集范围 | **A 两类**：`dashscope`（既有）+ 一个通用形状 | 接具体厂商不再需要写代码，只需要一个兼容端点 |
| **D4** | backend 选择（`pipeline` / `vlm` / `hybrid`） | **B 放设置页但可选、默认空** | 空 = 由本地服务决定；档位知识留在 MinerU 侧 |

**D2 的准确含义**（避免误读）：它约束的是**我们声明并测试支持哪一种部署形态**，不是代码里的开关——我们只是往一个 HTTP 地址发请求，对方用哪种模式起，拿回来的一样是 markdown。裁定为「轻客户端形态」意味着：**本机不承担模型推理**，推理由内网的 OpenAI 兼容服务承担。

**另一处不在档位里的东西**：`title_aided` 不是第四个后端，它是**叠加在任意 PDF 后端之上的可选后处理**（代码里 `SUPPORTED_PDF_BACKENDS = {"pipeline", "vlm", "hybrid"}`），默认关闭，需要一个 OpenAI 兼容 LLM。它不进我们的设置页（见 §6）。

---

## 3. 已核实的前提（2026-09-14 代码核查，带行号）

### 3.0 全部模型腿的支持面（现状总表）

**支持面由「调用方式」决定，不由「它是哪个功能」决定**——这是铺开 provider 工作前必须先对齐的一张表。**归属判据**：配置挂在 `rag:` 节下（代码在 `knowledge/`）即属 RAG，其余归平台或记忆系统。

| # | 腿 | 归属 | 配置项 | 调用方式 | 支持的 provider |
| --- | --- | --- | --- | --- | --- |
| 1 | 主聊天 / agent 模型 | 平台 | `models:` 列表 | LangChain | **任意**（UI 受 allowlist 限；`config.yaml` 手写条目不限） |
| 2 | 标题生成 | 平台 | `title.model_name` | LangChain | 同 #1 |
| 3 | 记忆更新 | 记忆 | `memory.model_name` | LangChain | 同 #1 |
| 4 | 记忆检索 | 记忆 | `memory.retrieval_adapter` | 本地 FTS5 | 不涉及 |
| 5 | 上下文摘要 | 平台 | `summarization` | LangChain | 同 #1 |
| 6 | 输入润色 / 追问建议 | 平台 | `input_polish` / `suggestions` | LangChain（`run_oneshot_llm`） | 同 #1 |
| 7 | 目标评估 | 平台 | 内部 | LangChain | 同 #1 |
| 8 | **图抽取** | **RAG** | `rag.extract_model` | LangChain（picker） | **任意** |
| 9 | **评测 judge** | **RAG** | `rag.judge_model` | LangChain（picker） | **任意** |
| 10 | **图片说明 VLM** | **RAG** | `rag.vlm_model` | 裸 HTTP `/chat/completions` | **仅 OpenAI 兼容** |
| 11 | **视频分镜说明** | **RAG** | `rag.video.caption_model`（回退 `vlm_model`） | 同 #10（同一个 `resolve_vlm_target`） | **仅 OpenAI 兼容** |
| 12 | **嵌入** | **RAG** | `rag.embedding_model` | 百炼原生形状 | **仅 DashScope** |
| 13 | **重排** | **RAG** | `rag.rerank_model` | 百炼原生形状 | **仅 DashScope** |
| 14 | **文档解析** | **RAG** | MinerU token | 专有 `/api/v4/…` | **仅 MinerU** |
| 15 | 视频 ASR | **RAG** | `rag.video.asr_provider` / `asr_model` | **纯本地库**（funasr / whisper，延迟 import） | 不涉及 provider |
| 16 | 关键帧 OCR | **RAG** | — | **纯本地**（PaddleOCR） | 不涉及 provider |

**三条结论：**

1. **走 LangChain 的那 9 条（#1–#9）天生可插拔**：跟着 `models:` 条目声明的 `use:` 类走。`PROVIDER_ALLOWLIST`（`config/models_config.py:45-49`）已含 `openai-compatible` / `anthropic` / `deepseek` ⇒ **本项目支持 Anthropic**，但只在这一类腿上。
2. **协议固定的有 #10–#14**：#10 / #11 = OpenAI 兼容（`captioner.py:46`、`video/captioner.py:61` 都是 `base_url + "/chat/completions"`）；#12 / #13 = 百炼原生；#14 专有。另有 #15 / #16 是**纯本地库**（不涉 provider）。
3. **陷阱（现状，无任何提示）**：同一个 `models:` 条目对不同腿的可用性不同。把 Anthropic 条目选作 `vlm_model` ⇒ 图抽取与 judge 正常，**图片说明会挂**（Anthropic 原生形状是 `/v1/messages`，没有 `/chat/completions`）。见 §7。

**本次范围**：RAG 共 9 条腿（#8–#16），**本次只动其中的 3 条**——#12 嵌入 / #13 重排 / #14 解析。其余：#8 / #9 已是任意 provider（不用改）；#10 / #11 限 OpenAI 兼容（**写清，不修**）；#15 / #16 不涉及 provider。**#1–#7 完全不在范围**——它们的可插拔性本来就成立。

**一处易混的边界**：#4「记忆检索」广义上也算检索增强，但它归记忆系统（`memory.retrieval_adapter`，本地 FTS5），与知识库那条线是两套东西——对应第一版 RFC 里「人类维护的语料 vs agent 学到的记忆，各自生命周期」的区分，**不算 RAG**。

### 3.1 嵌入只有百炼，且**稀疏是它的专有能力**

- `knowledge/embedder.py:37` 路径常量 `/api/v1/services/embeddings/text-embedding/text-embedding`
- `:108` 载荷 `parameters: {dimension, output_type: "dense&sparse", text_type}`
- `:44` 单次上限 20 行；`:17` 密钥固定 `DASHSCOPE_EMBEDDING_API_KEY`
- `:4-5` 文件头自己写明选型原因：**「bge-m3 的 OpenAI 兼容接口从不暴露 sparse 路径」** ← 稀疏问题的来源
- `:67` 维度参数化（默认 1024）

### 3.2 重排与百炼差异极小

- `knowledge/reranker.py:32` 路径 `/compatible-api/v1/reranks`
- `:83-89` 载荷 `{model, query, documents, top_n, instruct}`；`:36` 默认 instruct
- **与通用 rerank 形状的差异已核到一手来源**（vLLM 源码 + 两个 Apache-2.0 example，2026-09-14）：路径同时注册 **`/rerank`、`/v1/rerank`、`/v2/rerank`** 三个别名（`pooling/scoring/api_router.py`）；请求 `{model, query, documents}` + **可选 `top_n`（默认 0）**，**无 `instruct`**；响应 `RerankResponse{ results: [{index, relevance_score, document}], usage }`。⇒ 差异确实只在 `instruct` 与路径，**响应解析可原样复用**（我们读的正是 `index` / `relevance_score`）

### 3.3 解析：云端形状写死，但下游可复用

- `knowledge/parser.py:46` `MINERU_BASE_URL = "https://mineru.net"`（模块常量，无配置项/env 覆盖）
- 三个网络函数 + 三个配套调用：`:375` 申请预签名地址、`:389` PUT 上传、`:396` 轮询 batch，配套 `_read_token` / `_download_zip` / `_unpack_zip`（**共 6 个调用点**，见 §8.3）
- `:659` 默认 `model_version: str = "vlm"`（转给云 API）
- `:425` `_relocate_trailing_title` —— **我们自己的**标题后处理
- 其余 600+ 行是本地处理（`.md/.txt` 直读、CSV/TSV/XLSX→GFM、HTML 表→GFM）⇒ 换来源后**可原样复用**

### 3.4 向量侧：双路是结构性的

- `knowledge/vector_store.py:122` `dense_size: int = 1024`（建集合时锁定）
- `:180` `sparse_vectors_config={"sparse": SparseVectorParams()}`
- `:193` 写入 `vector={"dense": …, "sparse": …}`
- `:225-228` 两条 Prefetch（dense / sparse）+ `Fusion.RRF`

### 3.5 配置与设置页：没有 provider 维度

- `config/rag_config_file.py:44-48` `SECRET_ENV_VARS`；`:78-87` 字段表（`embedding_model` / `embedding_api_key` / `rerank_model` / `rerank_api_key` / `vlm_model` / `mineru_api_token`…）——**无 provider 字段**
- `components/workspace/settings/functional-models-view.tsx:134-172` 嵌入/重排 = **模型名（文本输入）+ Key**；`:184-260` 图抽取 / judge / 说明 VLM = 三个 picker；`:303` Qdrant URL；`:312` **MinerU 只有一个 token**

### 3.6 MinerU 官方：三档后端 × 两种承载

> 下表来自官方**本地部署**文档（`docs/zh/quick_start/index.md`），指标为 OmniDocBench v1.6。**云侧的 `model_version` 与它不是同一张表，不能直接对比。**

**表一：三档后端**（互斥，选一个）

| 后端 | 组成 | 官方精度 |
| --- | --- | --- |
| `pipeline` | 多模型流水线（**含独立 OCR**） | 86.47 |
| `vlm` | 单个 VLM | 95.30 |
| `hybrid` | pipeline + VLM 混合 | **95.39** |

**表二：两种承载**（后端决定跑什么，承载决定在哪跑）

| 承载 | 含义 | 本机要求 |
| --- | --- | --- |
| `-engine` | 本机推理引擎 | `pipeline` 可纯 CPU（GPU 加速 4GB 显存）；`vlm` / `hybrid` 需 ≥8GB 显存；磁盘 ≥20GB |
| `-http-client` | 推理在外部 OpenAI 兼容服务 | 纯 CPU 亦可；**磁盘仅 2GB**（无本地权重）；`vlm-http-client` 连 torch 都不要求 |

- **承载只对 `vlm` / `hybrid` 有分歧**：`pipeline` 没有 http-client 变体——这正是 **D2 把 `pipeline` 划出支持面**的原因（§6）
- `mineru/model/ocr/` 与 `AtomicModel.OCR` 存在 ⇒ **pipeline 也做 OCR**；这三档的差别是「谁在干」，不是「有没有这个能力」
- 官方原文：`vlm-http-client` 是轻量远程 client、**不要求本地 torch**；`hybrid-http-client` 需本地具备 `mineru[pipeline]` 与 torch
- 模型目录：`mineru.json` 的 `models-dir.{pipeline,vlm}`
- **可选后处理 `title_aided`**：`mineru/utils/title_level_postprocess.py` + `llm_aided.py` 用 LLM 判定 PDF 标题**层级**，走 OpenAI 兼容端点，**默认 `enable: false`**

---

## 4. 设计骨架

### 4.1 配置层：补 provider 维度（**一次做完，别分三次加字段**）

扁平新增，全部带默认值 ⇒ 现有 `config.yaml`（只写 `embedding_model`）**行为完全不变**：

| 字段 | 取值 | 默认 |
| --- | --- | --- |
| `rag.embedding_provider` | 受控 allowlist | `dashscope` |
| `rag.embedding_base_url` | 端点；空 = 用该 provider 的默认 | 空 |
| `rag.embedding_dimension` | 可选覆盖；**留空 = 运行时探测**（§4.2） | 空 |
| `rag.embedding_sparse_source` | `provider` / `external` / `bm25` | `provider` |
| `rag.sparse_provider` | 受控 allowlist；`external` 时用 | 空 |
| `rag.sparse_base_url` | 端点；`external` 时用 | 空 |
| `rag.sparse_model` | 模型名；`external` 时用 | 空 |
| `rag.sparse_api_key` | 密钥；`external` 时用（可落 `rag_config.json`，读接口脱敏） | 空 |
| `rag.rerank_provider` | 受控 allowlist | `dashscope` |
| `rag.rerank_base_url` | 端点 | 空 |
| `rag.parse_provider` | `mineru-cloud` / `mineru-local` | `mineru-cloud` |
| `rag.parse_base_url` | 本地服务地址 | 空 |
| `rag.parse_backend` | `vlm` / `hybrid` / 空 | 空 |

**provider allowlist 对照（P0 的实现依据）**：

| 腿 | provider id | 实现 | 路径 / 端点键 |
| --- | --- | --- | --- |
| 嵌入 | `dashscope` | 现有 `DashScopeEmbedder` | DashScope 原生路径；`DASHSCOPE_EMBEDDING_API_KEY` |
| 嵌入 | `openai-compatible` | 新增（**只出 dense**） | `/v1/embeddings`（通用约定，**未逐字核**）；端点键 `base_url` |
| 重排 | `dashscope` | 现有 `DashScopeReranker` | `/compatible-api/v1/reranks`；`DASHSCOPE_RERANK_API_KEY` |
| 重排 | `generic-rerank` | 新增 | `/rerank`（另注册 `/v1/rerank`、`/v2/rerank`）；**不发 `instruct`**（§3.2、§8.4 已核） |
| 解析 | `mineru-cloud` | 现有实现 | `https://mineru.net/api/v4/…`；`MINERU_API_TOKEN` |
| 解析 | `mineru-local` | 新增 | 本地服务地址（`parse_base_url`）；**无鉴权**；契约见 §8.1 |
| 稀疏 | `openai-compatible` | 新增（P3） | 路径**刻意留空**（`path=None`）——该服务的请求形状尚未定，P3 再钉；env 回退 `RAG_SPARSE_API_KEY` |

**两条硬约束**：

1. **provider 走受控映射**（照抄 Models 设置里的 `PROVIDER_ALLOWLIST`）：调用方交 provider id，服务端映射到实现类与端点键。**绝不开自由文本类路径**——那是代码执行入口。
2. **密钥 env 名按 provider 解析**：保留 `DASHSCOPE_EMBEDDING_API_KEY` 作为 `dashscope` 的既有名；新增通用名作回退。密钥仍可落 `rag_config.json`，读接口照旧脱敏。

**与 Models 机制的关系（易混，必须写明）**：这是**第二套 provider 机制**，与 Models 的 `models:` 条目 + `use:` 类**互不相通**——RAG 这三条腿不出现在 Models 的下拉里，也不继承它的 Anthropic 支持。原因是它们本来就不是 LangChain 腿（都是裸 HTTP），接口形状也对不上：LangChain 的 `Embeddings` 只有一个向量（装不下稀疏）、rerank 没有对应的一等接口、解析根本不是模型（见 §3.0）。

### 4.2 嵌入（含稀疏 A 的落地）

接口与今天一致 —— `embed(texts, text_type) -> list[EmbeddingResult(dense, sparse)]`（调用侧已是鸭子类型注入，**零改动**）。**dense 来源与 sparse 来源可以分离**，稀疏这一路由谁出有三种选法：

| `sparse_source` | 语义 | 要额外模型吗 |
| --- | --- | --- |
| `provider` | 同一次调用同出（今天的 qwen3.7-text-embedding 即此形态） | 不要 |
| `external` | **另配一个稀疏 provider**：走 `sparse_provider` / `sparse_base_url` / `sparse_model` / `sparse_api_key` | 要 |
| `bm25` | 本地 BM25 算法（纯统计） | 不要 |

三条路都必须产出 Qdrant `SparseVector(indices, values)` ⇒ **集合 schema 与检索代码零改动**（A 的红利）。

- **两侧必须成对一致**：文档索引用哪对来源，查询就用同一对。绝不能文档用 A 的稀疏、查询用 B 的——那样打分不可比。
- **RRF 恰好绕开了尺度问题**：融合按**排名**而非分值（`vector_store.py:228` 的 `Fusion.RRF`）⇒ dense 与 sparse 来自两个完全不同的模型，融合本身没有问题。
- **稀疏的 index 空间必须统一**：不同实现的 indices 是不同词表（百炼返回还带 `token` 字符串，我们只取 index/value）。跨来源迁移 ⇒ **必须重建索引**，新旧不能混用。
- `provider` 最省（自托管侧需要一个能同时给出两者的服务）。**三家已核**（2026-09-14，均为项目自身文档）：
  - **FlagEmbedding**（bge-m3 官方库）✅ —— README 表把 bge-m3 记为「dense retrieval, **sparse retrieval**, multi-vector」
  - **TEI** ✅ 但**走独立端点** —— README 有 `/embed_sparse`，dense 与 sparse 是**两次调用**
  - **Infinity** ❌ —— 它的 README 明确标 **「BAAI/bge-m3, no sparse」**
- **「同出」是接口语义，不是「一次 HTTP」**：TEI 就是两个端点——provider 内部打两次、对外仍返回一个 `EmbeddingResult(dense, sparse)`，接口不变
- `external` 接一个专门的稀疏模型；`bm25` 零模型、确定性最好，但语义最弱
- **口径必须一致**：query 侧与 document 侧用同一套稀疏算法与分词；中文分词按仓库既有教训处理（`memory` 的 FTS5 就踩过 jieba/unicode 的坑）。
- **维度**：`dense_dim != 1024` ⇒ **拒绝启用**并给出重建指引（fail loud，不静默）。**完整设计见下。**
- **交叉校验（必须）**：`sparse_source=provider` 只在 provider **能同出双路**时成立。通用嵌入 provider（OpenAI 兼容 `/v1/embeddings`）**只出 dense** ⇒ 选它时 `sparse_source` 必须改成 `external` 或 `bm25`，否则**拒绝启用**。不写这条，用户会在检索时才发现只剩一路。

#### 维度（本次定稿）

| # | 决定 | 内容 |
| --- | --- | --- |
| **1** | **维度从哪来** | **运行时探测为主**：启用时先发一次极小的嵌入请求，读回向量长度；`rag.embedding_dimension` 作为**可选覆盖**（留空即用探测值）。选探测是因为它顺带完成一次连通性验证；留显式字段是因为某些自建服务的探测行为不稳定 |
| **2** | **非 1024 一律拒绝**（首期） | Qdrant 集合在建集合时锁定 1024（`vector_store.py:122`）。`dense_dim != 1024` ⇒ **拒绝启用**，**不自动建新集合**。理由：本期已经把 provider 维度铺得足够宽，再叠「维度可变」会让索引语义复杂化；而 bge-m3 这类模型支持指定 1024，多数场景凑得上 |
| **3** | **集合与维度的关系** | **不单列**——第 2 项定了「维度恒为 1024」，集合命名与元数据都不带维度 |
| **4** | **被拒之后用户走哪条路** | 走 **P3 新增的「重建入口」**（§8.5）：换成 1024 维的模型后触发全量重嵌入。**该入口必须支持「不重解析、只重嵌入」**，否则这条路是死胡同 |

- **稀疏没有维度概念**：Qdrant sparse vectors 是变长的 `indices` / `values`，所以维度只约束 **dense 一侧**——`sparse_source` 的三条路都不受影响
- **二期再议**：若要支持非 1024 维，需要额外决定（a）集合命名带维度还是每 KB 记维度、（b）换维度时自动建集合与迁移；本期明确不做

### 4.3 重排

接口已一致：`rerank(query, documents, top_n) -> [(index, score)]`。provider 只影响**请求构造**：

| provider | 路径 | `instruct` | 备注 |
| --- | --- | --- | --- |
| `dashscope` | `/compatible-api/v1/reranks` | 发 | 已核（`reranker.py:32`、`:83-89`） |
| `generic-rerank` | `/rerank`（另注册 `/v1/rerank`、`/v2/rerank`） | 不发 | 已核（vLLM 源码）：请求 `{model, query, documents}` + 可选 `top_n`；响应 `results[{index, relevance_score, document}]` —— **解析逻辑可原样复用** |

保留现有 `RerankerError` → RRF 降级，换 provider 不会硬失败。

### 4.4 解析

把「云客户端」抽成 `ParseProvider.parse(path) -> ParsedDocument`（markdown + images）：

- **云 provider** = 现有实现，不动
- **本地 provider** = 调本地 MinerU 服务（**D1-A：HTTP**），产出**同为 markdown + images** ⇒ 下游（GFM 归一化、图片落盘、`_relocate_trailing_title`）**零改动**
- **只支持轻客户端形态**（**D2-A**）：MinerU 以 http-client 对接内网的 OpenAI 兼容服务——本机不承担模型推理，`pipeline` 不在支持面（§6）
- 后端由**本地服务自己**决定（**D4-B**：`parse_backend` 默认为空）——我们不把 MinerU 的档位知识搬进 UI
- **本地 provider 必须复用那两步归一化**：`_normalize_tables_to_gfm` + `_relocate_trailing_title` —— 源码注释明确它们**只作用于 MinerU 分支**（本地直读分支不受影响）。本地 MinerU 产出的同样是 MinerU 风格 markdown，HTML 表与「标题甩到文末」的问题一样存在，所以这两步**不能因为换了来源就跳过**（Task 0 §8.3）
- **不管理 MinerU 的模型**：权重下载、`models-dir`、`mineru.json` 全归 MinerU 侧。我们只填地址——否则等于把对方的模型管理 UI 抄一遍
- **两个 VLM 不要合并**：`rag.vlm_model`（**图片说明 VLM**，给抽出的图片生成说明）与 MinerU 的 vlm 后端是两件事
- `title_aided` 不在我们的设置页暴露（它是 MinerU 的后处理，不是我们的模型角色）；要在气隙环境开它，就得另有一个本地 LLM 服务

### 4.5 设置页

| 行 | 变化 |
| --- | --- |
| 嵌入 | 保留模型名输入；**+ provider 下拉 + 端点输入 + 稀疏来源下拉** |
| 重排 | 保留模型名输入；**+ provider 下拉 + 端点输入** |
| 解析 | **+ 云/本地 开关 + 本地服务地址**（+ 可选后端） |
| **重建索引** | **+ 一个入口**（换 provider / 换维度后触发，见 §5 与 §9 P4）——**没有它，「拒绝启用」就是死胡同** |
| 图抽取 / 评测 judge | 不动（picker 天然带端点与密钥，**任意 provider**） |
| 说明 VLM（图片 / 分镜） | 不动，但**限 OpenAI 兼容**（§3.0 #10 / #11）——设置页应据此给提示 |

文案从 provider 映射派生（哪些字段该出现）。

**两处实现时的补充（2026-09-14）**：

1. **稀疏来源进 UI**（裁定「甲」）：原表只列 provider + 端点，但 `embedding_sparse_source` 正是决定「换成只出稠密的 provider 之后配置是否成立」的字段——不暴露它，用户会在启用或检索时才发现问题。故设置页加这一下拉，并带一句说明。
2. **端点输入按需出现**：只在该 provider **没有内置默认**时显示（`openai-compatible` / `generic-rerank` / `mineru-local` 显示；`dashscope`、`mineru-cloud` 不显示）。`dashscope` 的地址由客户端固定，展示一个假的默认值只会误导。

**修订 2026-09-15（视觉，用户裁定）**：第 2 条**反转**——所有 provider 相关字段**一律渲染**，被当前 provider 固定的那些**显示为禁用 + 锁 + 一句原因**（如「由提供方固定」），不再隐藏。理由：切 provider 时控件消失会被读成「功能缺失」，且最高的那一格会把检索组的两列挤得高低不齐。同批改动：检索组改为「向量 / 重排」两个显式列，各四行（提供方 / 模型 / API Key / 接口地址）；稀疏设置收进默认收起的「高级设置」折叠块（源 + 提供方 + 地址 + 模型 + 密钥，非 `external` 时整组锁住）；**说明性文案一律进 ⓘ 悬浮提示**，只有状态（换模型的失效告警、密钥来源徽章、「没有需要保存的改动」）保持可见。`frontend/AGENTS.md` 已同步。

---

## 5. 兼容与迁移

1. **换嵌入 ⇒ 已有向量全部失效**，且**稠密维度**可能不是 1024、**稀疏的 index 空间**也会随之改变 ⇒ 必须提供**重建索引**的路径与显式提示。现有 UI 只提示了「换模型」，判据要扩到 provider / base_url / 稀疏来源变化。**「重建入口」已确认不存在，本次要新增**（Task 0 §8.5）：仓库只有 `index_chunks` 这个零件（`indexer.py:43`），**没有**全量/按库重建的命令或 API。⚠️ `POST /{kb_id}/documents/{doc_id}/retry` 会重跑整条管线（含**重解析**），**不能**用于换 provider 的场景——需要的是「读现有 chunk 文本 → 重嵌入」，**不重解析**。
2. **集合 schema 不变**（A 的直接结果）——不需要迁移，只需要重建。
3. 默认值保证老配置零变化（§4.1）。

---

## 6. 非目标

- 不改检索语义：双路 RRF 保持
- **不做非 1024 维的嵌入**（§4.2 维度第 2 项）：非 1024 维一律拒绝启用，不自动建新集合；支持可变维度要连带动集合命名与迁移，留二期
- **不支持 `pipeline` 后端，也不支持「本机跑模型」**（D2-A 的直接结果）：`-http-client` 族只有 `vlm` / `hybrid`，pipeline 无此变体；`*-engine` 那种本机推理形态同样不在支持面内
- **`title_aided` 不进我们的设置页**：它是 MinerU 的后处理，归 MinerU 的 `mineru.json`；气隙环境若要开它，需另有一个本地 LLM 服务
- 不在 DeerFlow 里重建 MinerU 的模型管理（权重 / `mineru.json` / 档位启动）
- 不做多 provider 并行或自动回退链
- 不把 Models 设置那套 `POST /api/models/config/validate` 探活扩到 RAG（除非另开）

---

## 7. 风险与开放项

| 风险 | 说明 |
| --- | --- |
| 稀疏口径漂移 | 换 sparse 算法会改变召回分布 ⇒ 需要用评测集回归（仓库已有 Layer-1 门禁） |
| SPLADE 引入新模型依赖 | 与「离线」目标相互拉扯；BM25 是零模型选项 |
| 维度静默失败 | 非 1024 维若不拦，检索会退化 ⇒ 必须 fail loud |
| 本地服务不可用时的行为 | 应与云端一致：文档落到 `failed`，不影响库内其他文档 |
| 中文分词 | 按 `memory` 检索侧的既有教训处理 |
| **条目对腿的可用性不一致** | 同一个 `models:` 条目对 #8 / #9（图抽取 / judge）可用，却可能不适用于 #10 / #11（说明 VLM）——Anthropic 条目即如此。选择时**无任何提示**，会踩坑（§3.0 结论 3） |
| **重建入口若不同期交付** | 换 provider / 换维度会变成「配置改得了、索引更新不了」⇒ 用户改了却无路可走。**P4 必须先于或伴随 P3**（§9） |

---

## 8. Task 0 结论（2026-09-14 完成）

五项探针全部执行完毕。**本地 provider 的接口据此可以冻结**，plan 可以开工。

### 8.1 MinerU 本地服务的 HTTP 契约

`mineru/cli/fast_api.py`（1474 行）：

| 路由 | 语义 |
| --- | --- |
| `POST /file_parse` | 同步：提交 → 等终态 → **同一响应**返回结果 |
| `POST /tasks` | 异步：202 + task id |
| `GET /tasks/{task_id}` | 状态 |
| `GET /tasks/{task_id}/result` | 结果 |
| `GET /health` | 健康检查 |

- **请求是 multipart form**：`files: list[UploadFile]` + 一组 `Form` 字段，定义在 `mineru/cli/api_request.py::ParseRequestOptions`：`lang_list` / `backend` / `effort` / `parse_method` / `formula_enable` / `table_enable` / `image_analysis` / `server_url` / `return_md` / `return_middle_json` / `return_model_output` / `return_content_list` / `return_images` / **`response_format_zip`** / `return_original_file` / `client_side_output_generation` / `start_page_id` / `end_page_id`
- **产出形状可控**：`return_md` + `return_images`（JSON，图片走 base64，见 `encode_image`）或 `response_format_zip`（zip）⇒ 我们可以选与云端近似的那一种，**下游解包与归一化的改动最小**
- 与云 API 的形状差异：云 = 「申请预签名 → PUT 到 OSS → 轮询 batch」；本地 = 「multipart 直传 → 轮询 task / 或同步等」⇒ **必须新写客户端**（预期之内）

### 8.2 鉴权

**默认无鉴权**：全文只有 `Depends(parse_request_form)`，没有 Authorization / api_key / token 校验；只有一个 `warn_if_public_http_client_policy` **告警**（别裸露公网）。
⇒ **配置不需要 `parse_api_key`**，但文档要写明「该服务无鉴权，只应内网暴露」。

### 8.3 云客户端的真实调用边界

`knowledge/parser.py::parse_document`（655–706）：

- **本地分支先短路，完全不碰网络**：`.csv` / `.tsv` → `_parse_delimited`；`.xlsx` / `.xls` → `_parse_excel`；`.md` / `.markdown` / `.txt` → `_read_local_text`
- **云端分支** = `_read_token` + `_apply_upload_url` + `_upload_file` + `_poll_result` + `_download_zip` + `_unpack_zip`
- 之后统一走 `_normalize_tables_to_gfm(_relocate_trailing_title(markdown))`
- ⇒ **seam 干净**：只换云端那 6 个调用；**那两步归一化必须保留**（已补进 §4.4）——本地 MinerU 产出的同样是 MinerU 风格 markdown

### 8.4 通用 rerank 形状（一手：vLLM 源码 + 两个 Apache-2.0 example）

- `examples/pooling/score/rerank_api_online.py`：docstring 自述「the OpenAI entrypoint's rerank API which is **compatible with Jina and Cohere**」，示例用 `POST /rerank`，请求 `{model, query, documents}`
- `vllm/entrypoints/pooling/scoring/api_router.py`：**同一处理函数注册在 `/rerank`、`/v1/rerank`、`/v2/rerank` 三个别名上** ⇒ 用哪个路径都行
- `vllm/entrypoints/pooling/scoring/protocol.py`：`RerankRequest` 有 `documents` + **可选 `top_n`（默认 0）**、**无 `instruct`**；`RerankResponse{ results: list[RerankResult], usage }`，`RerankResult{ index, document, relevance_score }`
- `examples/pooling/score/cohere_rerank_client.py`：同一端点用 **Cohere SDK** 直连成功 ⇒ 端点是 Cohere 兼容的
- ⇒ **结论**：通用 provider = 去掉 `instruct` + 换路径，**响应解析与现有 DashScope 分支完全一致**（我们读的正是 `index` / `relevance_score`），改动比原先估的还小
- ⚠️ 修正：`top_n` **是有的**（可选，默认 0）——先前据 example 写成「无 `top_n`」是错的

### 8.5 索引重建入口

**有零件，没编排：**

- **零件**：`index_chunks(store, vector_store, embedder, kb_id, doc_id, chunks)`（`knowledge/indexer.py:43`），现被两处调用——初次索引（`worker.py:321`）与「变更切片重嵌入」（`worker.py:754`）
- **没有**全量/按库重建的命令或 API（gateway service / routers 里只有 wiki 重建与「单文档 retry」）
- ⚠️ `POST /{kb_id}/documents/{doc_id}/retry` 会**重跑整条管线（含重解析）**，**不能**用于换 provider 的场景——换 provider 需要的是「读现有 chunk 文本 → 重嵌入」，**不重解析**
- ⇒ 本次要**新增**一个编排入口（遍历库内文档 → 分页读 chunk → `index_chunks`）

### 8.6 仍未闭合

- **本地 MinerU 的并发配合策略**（查证已完成，**决策留 plan**）：服务端 semaphore 默认 **3**（macOS 硬编码 **1**），任务保留 24h、清理间隔 5min；我们的 `rag.worker_concurrency` 默认 **2** ⇒ **默认不撞闸**。谁高谁低、撞闸时是排队还是超时，在 plan 里写死。
- 其余两项已闭合：通用 rerank 形状（§8.4）、**向量维度设计**（§4.2 的「维度（本次定稿）」块）。

---

## 9. 依赖排序与规模

| 期 | 内容 | 量级 |
| --- | --- | --- |
| **P0** | 配置层 provider 维度 + 设置页控件 + 受控映射 | 中（三处共用，一次做完） |
| **P1** | 重排（`generic-rerank`） | **小**（一个 provider 类 + 2 字段；响应解析可原样复用） |
| **P2** | 解析本地接入 | **中**（替换云端 **6 个调用**；下游 600+ 行复用） |
| **P3** | 嵌入 provider + 稀疏补齐（`provider` / `external` / `bm25`） | **中偏大** |
| **P4** ⭐ | **重建入口**：遍历文档 → 读现有 chunk → 重嵌入（**不重解析**）——换 provider / 换维度的**唯一出口** | 中 |

顺序理由：P1 最小且有降级兜底，可先合；P2 不碰向量，与 P1 并行也安全；**P4 不依赖 P3**——用现有 embedder 就能跑，还自带一个自检（同一 provider 重建后，检索结果应与重建前一致）；P3 要动索引语义、放最后，但**它必须靠 P4 才能落地**（没有重建入口，换 provider 就是死路）。

每期都要带：索引/维度兼容性提示、测试（现有用例大量用 fake embedder / reranker，新增实现必须覆盖真实载荷）、以及按仓库规矩同步 `README.md` 与 `AGENTS.md`。
