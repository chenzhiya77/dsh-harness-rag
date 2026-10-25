# 检索面三处收口：重建覆盖、召回标签、TEI 重排形状 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-24-rag-retrieval-followups-design.md](../specs/2026-09-24-rag-retrieval-followups-design.md)
**Status:** ✅ **已交付（2026-09-25）—— Task 0–7 全勾**。三项已裁：**D1 甲**（四集合全补，含 `kb_manual_cards`）/ **D2 乙**（按配置派生 + 图谱 impl 回报 `score_source`）/ **D3 甲**（allowlist 新增独立一格 `tei-rerank`）。**交付轨迹**：`ea7f6ffc`（spec+plan 成对）→ `66670d97` T1 / `648123ab` T2 / `e7fa594f` T3 / `3c353ca6` T4 / `69ca4600` T5 → **`3f248276`（Task 6 验收途中修掉的真实缺陷：通用客户端批上限 20→10，端点 20 行即 400）** → `5b94dcb9` T6 → 本笔 T7。**收官门禁**：ruff 双净（`All checks passed!` + `1294 files already formatted`）；后端 `tests/knowledge` **1226 passed / 2 skipped / 3 failed**（3 红 = **环境条件**，A/B 已证）；前端 `pnpm check` 零诊断、窄面 **65 绿** / 更宽面 **234 绿**；真栈三节全过（重建窗口 44×200 零 400 / 三路徽标 / TEI 200 对 422）。
**审查后修订已并入（2026-09-25，对着现状逐条核完）**：① 文案提示条**已裁甲 ⇒ 取消 `rerankModelTeiHint`**（无专属落点，见硬约束）；② i18n 行号/目录、`rag_config_file.py`、`test_rag_provider_config.py` 坐标已刷新；③ **串行矩阵已更正**（三线共享 view 文件，见 Global Constraints）；④ **Task 0 八项已核完并回填**（结论见各行）。
**Parent:** [2026-09-14-rag-model-provider-adaptation-design.md](../specs/2026-09-14-rag-model-provider-adaptation-design.md)（provider 维度 + §5 重建入口；本对的三项都是它跑完后的运行期遗留）· [2026-09-14-rag-model-provider-adaptation.md](2026-09-14-rag-model-provider-adaptation.md)（其「运行期遗留」段 :208-216 逐条登记，三条分别在 :212 / :213 / :214）

**Architecture:** 四条后端 + 一条前端 + 文档 —— **① 共享嵌入文本助手**（新模块 `deerflow/knowledge/embed_texts.py`，写入侧四处与重建侧共用，消掉"抄一行字符串"）**② 重建入口三遍**（`reindex.py`：实体/百科/卡片各一遍，按 `page_size` 切批 + 单批失败继续 + 只 upsert；报告与进度各加三键）**③ 召回标签按请求派生**（删 `_RECALL_SCORE_TYPES` 常量；图谱 `_score_candidates` 回报实际尺子，payload 加 `score_source`）**④ TEI 客户端**（新模块 `reranker_tei.py` + allowlist 一行 + 两处 `Literal`）**⑤ 前端一处做完**（重建进度求和 + 重建两处文案 + TEI 下拉第三项/标签 + i18n 三文件）**⑥ 真栈验收**（重建链路 / 召回徽标 / TEI docker 腿按 operator 定）。

**硬约束（spec 已裁，实现时不许自行放松）**：

- **D1 甲**：四集合全补 —— 切片（既有）+ **实体 + 百科条目 + 人工卡片**。卡片遍**只取 `include_in_wiki_search=True`** 的行；条目遍**全状态**（向量与 dirty 记号无关）。
- **只 upsert、不删点、不改业务行**（条目状态/补充层/卡片开关都不碰）；点 id 本就确定性 ⇒ 重复跑幂等、原位覆盖。
- **写好文本与写入侧同源**：三函数落 `embed_texts.py`，**四个写入侧调用点一起改 import**（`graph/indexer.py` :187 / `graph/resolver.py` :116 / `wiki/generator.py` :295 / `knowledge_service.py` :905-907 删除、两处调用改用它）。实体那两处 `or ''` 分叉顺带统一为 `description or ""`。
- **D2 乙**：徽标 = 「这一跑实际参与打分的那个东西」，**服务端每次请求现算**（前端只显示字符串）。vector → `{rag.rerank_model} relevance`（模型串空 → `rerank relevance`）；graph → impl 回报 `"rerank"` → 同上，`"cosine"` / **缺键按配置兜底**（`graph_rerank` 开 → 模型名、关 → `embedding cosine`）；wiki → 恒 `embedding cosine`。**TEI 这格渲染配置里的模型名**（线上不带 model；那格正是"这个实例服务哪个模型"）。
- **D3 甲**：TEI 是**独立一格** `tei-rerank`（不改 `generic-rerank` 的行为）。请求 `{"query", "texts", "raw_scores": False}`（**不发 `model`/`documents`/`top_n`**）；响应裸数组 `[{index, score}]`；**`top_n` 本地截断**（TEI 没这个字段，而 vector 路把返回值直接当最终结果用）；错误复用 `RerankerError`/`RerankerAuthError`；**key 可选**（有值才发 `Authorization`）。
- **文案改动逐字照 spec §4.3 的表**（原文 → 改成），不许换词：`providerGenericRerank` 收窄为 `通用重排 (Cohere / Jina 形状)` / `Generic rerank (Cohere / Jina shape)`；新增 `providerTeiRerank` = `TEI 重排` / `TEI rerank`；`reindexHint` / `reindexConfirmDescription` 按表新文案（zh/en 各一处）。**`rerankModelTeiHint` 已裁甲取消（2026-09-25）**：rerank 与嵌入**共用一条 `RowLabel`**（`functional-models-view.tsx:617-633`）⇒ 提示无专属落点；**不加这个 key、不加任何条件提示**（spec §4.3 表下有取消条）。
- **不动**：切片遍既有行为（文档循环、终态过滤、`page_size`、`chunk_count` 收尾写法）· 三条检索链的检索/排序逻辑 · 四集合 schema 与 1024 维 · embedder/parse 两条腿 · `rag.rerank_model` 的语义与默认值 · `score_type` 的字面语言（英文技术串，不引 i18n）· `reindexChunksWritten` 的 key 名（文案本身就是"已写入向量"）。
- **scope fence（明确不做）**：孤儿点清扫 · 重建不重跑图谱抽取（不花 LLM）· `auto-分流`（D3 乙，已否）· 召回降级时分数 null 的既有合同（spec §8）· caption 401 / judge key / `vlm_model` 校验（spec §2 已登记为别处落点）。

**Global Constraints:**

