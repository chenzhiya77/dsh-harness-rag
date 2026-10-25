# RAG Knowledge Graph Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fifth middle-column tab「知识图谱」to the knowledge-base detail view, rendering `graph_entities` / `graph_relations` as an interactive force-directed graph (Louvain community coloring, mention-count sizing, drill-down to chunks/documents), with a differentiating graph_search retrieval-path overlay (seed → expansion → evidence three-layer highlighting).

**Spec:** `docs/superpowers/specs/2026-08-19-rag-graph-visualization-design.md`（已定稿）

**基线：** `0a1b5ec6`（向量空间 Task 9 docs 提交，分支 `feat/rag-knowledge-base`）

**Architecture:** Backend adds a pure `graph/communities.py` (Louvain wrapper) plus one read-only endpoint on the existing `knowledge_bases` router — no cache, no migration, no new dependency. Frontend mounts a lazy-loaded echarts `graph` (force) canvas behind the vector-space adapter pattern, extends `KnowledgeMiddleTab` with `"graph"`, and lifts graph_search retrieval traces to page-level state for the overlay (mirroring the `vectorOverlay` precedent).

**Tech Stack:** networkx Louvain（已有显式依赖）+ FastAPI（backend）；echarts `graph` 系列 force layout（已有依赖，**零新增**）+ rstest（frontend）。

**Global Constraints:**
- Branch: `feat/rag-knowledge-base`（沿用当前工作分支）; each task: RED → GREEN → regression proof (revert→RED→restore→GREEN) → commit (Conventional Commits).
- Backend TDD mandatory: `cd backend && uv run pytest <file> -q`；frontend DOM tests (`pnpm test`)，收尾 `pnpm check` + `ruff` 双净。
- Integration tests touching real Qdrant use marker `requires_qdrant`（本 plan 预计用不上——图数据全在 SQLite）。
- Known code facts (verified 2026-08-19, pre-construction):
  - `GraphStore.list_entities/list_relations(kb_id)` 现成返回全量 dict；**无 mention_count 列**——`len(source_chunk_ids)` 即提及数。
  - 实体名即节点 id（KB 内唯一，`uq_graph_entities_kb_name`）；关系端点是实体名；**关系有向**（渲染必须带箭头）。
  - `nx.community.louvain_communities(G, seed=42)` 内置可用；**固定种子**保着色稳定；社区 id 按规模降序重编号。
  - 检索轨迹现成：`graph/retrieval.py::ExpansionResult`（seen/entity_scores/hop）；P4 仅需 tool 层透传，不动检索逻辑。
  - `KnowledgeMiddleTab = "documents" | "wiki" | "recall" | "vectors"`（middle-tabs.tsx），四 pane `forceMount` keep-alive；扩 `"graph"` 纯增量。
  - echarts 5.6 + echarts-gl 2.1 已在依赖中；`graph` 系列 + `layout:"force"` 开箱即用，**本 plan 零新前端依赖**。
  - 向量空间留下的可复用资产：`buildTooltipHtml` / `truncate` / `escapeHtml` / `DIMMED_OPACITY` / FNV-1a 调色板 / 叠加徽标模式 / `next/dynamic ssr:false` 适配层模式 / canvas mock 测试基建。
  - blockbuster 纪律：Louvain 百节点 <10ms 无需 to_thread；**端点不做缓存**（现算永远最新，spec §3）。

## Task 1: P1 图数据端点——社区检测纯函数 + GET /graph ✅ 已完成（2026-08-19）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/graph/communities.py`（Louvain 包装纯函数）
- Create: `backend/tests/knowledge/graph/test_communities.py`
- Modify: `backend/app/gateway/services/knowledge_service.py`（+`get_knowledge_graph`）
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（+GET `/{kb_id}/graph`）
- Create: `backend/tests/knowledge/test_graph_api.py`（对齐 test_vector_projection_api.py 基建）

