"""Minimal knowledge-service entrypoint (plugin engine, 主体二).

Serves only the API surface the DSH plugin consumes:

- ``/api/knowledge-bases`` (knowledge_bases router)
- ``/api/rag/config`` (functional-model configuration)
- ``/api/models`` (model catalog used by the settings surface)
- ``/health``

Compared with ``app.gateway.app``, this entrypoint skips the LangGraph agent
runtime, IM channels, scheduler, memory, skills/browser, and extension loading.
Its lifespan only initialises persistence and the knowledge index worker.

Run (Bearer token, configured in backend/.env):

    DEER_FLOW_API_TOKEN=<token> uvicorn app.gateway.knowledge_app:app \
        --host 127.0.0.1 --port 8020

The service refuses to start without a token unless DEER_FLOW_AUTH_DISABLED=1
is set explicitly for loopback development.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.gateway.api_token_auth import require_api_token_configured
from app.gateway.auth_disabled import warn_if_auth_disabled_enabled
from app.gateway.auth_middleware import AuthMiddleware
from app.gateway.config import get_gateway_config
from app.gateway.csrf_middleware import CSRFMiddleware
from app.gateway.routers import knowledge_bases, models, rag_config
from deerflow.config.app_config import get_app_config
from deerflow.knowledge.embedder import RagConfigurationError
from deerflow.logging_config import configure_logging

logger = logging.getLogger(__name__)

_SHUTDOWN_HOOK_TIMEOUT_SECONDS = 5.0


def _log_umap_prewarm_result(task: asyncio.Task[bool]) -> None:
    if task.cancelled():
        return
    if task.exception() is not None:
        logger.debug("UMAP pre-warm failed", exc_info=task.exception())
    elif task.result():
        logger.info("UMAP pre-warm finished; first switch skips the JIT load cost")
    else:
        logger.debug("UMAP pre-warm skipped (extra not installed or warm-up failed)")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    startup_config = get_app_config()
    configure_logging(startup_config)
    warn_if_auth_disabled_enabled()
    require_api_token_configured()
    logger.info("Knowledge service configuration loaded successfully")

    from deerflow.persistence.engine import close_engine, init_engine_from_config

    await init_engine_from_config(startup_config.database)

    from app.gateway.services.knowledge_service import KnowledgeService
    from app.gateway.services.rag_migration import migration_running
    from deerflow.config.paths import get_paths
    from deerflow.knowledge.store import get_knowledge_store
    from deerflow.knowledge.vector_store import get_vector_store
    from deerflow.knowledge.worker import KnowledgeIndexWorker

    data_dir = get_paths().base_dir / "data"
    knowledge_store = get_knowledge_store()
    knowledge_vector_store = get_vector_store()
    knowledge_worker = KnowledgeIndexWorker(
        store=knowledge_store,
        vector_store=knowledge_vector_store,
        concurrency=startup_config.rag.worker_concurrency,
        resolution_full_scan_threshold=startup_config.rag.graph_resolution_full_scan_threshold,
        entity_merge_similarity=startup_config.rag.entity_merge_similarity,
        sweep_enabled=startup_config.rag.sweep_enabled,
        sweep_interval_hours=startup_config.rag.sweep_interval_hours,
        data_dir=data_dir,
        migration_running_fn=migration_running,
    )
    app.state.knowledge_worker = knowledge_worker
    app.state.knowledge_service = KnowledgeService(
        store=knowledge_store,
        vector_store=knowledge_vector_store,
        worker=knowledge_worker,
        data_dir=data_dir,
    )
    await knowledge_worker.start()
    logger.info("Knowledge index worker started (concurrency=%d)", startup_config.rag.worker_concurrency)

    try:
        from deerflow.knowledge.projection.reducer import prewarm_umap

        app.state.umap_prewarm_task = asyncio.create_task(
            asyncio.to_thread(prewarm_umap),
            name="umap-prewarm",
        )
        app.state.umap_prewarm_task.add_done_callback(_log_umap_prewarm_result)
    except Exception:
        logger.debug("UMAP pre-warm scheduling skipped", exc_info=True)

    try:
        yield
    finally:
        if getattr(app.state, "knowledge_worker", None) is not None:
            try:
                await asyncio.wait_for(
                    app.state.knowledge_worker.stop(),
                    timeout=_SHUTDOWN_HOOK_TIMEOUT_SECONDS,
                )
            except TimeoutError:
                logger.warning(
                    "Knowledge worker shutdown exceeded %.1fs; proceeding with worker exit.",
                    _SHUTDOWN_HOOK_TIMEOUT_SECONDS,
                )
            except Exception:
                logger.exception("Failed to stop knowledge index worker")

        umap_prewarm_task = getattr(app.state, "umap_prewarm_task", None)
        if umap_prewarm_task is not None and not umap_prewarm_task.done():
            umap_prewarm_task.cancel()

        await close_engine()
        logger.info("Knowledge service shut down")


async def _handle_rag_configuration_error(request: Request, exc: Exception) -> JSONResponse:
    logger.warning("RAG configuration refused on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=400, content={"detail": str(exc)})


def create_app() -> FastAPI:
    config = get_gateway_config()
    docs_url = "/docs" if config.enable_docs else None
    redoc_url = "/redoc" if config.enable_docs else None
    openapi_url = "/openapi.json" if config.enable_docs else None

    app = FastAPI(
        title="Harness RAG Knowledge Service",
        description="Minimal knowledge-base API for the DSH harness-rag plugin.",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
    )

    app.add_exception_handler(RagConfigurationError, _handle_rag_configuration_error)
    app.add_middleware(AuthMiddleware)
    app.add_middleware(CSRFMiddleware)

    app.include_router(models.router)
    app.include_router(rag_config.router)
    app.include_router(knowledge_bases.router)

    @app.get("/health", tags=["health"])
    async def health_check() -> dict[str, str]:
        return {"status": "healthy", "service": "harness-rag-knowledge"}

    return app


app = create_app()