- 分支 `feat/rag-knowledge-base`；每个 Task：**RED → GREEN → neuter（带 revert proof）→ 门禁 → commit**（Conventional Commits；每笔提交前看 `git status`，别把别线文件带进来）。
- **后端命令**：窄面 `cd backend && .venv/Scripts/python.exe -m pytest <文件/目录> -q --basetemp .pytest-tmp`（**basetemp 只用仓内 `.pytest-tmp`，跑完即删**）；ruff 双净 = `.venv/Scripts/python.exe -m ruff check .` + `-m ruff format --check .`（**别用 `make format`**，会扫全仓）。
- **前端命令**：`cd frontend && PYTHONIOENCODING=utf-8 python ../scripts/pnpm.py <script>`；门禁 = `pnpm check`（eslint + tsc）+ `pnpm test`（rstest：node + dom）。**prettier 只重排自己新写的行**（既有格式债不 `--write`；判定走 `tr -d '\r'` + 与 HEAD 比 hunk）。
- **每个 Task 的 `**实测**` 行必须回填**（RED 几条红 / GREEN 几条绿 / neuter 受害者 / 门禁数字）——未回写的 plan 不算交付。
- **真栈**：前端只驱动用户已在跑的 `:3000`（只读或按 Task 6 的动作面）；后端重建用可写库**「测试2」**（内有测试残留，可写）或新库；**不改 `config.yaml`**；需要改 `rag_config.json` 时先逐字节备份、结束后按原样还原（配方见 [[local-dev-stack]] 的 09-24 条目）。
- **同文件串行（2026-09-25 更正）**：**三条未开工线共享 `frontend/src/components/workspace/settings/functional-models-view.tsx`** —— 本对 / `2026-09-24-settings-responsive-layout`（plan 09-25 已立；也动它的 dom 用例，**不动 i18n**）/ 默认模型线（`2026-09-23-default-model`，**不动这个文件**，它动的是其 dom 夹具 `tests/unit/settings/functional-models.dom.test.tsx`）。**i18n 三文件**（`core/i18n/locales/`）才是与默认模型线共享的那组；`core/rag/*` + `core/knowledge/types.ts` 只有本对动；`knowledge_service.py` 与默认模型线共享。⇒ 谁先落，后者以先落者的行号为准；**本文件的行号基线 = 2026-09-25，Task 5 的前端行号以落笔当日复核为准**。

**依赖顺序**：Task 0（只读核实，✅ 2026-09-25 已核完）→ Task 1（文本助手 + 写入侧）→ Task 2（重建三遍）→ Task 3（召回标签）→ Task 4（TEI 后端）→ Task 5（前端一处做完）→ Task 6（真栈验收）→ Task 7（文档 + 回写）。

---

## Task 0 — 开工前八项核实（只读）

- [x] 1. **`tests/knowledge/test_reindex.py` 的调用缝** ⇒ **已核（2026-09-25）**：文件 314 行 / 10 例；现有 **7 处**调用（:113 / :133 / :154 / :169 / :199 / :217 / :245）**全部不传** `graph_store`/`wiki_store` ⇒ 签名改必填后这 7 处一起红（RED 面按这个写）。`_PROGRESS` / `ReindexReport` **没有键集断言**（最近的是 :250-251 只断两个键、:314 的 HTTP 体 `progress: None`）⇒ 加三键不会自己红。
- [x] 2. **写入侧四处逐字文本与边界** ⇒ **已核（2026-09-25）**：四处逐字如初核（`graph/indexer.py:187` 带 `or ''` / `graph/resolver.py:116` 不带 / `wiki/generator.py:295` 用 `EMBED_CONTENT_CHARS` / `knowledge_service.py:905-907`）；`merged['description']` **恒为 str**（`graph/store.py:37-43` 的 `_merge_text` 永远 join 出字符串）✔；⚠️ **但 `list_entities` 的原始行 `description` 可为 `None`**（`knowledge/models.py:101` 可空）⇒ 重建遍构造 `EntityUpsert` 要照写入侧 `or ""` 归一；`EMBED_CONTENT_CHARS` 全仓**仅 2 处**（`generator.py:62` 定义 / `:295` 使用；测试零引用）⇒ 搬家干净。
- [x] 3. **三个 store 的返回键** ⇒ **已核（2026-09-25）**：`list_entities(kb_id)`（`graph/store.py:107-111`，**无分页**、`to_dict()` 出全部列）/ `list_entries(kb_id, *, status=None)`（`wiki/store.py:91-98`，**省略 status = 全状态**）/ `list_manual_cards(kb_id, *, offset=0, limit=50, include_in_wiki_search=None)`（`store.py:449-470`，**唯一有游标分页的**）+ `count_manual_cards`（:472，同参）。⚠️ 实体/百科两遍**没有 offset/limit** ⇒ spec §4.1 的"分页"措辞已就地改为"切批"。
- [x] 4. **前端重建进度的消费面** ⇒ **已核（2026-09-25）**：三处夹具都是字面量、**不钉键集**（`reindex-status.test.ts:23` / `functional-models.dom.test.tsx:1324` / `knowledge/api.test.ts:270`；缺键/多键由 tsc 兜）；既有运行行用例 `functional-models.dom.test.tsx:1321-1333` 只断 `"3/7"` 与 `"42"` ⇒ **不会**因改求和而红，Task 5 的新求和用例是必需的。
- [x] 5. **召回标签消费面** ⇒ **已核（2026-09-25）**：后端**唯一**产出点 `knowledge_service.py:1216`；前端仅 `core/knowledge/types.ts:336`（类型）+ `recall-test-panel.tsx:567`（纯渲染 `score_type[path]`）；dom 用例 `recall-test-panel.dom.test.tsx:115`（夹具）/:254-262（`toContain` 断徽标文本）⇒ **无第二消费点、前端零改动**。
- [x] 6. **graph 工具返回键的断言面** ⇒ **已核（2026-09-25）**：`test_graph_search.py` **没有** payload 键集断言（最近的是 :179 子集断言、:642 只钉 `trace` 子对象）⇒ 加 `score_source` 不会红；`eval/runner.py` 的 `graph_fn` 只读 `raw.get("evidence")`（:397）⇒ 同样安全。
- [x] 7. **TEI 前端落点** ⇒ **已核（2026-09-25）**：`providerTeiRerank` / `rerankModelTeiHint` / `tei-rerank` / `TEIReranker` 在**代码里零命中**（只出现在本 spec/plan 文档里）；`asEnum`（`config-form.ts:132-134`）对未知值 ⇒ **回退 fallback**；⚠️ **`RERANK_PROVIDER_OPTIONS` 是一个常量驱动两路**：渲染（`functional-models-view.tsx:606`）与**载入归一**（`config-form.ts:159` 的 `asEnum`）⇒ 不加会静默回退 `dashscope`；⚠️ **模型行没有提示机制**：rerank 与嵌入**共用一条 `RowLabel`**（:617-633）⇒ 提示条已裁甲取消；三个 `RERANK_PROVIDERS` 夹具文件见 Task 5 的 ⚠️。
- [x] 8. **保存期/能力面** ⇒ **已核（2026-09-25）**：`_reject_unusable_after_save`（`rag_config.py:297-315`）三腿构造 ⇒ `tei-rerank` 缺地址自动 400；既有腿级用例**点名 `generic-rerank`**（`test_rag_config_api.py:607-619`）与 parse（:622-632）⇒ **要补一条 `tei-rerank` 缺地址 → 400**（Task 4 已写死要补，不再是"视"）；allowlist 行的 `path`/`secret_env_var` 只有 ark 那格被钉（`test_embedder_ark.py:33` + :221-222）。

**实测（2026-09-25，审查时八项全核、逐条结论见各行）**：开工时可直接从 Task 1 起；**唯需当日复核**的是受两条未开工线影响的前端行号（见 Global Constraints 的串行条）。

---

## Task 1 — 共享嵌入文本助手 + 写入侧四处切换

