# 检索面三处收口:重建覆盖、召回标签、TEI 重排形状 —— 设计

**Status:** ✅ **已交付（2026-09-25）**；**三项已裁（2026-09-24）：D1 甲 / D2 乙 / D3 甲**；**开工前审查已过（2026-09-25，逐条对着现状核完）**。交付轨迹 = plan Task 0–7：首笔 `ea7f6ffc`（spec+plan 成对）→ 五笔 Task → 验收途中修掉一条真缺陷（`3f248276`：通用客户端批上限 20→10）→ 验收记录 `5b94dcb9` → Task 7 文档同步收官。本 spec 只收 [2026-09-14 provider 适配 plan](../plans/2026-09-14-rag-model-provider-adaptation.md)「运行期遗留」里的**三条**（该段 :208-216，三条分别在 :212 / :213 / :214）；其余遗留由 operator 逐步完善，不在此列。配套 plan：[2026-09-24-rag-retrieval-followups.md](../plans/2026-09-24-rag-retrieval-followups.md)（Task 0–7；**均已提交**，轨迹见上）。

**Parent:**

- [2026-09-14-rag-model-provider-adaptation-design.md](2026-09-14-rag-model-provider-adaptation-design.md)（provider 维度 + §5 重建入口；本 spec 三项都是该线跑完后的运行期遗留）
- [2026-08-27-rag-eval-tab-phase2-design.md](2026-08-27-rag-eval-tab-phase2-design.md)（召回测试 P1，`score_type` 的出处）

## 1. 问题

### 1.0 一眼看懂

| #   | 现状                                                                                                                        | 本 spec 后                                                    | 来源            |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------- |
| ①   | 重建入口只重嵌**切片**；换 provider 后 entity/wiki 向量留在旧空间（真栈实测：图谱证据 6→0、百科最高分 ~0.29→0.04）          | 重建入口补三遍：实体 / 百科条目 / 人工卡片                    | 遗留第 3 条     |
| ②   | 召回面板的分数来源标签**写死**（"qwen3-rerank relevance"）；实测跑 Jina、标签仍写 qwen3-rerank                              | 标签随当前配置派生（模型名 + 图谱路实际用的尺子）             | 遗留第 4 条     |
| ③   | 重排下拉写「Cohere / Jina / **TEI 形状**」，而客户端只会说 Jina/Cohere 那套；TEI 的 `/rerank` 请求体与响应都是另一套         | 客户端加 TEI 分支（独立 provider 一格 + 新实现模块）          | 遗留第 5 条     |

```
改什么（3 块）                                    不改什么
────────────                                      ─────────────
① reindex.py 三遍 + 共享文本助手（1 个新模块）     三条检索链、四集合 schema、1024 维
② 标签按配置派生 + 图谱 impl 回报尺子              Qdrant 集合名 / 点 id 规则
③ reranker_tei.py（1 个新模块）+ allowlist 一行    embedder / parse 两条腿
   + Literal×2 + 前端选项/标签/i18n×3              embed 提供方探测、保存期探测
```

### 1.1 ① 重建入口只覆盖切片

- `reindex.py:96` 的自我描述逐字 "Re-embed every live chunk"；`_reindex_document`（:134-164）只走 `index_chunks`。
- 向量库有**四个**集合（vector_store.py:132-150）：`kb_chunks` / `kb_entities` / `kb_wiki_entries` / `kb_manual_cards` —— 换嵌入 provider / 维度后，后三个留在旧空间。
- 真栈后果（2026-09-23 登记）：同一查询图谱腿证据 6→0、百科腿最高分 ~0.29→0.04。
- 三条**写入侧**的嵌入文本（重建必须复用同一段文本，否则"重嵌"等于换语义）：

| 集合       | 写入口径                                                            | 嵌入文本                                        |
| ---------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| 实体       | graph/indexer.py:187（增量）、graph/resolver.py:116（合并重嵌）     | `{name}\n{description or ''}`（两处写法略不同） |
| 百科条目   | wiki/generator.py:294-296                                           | `{title}\n{content[:500]}`（`EMBED_CONTENT_CHARS=500`，:62） |
| 人工卡片   | knowledge_service.py:931 / :1021（仅 `include_in_wiki_search=True` 的卡片有点，models.py:142-144） | `{title}\n{content}`（`_manual_card_embed_text`，:905-907） |

