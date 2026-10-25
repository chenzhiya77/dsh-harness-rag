# RAG Vector Space Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth middle-column tab「向量空间」to the knowledge-base detail view, projecting the four Qdrant collections (chunks/entities/wiki/cards — one shared 1024-dim dense space) onto an interactive 2D/3D scatter, with a dual-channel retrieval overlay (recall test + normal RAG chat) as the differentiating capability. This plan only decomposes implementation tasks; all design decisions live in the spec.

**Spec:** `docs/superpowers/specs/2026-08-15-rag-vector-space-visualization-design.md`（已定稿）
**基线：** `342b71f4`（spec 提交，分支 `feat/rag-knowledge-base`）

**Architecture:** Backend gains a pure `knowledge/projection/` package (reducer / fetcher / cache) plus two endpoints on the existing `knowledge_bases` router. Frontend mounts a lazy-loaded echarts canvas behind a mockable adapter, extends `KnowledgeMiddleTab` with `vectors`, and lifts recall results + the latest chat turn's citations to page-level state for the overlay.

**Tech Stack:** numpy（PCA 自实现，SVD 走 `anyio.to_thread`）+ FastAPI（backend）；echarts + echarts-gl（`next/dynamic` 懒加载）+ rstest（frontend）。

**Global Constraints:**
- Branch: `feat/rag-knowledge-base`（沿用当前工作分支）; each task: RED → GREEN → regression proof (revert→RED→restore→GREEN) → commit (Conventional Commits).
- Backend TDD mandatory: `cd backend && uv run pytest <file> -q`；frontend DOM tests (`pnpm test`)，收尾 `pnpm check` + `ruff` 双净。
- Integration tests touching real Qdrant use marker `requires_qdrant`（本地 `docker start qdrant`）。
- Known code facts (verified 2026-08-15, pre-construction):
  - 四 collection 共享 1024 维 dense 空间；payload 均带 `kb_id`（chunks 另带 `doc_id/doc_name/entities`，entities 带 `name/type/description`，wiki/cards 带 title）——scroll 按 `kb_id` 过滤即可。
  - chunks payload **无正文** → hover preview 必须按 `chunk_id` 回业务 DB join `chunks.text[:120]` + `heading_path`。
  - `chunks` 表**无 `created_at`**，仅有 nullable `last_edited_at`（Phase-3 P2）→ 指纹公式 `count(*) + max(last_edited_at)`。
  - `KnowledgeCitation.chunk_id` 已存在，`sourcesForAssistantMessage`（citations.ts）已解析每轮引用 → 对话联动零后端取数。
  - `middle-tabs.tsx` 三 tab `forceMount` keep-alive；`KnowledgeMiddleTab = "documents" | "wiki" | "recall"` 需扩展 `"vectors"`。
  - numpy 当前仅由 qdrant-client 传递引入 → 必须在 harness `pyproject.toml` 显式声明。
  - 前端零图表库；`performance-budgets.json` 需为 echarts 异步 chunk 加预算条目。
  - blockbuster 纪律：PCA 的 SVD 是 CPU 密集计算，必须 `anyio.to_thread`，不得阻塞事件循环。

## Task 1: P1 降维引擎——numpy PCA 纯函数 + transform ✅ 已完成（2026-08-15）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/projection/__init__.py` ✅
- Create: `backend/packages/harness/deerflow/knowledge/projection/reducer.py` ✅
- Create: `backend/tests/knowledge/projection/__init__.py` + `test_reducer.py` ✅（tests/knowledge 子目录惯例带 __init__.py）
- Modify: `backend/packages/harness/pyproject.toml`（numpy 显式声明）+ `uv.lock` ✅

