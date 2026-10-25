# RAG Phase-2 Batch-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the four phase-2 batch-1 items from the spec: recall-test API + middle-column「检索测试」tab (P1), citation UX rework (P2: type badges + superscript marks + collapsible sources), per-path document status (P3), and parsing extension with upload allowlist (P4) — plus the middle-column tab container with a read-only wiki tab that P1/P2 presuppose.

**Spec:** `docs/superpowers/specs/2026-08-11-rag-phase2-batch1-design.md`（所有设计决策的单一事实源；本 plan 只负责任务拆解，不复述设计论证）。主 spec `2026-08-07-rag-knowledge-base-design.md` 对应位置已含交叉引用。

**Architecture:** 后端改动集中在 `knowledge_bases.py` 路由 + `knowledge_service.py` + `parser.py` + worker/store（path_status）；召回测试复用三个检索 impl，不另起检索逻辑。前端改动集中在 `components/workspace/knowledge/`：中栏单面板改造为 tab 容器（文档/百科/检索测试），引用渲染链路（citations.ts → kb-citation-sources → 正文标记）全面翻新。

**Tech Stack:** 同一期（FastAPI + SQLAlchemy/Alembic + Qdrant；Next.js + react-query + Radix + rstest）。零新增外部依赖。

**Global Constraints:**
- 分支：沿用 `feat/rag-knowledge-base`；每个 task：RED → GREEN → 回归证明（revert→RED→restore→GREEN）→ commit（Conventional Commits）。
- Backend TDD mandatory：`cd backend && uv run pytest <file> -q`；frontend 组件随附 dom 单测（`pnpm test`），收尾 `pnpm check` + `make lint && make format` 干净。
- 集成测试（`requires_qdrant`）需要本地 Qdrant：`docker start qdrant`。
- 已知代码事实（施工前已核查，勿重复踩点）：
  - 中栏当前是 `DocumentPanel` 单面板，**无 tab 容器**；百科 tab 前端不存在（后端 `wiki/entries` API 已在一期落地）。
  - Alembic 在管 knowledge 表（`persistence/migrations/versions/0011_knowledge.py`）；新列走新 revision（`cd backend && make migrate-rev`）。
  - **路由顺序陷阱**：`GET /supported-formats` 必须注册在 `/{kb_id}` 之前，否则被路径参数吞掉。
  - 引用解析层 `citations.ts::parseRetrievalToolContent` 已持有 `toolName`，`source_type` 前端填充即可，**不改后端工具返回**。
  - `progress_percent` 只跟踪图谱路（最慢腿）；向量路完成状态无持久化——P3 的 `path_status` 列即载体。
  - rag agent SOUL 模板在 `backend/packages/harness/deerflow/agents/assets/rag/SOUL.md`（L14 已有 `[n]` 引用规则）。

## Task 1: 中栏 tab 容器 + 百科只读 tab（前端基础设施）✅ 已完成（2026-08-11）

**实施期偏差记录（契约修正）：**
1. `GET wiki/entries` 两个端点**一期并未落地**——存储层（`WikiStore.list_entries/get_entry`）存在但 HTTP 未透出。本 Task 一并补建：service `list_wiki_entries`（列表组装 summary=content[:120]，不含全文）/ `get_wiki_entry`（kb 归属校验，跨库 404）+ 两个 thin router 端点 + 3 个契约测试。
2. plan 原契约"DocumentPanel props 不变、既有测试零改动"**不成立**——三行结构必然要求 header 拆分：props 收窄（移除 onGenerateWiki/onRenameKb/onDeleteKb），库名+⋯菜单上移至 MiddleTabs 第一行；header 相关既有测试迁移至 wiki-panel.dom.test.tsx 的 MiddleTabs describe（覆盖不丢：rename/delete 对话框交互原样搬移）。上传按钮从 ⋯菜单移入文档 tab 工具行（文档动作归文档 tab）。
3. keep-alive 断言方式：Radix `forceMount` 保持挂载但**不加 hidden 属性**——可见性由 `data-[state=inactive]:hidden` 类承担，dom 测试以 `data-state` 断言。
4. `runAfterMenuClose` / 时间格式化抽为共享模块（`run-after-menu-close.ts` / `core/knowledge/format.ts`），DocumentPanel 改引用。
5. 副发现：Radix Tabs 在 happy-dom 中点击不激活（automatic 模式挂 mouseDown），测试用 `fireEvent.mouseDown`。

**验证结果**：后端 197 passed + 1 skipped；前端 knowledge 114 passed；`pnpm check` 干净；ruff check/format 干净。

**Files:**
- Modify: `frontend/src/app/workspace/knowledge/page.tsx`（中栏槽位改造为 tab 容器，`activeTab`/`activeEntryId` 状态提升到 page，供 P2 跳转复用）
- Create: `frontend/src/components/workspace/knowledge/middle-tabs.tsx`（tab 容器：文档 / 百科；P1 在 Task 3 加第三个 tab）
- Create: `frontend/src/components/workspace/knowledge/wiki-panel.tsx`（条目列表：title/summary/status(dirty 徽标)/updated_at；点击 → 右侧抽屉展示全文）
- Modify: `frontend/src/core/knowledge/hooks.ts`（`useWikiEntries` / `useWikiEntry`）、`frontend/src/core/knowledge/types.ts`（`WikiEntrySummary`/`WikiEntry`）
- Modify: i18n `types.ts` / `zh-CN.ts` / `en-US.ts`
- Create: `frontend/tests/unit/knowledge/wiki-panel.dom.test.tsx`、`middle-tabs.dom.test.tsx`

**接口契约（实现前冻结）：**
- `GET /api/knowledge-bases/{kb_id}/wiki/entries` → 列表（title/summary/status/updated_at，不含全文）；`GET .../wiki/entries/{entry_id}` → 全文（一期已落地，直接消费）。
- 中栏 tab 容器契约：`{ documents: <DocumentPanel/>, wiki: <WikiPanel/> }`；`activeTab: "documents" | "wiki"` 由 page 持有；**条目全文抽屉状态独立于 tab**（`entryDrawerId: string | null` 由 page 持有）：`openWikiEntry(entryId)` = 仅开右侧抽屉展示全文（不切 tab——引用点击是验证性动作，叠加层不劫持中栏状态，见 spec §4 修正说明），`revealWikiEntry(entryId)` = 切 tab + 定位条目（抽屉内「在百科 tab 中查看」二级入口用）。
- 百科 tab 只读：不做重生成/编辑等管理操作（"可视化管理"属后续项）。
- **中栏三行结构（层级归属决策）**：第一行 = 库名 + ⋯库级菜单（上传/生成百科/重命名/删除——库级动作，对所有 tab 可见，从 DocumentPanel header 拆分上移）；第二行 = tab 导航条；第三行起 = 各 tab 内容。文档 tab 工具行保持精简（搜索 + 排序）。〔2026-08-11 修正：上传从文档工具行挪回 ⋯菜单——用户反馈工具行拥挤；上传实为库级动作（往当前库加文档），与生成百科同级〕DocumentPanel 保持可独立渲染，既有 dom 测试迁移至 MiddleTabs。
- **tab 内容 keep-alive**：三个面板保持挂载（`hidden` 属性切换，不卸载）——文档 tab 的搜索词/排序/选中行/滚动位置与 indexing 轮询在切换时不丢；百科/检索测试的数据 hook 用 `enabled: activeTab === ...` 门控 lazy，首次激活才拉取。
- 窄窗口：三 tab 标签约 200px，中栏保底 `min-w-[20rem]` 下无溢出；既有横向滚动宪底不动。

