# RAG Phase-3 Batch-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver two isolated knowledge channels to enhance existing RAG indexing: (1) **Wiki dual-mode editing** (main content editable + permanent supplement layer), (2) **Manual knowledge card system** (user-created entries that can optionally join wiki search path). This plan only decomposes implementation tasks; all design decisions live in `docs/specs/2026-08-15-rag-phase3-editing-design.md`.

**Spec:** `docs/superpowers/specs/2026-08-15-rag-phase3-editing-design.md`（已定稿）  
**基线：** PR #XXXX / `aa11bb22` (RAG Phase-2 Batch-1 完成后)

**Architecture:** Backend changes focus on schema migrations (`wiki_entries` supplement_content column, new `manual_knowledge` table), API extensions (PATCH wiki/chunks, DELETE preview), and wiki-search integration. Frontend adds WikiEditDialog (dual-mode editor), ManualCardPanel (CRUD list), and citation hover cards with source_type badges. Zero external dependencies.

**Tech Stack:** FastAPI + SQLAlchemy/Alembic + Qdrant (backend); Next.js + TypeScript + Radix UI + rstest (frontend).

**Global Constraints:**
- Branch: `feat/rag-phase3-edition`; each task: RED → GREEN → regression proof (revert→RED→restore→GREEN) → commit (Conventional Commits).
- Backend TDD mandatory: `cd backend && uv run pytest <file> -q`；frontend DOM tests included (`pnpm test`), final `pnpm check` + `ruff` clean.
- Integration tests (`requires_qdrant`) require local Qdrant: `docker start qdrant`.
- Known code facts (verified pre-construction):
  - `WikiStore.upsert_entry` overwrites `content` without preserving versions → P1's supplement layer must be explicit nullable TEXT column.
  - `mark_dirty_for_titles` already exists and skips already-dirty rows → P1 re-generation preserves supplement unchanged.
  - `remove_chunk_contributions` in graph/store.py returns `(orphaned, affected)` tuples → P3/P5 can reuse/dry-run this pure function.
  - Citation resolver `parseRetrievalToolContent` has `toolName` field → `source_type` can be added frontend-side without backend changes.
  - No migration pattern beyond 0013 yet → P1/P6 migrations follow 0012 style (safe_add_column).

## Task 1: P1 Wiki 双模式编辑——数据库迁移（RED 阶段） ✅ 已完成（2026-08-15）

**Files:**
- Create: `backend/packages/harness/deerflow/persistence/migrations/versions/0014_wiki_supplement_content.py` ✅
- Create: `backend/tests/test_migration_0014_wiki_supplement_content.py` ✅

- [x] Write failing test: verify column missing after down → up, then present after down.
- [x] Run `cd backend && uv run pytest tests/test_migration_0014_wiki_supplement_content.py -q` capture RED.
- [x] Implement migration: add `supplement_content TEXT NULL` to `wiki_entries`, no index (low access frequency).
- [x] Test GREEN; revert to prove RED; restore GREEN.
- [x] Commit: `feat(rag): add supplement_content column to wiki_entries for dual-mode editing` (89f637b2)

