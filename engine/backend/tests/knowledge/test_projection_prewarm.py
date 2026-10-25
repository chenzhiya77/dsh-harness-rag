"""Unit tests for the UMAP startup pre-warm hook (spec §4, 2026-08-17).

``prewarm_umap`` runs fire-and-forget from the Gateway lifespan, so its
contract is strict: **never raise** — a missing optional extra or any
warm-up failure returns ``False`` and leaves the lazy status-quo behaviour
(first UMAP request pays the JIT cost) in place.
"""

from __future__ import annotations

import builtins
import sys
import types
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np

from deerflow.knowledge.projection.reducer import prewarm_umap


def _install_fake_umap(monkeypatch, umap_cls) -> None:
    """Plant a fake ``umap`` module so the lazy ``import umap`` binds to it."""
    fake = types.ModuleType("umap")
    fake.UMAP = umap_cls
    monkeypatch.setitem(sys.modules, "umap", fake)


def test_prewarm_returns_false_when_umap_missing(monkeypatch):
    """ImportError (optional extra absent) → False, never raises."""
    monkeypatch.delitem(sys.modules, "umap", raising=False)
    real_import = builtins.__import__

    def _raise_for_umap(name, *args, **kwargs):
        if name == "umap":
            raise ImportError(name)
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", _raise_for_umap)
    assert prewarm_umap() is False


def test_prewarm_swallows_fit_failure(monkeypatch):
    """Any exception inside the tiny fit → False (warm-up must never break startup)."""

    class _BrokenUMAP:
        def __init__(self, **_kwargs): ...

        def fit_transform(self, _x):
            raise RuntimeError("boom")

    _install_fake_umap(monkeypatch, _BrokenUMAP)
    assert prewarm_umap() is False


def test_prewarm_success_returns_true(monkeypatch):
    """A successful import+fit → True (lifespan logs the skip-Jit message)."""
    seen_kwargs: dict = {}

    class _FakeUMAP:
        def __init__(self, **kwargs):
            seen_kwargs.update(kwargs)

        def fit_transform(self, x):
            assert isinstance(x, np.ndarray)
            return np.zeros((len(x), 2))

    _install_fake_umap(monkeypatch, _FakeUMAP)
    assert prewarm_umap() is True
    # The warm-up fit must mirror the real reducer's shape (cosine, 2D) so it
    # compiles the same jitted code paths the first real request will hit.
    assert seen_kwargs["metric"] == "cosine"
    assert seen_kwargs["n_components"] == 2


def test_lifespan_schedules_umap_prewarm_fire_and_forget():
    """The knowledge-service lifespan must schedule the warm-up without awaiting it.

    Pins the startup contract behind the fast-first-UMAP-switch fix: the
    ``asyncio.to_thread`` wrapper is created (never blocked on) and the task
    reference lands on ``app.state`` so it cannot be GC'd mid-flight.
    """
    import asyncio

    from fastapi import FastAPI

    from app.gateway.knowledge_app import lifespan

    startup_config = MagicMock()
    startup_config.log_level = "INFO"

    fake_worker = MagicMock()
    fake_worker.start = AsyncMock()
    fake_worker.stop = AsyncMock()

    app = FastAPI()

    async def drive() -> None:
        async with lifespan(app):
            # Inside the serving window the task must already exist and must
            # NOT have blocked startup (fire-and-forget, not awaited inline).
            assert hasattr(app.state, "umap_prewarm_task")

    with (
        patch("app.gateway.knowledge_app.get_app_config", return_value=startup_config),
        patch("app.gateway.knowledge_app.configure_logging"),
        patch("app.gateway.knowledge_app.warn_if_auth_disabled_enabled"),
        patch("app.gateway.knowledge_app.require_api_token_configured"),
        patch("deerflow.persistence.engine.init_engine_from_config", AsyncMock()),
        patch("deerflow.persistence.engine.close_engine", AsyncMock()),
        patch("app.gateway.services.rag_migration.migration_running", lambda: False),
        patch("deerflow.config.paths.get_paths", return_value=MagicMock()),
        patch("deerflow.knowledge.store.get_knowledge_store", return_value=MagicMock()),
        patch("deerflow.knowledge.vector_store.get_vector_store", return_value=MagicMock()),
        patch("deerflow.knowledge.worker.KnowledgeIndexWorker", return_value=fake_worker),
        patch("app.gateway.services.knowledge_service.KnowledgeService", return_value=MagicMock()),
        patch("deerflow.knowledge.projection.reducer.prewarm_umap", return_value=True),
    ):
        asyncio.run(drive())
