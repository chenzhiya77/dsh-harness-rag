# RAG Graph-Path Quality (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the phase-2 graph-path quality upgrades from the supplemental spec: semantic evidence selection (D1: dedupe → per-source caps → hop0 guarantee with round-robin payout → pure-score competition), pruned graph expansion (D2: semantic gate + node budget + hub guard), incremental cross-slice entity re-resolution (D3), and removal of the redundant elastic back-query channel (D4).

**Spec:** `docs/superpowers/specs/2026-08-10-rag-graph-quality-design.md`（所有设计决策的单一事实源；本 plan 只负责任务拆解，不复述设计论证）。主 spec `2026-08-07-rag-knowledge-base-design.md` §4.2/§4.7 已含交叉引用。

**Architecture:** 在线侧改动集中在 `graph_search_tool.py`：候选收集与选取逻辑抽为可纯测模块 `knowledge/graph/retrieval.py`，工具本体只做 IO 编排（Qdrant 取向量、业务库取文本）。离线侧 D3 新增 `knowledge/graph/resolver.py`，由 worker 在 `index_document_graph` 完成后触发，失败降级不阻断主流程。所有新旋钮走 `config.yaml` 的 `rag.*`。

**Tech Stack:** 同一期（Python 3.12 / Qdrant named vectors / NetworkX+SQLite / DashScope embedder + qwen3-rerank / pytest+asyncio）。零新增外部依赖。

**Global Constraints:**
- 分支：沿用 `feat/rag-knowledge-base`（一期尚未合入，spec 未提交改动也在其上）；每个 task：RED → GREEN → 回归证明（revert→RED→restore→GREEN）→ commit（Conventional Commits）。
- 纯逻辑（候选收集/限流/两阶段选取/扩展剪枝/别名聚类）必须是**不依赖 Qdrant 与数据库的纯函数**，单测直接构造输入；IO 仅存在于 `vector_store`/`store`/工具编排层。
- 集成测试（`requires_qdrant`）需要本地 Qdrant：`docker start qdrant`。
- 所有新配置键放 `RagConfig`（`backend/packages/harness/deerflow/config/app_config.py`）+ `config.example.yaml`，默认值 = spec 起始值；配置可近似还原一期行为（限流设大、阈值设 0、保底设 0）。
- 工具返回契约：`message` 文案格式不变；`evidence` 项新增可选 `score` 字段（当次打分通道原始分，仅同次结果内可比）；工具入参不变。
- Backend TDD mandatory: `cd backend && uv run pytest <file> -q`；收尾 `make lint && make format` 干净。

## Task 1: D1 证据选择重构（含通道③调用移除）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/graph/retrieval.py`（纯函数：候选收集/限流/两阶段选取）
- Modify: `backend/packages/harness/deerflow/knowledge/vector_store.py`（新增 `get_chunk_vectors`）
- Modify: `backend/packages/harness/deerflow/tools/builtins/graph_search_tool.py`（编排重写 + 移除③调用 + evidence 增 `score`）
- Modify: `backend/packages/harness/deerflow/config/app_config.py`（RagConfig 增 7 键）、`config.example.yaml`
- Modify: `backend/packages/harness/deerflow/knowledge/graph/normalizer.py`（`_cosine` 提升为公开 `cosine_similarity`，内部引用同步，行为不变）
- Create: `backend/tests/knowledge/graph/test_retrieval.py`
- Modify: `backend/tests/knowledge/tools/test_graph_search.py`、`backend/tests/test_rag_config.py`