### 1.2 ② 召回标签写死

- `knowledge_service.py:1063-1067`：`_RECALL_SCORE_TYPES = {"vector": "qwen3-rerank relevance", "graph": "embedding cosine", "wiki": "embedding cosine"}`，在 :1216 原样返回；界面把它当徽标打在路名旁（recall-test-panel.tsx:567）。
- 实测漂移（2026-09-23）：重排换成 `generic-rerank` + Jina 后，面板仍写 `qwen3-rerank relevance`。
- 三条路的分数来源其实各不相同，**图谱路还随运行时变**：
  - **vector**：恒过 `build_reranker()`（hybrid_search_tool.py:71）；重排降级时分数为 null（:74-76）。实际模型 = `rag.rerank_model`（reranker_factory.py:45）。
  - **graph**：`graph_rerank` 开 **且候选池 > `graph_rerank_threshold`** 才用重排分（graph_search_tool.py:146）；重排抛错回到余弦（:150-159）；默认关闭（app_config.py:232-233，阈值默认 12）。
  - **wiki**：Qdrant 稠密余弦（wiki_search_tool.py:77/91），与 provider 无关。

### 1.3 ③ 下拉承诺 TEI 形状，客户端不会说

- 文案：`core/i18n/locales/zh-CN.ts:1705` `providerGenericRerank: "通用重排 (Cohere / Jina / TEI 形状)"`（en-US.ts:1799 同义）。
- 客户端（`reranker_generic.py`）：请求 `{model, query, documents, top_n}` 打到 `/rerank`（:40、:84-89），响应读 `results[].relevance_score`（:91-93）—— 这是 vLLM / Jina / Cohere 的形状（spec 2026-09-14 §8.4 已核）。
- **TEI 是另一套形状**（2026-09-24 对 TEI 一手源码核过，clone @ `98b7ea2d`，见 §7）：
  - 路由只有 `/rerank` 一条（`router/src/http/server.rs:1766`，处理函数与状态码表在 :280-305）；vendor 兼容别名只有 OpenAI 嵌入（`/embeddings`、`/v1/embeddings`）与 Vertex —— **没有 `/v1/rerank`**。
  - 请求 `RerankRequest{query, texts[], truncate?, truncation_direction?, raw_scores, return_text}`（types.rs:243-261）—— **没有 `model`、没有 `documents`、没有 `top_n`、没有 `instruct`**。
  - 响应是**裸数组** `Vec<Rank>`，`Rank{index, text?, score}`（types.rs:263-274）；官方 curl 例在 quick_tour.md:129-132。
- ⇒ 今天的失败形态：① 我们的 `documents` 体缺 TEI 必填的 `texts` → 422（axum 的 Json 拒绝）→ 客户端抛 `RerankerError` → 向量路降级到 RRF；② 退一步、就算响应到了解析层，`_decode_body` 对数组返回 `{}`（:133-138）⇒ `results` 空 ⇒ **静默空榜**。形状不对是确定的，响不响看走哪条。

## 2. 目标 / 非目标

目标：上面三条各自收口，范围只到"检索面这三处"。

非目标（明确不做）：

- **`DASHSCOPE_JUDGE_API_KEY` 失效**（operator 列表第 5 条）：等 [2026-09-23-default-model-design.md](2026-09-23-default-model-design.md) 那对落地后自然消失，本 spec 不写任何工作。
- **caption 腿 401**（operator 列表第 4 条）：operator 2026-09-24 说明**已在其他 spec 里规划**，本 spec 不写任何工作。
- **孤儿点清扫**（业务行已删、Qdrant 点仍在）：重建只 upsert、不删点（不变式，见 §4.1）；清扫是另一件事。
- 非 1024 维支持 / 集合带维度命名：仍留二期（该 plan 遗留末条）。
- sparse external / bm25 的质量评测等其余遗留：由 operator 逐步完善。

### 2.1 其余遗留的处置（operator 2026-09-24，登记，均不在本 spec）