> 动到的文件：`packages/harness/deerflow/knowledge/embed_texts.py`（**新增**）、`tests/knowledge/test_embed_texts.py`（**新增**）、`graph/indexer.py`（:187 改用）、`graph/resolver.py`（:116 改用）、`wiki/generator.py`（:62 `EMBED_CONTENT_CHARS` 移出 / :295 改用）、`app/gateway/services/knowledge_service.py`（删 :905-907、两处调用 :931/:1021 改用）。
> **验收对应**：spec §5 的 1（"三遍的嵌入文本与写入侧逐字相等"的**结构**保证）。

- [x] **RED**：新建 `test_embed_texts.py`（四条）：① `entity_embed_text("X", None)` == `"X\n"`、`("X", "d")` == `"X\nd"`；② `wiki_entry_embed_text("T", "长"*600)` 只嵌前 500 字（`len(text.split("\n", 1)[1]) == 500`）；③ `manual_card_embed_text("T", "C")` == `"T\nC"`；④ **同源钉子（2026-09-25 审查加）**：在既有消费方用例里给**消费模块自己的名字**装 spy（配方 = 仓内先例 `test_worker.py:525` 的 `monkeypatch.setattr("deerflow.knowledge.worker.resolve_entity_aliases", spy)`），四处各一：`deerflow.knowledge.graph.indexer` / `deerflow.knowledge.graph.resolver` / `deerflow.knowledge.wiki.generator` / `app.gateway.services.knowledge_service`（后两者的既有驱动面：`tests/knowledge/wiki/` 与 `tests/knowledge/test_manual_knowledge_api.py`；resolver 走 `tests/knowledge/graph/test_resolver.py:114` 一带）—— 驱动各写入路径后断言 spy 被调用。此刻四处仍是内联 f-string ⇒ 红；这条是"改 import 真的发生"的唯一结构性保证（纯函数用例只测助手本身）。
- [x] **GREEN**：写 `embed_texts.py`（三函数 + `EMBED_CONTENT_CHARS = 500`，注释点明"与写入侧同源是重建的前提"）；四个调用点改 import（`knowledge_service.py` 删私有 `_manual_card_embed_text`；`wiki/generator.py` 的 `EMBED_CONTENT_CHARS`（:62，全仓唯一消费点 :295）删除、改从 `embed_texts` 取）。窄面转绿；**既有消费方用例（graph 索引/合并、wiki 生成、卡片创建/编辑）复跑证明行为不变**。
- [x] **neuter ①（截断）**：`wiki_entry_embed_text` 去掉 `[:EMBED_CONTENT_CHARS]` ⇒ ② 红。
- [x] **neuter ②（分隔）**：`entity_embed_text` 把 `description or ""` 换成 `description`（None 时产出 `"X\nNone"`）⇒ ① 红。
- [x] **门禁**：ruff 双净；窄面（`test_embed_texts.py` + `tests/knowledge/graph/` + `tests/knowledge/wiki/` + `tests/knowledge/test_manual_knowledge_api.py` 消费方）绿。

**实测（2026-09-25）**：**RED** = 1 collection error（`ModuleNotFoundError: deerflow.knowledge.embed_texts`）+ **5 红 / 53 绿**；5 红 = 钉子五处（`test_graph_indexer` / `test_resolver` / `test_generator` / `test_manual_knowledge_api` 的**创建 + 编辑两条**，均 `helper_calls` 空断言 —— 计划写"四处各一"，实际卡片模块两个调用点各装一条）。**GREEN** = 同批 **61 passed**。**neuter ①（去截断）** ⇒ 1 红（`..._truncates_content_to_embed_chars`，`assert 600 == 500`）另 2 绿；**neuter ②（`or ""` → 裸 `description`）** ⇒ 1 红（`..._normalizes_nullable_description`，`'X\nNone' == 'X\n'`）且 `tests/knowledge/graph/` **84 绿**（网格无第二受害者）——两次 revert 后 md5 均回到 `3bcdd0ce3f91267e0853cceb51b858aa`。**门禁** = ruff `All checks passed!` + `1292 files already formatted`；窄面（`test_embed_texts.py` + `tests/knowledge/graph/` + `tests/knowledge/wiki/` + `test_manual_knowledge_api.py`，另加 `test_worker.py` 因为它是生成器自动触发的驱动面）**156 passed / 0 failed**。脚手架 = `tests/knowledge/conftest.py::spy_embed_text`（`raising=False` + **装前**捕获真函数：装前"模块没这名字"是干净红、装后委托真函数使既有文本断言原样通过）。

---

## Task 2 — 重建入口补齐三条集合（`reindex.py` + 调用点）

> 动到的文件：`packages/harness/deerflow/knowledge/reindex.py`（三遍 + `ReindexReport`/`_PROGRESS` 各 +3 键 + 签名）、`app/gateway/services/knowledge_service.py`（:1726-1733 调用点补两个 store）、`tests/knowledge/test_reindex.py`（扩）。
> **验收对应**：spec §5 的 1 / 2 / 3 / 4。

- [x] **RED**：`test_reindex.py` 扩用例：① 实体遍 —— `upsert_entities` 收到的文本 = `entity_embed_text(name, description)`、payload 的 `type`/`description` 与业务行一致（**原始行 `description` 可为 `None`（models.py:101）⇒ 期望值按写入侧的 `or ""` 归一**）；② 百科遍 —— 全状态（`ready` + `dirty` 都重嵌）、文本同源；③ 卡片遍 —— **只有 `include_in_wiki_search=True`**、分页走 `offset/limit`、关卡不放点；④ **失败政策** —— 某一遍（或某一批）抛错 ⇒ 其余遍/批照跑、计数只记写成、run 判定仍 `succeeded`；⑤ **报告/进度** —— 三键在 `ReindexReport` 与 `reindex_status()["progress"]` 里存在且 run 开始即为 0；⑥ **幂等** —— 重复跑不新增点（stub 记录 upsert 次数/点 id）。此刻签名与三遍都不存在 ⇒ 红。
- [x] **GREEN**：`reindex_kb(store, vector_store, embedder, *, kb_id, graph_store, wiki_store, page_size)` —— 两个 store **必填**（漏传 = 静默不重嵌三类，正是本对要修的缺陷种类；**不做成可选/默认 `None` 跳过**）。文档循环不动，之后按 **实体 → 百科条目 → 人工卡片** 三遍：每遍把行按 `page_size` **切批** embed + upsert（⚠️ 实体/百科两 store **无 offset/limit**（`graph/store.py:107-111` / `wiki/store.py:91-98`），只有卡片遍是 `list_manual_cards(..., offset, limit)` 游标翻页）；单批失败 `logger.exception` 后继续。`_PROGRESS` 起手三键置 0、每批累加。**既有 7 处测试调用点（`test_reindex.py:113/:133/:154/:169/:199/:217/:245`）一并补两个 store**（真 `GraphStore`/`WikiStore` 复用同一 session factory，或最小 fake —— 但必须让"三遍被跑到"可观测）；生产调用点 `knowledge_service.py:1731` 补 `self.graph_store` / `self.wiki_store`。窄面转绿。
- [x] **neuter ①（过滤）**：卡片遍去掉 `include_in_wiki_search=True` ⇒ ③ 红。
- [x] **neuter ②（文本同源）**：实体遍改嵌 `row["name"]`（丢 description）⇒ ① 红。
- [x] **neuter ③（失败政策）**：把某一遍的 `try/except` 去掉（异常上抛）⇒ ④ 红。
- [x] **门禁**：ruff 双净；**`tests/knowledge` 全量**绿（这个目录就是 `reindex.py`/`knowledge_service.py` 的完整消费面）。

