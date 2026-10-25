"""LangGraph-compatible runtime — runs, streaming, and lifecycle management.

Re-exports the public API of :mod:`~deerflow.runtime.runs` and
:mod:`~deerflow.runtime.stream_bridge` so that consumers can import
directly from ``deerflow.runtime``.

The re-exports are lazy (PEP 562): importing any submodule executes this
initializer, and eager imports here would drag the whole agent runtime into
processes that only need the light contextvar helpers in
``deerflow.runtime.user_context``.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any

_EXPORTS: dict[str, str] = {
    "CheckpointStateAccessor": "checkpoint_state",
    "build_state_mutation_graph": "checkpoint_state",
    "checkpointer_context": "checkpointer",
    "get_checkpointer": "checkpointer",
    "make_checkpointer": "checkpointer",
    "reset_checkpointer": "checkpointer",
    "ORPHAN_RECOVERY_STOP_REASON": "runs",
    "STARTUP_ORPHAN_RECOVERY_ERROR": "runs",
    "CancelOutcome": "runs",
    "ConflictError": "runs",
    "DisconnectMode": "runs",
    "RunContext": "runs",
    "RunManager": "runs",
    "RunRecord": "runs",
    "RunStatus": "runs",
    "ThreadOperationKind": "runs",
    "UnsupportedStrategyError": "runs",
    "run_agent": "runs",
    "serialize": "serialization",
    "serialize_channel_values": "serialization",
    "serialize_channel_values_for_api": "serialization",
    "serialize_lc_object": "serialization",
    "serialize_messages_tuple": "serialization",
    "strip_data_url_image_blocks": "serialization",
    "get_store": "store",
    "make_store": "store",
    "reset_store": "store",
    "store_context": "store",
    "END_SENTINEL": "stream_bridge",
    "HEARTBEAT_SENTINEL": "stream_bridge",
    "MemoryStreamBridge": "stream_bridge",
    "StreamBridge": "stream_bridge",
    "StreamEvent": "stream_bridge",
    "StreamGap": "stream_bridge",
    "StreamItem": "stream_bridge",
    "make_stream_bridge": "stream_bridge",
}

__all__ = [
    # checkpoint state
    "CheckpointStateAccessor",
    "build_state_mutation_graph",
    # checkpointer
    "checkpointer_context",
    "get_checkpointer",
    "make_checkpointer",
    "reset_checkpointer",
    # runs
    "CancelOutcome",
    "ConflictError",
    "DisconnectMode",
    "ORPHAN_RECOVERY_STOP_REASON",
    "RunContext",
    "RunManager",
    "RunRecord",
    "RunStatus",
    "ThreadOperationKind",
    "STARTUP_ORPHAN_RECOVERY_ERROR",
    "UnsupportedStrategyError",
    "run_agent",
    # serialization
    "serialize",
    "serialize_channel_values",
    "serialize_channel_values_for_api",
    "serialize_lc_object",
    "serialize_messages_tuple",
    "strip_data_url_image_blocks",
    # store
    "get_store",
    "make_store",
    "reset_store",
    "store_context",
    # stream_bridge
    "END_SENTINEL",
    "HEARTBEAT_SENTINEL",
    "MemoryStreamBridge",
    "StreamBridge",
    "StreamEvent",
    "StreamGap",
    "StreamItem",
    "make_stream_bridge",
]


# NOTE: ``RedisStreamBridge`` is intentionally not re-exported — ``redis`` is an
# optional extra and importing it here would load ``redis.asyncio`` in every
# process. Import it from ``deerflow.runtime.stream_bridge.redis`` when needed.


def __getattr__(name: str) -> Any:
    module_name = _EXPORTS.get(name)
    if module_name is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    value = getattr(import_module(f".{module_name}", __name__), name)
    globals()[name] = value
    return value


def __dir__() -> list[str]:
    return sorted(__all__)
