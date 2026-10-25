# 视频入库重依赖（funasr/torch/torchaudio/scenedetect/opencv-python）以 uv pip extra
# 形式安装、不在 uv.lock；exact sync 会把它们当 extraneous 剪除（2026-09-09 剪包事故，
# 致 ASR/分镜腿运行时缺库）。本地一律 --inexact sync + --no-sync run 以保留；
# CI 不走本 Makefile（直接 uv sync --group dev），保持 exact 不受影响。
SYNC = uv sync --inexact --extra umap --quiet
RUN = PYTHONPATH=. PYTHONIOENCODING=utf-8 PYTHONUTF8=1 uv run --no-sync

install:
	uv sync --inexact --extra umap

dev:
	@$(SYNC) && $(RUN) uvicorn app.gateway.knowledge_app:app --host 127.0.0.1 --port 8020 --reload --reload-dir app --reload-dir packages

gateway:
	@$(SYNC) && $(RUN) uvicorn app.gateway.knowledge_app:app --host 127.0.0.1 --port 8020

test:
	@$(SYNC) && $(RUN) pytest -m "not live" tests/ -v

test-live:
	@$(SYNC) && DEER_FLOW_RUN_LIVE_TESTS=1 $(RUN) pytest -m live tests/ -v -s

lint:
	@$(SYNC) && $(RUN) ruff check .
	@$(RUN) ruff format --check .

format:
	@$(SYNC) && $(RUN) ruff check . --fix && $(RUN) ruff format .

# Generate a new alembic revision by autogenerating the diff against the live
# ORM models. Usage: make migrate-rev MSG="add foo column to runs"
# The service runs `alembic upgrade head` automatically at startup via
# `bootstrap_schema`, so there is intentionally no `migrate` / `migrate-stamp`
# target -- the single execution path keeps ops mistakes off the table.
# The script builds a fresh temp SQLite at head, then diffs the live models
# against it, so a clean checkout does NOT need a pre-existing ./data/deerflow.db.
migrate-rev:
	@if [ -z "$(MSG)" ]; then echo 'usage: make migrate-rev MSG="describe the change"'; exit 1; fi
	@$(SYNC) && $(RUN) python scripts/_autogen_revision.py "$(MSG)"