**接口契约（实现前冻结）：**
- `retrieval.py`:
  - `@dataclass Candidate`: `chunk_id: str`、`entity_sources: set[str]`、`edge_sources: set[tuple[str, str]]`、`hop: int`（实体源取实体 hop；边源取两端 hop 较小值；多源取最小）。
  - `collect_candidates(graph, hop_by_node: Mapping[str, int]) -> dict[str, Candidate]`：边两端均在 `hop_by_node` 才收边通道；节点通道收全部 seen 节点；按 `chunk_id` 去重、来源合并（通道③彻底不进此函数）。
  - `apply_source_caps(candidates, scores: Mapping[str, float], *, per_entity_cap: int, per_edge_cap: int) -> None`：每个实体源/边源内部按分数降序保留 top-cap，超出者从对应来源集合移除；来源全空的候选删除。
  - `select_evidence(candidates, scores, entity_scores: Mapping[str, float], hop0_names, *, guarantee: int, limit: int, hop_penalty: float = 0.0) -> list[str]`：阶段一逐轮出资——实体按 `(-entity_score, name)` 排序，每轮每个 hop0 实体出 1 条其实体内最高分未入选切片，至多 `guarantee` 轮，预算耗尽即停（不足额实体出了就完；已被他实体出资覆盖的切片自然跳过）；阶段二全部剩余候选按 `-(score - hop_penalty × hop)`、同分按 `(hop, chunk_id)` 排序填充剩余名额。
- `vector_store.get_chunk_vectors(chunk_ids) -> dict[str, list[float]]`：`client.retrieve(chunks_collection, ids=[_point_id(c) for c in chunk_ids], with_vectors=True)`，取 `point.vector["dense"]`；缺失点静默跳过。
- RagConfig 新增：`graph_per_entity_cap: int = 3`、`graph_per_edge_cap: int = 2`、`graph_hop0_guarantee: int = 2`、`graph_evidence_limit: int = 8`、`graph_rerank: bool = False`、`graph_rerank_threshold: int = 12`、`graph_hop_penalty: float = 0.0`。

**编排新流程（`_graph_search_impl`）：** 查询实体抽取（不变）→ 新增一次 `embedder.embed([query], text_type="query")` 得 query 向量 → 落地匹配并记录 `seed_scores`（同一图实体多 query 命中取最大分）→ BFS 扩展（本 Task 仅补 `hop_by_node` 跟踪，剪枝属 Task 2）→ `collect_candidates`（删除 `scroll_chunks_by_entities` 调用）→ 打分：默认 `get_chunk_vectors` + 余弦（复用 normalizer 的余弦，提升为公开函数 `cosine_similarity`）；`graph_rerank=True` 且候选数 > `graph_rerank_threshold` 时先取全量候选行文本走 `DashScopeReranker.rerank`，`RerankerError` 降级回 embedding 序 → `apply_source_caps` → `select_evidence` → `get_chunks_by_ids(selected)`（返回序=传入序，天然保序）→ evidence 项附 `score`。

- [x] 写失败测试 `test_retrieval.py`：去重（边+节点重复命中只留一份）；每实体 5 切片限到 3、每边 4 限到 2（按分取）；保底取 hop0 实体内切片分 top-2；溢出逐轮出资（5 个 hop0×2>8 预算 → 每实体 ≥1 条、实体分高者先得第 2 条、尾部不为 0——禁止瀑布）；不足额实体出了就完；重叠来源切片被 E1 出资后 E2 取下一条未选；竞争阶段纯切片分排序（hop1 高分压过 hop0 低分，`hop_penalty=0`）；同分 `(hop, chunk_id)` 决胜；`hop_penalty>0` 实验路径改变次序；hop0 边切片不进保底但可经竞争上浮；条数截断。
- [x] 写失败测试（`test_graph_search.py` 集成 + `test_rag_config.py`）：evidence 项含 `score`；spy 断言 `scroll_chunks_by_entities` 不再被调用（patch 为抛错仍搜索成功）；`graph_rerank=True` + 低阈值时假 reranker 决定顺序、`RerankerError` 时落回 embedding 序；既有 `test_graph_search_expands_and_fetches_evidence` 等不断言旧拼接顺序的用例保持 GREEN；新配置键默认值/覆盖加载。
- [x] 运行 `uv run pytest tests/knowledge/graph/test_retrieval.py tests/knowledge/tools/test_graph_search.py tests/test_rag_config.py -q`，捕获 RED。
- [x] 实现 `retrieval.py` + `get_chunk_vectors` + 编排重写 + 配置键 + `config.example.yaml`；工具模块 docstring 与测试文件 docstring 同步删掉 "entities payload back-query" 描述。
- [x] 测试 GREEN；revert `select_evidence` 的逐轮出资为瀑布式，证明溢出用例 RED，restore，GREEN。
- [x] Commit: `feat(rag): rank graph evidence by semantic scores with guarantee-plus-competition selection`。