- [x] RED test（communities 纯函数）: 固定种子确定性（同输入两次同社区划分）/ 孤立节点独立社区 / 社区 id 按规模降序（0=最大）/ 空图返回空 / 单节点 / 自环边剔除 / 幽灵端点跳过（7 用例）。
- [x] Implement `assign_communities(entities, relations) -> dict[name, int]`（有向转无向参与 Louvain；seed=42 钉死；规模降序重编号，同数按最小名字典序保完全确定性）。
- [x] RED test（API）: nodes/edges 契约 schema / `mention_count == len(source_chunk_ids)` / 空 KB 200 空图 + stats 零值 / 未知 kb 404 / 两次请求社区一致（4 用例，初始 3 failed 确认）。
- [x] Implement service + router（全量读 → 内存建图 → 社区检测 → 响应；无缓存无 to_thread）。
- [x] GREEN（graph/ 全套 86 passed 含既有回归）；revert proof：stash 实现 + 移走 communities.py → collection error RED → 恢复 → GREEN。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): expose the knowledge graph endpoint with Louvain communities`（`d25754cc`）

## Task 2: 前端 api client + 第五 tab 挂载 ✅ 已完成（2026-08-19）

**Files:**
- Modify: `frontend/src/core/knowledge/types.ts`（`KnowledgeGraphNode/Edge/Response`）/ `api.ts`（`getKnowledgeGraph`）/ `hooks.ts`（`useKnowledgeGraph` lazy 门控，对齐 useVectorProjection 先例）
- Modify: `frontend/src/components/workspace/knowledge/middle-tabs.tsx`（`KnowledgeMiddleTab` 扩 `"graph"` + 第五 TabsTrigger/TabsContent + 必填 `graph: ReactNode` prop）
- Modify: `frontend/src/core/i18n/locales/types.ts` / `zh-CN.ts` / `en-US.ts`（`tk.tabs.graph` = 知识图谱 / Knowledge graph）
- Modify: `frontend/src/app/workspace/knowledge/page.tsx`（占位 pane，Task 3 填本体）+ 既有 tab 测试文件补 graph prop（必填 prop 编译强制）
- Create: `frontend/tests/unit/knowledge/graph-tab.dom.test.tsx`

- [x] RED test: 第五个 trigger 渲染「知识图谱」；点击切 tab pane active；五 pane forceMount keep-alive（3 用例确认 RED——TS 编译错 + 断言失败）。踩坑：Radix Tabs automatic 激活在 **mousedown** 触发（fireEvent.click 不切换），断言锁定 `[data-slot='tabs-content']`（对齐 vector-tab 先例）。
- [x] Implement client/types/hook + tab 挂载（pane 空态占位 `graph-space-placeholder`）。query key 走函数族惯例 `knowledgeGraphKey(kbId)`。
- [x] `pnpm test` GREEN（3 新 + 56 相关回归）；revert proof（stash 6 实现文件 → 编译/断言 RED → 恢复 → 3 passed）；`pnpm check` 双净（eslint import/order 自动修复一次）。
- [x] Commit: `feat(frontend): mount the knowledge graph tab in the knowledge middle column`（`0b33c9e2`）

## Task 3: P2 力导向图渲染 + 编码 + hover/点击钻取 ✅ 已完成（2026-08-19）

**Files:**
- Create: `frontend/src/components/workspace/knowledge/graph-canvas.tsx`（echarts 适配层：`graph` 系列 force layout，`next/dynamic ssr:false`）
- Create: `frontend/src/components/workspace/knowledge/graph-tab.tsx`（数据/工具栏/图例/钻取分发）
- Modify: `frontend/src/app/workspace/knowledge/page.tsx`（接线：enabled 懒门控 + 实体点击 → 关联切片列表 → 文档抽屉，复用向量空间 drill-down 链路）
- Modify: i18n 三处（`tk.graphSpace.*`）
- Create: `frontend/tests/unit/knowledge/graph-canvas.unit.test.ts`（编码纯函数）
- Modify: `frontend/tests/unit/knowledge/graph-tab.dom.test.tsx`

- [x] RED test: 编码纯函数——mention_count √开方 → symbolSize 10–28 档位 / type FNV-1a 稳定着色 / 边有向箭头配置 / tooltip 复用 buildTooltipHtml（label+preview 各 20 字）；tab 三态（加载/空/错误）；点击实体 → 抽屉 → onOpenChunk 分发（12 用例）。后端补 RED 断言：节点透传 source_chunk_ids（钻取链路唯一数据源）。
- [x] Implement 双组件 + force 配置（repulsion 120 / edgeLength 40–120 / gravity 0.1；roam/draggable/layoutAnimation: true；emphasis.focus=adjacency 邻居高亮 echarts 内置）。范围微调：GET /graph 节点补 source_chunk_ids（spec §5 钻取必需，Task 1 遗漏）；chunk_id 内嵌 doc_id 直接解析，零新端点。
- [x] `pnpm test` GREEN（23 = 12 新 + 挂载回归；knowledge 全量 363 passed）；revert proof（移走双组件+stash 修改 → 编译 RED → 恢复 → GREEN）；`pnpm check` 双净（next/dynamic 懒加载需 waitFor 异步挂载断言；eslint --fix import/order 一次）。
- [x] 浏览器实测（286 实体 · 255 关系 · 80 社区）：出图分色成簇 / 边箭头 / 节点+边 tooltip / 点击实体 → 抽屉 → 切片 → 文档预览抽屉全链路通；console 干净。
- [x] Commit: `feat(frontend): render the force-directed knowledge graph with drill-down`（`82ffb271`）

## Task 4: P3 搜索定位 + 局部图模式 + 着色切换 ✅ 已完成（2026-08-19）

**Files:**
- Modify: `frontend/src/components/workspace/knowledge/graph-tab.tsx`（搜索框 + 着色 ToggleGroup + 局部图面包屑）
- Modify: `frontend/src/components/workspace/knowledge/graph-canvas.tsx`（搜索聚焦居中 / 邻居模式数据裁剪 / 社区色板）
- Modify: `frontend/tests/unit/knowledge/graph-tab.dom.test.tsx` / `graph-canvas.unit.test.ts`

- [x] RED test: 搜索命中 → 聚焦+居中 / 无命中提示；着色切换 type↔community 两色板互斥（默认社区）；局部图模式只留 N 跳邻居（默认 1 跳）+ 面包屑返回；hover 邻居高亮（echarts adjacency 内置，Task 3 已钉断言）。纯函数 9 新用例（colorBy/matchEntityNames/filterNeighborhood）。
- [x] Implement。踩坑：dom 测试整体 mock graph-canvas 会把 tab import 的纯函数一并换掉 → **纯函数拆到独立 `graph-utils.ts`**（echarts-free，jsdom 直测），canvas 仅留组件层并 re-export 保持测试路径不变。搜索居中用 `getItemLayout`（内部 API，类型收窄断言）+ 500ms 布局稳定窗；双击进入局部图（单击=抽屉保留，Obsidian 惯例）。
- [x] `pnpm test` GREEN（37 passed）；revert proof 通过；`pnpm check` 双净（删多余 eslint-disable）。
- [x] 浏览器实测：搜索「JVM」→ 居中放大 + 邻居高亮其余淡化；按类型着色切换生效；双击「跨平台」→ 局部图 2 跳（Java 中心放射图）→ 面包屑返回全局。
- [x] Commit: `feat(frontend): add graph search, neighborhood mode, and coloring modes`（`cece5869`）

## Task 5: P4 graph_search 路径高亮联动（三层染色）✅ 已完成（2026-08-20）

**Files:**
- Modify: `backend/packages/harness/deerflow/tools/builtins/graph_search_tool.py`（响应透传 trace：seed_entities / expanded_nodes(+hop) / evidence_entities——**只序列化输出，不动检索逻辑**）
- Modify: `backend/tests/knowledge/tools/test_graph_search.py`（trace 字段断言）
- Modify: `frontend/src/components/workspace/knowledge/chat-panel.tsx`（graph trace 上报，对齐 latestRetrievalTurn 先例）+ `page.tsx`（`graphOverlay` state 提升 + 「跟随对话」开关状态两 tab 共享）
- Modify: `frontend/src/components/workspace/knowledge/graph-canvas.tsx`（overlay 三层染色）/ `graph-tab.tsx`（徽标 + 清除 + 指纹漂移清除，指纹=node_count+edge_count）+ `vector-tab.tsx`（followChat 受控化）
- Modify: `frontend/src/core/knowledge/types.ts`（`GraphRetrievalTrace/GraphRetrievalOverlay`）+ `citations.ts`（`parseGraphSearchTrace`/`latestGraphTraceTurn`）
- Modify: i18n 三处（徽标文案「种子 m / 扩展 n / 证据 k」+ 跟随对话 + 清除 + 漂移提示）
- Modify: `frontend/tests/unit/knowledge/graph-tab.dom.test.tsx` / `graph-canvas.unit.test.ts` / `citations.test.ts` / `chat-panel.dom.test.tsx`

- [x] RED test（后端）: graph_search 响应含三层 trace 字段 + hop 信息完整 + 语义门剪枝反映 + 空响应恒带空 trace（4 用例，内存 fake vector store 免 Qdrant，初始 KeyError 确认 RED）。
- [x] RED test（前端）: overlay 三层染色（种子红描边放大 #f5222d / hop-1 橙 #fa8c16 hop-2 黄 #fadb14 / 证据实心红星标 path:// / 其余 0.12 淡化含边）；徽标三层计数 + × 清除；指纹漂移清除 + toast；「跟随对话」冻结/解冻；恒等去重（21 用例确认 RED）。
- [x] Implement 后端 `_build_trace` 透传（证据实体 = 选中切片的实体/边来源端点并集；种子/证据按名排序、扩展按 (hop,name) 排序保契约稳定）+ 前端全链路（chat-panel 上报 → page `graphOverlay`/共享 followChat → tab 状态机 → canvas 叠加）。叠加单变更走 merge 更新（只换 series data/links 整体数组，保留力导向布局与视口——对齐向量空间槽位教训）；数据变更走全量重建并经 overlayRef 携带最新叠加。
- [x] `pnpm test` GREEN（161 文件 1396 用例全量）+ `uv run pytest tests/knowledge -q` GREEN（381 passed）；双端 revert proof（stash 实现 → RED → 恢复 → GREEN）；`pnpm check` 双净（optional-chain 修复一处）+ ruff check/format 双净。踩坑：单测 fixture 角色互斥（同节点不可既验 hop 色又验证证据优先）——拆五节点各饰一角。
- [x] Commit: `feat(rag): overlay graph_search retrieval paths on the knowledge graph`（`6c46a994`）
- [x] 2026-08-20 发光描边重设计（用户实测反馈三缺陷：红星覆盖类型色 / 非命中灰化丢上下文 / 路径边无高亮）：填充一律保留，层语义改由描边+发光+尺寸承载，非命中节点不灰化，命中路径边荧光金发光（`2bd7e53b`）；随即两层合并重设计（用户拍板「两层够了」+ 配色拍板「命中红 / 路径金」）：命中（种子∪证据，红发光描边，种子额外放大）/ 路径（hop 合并，金细边，与路径边同色一体化），徽标保留三层数字分解（视觉两层、数字三层）；spec §7 染色表已同步。同日实测修复：证据实体洪泛——`evidence_entities` 原定义为「提及证据切片的全部实体」，稠密图谱一切片被 8–29 实体共提（实测 median 16），命中层洪泛致「全部红边」；修为证据锚点归因（每切片归因最强单一来源：hop 最小 → 实体分最高 → 名字典序），有界于证据条数，后端 `_build_trace` 改动 + 2 个锚点精度测试。

## Task 6: 文档同步 + 全量回归 + Live 冒烟

**Files:**
- Modify: `backend/AGENTS.md`（RAG 小节补图可视化段）
- Modify: `docs/superpowers/specs/2026-08-19-rag-graph-visualization-design.md`（状态翻转「已落地」+ 日期）
- Create: `pr-build/rag-graph-*.png`（冒烟截图）

- [x] Spec 状态翻转为「✅ 已落地」（完成）；AGENTS.md 落档。
- [x] `cd backend && uv run pytest tests/knowledge -q` 全量 GREEN（382 passed, 2 skipped; 2026-08-20）；`ruff check/format` 双净。
- [x] `cd frontend && pnpm test && pnpm check` 双净（2026-08-20）。
- [x] Live 冒烟（真实数据 JVM 知识库，286 实体/255 关系）：
  | 冒烟项 | 步骤 | 预期 | 结果 | 证据 |
  |---|---|---|---|---|
  | 图出图 | JVM 知识库 → 知识图谱 tab | 力导向图出图，大小/颜色编码正确，hover 详情 | ✅ Pass (2026-08-19 浏览器实测) | pr-build/rag-graph-base.jpg |
  | 点击钻取 | 点击实体 → 切片列表 → 文档 | 抽屉链路走通 | ✅ Pass (2026-08-19 浏览器实测) | pr-build/rag-graph-drilldown.jpg |
  | 搜索 + 局部图 | 搜索实体名 → 邻居模式 | 定位居中 + N 跳裁剪 + 面包屑返回 | ✅ Pass (2026-08-19 浏览器实测) | pr-build/rag-graph-neighborhood.jpg |
  | 路径高亮 | 对话一轮（图谱路有命中）→ 切图谱 tab | 命中红/路径金两层染色 + 徽标计数 | ✅ Pass (2026-08-21 新对话实测：种子 11 · 扩展 3 · 证据 5，锚点有界) | pr-build/rag-graph-overlay.png |
- [x] Commit: `docs(rag): sync agent guides and spec status for graph visualization`（`bf96ca55`）；后续实测追加修复亦已入库——证据锚点洪泛修复 `f2832b7c` / 两层红金编码 `eaefd371` / hover 邻域加法高亮 `1121658d` / stats 底部居中浮层 `974a013c`。冒烟截图已采集（2026-08-21）。

## Task 7a: 着色治理——20 色板 + 社区邻接图贪心着色（Welsh-Powell）✅ 已完成（2026-08-21）

**背景**（2026-08-21 设计拍板）：现有 `COMMUNITY_PALETTE` 仅 10 色取模回绕——当前 80 社区已是每色 8 个社区共享；1 万实体预计 500+ 社区，相邻社区大概率同色，「按社区着色」丧失区分意义。类型着色保持 FNV 哈希不变（类型数量少、无邻接概念，不值得上图着色）。

**设计**：色板扩 20 色 + **社区邻接图贪心着色（Welsh-Powell）**——社区间有边即相邻，按社区度降序逐社区分配「邻居未占用的最小色号」，色号耗尽才取模回绕（撞色也撞在远距离社区，视觉无感）。与 LOD 的 cluster 层天然契合（SuperNode 少，Top-N 鲜明色足够）。

**Files:**
- Modify: `frontend/src/components/workspace/knowledge/graph-utils.ts`（`COMMUNITY_PALETTE` 扩 20 色 + `buildCommunityColorMap` 纯函数；`communityColor` 签名改为走 colorMap）
- Modify: `frontend/src/components/workspace/knowledge/graph-canvas.tsx`（着色调用改走 colorMap）
- Modify: `frontend/tests/unit/knowledge/graph-canvas.unit.test.ts`

**核心算法**（`buildCommunityColorMap(nodes, edges) → Map<communityId, colorIndex>`）：
1. 构建社区邻接图：边两端社区不同 → 两社区相邻
2. 按社区度降序排序（同度按社区 id 字典序，保确定性）
3. 顺序分配「邻居未占用色号中**全局使用次数最少的**」（同次数取最小编号）；色号全被邻居占用时取模回绕

> 2026-08-21 实测修正：初版分配「邻居未占用的**最小**色号」，在稀疏图上塌缩——286 节点/255 边/80 社区的 JVM 库中大多数社区无跨社区边（度 0），全部撞色号 0（八成节点蓝色）。改为全局使用次数最少的可用色号后，孤立社区自然轮转铺开，相邻异色硬约束不变。

- [x] RED test：相邻社区异色 / 无邻接社区轮转铺开 / 社区数超色板时回绕确定性（同输入恒同输出）/ 空图返回空 / 单社区色号 0 / 类型着色不受影响 / series 级集成（7 用例，初始 6 failed 确认）。
- [x] Implement + revert proof（stash 双实现文件 → 6 failed RED → 恢复 → GREEN）+ `pnpm test` GREEN（161 文件 1408 用例）+ `pnpm check` 双净。
- [x] 浏览器实测：JVM 库（80 社区）相邻社区不再同色；首轮实测暴露「最小色号」策略在稀疏图塌缩（孤立社区全蓝），修为「全局使用次数最少的可用色号」后复测通过（20 色均匀铺开）。
- [x] Commit: `feat(frontend): assign community colors via Welsh-Powell greedy graph coloring`（`a7316bd6`）

## Task 7b: LOD 分层渲染——规模扩展（1000+ 节点性能保障）

**背景**：随着文档数增长，实体数指数级上升。当前 286 实体尚可流畅渲染，但 1000+ 节点时 Canvas 2D 帧率骤降、标签密集遮挡、视觉混乱；force 布局 O(n²) 在 1 万节点直接卡死主线程。本任务实现 **Level of Detail (LOD)** 分层渲染策略，对齐 Google Maps 心智模型：**缩放 = 地图层级；任何层级下检索命中都可见**。

**与现有设计的冲突裁决（2026-08-21 拍板）**：

| 冲突 | 裁决 |
|---|---|
| 聚合层 ×「按类型」着色 | SuperNode 跟随全局 colorBy 取「主导值」：社区模式=社区色；类型模式=社区内 mention 最高的**主导类型色** |
| hover × 聚合层 | 分流：实体节点=现有邻域加法提亮不变；SuperNode=自身蓝描边+tooltip 概要（成员数/Top 成员/主导类型），**不做邻域提亮**（SuperNode 邻居是其他社区，语义价值低） |
| 检索叠加 × 聚合层 | **命中社区上卷**：含命中实体的 SuperNode 加红描边+命中数角标（trace 实体名→community→SuperNode 聚合，纯前端）；实体层照现有红/金描边 |

**核心设计**：五层 Zoom 分级渲染，数据层（renderTier）与视觉层（labelTier）解耦，平滑过渡。**detail 层修正为「引导层」**——LOD 的价值是缩略态不面对全量节点；看细节走「双击进社区局部图」的数据裁剪（复用现有 neighborhood 模式），而不是硬渲全图。

**激活门控（2026-08-21 拍板）**：`totalNodes ≤ LOD_MIN_NODES（500）时 LOD 完全不激活**，任何 zoom 都走现有全量模式——小库（如当前 286 实体的 JVM 库）零行为变化，聚合对小库是丢信息而非优化。只有大库才进入五层分级。