**实测（2026-09-25）**：**RED** = **7 红 / 10 绿**，7 红全是同一条 `TypeError: reindex_kb() got an unexpected keyword argument 'graph_store'`（签名与三遍都不存在）。**GREEN** = **17 passed**（7 新 + 10 旧；既有 7 处调用点统一补 `**_stores(store)` 助手）。**neuter ①（卡片过滤）** ⇒ 1 红（`..._only_flagged_cards_and_pages_them`：reads 变 `[(0,2,None),(2,2,None)]`）其余 16 绿；**neuter ②（实体文本）** ⇒ 1 红（`..._entity_vectors_from_the_write_side_text`）其余 16 绿；**neuter ③（失败政策）** ⇒ 1 红（`..._one_failing_pass_does_not_stop_the_rest`，RuntimeError 上抛）其余 16 绿 —— 三者受害者不相交；三次 revert 后 md5 均回 `153adbd5090bd069f98c0e0be05576c4`（随后 ruff 把三处列表推导折成单行 ⇒ 现 `f4b8be26…`，语句未变）。**门禁** = ruff `All checks passed!` + `1292 files already formatted`；`tests/knowledge` 全量 **1201 passed / 3 failed / 2 skipped**，3 红全是**环境性预存**（`test_embedder_providers…defaults_to_dashscope…` / `test_indexer…embed_missing_api_key` / `test_reranker…rerank_missing_api_key` —— 操作者仓根真实的 `rag_config.json` 让「默认 dashscope」「缺 key 须抛」两个前提失效），**A/B 已证**：`DEER_FLOW_RAG_CONFIG_PATH` 指**仓外空文件**后这三条 **3 passed**（配方照 models_config 那条既有的环境红）。**两处相对计划的偏差**：① **多一条生产调用点接线钉子** `test_run_reindex_hands_the_two_shared_stores_to_the_rebuild`（`_run_reindex` 确实把两个 store 交给重建；漏传 = 静默不重嵌，而 `_run_reindex` 会把异常吞成日志 ⇒ 只在真栈才暴露），已单独验敏：去掉那两个 kwarg ⇒ **恰好 1 红**（该钉子）其余 17 绿（18 passed 为全绿态）；② 失败政策用例的**注入点从嵌入侧挪到写入侧**（局部 `_BrokenEntityStore.upsert_entities` 抛错）—— 首跑 neuter ② 曾**连带**打红它（那版注入按嵌入文本匹配 ⇒ 文本一改注入就不触发，属假阳性），挪走后三种 neuter 各只杀自己的目标。**⚠️ 环境事故（可复用）**：门禁后台跑与前台单文件跑**共用 `--basetemp .pytest-tmp`** ⇒ pytest 会话开头清 basetemp 根、两侧互删临时目录，前台凭空 **14 errors**（`tmp_path` 系用例成批 ERROR）⇒ 同一仓内任何时刻只允许一个 pytest 用同一 basetemp；已停后台串行重跑。**实现落点**：三遍函数 `_reindex_entity_vectors` / `_reindex_wiki_entry_vectors` / `_reindex_manual_card_vectors`，批次内 `logger.exception` 与调用点 per-pass `try/except` 两层（批失败不带走本遍其余批、遍失败不带走其余遍），`_bump` 每批累加、`report.*` 按遍返回；只 upsert、不删点、不改业务行（用例 ② 钉了 dirty 记号与正文原样）。

---

## Task 3 — 召回标签随配置 + 图谱回报尺子

> 动到的文件：`app/gateway/services/knowledge_service.py`（删 :1063-1067 常量、新增 `_recall_score_types(...)`、:1216 改用）、`packages/harness/deerflow/tools/builtins/graph_search_tool.py`（`_score_candidates` :125-159 回报尺子、payload :320-334 加 `score_source`、docstring :140 顺带）、`tools/builtins/hybrid_search_tool.py`（docstring :3-4 顺带）、`tests/knowledge/test_recall_test_api.py`（:174-179 钉死断言改口径 + 新用例）、`tests/knowledge/tools/test_graph_search.py`（+尺子用例）。
> **验收对应**：spec §5 的 7 / 8。

- [x] **RED**：① `test_recall_test_api.py` 加四格 —— 默认 dashscope → `qwen3-rerank relevance`；`generic-rerank` + Jina 模型名 → `jina-reranker-v2-base-multilingual relevance`；impl 回报 `rerank` → 模型名；回报 `cosine` / **缺键** → `embedding cosine`（缺键 = 既有 mock 形态，走配置兜底）；② `test_graph_search.py` 加三格 —— 小池（≤ `graph_rerank_threshold`）回报 `cosine`、大池回报 `rerank`、重排抛错回报 `cosine`。此刻常量写死、payload 无该键 ⇒ 红。
- [x] **GREEN**：`_score_candidates` 返回 `(scores, "rerank"|"cosine")`；`_graph_search_impl` payload 加 `"score_source"`；服务层 `_recall_score_types(rag, graph_source)` 按硬约束 D2 的映射拼三路标签（TEI 格渲染配置模型名）；旧钉死断言改成按配置断言。⚠️ 调用点**唯一** = `graph_search_tool.py:270`（其返回值马上喂 `apply_source_caps` / `select_evidence`）⇒ 就地解包取 `score_source`，别把 tuple 当 scores 传下去。窄面转绿。
- [x] **neuter ①（派生）**：把 vector 标签改回写死 `"qwen3-rerank relevance"` ⇒ 四格里 Jina 格红。
- [x] **neuter ②（尺子）**：让 `_graph_search_impl` 恒写 `"cosine"` ⇒ 大池格红（小池格保持绿 —— 受害者不相交）。
- [x] **门禁**：ruff 双净；窄面（`test_recall_test_api.py` + `tests/knowledge/tools/`）绿；`tests/knowledge` 全量绿。

