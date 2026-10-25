"""Citation numbering across model tool calls in one run.

The main tree keeps one counter on the agent run's runtime context. The HTTP
tool seam has no shared runtime, so the service holds a bounded run cache and
seeds each call's context with it; ``claim_citation_range`` then mutates the
same dict across calls for the same ``(user_id, run_id)``.
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from _router_auth_helpers import make_authed_test_app
from fastapi.testclient import TestClient

from app.gateway.auth.models import User
from app.gateway.routers import knowledge_bases
from app.gateway.services import knowledge_service as ks_module
from app.gateway.services.citation_runs import CitationRunCache
from app.gateway.services.knowledge_service import KnowledgeService
from deerflow.knowledge.citation_counter import claim_citation_range
from deerflow.knowledge.store import KnowledgeStore

OWNER_ID = str(uuid.UUID(int=1234567890))


def _owner() -> User:
    return User(email="owner@example.com", password_hash="x", system_role="user", id=uuid.UUID(OWNER_ID))


@pytest.fixture
def service(session_factory, tmp_path) -> KnowledgeService:
    vector_store = MagicMock()
    vector_store.delete_by_doc = AsyncMock()
    vector_store.delete_by_kb = AsyncMock()
    vector_store.delete_entities = AsyncMock()
    return KnowledgeService(
        store=KnowledgeStore(session_factory),
        vector_store=vector_store,
        graph_store=None,
        wiki_store=None,
        worker=None,
        data_dir=tmp_path,
    )


def _client(service: KnowledgeService) -> TestClient:
    app = make_authed_test_app(user_factory=_owner)
    app.state.knowledge_service = service
    app.include_router(knowledge_bases.router)
    return TestClient(app)


def _create_kb(client: TestClient) -> dict:
    response = client.post("/api/knowledge-bases", json={"name": "引用编号", "description": "d"})
    assert response.status_code == 201, response.text
    return response.json()


def _post(client: TestClient, kb: dict, run_id: str | None):
    body: dict = {"name": "hybrid_search", "query": "Gateway", "top_k": 2}
    if run_id is not None:
        body["run_id"] = run_id
    return client.post(f"/api/knowledge-bases/{kb['id']}/tools", json=body)


def _fake_citing_impl(monkeypatch) -> None:
    async def fake(query, runtime, **kwargs):
        start = claim_citation_range(runtime, 2)
        return {
            "results": [
                {"chunk_id": "c1", "citation_no": start + 1},
                {"chunk_id": "c2", "citation_no": start + 2},
            ],
            "message": f"检索到 2 条相关切片（引用编号 [{start + 1}]-[{start + 2}]，标注时照抄 citation_no）。",
        }

    monkeypatch.setattr(ks_module, "_hybrid_search_impl", fake)


def test_cache_same_key_shares_context_and_offsets():
    cache = CitationRunCache()
    first = cache.context(user_id="u1", run_id="s1:1")
    first["citation_offset"] = 4
    assert cache.context(user_id="u1", run_id="s1:1")["citation_offset"] == 4
    assert cache.context(user_id="u1", run_id="s1:2") == {}
    assert cache.context(user_id="u2", run_id="s1:1") == {}


def test_cache_ttl_expires_and_restarts():
    clock = [100.0]
    cache = CitationRunCache(ttl_seconds=10, monotonic=lambda: clock[0])
    context = cache.context(user_id="u1", run_id="s1:1")
    context["citation_offset"] = 3
    clock[0] += 9
    assert cache.context(user_id="u1", run_id="s1:1")["citation_offset"] == 3
    clock[0] += 2
    assert cache.context(user_id="u1", run_id="s1:1") == {}


def test_cache_is_bounded_and_evicts_least_recently_used():
    cache = CitationRunCache(max_runs=2)
    cache.context(user_id="u1", run_id="r1")["citation_offset"] = 1
    cache.context(user_id="u1", run_id="r2")["citation_offset"] = 2
    # Touch r1 so r2 becomes the least recently used.
    assert cache.context(user_id="u1", run_id="r1")["citation_offset"] == 1
    cache.context(user_id="u1", run_id="r3")["citation_offset"] = 3
    assert cache.context(user_id="u1", run_id="r1")["citation_offset"] == 1
    assert cache.context(user_id="u1", run_id="r2") == {}


@pytest.mark.asyncio
async def test_same_run_gets_contiguous_numbers_and_next_run_resets(service, monkeypatch):
    _fake_citing_impl(monkeypatch)
    client = _client(service)
    kb = _create_kb(client)

    first = _post(client, kb, "session-1:1")
    assert first.status_code == 200, first.text
    assert [item["citation_no"] for item in first.json()["results"]] == [1, 2]

    second = _post(client, kb, "session-1:1")
    assert second.status_code == 200, second.text
    assert [item["citation_no"] for item in second.json()["results"]] == [3, 4]
    assert "[3]-[4]" in second.json()["message"]

    next_run = _post(client, kb, "session-1:2")
    assert [item["citation_no"] for item in next_run.json()["results"]] == [1, 2]


@pytest.mark.asyncio
async def test_missing_run_id_restarts_each_call(service, monkeypatch):
    _fake_citing_impl(monkeypatch)
    client = _client(service)
    kb = _create_kb(client)

    first = _post(client, kb, None)
    second = _post(client, kb, None)
    assert [item["citation_no"] for item in first.json()["results"]] == [1, 2]
    assert [item["citation_no"] for item in second.json()["results"]] == [1, 2]