| Zoom 区间 | RenderTier | 渲染内容 | 标签策略 | 边显示 | 节点上限 |
|-----------|-----------|---------|---------|--------|---------|
| `< 0.2` | `cluster` | 仅超级节点（社区聚合） | 超级节点名 + 成员数 | 隐藏 | ~50 |
| `0.2~0.6` | `hub` | 超级节点 + 每社区 Top 3 枢纽 | 仅枢纽标签 | 枢纽间粗边 | ~200 |
| `0.6~0.9` | `all-important` | 重要节点（mention≥2） | 仅重要节点标签 | 重要节点间边（细线） | ~1000 |
| `> 0.9` | `all-full`（引导层） | 总数 ≤ 2000 时全量；超出时显示「双击社区进入局部图」引导 | 全部标签 + hideOverlap | 全部边 | **硬上限 2000** |

**Files:**
- Modify: `backend/app/gateway/services/knowledge_service.py`（`get_knowledge_graph` 响应补 `topMembers` / `totalMentions` 字段，预计算社区 Top 3 枢纽）
- Modify: `backend/tests/knowledge/test_graph_api.py`（新字段断言）
- Modify: `frontend/src/components/workspace/knowledge/graph-utils.ts`（`renderTierForZoom` / `buildSuperNodes` / `buildSuperEdges` / `buildTieredSeries` / `rollupOverlayToSuperNodes` 纯函数）
- Modify: `frontend/src/components/workspace/knowledge/graph-canvas.tsx`（graphRoam 监听增加 renderTier 判断 + 跨 tier 重建 series + 平滑过渡动画 + hover 分流）
- Modify: `frontend/src/components/workspace/knowledge/graph-tab.tsx`（面包屑显示当前层级 + 钻取 SuperNode zoom-to-fit）
- Modify: `frontend/src/core/knowledge/types.ts`（`SuperNode` / `RenderNode` 联合类型）
- Modify: `frontend/tests/unit/knowledge/graph-canvas.unit.test.ts` / `graph-tab.dom.test.tsx`

