"""Contract tests for the document / listing tool calls on /tools.

The service dispatches these calls to the existing read-only tool impls; the
impls own the shaping, refusal wording, entity cap and truncation. These tests
exercise that seam end-to-end against a real SQLite store (no Qdrant needed).
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from _router_auth_helpers import make_authed_test_app
from fastapi.testclient import TestClient

from app.gateway.auth.models import User
from app.gateway.routers import knowledge_bases
from app.gateway.services.knowledge_service import KnowledgeService
from deerflow.knowledge.store import KnowledgeStore

pytestmark = pytest.mark.asyncio

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


def _create_kb(client: TestClient, name: str = "文档工具") -> dict:
    response = client.post("/api/knowledge-bases", json={"name": name, "description": "d"})
    assert response.status_code == 201, response.text
    return response.json()


def _post(client: TestClient, kb: dict, body: dict):
    return client.post(f"/api/knowledge-bases/{kb['id']}/tools", json=body)


async def _seed_document(
    service: KnowledgeService,
    *,
    kb_id: str,
    doc_id: str,
    name: str,
    status: str = "ready",
    texts: list[str] | None = None,
    entities: list[str] | None = None,
) -> None:
    await service.store.create_document(
        doc_id=doc_id,
        kb_id=kb_id,
        uploader_id=OWNER_ID,
        name=name,
        size_bytes=1,
        storage_path=f"/tmp/{name}",
    )
    chunks = texts or []
    if chunks:
        await service.store.insert_chunks(
            [
                {
                    "chunk_id": f"{doc_id}#{index:04d}",
                    "doc_id": doc_id,
                    "kb_id": kb_id,
                    "chunk_index": index,
                    "text": text,
                    "heading_path": ["H"],
                    "page": index + 1,
                    "entities": entities or [f"E{index}"],
                }
                for index, text in enumerate(chunks)
            ]
        )
    await service.store.update_document_status(doc_id, status, chunk_count=len(chunks))


async def test_list_documents_returns_doc_id_and_honest_counts(service):
    client = _client(service)
    kb = _create_kb(client)
    await _seed_document(service, kb_id=kb["id"], doc_id="d-ready", name="ready.md", texts=["a", "b"])
    await _seed_document(service, kb_id=kb["id"], doc_id="d-failed", name="failed.md", status="failed")
    await _seed_document(service, kb_id=kb["id"], doc_id="d-running", name="running.md", status="uploaded")

    response = _post(client, kb, {"name": "list_knowledge_documents"})
    assert response.status_code == 200, response.text
    body = response.json()
    rows = {row["doc_id"]: row for row in body["documents"]}
    assert set(rows) == {"d-ready", "d-failed", "d-running"}
    assert rows["d-ready"]["chunk_count"] == 2
    assert "id" not in rows["d-ready"] and "storage_path" not in rows["d-ready"]
    assert body["message"] == "共 3 篇文档（就绪 1 · 处理中 1 · 失败 1）。"


async def test_read_document_pages_by_doc_id(service):
    client = _client(service)
    kb = _create_kb(client)
    texts = [f"片 {i}" for i in range(25)]
    await _seed_document(service, kb_id=kb["id"], doc_id="d1", name="d1.md", texts=texts)

    response = _post(client, kb, {"name": "read_knowledge_document", "doc_id": "d1", "limit": 20})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["doc"] == {"doc_id": "d1", "name": "d1.md"}
    assert body["total"] == 25
    assert body["offset"] == 0
    assert body["has_more"] is True
    assert len(body["items"]) == 20
    assert body["items"][0]["chunk_index"] == 0
    assert body["items"][0]["entities"] == ["E0"]
    assert body["message"] == "共 25 片；已返回第 1-20 片。"


async def test_read_document_chunk_id_alone_centers_the_window(service):
    client = _client(service)
    kb = _create_kb(client)
    await _seed_document(service, kb_id=kb["id"], doc_id="d1", name="d1.md", texts=[f"片 {i}" for i in range(10)])

    response = _post(
        client,
        kb,
        {"name": "read_knowledge_document", "chunk_id": "d1#0004", "limit": 3},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["doc"] == {"doc_id": "d1", "name": "d1.md"}
    assert [item["chunk_index"] for item in body["items"]] == [3, 4, 5]
    assert body["offset"] == 3
    assert body["total"] == 10
    assert body["message"] == "第 5/共 10 片；已返回以其为中心的窗口 4-6（3 条）。"


async def test_read_document_refusals_are_readable_payloads(service):
    client = _client(service)
    kb = _create_kb(client)
    other = _create_kb(client, "另一个库")
    await _seed_document(service, kb_id=kb["id"], doc_id="d-pending", name="pending.md", status="uploaded")
    await _seed_document(service, kb_id=other["id"], doc_id="d-other", name="other.md")
    await _seed_document(service, kb_id=kb["id"], doc_id="d1", name="d1.md", texts=["片"])

    missing = _post(client, kb, {"name": "read_knowledge_document", "chunk_id": "d1#9999"})
    assert missing.status_code == 200
    assert missing.json()["doc"] is None
    assert "该切片不存在或已被删除" in missing.json()["message"]

    pending = _post(client, kb, {"name": "read_knowledge_document", "doc_id": "d-pending"})
    assert pending.status_code == 200
    assert "尚未就绪" in pending.json()["message"]

    foreign = _post(client, kb, {"name": "read_knowledge_document", "doc_id": "d-other"})
    assert foreign.status_code == 200
    assert "不属于当前绑定的知识库" in foreign.json()["message"]


async def test_read_document_truncates_long_text_and_caps_entities(service):
    client = _client(service)
    kb = _create_kb(client)
    await _seed_document(
        service,
        kb_id=kb["id"],
        doc_id="d1",
        name="d1.md",
        texts=["长" * 2500],
        entities=[f"E{i}" for i in range(12)],
    )

    response = _post(client, kb, {"name": "read_knowledge_document", "doc_id": "d1"})
    item = response.json()["items"][0]
    assert len(item["text"]) == 2000
    assert item["truncated"] is True
    assert len(item["entities"]) == 10


async def test_list_wiki_entries_returns_native_counts(service):
    client = _client(service)
    kb = _create_kb(client)
    await service.wiki_store.upsert_entry(kb["id"], title="Alpha", content="a", source_chunk_ids=["d1#0000"], status="ready")
    await service.wiki_store.upsert_entry(kb["id"], title="Beta", content="b", source_chunk_ids=[], status="dirty")

    response = _post(client, kb, {"name": "list_wiki_entries"})
    assert response.status_code == 200, response.text
    body = response.json()
    assert {entry["title"] for entry in body["entries"]} == {"Alpha", "Beta"}
    assert set(body["entries"][0]) == {"title", "status", "updated_at"}
    assert body["message"] == "共 2 条百科条目（就绪 1 · 待更新 1）。"