| #   | 事项                                             | operator 处置（2026-09-24）                                                                                     | 落点                                                                 |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 8   | 后端不校验 `vlm_model`（保存期不拦）             | **已在其他 spec 有落点**                                                                                        | 不指名；本 spec 零工作                                                |
| 9   | 「看详情」展开的是后端英文原文                   | 定性为**知情选择**（展开内容 = 后端原文、英文、开发者档），在那条线的文档「开着/已知」里**补一行登记**（已补） | `2026-09-12-harness-run-status-failure-design.md` §8 第 7 条          |
| 10a | `perf:check` 六条路由全红（阈值过期）            | **不算问题、不管**（与本功能无关）                                                                              | 判据不变：表自 #4622 未更新、且不在 CI                                |
| 10b | `test_graph_search.py` 格式漂移                  | **已修并提交**（`c1be43a0` 纯重排；2026-09-25 复核：工作树干净、`ruff format --check` 该文件通过）             | 已收口；本对 Task 3 仍会改该文件（加尺子用例），格式基线已净           |

## 3. 决策

### D1 重建入口的覆盖范围 —— 卡片补不补

**✅ 已裁（2026-09-24）：甲（四集合全补，含 `kb_manual_cards`）。**

| 选项 | 含义 | 代价 |
| ---- | ---- | ---- |
| **甲（推荐）** | **四集合全补**：切片 + 实体 + 百科条目 + 人工卡片 | 多一遍 + 一个文本助手搬家（3 个写入侧调用点改 import） |
| 乙 | 只补点名过的两集合（实体 + 百科条目），卡片留残 | 换 provider 后 wiki 路 top_k 池里"一半新空间一半旧空间" |

判据：换 provider 后，wiki 路里**卡片命中**是否也该恢复。甲答"是"（卡片与条目共用一个池，Phase-3 P6）；乙答"不管"。

### D2 召回标签的精确度

**✅ 已裁（2026-09-24）：乙（impl 回报实际用的尺子）。** 口径确认（operator 问「是谁跑就渲染谁吗」）：**是** —— 见 §4.2 的「徽标语义口径」一条。

| 选项 | 含义 | 代价 |
| ---- | ---- | ---- |
| 甲 | 只按配置派生（读 `rag.rerank_model` / `rag.graph_rerank`） | `graph_rerank` 开且候选池 ≤ 阈值时，图的分数仍是余弦而标签写重排模型名 —— **同一类失真只是更窄** |
| **乙（推荐）** | 配置派生 + **图谱 impl 回报它这一跑实际用的尺子** | graph 工具返回值多一个键（`score_source`） |

判据：标签是"这些数字是什么"的说明；同一段代码里已知的失真不该留。乙的载荷代价有先例 —— 该返回值本来就带 `trace`（graph_search_tool.py:320-334），模型可见载荷里早有元数据。其余两路的尺子恒定（vector 恒重排、wiki 恒余弦），不由 impl 回报。

### D3 TEI 形状的落法

**✅ 已裁（2026-09-24）：甲（allowlist 新增独立一格 `tei-rerank`）。**

| 选项 | 含义 | 代价 |
| ---- | ---- | ---- |
| **甲（推荐）** | allowlist **新增独立一格** `tei-rerank`（+ 新实现模块 `reranker_tei.py`），界面下拉多一项；`generic-rerank` 标签收窄为 "Cohere / Jina 形状" | 一个新模块 + 一行 allowlist + 两处 Literal + 前端三处 |
| 乙 | 通用客户端内**自动分流**（先发 Cohere 体，422 再发 TEI 体，按实例缓存胜者） | 零新增控件；每个进程第一次调用多一次失败往返；422 语义被两种含义共用（真 tokenization 错误也会触发重试）；错误噪音 |
| 丙 | 不实现，只把标签收窄 | operator 已否（要的是客户端会说 TEI） |

判据：仓库既有形态是"一个 provider 一格、形状逐字核"（`providers/__init__.py:54-55` 注释）。TEI 的形状差异在**请求体**上 —— 乙必须在 422 上做文本嗅探才靠得住，甲不需要。

## 4. 设计

### 4.1 重建入口补齐三条集合

**跑法**（`reindex_kb`）：现有文档循环不动，之后按 **切片 → 实体 → 百科条目 → 人工卡片** 再跑三遍。