- [x] RED test: 11 用例（主方向余弦 >0.99 / variance_ratio 单调递减且主导 / transform 与手算一致 / 尺度不变性 / 未见过 query 投影 / dims 校验 / 空输入 / 点数少于 dims 零填充 / 零向量保护 / l2_normalize / umap 未装报错）。collection error 确认 RED。
- [x] Implement: 中心化 + `np.linalg.svd`；`PCAModel` frozen dataclass（transform 内重复 fit 期归一化，fit/transform 永不漂移）；`umap_reduce` 延迟 import 抛 `UmapUnavailableError`（带安装提示，供 API 层转 400）。
- [x] GREEN（11 passed）；revert proof：移走 reducer.py → collection error → 恢复 → 11 passed。
- [x] ruff check/format 双净；`uv lock` 同步（numpy 提升为直接依赖）。
- [x] Commit: `feat(rag): add PCA projection reducer with query transform support`（`5db87d50`）

## Task 2: P2 数据获取与采样层 ✅ 已完成（2026-08-15）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/projection/fetcher.py` ✅
- Create: `backend/tests/knowledge/projection/test_fetcher.py` ✅
- Modify: `backend/packages/harness/deerflow/knowledge/vector_store.py` ✅（Plan 外追加但属必然：fetcher 需要公开访问器——新增 `scroll_collection`（分页 id+payload）与 `retrieve_vectors`（按原生 point id 批量取 dense））
- Modify: `backend/tests/knowledge/test_vector_store.py`（追加 2 个 requires_qdrant 集成用例）✅

- [x] RED test: 11 fake 单测（四 collection 合并与 source_type 标注 / 阈值下不采样 / 超阈值 ID 先拉+子采样+确定性种子 / 仅 chunks 采样 / 预览截断 120 / DB 缺失回退 doc_name / 向量缺失静默丢弃且矩阵对齐 / 空 KB / collection 选择限定 / 10000 硬顶 / 未知 collection ValueError）+ 2 集成用例（scroll 分页+kb 过滤 / retrieve 对齐）——ModuleNotFoundError 与 AttributeError 双边 RED 确认。修正过一次测试自身 bug（模拟 scroll 后删除需 fake 支持 drop_on_retrieve）。
- [x] Implement fetcher（采样上限 10000 硬顶；返回 `total_points/shown_points/sampled`）。
- [x] GREEN（projection 24 + vector_store 13 = 35 passed，含真实 Qdrant）；revert proof 通过。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): add projection fetcher with id-subsampling and preview join`（`a0b49031`）

## Task 3: P3 投影缓存与内容指纹 ✅ 已完成（2026-08-15）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/projection/cache.py` ✅
- Create: `backend/tests/knowledge/projection/test_cache.py` ✅
- Modify: `backend/packages/harness/deerflow/knowledge/store.py` ✅（Plan 外必然追加：指纹的 DB 侧信号源 `get_kb_content_stats`，一次 session 四条聚合查询；顺带把 `count_chunks` 的局部 func import 收进顶部）

- [x] RED test: 8 用例——指纹命中不重算（compute 计数断言）/ 指纹变化重算并替换（后续命中拿到新值）/ `refresh=True` 跳过比对 / 10 并发只算一次（1 False + 9 True）/ key 独立 / 指纹函数确定性+五路信号敏感 / store stats 聚合（含 kb 隔离、编辑翻转、空 kb 零值）。
- [x] Implement 进程内缓存 `{(kb_id, algo, dims, sample_size): CachedProjection}`（per-key 双检锁；fingerprint/created_at 由 cache 统一填，compute 只管算）。
- [x] GREEN（projection 29 passed）；revert proof 通过。修过一次测试数据 bug（graph_entities.id 是必填 String 主键）。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): cache vector projections behind a content fingerprint`（`b56c691f`）

## Task 4: P4 API 契约——投影端点 + query 投影端点 ✅ 已完成（2026-08-15）

**Files:**
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（GET `/vector-projection` + POST `/vector-projection/query`）✅
- Modify: `backend/app/gateway/services/knowledge_service.py`（双方法 + 双异常 + 可注入 ProjectionCache + `_projection_response`）✅
- Modify: `backend/packages/harness/deerflow/knowledge/projection/cache.py`（+`peek` 只读查找，Plan 外小追加）✅
- Create: `backend/tests/knowledge/test_vector_projection_api.py` ✅

- [x] RED test（对齐 `test_chunk_edit_api.py` 基建）: 11 用例——GET 全契约（points schema / `cached` 二次命中 / `sampled` / `fingerprint` / `computed_ms` / dims=2 无 z）；空 KB 200 空点；`algo=umap` 未装 → 400 带提示；`dims=4` → 422（FastAPI Query 校验，泛 4xx 语义）；未知 kb → 404；未知 collection → 400；`refresh=true` 重算；POST 先 GET 建缓存 → 200 坐标+同指纹；无缓存 → 409；非 PCA 模型 → 409；空文本 → 422。修正过一次 fake 设计（scroll 需按 kb_id 过滤才能表达空 KB）。
- [x] Implement service + router（SVD 走 `anyio.to_thread`；query embed 复用 `DashScopeEmbedder` 局部 import 链；query 端点不触发投影计算）。
- [x] GREEN（11 API + 29 projection + 9 chunk_edit + 5 recall = 54 passed）；revert proof（stash 三实现文件 → 10 failed → 恢复 → 11 passed）。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): expose vector projection and query-transform endpoints`（`8bbc9d95`）