- [x] 写失败测试：tab 切换渲染；条目列表渲染（含 dirty 徽标）；点击条目开抽屉加载全文；`openWikiEntry` 只开抽屉不切 tab；`revealWikiEntry` 切 tab + 定位；keep-alive（切换后文档 tab 的搜索词/选中行保留）；库名与⋯菜单（含上传）在第一行、文档 tab 工具行仅搜索+排序。
- [x] 运行 `pnpm test` 捕获 RED。
- [x] 实现组件 + hooks + i18n；测试 GREEN；`pnpm check` 干净。
- [x] Commit: `feat(frontend): add middle-column tabs with read-only wiki entries panel`。

## Task 2: P1 召回测试后端 API（TDD）✅ 已完成（2026-08-11）

**实施记录**：契约与 plan 一致，无偏差。单测 5 个（mock 三 impl 于 service 模块边界）+ 集成测试 1 个（requires_qdrant，`tools_env` 真实 impl 直调对比一致）。revert 证明点已执行：`_timed` 降级改为 re-raise → 降级用例 RED（500）→ restore → GREEN。实施中发现的一个坑：`_extract_query_entities` 期望 `{"entities": [...]}` dict 格式，测试 LLM stub 返回裸 list 会被静默丢弃为 []——stub 已对齐全仓 test_graph_search.py 的 `{"entities": ...}` 形态。

**Files:**
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（新增 `POST /{kb_id}/recall-test`；删除文件 docstring 中 "The recall-test endpoint is Phase 2 and deliberately absent" 一句）
- Modify: `backend/app/gateway/services/knowledge_service.py`（`recall_test(kb_id, user_id, query, top_k)`：构造 `SimpleNamespace(context={kb_id, user_id})` runtime → `asyncio.gather(return_exceptions=True)` 并行调三 impl → 组装响应）
- Create: `backend/tests/knowledge/test_recall_test_api.py`

**接口契约（实现前冻结）：**
- 请求体 `RecallTestRequest(BaseModel)`：`query: str`（strip 非空）、`top_k: int = 5`（ge=1, le=20）。
- 响应严格按 spec §3 schema：`paths.{vector,graph,wiki}` + `score_type` + `elapsed_ms`；vector `score` 可空（rerank 降级）；graph 的 top_k 映射 `evidence_limit`。
- 单路异常不拖垮整响应：该路降级为空 hits + 该路 `message` 注明失败（gather return_exceptions 收集）。
- 门禁复用 `_require_kb_access`；401/403/404 语义与现有一致。

- [x] 写失败测试（mock 三 impl）：200 组装正确（score 可空/score_type/elapsed_ms/top_k→evidence_limit 映射断言）；单路抛错降级；query 空白 422；越权 403；不存在 404。
- [x] 集成测试（`requires_qdrant`，tools fixture 真实 impl）：对一个已索引夹具 kb 发召回测试，三路返回结构与 impl 直调一致。
- [x] 运行捕获 RED → 实现 → GREEN；revert 单路降级为整响应 500，证明降级用例 RED，restore，GREEN。
- [x] Commit: `feat(rag): add recall-test API over the three retrieval impls`。

## Task 3: P1 前端「检索测试」tab ✅ 已完成（2026-08-11）

**实施记录**：契约与 plan 一致，两处实现期决策记录：① top_k 控件用 `Input type=number`（提交时 clamp 1–20）而非 Select——中栏窄、选项型交互在此无收益且 dom 测试更稳；② “请求去抖”落实为 isPending 禁用提交 + Enter/按钮同一入口（显式动作场景，输入去抖无意义）。组件自治（useRecallTest + 本地 state），keep-alive 下上次结果跨 tab 切换保留。wiki 命中点击经 page 的 `setDrawerEntryId` 走右侧抽屉（不切 tab，与 Task 1 叠加层设计一致）。

**Files:**
- Create: `frontend/src/components/workspace/knowledge/recall-test-panel.tsx`
- Modify: `middle-tabs.tsx`（加第三 tab）、`hooks.ts`（`useRecallTest`）、i18n
- Create: `frontend/tests/unit/knowledge/recall-test-panel.dom.test.tsx`

**接口契约：**
- UI：query 输入 + top_k 选择 + 成本提示文案（"会产生检索调用成本"）+ 三路分栏（各带 `score_type` 标注与 `elapsed_ms`）；命中项复用 `ChunkCard` 展开原文；wiki 命中点击 → `openWikiEntry`（右侧抽屉，不切中栏）。
- 请求去抖/进行中禁用提交；错误 toast。

- [x] 写失败测试 → RED → 实现 → GREEN → `pnpm check`。
- [x] Commit: `feat(frontend): add recall test tab with three-path result panes`。

## Task 4: P2 引用 UX 改造 ✅ 已完成（2026-08-11）

**实施记录**：
1. **MessageList 注入点**：新增可选 prop `renderMessageContent(message, content, isLoading)`，仅作用于 assistant group 正文渲染点；不传时行为与现状完全一致（通用面板零影响）。KnowledgeChatPanel 的实现对非 ai 消息返回 undefined（人类消息中的 `[1]` 不会误上标化）。
2. **`[n]` 分片走 rehype 插件**（`rehype-citation-marks.ts`，手写递归遍历、无新依赖）：hast text 节点 → `<sup data-citation-index>`；跳过 code/pre 子树；限 1–2 位数字（`[100]` 不误伤）。`sup` 组件覆写按消息 sources 闭包取数，无效 index 回退裸 `<sup>` 不崩溃。
3. **锚点联动用 CustomEvent**（`kb-citation-jump`，detail `{messageId, index}`）：正文标记与底部来源区分属 MessageList 的两个 render prop，无共同 React 状态祖先，事件总线自包含；来源区按 messageId 过滤，跳转 → 展开 + 高亮 2s + chunk 自动展开 ChunkCard（覆盖移动端 tap 契约）。
4. **一期 kb-citation-sources/chat-panel 既有测试迁移**到新交互（先展开再断言；摘录与 ChunkCard 全文同文多处匹配，断言改 `getAllByText` 计数）。
5. **工程教训**：Write 工具覆盖已存在文件两次出现旧内容残留（新内容+旧尾部拼接）；且 PowerShell `Get-Content/Set-Content` 截断含中文的 UTF-8 文件会按 GBK 误读造成乱码+BOM。修复方式：DeleteFile 后 Write 重建，并用 Read 验证中文完整性。
6. revert 证明点已执行：折叠默认态改 `useState(true)` → 10 个折叠相关用例 RED → restore → GREEN。

**Files:**
- Modify: `frontend/src/core/knowledge/citations.ts`（`toCitation` 填充 `source_type`：`toolName === "wiki_search" ? "wiki" : "chunk"`）、`types.ts`（`KnowledgeCitation.source_type?`）
- Create: `frontend/src/components/workspace/knowledge/citation-mark.tsx`（上标徽章 + Radix `HoverCard` 预览：徽标/文档名/页码路径/摘录——摘录取 `citation.text` 前 ~120 字符，无新 API）
- Modify: `frontend/src/components/workspace/knowledge/chat-panel.tsx`（ai 消息文本的 `[n]` 分片替换为 `CitationMark`——仅知识库面板启用，通用 `MessageList` 不动；**deferred**：仅流结束后渲染上标）
- Modify: `kb-citation-sources.tsx`（默认折叠一行入口「参考来源 · N + 类型统计」→ 展开卡片列表：编号联动 + 类型徽标 + 页码 + 摘录；上限 5 条 + 查看全部；同 doc_name 合并展示；百科条目点击 → `openWikiEntry` 右侧抽屉，不切中栏）
- Modify: `backend/packages/harness/deerflow/agents/assets/rag/SOUL.md`（引用纪律：每个论断最多 1 个标记，禁止一句多标）
- Modify: `backend/tests/knowledge/test_rag_agent_assembly.py`（断言纪律文本存在）
- i18n + `frontend/tests/unit/knowledge/citation-*.dom.test.tsx`