| 遍   | 业务来源                                                       | 嵌入文本（与写入侧同源）               | 落点                            |
| ---- | -------------------------------------------------------------- | -------------------------------------- | ------------------------------- |
| 实体 | `graph_store.list_entities(kb_id)`（graph/store.py:107-111）   | `entity_embed_text(name, description)` | `vector_store.upsert_entities`（:234） |
| 百科 | `wiki_store.list_entries(kb_id)`（wiki/store.py:91-98；**全状态**——向量与 dirty 记号无关） | `wiki_entry_embed_text(title, content)` | `upsert_wiki_entries`（:274）   |
| 卡片 | `store.list_manual_cards(kb_id, include_in_wiki_search=True)` **分页**（store.py:449-470） | `manual_card_embed_text(title, content)` | `upsert_manual_cards`（:463）   |

- **共享文本助手**（新模块 `deerflow/knowledge/embed_texts.py`，三个一等函数）：写入侧的**四个调用点**（实体 2：graph/indexer.py:187、graph/resolver.py:116；百科 1：wiki/generator.py:295；卡片 1：knowledge_service.py:905-907）与重建侧**共用同一个函数** —— 把"重嵌用的是同一段文本"从"抄一行字符串"变成结构保证；顺带消掉实体那两处 `or ''` 的分叉。
- **分批**：每遍把行按 `page_size`（沿用 500）**切批** embed + upsert；**单批失败记日志继续**（与 `index_chunks` 的单批失败政策一致，indexer.py:69-76）。⚠️ **游标分页只有卡片遍有**（`store.list_manual_cards(kb_id, *, offset, limit, include_in_wiki_search)`，store.py:449-470 + `count_manual_cards` :472）；`graph_store.list_entities`（graph/store.py:107-111）与 `wiki_store.list_entries`（wiki/store.py:91-98）**整体返回、无分页参数** ⇒ 实体/百科两遍是"切批 embed"，不是"翻页"。另：原始实体行的 `description` 可为 `None`（models.py:101 可空）——构造 upsert 时照写入侧 `or ""` 归一（共享助手内部已含该归一）。
- **不变式**：只 upsert，**不删点、不改业务行**（条目状态 / 补充层 / 卡片开关都不碰）。点 id 本就确定性（实体按 (kb, name) :158-160、条目按 entry_id :162-165、卡片按 card_id :167-170）⇒ 重复跑幂等、原位覆盖。
- **报告与进度**：`ReindexReport`（reindex.py:50-58）与 `_PROGRESS`（:100）各加 `entities_indexed` / `wiki_entries_indexed` / `cards_indexed`（run 开始即置 0）；`KnowledgeService.reindex_status`（:1717-1719）与路由原样透传。
- **签名**：`reindex_kb(store, vector_store, embedder, *, kb_id, graph_store, wiki_store, page_size)`；唯一生产调用点 `knowledge_service.py:1726-1733` 补两个 store。
- **前端运行行**：`documents_done/total · 已写入向量 {四键之和}`（functional-models-view.tsx:1099-1101；`ReindexProgress` 类型 types.ts:143-147 加三键）。i18n 键 `reindexChunksWritten` 不动 —— 文案本身就是"已写入向量 / vectors written"。文档循环跑完后运行行**继续显示**（`documents_done == documents_total`，向量计数仍在上长）—— 三遍没有单独的"当前遍"字样，诚实即可。

### 4.2 召回标签随配置

`_RECALL_SCORE_TYPES` 常量删除，换成按请求构造：

| path   | 标签                                                          | 来源                              |
| ------ | ------------------------------------------------------------- | --------------------------------- |
| vector | `{rag.rerank_model} relevance`（模型串为空 → `rerank relevance`） | 配置                              |
| graph  | impl 回报 `"rerank"` → 同上；`"cosine"` / 缺键 → `embedding cosine` | 运行时 + 配置兜底                 |
| wiki   | `embedding cosine`                                            | 恒                                |

