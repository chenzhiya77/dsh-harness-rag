"""Best-effort audit of gate decisions, shared by the instrumented middlewares.

A *gate* event is recorded when a middleware actually changes execution: it
blocks a tool call, drops delegations, or releases deferred tool schemas.
Observation alone (sanitizing content, externalizing an oversized result) is not
a gate event.

Every event is **dual-delivered**:

- a **custom SSE frame**, so a live consumer learns about it *while the run is
  still going*. A gate acting is exactly the moment a run "goes quiet", and the
  journal's buffer only flushes at ``flush_threshold`` — so journal-only events
  would arrive after the run ended, too late to explain anything.
- a persisted **``middleware:{tag}`` run event**, for reload and history. This is
  the same channel shape the four pre-existing tags use.

Three invariants live here rather than at each call site, because getting any of
them wrong at one site is a silent behavioural change:

- **Never raises.** A snapshot of what happened is worth strictly less than the
  run it observes, so any failure degrades to a log line. ``GraphBubbleUp`` is the
  one exception and is re-raised: it is control flow (interrupts), not an audit
  failure.
- **Never carries the blocked content.** Callers pass decision facts only — no
  command text, no file bodies, no retrieval queries, no secret values. See
  ``safety_finish_reason_middleware``'s rule of not persisting the very content
  the provider filtered.
- **The SSE leg does not depend on the journal.** Embedded clients and the TUI
  have no ``__run_journal`` but do stream custom events, so gating the frame on
  the journal would hide every gate from them.

The two legs carry the *same* payload, so there is one shape to reason about and
one shape to test.

Spec: docs/superpowers/specs/2026-09-11-harness-gate-instrumentation-design.md §4.6
"""

from __future__ import annotations

import logging
from typing import Any

from langgraph.errors import GraphBubbleUp

from deerflow.utils.custom_events import emit_custom_event

logger = logging.getLogger(__name__)


def _emit_gate_frame(payload: dict[str, Any]) -> None:
    """Send the event to a live consumer over LangGraph's custom stream.

    Silent no-op outside a graph run (no stream writer), which is what happens in
    unit tests and any non-streaming invocation.
    """
    try:
        from langgraph.config import get_stream_writer

        writer = get_stream_writer()
    except GraphBubbleUp:
        raise
    except Exception:  # noqa: BLE001 — no graph context, frame is simply not sent
        logger.debug("stream writer unavailable; gate event not streamed", exc_info=True)
        return
    try:
        emit_custom_event(payload, writer=writer)
    except GraphBubbleUp:
        raise
    except Exception:  # noqa: BLE001 — a live frame must never change execution
        logger.warning("gate event %r not streamed", payload.get("type"), exc_info=True)


def _record_gate_event(runtime: Any, payload: dict[str, Any]) -> None:
    """Persist the same event as a ``middleware:{tag}`` run event."""
    context = getattr(runtime, "context", None)
    journal = context.get("__run_journal") if isinstance(context, dict) else None
    if journal is None:
        return
    try:
        journal.record_middleware(
            tag=payload["type"],
            name=payload["name"],
            hook=payload["hook"],
            action=payload["action"],
            changes=payload["changes"],
        )
    except Exception:  # noqa: BLE001 — audit must never change execution
        logger.warning("gate event %r not recorded", payload.get("type"), exc_info=True)


def record_gate_event(
    runtime: Any,
    *,
    tag: str,
    name: str,
    hook: str,
    action: str,
    changes: dict[str, Any],
) -> None:
    """Record one gate decision on both channels. Never raises on audit failure."""
    # `type` first: it is both the SSE frame name and the routing key a live
    # consumer switches on. The rest mirrors the journal event's content shape.
    payload: dict[str, Any] = {
        "type": tag,
        "name": name,
        "hook": hook,
        "action": action,
        "changes": changes,
    }
    _emit_gate_frame(payload)
    _record_gate_event(runtime, payload)


__all__ = ["record_gate_event"]
