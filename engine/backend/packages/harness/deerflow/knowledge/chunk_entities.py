"""Chunk-entity surface shared by the model-facing knowledge tools (spec 2026-10-10).

The ``chunks.entities`` column is the graph leg's normalized-name backfill; the
retrieval results and the document reader expose one identical, bounded view of
it so the model can follow a hit into ``graph_search``.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

#: Upper bound on entity names surfaced per chunk (spec 2026-10-10 D3).
SURFACED_ENTITY_LIMIT = 10


def surface_entities(row: Mapping[str, Any]) -> list[str]:
    """Dedup-preserving, capped view of a chunk row's ``entities`` (empty when unbackfilled)."""
    return list(dict.fromkeys(row.get("entities") or []))[:SURFACED_ENTITY_LIMIT]
