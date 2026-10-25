"""Contract tests for POST /api/knowledge-bases/{kb_id}/tools (model tools).

The endpoint is the model-facing seam: it dispatches a flat, per-tool request
to the same ``_*_impl`` functions the main-tree tools use, and returns the
native tool payload unchanged (no recall-test projection). Unit tests patch the
impls at the service-module boundary; the integration checks live with the
individual tool suites.
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
from app.gateway.services.knowledge_service import KnowledgeService
from deerflow.knowledge.store import KnowledgeStore

pytestmark = pytest.mark.asyncio

OWNER_ID = str(uuid.UUID(int=1234567890))


def _owner() -> User:
    return User(email="owner@example.com", password_hash="x", system_role="user", id=uuid.UUID(OWNER_ID))


def _stranger() -> User:
    return User(email="stranger@example.com", password_hash="x", system_role="user", id=uuid.UUID(int=987654321))


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


def _client(service: KnowledgeService, user_factory=_owner) -> TestClient:
    app = make_authed_test_app(user_factory=user_factory)
    app.state.knowledge_service = service
    app.include_router(knowledge_bases.router)
    return TestClient(app)


def _create_kb(client: TestClient, name: str = "工具面") -> dict:
    response = client.post("/api/knowledge-bases", json={"name": name, "description": "d"})
    assert response.status_code == 201, response.text
    return response.json()


def _post(client: TestClient, kb: dict, body: dict):
    return client.post(f"/api/knowledge-bases/{kb['id']}/tools", json=body)


def _mock_search_impls(monkeypatch) -> tuple[AsyncMock, AsyncMock, AsyncMock]:
    vector = AsyncMock(
        return_value={
            "results": [
                {
                    "chunk_id": "d1#0000",
                    "text": "切片一",
                    "doc_id": "d1",
                    "chunk_index": 0,
                    "doc_name": "架构.md",
                    "page": 1,
                    "heading_path": ["架构"],
                    "entities": ["Gateway"],
                    "score": 0.97,
                    "citation_no": 1,
                }
            ],
            "message": "检索到 1 条相关切片（引用编号 [1]，标注时照抄 citation_no）。",
        }
    )
    graph = AsyncMock(
        return_value={
            "entities": [{"name": "Gateway", "type": "组件", "description": "入口"}],
            "relations": [],
            "evidence": [
                {
                    "chunk_id": "d1#0000",
                    "text": "切片一",
                    "doc_id": "d1",
                    "doc_name": "架构.md",
                    "heading_path": ["架构"],
                    "page": 1,
                    "score": 0.88,
                    "citation_no": 1,
                }
            ],
            "trace": {"seed_entities": ["Gateway"], "expanded_nodes": [], "evidence_entities": ["Gateway"]},
            "score_source": "cosine",
            "message": "命中 1 个实体（引用编号 [1]，标注时照抄 citation_no）。",
        }
    )
    wiki = AsyncMock(
        return_value={
            "entries": [
                {
                    "entry_id": "e1",
                    "title": "Gateway",
                    "content": "完整条目正文",
                    "score": 0.91,
                    "updated_at": "2026-10-25T00:00:00",
                    "source_chunk_ids": ["d1#0000"],
                    "source_type": "wiki",
                    "citation_no": 1,
                }
            ],
            "message": "命中 1 篇百科条目（引用编号 [1]，标注时照抄 citation_no）。",
        }
    )
    monkeypatch.setattr(ks_module, "_hybrid_search_impl", vector)
    monkeypatch.setattr(ks_module, "_graph_search_impl", graph)
    monkeypatch.setattr(ks_module, "_wiki_search_impl", wiki)
    return vector, graph, wiki


async def test_tool_route_rejects_unknown_kb(service):
    client = _client(service)
    response = client.post("/api/knowledge-bases/missing/tools", json={"name": "hybrid_search", "query": "q"})
    assert response.status_code == 404


async def test_tool_route_rejects_stranger(service):
    client = _client(service, user_factory=_stranger)
    kb = _create_kb(_client(service))
    response = _post(client, kb, {"name": "hybrid_search", "query": "q"})
    assert response.status_code == 403


async def test_hybrid_tool_dispatches_doc_id_and_preserves_native_payload(service, monkeypatch):
    vector, _, _ = _mock_search_impls(monkeypatch)
    client = _client(service)
    kb = _create_kb(client)

    response = _post(
        client,
        kb,
        {"name": "hybrid_search", "query": "Gateway", "top_k": 3, "doc_id": "d1", "run_id": "owner:2"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["results"][0]["doc_id"] == "d1"
    assert body["results"][0]["chunk_index"] == 0
    assert body["results"][0]["entities"] == ["Gateway"]
    assert body["results"][0]["citation_no"] == 1
    assert "citation_no" in body["message"]
    kwargs = vector.await_args.kwargs
    assert kwargs["doc_id"] == "d1"
    assert kwargs["top_k"] == 3
    assert kwargs["store"] is service.store


async def test_graph_tool_dispatches_entity_hops_and_configured_evidence_limit(service, monkeypatch):
    _, graph, _ = _mock_search_impls(monkeypatch)
    client = _client(service)
    kb = _create_kb(client)

    response = _post(client, kb, {"name": "graph_search", "entity": "Gateway", "hops": 1})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["trace"]["seed_entities"] == ["Gateway"]
    assert body["score_source"] == "cosine"
    kwargs = graph.await_args.kwargs
    assert graph.await_args.args[0] is None
    assert kwargs["entity"] == "Gateway"
    assert kwargs["hops"] == 1
    assert kwargs["evidence_limit"] == 8, "graph evidence limit comes from rag.graph_evidence_limit, not a tool top_k"


async def test_wiki_tool_dispatches_title_and_defaults_to_three(service, monkeypatch):
    _, _, wiki = _mock_search_impls(monkeypatch)
    client = _client(service)
    kb = _create_kb(client)

    response = _post(client, kb, {"name": "wiki_search", "title": "Gateway"})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["entries"][0]["content"] == "完整条目正文"
    kwargs = wiki.await_args.kwargs
    assert wiki.await_args.args[0] is None
    assert kwargs["title"] == "Gateway"
    assert kwargs["top_k"] == 3


async def test_search_tools_accept_missing_addressing_params(service, monkeypatch):
    _, graph, _ = _mock_search_impls(monkeypatch)
    client = _client(service)
    kb = _create_kb(client)

    response = _post(client, kb, {"name": "graph_search"})
    assert response.status_code == 200, response.text
    kwargs = graph.await_args.kwargs
    assert graph.await_args.args[0] is None and kwargs["entity"] is None


@pytest.mark.parametrize(
    ("body", "expected"),
    [
        ({"name": "not_a_tool"}, 422),
        ({"name": "graph_search", "doc_id": "d1"}, 422),
        ({"name": "hybrid_search", "query": "q", "top_k": 21}, 422),
        ({"name": "graph_search", "entity": "E", "hops": 3}, 422),
        ({"name": "read_knowledge_document", "doc_id": "d1", "limit": 51}, 422),
        ({"name": "hybrid_search", "query": "   "}, 422),
        ({"name": "hybrid_search", "query": "q", "run_id": "bad id"}, 422),
    ],
)
async def test_tool_request_validation(service, body, expected):
    client = _client(service)
    kb = _create_kb(client)
    response = _post(client, kb, body)
    assert response.status_code == expected, response.text