## Task 5: 前端 api client + 第四 tab 挂载 ✅ 已完成（2026-08-15）

**Files:**
- Modify: `frontend/src/core/knowledge/api.ts` / `types.ts` / `hooks.ts` ✅（类型对齐 Task 4 实测契约：含 `model_version`/`shown_points`/`heading_path`；`VectorProjectionParams` 放 api 层对齐 WikiGenerateMode 先例）
- Modify: `frontend/src/components/workspace/knowledge/middle-tabs.tsx`（`KnowledgeMiddleTab` 扩 `"vectors"` + TabsTrigger/TabsContent + 必填 `vectors: ReactNode` prop）✅
- Modify: `frontend/src/core/i18n/locales/types.ts` / `zh-CN.ts` / `en-US.ts`（`tk.tabs.vectors` = 向量空间 / Vector space）✅
- Modify: `frontend/src/app/workspace/knowledge/page.tsx`（占位 pane，Task 6 填本体）+ `frontend/tests/unit/knowledge/wiki-panel.dom.test.tsx`（renderTabs 基建补 vectors prop——必填 prop 的编译强制）✅
- Create: `frontend/tests/unit/knowledge/vector-tab.dom.test.tsx` ✅

- [x] RED test: 第四个 trigger 渲染「向量空间」；点击切 tab pane active；四 pane `forceMount` keep-alive。（3 用例，初始 3 failed 确认）
- [x] Implement client/types/hook + tab 挂载（pane 空态占位，`vector-space-placeholder`）。`useVectorProjection` lazy 门控（对齐 wiki 列表先例）；`useProjectVectorQuery` mutation（对齐 recall test 纪律——live embedding 不缓存）。
- [x] `pnpm test` GREEN（3 新 + 22 MiddleTabs 回归）；revert proof：stash 9 个实现文件 → 3 failed → 恢复 → 25 passed；`pnpm check` 双净。
- [x] Commit: `feat(frontend): mount the vector space tab in the knowledge middle column`（`41577ef8`）

## Task 6: P5 2D 散点 + 着色 + hover/详情联动 ✅ 已完成（2026-08-15）

**Files:**
- Modify: `frontend/package.json` + `pnpm-lock.yaml`（echarts@5.6.0 + echarts-gl@2.1.0；echarts 钉 5.x 保 echarts-gl peer 兼容）✅
- ~~Modify: `frontend/performance-budgets.json`~~（有意不动：budget 脚本只测 per-route SSR HTML 引用资源，`next/dynamic ssr:false` 异步 chunk 天然不进测量面；新增条目反而触发 route-was-not-measured 失败。已记录于提交消息）
- Create: `frontend/src/components/workspace/knowledge/vector-tab.tsx`（数据/交互 + `groupPointsIntoSeries` 着色分组：FNV-1a 稳定哈希调色板，wiki/card 固定色）与 `vector-canvas.tsx`（echarts 适配层，`next/dynamic ssr:false`；2D scatter + source_type 形状双编码 + tooltip label+preview + inside dataZoom + 点击分发）✅
- Modify: `frontend/src/app/workspace/knowledge/page.tsx`（接线：`enabled` 懒门控 + `indexingDocCount` + chunk 点击回查 documents 开抽屉）+ i18n 三处（`tk.vectorSpace.*`）✅
- Modify: `frontend/tests/unit/knowledge/vector-tab.dom.test.tsx`（+10 VectorTab 用例；canvas mock 断言 props）✅

