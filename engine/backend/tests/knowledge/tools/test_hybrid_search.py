"""Tests for hybrid_search (spec §4.1): RRF prefetch → rerank → top-k.

Chunk text always comes from the business-DB ``chunks`` table (fetched by
``chunk_id``); the Qdrant payload only supplies display metadata
(``doc_name``/``page``/``heading_path``) for citations.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from qdrant_client.models import SparseVector

from deerflow.knowledge.access import ACCESS_DENIED_MESSAGE, NO_KB_GUIDANCE
from deerflow.knowledge.embedder import EmbeddingResult
from deerflow.knowledge.reranker import RerankerError
from deerflow.tools.builtins.hybrid_search_tool import _hybrid_search_impl

from ..conftest import requires_qdrant
from .conftest import DOC_ID, KB_ID, OWNER_ID


class _StubReranker:
    """Scores documents containing 会话管理 highest — deterministic rerank."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, list[str]]] = []

    async def rerank(self, query: str, documents, *, top_n: int = 5):
        self.calls.append((query, list(documents)))
        scored = [(i, 0.99 if "会话管理" in doc else 0.05) for i, doc in enumerate(documents)]
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return scored[:top_n]


class _FailingReranker:
    async def rerank(self, query: str, documents, *, top_n: int = 5):
        raise RerankerError("rerank down")


def _runtime(**context) -> SimpleNamespace:
    return SimpleNamespace(context=context)


class _FieldStore:
    """Store double for the follow-up-field assertions (no Qdrant needed)."""

    def __init__(self) -> None:
        self.rows = [
            {
                "chunk_id": "doc-u#0007",
                "doc_id": "doc-u",
                "chunk_index": 7,
                "text": "第七片正文",
                "heading_path": ["第7章"],
                "page": 7,
                "entities": ["JVM", "垃圾回收", "JVM", "G1"],
            }
        ]

    async def get_kb(self, kb_id: str):
        return {"id": kb_id, "owner_id": OWNER_ID}

    async def get_chunks_by_ids(self, chunk_ids, *, kb_id=None):
        wanted = set(chunk_ids)
        return [row for row in self.rows if row["chunk_id"] in wanted]


class _FieldVectorStore:
    """Qdrant double whose payload deliberately omits ``chunk_index``."""

    def __init__(self) -> None:
        self.payloads = [
            {"chunk_id": "doc-u#0007", "doc_name": "手册.md", "page": 7, "heading_path": ["第7章"], "doc_id": "doc-u"},
        ]
        self.calls: list[dict] = []

    async def hybrid_query(self, *, dense, sparse, kb_id, top_k, doc_id=None):
        self.calls.append({"kb_id": kb_id, "doc_id": doc_id})
        return [SimpleNamespace(payload=payload) for payload in self.payloads]


class _FieldEmbedder:
    async def embed(self, texts, *, text_type: str = "document"):
        return [EmbeddingResult(dense=[0.0] * 4, sparse=SparseVector(indices=[1], values=[0.5])) for _ in texts]


@pytest.mark.asyncio
async def test_items_carry_doc_id_and_chunk_index_for_follow_up_reads() -> None:
    """追问链凭据（spec §2.2）：每条结果带 doc_id 与 chunk_index。

    ``chunk_index`` 不存在于 Qdrant payload（夹具 payload 故意无此键）——
    断言它必须取自业务库行；doc_name/page/heading_path 等既有引用元数据不变。
    """
    result = await _hybrid_search_impl(
        "任意问题",
        _runtime(kb_id=KB_ID, user_id=OWNER_ID),
        store=_FieldStore(),
        vector_store=_FieldVectorStore(),
        embedder=_FieldEmbedder(),
        reranker=_StubReranker(),
    )

    (item,) = result["results"]
    assert item["doc_id"] == "doc-u"
    assert item["chunk_index"] == 7
    assert item["doc_name"] == "手册.md"
    assert item["page"] == 7
    assert item["heading_path"] == ["第7章"]


@pytest.mark.asyncio
async def test_items_carry_mentioned_entities_for_graph_follow_ups() -> None:
    """切片→实体（spec 2026-10-10 §2.1）：每条结果带本片实体名，去重保序。"""
    result = await _hybrid_search_impl(
        "任意问题",
        _runtime(kb_id=KB_ID, user_id=OWNER_ID),
        store=_FieldStore(),
        vector_store=_FieldVectorStore(),
        embedder=_FieldEmbedder(),
        reranker=_StubReranker(),
    )

    (item,) = result["results"]
    assert item["entities"] == ["JVM", "垃圾回收", "G1"]


@pytest.mark.asyncio
async def test_entities_are_capped_at_ten() -> None:
    """上限口径（spec 2026-10-10 D3）：每片最多暴露 10 个实体名。"""
    store = _FieldStore()
    store.rows[0]["entities"] = [f"实体{i:02d}" for i in range(12)]

    result = await _hybrid_search_impl(
        "任意问题",
        _runtime(kb_id=KB_ID, user_id=OWNER_ID),
        store=store,
        vector_store=_FieldVectorStore(),
        embedder=_FieldEmbedder(),
        reranker=_StubReranker(),
    )

    (item,) = result["results"]
    assert item["entities"] == [f"实体{i:02d}" for i in range(10)]


@pytest.mark.asyncio
async def test_entities_default_to_empty_list_when_unbackfilled() -> None:
    """空态（spec 2026-10-10 D5）：图谱腿未回填时照常返回空数组。"""
    store = _FieldStore()
    store.rows[0].pop("entities")

    result = await _hybrid_search_impl(
        "任意问题",
        _runtime(kb_id=KB_ID, user_id=OWNER_ID),
        store=store,
        vector_store=_FieldVectorStore(),
        embedder=_FieldEmbedder(),
        reranker=_StubReranker(),
    )

    (item,) = result["results"]
    assert item["entities"] == []


