# RAG Knowledge Base (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the Phase-1 RAG knowledge base: PDF/Word/MD ingestion via MinerU API, three retrieval paths (vector hybrid / knowledge-graph / wiki) exposed as agent tools, a `rag` custom agent (specialized chat window), and an ima-style three-column knowledge management UI with document list and read-only chunk preview.

**Spec:** `docs/superpowers/specs/2026-08-07-rag-knowledge-base-design.md`（所有设计决策的单一事实源；本 plan 只负责任务拆解，不复述设计论证）

**Architecture:** Reuse lead_agent's agent loop entirely (P0–P8); RAG capability ships as three builtin tools assembled via `tool_groups: ["rag"]` on a per-user custom agent with SOUL.md. Offline indexing = async worker driving parse→chunk→embed→extract→wiki pipeline; online query = three tools reading Qdrant (`kb_chunks`/`kb_entities`/`kb_wiki_entries`) + embedded graph store + backend DB.

**Tech Stack:** Python 3.12 / FastAPI / SQLAlchemy+Alembic / Qdrant (named dense+sparse vectors) / NetworkX+SQLite (graph) / MinerU official API / DashScope (Aliyun Bailian) qwen3.7-text-embedding (dense+sparse single-call) + qwen3-rerank / SiliconFlow Qwen3-VL-30B-A3B (image caption) / DeepSeek deepseek-v4-flash (unified Phase-1 model) / Next.js 16 + pnpm.

**Global Constraints:**
- Branch `feat/rag-knowledge-base`; every task: RED → GREEN → regression proof → commit (Conventional Commits).
- Secrets only from `.env` (`DASHSCOPE_EMBEDDING_API_KEY`, `DASHSCOPE_RERANK_API_KEY`, `SILICONFLOW_VLM_API_KEY`, `MINERU_API_TOKEN`, `DEEPSEEK_API_KEY`); never hardcode, never commit.
- Non-secret config in `config.yaml` `rag:` section only.
- API contract is frozen by spec §5.3; `contracts/` additions require review before implementation.
- Phase-1 scope fence: private KBs only (visibility=private), read-only chunk preview, no recall-test endpoint, no kb_members.
- Backend TDD mandatory: `cd backend && uv run pytest <file> -q`; frontend: `cd frontend && pnpm test` / `pnpm check`.

## Task 1: Infrastructure & config plumbing

**Files:**
- Modify: `docker/docker-compose-dev.yaml`, `docker/docker-compose.yaml` (add `qdrant` service: 6333, `qdrant_data` volume, healthcheck)
- Modify: `config.example.yaml` (add `rag:` section: qdrant_url, embedding/rerank/vlm model names, worker concurrency, extract rate limit)
- Modify: `backend/packages/harness/deerflow/config/app_config.py` (add `RagConfig` pydantic model + `rag` field)
- Modify: `backend/pyproject.toml` (uv add `qdrant-client`, `networkx`)
- Create: `backend/tests/test_rag_config.py`

- [x] Write failing test: `RagConfig` loads defaults; `rag.qdrant_url`/`models` overridable from dict; unknown rag keys rejected or tolerated per AppConfig `extra` policy.
- [x] Run `cd backend && uv run pytest tests/test_rag_config.py -q` and capture RED (no RagConfig).
- [x] Implement `RagConfig` (qdrant_url default `http://localhost:6333`, model name fields, `worker_concurrency: int = 2`, `extract_rate_limit_rps: float = 5.0`), wire into AppConfig; update `config.example.yaml`.
- [x] Add qdrant service to both compose files (no published port beyond loopback; follow existing service patterns); add `qdrant_data` volume.
- [x] `uv add qdrant-client networkx`; run test GREEN; revert RagConfig field, prove RED, restore, GREEN.
- [x] Validate compose: `docker compose -f docker/docker-compose-dev.yaml config -q`.
- [x] Commit: `feat(rag): add rag config section, qdrant service, and deps`.