## Task 2: D2 扩展剪枝

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/graph/retrieval.py`（新增 `expand_neighborhood`）
- Modify: `backend/packages/harness/deerflow/knowledge/vector_store.py`（新增 `get_entity_vectors`）
- Modify: `backend/packages/harness/deerflow/tools/builtins/graph_search_tool.py`（BFS 替换为 `expand_neighborhood` 调用）
- Modify: `app_config.py` + `config.example.yaml`（3 个新键）
- Modify: `backend/tests/knowledge/graph/test_retrieval.py`、`backend/tests/knowledge/tools/test_graph_search.py`

**接口契约：**
- `vector_store.get_entity_vectors(kb_id, names) -> dict[str, list[float]]`：按 `_entity_point_id` 批量 retrieve，缺失跳过。
- `async expand_neighborhood(graph, seed_scores: Mapping[str, float], *, hops: int, query_vector, fetch_vectors: Callable[[list[str]], Awaitable[Mapping[str, list[float]]]], neighbor_min_score: float = 0.4, max_expanded_nodes: int = 25, hub_degree_threshold: int = 50) -> ExpansionResult`（`seen` / `hop_by_node` / `entity_scores` 三字段）：
  1. hop0 = 图内 seed，`entity_scores` = 落地分；
  2. 逐跳：先对 frontier 应用**枢纽守护**——`degree > hub_degree_threshold` 且非 hop0 且 `entity_score < neighbor_min_score` 的节点不扩散其邻居；收集 frontier 全部前驱+后继候选名，一次性 `fetch_vectors` 批量取向量，**语义剪枝**只留余弦 ≥ `neighbor_min_score` 者（向量缺失按 0 分剪除），写入 `hop_by_node`/`entity_scores`；
  3. **节点预算**：`|seen| > max_expanded_nodes` 时保留全部 hop0 + 按 `(-score, name)` 截断其余；
  4. `hops` 语义不变；空 seen 由调用方照旧返回"未找到"。
- RagConfig 新增：`graph_neighbor_min_score: float = 0.4`、`graph_max_expanded_nodes: int = 25`、`graph_hub_degree_threshold: int = 50`。
- 已知默认行为说明（写进函数 docstring）：默认参数下枢纽守护的拦截分支仅当配置放松入口不变式（如阈值设 0）时触发，hop0 豁免是主路径；邻居语义分即 D1 的实体分副产品。

- [x] 写失败测试 `expand_neighborhood`（纯函数，stub `fetch_vectors`）：低于阈值邻居被剪、≥阈值保留；向量缺失被剪；hop 标记正确（1/2 跳）；hop0 高扇出枢纽低分仍扩展（豁免）；非 hop0 枢纽高分扩展/低分拦截（构造注入 `entity_scores` 覆盖两分支）；预算截断保 hop0 + 高分邻居；`hops=1` 不扩第二跳。
- [x] 写失败测试（集成）：既有 `test_graph_search_expands_and_fetches_evidence` 传入 `neighbor_min_score=0.0`（one-hot embedder 下异词余弦为 0，必须走一期行为还原路径——同时验证配置可还原一期）；新增用例以共享维度的相关向量构造"相关邻居过闸/无关邻居被剪"。
- [x] 运行捕获 RED。
- [x] 实现 `expand_neighborhood` + `get_entity_vectors` + 工具替换 + 配置键。
- [x] GREEN；revert 语义剪枝阈值判断，证明相关用例 RED，restore，GREEN。
- [x] Commit: `feat(rag): prune graph expansion semantically with node budget and hub guard`。

## Task 3: D3 增量全局实体再归一

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/graph/resolver.py`
- Modify: `backend/packages/harness/deerflow/knowledge/graph/normalizer.py`（抽出公开 `cluster_alias_groups(names, name_vectors, similarity_threshold) -> dict[str, list[str]]`，复用 `_alias_key`/`cosine_similarity`/并查集，`normalize_extraction` 行为不变）
- Modify: `backend/packages/harness/deerflow/knowledge/graph/store.py`（新增 `merge_entities`、`rewrite_relation_endpoints`）
- Modify: `backend/packages/harness/deerflow/knowledge/store.py`（新增 `rewrite_chunk_entities(chunk_ids, name_map)` 批量重写 chunks.entities 列）
- Modify: `backend/packages/harness/deerflow/knowledge/graph/indexer.py`（`GraphIndexStats` 增 `touched_entities: set[str]`）
- Modify: `backend/packages/harness/deerflow/knowledge/worker.py`（触发 resolver + 失败降级）
- Modify: `app_config.py` + `config.example.yaml`（2 个新键）
- Create: `backend/tests/knowledge/graph/test_resolver.py`；Modify: `test_normalizer.py`、`test_graph_store.py`、`test_graph_indexer.py`、`test_worker.py`