**实测（2026-09-25）**：
- **RED 8 红**（两文件同跑 62.8s）：标签格 5 红（②③④⑤⑥ —— ① 默认档三条字面量与旧常量恰好同值，按设计保持绿）+ 尺子格 3 红（全是 `KeyError: 'score_source'`）；同批 34 绿。
- **GREEN 窄面 42 绿**：`_score_candidates` → `tuple[dict[str, float], str]`（成功 `"rerank"`、其余含降级 `"cosine"`，两处 return）；唯一调用点（现 :274）就地解包 —— tuple 没流进 `apply_source_caps`/`select_evidence`；payload（:331）加 `"score_source"`；`_recall_score_types(rag, graph_source)` 静态方法替掉常量（:1215 调用，`isinstance(graph_raw, dict)` 守卫 ⇒ 失败腿/老 stub 走配置兜底）。
- **标签四格做成 6 行参数化**（多出的 2 行都钉 spec §4.2 表里的既有分支）：①默认 dashscope；②Jina 模型名；③impl 回报 `rerank`；④impl 回报 `cosine`（配置开着重排也算「这一跑没跑」）；⑤**缺键 × `graph_rerank` 开 → 模型名**（兜底另一支）；⑥**模型串为空 → `rerank relevance`**。⚠️ 用例自带输入（`_pin_rag` 把 rag 钉死）—— 本机 `rag_config.json` 是 generic-rerank + Jina，照它断言 = 把操作员的机器写进用例。
- **`:174-179` 旧钉死断言改口径**：同一 `_pin_rag` 钉 dashscope 默认档再断言三条字面量（不再是「常量 == 常量」的同义反复）；`_mock_impls` 缺键 ⇒ 图路走配置兜底（关 → cosine）。
- **TEI 格无需专门代码**：vector 标签恒 `{rag.rerank_model} relevance`，Task 4 接上 `tei-rerank` 后自动渲染配置里的模型名 —— 计划的「TEI 格渲染配置模型名」由同一条规则满足。
- **neuter ①（派生）**：`rerank_label` 改回写死 `"qwen3-rerank relevance"` ⇒ **4 红**（②③④⑥）、①⑤ 保持绿；md5 `9a5a6f68…` →（neuter）`f4fe1f65…` →（还原）`9a5a6f68…`。
- **neuter ②（尺子）**：payload 恒写 `"cosine"` ⇒ **1 红**（只有大池格；小池/降级两格保持绿 —— 受害者不相交，与计划一致）；md5 `f30cf5d6…` → `18e8f110…` → `f30cf5d6…`。
- **门禁**：ruff `check` + `format --check` 双净（1292 files）；`tests/knowledge` 全量 **1210 passed / 2 skipped / 3 failed（环境）**；3 红逐条复核 = 本机真 `rag_config.json` 供 key 使 `monkeypatch.delenv` 失效（`test_embedder_providers` / `test_indexer` / `test_reranker` 各一），A/B（`DEER_FLOW_RAG_CONFIG_PATH` 指仓外空文件）⇒ 那 3 条 **3 passed**。
- 顺带：`graph_search_tool.py:140` 与 `hybrid_search_tool.py:3-4` 的 docstring 去点名（改「the configured rerank model / embedding model」）。⚠️ `_empty()` **不带** `score_source`（诚实空答案没有打分这回事）⇒ 由服务层兜底；前端面（`recall-test-panel.tsx:567` 与前端用例 mock）只渲染字符串，零改动。

---

## Task 4 — TEI 重排分支（后端）

> 动到的文件：`packages/harness/deerflow/knowledge/reranker_tei.py`（**新增**）、`tests/knowledge/test_reranker_tei.py`（**新增**）、`knowledge/providers/__init__.py`（rerank leg +1 行）、`config/app_config.py:215` 与 `config/rag_config_file.py:106`（`Literal` +1）、`tests/knowledge/test_rag_provider_config.py:190`（元组断言同步；`:166` 是 parametrize 表）；`tests/test_rag_config_api.py` **补一条** `tei-rerank` 缺 `rerank_base_url` → 400（现有 :607 那条点名 `generic-rerank`，不覆盖新行）。
> **验收对应**：spec §5 的 10 / 11 / 13（13 的真栈腿在 Task 6）。

- [x] **RED**：新建 `test_reranker_tei.py`：① **载荷逐字** —— `{"query", "texts", "raw_scores": False}`（**无** `model`/`documents`/`top_n`）；② 裸数组 `[{"index":1,"score":0.2},{"index":0,"score":0.9}]` 解析成 `[(0,0.9),(1,0.2)]`；③ **`top_n` 本地截断**（发 8 条、`top_n=3` → 3 对）；④ 非数组（dict / 字符串）→ `RerankerError`；⑤ 401 → `RerankerAuthError`；⑥ 429 → 重试（第 2 次 200 成功）、500 耗尽 → `RerankerError`；⑦ **无 key 不发 `Authorization`**（有 key 才发）。另加 allowlist/工厂：`resolve_provider("rerank","tei-rerank")` 命中、`build_reranker` 缺 `base_url` → `RagConfigurationError`。此刻模块与表行都不存在 ⇒ 红。
- [x] **GREEN**：写 `reranker_tei.py`（`TEIReranker`，无 `model` 参数；`_read_api_key` 可选三级：显式 → `configured_rag_secret("rerank_api_key")` → `RAG_RERANK_API_KEY`；响应必须为数组、行缺 `index|score` → `RerankerError`）；allowlist 加行（`path="/rerank"`、`secret_env_var="RAG_RERANK_API_KEY"`、**无内置地址**）；两处 `Literal` +1；元组断言同步。窄面转绿。
- [x] **neuter ①（载荷）**：载荷带上 `"model": 配置值` ⇒ ① 红（TEI 会 422）。
- [x] **neuter ②（截断）**：`top_n` 不本地截 ⇒ ③ 红。
- [x] **neuter ③（鉴权）**：无 key 时也发 `Authorization: Bearer ""` ⇒ ⑦ 红。
- [x] **门禁**：ruff 双净；窄面（`test_reranker_tei.py` + `test_rag_provider_config.py` + `test_rag_config_api.py`）绿；`tests/knowledge` 全量绿。

**实测（2026-09-25）**：
- **RED**：新文件整文件 **1 collection error**（`ModuleNotFoundError: deerflow.knowledge.reranker_tei`）+ 另两文件 **4 红 / 27 绿**（`test_rag_provider_config`：parametrize 行 / `provider_ids` 元组 / 新钉的 `tei-rerank` 行形状；`test_rag_config_api`：`tei-rerank` 缺地址 ⇒ 实得 **422** 而非 400 —— Literal 未收该 id）。
- **GREEN 窄面 78 绿**：`reranker_tei.py`（载荷逐字 `{"query","texts","raw_scores":False}`；裸数组解析 + 本地 `top_n` 截断；非数组/行缺 `index|score`（含不可强转）→ `RerankerError`；401/403 → `RerankerAuthError` 且**不重试**；429/5xx 指数退避重试后抛；**无 key 不发 Authorization**）；allowlist 补行；`app_config.py:215` + `rag_config_file.py:106` 两处 Literal +1。新文件有 4 个 malformed 行参数格（非数组 dict / 字符串 + 缺 `index` + 缺 `score`）——「绝不静默空榜」逐支钉住。
- **⚠️ 计划外但必需（发现即修）**：`reranker_factory.build_reranker` 原本**无条件**传 `model=`，与「`TEIReranker` 无 model 参数」当场撞（`TypeError`）。落法 = `ProviderSpec` 新增能力位 **`takes_model: bool = True`**（其余行原样；`tei-rerank` 置 False），工厂按**能力**判而非 provider id（与 `has_fixed_endpoint` 同一条规矩）；两条工厂用例钉住（能造出 `TEIReranker` / 缺地址 → `RagConfigurationError`）。**顺手把 `tei-sparse` 行也置 `takes_model=False`**（同一件事的既有格：其请求 `{"inputs":…}` 也没有 model 字段，1 行）。
- **另一处计划没点名的消费面**：`test_rag_config_api.py::test_get_returns_the_rerank_provider_capabilities` 对整块 rerank 能力表做**全等**断言 ⇒ 行 +1 必红，已补 `"tei-rerank": (False, None)`。另两条面确认**自动**跟上：`_assert_pure_addition` 只看顶层键（列表内新增不触金标）；`test_provider_construction_sites` 由 allowlist 表驱动 ⇒ `TEIReranker` 自动进「禁直接构造」集合。
- **neuter ①（载荷）/②（截断）/③（鉴权）**：各 **恰好 1 红**、受害者不相交（形状格 / 截断格 / 无-key 格）；md5 `63e52f0a…` →（各 neuter）`5e244abc…` / `8bad53df…` / `4f0e704c…` → **还原 `63e52f0a…`**；随后 ruff format 折行 ⇒ 现 `cb32df1e…`（测试文件 `f4693dd9…`）。
- **⚠️ 门禁插曲（环境，两段）**：① 首跑 `tests/knowledge` 里 **48 条 Qdrant 用例从 passed 变 skipped + 1 error**（`test_generator.py::test_only_dirty_prune_removes_vector_point`，异常 `qdrant_client … ResponseHandlingException: All connection attempts failed`）—— 本机 **Docker Desktop 未运行**、6333 拒连（Task 3 那轮还开着）；② 用户启动 Docker 后**立即**重跑仍是 48 skip：`conftest._qdrant_available()` 在 **collection 期**探测且超时只有 **1.0s**，刚 `docker start` 的容器冷启（30 个集合）答不完 ⇒ 整 session 静默降级为 skip（**exit code 仍 0，只有 skip 数会说话**）；③ 容器热了（端口 + `get_collections()` 实测通）再跑 ⇒ 与 Task 3 同口径。
- **门禁（Qdrant 恢复后）**：ruff `check` + `format --check` 双净（1294 files）；窄面 **78 绿**；`tests/knowledge` + `tests/test_rag_config_api.py` 全量 **1260 passed / 2 skipped / 3 failed（环境）** —— 3 红与 Task 3 逐条同名（本机真 `rag_config.json` 供 key，A/B 已证）；计数对得上：Task 3 的 `tests/knowledge` 1210 + 本任务新增 15 条（新文件 13 + 表行 1 + 形状钉 1）+ `test_rag_config_api` 35 = **1260**。