## Task 2: Data model & storage layer

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/__init__.py`, `models.py` (SQLAlchemy tables), `store.py` (CRUD)
- Create: Alembic migration for `knowledge_bases`, `documents`, `chunks`, `graph_entities`, `graph_relations`, `wiki_entries`
- Create: `backend/packages/harness/deerflow/knowledge/vector_store.py` (Qdrant client + collection init)
- Create: `backend/tests/knowledge/test_models.py`, `test_vector_store.py`

- [x] Write failing tests: table CRUD round-trip; `knowledge_bases` has `owner_id`/`visibility` default `private`; `documents` has `uploader_id`/`status`/`progress_percent`/`chunk_count`/`storage_path`; `chunks` table carries text + `extract_status` (pending/done/empty/failed) for resume; Qdrant init creates 3 collections idempotently with named vectors (dense 1024 COSINE + sparse DOT) and payload indexes (`kb_id`, `doc_id`, `entities`); `upsert_chunks` payload carries `chunk_id` pointer + filter fields (`kb_id`/`doc_id`/`entities`) + unindexed display metadata (`doc_name`/`heading_path`/`page` per spec §3.3), never chunk text (text lives in the business DB per spec §3.2 切片存储归属).
- [x] Run tests, capture RED.
- [x] Implement SQLAlchemy models + migration (`knowledge_bases`: id/owner_id/name/description/visibility/created_at; `documents`: id/kb_id/uploader_id/name/size_bytes/storage_path/status/progress_percent/chunk_count/error/created_at; `chunks`: chunk_id/doc_id/kb_id/chunk_index/text/heading_path/page/token_count/entities/extract_status/extract_error; `graph_entities`: id/kb_id/name/type/description/source_chunk_ids jsonb/status; `graph_relations`: id/kb_id/source/target/relation/description/source_chunk_ids; `wiki_entries`: id/kb_id/title/content/status/source_chunk_ids/updated_at).
- [x] Implement `vector_store.py`: `init_collections()` idempotent create, `upsert_chunks()`, `hybrid_query(dense, sparse, kb_id, top_k)` with prefetch+RRF, `delete_by_doc()`, `delete_by_kb()`.
- [x] Tests GREEN against local Qdrant (docker service); revert collection init, prove RED, restore, GREEN.
- [x] Commit: `feat(rag): add knowledge data model, migration, and qdrant store`.

## Task 3: MinerU parse client & structure-aware chunker

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/parser.py` (MinerU API client)
- Create: `backend/packages/harness/deerflow/knowledge/chunker.py`
- Create: `backend/tests/knowledge/test_chunker.py`, `test_parser.py`, fixtures under `backend/tests/knowledge/fixtures/`

- [x] Write failing chunker tests from fixture markdown: heading-boundary splits; >1024-token block subdivided by paragraph; <100-token block merged with sibling; each chunk carries `heading_path`, `chunk_index`, `token_count`; target 512±256.
- [x] Write failing parser tests with mocked HTTP: submit file → poll task → fetch markdown + image list; timeout and 4xx/5xx error mapping; token read from env, never from caller. Write failing caption test: image refs → VLM caption (mocked Qwen3-VL call) → `![caption](...)` merged back into the markdown stream before chunking; VLM failure degrades to filename placeholder without aborting the document.
- [x] Run tests, capture RED.
- [x] Implement `chunker.py` (`chunk_markdown(md: str, doc_id: str) -> list[Chunk]` per spec §3.2 schema), `parser.py` (`parse_document(file_path) -> ParsedDocument` with caption-eligible image refs), and `captioner.py` (`caption_images(refs) -> mapping` writing captions back into markdown per spec §3.1).
- [x] Tests GREEN; revert one chunker rule (merge), prove its test RED, restore, GREEN.
- [x] Commit: `feat(rag): add MinerU parse client and structure-aware chunker`.