**接口契约（实现前冻结）：**
- 上标徽章：纯数字、`text-[0.7em]`、`align-super`、`text-muted-foreground`、淡底圆角；`aria-label="Source n: <doc_name>"`。
- HoverCard 遵守仓库规范：延迟打开（防划过闪烁）；关闭路径回归测试（防 body `pointer-events` 残留，参照 `document-panel.tsx::runAfterMenuClose` 注释的教训）。
- 锚点联动：点击标记 → 来源区展开并滚动到对应项短暂高亮；移动端 tap → 直接展开切片。
- 兼容：无 `source_type` 的历史引用按 `"chunk"` 渲染。

- [x] 写失败测试：`source_type` 填充；上标渲染（流式中不渲染、结束后渲染）；折叠/展开交互；徽标展示；wiki 点击回调；一句多标不崩溃。
- [x] RED → 实现 → GREEN；revert 折叠为默认展开，证明折叠用例 RED，restore，GREEN。
- [x] `pnpm check` + backend `test_rag_agent_assembly.py` GREEN。
- [x] Commit: `feat(frontend): rework citation UX with superscript marks and collapsible source cards`。

## Task 5: P3 文档状态三路子标记 ✅ 已完成（2026-08-12）

**实施记录（契约偏差与实现期决策）：**
1. **vector 软失败语义细化**：plan 原文“`index_chunks` 完成 → done”落地为——全部批次 EmbedderError 软失败（`indexed == 0`）时记 `failed`（该失败此前完全静默，path_status 是其首个可观测面）；部分批次失败仍记 `done`（vector 枚举无 degraded）。
2. **`generating` 数据源**：`generate_wiki` 增加进程内 in-flight 计数注册表（`wiki_generation_in_progress`），手动按钮与 worker 自动触发同源覆盖；判定优先级「存在 ready/dirty 条目 → ready」恒高于 generating——批量上传期间增量重生频繁，避免徽标抖动。
3. **head 机械 bump**：0012 入链后 5 处既有断言更新（0004/0007/bootstrap/bootstrap_concurrency/bootstrap_regression）。
4. **drive-by format**：`test_citation_numbering.py` 三处 assert 折行被 ruff 新版单行偏好重排（无语义改动）。
5. **前端 tooltip 测试遵循 P2 先例**：不测 Radix 悬停开启机制；`PathStatusBreakdown` 导出直渲测内容装配，`path-status-trigger` testid 测挂载条件；悬停内容装配抽为纯函数 `core/knowledge/path-status.ts`。
6. revert 证明点已执行：局部合并改整体覆盖 → `test_document_path_status_partial_merge` RED → restore → GREEN。
7. **2026-08-12 体验修正（用户实测反馈，单独 fix commit）**：①path_status 初始化前移到 parsing 起点——此前解析阶段悬停无反应（null 与老行语义混杂），前移后新文档全生命周期可悬停，null 唯一含义=0012 前遗产行；解析期硬失败两路记 failed。②百分比只在 indexing 显示——待解析/解析中/切片中无可测进度（MinerU 单次 API 调用无回调），摘掉无信息量的 0%（对标 Dify「无数据不编数字」原则）。③老文档决策（用户拍板）：不 backfill，自然过渡。
8. **2026-08-13 库级 wiki 镜像三连修（用户实测反馈，三个 fix commit）**：①轮询冻结修复（`4d292b6b`）——文档全终态后轮询停止，把库级 wiki 镜像冻在「生成中」；`documentsRefetchInterval` 增补 `path_status.wiki === "generating"` 续跑条件。②在途优先（`381f18f6`）——`_wiki_path_status` 原「有 ready/dirty 条目即 ready」短路使 generating 只在空库首次生成出现一次，增量消化不可见；改为在途优先，dirty 仍计 ready 且不触发 generating（轮询不空转）。③镜像终态门控（`1071a19d`）——镜像原无差别投到所有文档，流水线中文档错误显示库旧内容的「已生成」；改为镜像只对终态文档（ready/failed）生效，流水线中文档 wiki 行恒 pending。完整口径：解析/索引中→待处理 → 索引完+增量在途→生成中 → 消化完→已生成。

**验证结果**：backend knowledge 220 passed + 2 skipped（live-key 用例）；migration/bootstrap 39 passed；前端 knowledge 157 passed；`pnpm check` 干净；ruff check/format 干净。

**Files:**
- Create: `backend/packages/harness/deerflow/persistence/migrations/versions/0012_documents_path_status.py`（`documents ADD COLUMN path_status JSON NULL`；参照 0002 的 add-column 模式）
- Modify: `backend/packages/harness/deerflow/knowledge/models.py`（`DocumentRow.path_status`）
- Modify: `backend/packages/harness/deerflow/knowledge/store.py`（`update_document_status` 支持 `path_status` 局部合并更新；`_row_to_dict` 携带；`retry_document` 重置为 None）
- Modify: `backend/packages/harness/deerflow/knowledge/worker.py`（写入时机：进入 indexing → vector=graph=pending(wiki 除外)；`index_chunks` 完成 → vector=done；graph 开始 → graph=indexing；graph 完成 → done/degraded（与 `graph degraded` error 子标记同源判定）；wiki 为库级镜像——文档行不单独写 wiki 子状态）
- Modify: 路由/序列化：documents 列表响应携带 `path_status`；wiki 子状态由响应组装时按库级聚合（`wiki_entries` 是否有 ready 条目 / 是否生成中）注入，所有文档共享
- Modify: `frontend/src/components/workspace/knowledge/document-panel.tsx`（状态列悬停 Tooltip 展示三路，复用 `@/components/workspace/tooltip`；indexing 中悬停文案组合展示百分比，如「图谱 87%」；不新增列）+ i18n
- Create: `backend/tests/test_migration_0012_documents_path_status.py`（参照 `test_migration_0004_run_ownership_dedupe.py` 模式）；Modify: `test_worker.py`、`test_api` 相关断言 + 前端 tooltip 单测

**接口契约（实现前冻结）：**
- `path_status` 枚举严格按 spec §5；写入语义为**局部合并**（只更新当次阶段对应的 key，不覆盖其他路）。
- wiki 子状态库级判定：`pending`（库无 ready 条目且未在生成）/ `generating`（手动或自动触发进行中）/ `ready`（库存在 ready **或 dirty** 条目——dirty = 已生成待刷新，内容过期但可用，仍属已生成态，见 Task 5b）；`failed` 暂不启用（wiki 失败现有 error 通道）。
- 兼容：老行 `path_status` 为 `null` 时前端不展示悬停。

- [x] 写失败测试：migration up/down；worker 各阶段写入断言（vector done 先于 graph done）；graph degraded 同源；retry 重置；列表响应携带；wiki 库级镜像。
- [x] RED → 实现 → GREEN；revert 局部合并为整体覆盖，证明合并语义用例 RED，restore，GREEN。
- [x] `pnpm check` + backend 全量 knowledge 测试 GREEN。
- [x] Commit: `feat(rag): persist per-path document status with hover breakdown`。

## Task 5b: wiki dirty 钩子接线 + 新晋头部补条目（一期 §3.5 缺陷修复与语义修订） ✅ 已完成（2026-08-12）