---

## Task 5 — 前端一处做完（重建进度 + 重建文案 + TEI 下拉/标签）

> 动到的文件：`components/workspace/settings/functional-models-view.tsx`（运行行求和 :1099-1101；`PROVIDER_LABELS` :501-510 +1 项）、`core/knowledge/types.ts`（`ReindexProgress` :143-147 +3 键）、`core/rag/types.ts:45`、`core/rag/config-form.ts`（:48 联合 + :73 选项表 —— ⚠️ 同一常量还驱动 `:159` 的载入归一，**一个常量、两路一起跟上**）、i18n 三文件（`frontend/src/core/i18n/locales/` 下 `zh-CN.ts` / `en-US.ts` / `types.ts`：**3 处改值**（`providerGenericRerank` / `reindexHint` / `reindexConfirmDescription`）+ **1 个新 key**（`providerTeiRerank`），逐字照 spec §4.3 表）；用例 `tests/unit/settings/functional-models.dom.test.tsx`（+4 条）。
> ⚠️ **三个既有用例文件各自带一份 `RERANK_PROVIDERS` 局部夹具**（写死的，不从服务端派生）：`tests/unit/settings/functional-models.dom.test.tsx:95-104`（:127 挂进 view）、`tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx:107-118`（:126 挂进 view）、`tests/unit/rag/config-form.test.ts:993-1004`（专测 `resolveRerankEndpointRow`）—— 夹具里都只有 dashscope / generic-rerank ⇒ **选项表 +1 不会自动让它们红**；但 RED ④ 要在 `tei-rerank` 上断言端点行，须在所用文件的夹具里**补一行 `{ provider_id: "tei-rerank", has_fixed_endpoint: false, default_endpoint: null }`**（否则落到「未知不锁」分支，断言打不到目标）。
> **验收对应**：spec §5 的 4（界面部分）/ 12；文案 before→after 见 spec §4.3。

- [x] **RED**：dom 用例加四条：① **进度求和** —— 假 `progress = {documents_done:3, documents_total:3, chunks_indexed:100, entities_indexed:20, wiki_entries_indexed:7, cards_indexed:1}` ⇒ 运行行文案含 `已写入向量 128`；② **重建文案** —— `reindexHint` / `reindexConfirmDescription` 按新文案逐字断言；③ **下拉三项** —— 驱动候选（先例配方 `models-capability-wizard.dom.test.tsx:123-129`）⇒ `[role=option]` 三项、第三项文案 = `TEI 重排`；④ **端点行** —— 选 `tei-rerank` 后端点行按 capability 出现（`has_fixed_endpoint=False`；需给所用夹具补一行 `tei-rerank`，见上文 ⚠️）；**无任何条件提示**（`rerankModelTeiHint` 已裁甲取消，spec §4.3 表下有取消条）。此刻全红。
- [x] **GREEN**：运行行改四键求和（`reindexChunksWritten` 文案不动）；`PROVIDER_LABELS` 加 `"tei-rerank": F.providerTeiRerank`；`RERANK_PROVIDER_OPTIONS` / 两处联合类型 +1；i18n 三文件按 spec §4.3 表改/加（**缺 `types.ts` 即 tsc 红**）。窄面转绿。
- [x] **neuter ①（求和）**：运行行只显示 `chunks_indexed` ⇒ ① 红。
- [x] **neuter ②（下拉）**：`RERANK_PROVIDER_OPTIONS` 漏 `tei-rerank` ⇒ ③ 红。
- [x] **门禁**：`pnpm check` 净（eslint + tsc）；窄面（`tests/unit/settings/functional-models.dom.test.tsx`）绿；更宽面（`tests/unit/settings/` 全目录 + `tests/unit/components/workspace/settings/`）绿。

**实测（2026-09-25）**：
- **RED**：同文件 **5 红 / 60 绿（65 总）**。5 红 = 四条新用例（① 实得 `已写入向量 100`；② 新文案两条都找不到；③ 实得两项；④ 端点行是锁态、无输入框）+ **既有的 `ReindexDialog` 用例**（失败点正是新加的那行描述逐字断言）——"加四条"实际惊动 5 条，第五条的失败面就是它自己新增的断言。
- **GREEN 窄面 65 绿**：运行行四键求和；`PROVIDER_LABELS` + `"tei-rerank": F.providerTeiRerank`；选项常量 / `config-form.ts:48` 联合 / `core/rag/types.ts:45` 三处 +1；`ReindexProgress` +3 键；i18n 三文件按 spec §4.3 表（zh / en 各 3 处改值 + 1 个新 key，`locales/types.ts` +1 行）。
- **⚠️ 两处计划没点名的既有夹具（tsc / 运行期各抓一处，发现即修）**：① `tests/unit/knowledge/reindex-status.test.ts:23` —— 那里的 `ReindexStatus` 是**强类型**夹具，`ReindexProgress` 加三键后 **tsc 当场红**（`pnpm check` 首跑逮到），补三键（0 = 还没走到那三遍）；② 同套件既有的「renders live counters」夹具只有 `chunks_indexed` ⇒ 四键求和后渲染成 **`已写入向量 NaN`**，补齐四类键后该用例的 `42` 保持绿。
- **neuter ①（求和）**：运行行只显示 `chunks_indexed` ⇒ **恰好 1 红**（只有新的求和用例；既有 counters 用例仍绿，因其三键为 0）；md5 `5ccdcea0…` →（neuter）→ **还原 `5ccdcea0…`**。
- **neuter ②（下拉）**：`RERANK_PROVIDER_OPTIONS` 漏 `tei-rerank` ⇒ **2 红**（计划预测 ③ 一条）：③ 下拉 **与** ④ 存量格 —— 这正是"一个常量驱动两路"（渲染 + `asEnum` 载入归一）的直接证据，④ 的独立价值由它自证；与 neuter ① 的受害者不相交。md5 `14087f7c…` →（neuter）→ **还原 `14087f7c…`**。
- **门禁**：`pnpm check` **净**（eslint + tsc）；窄面 **65 绿**；更宽面（`tests/unit/settings/` + `tests/unit/components/workspace/settings/` + 受影响的 `tests/unit/knowledge/{reindex-status,api}.test.ts` + `tests/unit/rag/`）**15 文件 / 234 绿**。
- **prettier 新债核（行号交集法）**：7 个改动文件 NOW ≤ HEAD（`en-US.ts` 36→33、dom 用例 133→127，其余持平）⇒ **零新债**；顺手把 en 的 `reindexConfirmDescription` 从单行断成两行（与 zh 同形）。本机 `pnpm format` 恒红是 CRLF 环境条件（既有口径），故按交集法判。
- **文案落法**：三条改值 + 一条新 key **逐字抄进用例常量**（`REINDEX_HINT_ZH` / `REINDEX_CONFIRM_ZH` / `REINDEX_HINT_EN` / `REINDEX_CONFIRM_EN`）而不是引用字典 —— 避免"常量 == 常量"的同义反复；`F.reindexHint` 走 ⓘ 的可及名断言（等于同时钉住"挂在页面上"）。
- **④ 的口径**：用**存量配置**（`setRag({ rerank_provider: "tei-rerank" })`）而非在弹层里点选 —— 它钉的是**载入归一**那一路（漏加 ⇒ 被静默读成 dashscope、端点行锁死），与 ③ 的渲染路径互补；夹具补的 `tei-rerank` 行让"可编辑"归因于能力块，而不是"未知 provider 不锁"那条兜底。
- **未加任何条件提示**：按同日裁定（spec §4.3 表下取消条）不动模型行；用例只在 tei-rerank 上钉端点行 + 模型行仍在。