- [x] RED test: 工具栏渲染（4 chips / 2D·3D / 算法 / 重新计算——后两者 disabled 待 Task 7）；着色分组（5 组断言：chunk=doc、entity=type、wiki/card 单色）；加载/空/错误三态；chips 开关参数化；算法切换；enabled 透传；点击四型分发（chunk→doc 抽屉、wiki→条目抽屉、card→卡片抽屉、entity 惰性）；索引中提示。
- [x] Implement 双组件 + echarts scatter 配置生成（含 tooltip escapeHtml）。
- [x] `pnpm test` GREEN（36 passed：14 新 + 22 回归）；revert proof（stash 4 tracked + 移走 2 新组件 → 文件级 RED → 恢复 → 14 passed）；`pnpm check` 0 error（2 存量 warning 非本次引入）。踩坑记录：Radix ToggleGroup single 的 Item 是 `role=radio`（不是 button）；Radix Select 在 jsdom 用 `keyDown ArrowDown` 打开（对齐 human-input-card 先例）。
- [x] Commit: `feat(frontend): render the 2D vector scatter with coloring and drill-down`（`3e426052`）

## Task 7: P5 3D 切换 + 采样徽标 + 重新计算 ✅ 已完成（2026-08-15）

**Files:**
- Modify: `frontend/src/components/workspace/knowledge/vector-tab.tsx`（dims state 驱动 ToggleGroup + 采样徽标 + 重新计算接通）/ `vector-canvas.tsx`（scatter3D 分支：`Scatter3DChart` from `echarts-gl/charts` + `Grid3DComponent` from `echarts-gl/components`——**grid3D 安装器在 echarts-gl 而非 echarts/components**，tsc 实证）✅
- Modify: `frontend/src/core/knowledge/hooks.ts`（`useRecomputeVectorProjection`：refresh=true 直打 + `setQueryData` 回写主缓存键——单键无副本）+ i18n 三处（`sampledBadge`）✅
- Modify: `frontend/rstest.config.ts`（`bundleDependencies` +echarts-gl/claygl——两者都是无扩展名 ESM，Node 严格解析拒绝；对齐 streamdown/katex 先例）✅
- Modify: `frontend/tests/unit/knowledge/vector-tab.dom.test.tsx`（+4 用例；Task 6 的 3D/重算 disabled 断言翻转为 enabled）✅

- [x] RED test: 切 3D → hook params `dims=3` 且 canvas props `dims=3`（scatter3D 配置属 canvas 内部，mock 下断言到 props 边界）；`sampled=true` → 徽标「已抽样 5000/12345 点」+ 反例隐藏；「重新计算」→ recompute.mutate 带当前视图参数（refresh=true 拼装在 hook 一行内，Live 冒烟兜底）。初始 4 failed 确认。
- [x] Implement。
- [x] `pnpm test` GREEN（18 passed）；全量回归 157 文件 1278 passed（rstest.config.ts 改动面广，必须全量）；revert proof（stash 7 文件 → RED → 恢复 → 18 passed）；`pnpm check` 双净。
- [x] Commit: `feat(frontend): add 3D projection mode and sampling controls`（`1f1de75a`）

## Task 8: P6 检索联动双通道 ✅ 已完成（2026-08-19）