**验证结果**：tests/knowledge 225 passed + 2 skipped（live-key 用例，较 Task 5 基线 +4）；revert 证明点已执行（摘除 backfill 差集 → `test_only_dirty_backfills_newly_promoted_head` RED → restore → GREEN）；ruff check/format 干净。无契约偏差——实现与冻结契约一致；两个 generator 新用例走纯 DB（`vector_store=None`），不依赖 Qdrant。

**背景**：一期 §3.5 契约“新文档涉及的实体条目标记 `dirty`，后台增量重生成”从未生效——`mark_dirty_for_entities`（docstring 自封 "New-document hook"）在 worker 里从未被调用，全仓仅测试在用；`_maybe_generate_wiki` 的 `only_dirty=True` 增量因此恒空转，新内容进 wiki 只能靠手动「生成百科」全量。本 Task 接线该钩子，并按 2026-08-12 用户确认的语义修订把增量目标扩为 dirty ∪ 新晋头部（主 spec §3.5 已同步修订）。

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/worker.py`（`resolve_entity_aliases` 的 try/except 之后、`_maybe_generate_wiki` 之前：调 `mark_dirty_for_entities(self._wiki_store, kb_id, stats.touched_entities)`；try/except 降级仅 log——wiki 是库级功能，脏标记失败不阻断文档 ready、不写 per-文档 error 子标记）
- Modify: `backend/packages/harness/deerflow/knowledge/wiki/generator.py`（`only_dirty=True` 目标集扩为：dirty 条目对应实体 ∪ 当前 `select_head_entities` 头部中无 wiki 条目的实体；被挤出头部的旧条目保留不删；已有条目不重复补——幂等）
- Modify: `backend/tests/knowledge/test_worker.py`（索引新文档后 touched 实体条目 dirty、未触及保持 ready、mark_dirty 抛错文档仍 ready）
- Modify: `backend/tests/knowledge/wiki/test_generator.py`（增量目标含新晋头部、补写后头部⇔条目集合一致、幂等不重复补、降级旧头部保留）

**接口契约（实现前冻结）：**
- 标记时机：`resolve_entity_aliases`（D3）**之后**、`_maybe_generate_wiki` 之前，用 `stats.touched_entities`（以合并后最终实体名为准；被合并掉的旧名由 `mark_dirty_for_titles` 的标题匹配天然忽略）。
- 增量目标集（主 spec §3.5 2026-08-12 修订）：`targets = dirty 条目对应实体 ∪（当前头部 \ 已有条目标题）`；反向不处理（降级旧头部保留）。
- 失败降级：`mark_dirty_for_entities` 异常仅 `logger.exception`，不阻断 ready、不追加 error 子标记。
- 与 Task 5 协同：wiki 库级子状态判定中 `dirty` 条目计入“已生成”（Task 5 契约已同步）。

- [x] 写失败测试：worker 三断言（touched 变 dirty / 未触及不变 / 钩子抛错仍 ready）；generator 四断言（新晋头部进 targets / 补写后头部⇔条目一致 / 幂等 / 旧头部保留）。
- [x] RED → 实现 → GREEN；revert 证明点：revert 目标集差集逻辑 → 新晋头部用例 RED → restore → GREEN。
- [x] `cd backend && uv run pytest tests/knowledge -q` 全量 GREEN；ruff check/format 干净。
- [x] Commit: `fix(rag): wire new-document wiki dirty hook and backfill new head entries`。

## Task 6: P4 解析能力扩展第一批 + 上传白名单 ✅ 已完成（2026-08-13）

**验证结果**：后端 tests/knowledge 253 passed + 2 skipped（较 Task 14 基线 +7：parser 契约/UTF-8 直读/GBK 回退×2/坏编码 ValueError/上传 400/formats 端点）；revert 证明点已执行（回退 GBK 回退 → 两个 GBK 用例 RED → restore → GREEN）；前端知识库 21 文件 176 passed（新 supported-formats 纯函数 5 用例 + api 端点 1 用例 + MiddleTabs 拦截 3 用例 + DocumentPanel 拖拽拦截 1 用例）；`pnpm check`、ruff check/format 干净。实施记录：①`_read_local_text` 按字节解码（UTF-8 严格 → GBK 回退）并归一化 `\r\n`→`\n`，与 `Path.read_text` universal-newlines 语义对齐；②白名单闸在 `upload_document` 写盘前（ValueError → 路由既有 400 映射复用，无新异常路径）；③`GET /supported-formats` 注册于 `/{kb_id}` 之前；④前端两个上传入口（中栏菜单 input + 文档面板拖拽）共用 `partitionFilesBySuffix` 拦截 + toast，端点为真源、`FALLBACK_SUPPORTED_SUFFIXES` 本地镜像兜底。

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/parser.py`（导出 `SUPPORTED_UPLOAD_SUFFIXES: frozenset[str]`；本地直读集合扩为 `{.md, .markdown, .txt, .csv}`，UTF-8 严格解码 → GBK 回退 → 明确 `ValueError`；`is_local_suffix` / `is_supported_suffix` 辅助函数）
- Modify: `backend/app/gateway/services/knowledge_service.py`（`upload_document` 入口校验白名单，拒绝抛 `ValueError` 附支持集合文案）
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（`GET /supported-formats`——**注册在 `/{kb_id}` 之前**；返回 `{"suffixes": sorted(SUPPORTED_UPLOAD_SUFFIXES)}`）
- Modify: `frontend/src/core/knowledge/hooks.ts`（`useSupportedFormats`）、`document-panel.tsx`（上传 `accept` + 选择时拦截 toast）、i18n
- Create/Modify: `backend/tests/knowledge/test_parser.py`（utf8/gbk/坏编码/新后缀直读）、`test_api` 上传 400 用例、formats 端点用例；前端上传拦截单测

**接口契约（实现前冻结）：**
- 支持集合 = `.md/.markdown/.txt/.csv/.pdf/.doc/.docx/.ppt/.pptx/.png/.jpg/.jpeg`（spec §6，frozenset 小写含点号）。
- 拒绝文案列出支持集合；HTTP 400。
- CSV 不做表格结构理解（原文直读）。

- [x] 写失败测试：GBK txt/csv 直读成功；坏编码明确报错；白名单外后缀上传 400；formats 端点返回与常量一致；前端超集选择被拦截。
- [x] RED → 实现 → GREEN；revert GBK 回退，证明编码用例 RED，restore，GREEN。
- [x] `pnpm check` + backend knowledge 测试 GREEN。
- [x] Commit: `feat(rag): extend local parsing to txt/csv with upload allowlist`。

## Task 7: 文档同步与全量回归

**Files:**
- Modify: `backend/AGENTS.md` RAG 小节（补 recall-test 端点、path_status、白名单/formats 端点）、`docs/superpowers/specs/2026-08-11-rag-phase2-batch1-design.md`（状态：待评审 → 已落地，标注日期）、主 spec 交叉引用处如有措辞偏差顺手修正

- [x] spec 状态翻转 + AGENTS.md 同步。—— 已由 `0ea14d97`（2026-08-15）完成：spec 状态改「✅ 已落地」、`backend/AGENTS.md` 补 recall-test 端点与 path_status。
- [x] `cd backend && uv run pytest tests/knowledge -q` 全量 GREEN；`make lint && make format` 干净；`cd frontend && pnpm test && pnpm check` 干净。—— 同 plan 收官节记录：后端 **261 passed + 2 skipped**、前端 **1190 passed**、ruff 与 `pnpm check` 净。
- [x] Commit: `docs(rag): sync agent guides and spec status for phase-2 batch-1`。—— 即 `0ea14d97`（2026-08-15）。

## Task 8: wiki 条目资格制 + 材料束批量生成（2026-08-12 插入，独立于 Task 6/7 先行实施） ✅ 已完成（2026-08-12）