---

## Task 6 — 真栈验收

> 用户已在跑的 `:3000` + 可写库**「测试2」**（或新库）；后端重建是**写动作**（这正是验收内容），**不改 `config.yaml`**；改 `rag_config.json` 前逐字节备份、收尾还原。
> **验收对应**：spec §5 的 6 / 9 / 13。

- [x] **① 重建链路（§5.6）**：记录重建前同一查询的三路读数（图谱证据数 / 百科最高分 / 向量命中）⇒ 触发「重建索引」202→`succeeded`；重建后复测 —— **图谱证据恢复（对照登记值 6）、百科分数量级恢复、向量腿不变或更好**；对照组 = 重建前。⚠️ 若库已被重建过不止一次，如实记录"当前空间 + 两次重建之间"的差，别把"本来就正常"当成修复证据（先造出跨空间状态：换一次嵌入 provider/模型 → 旧读数为 0/0.04 → 本对重建 → 恢复）。
- [x] **② 召回徽标（§5.9）**：召回测试面板三路徽标 —— vector 显示**当前配置的模型名**（operator 现配 Jina）、graph/wiki = `embedding cosine`；若这轮把 `graph_rerank` 打开且池 > 阈值，graph 应显示模型名（改回后复原）。
- [x] **③ TEI docker 腿（§5.13，operator 定）**：`docker run --rm -p 8080:80 ghcr.io/huggingface/text-embeddings-inference:cpu-1.9 --model-id BAAI/bge-reranker-base` → 配置 `tei-rerank`（地址 `http://127.0.0.1:8080`）→ 召回出分 + 网关日志 `POST /rerank 200`；**对照组** = `generic-rerank` 指同一地址 ⇒ 422 / 空榜（证明两种形状确实不同）。收尾：容器 `docker rm`、`rag_config.json` 逐字节还原。

**实测（2026-09-25）**：

⚠️ **首轮未通过并发现真缺陷（operator 裁「甲：默认批上限 20→10」+「修完复验」）**：走通用客户端的百炼兼容端点每次最多 **10 行**（20 行 ⇒ 400 `batch size is invalid`），而 `embedder_openai.py` 的 `DEFAULT_BATCH_LIMIT` 是 20 ⇒ 重建的实体/百科/卡片三遍按 `DEFAULT_PAGE_SIZE=500` 整页发（本机 297 实体 / 51 百科各一页）**整批被拒、零写入**，而 run 仍报 `succeeded`（遍内 `except` 记账继续）。修复 = `DEFAULT_BATCH_LIMIT 20→10`（连同新用例 `test_the_generic_embedder_sends_batches_the_endpoint_can_take`：**默认**批上限下 25 片必须拆 10/10/5）。**RED** 1 红（`assert 20 == 10`）→ **GREEN** 19 passed → **neuter** 常量回 20 ⇒ 恰好该 1 红、revert 后 md5 回 `acf8e628…`；ruff 双净；宽面 `tests/knowledge` **1226 passed / 2 skipped / 3 failed**，3 红是**环境条件**（本机真实 `config.yaml` + `rag_config.json` 的 rag 块让「什么都不设 ⇒ 默认百炼」「缺 key ⇒ 须抛」两个前提失效），**A/B**：`DEER_FLOW_CONFIG_PATH`（干净 `config.example.yaml`）+ `DEER_FLOW_RAG_CONFIG_PATH`（`{}`）同指**仓外**文件后 3 passed。

**① 复验读数**（同一查询 `SKU-1001、无线机械键盘、库存数量、单价`，库=「测试2」，三路 = 向量最高分 / 百科最高分 / 图谱腿）：修后 v4 **未重建**（对照组）= `0.754915` / `0.047743645`（任务队列）/ 12 节点·14 关系·5 证据 → 造跨空间（`embedding_model` → `text-embedding-v3`）= `0.754915` / **`0.039683253`** / **0 实体**（「未找到相关的实体。」）→ 触发重建（202 → `succeeded`；窗口 **44 次 embeddings 全 200、零 400**，`kb_chunks` / `kb_entities` / `kb_wiki_entries` 三集合均有写入）= **恢复** `0.754915` / **`0.8633182`** / 25 节点·10 关系（`top_k=6` 时 **6 条证据 = 登记值 6**）→ 还原 v4 + 重建 ⇒ 终态 `0.754915` / `0.8412111` / 25 节点·14 关系·5 证据（k=6 时 message 注明「候选池共 5 片，已全量返回」）。**向量腿全程不变**（`0.754915`）⇒「不变或更好」成立。**⭐ 附带发现**：修前那次「对照组」本身就是旧的跨空间态 —— 同一条查询、同一个 v4 空间，重建前后 wiki `0.0477 → 0.8412`、图谱节点 `12 → 25` ⇒ 「重建只重嵌切片」留下的历史陈旧向量在本修复后**被真正修掉**（plan 那句「别把『本来就正常』当修复证据」反向命中：修前的"正常读数"并不正常）。

**② 面板级 + 载荷级都过**：`/workspace/knowledge` →「测试2」→「检索测试」三路徽标 = 向量通道 `jina-reranker-v2-base-multilingual relevance`、图谱通道 `embedding cosine`（证据 5 / 实体 25）、百科通道 `embedding cosine`，与载荷 `score_type` 一致。可选腿（临时开 `graph_rerank`）未做。⚠️ 同刻 `api.jina.ai` 变为**外网不可达**（DNS 被污染、直连与 `127.0.0.1:7897` 代理两条路都 `000`）⇒ 面板后两次运行 `degrade to RRF order`，**徽标不变**（徽标是配置口径、非本跑口径 —— 与 Task 3 用例④同一条设计）。