## Task 4: Vector path indexing (embed + upsert)

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/embedder.py` (DashScope qwen3.7-text-embedding client, dense+sparse single-call per spec §3.3), `indexer.py` (chunk→vector pipeline stage)
- Modify: `backend/packages/harness/deerflow/knowledge/vector_store.py` (sparse vector wiring)
- Create: `backend/tests/knowledge/test_indexer.py`

- [x] Write failing tests: embedder parses DashScope response into dense+sparse pair via `output_type=dense&sparse` (mocked HTTP); indexer upserts N chunks with payload fields per spec §3.3 and updates `documents.chunk_count`; failed embed marks chunk failed without aborting batch.
- [x] Run tests, capture RED.
- [x] Implement embedder (`embed(texts) -> list[(dense, sparse)]` from a single DashScope call, batch size limit, retry with backoff) and indexer stage (`index_chunks(kb_id, doc_id, chunks)`).
- [x] Tests GREEN (Qdrant local); verify one real fixture chunk end-to-end with live key (manual, not committed).
- [x] Revert embedder batching, prove RED, restore, GREEN.
- [x] Commit: `feat(rag): add qwen3.7-text-embedding embedder and vector indexing stage`.

## Task 5: Graph path indexing (extract → normalize → store → backfill)

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/graph/` (`extractor.py`, `normalizer.py`, `store.py`, `indexer.py`)
- Create: `backend/tests/knowledge/graph/test_extractor.py`, `test_normalizer.py`, `test_graph_store.py`

- [x] Write failing tests: extractor parses LLM JSON (entities+relations), malformed JSON → chunk `failed`, empty result → `empty`; gleaning second pass merges new entities; normalizer merges alias pairs (case/plural/embedding-similarity stub); graph store persists entity/relation with `source_chunk_ids`, same-name entity merges descriptions; entities backfilled into `kb_chunks` payload; per-chunk status transitions `pending→done/empty/failed` persist for resume.
- [x] Run tests, capture RED.
- [x] Implement extractor (small-model call, gleaning=1, JSON schema prompt), normalizer (alias table + embedding merge threshold), SQLite graph store + NetworkX in-memory loader, backfill step, doc-level "graph degraded" flag at >30% failures.
- [x] Tests GREEN; revert gleaning merge, prove RED, restore, GREEN.
- [x] Commit: `feat(rag): add graph extraction, normalization, store, and backfill`.