**验证结果**：tests/knowledge 232 passed + 2 skipped（较 Task 9 基线 +6）；revert 证明点已执行（freq 门改 ≥1 → 资格用例 RED → restore → GREEN）；ruff check/format 干净。实施记录：①卫生谓词落在 `normalizer.is_low_quality_entity_name`（Task 10 入库过滤将复用同一实现，不另起炉灶）；②worker 两个 wiki 触发回归用例适配资格制（双切片语料 `TWO_CHUNK_MD` + 3 切片夹具让 DeerFlow 达 freq2）；③测试 fake 教训——`str(messages)` 会把换行 repr 成字面 `\n`，批量花名册解析必须读真实 content 字符串；④打包/解析/降级/节流/幂等/资格全部用例纯 DB 化（`vector_store=None`），仅既有的 3 个集成用例依赖 Qdrant。

**背景**：比例制头部策略在 2026-08-12 实测中暴露两个缺陷：①席位随实体总数膨胀（单篇概念密集文档 11 切片 → 54 席、尾部混入薄条目）；②生成轴心与材料轴心错位——27 切片/152 合格实体逐条生成需 518 次切片搬运、152 次串行调用（≈60 分钟）。用户拍板：资格制（卫生过滤 + freq≥2，无总数上限，score 仅排序）+ 材料束批量生成（同簇实体共享一次调用），补写节流放宽到 40 篇/次。主 spec §3.5 / 本批 spec §1 已同步修订。

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/wiki/generator.py`（`select_head_entities` → `select_eligible_entities`：卫生过滤 + `len(source_chunk_ids)≥2`，score=degree+freq 降序、name tie-break；移除 `top_ratio`/`DEFAULT_TOP_RATIO`；新增纯函数 `plan_entry_batches`（Jaccard≥0.5 贪心聚簇、簇内 ≤7 实体/包）与批量生成路径（共享并集切片 + JSON 数组输出 + title 白名单校验 + 缺篇/坏 JSON 降级逐条）；`only_dirty` 路径：dirty 逐条重生成 + 无条目合格实体按 score 降序补写 ≤40 篇/次）
- Modify: `backend/tests/knowledge/wiki/test_generator.py`（比例制用例改写：资格过滤各规则、freq=1 排除、无 20% 截断、score 仅排序；打包纯函数聚簇/切包/确定性；批量解析正常/缺篇降级/坏 JSON 降级；节流 40 上限 + dirty 不受限；既有幂等/降级保留用例适配）

**接口契约（实现前冻结）：**
- 资格 = 卫生过滤通过 ∧ `len(source_chunk_ids) ≥ 2`；无总数上限；score 仅用于排序。
- 卫生过滤（wiki 选型期执行，不动图谱入库与图谱路检索）：纯符号/运算符（不含任何字母数字）、引号包裹字面量、单字符、长度 >30 的碎片。
- 打包：实体按 score 降序贪心入包——与某包并集切片的 Jaccard≥0.5 且包内 <7 实体则并入，否则开新包；确定性（同输入同输出）。
- 批量输出：JSON 数组 `[{title, content}]`，title 必须 ∈ 请求实体清单；缺篇或解析失败 → 该包缺篇实体降级逐条生成。
- dirty 重生成逐条不打包；自动增量补写 ≤40 篇/次（超出排队后续触发）；全量模式（手动/首次）不节流。
- 既有条目不因资格变化而删除（降级保留原则不变）；幂等不变（已有条目不重复补）。
- 调用方适配：`generate_wiki` 的 `top_ratio` 形参移除，调用处（router 手动生成/worker）同步清理。

- [x] 写失败测试：资格过滤各规则；freq=1 排除；无 20% 截断；打包聚簇/切包/确定性；批量解析与两级降级；节流 40 上限且 dirty 不受限；幂等/降级保留适配。
- [x] RED → 实现 → GREEN；revert 证明点：revert freq≥2 资格 → freq=1 排除用例 RED → restore → GREEN。
- [x] `cd backend && uv run pytest tests/knowledge -q` 全量 GREEN；ruff check/format 干净。
- [x] Commit: `feat(rag): switch wiki entries to cross-chunk eligibility with batched generation`。

## Task 9: 文档删除竞态护栏 + 存量幽灵数据修复（2026-08-12 插入，用户拍板立即处理） ✅ 已完成（2026-08-12）

**验证结果**：tests/knowledge 226 passed + 2 skipped（较 Task 5b 基线 +1）；ruff check/format 干净。存量修复对账（KB `5d96a1e3`）：幽灵引用 22 + 孤儿切片 11 共 33 项贡献移除 → 实体 266→181（85 个零引用实体清除，几乎全是重复上传滋生的薄实体）、关系 409→144、切片 27→16、phantom_refs=0；Qdrant 同步清理（delete_by_doc + 85 个实体向量）；6 个旧 wiki 条目的幽灵溯源引用已剥除。**修复后资格制真实估算（纠正此前被污染的数据）**：freq 分布 freq=1→160 / freq=2→19 / freq=3→1 / freq=5→1，freq≥2 合格实体仅 **21**（原估 152 系幽灵引用注水）；String 真实 score=13（freq 3 + deg 10，原 34 系注水）。

**背景**：实测发现图谱残留——`graph_entities.source_chunk_ids` 引用 4 个已删除文档的切片（幽灵引用），chunks 表存在 11 行孤儿切片（doc 行已删）。级联删除稳态正确（store/图谱/service 三层测试在绿），根因是**删除与 worker 索引的竞态**：删除清空业务行后，仍在运行的 worker 继续 `insert_chunks`/图谱 upsert 把数据复活（`update_document_status` 对不存在行静默 no-op，流水线无感知）。幽灵引用污染 freq（String freq=10 中仅 2-3 个存活），直接威胁 Task 8 资格制的 freq≥2 判定。

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/worker.py`（`_DocumentDeletedError` + 存活护栏检查点：解析完成后（insert_chunks 前）、向量路前、图谱路前、图谱路完成后；命中则安静中止——info 日志、不写 failed、不再产生任何写入）
- Modify: `backend/tests/knowledge/test_worker.py`（解析中删除 → chunks/图谱无残留、文档行不复活）
- 存量修复（一次性执行，不落脚本文件）：幽灵 chunk id = 图谱引用 - chunks 表现存 → `remove_chunk_contributions` + Qdrant `delete_entities`（孤儿实体）+ `delete_by_doc`（孤儿切片点）+ 孤儿 chunk 行删除；修复前后对账（实体数/关系数/freq 分布）

**接口契约（实现前冻结）：**
- 护栏语义：任何检查点发现文档行消失 → 抛 `_DocumentDeletedError`，外层单独捕获，info 级日志后返回 None；不更新状态、不写 error、不产生新数据。
- 图谱路执行中被删除的残留窗口予以承认并在代码注释记录（由存量修复逻辑兜底，可重复执行幂等）。
- 存量修复复用 `GraphStore.remove_chunk_contributions`（与级联删除同一路径），不手写 SQL 改图谱。

- [x] 写失败测试：解析中删除 → 无 chunks/无实体/文档行不复活。
- [x] RED → 实现 → GREEN。
- [x] 存量修复执行 + 对账（修复后全库图谱引用 100% 存活）。
- [x] `cd backend && uv run pytest tests/knowledge -q` 全量 GREEN；ruff check/format 干净。
- [x] Commit: `fix(rag): abort indexing pipeline when document is deleted mid-flight`。

## Task 10: 跨语言别名合并（prompt 规范形 + 括号别名折叠 + 代表优先级）（2026-08-12 设计定稿，2026-08-13 用户收缩范围） ✅ 已完成（2026-08-13）