**Files:**
- Modify: recall 面板组件（结果区「在向量空间查看」按钮）✅ `recall-test-panel.tsx`
- Modify: `frontend/src/components/workspace/knowledge/page.tsx` / `chat-panel.tsx`（recall 结果 + 最新一轮对话引用提升到 page 层共享 state）✅
- Modify: `frontend/src/components/workspace/knowledge/vector-tab.tsx`（叠加层：query 星标 + 命中点高亮/连线/score 色深 + 「跟随对话」开关 + 叠加徽标一键清除）✅
- Modify: `frontend/tests/unit/knowledge/vector-tab.dom.test.tsx`（+ recall/chat 联动用例）✅

- [x] RED test: recall 点击「在向量空间查看」→ 切 tab + overlay（query 点 + 命中高亮）；对话完成一轮（含引用）→ overlay 自动更新；`fingerprint` 不一致 → 丢弃旧 overlay 并提示；`algo=umap` → 联动禁用提示；「跟随对话」关闭 → overlay 冻结。
- [x] Implement 状态提升 + 叠加渲染 + POST `/vector-projection/query` 调用。
- [x] `pnpm test` GREEN；regression proof；restore。
- [x] Commit: `feat(rag): retrieval overlay on vector space with star marker and clear badge (Task 8)`（`c6dbfbc3`）+ 运行时修复两枚：①`lines3D`→`line3D`（lines3D 仅支持 globe/geo3D 坐标系，cartesian3D 下渲染崩）；②`EmbeddingResult` 未解包导致 query 端点生产 500（fake 与真实契约漂移）+ 视图参数透传修 409。UX 迭代：query 菱形→五角星（path://）+ 透明 0.85；叠加徽标（query 文本+命中 m/n+× 清除）。
- [x] 追加修复 Commit: `fix(rag): restore card-point hover tooltip via adaptive halo bucketing`（`19009f16`）——桶内单点的 GL 系列 hover 拾取静默失效（卡片 3 点分 6 桶全部无 tooltip），桶数自适应：<4×桶数降单桶。

## Task 9: 文档同步 + 全量回归 + Live 冒烟 ✅ 已完成（2026-08-19）

**Files:**
- Modify: `backend/AGENTS.md`（RAG 小节补投影段）
- Modify: `docs/superpowers/specs/2026-08-15-rag-vector-space-visualization-design.md`（状态翻转「已落地」+ 日期）
- Create: `pr-build/rag-vector-space-*.png`（冒烟截图）

- [x] Spec 状态翻转为「✅ 已落地」；AGENTS.md 落档。
- [x] `cd backend && uv run pytest tests/knowledge -q` 全量 GREEN（366 passed, 2 skipped）；`ruff check/format` 双净。
- [x] `cd frontend && pnpm test && pnpm check` 双净（knowledge 域 34 文件 339 passed；echarts chunk 为 `next/dynamic ssr:false` 异步加载，不进 per-route SSR 预算测量面）。
- [x] Live 冒烟（真实 key + Qdrant）：
  | 冒烟项 | 步骤 | 预期 | 结果 | 证据 |
  |---|---|---|---|---|
  | 投影出图 | JVM 知识库 → 向量空间 tab | 四类点同图分色，hover 预览，点击开详情 | ✅ 通过（卡片 hover 修复后全类可拾取） | `pr-build/rag-vector-space-scatter.png` |
  | 缓存命中 | 二次打开 + 改动文档后「重新计算」 | 命中 <200ms；重算后指纹变化 | ✅ 通过（warm 命中实测 ~78ms） | 响应 `cached:true` + `computed_ms` |
  | 检索联动 | recall 检索 → 「在向量空间查看」 | 一键切 tab + query 落点 + 命中高亮连线 | ✅ 通过（命中 5/5） | `pr-build/rag-vector-space-recall-overlay.png` |
  | 对话联动 | 右栏对话一轮（含引用）→ 切向量 tab | 该轮 query 落点与命中叠加可见 | ✅ 通过（「JVM 堆内存和方法区分别存什么」→ 命中 8/8 自动叠加） | `pr-build/rag-vector-space-chat-overlay.png` |
- [x] Commit: `docs(rag): sync agent guides and spec status for vector space visualization`