- **徽标语义口径（2026-09-24 确认：谁跑，就渲染谁）**：徽标渲染的是**这一跑实际参与打分的那个东西** —— vector 恒为配置的重排模型（该路每次必过重排；重排降级时分数为 null、徽标不变）；graph 按本次是否真跑了重排二选一；wiki 恒余弦。**线上不带 model 的 provider**（D3 甲的 `tei-rerank`）渲染配置里的模型名 —— 那格正是"这个实例服务哪个模型"（同 sparse 的既有口径）。徽标由**服务端每次请求现算**（不是保存配置时写死），前端只显示字符串。
- impl 侧（D2 乙）：`_score_candidates` 返回值带上尺子（graph_search_tool.py:125-159），`_graph_search_impl` 返回值加 `"score_source"`（:320-334）。降级（:150-151）与小池（:146 条件不成立）自动落 `"cosine"`。
- **缺键兜底**：老 stub / 未升级调用方没给 `score_source` 时按配置派生（`graph_rerank` 开 → 模型名，关 → cosine）—— 既有 mock 不炸（test_recall_test_api.py 的 `_mock_impls`）。
- 顺带：`graph_search_tool.py:140` 与 `hybrid_search_tool.py:3-4` 的 docstring 里仍写着 "qwen3-rerank" / "qwen3.7-text-embedding"，改成不点名措辞（"配置的重排模型"）。

### 4.3 TEI 重排分支

- **allowlist 新行**（`providers/__init__.py` rerank leg，:93-114 区）：`tei-rerank` → `deerflow.knowledge.reranker_tei:TEIReranker`，`path="/rerank"`，`secret_env_var="RAG_RERANK_API_KEY"`，**无内置地址**（用户填，同 `generic-rerank`）。
- **新模块 `reranker_tei.py`**：
  - `TEIReranker(*, base_url, api_key=None, max_retries=3, retry_backoff_seconds=0.5, client=None, timeout_seconds=60.0)` —— **无 model 参数**（请求里没有 model 字段；与 `TEISparseEncoder` 自述同一条规则："TEI 一个实例只服务一个模型"，sparse.py:15-19）。
  - `rerank(query, documents, *, top_n=5)`：载荷 `{"query": query, "texts": list(documents), "raw_scores": False}`；响应必须为数组，逐行取 `index` / `score`，排序后**本地截到 top_n**（TEI 没有 `top_n`，而 vector 路把返回值直接当最终结果用，hybrid_search_tool.py:71-72）。
  - 错误：复用 `RerankerError` / `RerankerAuthError`（RRF 降级合同靠它，reranker_generic.py:14-16 同款理由）；**非数组 / 行缺 `index`|`score` → `RerankerError`**，绝不静默空榜。
  - 鉴权：**可选**（显式 → `rag_config.json` → `RAG_RERANK_API_KEY`，有值才发头；先例 `TEISparseEncoder._read_api_key`，sparse.py:120-123；TEI 端未配 key 时根本不装鉴权中间件，server.rs:1838-1848）。
- **贯通面**（缺一不可）：`app_config.py:215` 与 `rag_config_file.py:106` 的 `Literal` +1；`test_rag_provider_config.py:190` 的元组断言同步（`:166` 是 parametrize 表）；构造守卫自动收编（`test_provider_construction_sites.py:36-39` 由 allowlist 表驱动）；capability 端点自动带出（rag_config.py:253-269）；保存期构造校验自动生效（`_reject_unusable_after_save`，rag_config.py:297-315 —— 没地址 → 400；既有腿级用例点名 `generic-rerank`，新行要补一条）。
- **前端**：`config-form.ts:48` / `:73`、`types.ts:45` 的联合类型 + 选项表。⚠️ `RERANK_PROVIDER_OPTIONS` 是**一个常量驱动两路**：渲染（functional-models-view.tsx:606）与**载入归一**（config-form.ts:159 的 `asEnum`）⇒ 加一格两路同时跟上；不加则已存的 `tei-rerank` 会被静默读成 `dashscope`。`PROVIDER_LABELS`（functional-models-view.tsx:501-510）加一格；端点行按 capability 自动出现（`has_fixed_endpoint=False`）；i18n 三文件（`core/i18n/locales/` 下 zh / en / types）。

**文案改动（原文 → 改成）**（下表 `位置` 列的文件均在 `frontend/src/core/i18n/locales/` 下）：

