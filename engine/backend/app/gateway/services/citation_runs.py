"""Bounded per-run citation counters for the model tool seam.

The main tree keeps one ``citation_offset`` on the agent run's runtime
context. The model tool seam talks to the engine over HTTP, so the service
holds the counter in a small ordered cache keyed by ``(user_id, run_id)`` and
seeds each call's runtime context with the same dict. ``claim_citation_range``
then allocates contiguous numbers across every tool call in that run.
"""

from __future__ import annotations

import time
from collections import OrderedDict
from collections.abc import Callable
from typing import Any

DEFAULT_MAX_RUNS = 256
DEFAULT_TTL_SECONDS = 3600.0


class CitationRunCache:
    """LRU + TTL cache of mutable runtime contexts; values are tiny dicts."""

    def __init__(
        self,
        *,
        max_runs: int = DEFAULT_MAX_RUNS,
        ttl_seconds: float = DEFAULT_TTL_SECONDS,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        if max_runs < 1:
            raise ValueError("max_runs must be positive")
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be positive")
        self._max_runs = max_runs
        self._ttl_seconds = ttl_seconds
        self._monotonic = monotonic
        self._runs: OrderedDict[tuple[str, str], tuple[float, dict[str, Any]]] = OrderedDict()

    def context(self, *, user_id: str, run_id: str) -> dict[str, Any]:
        """Return the mutable context for one run, creating it when absent/expired."""
        key = (user_id, run_id)
        now = self._monotonic()
        entry = self._runs.get(key)
        if entry is not None:
            saved_at, context = entry
            if now - saved_at <= self._ttl_seconds:
                self._runs.move_to_end(key)
                return context
            del self._runs[key]
        context: dict[str, Any] = {}
        self._runs[key] = (now, context)
        while len(self._runs) > self._max_runs:
            self._runs.popitem(last=False)
        return context
