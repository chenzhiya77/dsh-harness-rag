"""Tests for wiki_search (spec §4.3): vector top-k → full entry from the DB.

Plus the exact-title direct fetch (spec 2026-10-10 D1/D2): a provided ``title``
skips embedding and the vector path entirely (uuid5 id → one primary-key read).
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from deerflow.knowledge.access import ACCESS_DENIED_MESSAGE, NO_KB_GUIDANCE
from deerflow.knowledge.store import KnowledgeStore
from deerflow.knowledge.wiki.store import WikiStore, wiki_entry_id
from deerflow.tools.builtins.wiki_search_tool import _wiki_search_impl

from ..conftest import requires_qdrant
from .conftest import KB_ID, OWNER_ID


def _runtime(**context) -> SimpleNamespace:
    return SimpleNamespace(context=context)


class _ExplodingEmbedder:
    """Fails the test if the direct-fetch path ever embeds."""

    batch_size = 1

    async def embed(self, texts, *, text_type: str = "document"):
        raise AssertionError("the title direct-fetch path must not embed")


async def _seed_direct_kb(session_factory, *, kb_id: str, title: str, content: str, source_chunk_ids: list[str]):
    store = KnowledgeStore(session_factory)
    wiki_store = WikiStore(session_factory)
    await store.create_kb(kb_id=kb_id, owner_id=OWNER_ID, name="直取库")
    await wiki_store.upsert_entry(kb_id, title=title, content=content, source_chunk_ids=source_chunk_ids)
    return store, wiki_store


@requires_qdrant
@pytest.mark.integration
@pytest.mark.asyncio
async def test_wiki_search_returns_full_entry(tools_env):
    result = await _wiki_search_impl(
        "DeerFlow 是什么",
        _runtime(kb_id=KB_ID, user_id=OWNER_ID),
        store=tools_env["store"],
        wiki_store=tools_env["wiki_store"],
        vector_store=tools_env["vector_store"],
        embedder=tools_env["embedder"],
        top_k=2,
    )

    entries = result["entries"]
    assert len(entries) == 1
    entry = entries[0]
    assert entry["entry_id"] == tools_env["entry_id"]
    assert entry["title"] == "DeerFlow"
    # Full text comes from the wiki_entries table, not the vector payload.
    assert "超级智能体系统" in entry["content"]
    assert entry["score"] > 0
    # wiki→切片回溯 (spec 2026-10-10 D4 甲): the entry's source chunks ride the item.
    assert entry["source_chunk_ids"] == ["doc-t-c0"]


@requires_qdrant
@pytest.mark.integration
@pytest.mark.asyncio
async def test_wiki_search_empty_collection(tools_env):
    await tools_env["client"].delete_collection(tools_env["vector_store"].wiki_entries_collection)
    await tools_env["vector_store"].init_collections()  # recreate empty

    result = await _wiki_search_impl(
        "DeerFlow",
        _runtime(kb_id=KB_ID, user_id=OWNER_ID),
        store=tools_env["store"],
        wiki_store=tools_env["wiki_store"],
        vector_store=tools_env["vector_store"],
        embedder=tools_env["embedder"],
    )

    assert result["entries"] == []
    assert "未" in result["message"] or "没有" in result["message"]


@requires_qdrant
@pytest.mark.integration
@pytest.mark.asyncio
async def test_wiki_search_merges_manual_card_into_shared_pool(tools_env):
    """Phase-3 P6 (spec §8): a toggle-on manual card embeds into
    ``kb_manual_cards`` and competes for the SAME top_k pool. With the
    keyword one-hot embedder both vectors are identical (score tie) — the
    stable sort keeps wiki first, and the card still lands inside top_k=2
    carrying ``source_type: "manual"``."""
    from deerflow.knowledge.vector_store import ManualCardUpsert

    store = tools_env["store"]
    card = await store.create_manual_card(
        card_id="card-t",
        kb_id=KB_ID,
        owner_id=OWNER_ID,
        title="DeerFlow 运维经验",
        content="周五下午不发布，紧急修复走审批。",
        include_in_wiki_search=True,
    )
    await tools_env["vector_store"].upsert_manual_cards([ManualCardUpsert(card_id=card["id"], kb_id=KB_ID, title=card["title"], dense=(await tools_env["embedder"].embed(["DeerFlow"]))[0].dense)])

    result = await _wiki_search_impl(
        "DeerFlow 是什么",
        _runtime(kb_id=KB_ID, user_id=OWNER_ID),
        store=tools_env["store"],
        wiki_store=tools_env["wiki_store"],
        vector_store=tools_env["vector_store"],
        embedder=tools_env["embedder"],
        top_k=2,
    )

    entries = result["entries"]
    assert len(entries) == 2
    assert entries[0]["source_type"] == "wiki"
    assert entries[0]["source_chunk_ids"] == ["doc-t-c0"]
    manual_hit = entries[1]
    assert manual_hit["source_type"] == "manual"
    assert manual_hit["entry_id"] == card["id"]
    assert manual_hit["title"] == "DeerFlow 运维经验"
    assert "紧急修复" in manual_hit["content"]
    # D5 甲: a hand-written card has no source chunks — the key is absent.
    assert "source_chunk_ids" not in manual_hit
    assert [entry["citation_no"] for entry in entries] == [1, 2]
    assert "人工知识卡片" in result["message"]


@pytest.mark.asyncio
async def test_wiki_search_without_kb_returns_guidance(session_factory):
    from deerflow.knowledge.store import KnowledgeStore
    from deerflow.knowledge.wiki.store import WikiStore

    result = await _wiki_search_impl(
        "任意",
        _runtime(user_id=OWNER_ID),
        store=KnowledgeStore(session_factory),
        wiki_store=WikiStore(session_factory),
        vector_store=None,
        embedder=None,
    )
    assert result["entries"] == []
    assert result["message"] == NO_KB_GUIDANCE


@pytest.mark.asyncio
async def test_wiki_search_denies_non_owner(session_factory):
    from deerflow.knowledge.store import KnowledgeStore
    from deerflow.knowledge.wiki.store import WikiStore

    store = KnowledgeStore(session_factory)
    await store.create_kb(kb_id="kb-x", owner_id=OWNER_ID, name="私有")

    result = await _wiki_search_impl(
        "任意",
        _runtime(kb_id="kb-x", user_id="user-2"),
        store=store,
        wiki_store=WikiStore(session_factory),
        vector_store=None,
        embedder=None,
    )
    assert result["entries"] == []
    assert result["message"] == ACCESS_DENIED_MESSAGE


@pytest.mark.asyncio
async def test_title_fetches_the_entry_directly(session_factory) -> None:
    """The deterministic jump (spec 2026-10-10 D1 甲): title → uuid5 id → one
    primary-key read; no embedding, no vector path (the exploding embedder
    would fail the test otherwise)."""
    store, wiki_store = await _seed_direct_kb(session_factory, kb_id="kb-w", title="证件", content="# 证件\n\n旅行清单中的身份类物品。", source_chunk_ids=["doc-w#0000", "doc-w#0003"])

    result = await _wiki_search_impl(
        None,
        _runtime(kb_id="kb-w", user_id=OWNER_ID),
        title="证件",
        store=store,
        wiki_store=wiki_store,
        embedder=_ExplodingEmbedder(),
    )

    (entry,) = result["entries"]
    assert entry["entry_id"] == wiki_entry_id("kb-w", "证件")
    assert entry["title"] == "证件"
    assert "身份类物品" in entry["content"]
    assert entry["source_type"] == "wiki"
    assert entry["citation_no"] == 1
    assert "1 篇百科条目" in result["message"]


@pytest.mark.asyncio
async def test_items_carry_source_chunk_ids(session_factory) -> None:
    """wiki→切片回溯 (spec 2026-10-10 D4 甲): the entry's full ``source_chunk_ids``
    ride the item so the model can read the source chunks back; the same key is
    already exposed by the recall-test anchor channel — same name, same shape."""
    store, wiki_store = await _seed_direct_kb(session_factory, kb_id="kb-w", title="证件", content="正文", source_chunk_ids=["doc-w#0000", "doc-w#0003"])

    result = await _wiki_search_impl(None, _runtime(kb_id="kb-w", user_id=OWNER_ID), title="证件", store=store, wiki_store=wiki_store, embedder=_ExplodingEmbedder())

    (entry,) = result["entries"]
    assert entry["source_chunk_ids"] == ["doc-w#0000", "doc-w#0003"]


@pytest.mark.asyncio
async def test_title_miss_returns_honest_empty(session_factory) -> None:
    store, wiki_store = await _seed_direct_kb(session_factory, kb_id="kb-w", title="证件", content="正文", source_chunk_ids=["doc-w#0000", "doc-w#0001"])

    result = await _wiki_search_impl(
        None,
        _runtime(kb_id="kb-w", user_id=OWNER_ID),
        title="不存在",
        store=store,
        wiki_store=wiki_store,
        embedder=_ExplodingEmbedder(),
    )

    assert result["entries"] == []
    assert "不存在" in result["message"]
    assert "没有" in result["message"]


@pytest.mark.asyncio
async def test_title_respects_the_scope_gates(session_factory) -> None:
    store, wiki_store = await _seed_direct_kb(session_factory, kb_id="kb-x", title="证件", content="正文", source_chunk_ids=["doc-x#0000", "doc-x#0001"])

    unbound = await _wiki_search_impl(None, _runtime(user_id=OWNER_ID), title="任意", store=store, wiki_store=wiki_store)
    assert unbound == {"entries": [], "message": NO_KB_GUIDANCE}

    denied = await _wiki_search_impl(None, _runtime(kb_id="kb-x", user_id="user-2"), title="任意", store=store, wiki_store=wiki_store)
    assert denied["entries"] == []
    assert denied["message"] == ACCESS_DENIED_MESSAGE


@pytest.mark.asyncio
async def test_neither_query_nor_title_returns_guidance(session_factory) -> None:
    store, wiki_store = await _seed_direct_kb(session_factory, kb_id="kb-w", title="证件", content="正文", source_chunk_ids=["doc-w#0000", "doc-w#0001"])

    result = await _wiki_search_impl(None, _runtime(kb_id="kb-w", user_id=OWNER_ID), store=store, wiki_store=wiki_store)

    assert result["entries"] == []
    assert "query" in result["message"] and "title" in result["message"]