**数据结构（向后兼容）**：
- `KnowledgeGraphNode` 不变
- 新增 `SuperNode`：`{ kind: 'super', id, community, name, memberCount, memberIds, totalMentions, topMembers, dominantType }`
- 联合类型 `RenderNode = { kind: 'super', data: SuperNode } | { kind: 'entity', data: KnowledgeGraphNode }`

**核心算法**：
- `renderTierForZoom(zoom, totalNodes)`：门控（totalNodes ≤ 500 恒返回全量档）→ 阈值判断（0.2 / 0.6 / 0.9）→ 2000 硬上限熔断
- `buildSuperNodes(nodes, edges)`：按 community 分组 → 按 mention_count 排序 → Top 3 为枢纽 + 主导类型
- `buildSuperEdges(edges, nodeToCommunity)`：跨社区边聚合（权重 = 原边数）
- `buildTieredSeries(allNodes, allEdges, tier)`：按 tier 返回对应数据子集
- `rollupOverlayToSuperNodes(trace, nodeToCommunity)`：命中社区上卷（裁决 3）

**视觉规范**：
- SuperNode：空心圆（直径 30-80px，= 20+√totalMentions×4）+ 主导值色描边（裁决 1）+ 成员数角标；含命中时红描边+命中数角标（裁决 3）
- HubNode：实心圆（直径 18-40px）+ 社区色填充 + 光环阴影
- 普通节点：现有规格（10-28px）
- 边宽：cluster `1+ln(weight)` / hub 2 / all-important 1 / all-full 1
- 边标签：仅局部图模式显示（原 detail 层职责并入局部图）