**验证结果**：tests/knowledge 244 passed + 2 skipped（较 Task 13 基线 +9：prompt 断言 1 + normalizer 7 + resolver 集成 1）；revert 证明点已执行（回退代表优先级为 names[0] → 三个全名代表用例 RED：同 chunk 合并/cluster/D3 集成 → restore → GREEN）；ruff check/format 干净。实施记录：①退化形态全部收敛为单键（B 空由正则 `[内层]+` 天然拒绝、B 同 A 键/空 A 显式判退、单字符 B 不注册）；②`_map_name` 悬空端点匹配升级为键集合求交（双向可命中）；③`is_low_quality_entity_name` docstring 同步收缩决策（明确不下沉入库及理由）。

**2026-08-13 prompt 修正（用户实测 badcase）**：原条目带例子「例如 字符串（String）」且未定义「跨语言」——模型模仿例子，给所有中文实体臆造英文翻译名（新增（Create）/编辑（Edit）等操作动词也被配上原文不存在的英文名），括号英文无合并对象、纯污染实体名。修正：去例子 + 显式定义「跨语言 = 原文中同一概念同时出现中英文名称」+ 禁止自行翻译（「英文名必须来自原文，不要自行翻译」）。prompt 断言用例同步强化（保留规范形 / 含禁译令 / 不含例子）。只影响新解析文档，存量臆造名需删除重传刷新。

**背景**：跨语言同义词永不合并（`字符串`/`String`，名字向量 0.92 阈值够不着）。2026-08-13 用户复审收缩范围：①**不加** prompt 卫生约束（过度限制干扰模型判断，`&&` 等确可能是讲解对象）；②卫生过滤**不下沉**（维持只在 wiki 选型侧，Task 8 已落地）；③悬空边**维持现状**（归一层 `_map_name` 天然保留，检索层只用双端在子图的边，无害）。保留两项：prompt 跨语言规范形 + 括号别名折叠（零成本机制）。代表名规则：合并只负责分簇、不产生名字，簇内必须选代表——现状是切片内 first-seen（巧合）/ D3 名字序（ASCII 恒胜），均非规范形；故加「括号全名优先」。

**Files:**
- Modify: `backend/.../knowledge/graph/extractor.py`（`EXTRACT_SYSTEM_PROMPT` 只加一条：跨语言概念的 name 用「中文（英文）」规范形；不加任何卫生约束）
- Modify: `backend/.../knowledge/graph/normalizer.py`（`_alias_key` → `_alias_keys` 多键：行尾包裹式括号 `A（B）`/`A(B)` → {全名， A, B} 三键注册；B 为空/同 A/≤1 字符退化；代表优先级：簇内含括号全名优先当代表，否则维持 first-seen/名字序）
- Modify: `backend/tests/knowledge/graph/test_extractor.py`（prompt 文本断言）、`test_normalizer.py`（三键/退化/非包裹不拆/同 chunk 合并全名代表/D3 簇代表）、`test_resolver.py`（D3 集成：String + 字符串（String） → 全名代表、别名行/向量删、wiki 生命周期）