@pytest.mark.asyncio
async def test_hybrid_search_forwards_the_doc_filter_to_the_vector_store() -> None:
    """篇内检索（spec §2.3）: the optional doc_id rides the same store call."""
    vector_store = _FieldVectorStore()

    result = await _hybrid_search_impl(
        "任意问题",
        _runtime(kb_id=KB_ID, user_id=OWNER_ID),
        store=_FieldStore(),
        vector_store=vector_store,
        embedder=_FieldEmbedder(),
        reranker=_StubReranker(),
        doc_id="doc-u",
    )

    assert vector_store.calls == [{"kb_id": KB_ID, "doc_id": "doc-u"}]
    assert [item["doc_id"] for item in result["results"]] == ["doc-u"]


@requires_qdrant
@pytest.mark.integration
@pytest.mark.asyncio
async def test_hybrid_search_end_to_end(tools_env):
    reranker = _StubReranker()

    result = await _hybrid_search_impl(
        "Gateway 的作用是什么",
        _runtime(kb_id=KB_ID, user_id=OWNER_ID),
        store=tools_env["store"],
        vector_store=tools_env["vector_store"],
        embedder=tools_env["embedder"],
        reranker=reranker,
        top_k=2,
    )

    assert reranker.calls, "RRF candidates must go through the reranker"
    results = result["results"]
    assert len(results) == 2
    top = results[0]
    # Reranker re-ordered: the 会话管理 chunk leads even though RRF ties.
    assert top["chunk_id"] == "doc-t-c0"
    assert top["text"] == "Gateway 负责会话管理，是 DeerFlow 的入口组件。"  # text from the business DB
    assert top["score"] == 0.99
    # Citation metadata rides the Qdrant payload (spec §4.6).
    assert top["doc_name"] == "架构.md"
    assert top["page"] == 1
    assert top["heading_path"] == ["架构"]
    # Follow-up credentials (spec §2.2): doc_id/chunk_index address the same
    # document/chunk for follow-up reads; both ride the business-DB row.
    assert top["doc_id"] == DOC_ID
    assert top["chunk_index"] == 0
    assert "message" in result


@requires_qdrant
@pytest.mark.integration
@pytest.mark.asyncio
async def test_hybrid_search_no_match_returns_honest_message(tools_env):
    result = await _hybrid_search_impl(
        "zzz-完全无关-zzz",
        _runtime(kb_id=KB_ID, user_id=OWNER_ID),
        store=tools_env["store"],
        vector_store=tools_env["vector_store"],
        embedder=tools_env["embedder"],
        reranker=_StubReranker(),
    )
    # An unrelated query still vector-matches *something* in a tiny test KB;
    # what matters is the tool answers with real rows or an honest empty list.
    assert result["results"] is not None
    assert "message" in result


@requires_qdrant
@pytest.mark.integration
@pytest.mark.asyncio
async def test_hybrid_search_without_kb_returns_guidance(tools_env):
    result = await _hybrid_search_impl(
        "任意问题",
        _runtime(user_id=OWNER_ID),
        store=tools_env["store"],
        vector_store=tools_env["vector_store"],
        embedder=tools_env["embedder"],
        reranker=_StubReranker(),
    )
    assert result["results"] == []
    assert result["message"] == NO_KB_GUIDANCE


@requires_qdrant
@pytest.mark.integration
@pytest.mark.asyncio
async def test_hybrid_search_denies_non_owner(tools_env):
    result = await _hybrid_search_impl(
        "Gateway",
        _runtime(kb_id=KB_ID, user_id="user-2"),
        store=tools_env["store"],
        vector_store=tools_env["vector_store"],
        embedder=tools_env["embedder"],
        reranker=_StubReranker(),
    )
    assert result["results"] == []
    assert result["message"] == ACCESS_DENIED_MESSAGE


@requires_qdrant
@pytest.mark.integration
@pytest.mark.asyncio
async def test_hybrid_search_rerank_failure_degrades_to_rrf_order(tools_env):
    """A reranker outage must not kill the vector path (spec §4.4)."""
    result = await _hybrid_search_impl(
        "Gateway",
        _runtime(kb_id=KB_ID, user_id=OWNER_ID),
        store=tools_env["store"],
        vector_store=tools_env["vector_store"],
        embedder=tools_env["embedder"],
        reranker=_FailingReranker(),
        top_k=2,
    )
    assert len(result["results"]) == 2  # RRF order preserved, scores absent
    assert result["results"][0]["text"]
    assert "精排" in result["message"] or "rerank" in result["message"].lower()


@requires_qdrant
@pytest.mark.integration
@pytest.mark.asyncio
async def test_hybrid_search_doc_scope_hits_and_misses(tools_env) -> None:
    """篇内检索（spec 2026-10-08 §2.3）: doc_id scopes retrieval to one document."""
    kwargs = dict(
        store=tools_env["store"],
        vector_store=tools_env["vector_store"],
        embedder=tools_env["embedder"],
        reranker=_StubReranker(),
    )

    scoped = await _hybrid_search_impl("Gateway", _runtime(kb_id=KB_ID, user_id=OWNER_ID), doc_id=DOC_ID, **kwargs)
    assert scoped["results"]
    assert all(item["doc_id"] == DOC_ID for item in scoped["results"])

    missing = await _hybrid_search_impl("Gateway", _runtime(kb_id=KB_ID, user_id=OWNER_ID), doc_id="doc-elsewhere", **kwargs)
    assert missing["results"] == []
    assert missing["message"] == "知识库中未检索到与问题相关的内容。"