## Task 6: Wiki path indexing (triggered batch + dirty incremental)

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/wiki/` (`generator.py`, `store.py`)
- Create: `backend/tests/knowledge/wiki/test_generator.py`

- [x] Write failing tests: head-entity selection (~top 20% by degree/frequency); entry generation aggregates source chunks via graph `source_chunk_ids`; entry written to `wiki_entries` + vector upserted to `kb_wiki_entries` (payload: entry_id/title/kb_id); new doc marks affected entries `dirty`; regeneration clears dirty.
- [x] Run tests, capture RED.
- [x] Implement generator (`generate_wiki(kb_id)`) with main-model call per spec §3.5, triggered-batch semantics (threshold or manual), dirty incremental path.
- [x] Tests GREEN; revert dirty marking, prove RED, restore, GREEN.
- [x] Commit: `feat(rag): add wiki entry generation and incremental refresh`.

## Task 7: Three retrieval tools + tool group + access gate

**Files:**
- Create: `backend/packages/harness/deerflow/tools/builtins/hybrid_search_tool.py`, `wiki_search_tool.py`, `graph_search_tool.py`
- Create: `backend/packages/harness/deerflow/knowledge/access.py` (`can_access(user_id, kb_id)`)
- Modify: `config.example.yaml` (`tool_groups: [{name: rag, tools: [hybrid_search, wiki_search, graph_search]}]`), tool registry
- Create: `backend/tests/knowledge/tools/test_hybrid_search.py`, `test_wiki_search.py`, `test_graph_search.py`, `test_access.py`

- [x] Write failing tests per spec §4: hybrid (RRF prefetch → reranker → top-5, chunk text fetched from business-DB `chunks` table by `chunk_id`, payload supplies doc_name/page/heading_path); graph (query-entity extraction → kb_entities match → 1–2 hop expansion → source_chunk_ids fetch chunk text from `chunks` table + entities back-query; empty → honest "not found"); wiki (vector top-k → full entry from `wiki_entries` table by `entry_id`); each tool reads `kb_id` via `ToolRuntime` context and missing `kb_id` returns guidance text; `can_access` Phase-1 = owner check; tool denies when access fails.
- [x] Run tests, capture RED.
- [x] Implement tools with `@tool(parse_docstring=True)`, docstrings stating when-to-use per spec §5.1; `access.py`; tool group registration.
- [x] Tests GREEN; revert access gate, prove RED, restore, GREEN.
- [x] Commit: `feat(rag): add hybrid/wiki/graph search tools with access gate`.

## Task 8: Knowledge-base API + async index worker

**Files:**
- Create: `backend/app/gateway/routers/knowledge_bases.py` (spec §5.3 endpoints, Phase-1 subset: all except recall-test)
- Create: `backend/app/gateway/services/knowledge_service.py`, `backend/packages/harness/deerflow/knowledge/worker.py`
- Create: `backend/tests/knowledge/test_api.py`, `test_worker.py`

- [x] Write failing API tests (contract per spec §5.3): kb CRUD; document upload (multipart) returns 202 + document row in `uploaded`; document list includes status/progress_percent/chunk_count/uploader_id; chunks endpoint paginates; delete cascades (mock stores); non-owner gets 403 via `can_access`; wiki/generate enqueues.
- [x] Write failing worker tests: pipeline advances document status `uploaded→parsing→chunking→indexing→ready`; failure sets `failed` with error; progress_percent = graph-done/total; concurrency cap respected; startup recovery re-enqueues non-terminal documents without re-processing done chunks (spec §3.7 启动恢复).
- [x] Run tests, capture RED.
- [x] Implement router (thin) + service + asyncio worker with semaphore (config `rag.worker_concurrency`), wiring Task 3–6 stages; register router in gateway app.
- [x] Tests GREEN; revert one status transition, prove RED, restore, GREEN.
- [x] Commit: `feat(rag): add knowledge base API and async index worker`.

## Task 9: `rag` custom agent assembly

**Files:**
- Create: bootstrap assets for `agents/rag/` (`config.yaml`, `SOUL.md`) under the per-user agents layout or seeding path
- Modify: `config.example.yaml` comments referencing the rag tool group
- Create: `backend/tests/knowledge/test_rag_agent_assembly.py`

- [x] Write failing test: assembling with `agent_name="rag"` yields tools restricted to the rag group; system prompt includes SOUL.md citation/拒答 rules; lead_agent (no agent_name) does NOT include rag tools; with `context.deep_research=true` the prompt gains the mandatory three-path instruction (spec §4.7), and without it the prompt carries the default vector-first guidance.
- [x] Run test, capture RED.
- [x] Author `SOUL.md` (citation format `[n]`, source attribution, "检索不到就说不知道" refusal policy, retrieval workflow guidance, dual-mode retrieval behavior per spec §4.7) and agent `config.yaml` (`tool_groups: ["rag"]`, `skills: []`, `model_settings.temperature: 0.1`); implement deep_research as a **middleware dynamic injection** (before_model hook reads `context.deep_research` and injects the mandatory three-path instruction per run — SOUL.md stays static), soft enforcement only in Phase 1.
- [x] Test GREEN; revert tool_groups filter, prove RED, restore, GREEN.
- [x] Commit: `feat(rag): add rag custom agent with citation-focused soul`.

## Task 10: Frontend knowledge three-column page

**Files:**
- Create: `frontend/src/app/workspace/knowledge/page.tsx` (+ layout, left/middle/right column components)
- Create: `frontend/src/core/knowledge/` (API client, hooks, types)
- Create: right-panel chat history popover component (current-kb thread list)
- Modify: `frontend/src/components/workspace/workspace-nav-chat-list.tsx` (add 知识库 first-level entry → `/workspace/knowledge`)
- Modify: `frontend/src/components/workspace/recent-chat-list.tsx` (exclude threads carrying `metadata.kb_id` — kb conversations stay isolated inside the knowledge page, ima-style)
- Modify: i18n locale files (zh-CN + en) for all new copy
- Create: `frontend/tests/unit/knowledge/*.test.tsx`

- [x] Write failing kb/document tests: kb list groups (个人知识库 + 组头「+」新建); header [设置] → kb rename (PATCH) / delete (DELETE with cascade-warning confirm dialog); document table columns (名称/上传者/大小/切片数/状态/时间) with progress badge and "—" chunk placeholder; 图谱降级 surfaced via the document `error` field text (per-path sub-marker fields are a Phase-2 contract addition — Phase 1 shows main status + progress only); bottom stats row aggregated client-side; upload drag-drop → POST → polling until ready/failed; row actions: 删除 with cascade-warning confirm → DELETE, failed doc shows 重试 → POST retry; header [生成百科] → POST wiki/generate; row click opens read-only chunk drawer (text/heading_path/page/token_count/entities) paginating through the chunks endpoint.
- [x] Write failing chat-panel tests: binds current kb (`context.kb_id` single value, `assistantId="rag"`); new thread creation writes `metadata.kb_id`; panel header has 新建会话 + history clock popover listing only current-kb threads (filter by `metadata.kb_id`, date-grouped, reusing `useInfiniteThreads`), switching threads loads that conversation; global `RecentChatList` excludes `metadata.kb_id` threads; no-kb-selected state shows guidance + disabled input (spec §4.5); 深度检索 toggle renders in the chat input area and propagates as `context.deep_research` (spec §4.7); citation card renders from tool metadata, click expands chunk text via the shared chunk display component (spec §4.6/§3.6); tool_progress retrieval status renders via the existing chat kit; "expand" entry navigates to `/workspace/agents/rag/chats/{thread_id}` (spec §5.2).
- [x] Run `cd frontend && pnpm test`, capture RED.
- [x] Implement page against Task 8 contract (mock server first); wire useStream chat panel reusing existing chat kit; sidebar entry; RecentChatList reverse filter; chat history popover; i18n keys.
- [x] Tests GREEN; `pnpm check` clean.
- [x] Revert citation card, prove RED, restore, GREEN.
- [x] Commit: `feat(frontend): add knowledge base three-column workspace page`.

## Task 11: End-to-end verification

**Files:**
- Create: `backend/tests/knowledge/test_e2e_smoke.py` (marked integration), `docs` updates (README + backend/AGENTS.md knowledge section + frontend/AGENTS.md route note)

- [x] With live keys + Qdrant: upload one small PDF and one MD via API; wait for `ready`; assert `chunk_count` > 0, graph entities exist, wiki generated after trigger.
- [x] Start stack; in rag chat window ask one factual and one conceptual question; assert citations render and answers ground in uploaded docs; assert lead_agent window has no rag tools. (browser-verified on 2026-08-09: factual + conceptual answers carry citation cards grounded in the uploaded PDF/MD + generated wiki entries; citation click expands the chunk原文; kb threads stay out of the global recent list; lead_agent tool isolation pinned by `test_default_tool_resolution_excludes_opt_in_rag_tools`. Two live-found defects fixed: gateway context whitelist dropped `kb_id`/`deep_research`; knowledge layout missed ArtifactsProvider/PromptInputProvider)
- [x] Run full backend suite `uv run pytest tests/knowledge -q` and frontend `pnpm check && pnpm test`. (backend done: 147 passed; frontend done: 1073 passed + `pnpm check` clean)
- [x] Update README.md (user-facing) and module AGENTS.md files per documentation sync rule.
- [x] Commit: `test(rag): add e2e smoke and docs`.

## Final verification

- [x] `cd backend && uv run pytest -q` and `make lint` / `make format` clean. (done 2026-08-09: 11099 passed / 106 failed — all pre-existing Windows baseline: sandbox paths, pnpm runner, provisioner, skill permissions, wechat; zero RAG-related; ruff check + format clean)
- [x] `cd frontend && pnpm check && pnpm test` clean. (done 2026-08-09: 137 files / 1073 passed, lint + tsc clean)
- [x] Fresh-boot checklist: `make dev` up → create kb → upload → index ready → chat with citations → delete doc → cascade verified (Qdrant/graph/wiki rows gone). (done 2026-08-09 on the live stack via browser + cascade-check script: kb_chunks 5→4, graph entities 34→30, relations 30→27, wiki entries correctly kept per dirty-flag contract)
- [x] Record index cost of the smoke corpus (extract call count, embedding tokens) in the PR description to calibrate `rag.extract_rate_limit_rps`. (data collected 2026-08-09 from Gateway logs — factual Q&A: 3 LLM calls (26.5k input / 23.3k cache-read) + 2 embedding + 1 rerank; conceptual: 2 LLM (24.3k / 18.3k cached) + 2 embedding + 1 rerank; indexing one small doc: MinerU ×1, extract ×5 (1/chunk), wiki ×6, embedding ~3 batches; conclusion: extract_rate_limit_rps=5 ample for small corpora, graph extract is the scale bottleneck — ready to paste into the PR description when the PR is opened)
