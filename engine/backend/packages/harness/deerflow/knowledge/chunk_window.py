"""Chunk-window math shared by the document reader and the chunks HTTP route.

A window is anchored on a known chunk's live position inside its document
(1-based, over surviving chunks): ``limit`` wide, centered on the anchor, and
clamped at the document edges — the window extends toward the opposite edge
instead of wrapping. One identical computation for both surfaces (spec
2026-10-11 D2 乙).
"""

from __future__ import annotations


def window_bounds(position: int, width: int, total: int) -> tuple[int, int]:
    """Centered, edge-clamped window around ``position``.

    Returns ``(start, end)``, both 1-based and inclusive; the window is
    ``min(width, total)`` chunks wide. Edge behaviour is clamping, not
    wrapping: a window anchored near the head extends forward (``start == 1``),
    one anchored near the tail is pulled back so ``end == total``.
    """
    window = min(width, total)
    start = max(1, min(position - (window - 1) // 2, total - window + 1))
    end = start + window - 1
    return start, end