**接口契约：**
- `resolver.resolve_entity_aliases(store, graph_store, vector_store, wiki_store, embedder, *, kb_id, touched_entities, full_scan_threshold: int = 500, similarity_threshold: float = 0.92) -> ResolutionStats(scanned, merged_groups, merged_entities)`：
  - 范围：`list_entities(kb_id)` 总数 < `full_scan_threshold` → 全表；否则 `touched_entities` + 其一跳邻居（经 `list_relations` 端点）；touched 为空且图 ≥ 阈值 → 直接返回零统计。
  - 聚类：`cluster_alias_groups`（代表名 = `list_entities` 名字典序首个，确定性）；名称向量走 `vector_store.get_entity_vectors`（Task 2 已建）。
  - 每组副作用链（幂等，Qdrant 无事务——幂等即恢复手段）：① `graph_store.merge_entities`（description 片段去重追加、`source_chunk_ids` 并集、type 补空、删被合并行）；② `rewrite_relation_endpoints`（端点重写为代表名、同 `(source,target,relation)` 合并复用 upsert 语义、自环删除）；③ `vector_store.delete_entities(aliases)` + 代表名按合并后 description 重 embed 并 `upsert_entities`；④ `store.rewrite_chunk_entities`（业务库列）+ `vector_store.set_chunk_entities`（payload）双写，保持镜像不变量；⑤ `wiki_store.mark_dirty_for_titles({代表名} ∪ {别名})`。
- RagConfig 新增：`graph_resolution_full_scan_threshold: int = 500`、`entity_merge_similarity: float = 0.92`（worker 同时传给 `index_document_graph` 的 `name_similarity_threshold`，两处 0.92 收敛为单一配置）。
- worker 编排：`stats = await index_document_graph(...)` → `try: await resolve_entity_aliases(..., touched_entities=stats.touched_entities)` → `except Exception: logger.exception` + 在文档 `error` 字段追加 `entity-resolution failed` 子标记（读出现存 error、`; ` 拼接、已含则不重复——不覆盖 `graph degraded`）→ 照常 `ready` + `_maybe_generate_wiki`（wiki dirty 已在 resolver 内完成，生成链路自然消化）。