**交互行为**：
- 单击 SuperNode → zoom-to-fit 该社区（zoom 0.7 + 居中）
- 双击 SuperNode → 进入该社区局部图（复用 neighborhood 模式）
- 单击/双击实体节点 → 现有行为不变（抽屉/局部图）
- hover 分流（裁决 2）：实体=邻域加法提亮；SuperNode=自身蓝描边+概要 tooltip
- 跨 tier 切换 → 淡出/淡入 300ms 平滑过渡
- 面包屑：`全部 > 社区:AI > 实体:LLM`（清晰位置感知）

**与现有 labelTier 的整合**：
- `renderTier`（数据层）与 `labelTier`（视觉层）解耦
- `shouldShowLabel(node, renderTier, zoom)` 二维判断
- 现有 `labelTierForZoom` 在 `all-important` / `all-full` 层复用

**性能预算**：
- `large: true`（>1000 节点关闭 hover 动画）
- `progressive: 500`（每帧渲染 500 个）
- `labelLayout.hideOverlap: true`
- 预期 FPS：cluster/hub 60 / all-important 45 / all-full（≤2000）40

- [x] RED test（后端）: `/graph` 响应含 `topMembers`（每社区 Top 3）+ `totalMentions` 字段；单成员社区 topMembers 长度 1；空社区跳过（3 用例，初始 3 failed 确认；踩坑：中文名字典序断言以 Unicode 码点为准，「堆」U+5806 < 「字」U+5B57）。
- [x] RED test（前端纯函数）: `renderTierForZoom` 四档边界 + 2000 熔断 + **门控（总数 ≤500 任意 zoom 恒全量档）**；`buildSuperNodes` 聚合正确（成员数/总提及数/Top 3/主导类型）；`buildSuperEdges` 跨社区聚合（权重累加 + 跳过社区内部边 + 幽灵端点剔除 + 无向合并）；`buildTieredSeries` 各 tier 返回正确子集；`rollupOverlayToSuperNodes` 命中上卷（21 用例）。
- [x] RED test（前端 dom）: 社区局部图钻取（面包屑 + 数据裁剪）+ 返回全局 + 双模式互斥 + guide 引导提示显隐 + 局部图内搜索（7 用例）；canvas 内部 roam/tier 重建由纯函数覆盖 + 浏览器实测兑现（echarts jsdom 不可跑，对齐 labelTier 先例）。
- [x] Implement 后端字段透传 + 前端三层数据模型 + 渲染分层 + 三裁决落地 + 平滑过渡。落地备注：SuperNode datum 唯一键用 `community:${id}`（显示名交给 label formatter）；hover 邻域提亮对 SuperNode 天然分流（邻接表查不到社区 id → 只提亮自身，裁决 2 零代码）；cluster 层聚合边显示（1+ln(weight) 粗线，plan 表「隐藏」修正——buildSuperEdges 若无消费者则是死代码，且无边的 SuperNode 是一盘散沙）。
- [x] `pnpm test` GREEN（161 文件 1436 用例）+ `uv run pytest tests/knowledge -q` GREEN（385 passed）；双端 revert proof（后端 stash 2 实现文件 → 3 failed；前端 stash 7 实现文件 → 2 文件 failed）；`pnpm check` 双净 + ruff 双净。
- [x] 浏览器实测 + **实测裁决修正（2026-08-21）**：压测库（1200 实体 / 840 关系）暴露三问题并拍板修正——
  1. **cluster 层移除**：Louvain 在稀疏图上产出大量微社区（1200 节点 → 720 社区，按社区聚合减幅仅 ~3x），SuperNode 阵（720 个空心圆）无概览价值。五层分级修正为**四层**（hub / all-important / all-full / guide），最小档 = hub（每社区 Top3 枢纽，预算 200 截断）；SuperNode / buildSuperNodes / buildSuperEdges / rollupOverlayToSuperNodes / filterCommunity / 社区局部图钻取入口一并移除（onSuperNodeDblClick 链路删除，社区局部图功能取消）。
  2. **标签单维判定**：修复前 renderTier 的 hub/SuperNode 分支覆盖 labelTier 的 hidden 档（二维冲突）→ 缩到最小时 200 个枢纽名字互相遮挡。修正后标签**只由 labelTier（zoom）单维决定**：zoom < 0.6 任何节点零标签（tooltip 承载），渲染层不再另立规则；labelTextForNode 删除，formatter 直走 labelTextForTier。
  3. scaleLimit.min 保持 0.3 不变（cluster 层移除后无需更低缩放；hub 层 0.3~0.6 区间 + 零标签满足缩略态）。
  后端 `communities` 字段保留（hub 层 TopN 枢纽数据源）。guide 层引导文案改为「放大或双击节点进入局部图」（原「双击社区」入口已移除）。