**③ TEI docker 腿**：镜像与模型下载撞上同一时段的外网故障（`ghcr.io` / `huggingface.co` / `registry-1.docker.io` 全 `000`）⇒ 镜像走 `ghcr.nju.edu.cn` 镜像、模型走 ModelScope 直下（TEI 自带下载器吃不了 hf-mirror：`Header content-range is missing`），`--model-id /data/model` 绑挂载（⚠️ Git Bash 会把 `/data/model` 改写成 Windows 路径 ⇒ 必须 `MSYS_NO_PATHCONV=1`）。起服日志 `Ready`；**裸探两形状**：TEI `{"query","texts","raw_scores"}` ⇒ 200（`0.0012680654` / `0.000037307`），通用 `{"model","query","documents","top_n"}` 打同一地址 ⇒ **422 `missing field 'texts'`**。配 `tei-rerank`（地址 `http://127.0.0.1:8080`、`rerank_model=BAAI/bge-reranker-base` 只当徽标、不进请求）后：网关 `POST http://127.0.0.1:8080/rerank 200`，向量腿 5 条**带分** `[0.99493295, 0.35044152, 0.321558, 0.321558, 0.20433685]`、榜首仍是「产品库存台账.xlsx」、徽标 `BAAI/bge-reranker-base relevance`；graph/wiki 两腿不动。**对照组** `generic-rerank` 指同一地址 ⇒ 网关 `422` + `rerank unavailable, degrading to RRF order`（向量腿 5 条**无分**、`rank` 1..5）—— 与计划预期「422 / 空榜」差在**不空**：走的是既有降级路径。收尾：容器 `docker rm -f`、`rag_config.json` 逐字节还原（md5 回 `b0cc81b51c409225e26a737ee78f50b8`），应用侧 `GET /api/rag/config` 复核一致（密钥只报「已设」）。证据全文与探针脚本：`pr-build/rag-retrieval-followups-2026-09-25/notes.md`。

---

## Task 7 — 文档同步 + 交付后回写

> 动到的文件：`README.md:115`、`backend/AGENTS.md:876`（+ `:757-763` 的"恰好两个案例"名单）、`frontend/AGENTS.md`（仅措辞受影响时）；spec 与 plan 的 `**Status:**`。

- [x] **README.md:115**：重建索引那句"重新嵌入现有切片" → 全部向量（切片/实体/百科条目/人工卡片），并补"不重跑图谱抽取"。
- [x] **backend/AGENTS.md:876**：`POST /{kb_id}/reindex` 的描述同步（三条集合 + 三键进度）；`:757-763`：保存期检查"恰好两个案例"的措辞跟上（`generic-rerank` 缺地址那条此后是一族，`tei-rerank` 同规则）；**`:851`**（RAG 配置段末句 "it re-embeds the stored chunks and never re-parses" ⇒ 改成四类向量；2026-09-25 审查新发现的一处）。
- [x] **frontend/AGENTS.md**：仅当重建状态/轮询说明的措辞受影响时改（初核：`:284` 一带只讲轮询节奏 ⇒ 大概率不动，据实）。
- [x] **交付后回写**：spec 的 `**Status:**` 与 plan 本文件的 `**Status:**` 一起更新（交付的提交号 + 关键门禁数字），各 Task 的 `**实测**` 行补齐 —— **未回写的 plan 不算交付**。另：**开头"未提交"一句随之更新**（spec+plan 的第一笔提交号）。

**实测（2026-09-25）**：

- **README（计划点名 `:115` + 计划没点名的 `:113`）**：`:115` 重建索引句 ⇒ 「按库重新嵌入**全部向量**——切片、实体、百科条目与人工卡片一起换到新的向量空间。它只重嵌入、**不重解析**源文件，也**不重跑图谱抽取**」；`:113` 的 provider 枚举只列了「重排可走百炼，或通用 `/rerank`」，而本对新增了 `tei-rerank` ⇒ 补成「通用 `/rerank`（Cohere / Jina 形状），或自建 Text Embeddings Inference 的 `/rerank`」（用户可见能力，按仓库口径 README 要跟上）。其余语言版本无「重建」字样（`grep -ln 重建 README*.md` 只命中 `README.md`）⇒ 不动。
- **backend/AGENTS.md（计划点名 3 处 + 本对自身新增的 1 处）**：① `:757` 保存期检查的「exactly two cases」⇒ 改成 rerank 侧**一族**（只有一个 `dashscope` 自带端点，`generic-rerank` 与 `tei-rerank` 都需 `rerank_base_url`）+ parse 侧一条；② `:851` 段末句 ⇒ 「re-embeds every vector collection from the stored rows (chunks, entities, wiki entries, manual cards) and never re-parses nor re-runs graph extraction」；③ `:876` 路由表 `POST /{kb_id}/reindex` ⇒ 四集合（chunks → entities → wiki entries → manual cards）+ 进度四键（`documents_done` 与 `chunks_indexed` / `entities_indexed` / `wiki_entries_indexed` / `cards_indexed`）；④ **计划没点名的第四处 `:1180`** —— 那段「Rows per embedding call are capped **per model**, not by one constant」只讲了百炼原生腿的 `DASHSCOPE_*`，而 Task 6 修掉的正是通用客户端的单一常量 ⇒ 补一句（通用客户端没有逐模型表，固定 `DEFAULT_BATCH_LIMIT` = 10，2026-09-25 真栈实测：20 行同样 400，297 行的重建页曾被一次拒掉、零写入，而 run 仍报 `succeeded`）。
- **frontend/AGENTS.md：据实不动**。`:283-287` 的断言是「the copy states that source files are not re-parsed」—— 两个 locale 的现行文案逐字仍写着「不重解析源文件」/「source files are not re-parsed」⇒ 断言未失真；该段不枚举集合、也不点名 provider（`:176` 的规则本来就说「the lock follows the _row_」，`tei-rerank` 的加入不需要改文档）。旁证：全文 `tei-rerank` / `score_type` / `召回测试` **零命中** ⇒ 无第二处待同步。
- **Status 回写**：spec 与 plan 的 `**Status:**` 均改为「✅ 已交付（2026-09-25）」并写入交付轨迹（首笔 `ea7f6ffc`（spec+plan 成对）→ `66670d97` T1 / `648123ab` T2 / `e7fa594f` T3 / `3c353ca6` T4 / `69ca4600` T5 → `3f248276`（验收途中修的真缺陷）→ `5b94dcb9` T6 → 本笔 T7）与收官门禁；spec 尾部「两份均未提交」⇒「**均已提交**，轨迹见上」。
- **文档门禁**：plan 与 spec 的 prettier「偏离区块数」HEAD 4 → work **4**、HEAD 11 → work **11**（`printWidth` 默认；prose 段落 prettier 不重排 ⇒ 新增行零新债）。README / `backend/AGENTS.md` **不在 prettier 门禁内**（本仓唯一配置在 `frontend/`，pre-commit 的 `files: ^frontend/` 不含它们）⇒ 据实不量、也不 `--write`。
- **本 Task 无代码改动**（纯文档）⇒ 不跑代码门禁；已核 `git status` 只含本 Task 的四个文档 + 别线文件（`docs/superpowers/specs/2026-09-12-harness-run-status-failure-design.md` 属他线，未动）。