- [x] 写失败测试 `test_resolver.py`：表面别名合并（`Model`/`Models` 跨切片两行 → 一行，描述去重追加、chunk 并集）；向量相似 ≥0.92 合并 / <0.92 不动；代表名确定性；关系端点重写 + 重复三元组合并 + 自环丢弃；`kb_entities` 别名向量删除 + 代表重 embed；chunks 业务库列与 payload 双写替换；wiki dirty 覆盖代表名与别名；二次运行零合并（幂等）；图 < 阈值全表扫描可合并非 touched 别名对、≥ 阈值仅 touched+一跳范围。
- [x] 写失败测试：`test_graph_store.py`（`merge_entities`/`rewrite_relation_endpoints` 单测）、`test_graph_indexer.py`（stats 携带 touched_entities）、`test_worker.py`（resolver 抛错 → 文档仍 ready、error 同时含 `graph degraded` 与 `entity-resolution failed`、wiki 生成未被阻断）、`test_normalizer.py`（`cluster_alias_groups` 与 `normalize_extraction` 回归）。
- [x] 运行捕获 RED。
- [x] 实现 resolver + 各 store 方法 + worker 接线 + 配置键。
- [x] GREEN；revert 副作用链第②步端点重写，证明对应用例 RED，restore，GREEN。
- [x] Commit: `feat(rag): merge cross-slice entity aliases after document graph indexing`。

## Task 4: D4 通道③方法清理

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/vector_store.py`（删 `scroll_chunks_by_entities`）
- Modify: 涉及 docstring/注释中"elastic back-query"的残留描述（如 `set_chunk_entities` docstring 中 "elastic one" 措辞改为切片可视化/提及标注地基定位）

- [x] Grep 全仓确认 `scroll_chunks_by_entities` 零调用方（`backend/` 与 `frontend/` 均无引用；Task 1 已移除唯一调用）。
- [x] 删除方法；运行 `uv run pytest tests/knowledge -q` 全量 GREEN（含 `test_vector_store.py` 若有该方法的直接单测，一并删除）。
- [x] Commit: `refactor(rag): drop redundant entities back-query from vector store`。

## Task 5: 文档同步与全量回归

**Files:**
- Modify: `backend/AGENTS.md`（图谱路检索描述更新：两阶段证据选取、语义剪枝扩展、再归一时机）、`docs/superpowers/specs/2026-08-10-rag-graph-quality-design.md`（头部状态：待评审 → 已落地）

- [x] 按仓库文档同步规则更新 `backend/AGENTS.md` 知识图谱检索小节（参数走 `rag.*`、一期行为可配置还原的说明）；spec 状态翻转为已落地并标注日期。
- [x] 一期行为近似还原验证：配置限流 999/`graph_neighbor_min_score: 0`/`graph_hop0_guarantee: 0`，对 tools 集成夹具跑一次 graph_search，确认实体/关系/证据覆盖与一期一致（仅顺序可能不同）。
- [x] `cd backend && uv run pytest tests/knowledge -q` 全量 GREEN；`make lint && make format` 干净。
- [x] Commit: `docs(rag): sync agent guides and spec status for graph quality phase`。

## Final verification

- [x] `cd backend && uv run pytest tests/knowledge -q` 全量 GREEN（Qdrant 本地运行）。— 195 passed, 1 skipped（Task 5）。
- [x] `make lint && make format`（ruff check + format）干净。— 1152 files already formatted（Task 5）。
- [x] Live 冒烟（真实 key + Qdrant）：上传 1 篇小文档 → 索引 ready 且无 `entity-resolution failed` 标记 → 图谱问题回答带证据；用 `docker exec` 或 API 抽查被合并实体（若语料含别名对）的 description/`source_chunk_ids` 并集正确。— `backend/tests/knowledge/test_phase2_smoke.py`（含 Plugin/Plugins 跨切片别名对语料）：ready 无降级标记、alias 组唯一（无 Plugins 残留）、graph_search 真实链路带证据带 `score`；live 侧别名分叉未出现（DeepSeek 抽取层自行单复数归一），合并副作用链的确定性验证由 `test_resolver.py` 承担。
- [x] 改造前后对比数据留档：同一测试问题集在一期行为配置 vs 二期默认配置下的 graph_search 证据命中差异，记入 PR 描述，为召回测试 API 与 D5 硬编排评估供数。— 夹具对比（确定性）：restored `[doc-t-c0, doc-t-c1]` ⊃ default `[doc-t-c0]`（语义闸门剪除弱相关邻居切片）；live 对比受真实 LLM 两次抽取抖动影响（restored 第二次落地未命中），以夹具数据为准。