- [x] Commit: `feat(rag): implement LOD-based hierarchical rendering for knowledge graph scalability`（`8f9ce4ff`）
- [x] **搜索定位跨档修复（2026-09-08）**：LOD 上线后暴露「缩略态搜索静默无反应，只有把图放到最大（`all-full` 全量渲染）才能搜」——违背本任务的设计前提「任何层级下检索命中都可见」。根因：定位下标取自全量 `nodes` 数组，而 series data 是**当前档位的子集**，两下标不同空间：越界 → `getItemLayout` 返 undefined → 静默 return；落在子集长度内 → **静默居中到不相干实体**。只有 full/all-full 档两数组 1:1 同序才碰巧对上（≤500 实体的门控小库因此从未复现，286 实体 JVM 库实测也没走到这条分支）。修复三段：
  1. `graph-utils`：抽出 `tierNodeIds`（档位渲染子集单一源，`buildTieredSeries` 改走它）+ `isNodeRenderedAtZoom`（命中可达性）+ `GRAPH_FOCUS_ZOOM = 1.6`（定位 zoom 常量化，tab/canvas 同源）。
  2. `graph-canvas`：定位下标改为在**已渲染数据**里按名解析（`SeriesData.indexOfName`，datum.name = 实体 id）；搜索一律升档到 `renderTierForZoom(GRAPH_FOCUS_ZOOM, N)` 并同步 `renderTierRef`/`labelTierRef`/`onRenderTierChange`——`setOption` 改 zoom **不发 `graphRoam`**，否则档位状态与真实 zoom 脱钩（后续 roam 跨档判定与 guide 引导提示都拿陈旧档位）；升档重建重启力导向模拟 → 再等一个稳定窗（500ms）才读坐标居中。roam 跨档与搜索升档共用抽出的 `rebuildSeriesAtTier`/`applyLabelTier`。
  3. `graph-tab`：命中实体连定位档也渲染不出来（>2000 熔断 `guide` / `mention_count=1` 长尾）→ **自动进该实体 1 跳局部图**（用户 2026-09-08 定案，优于「只弹 toast 让用户自己放大」与「强行并入子集破 2000 硬上限」）；裁剪后子图 ≤ `LOD_MIN_NODES` 恒 full 档，必可居中。即 guide 引导文案「放大或双击节点进入局部图」的自动化执行，面包屑负责回全局。
  回归：graph-canvas 单测 62/62（新增 6 例钉档位可达性与同源一致性）、graph-tab 26/26（新增 3 例：中库不裁剪 / 熔断库自动局部图 / 大库无命中仍 toast，并给小库搜索补「不裁剪」守卫）、knowledge 973 passed | 1 预存无关（chat-panel 模型选择器基线）、`pnpm check` 双净、revert proof（摘掉 tab 兜底 → 自动局部图用例 RED，恢复 GREEN）。canvas 内部升档/居中仍靠浏览器实测兑现（echarts 在 jsdom 不可跑）。