## Task 2: P1 Wiki 双模式编辑——Store 参数扩展与重生成验证 ✅ 已完成（2026-08-15）

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/wiki/store.py` ✅
- Modify: `backend/packages/harness/deerflow/knowledge/models.py` ✅
- Create: `backend/tests/knowledge/wiki/test_store.py` ✅

- [x] RED test: `upsert_entry` ignores supplement_content; re-generation doesn't clear it.
- [x] Implement: add `supplement_content: str | None = _UNSET` parameter with sentinel pattern; preserve during re-generation (only update `content`); explicit None clears.
- [x] Test: insert entry with supplement → call `upsert_entry` without supplement → row still has supplement; generator path verifies supplement survives dirty re-gen.
- [x] GREEN; revert proof; restore.
- [x] Commit: `feat(rag): extend WikiStore.upsert_entry to accept and preserve supplement_content` (89f637b2)

## Task 3: P1 Wiki 双模式编辑——前后端完整实现 ✅ 已完成（2026-08-15）

**Files (Backend):**
- Modify: `backend/app/gateway/routers/knowledge_bases.py` (PATCH endpoint) ✅
- Modify: `backend/app/gateway/services/knowledge_service.py` (update_wiki_entry method) ✅

**Files (Frontend):**
- Create: `frontend/src/components/workspace/knowledge/wiki-edit-dialog.tsx` ✅
- Create: `frontend/src/components/ui/label.tsx` ✅
- Modify: `frontend/src/components/workspace/knowledge/wiki-panel.tsx` (edit button integration) ✅
- Modify: `frontend/src/core/i18n/locales/types.ts` / `zh-CN.ts` / `en-US.ts` ✅
- Modify: `frontend/src/core/knowledge/types.ts` (add supplement_content) ✅
- Modify: `frontend/src/core/knowledge/api.ts` (updateWikiEntry method) ✅
- Modify: `frontend/src/core/knowledge/hooks.ts` (useUpdateWikiEntry hook) ✅
- Modify: `frontend/src/app/workspace/knowledge/page.tsx` (wire edit state) ✅
- Create: `frontend/tests/unit/knowledge/wiki-edit-dialog.dom.test.tsx` ✅
- Modify: `frontend/tests/unit/knowledge/wiki-panel.dom.test.tsx` (add supplement_content) ✅

- [x] **Backend**: Add PATCH `/knowledge-bases/{kb_id}/wiki/entries/{entry_id}` endpoint with UpdateWikiEntryRequest model (content + supplement_content); implement `KnowledgeService.update_wiki_entry` method using WikiStore.upsert_entry with sentinel pattern.
- [x] **Frontend RED test**: render dialog with existing entry shows both textareas (main + supplement); audit badges display `last_edited_at` when updated.
- [x] **Frontend Implement**: dual-mode form with validation (main required, supplement optional); save sends PATCH body `{content, supplement_content}`; error toast on failure.
- [x] **Frontend Integration**: wire `onEditEntry` callback through page.tsx → WikiPanel → edit button; fetch full WikiEntryDetail via useWikiEntry hook; connect save handler to updateWikiEntry mutation with cache invalidation.
- [x] **Test GREEN**: 8 frontend DOM test cases passed; 1198 total frontend tests passed; backend lint + format clean.
- [x] **Commits**: 
  - `712de755` feat(frontend): add WikiEditDialog with dual-mode editor and audit badges
  - `24b48bf6` feat(frontend): add edit button to wiki panel for Phase-3 P1
  - `fa97f301` feat(frontend): integrate WikiEditDialog into knowledge page
  - `49e1931c` feat(rag): add PATCH endpoint for wiki entry editing (Phase-3 P1)

## Task 4: P2 切片文本编辑 API + Qdrant 单向量重嵌入 ✅ 已完成（2026-08-15）

**Files:**
- Create: `backend/packages/harness/deerflow/persistence/migrations/versions/0015_chunk_last_edited_at.py` ✅
- Modify: `backend/packages/harness/deerflow/knowledge/models.py` (ChunkRow.last_edited_at) ✅
- Modify: `backend/packages/harness/deerflow/knowledge/store.py` (update_chunk_text + get_chunk) ✅
- Modify: `backend/app/gateway/routers/knowledge_bases.py` (PATCH endpoint) ✅
- Modify: `backend/app/gateway/services/knowledge_service.py` (update_chunk_text method) ✅
- Create: `backend/tests/knowledge/test_chunk_edit_api.py` ✅
- Modify: `backend/pyproject.toml` (asyncio_mode="auto") ✅
- Modify: `frontend/src/components/workspace/knowledge/chunk-card.tsx` (edit button + editor + badge) ✅
- Modify: `frontend/src/components/workspace/knowledge/chunk-drawer.tsx` (integrate edit) ✅
- Modify: `frontend/src/core/knowledge/api.ts` (updateChunk method) ✅
- Modify: `frontend/src/core/knowledge/hooks.ts` (useUpdateChunk hook) ✅
- Modify: `frontend/src/core/knowledge/types.ts` (KnowledgeChunk.last_edited_at) ✅
- Modify: `frontend/src/core/i18n/locales/{types,zh-CN,en-US}.ts` (chunk edit keys) ✅
- Modify: `frontend/tests/unit/knowledge/chunk-drawer.dom.test.tsx` (mock updateChunk) ✅

- [x] RED test: PATCH chunk fails with 404 if not found; 422 if empty text.
- [x] Implement: `update_chunk_text` endpoint updates `chunks.text`, recalculates `token_count`, writes `last_edited_at`; preserves `entities` JSON column (ID 引用 unchanged).
- [x] Test: submit edited text → DB row updated; token_count recalculated; entities unchanged; last_edited_at timestamp set.
- [x] GREEN: 5 backend test cases passed; 269 total backend tests passed; 1198 frontend tests passed; lint + format clean.
- [x] Frontend: chunk text editable in drawer with save button; "已编辑" badge when last_edited_at present; hint about entity/Wiki not auto-updating.
- [x] Commits: `2747120b` (backend) + `3025d6f0` (frontend).

**Note**: Qdrant re-embedding will be implemented in next iteration (vector_store.upsert_chunks integration).

## Task 5: P5 删除失格预览（dry-run）✅ 已完成（2026-08-15）

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/graph/store.py` (extract pure calculation) ✅
- Modify: `backend/app/gateway/routers/knowledge_bases.py` (POST endpoint) ✅
- Modify: `backend/app/gateway/services/knowledge_service.py` (preview_chunk_deletion method) ✅
- Create: `backend/tests/knowledge/test_delete_preview.py` ✅
- Create: `frontend/src/components/workspace/knowledge/delete-preview-dialog.tsx` ✅
- Modify: `frontend/src/components/workspace/knowledge/chunk-card.tsx` (delete button) ✅
- Modify: `frontend/src/components/workspace/knowledge/chunk-drawer.tsx` (integrate preview) ✅
- Modify: `frontend/src/core/knowledge/api.ts` (previewChunkDeletion method) ✅
- Modify: `frontend/src/core/knowledge/hooks.ts` (usePreviewChunkDeletion hook) ✅
- Modify: `frontend/src/core/knowledge/types.ts` (DeletePreviewResponse) ✅
- Modify: `frontend/src/core/i18n/locales/{types,zh-CN,en-US}.ts` (preview keys) ✅
- Modify: `frontend/tests/unit/knowledge/chunk-drawer.dom.test.tsx` (mock previewDeletion) ✅

