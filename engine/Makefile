# Harness RAG knowledge service (主体二)

.PHONY: help install dev run test lint format

help:
	@echo "Harness RAG knowledge service:"
	@echo "  make install  - Install backend dependencies (uv sync --inexact --extra umap)"
	@echo "  make dev      - Run the knowledge service on 127.0.0.1:8020 with reload"
	@echo "  make run      - Run the knowledge service on 127.0.0.1:8020"
	@echo "  make test     - Run the backend test suite"
	@echo "  make lint     - ruff check + format --check"
	@echo "  make format   - ruff check --fix + format"
	@echo ""
	@echo "Data lives in backend/.deer-flow/; Qdrant is hosted externally (see README.md)."

install:
	@cd backend && $(MAKE) install

dev:
	@cd backend && $(MAKE) dev

run:
	@cd backend && $(MAKE) gateway

test:
	@cd backend && $(MAKE) test

lint:
	@cd backend && $(MAKE) lint

format:
	@cd backend && $(MAKE) format
