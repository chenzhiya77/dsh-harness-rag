"""Tests for list_wiki_entries (spec 2026-10-10 D4/D5/D6): the wiki-side
enumeration tool mirroring ``list_knowledge_documents`` (full list + honest
status counts, gates identical to the three retrieval paths)."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from deerflow.knowledge.access import ACCESS_DENIED_MESSAGE, NO_KB_GUIDANCE
from deerflow.knowledge.store import KnowledgeStore
from deerflow.knowledge.wiki.store import WikiStore
from deerflow.tools.builtins.wiki_entries_tool import _list_wiki_entries_impl

from .conftest import OWNER_ID


def _runtime(**context) -> SimpleNamespace:
    return SimpleNamespace(context=context)


async def _seed(session_factory):
    store = KnowledgeStore(session_factory)
    wiki_store = WikiStore(session_factory)
    await store.create_kb(kb_id="kb-w", owner_id=OWNER_ID, name="枚举库")
    return store, wiki_store


@pytest.mark.asyncio
async def test_lists_all_entries_with_honest_counts(session_factory) -> None:
    store, wiki_store = await _seed(session_factory)
    for title in ("证件", "电子设备", "衣物"):
        await wiki_store.upsert_entry("kb-w", title=title, content=f"# {title}", source_chunk_ids=[f"doc-x#{i:04d}" for i in range(2)])
    await wiki_store.mark_dirty_for_titles("kb-w", ["衣物"])

    result = await _list_wiki_entries_impl(_runtime(kb_id="kb-w", user_id=OWNER_ID), store=store, wiki_store=wiki_store)

    entries = result["entries"]
    assert len(entries) == 3
    by_title = {entry["title"]: entry for entry in entries}
    assert set(by_title) == {"证件", "电子设备", "衣物"}
    assert by_title["证件"]["status"] == "ready"
    assert by_title["衣物"]["status"] == "dirty"
    for entry in entries:
        assert {"title", "status", "updated_at"} <= set(entry)
    assert "共 3 条百科条目" in result["message"]
    assert "就绪 2" in result["message"]
    assert "待更新 1" in result["message"]


@pytest.mark.asyncio
async def test_empty_library_is_honest(session_factory) -> None:
    store, wiki_store = await _seed(session_factory)

    result = await _list_wiki_entries_impl(_runtime(kb_id="kb-w", user_id=OWNER_ID), store=store, wiki_store=wiki_store)

    assert result["entries"] == []
    assert "还没有" in result["message"]


@pytest.mark.asyncio
async def test_respects_the_scope_gates(session_factory) -> None:
    store, wiki_store = await _seed(session_factory)

    unbound = await _list_wiki_entries_impl(_runtime(user_id=OWNER_ID), store=store, wiki_store=wiki_store)
    assert unbound == {"entries": [], "message": NO_KB_GUIDANCE}

    denied = await _list_wiki_entries_impl(_runtime(kb_id="kb-w", user_id="user-2"), store=store, wiki_store=wiki_store)
    assert denied["entries"] == []
    assert denied["message"] == ACCESS_DENIED_MESSAGE
