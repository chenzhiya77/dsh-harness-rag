"""list_wiki_entries — the wiki-side enumeration tool (spec 2026-10-10 D4/D5/D6).

Mirrors the document-side ``list_knowledge_documents``: a thin read over
``wiki_store.list_entries`` with honest status counts. Only generated entries
are listed — the eligibility gate keeps single-chunk entities out on purpose
(they are served by the vector path directly), so an entity without an entry
never appears here.
"""

from __future__ import annotations

import logging
from typing import Any

from langchain.tools import tool

from deerflow.knowledge.access import ACCESS_DENIED_MESSAGE, NO_KB_GUIDANCE, can_access, resolve_kb_scope
from deerflow.knowledge.store import KnowledgeStore, get_knowledge_store
from deerflow.knowledge.wiki.store import WikiStore
from deerflow.tools.types import Runtime

logger = logging.getLogger(__name__)


async def _list_wiki_entries_impl(runtime: Any, *, store: KnowledgeStore | None = None, wiki_store: WikiStore | None = None) -> dict:
    """Core implementation — testable without the @tool wrapper."""
    kb_id, user_id = resolve_kb_scope(runtime)
    if not kb_id:
        return {"entries": [], "message": NO_KB_GUIDANCE}
    store = store or get_knowledge_store()
    if not await can_access(store, user_id, kb_id):
        return {"entries": [], "message": ACCESS_DENIED_MESSAGE}
    wiki_store = wiki_store or WikiStore(store._sf)

    rows = await wiki_store.list_entries(kb_id)
    entries = [
        {
            "title": row["title"],
            "status": row["status"],
            "updated_at": row.get("updated_at"),
        }
        for row in rows
    ]
    if not entries:
        return {"entries": [], "message": "当前知识库中还没有百科条目。"}

    ready = sum(1 for entry in entries if entry["status"] == "ready")
    pending = len(entries) - ready
    counts = [label for count, label in ((ready, f"就绪 {ready}"), (pending, f"待更新 {pending}")) if count]
    return {"entries": entries, "message": f"共 {len(entries)} 条百科条目（{' · '.join(counts)}）。"}


@tool(parse_docstring=True)
async def list_wiki_entries(runtime: Runtime) -> dict:
    """List the generated wiki entries of the bound knowledge base (titles + status).

    Use this tool when:
    - The question asks what encyclopedia entries exist (e.g. "库里有哪些条目/词条")
    - You want to check whether a topic already has an entry before searching

    Skip this tool when:
    - You need an entry's content — use wiki_search (semantic match) or wiki_search(title=…) for one known entry

    Entries cover only the head entities that passed the eligibility bar; an entity without an entry is normally served by the vector path, and its absence here does not mean the knowledge base lacks the topic.

    Args:
        runtime: Tool runtime carrying the bound ``kb_id`` in its context.
    """
    return await _list_wiki_entries_impl(runtime)
