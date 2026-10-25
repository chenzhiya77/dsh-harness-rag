# AGENTS.md

Guidance for AI coding agents working in `harness-rag` (主体二, the knowledge-service engine for the DSH `dsh-harness-rag` plugin).

## Role

This repository is **not** the DeerFlow product. It serves only the knowledge-base API consumed by the DSH plugin:

- `/api/knowledge-bases`
- `/api/rag/config`
- `/api/models`
- `/health`

Full product work (chat workbench, IM channels, scheduler, sandbox, frontend) belongs to the main `deer-flow` repository. Changes here should stay inside the knowledge service unless the task explicitly says otherwise.

## Commands

Run from `backend/`:

```bash
uv sync --inexact                                  # install lock deps, keep video extras
.venv/Scripts/python.exe -m pytest tests/ -q       # Linux/macOS: .venv/bin/python
.venv/Scripts/python.exe -m ruff check app tests
.venv/Scripts/python.exe -m ruff format --check app tests
```

Run the service (Bearer token; `/health` is public):

```bash
DEER_FLOW_API_TOKEN=<token> .venv/Scripts/python.exe -m uvicorn \
  app.gateway.knowledge_app:app --host 127.0.0.1 --port 8020
```

## Layout

- `backend/app/gateway/knowledge_app.py` — minimal entrypoint and lifespan.
- `backend/app/gateway/routers/` — the three kept routers; `routers/__init__.py` must not grow product routers.
- `backend/app/gateway/services/` — `knowledge_service`, `rag_migration`, `rag_reembed`.
- `backend/packages/harness/deerflow/knowledge/` — parsing, chunking, embedding, indexing, graph, wiki, eval.
- `backend/packages/harness/` and `backend/packages/extension-api/` — framework packages kept whole; base dependencies are trimmed to the knowledge surface, so dormant agent/sandbox modules need their packages installed separately if revived.
- `backend/tests/knowledge/` plus the RAG-config/model tests — the retained test surface.

## Invariants

- Qdrant is hosted externally (`rag.qdrant_url`, default `127.0.0.1:6333`). Only one service should write to the shared collections at a time.
- Data lives in `backend/.deer-flow/` and is not committed: `data/deerflow.db`, `data/knowledge/`, plus root `rag_config.json`.
- Authentication: set `DEER_FLOW_API_TOKEN` and send `Authorization: Bearer <token>`; without it (and without the explicit `DEER_FLOW_AUTH_DISABLED=1` escape hatch) the service refuses to start. Auth-off injects the local admin identity and skips CSRF; bind loopback only and never treat it as an auth solution.
- Do not reintroduce deleted product surfaces (frontend, channels, scheduler, monolith `app.py`, deployment trees) as part of an unrelated change.
- Test-driven development: bug fixes and features ship with tests under `backend/tests/`.

## Docs

- Repo overview and start-up details: `README.md`.
- Design/spec history: `docs/superpowers/specs/` and `docs/superpowers/plans/`.
- Delivery evidence: `docs/pr-evidence/`.