**接口契约（实现前冻结）：**
- prompt 变更不破坏现有 JSON 输出契约；gleaning 流程不变。
- 括号折叠：仅行尾包裹式括号（A 非空、括号成对收尾、内层无嵌套括号）触发；keys = {_alias_key(全名）, _alias_key(A), _alias_key(B)}；B 为空、与 A 同键或 ≤1 字符 → 不注册 B。
- 代表优先级：簇内存在括号全名 → 全名当代表（多个括号名取输入序第一个）；无括号名 → 维持现状（normalize_extraction first-seen；cluster_alias_groups 输入序）。
- 合并既有副作用链不变（resolver 五连 + Task 12 wiki 生命周期）。

- [x] 写失败测试：prompt 文本断言；三键/退化/非包裹不拆；同 chunk `String`+`字符串（String）` 合并且全名代表；D3 簇全名代表。
- [x] RED → 实现 → GREEN；revert 证明点：revert 代表优先级 → 全名代表用例 RED → restore → GREEN。
- [x] `cd backend && uv run pytest tests/knowledge -q` 全量 GREEN；ruff check/format 干净。
- [x] Commit: `feat(rag): merge cross-language aliases via parenthetical folding`。

## Task 11: 重复上传拦截（同名预检 + 替换/保留两份）（2026-08-12 设计讨论定稿） ✅ 已完成（2026-08-14）

**验证结果**：backend tests/knowledge 261 passed + 2 skipped（较 Task 16 基线 +3：store hash 写入/legacy NULL/列表返回）；migration 0013 up/down 2 passed；frontend 149 文件 1190 passed（新 duplicate-check 12 用例 + dialog 9 用例 + flow 4 用例）；`pnpm check`、ruff check/format 干净。revert 证明点已执行（摘除 store hash 写入 → 两个 hash 用例 RED → restore → GREEN）。实施记录：①拦截点落在 page.tsx 统一 `uploadFilesWithCheck`，两个上传入口（MiddleTabs 库级菜单 + DocumentPanel 拖拽/选择）共享——plan 原文只提 document-panel，实际 MiddleTabs 也有入口，拦截必须上移才全覆盖；②替换顺序契约落实为纯函数 `duplicate-upload-flow.ts::executeDuplicateAction`（先 deleteDocument 后 uploadFile，调用顺序数组断言）；③弹窗队列经 Promise + state 逐文件串行，WebCrypto 不可用（非安全上下文）降级为直接上传不阻断；④drive-by fix（单独 commit `7e3fbeee`）：`test_parser.py` 的 DASHSCOPE_API_KEY fixture 存在性检查被 app_config 的 `load_dotenv()` 导入期注入真实 key 架空，改 monkeypatch 无条件注入。

**背景**：同一文件重复上传导致重复抽取、实体变体裂变（`String str1`/`str2`），是幽灵数据事故的源头之一。用户拍板：同名同类型文件已存在时让用户决定——替换（级联删除旧文档+重新索引）或保留两份。

**Files:**
- Create: `backend/packages/harness/deerflow/persistence/migrations/versions/0013_documents_content_hash.py`（`documents ADD COLUMN content_hash TEXT NULL`；老行 NULL=未知）
- Modify: `backend/.../knowledge/models.py` + `store.py`（upload 写入 SHA-256；列表 API 返回 `content_hash`）
- Modify: `frontend/src/components/workspace/knowledge/document-panel.tsx`（选择文件后 WebCrypto 计算 SHA-256，与当前库文档列表比对同名+同扩展名；命中弹确认框）+ i18n + 单测

**接口契约（实现前冻结）：**
- 三分支：同名且 hash 相同 → 「内容完全一致」：跳过（默认）/ 仍入库副本；同名但 hash 不同或未知 → 「替换 / 保留两份（自动改名 `name (2).ext`，冲突递增）」；未命中 → 正常上传。
- 替换 = 先 `DELETE`（走级联，图谱/向量/wiki 全清）后重新上传，复用现有端点，后端不加新端点。
- 副本与保留两份均为合法新文档行（name 非唯一键；保留两份的前端改名仅为展示区分）。

- [x] 写失败测试：migration up/down；hash 写入与返回；前端三分支弹窗；替换路径调用顺序（先删后传）。
- [x] RED → 实现 → GREEN；revert 证明点：revert hash 写入 → 列表返回用例 RED → restore → GREEN。
- [x] `pnpm check` + backend 全量 GREEN。
- [x] Commit: `feat(rag): duplicate-upload interception with replace-or-keep choice`（`3cc301a5`）。

## Task 12: wiki 条目生命周期级联（失格/消失/合并的条目处置）（2026-08-12 设计讨论定稿）

**背景**：资格制落地后条目生命周期只覆盖了"新增/材料变化"（backfill + dirty），删除侧三缺口：①删除文档致实体失格（freq 2→1）→ 条目冻结残留，可能含着已删文档的知识（违背删除意图）；②实体被孤儿清除 → 条目成无源残留；③D3 合并后别名条目标 dirty 但无实体可重生成 → 永远刷不掉。用户拍板原则：**资格即条目存在理由，失格即删**（比例制语境的"挤出保留不删"原则随资格制废止；主 spec §3.5 已补生命周期条款）。

**Files:**
- Modify: `backend/.../knowledge/wiki/store.py`（`delete_entries(kb_id, titles) -> int`，幂等）
- Modify: `backend/.../knowledge/vector_store.py`（`delete_wiki_entries(kb_id, titles)`——按 payload 的 kb_id+title 过滤删点）
- Modify: `backend/app/gateway/services/knowledge_service.py`（`delete_document_cascade`：`affected` 拆分——剩余 freq≥2 → 标 dirty；<2 → 删条目+条目向量；`orphaned` → 删条目+条目向量）
- Modify: `backend/.../knowledge/graph/resolver.py`（合并副作用⑤：代表名条目标 dirty 不变；别名条目由标 dirty 改为删除行+条目向量）
- Modify: `backend/tests/knowledge/test_api.py`（级联：失格删条目/仍合格标 dirty/孤儿删条目）、`tests/knowledge/graph/test_resolver.py`（别名条目删除+代表 dirty）

**接口契约（实现前冻结）：**
- 失格判定以 `remove_chunk_contributions` 之后的剩余 `source_chunk_ids` 长度为准（<2 即失格）；卫生过滤不重查（条目能存在说明名字当初过了关）。
- 删条目 = `wiki_entries` 行 + `kb_wiki_entries` 向量点；**实体节点与 `kb_entities` 实体向量不动**（freq≥1 的实体照常图谱检索）。
- 幂等：删除不存在的条目返回 0 不报错；级联失败仅 log 不阻断文档删除（沿用现有 try/except 风格）。
- `generate_wiki` 只写不删的语义不变；生命周期只由删除/合并事件驱动。
- wiki 库级状态自然衔接：条目被级联清空且无 ready/dirty 条目且无在途生成 → pending。

- [x] 写失败测试：失格删条目+向量（实体与实体向量保留）；仍合格标 dirty；孤儿删条目；合并别名条目删+代表 dirty；幂等重复删。——`test_api.py::test_delete_document_cascades_wiki_lifecycle`（Alpha 2→1 失格删 / Beta 3→2 dirty / Gamma 孤儿删 + 幂等重删返回 0）+ `test_resolver.py` 主用例 ⑤ 改断言（别名行+向量点删、代表 dirty）
- [x] RED → 实现 → GREEN；revert 证明点：revert 失格拆分为旧行为（全量标 dirty）→ 失格用例 RED → restore → GREEN。
- [x] `cd backend && uv run pytest tests/knowledge -q` 全量 GREEN（233 passed + 2 skipped）；ruff check/format 干净。
- [x] Commit: `feat(rag): cascade wiki entry lifecycle on entity eligibility loss and merges`。
- [x] 存量清扫（2026-08-13，一次性执行，复用本 Task 交付的 `delete_entries`/`delete_wiki_entries`）：比例制时代 6 篇无源条目（实体早已消失、溯源已被 Task 9 剥除、旧「保留不删」原则遗留）按失格即删口径清除，`wiki_entries` 行与 `kb_wiki_entries` 向量点均清零；实体节点与 `kb_entities` 未动。

## Task 13: wiki 条目手动删除（可视化管理首项）（2026-08-13 用户拍板）

**背景**：生命周期级联（Task 12）只覆盖事件驱动的条目处置；用户要求百科每条条目支持手动删除。拍板两项：①**接受重建语义**——仍合格实体的条目删除后，下次 `generate_wiki` backfill 会按最新材料重建（相当于「重置」），确认弹窗文案明示；仅失格/无源实体的条目删除是永久的；②按钮位置**仅列表行悬停**（不进抽屉）。

**Files:**
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（`DELETE /{kb_id}/wiki/entries/{entry_id}` → 204/404）
- Modify: `backend/app/gateway/services/knowledge_service.py`（`delete_wiki_entry`：复用 Task 12 `_delete_wiki_entries`——向量点+业务行，实体不动）
- Modify: `frontend/src/components/workspace/knowledge/wiki-panel.tsx`（行悬停 Trash2 + 确认 Dialog，文案含重建语义）、`core/knowledge/api.ts`（`deleteWikiEntry`）、`core/knowledge/hooks.ts`（`useDeleteWikiEntry`）、`app/workspace/knowledge/page.tsx`（接线 + toast）、i18n 三文件
- Modify: `backend/tests/knowledge/test_api.py`（删行+向量/重复删 404/stranger 403）、`frontend/tests/unit/knowledge/wiki-panel.dom.test.tsx`（确认才删/取消不删）

- [x] 后端 TDD：RED 2 红（路由缺失）→ 实现 → GREEN；全量 234 passed + 2 skipped；ruff 干净。
- [x] 前端：组件测试 14 passed（新增确认/取消两用例）；`pnpm check` 干净。
- [x] Commit: `feat(rag): manual wiki entry deletion with lifecycle-consistent cascade`。

## Task 14: wiki 生成双模式（手动按钮默认增量 + 保留全量重建）（2026-08-13 用户拍板） ✅ 已完成（2026-08-13）

**验证结果**：后端 tests/knowledge 246 passed + 2 skipped（较 Task 10 基线 +2：mode=full 映射 + 非法 422；另 2 用例原位强化：默认增量断言 + embedder 回归补 only_dirty 透传断言）；前端知识库三测试文件 37 passed（api 双 mode URL / hooks 透传 / 菜单「更新百科」即调 incremental +「全部重建」确认框取消不调确认调 full）；`pnpm check`、ruff check/format 干净。

**背景**：手动「生成百科」按钮走 `_run_wiki_generation` → `generate_wiki` 不传 `only_dirty`（默认 False）→ 永远全量重建——用户点「更新」只想消化 1 条 dirty，实测 33/33 条目被重写，语义与成本双错位。拍板双模式：**日常「更新」= 增量**（dirty 逐条重生 + backfill 合格无条目 ≤40/次），**「全部重建」= 全量**（prompt/模板升级场景专用，前端带确认框）。worker 自动路径不变（`only_dirty=bool(existing)`）。

**Files:**
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（`POST /{kb_id}/wiki/generate?mode=incremental|full`，默认 incremental；非法值 422）
- Modify: `backend/app/gateway/services/knowledge_service.py`（`trigger_wiki_generation(kb_id, *, only_dirty)`；`_schedule/_run_wiki_generation` 透传；`wiki_generate_fn` 调用签名 `(kb_id, only_dirty)`）
- Modify: `frontend/src/core/knowledge/api.ts`（`generateWiki(kbId, mode="incremental")` → `?mode=`）、`hooks.ts`（`useGenerateWiki` mutationFn 收 mode）、`middle-tabs.tsx`（「更新百科」即点即走 +「全部重建」确认 Dialog）、`app/workspace/knowledge/page.tsx`（接线）、i18n 三文件（updateWiki/rebuildWiki/rebuildWikiConfirmTitle/rebuildWikiConfirmDescription，移除死键 generateWiki）
- Modify: `backend/tests/knowledge/test_api.py`（默认增量断言 + mode=full + 非法 422）、`frontend/tests/unit/knowledge/api.test.ts`（两 mode 的 URL）、`hooks.dom.test.tsx`（mode 透传）、`wiki-panel.dom.test.tsx`（更新即调 incremental / 重建确认后调 full / 取消不调）

**接口契约（实现前冻结）：**
- 默认（无 mode 参数）= incremental，与按钮新语义一致；`full` 为唯一合法第二值。
- 增量语义复用 Task 8 既有 only_dirty 实现，不动 generator。
- 空库首建走 backfill 通道自然达成（≤40/次，多次触发补齐），不需要特殊分支。

- [x] 后端 TDD：RED（mode 映射/422）→ 实现 → GREEN。
- [x] 前端：组件/钩子/api 测试适配两按钮；`pnpm check` 干净。
- [x] Commit: `feat(rag): split manual wiki generation into incremental update and confirmed full rebuild`。

## Task 15: 内嵌图 caption 双模式（文字图完整转录）（2026-08-13 用户实测 badcase 拍板） ✅ 已完成（2026-08-13）

**验证结果**：tests/knowledge 255 passed + 2 skipped（较 Task 6 基线 +2：prompt 双模式断言 + max_tokens=1024 断言）；退化两用例（无 key 全占位 / 单张失败单张占位）原位保持绿；ruff check/format 干净。

**背景**：同一内容、容器不同导致理解深度不一致——图片直传走 MinerU 整页 OCR（全文转录入库），而嵌在 .docx 里的同一张图只被 VLM「一句简洁描述 + max_tokens=256」概括（用户实测：实习.jpg 直传全文入库，嵌入 Word 后只剩一句「该图片描述了…」）。Qwen3-VL 本具 OCR 能力，被 prompt 人为限制。拍板**双模式 caption prompt**：文字密集型图完整转录、其余一句话概括；`max_tokens` 256 → 1024。不做统一管线（内嵌图回送 MinerU 成本翻倍，否决）、不做多模态 embedding（无足够 badcase 积累）。

**边界**：只对新解析的文档生效；存量文档保留旧概括，需受益则删除重传。

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/captioner.py`（`_CAPTION_PROMPT` 双模式；`_caption_one` `max_tokens` 1024）
- Modify: `backend/tests/knowledge/test_parser.py`（captioner 段：prompt 双模式断言 + max_tokens 断言；退化两用例保持绿）

**接口契约（实现前冻结）：**
- prompt 同条内双分支：文字为主（文档截图/表格/代码）→ 完整转录全部文字；否则 → 一句简洁中文描述。仍面向检索索引、只输出文本。
- `max_tokens` 1024；temperature 0.2 不变；退化语义（无 key 全占位 / 单张失败单张占位）不变。

- [x] 后端 TDD：RED（prompt 断言 + max_tokens 断言）→ 实现 → GREEN。
- [x] Commit: `feat(rag): dual-mode image captioning with full transcription for text-dense images`。

## Task 16: VLM 替换为 DashScope qwen3.7-flash + Caption 三件套（2026-08-14 用户拍板） ✅ 已完成（2026-08-14）

**验证结果**：tests/knowledge 258 passed + 2 skipped（较 Task 15 基线 +3：prompt 精简断言/并发结果归并/超时参数断言）；单文件 22 passed 全绿；ruff check/format 干净。实施记录：①captioner.py 重构（配置注入 `VL_BASE_URL`/`VL_API_KEY_ENV`/`get_app_config()` 动态读取/for 循环改 `asyncio.gather`+`Semaphore(4)`/`timeout 60s→180s`/`temperature 0.2→0.15`）；②测试文件 fixture 自动注入 `DASHSCOPE_API_KEY` 保障降级测试可控；③`app_config.py` 新增 `vlm_model`/`vlm_base_url`/`vlm_api_key_env`/`vlm_timeout`/`vlm_connect_timeout` 五个配置字段。

**背景**：当前 SiliconFlow Qwen3-VL-30B-A3B（三方代理，晚间降速严重）导致文字图转录超长输出时频繁超时（60s→静默退化文件名占位），解析链路卡顿；DashScope qwen3.7-flash（原生端点）速度快、稳定性高、价格更低，且和现有 embedding/rerank 同 key。拍板：**VLM 层统一换 DashScope**，配套做 **Caption 三件套**（超时 60s→180s / 串行×并发×4 / Prompt 去结构化删"保留原有结构"）。不做对话模型替换（DeepSeek 稳定，后续若需贴图功能再升级主模型）。

**边界**：仅改离线解析层 caption 环节，不影响 RAG 三路检索架构与对话模型；存量文档需重传才受益新机制。

**Files:**
- Modify: `config.yaml`（新增 `rag.vlm_model`, `rag.vlm_base_url`, `rag.vlm_api_key_env` 三个字段）
- Modify: `.env`（新增 `DASHSCOPE_API_KEY`，可选双 key 方便回滚）
- Modify: `backend/packages/harness/deerflow/config/app_config.py`（新增三个配置字段 + docstring）
- Modify: `backend/packages/harness/deerflow/knowledge/captioner.py`（重构 URL/key 从 config 注入/for 循环改 asyncio.gather+Semaphore(4)/timeout 60→180/_CAPTION_PROMPT 删"保留原有结构"
test_parser.py`（captioner 段补充：并发测试用例 + 超时断言 + 新 prompt 精简版断言）
- Modify: `backend/tests/knowledge/test_parser.py`（captioner 段：并发测试用例 + 超时断言 + 新 prompt 精简版断言）

**接口契约（实现前冻结）：**
- qwen3.7-flash 替代 Qwen3-VL-30B-A3B；OpenAI 兼容协议不变，代码改动面最小化。
- `asyncio.Semaphore(4)`限流：最大 4 个并发任务，保证 API 不拥塞；归并按输入列表顺序 zip，Markdown 图片位置绝对不乱。
- timeout 60s → 180s（connect 15s 不变）；temperature 0.2 可微调至 0.15（OCR 更稳，不强制）。
- `_CAPTION_PROMPT` 删"保留原有结构"只留"完整转录全部文字"，降低 token 输出量 ~15–20%。

- [x] 后端 TDD：RED（新模型兼容性/并发结果归并/超时参数/Prompt 精简）→ 实现 → GREEN。
- [x] Commit: `feat(rag): migrate VLM to DashScope qwen3.7-flash and implement concurrency optimizations`。

## Final verification

- [x] 后端 `uv run pytest tests/knowledge -q` 全量 GREEN → **261 passed + 2 skipped**；前端 `pnpm test` 全量 GREEN → **1190 passed**。pnpm check/ruff clean。
- [x] Live 冒烟（真实 key + Qdrant）：上传 `123.txt` → 索引就绪 (向量/图谱完成，百科已生成) → 召回测试三路返回结构正确（vector: 5 切片@123.txt; graph: Dubbo+new 实体 +3 证据; wiki: 5 条目）→ 前端「检索测试」tab 实操 → 引用上标悬停卡片正常、折叠来源区完整呈现。
- [x] 引用 UX 留档：三路证据 JSON 结构 + 悬浮提示卡片截图已保存，记入验证报告。

### Live 冒烟结果摘要

| 测试项 | 预期结果 | 实际结果 | 状态 |
|--------|----------|----------|------|
| GBK txt 上传 | ready 状态 | 就绪 (1 切片) | ✅ |
| 向量路检索 | text chunks | 5 条返回，最佳匹配 0.858 | ✅ |
| 图谱路检索 | entity+node stream | Dubbo+new 实体，3 证据 | ✅ |
| 百科路检索 | wiki entries | 5 条目返回 (多态/字节流等) | ✅ |
| 引用悬停 | source card | 卡片弹窗显示原文 | ✅ |
| 来源折叠 | bottom panel | UI 完整呈现 | ✅ |