**风险与缓解**：
| 风险 | 缓解措施 |
|------|---------|
| 跨 tier 切换闪烁 | 淡出/淡入 300ms 动画 + `animationDurationUpdate: 300` |
| 超级节点位置漂移 | 使用社区质心 + 固定布局（关闭 force） |
| 钻取后迷失方向 | 面包屑 + 平滑 zoom 动画 + 「返回全部」按钮 |
| 大数据首次加载慢 | 分层加载（先 super 后 detail）+ 骨架屏 |
| 1 万节点 all-full 卡死 | 2000 硬上限熔断 + 引导局部图（五层表修正） |
| 小库被聚合丢信息/体验回归 | 激活门控：totalNodes ≤ 500 时 LOD 完全不生效（2026-08-21 拍板） |

**实施子任务**（建议按序）：
1. 后端：`/graph` 响应扩展（topMembers/totalMentions）
2. 前端 utils：核心算法（renderTierForZoom/buildSuperNodes/buildSuperEdges/buildTieredSeries/rollupOverlayToSuperNodes）
3. 前端 canvas：graphRoam 跨 tier 监听 + series 重建 + 过渡动画 + hover 分流
4. 前端 tab：面包屑 + SuperNode 钻取
5. 测试：纯函数 + dom + 浏览器实测
6. 提交