| 位置                                          | 原文                                                              | 改成                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| zh-CN.ts:1705 `providerGenericRerank`（改）   | 通用重排 (Cohere / Jina / TEI 形状)                               | 通用重排 (Cohere / Jina 形状)                                                                 |
| en-US.ts:1799 `providerGenericRerank`（改）   | Generic rerank (Cohere / Jina / TEI shape)                        | Generic rerank (Cohere / Jina shape)                                                          |
| 新增 `providerTeiRerank`（zh / en）           | —                                                                 | TEI 重排 / TEI rerank                                                                         |
| zh-CN.ts:1774-1775 `reindexHint`（改）        | 换嵌入 provider / 维度后，已有向量全部失效——用这里的入口重新嵌入。只读库中现有切片，不重解析源文件。 | 换嵌入 provider / 维度后，已有向量全部失效——用这里的入口重新嵌入：切片、实体、百科条目与人工卡片一起换到新的向量空间。只读库中现有文本，不重解析源文件、不重跑图谱抽取。 |
| zh-CN.ts:1787-1788 `reindexConfirmDescription`（改） | 将重新嵌入该知识库的全部切片（不重解析源文件），期间检索结果可能不稳。目标知识库： | 将重新嵌入该知识库的全部向量（切片、实体、百科条目、人工卡片；不重解析源文件），期间检索结果可能不稳。目标知识库： |
| en-US.ts:1867-1868 `reindexHint`（改）        | …re-embed them here. This reads the library's existing chunks and never re-parses the source files. | …re-embed them here: chunks, entities, wiki entries and manual cards all move to the new vector space. This reads the library's existing text and never re-parses source files or re-runs graph extraction. |
| en-US.ts:1880 `reindexConfirmDescription`（改） | Every chunk of this library will be re-embedded (source files are not re-parsed), and retrieval may be unstable while it runs. | Every vector in this library will be re-embedded — chunks, entities, wiki entries and manual cards (source files are not re-parsed) — and retrieval may be unstable while it runs. |
**已取消（2026-09-25）：原「`rerankModelTeiHint`（选 `tei-rerank` 时挂在模型行）」** —— **是什么**：一句"保存了但从不发送"的条件提示；**原本想解决**：TEI 请求不带 `model` 字段、而配置里仍要填模型名，怕被当缺陷；**为什么取消**：rerank 与嵌入**共用一条 `RowLabel`**（`functional-models-view.tsx:617-633`，两个输入靠 `aria-label` 区分），提示**没有专属落点** —— 挂共享 label 会同时描述嵌入列，挂行内会破该行栅格；同类语义已由 `sparseModelHint`（zh-CN.ts:1714-1715 / en-US.ts:1808-1809）先例覆盖。⇒ **不加这个 key、不加任何条件提示**（plan Task 5 的 RED④ 已同步为"只钉端点行"）。

## 5. 验收

**① 重建覆盖**

1. 单元：`reindex_kb` 三遍各自被调用一次；三遍的嵌入文本与写入侧**逐字相等**（共享助手对拍用例）；点 id 幂等（重复跑覆盖原位，不新增）。
2. 卡片遍只取 `include_in_wiki_search=True` 的行；关卡不放点、不改业务行/卡片开关；条目遍覆盖 `ready` 与 `dirty`。
3. 失败政策：单遍（或单页）抛错 → 其余遍/页照跑；计数诚实（只计写成）；run 判定与逐文档失败口径一致（仍 `succeeded`）。
4. 进度：三键在 run 全程存在（前端求和不会 NaN）；界面运行行显示四类向量之和。
5. 门禁：`backend` `tests/knowledge` 全量 + ruff 双净；前端 `pnpm check` + 功能模型视图既有用例；`ruff format --check`。
6. **真栈**（复现 2026-09-23 测法）：同一查询在重建前图谱证据 0 / 百科最高分 ~0.04 → 触发重建 → 图谱证据恢复（对照登记值 6）/ 百科分数量级恢复；对照组 = 重建前同查询。

**② 召回标签**

