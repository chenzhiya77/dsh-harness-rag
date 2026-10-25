"""Unit tests for the chunk-window math shared by the reader tool and the route.

Pins the semantics both surfaces rely on (spec 2026-10-11 D2 乙): centered
placement, edge clamping (never wrapping), width capping at the document size,
and 1-based inclusive bounds.
"""

from __future__ import annotations

from deerflow.knowledge.chunk_window import window_bounds


def test_centers_on_the_anchor_inside_the_document():
    assert window_bounds(position=6, width=5, total=12) == (4, 8)


def test_clamps_at_the_head_instead_of_wrapping():
    # Anchor near the head: the window extends forward, start pinned at 1.
    assert window_bounds(position=1, width=5, total=12) == (1, 5)


def test_clamps_at_the_tail_instead_of_wrapping():
    # Anchor near the tail: the window is pulled back so end == total.
    assert window_bounds(position=12, width=5, total=12) == (8, 12)


def test_caps_width_at_the_document_size():
    assert window_bounds(position=4, width=50, total=12) == (1, 12)


def test_single_chunk_document():
    assert window_bounds(position=1, width=5, total=1) == (1, 1)