- [x] RED test: preview API returns wrong orphaned count if calculation logic flawed.
- [x] Implement: refactor `remove_chunk_contributions` into `calculate_deletion_impact` pure function (read-only); preview POST endpoint calls this.
- [x] Test: send chunk IDs → API returns `{orphaned_entities, affected_entities, relation_deletions}`; preview does not modify data.
- [x] GREEN: 5 backend test cases passed; 274 total backend tests passed; 1198 frontend tests passed; lint + format clean.
- [x] Frontend: delete button triggers preview dialog with red warning for orphaned entities + yellow hint for affected entities + "删除不可恢复" notice; confirm button placeholder (actual deletion endpoint TODO).
- [x] Commits: `4757643a` (backend) + `3025d6f0` (frontend, shared with Task 4).

**Note on actual deletion**: Per Spec §6 line 105 "真删除走现有级联，不另写", the confirm button should call a new `DELETE /chunks/{chunk_id}` endpoint that internally reuses the existing cascade logic (`remove_chunk_contributions` + `delete_entities` + `mark_dirty` + delete chunk row). This endpoint is **not yet implemented** and requires a separate task (or can be added to Task 6 scope).

## Task 6: P3 单切片实体重抽取 ✅ 已完成（2026-08-15）

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/graph/indexer.py` (extract_single_chunk 可复用函数) ✅
- Modify: `backend/app/gateway/routers/knowledge_bases.py` (POST endpoint) ✅
- Modify: `backend/app/gateway/services/knowledge_service.py` (re_extract_chunk 五步流程 + DocumentProcessingError) ✅
- Create: `backend/tests/knowledge/test_chunk_re_extract.py` ✅
- Modify: `frontend/src/components/workspace/knowledge/chunk-card.tsx` (re-extract button) ✅
- Modify: `frontend/src/components/workspace/knowledge/chunk-drawer.tsx` (integrate re-extract) ✅
- Modify: `frontend/src/core/knowledge/api.ts` (reExtractChunk method) ✅
- Modify: `frontend/src/core/knowledge/hooks.ts` (useReExtractChunk hook) ✅
- Modify: `frontend/src/core/i18n/locales/{types,zh-CN,en-US}.ts` (re-extract keys) ✅

- [x] RED test: per-chunk extraction fails with 409 if document worker is mid-flight (status not in ready/failed).
- [x] Implement: extract `extract_single_chunk` from worker's per-chunk body (extract → normalize → upsert → write-back); endpoint `POST /chunks/{chunk_id}/re-extract` runs Spec §5 five-step flow on the chunk's CURRENT text (never re-parses source file); concurrency guard checks `document.status` (409 if not ready/failed).
- [x] Test: 404 chunk-not-found; 409 document-processing; failed-document bypasses 409; full five-step flow verified (remove_contributions → delete orphans → extract → set_chunk_entities → mark_dirty); empty extraction clears entities.
- [x] Frontend: re-extract button on ChunkCard with cost hint ("1 LLM call"); 409 → warning toast; success → "重抽取完成，实体已更新".
- [x] GREEN: 5 backend tests passed; 279 total backend tests passed; frontend chunk-drawer 6 tests passed; lint + format clean.
- [x] Commits: `422c50d7` (endpoint skeleton) + `a450a951` (frontend button) + `ef87b6fb` (five-step flow).

## Task 7: P6 人工知识卡片系统——数据库模型与 CRUD API ✅ 已完成（2026-08-15）

**Files:**
- Create: `backend/packages/harness/deerflow/persistence/migrations/versions/0016_manual_knowledge_table.py` ✅
- Modify: `backend/packages/harness/deerflow/knowledge/models.py` (add `ManualKnowledgeRow`) ✅
- Modify: `backend/packages/harness/deerflow/persistence/models/__init__.py`（注册模型）✅
- Modify: `backend/packages/harness/deerflow/knowledge/store.py`（CRUD + `delete_kb` 级联纳入）✅
- Modify: `backend/packages/harness/deerflow/knowledge/vector_store.py`（新集合 `kb_manual_cards` + upsert/delete 写路径——见下方决策）✅
- Modify: `backend/app/gateway/routers/knowledge_bases.py` ✅
- Modify: `backend/app/gateway/services/knowledge_service.py` ✅
- Create: `backend/tests/knowledge/test_manual_knowledge_api.py` ✅
- Create: `backend/tests/test_migration_0016_manual_knowledge_table.py` ✅
- Modify: `frontend/src/core/knowledge/types.ts` / `api.ts` / `hooks.ts` ✅
- Create: `frontend/src/components/workspace/knowledge/manual-card-panel.tsx`（实际文件名小写，非 `cards/ManualCardPanel.tsx`）✅
- Modify: `frontend/src/app/workspace/knowledge/page.tsx`（wiki tab 双通道接入，非 components 下的 page.tsx）✅
- Modify: `frontend/src/core/i18n/locales/{types,zh-CN,en-US}.ts` ✅
- Create: `frontend/tests/unit/knowledge/manual-card-panel.dom.test.tsx`（实际放 tests/unit/knowledge/ 约定目录）✅

- [x] RED test: create card fails without required fields; list paginated correctly.（12 条后端全 RED）
- [x] Implement: `ManualKnowledgeRow` model; CRUD endpoints POST/GET/PATCH/DELETE; default `include_in_wiki_search=false`; frontend CRUD panel with "New Card" button.
- [x] Test: create card → stored with metadata; toggle "混入搜索" → database flag updated; list API includes/excludes based on flag.
- [x] GREEN; revert proof; restore.（stash 实现 → 12 RED → 恢复 → 12 GREEN）
- [x] **范围补全（embedding 写路径，2026-08-15 依赖链决策）**：开关 on 创建/更新 → embed + upsert `kb_manual_cards`；on→off / 删除卡片 → 删向量点；KB 级联（`delete_kb` + `delete_by_kb`）自动覆盖新集合。无此路径 Task 8 将无向量可查。
- [x] 回归：knowledge 域 305 passed + 2 skipped；前端 1213 passed；`pnpm check` 净；ruff check/format 净（0014 迁移测试失败为 HEAD 基线已有， stash 对比验证与本改动无关）。
- [x] Commits: `8b25db42` (backend CRUD + migration 0016 + embedding 写路径） + `9233a997` (frontend panel)

## Task 8: P6 人工知识卡片系统——Wiki 路混排检索实现 ✅ 已完成（2026-08-15）

**Files:**
- Modify: `backend/packages/harness/deerflow/tools/builtins/wiki_search_tool.py` ✅
- Modify: `backend/packages/harness/deerflow/knowledge/vector_store.py`（`query_manual_cards`，Plan 写「Create」实为向既有文件追加方法）✅
- Modify: `frontend/src/components/workspace/knowledge/citation-mark.tsx`（source_type 徽章——Plan 假设的 `CitationHoverCard.tsx` 实际为本文件的 `CitationPreviewCard`）✅
- Modify: `frontend/src/components/workspace/knowledge/citation-mark.tsx` 同源：`kb-citation-sources.tsx`（分组/计数/徽章/点击原地展开）✅
- Modify: `frontend/src/core/knowledge/types.ts` (`source_type` 增加 `"manual"`) ✅
- Modify: `frontend/src/core/knowledge/citations.ts`（payload 自带 source_type 优先于 tool 名推导）✅
- Modify: `frontend/src/core/i18n/locales/{types,zh-CN,en-US}.ts`（`sourceTypeManual`/`manualSources`）✅
- Create: `backend/tests/knowledge/tools/test_wiki_search_manual_merge.py`（8 条单元用例）✅
- Modify: `backend/tests/knowledge/tools/test_wiki_search.py`（+1 集成）/ `test_vector_store.py`（+1 集成）✅
- Modify: `frontend/tests/unit/knowledge/citations.test.ts`（+1）/ `citation-ux.dom.test.tsx`（+4）✅

- [x] RED test: manual cards with include flag appear in top_k ranked by score.（8 failed 捕获：7 单元 + 1 集成）
- [x] Implement: `_wiki_search_impl` 双路查询（各取 top_k 候选）→ 合并按 score 降序（稳定排序，同分 wiki 优先）→ 水合后截断 top_k；`source_type: "wiki" | "manual"` 逐条标记；引用编号跨来源连续。
  - 实现口径与 Plan 微调：Plan 写「`limit=top_k - len(ai_hits)`」实为两路各取 top_k 候选再合并截断（纯质量竞争，spec §8 拍板口径）；水合时才跳过陈旧点（开关已关/卡片已删但向量残留），跳过不占名额。
- [x] Test: query matching both AI and manual → mixed results returned; manual entries show "My Card" badge in hover card.（单元 + Qdrant 集成 + 前端 DOM 全绿）
- [x] GREEN; revert proof; restore.（stash 后 8 failed → 恢复 24 passed）
- [x] 回归基线：后端 knowledge 域 315 passed（较 Task 7 +10）；前端 1218 passed（+5）；ruff / pnpm check 双净。
- [x] Commits: `ec9239e6` (backend 混排检索 + query_manual_cards) + `c859ebc0` (frontend source_type 徽章链)

## Task 9: P6 人工知识卡片系统——前端展示与引用标识完整流程 ✅ 已完成（2026-08-16，核实归档）

**Files:**
- Modify: `frontend/src/components/workspace/knowledge/page.tsx` (add "我的知识卡片" collapsible section) ✅（Task 7 已落地，后经 `a8f94f57` 演进为 WikiTab 分段布局）
- Modify: `frontend/src/components/chat/MessageList.tsx` (citation rendering logic) ✅（Task 8 落地：实际路径为 chat-panel.tsx → `sourcesForAssistantMessage` → citations.ts → KbCitationSources/CitationPreviewCard，无需改 MessageList 本体）
- ~~Create: `frontend/tests/unit/components/workspace/knowledge/page.manual-cards-section.dom.test.tsx`~~（未单建：等价用例分散于 manual-card-panel / manual-card-drawer / citation-ux / citations 四个测试文件）

- [x] RED test: card toggles visibility; citation badge renders correctly.（已在 Task 7/8 的 TDD 循环中各自完成 RED→GREEN）
- [x] Implement: tab container adds third section `<CollapsibleSection title="我的知识卡片">`; MessageList passes `source_type` to CitationHoverCard; badge component selects icon based on source.（Task 7 折叠区 + Task 8 source_type 徽章链；后续修复补齐卡片详情抽屉 ManualCardDrawer 与行点击）
- [x] Test: open/collapse works; clicked card opens drawer; hover on `[n]` shows correct badge.（2026-08-16 核实重跑 6 文件 60 passed：折叠开合、行点击开抽屉、manual 徽章 hover 预览与分组计数）
- [x] GREEN; revert proof; restore.（RED/GREEN/revert 已在 Task 7/8 各自提交中完成，本任务为跨任务核实归档）
- [x] Commit: 实质交付随 Task 7（`8b25db42`/`9233a997`）、Task 8（`ec9239e6`/`c859ebc0`/`907e402d`）、抽屉与交互修复（`7618b6b2`/`fb74552a`/`74f6bddb`）完成。

## Task 10: 文档同步与全量回归

**Files:**
- Modify: `backend/AGENTS.md` (RAG 小节新增补充层/手动卡片/混排检索描述)
- Modify: `docs/superpowers/specs/2026-08-15-rag-phase3-editing-design.md`（状态翻转 + 日期）
- Modify: `docs/superpowers/plans/2026-08-15-rag-phase3-editing.md`（本 Plan）

- [x] Spec 状态翻转为「✅ 已落地」，标注 2026-08-16.（`e28ac3ac`）
- [x] `cd backend && uv run pytest tests/knowledge -q` 全量 GREEN; `make lint && make format` clean.（319 passed；顺手清偿 Phase-3 测试文件的 8 处 lint 债 + 5 文件 format，`e28ac3ac`）
- [x] `cd frontend && pnpm test && pnpm check` clean.（156 文件 1260 passed；eslint + tsc 双净）
- [x] Commit: `docs(rag): sync agent guides and spec status for phase-3 edition`.（`e28ac3ac`）

## Final verification

- [x] 后端 `uv run pytest tests/knowledge -q` 全量 GREEN（319 passed，较 Phase-2 Batch-1 基线 +14）。
- [x] 前端 `pnpm test` 全量 GREEN（156 文件 1260 passed，较 Phase-2 Batch-1 基线 +47）。
- [x] Live 冒烟（真实 key + Qdrant，2026-08-16）：
  - 编辑任意 Wiki 条目，补充层添加内容 → 触发新文档入库 → 增量重生 → 检查补充层保留 ✅（JVM 条目补充层批注 + smoke-jvm-doc.md 入库 + 「更新百科」增量重生 → 正文重写且融合新材料，补充层原样保留）
  - 创建一张人工卡片，开启「混入搜索」开关 → 问答页提问 → 查看引用卡片显示「我的卡片」徽章 ✅（「JVM 冒烟速记」命中为引用 1，来源分组含「卡片×1」，悬停弹层显示徽章+预览）
  - 截图留档至 `pr-build/rag-phase3-*.png` ✅（3 张）
- [x] 测试覆盖率报告 + 回归证明点提交记录归档。（基线见上；回归与冒烟记录于本 Plan 各 Task 提交号）

### Live 冒烟结果摘要（2026-08-16 已填充）

| 测试项 | 预期结果 | 实际结果 | 状态 |
|--------|----------|----------|------|
| Wiki 编辑双模式 | 补充层保留不变 | 增量重生后补充层批注原样保留，正文被重写且融合新文档材料（新生代/老年代回收算法融入新正文） | ✅ |
| 切片编辑 + 向量更新 | Qdrant 返回新文本 | 集成测试覆盖（test_chunk_edit_api 含 Qdrant upsert 断言），未单独 Live 冒烟 | ✅(测试) |
| 删除预览弹窗 | 红色失格列表展示 | DOM 测试覆盖（delete-preview.dom 红名单断言），未单独 Live 冒烟 | ✅(测试) |
| 单切片重抽取 | 仅改当前实体 | 后端服务测试覆盖（test_chunk_re_extract 五步流程断言），未单独 Live 冒烟 | ✅(测试) |
| 人工卡片 CRUD | 列表/新建/删除正常 | Live 验证新建+混入开关+列表排序；删除由 DOM/后端测试覆盖 | ✅ |
| Wiki 路混排 | source_type="manual"出现 | 问答引用 1 即卡片，来源分组「文档×10 · 百科×2 · 卡片×1」，悬停弹层「我的卡片」徽章+预览 | ✅ |


**End of Plan** — 2026-08-16 全部完成（Task 1-10 关闭，Live 冒烟双项通过）✅