7. 单元：标签构造四格 —— 默认 dashscope → `qwen3-rerank relevance`；`generic-rerank` + Jina 模型名 → `jina-reranker-v2-base-multilingual relevance`；impl 回报 `rerank` → 模型名；回报 `cosine` / 缺键 → `embedding cosine`。
8. 单元：图谱 impl 在小池（≤ 阈值）回报 `cosine`、大池回报 `rerank`、重排抛错回报 `cosine`。
9. 既有钉死断言（test_recall_test_api.py:174-179）改到新口径；**真栈**：召回面板徽标显示当前配置的模型名（operator 现配 Jina）。

**③ TEI 重排**

10. 单元：载荷逐字 `{"query", "texts", "raw_scores": False}`（**无** `model` / `documents` / `top_n`）；裸数组解析；`top_n` 本地截断（发 8 条、`top_n=3` → 3 对）；非数组 → `RerankerError`；401 → `RerankerAuthError`；429/500 重试耗尽 → `RerankerError`；无 key 时**不发** `Authorization`。
11. allowlist / 工厂 / 保存期：新 id 可解析；无 `rerank_base_url` → 保存期 400；capability 端点带出（相关测试元组更新）。
12. 前端：下拉三项；选 `tei-rerank` 时端点行出现、generic 标签不再含 TEI（**模型行提示已取消**，见 §4.3 表下的取消条）。
13. **真栈（可选，operator 定）**：docker 起 `ghcr.io/huggingface/text-embeddings-inference:cpu-1.9 --model-id BAAI/bge-reranker-base` → 配 `tei-rerank` → 召回测试出分、网关日志 `POST /rerank 200`；对照组 = `generic-rerank` 指同一地址（应 422 / 空榜 —— 证明两种形状确实不同）。

## 6. 文档同步

- `README.md:115`（重建索引那段："重新嵌入现有切片" → 全部向量）。
- `backend/AGENTS.md:876`（`POST /{kb_id}/reindex` 的描述）；`:757-763`（保存期检查"恰好两个案例"的名单 —— `generic-rerank` 缺地址那条此后是一族，措辞跟上）；**`:851`**（RAG 配置段末句 "it re-embeds the stored chunks and never re-parses" ⇒ 改成四类向量；审查新发现的一处）。
- `frontend/AGENTS.md:284` 一带（重建状态轮询说明）——仅在措辞受影响时改。

## 7. 证据来源（一手）

- **TEI 重排形状**：`huggingface/text-embeddings-inference` clone @ `98b7ea2ddb928eccbfde41d96e9576f876d045f4`（2026-09-23，master）——`router/src/http/server.rs:1766`（唯一 `/rerank` 路由）、`:280-305`（utoipa 状态码表：200 / 424 / 429 / 422 / 400 / 413 + 处理函数）、`:1838-1848`（key 配了才装鉴权中间件）、`router/src/http/types.rs:243-274`（RerankRequest :243 / Rank :263 / RerankResponse :274）、`docs/source/en/quick_tour.md:129-132`（官方 curl）。
- **本仓现状**：reranker_generic.py（请求体 :84-89、解析 :91-93、`_decode_body` :133-138）、providers/__init__.py:93-114、sparse.py:96-123（TEI 客户端先例）、reindex.py 全篇、knowledge_service.py:905-907 / :1063-1067 / :1216 / :1704-1733、graph_search_tool.py:125-159 / :320-334、wiki/generator.py:62 / :294-296、graph/indexer.py:187、graph/resolver.py:116、vector_store.py:132-170 / :234 / :274 / :463。
- **实测登记**：plan `2026-09-14-rag-model-provider-adaptation.md` 的「运行期遗留」段 :208-216（三条分别在 :212 entity/wiki 向量跨空间 6→0 与 ~0.29→0.04 / :213 召回标签写死 / :214 重排下拉 "TEI 形状" 待核）。

## 8. 边界与已知残留

- 重建**不做**孤儿点清扫、不重跑图谱抽取（不花 LLM）、不改业务行 —— 只把四集合的向量换到当前配置的空间。
- 标签的字面语言保持现状（英文技术串，如 `embedding cosine`），不引入 i18n —— 与召回面板既有形态一致。
- `vector` 路重排**降级**时分数为 null、标签不变（"relevance"描述的是"有分时是什么分"）；这是既有合同（test_recall_test_api.py:148），本 spec 不改。