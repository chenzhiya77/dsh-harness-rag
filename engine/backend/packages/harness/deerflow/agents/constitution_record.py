"""Run-level harness constitution: publish/query registry + record builder.

Spec: ``docs/superpowers/specs/2026-09-10-harness-constitution-snapshot-design.md``

Pure data + one process-wide registry. Deliberately **no LangGraph import and no
``app.*`` import** (``tests/test_harness_boundary.py`` enforces the latter): the
registry must work with whatever object the factory returns, so it stores an
``Any`` and never inspects a graph. The only framework import is
``AgentMiddleware``, needed to tell an overridden hook from the base no-op.

Two halves:

* :func:`build_constitution_record` — a pure function over the facts the agent
  factory already computed. No I/O, no framework calls.
* :func:`publish_constitution` / :func:`constitution_for` — a
  ``WeakKeyDictionary`` keyed by the compiled graph, so a per-run graph is
  reclaimed automatically once the worker drops it.
"""

from __future__ import annotations

import json
import logging
from typing import Any, NamedTuple
from weakref import WeakKeyDictionary

from langchain.agents.middleware import AgentMiddleware

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 1

# Budget precedent: ``MAX_FORM_SERIALIZED_BYTES`` (16 KB) in the clarification
# middleware. Measured real payloads sit near a third of it (spec §6.5.1).
MAX_CONSTITUTION_BYTES = 16 * 1024
MAX_TOOL_NAMES = 200

# Frozen enumeration order for ``hooks[]``. It is part of the wire contract,
# because it decides the serialized bytes of every snapshot.
HOOK_ORDER: tuple[str, ...] = (
    "before_agent",
    "after_agent",
    "before_model",
    "wrap_model_call",
    "after_model",
    "wrap_tool_call",
)

_MODEL_PHASE_HOOKS = frozenset({"before_model", "wrap_model_call", "after_model"})

ONCE_PER_RUN = "once_per_run"
PER_MODEL_CALL = "per_model_call"
PER_TOOL_CALL = "per_tool_call"

MEMBER = "member"
OVERLAY = "overlay"
GUARD = "guard"
HANDOFF = "handoff"

TOOL_SOURCE_MCP = "mcp"
TOOL_SOURCE_BUILTIN = "builtin"
TOOL_SOURCE_TOOL_GROUP = "tool_group"

# The five positional stages, in ring order. ``extension`` is the sixth, fallback
# stage and only appears when something actually lands in it (spec §8 risk 11).
STAGES: tuple[str, ...] = ("intake", "context", "model", "tools", "epilogue")
EXTENSION_STAGE = "extension"
_LOOP_STAGES = frozenset({"context", "model", "tools"})

# Modules whose tools are framework-provided rather than config-declared. The
# sandbox tools are shipped by the harness, so they report as ``builtin``.
_BUILTIN_MODULE_PREFIXES = ("deerflow.tools.builtins", "deerflow.sandbox")


class MiddlewareFacts(NamedTuple):
    """Where a named middleware sits on the ring, and how it acts."""

    stage: str
    kind: str = MEMBER
    overlay_kind: str | None = None
    exits_run: bool = False


def _member(stage: str) -> MiddlewareFacts:
    return MiddlewareFacts(stage)


def _guard(stage: str) -> MiddlewareFacts:
    return MiddlewareFacts(stage, OVERLAY, GUARD)


def _handoff(stage: str) -> MiddlewareFacts:
    return MiddlewareFacts(stage, OVERLAY, HANDOFF, exits_run=True)


# The 34 named middlewares. Keys are real ``type(mw).__name__`` values — the
# guard test asserts bidirectional coverage so a rename or a new middleware
# cannot drift silently.
STAGE_OF_MIDDLEWARE: dict[str, MiddlewareFacts] = {
    # intake (2)
    "ThreadDataMiddleware": _member("intake"),
    "UploadsMiddleware": _member("intake"),
    # context (12) — the thickest layer
    "InputSanitizationMiddleware": _member("context"),
    "ToolOutputBudgetMiddleware": _member("context"),
    "ToolResultSanitizationMiddleware": _member("context"),
    "DanglingToolCallMiddleware": _member("context"),
    "DynamicContextMiddleware": _member("context"),
    "SkillActivationMiddleware": _member("context"),
    "DurableContextMiddleware": _member("context"),
    "DeerFlowSummarizationMiddleware": _member("context"),
    "TodoMiddleware": _member("context"),
    "ViewImageMiddleware": _member("context"),
    "SystemMessageCoalescingMiddleware": _member("context"),
    "DeepResearchMiddleware": _member("context"),
    # model (3 members + 5 gates)
    "LLMErrorHandlingMiddleware": _member("model"),
    "TokenUsageMiddleware": _member("model"),
    "ModelLengthFinishReasonMiddleware": _member("model"),
    "SubagentLimitMiddleware": _guard("model"),
    "LoopDetectionMiddleware": _guard("model"),
    "TokenBudgetMiddleware": _guard("model"),
    "TerminalResponseMiddleware": _guard("model"),
    "SafetyFinishReasonMiddleware": _guard("model"),
    # tools (4 members + 5 gates + 1 handoff)
    "SandboxMiddleware": _member("tools"),
    "SkillToolPolicyMiddleware": _member("tools"),
    "McpRoutingMiddleware": _member("tools"),
    "DeferredToolFilterMiddleware": _member("tools"),
    "GuardrailMiddleware": _guard("tools"),
    "SandboxAuditMiddleware": _guard("tools"),
    "ReadBeforeWriteMiddleware": _guard("tools"),
    "ToolProgressMiddleware": _guard("tools"),
    "ToolErrorHandlingMiddleware": _guard("tools"),
    "ClarificationMiddleware": _handoff("tools"),
    # epilogue (2)
    "TitleMiddleware": _member("epilogue"),
    "MemoryMiddleware": _member("epilogue"),
}


# --------------------------------------------------------------------------- #
# hook detection + frequency derivation
# --------------------------------------------------------------------------- #
def _overrides(middleware: Any, hook: str) -> bool:
    """True when the concrete class implements ``hook`` instead of inheriting the no-op.

    ``hasattr`` is useless here: the base class defines every hook, so ``hasattr``
    is always true and a naive probe would report every hook on every class.
    """
    own = getattr(type(middleware), hook, None)
    if own is None:
        return False
    return own is not getattr(AgentMiddleware, hook, None)


def detect_hooks(middleware: Any) -> list[str]:
    """The hooks this middleware actually overrides, in the frozen order."""
    found: list[str] = []
    for hook in HOOK_ORDER:
        if _overrides(middleware, hook) or _overrides(middleware, "a" + hook):
            found.append(hook)
    return found


def derive_frequency(hooks: Any) -> str:
    """Collapse a hook set into the three renderable frequencies.

    Deliberately not a per-middleware table: the hook set is the code fact, this
    is a pure function of it, so it cannot drift from the source. A middleware
    with a model-phase hook is ``per_model_call`` even when it also wraps tools
    — only a middleware with *no* model-phase hook can be ``per_tool_call``.
    """
    present = set(hooks)
    if present & _MODEL_PHASE_HOOKS:
        return PER_MODEL_CALL
    if "wrap_tool_call" in present:
        return PER_TOOL_CALL
    return ONCE_PER_RUN


# --------------------------------------------------------------------------- #
# record building (pure)
# --------------------------------------------------------------------------- #
def _config_value(obj: Any, *path: str, default: Any = None) -> Any:
    current = obj
    for attr in path:
        if current is None:
            return default
        current = getattr(current, attr, None)
    return default if current is None else current


def _tool_name(tool: Any) -> str:
    return getattr(tool, "name", None) or type(tool).__name__


def _tool_source(tool: Any) -> str:
    """``mcp`` / ``builtin`` / ``tool_group``.

    Only the MCP branch is a strong signal (``is_mcp_tool`` reads the tag the MCP
    loader writes). The builtin branch keys on the implementing function's module,
    which is how the harness's own tools are distinguishable from config-declared
    ones without importing every builtin. ``skill`` is a valid wire value (§3) but
    currently unreachable here: skill-contributed business tools arrive through
    ``tool_groups``.
    """
    # Imported here, not at module scope: the agent factory imports this module at
    # import time, and ``deerflow.tools`` is exactly what it keeps lazy to dodge a
    # circular import.
    from deerflow.tools.mcp_metadata import is_mcp_tool

    if is_mcp_tool(tool):
        return TOOL_SOURCE_MCP
    func = getattr(tool, "func", None) or getattr(tool, "coroutine", None)
    module = getattr(func, "__module__", None) or ""
    if module.startswith(_BUILTIN_MODULE_PREFIXES):
        return TOOL_SOURCE_BUILTIN
    return TOOL_SOURCE_TOOL_GROUP


def _configured_tool_groups(app_config: Any) -> dict[str, str]:
    """Configured tool name -> group, from the same list that drives filtering.

    The group lives on the tool *config* (``config.yaml`` ``tools[]``) and never
    on the assembled tool object — nothing attaches it to ``BaseTool.metadata`` —
    so this list is the only honest source. It matters: "my tool is missing" is
    usually "its group is not in the agent's ``tool_groups``".
    """
    groups: dict[str, str] = {}
    for tool_config in getattr(app_config, "tools", None) or ():
        name = getattr(tool_config, "name", None)
        group = getattr(tool_config, "group", None)
        if isinstance(name, str) and isinstance(group, str):
            groups[name] = group
    return groups


def _tool_group(tool: Any, configured: dict[str, str]) -> str | None:
    name = getattr(tool, "name", None)
    if isinstance(name, str) and name in configured:
        return configured[name]
    # Fallback for a tool that carries its own group; nothing in-tree does today.
    metadata = getattr(tool, "metadata", None) or {}
    group = metadata.get("group") if isinstance(metadata, dict) else None
    return group if isinstance(group, str) else None


def _middleware_row(middleware: Any) -> dict[str, Any]:
    name = type(middleware).__name__
    facts = STAGE_OF_MIDDLEWARE.get(name)
    # Unknown class (a custom middleware, or an extension wrapper) falls back to
    # the extension band rather than inventing a stage. The guard test is what
    # catches a *known* middleware that nobody registered.
    stage = facts.stage if facts else EXTENSION_STAGE
    kind = facts.kind if facts else MEMBER
    hooks = detect_hooks(middleware)
    row: dict[str, Any] = {
        "name": name,
        "stage": stage,
        "kind": kind,
        "hooks": hooks,
        "frequency": derive_frequency(hooks),
    }
    if kind == OVERLAY and facts is not None:
        row["overlay_kind"] = facts.overlay_kind
        if facts.exits_run:
            row["exits_run"] = True
    return row


def _stages(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Per-stage counts derived from the *mounted* rows, never from the table.

    The table totals 34; a real run mounts whatever its config gates allow
    (25-27 on the machine measured in spec §6.5.1). Copying the table's totals
    would describe "what might be there" instead of "what was there".
    """
    buckets: dict[str, dict[str, int]] = {key: {"members": 0, "gates": 0, "handoff_gates": 0} for key in (*STAGES, EXTENSION_STAGE)}
    for row in rows:
        bucket = buckets[row["stage"]]
        if row["kind"] == MEMBER:
            bucket["members"] += 1
        elif row.get("overlay_kind") == HANDOFF:
            bucket["handoff_gates"] += 1
        else:
            bucket["gates"] += 1

    out = [{"key": key, "loop": key in _LOOP_STAGES, **buckets[key]} for key in STAGES]
    extension = buckets[EXTENSION_STAGE]
    if any(extension.values()):
        out.append({"key": EXTENSION_STAGE, "loop": False, **extension})
    return out


def _tools_block(
    tools: Any,
    deferred_setup: Any,
    auto_promote_top_k: int,
    configured_groups: dict[str, str],
) -> dict[str, Any]:
    mounted_all = [_tool_name(tool) for tool in tools or ()]
    mounted = [{"name": name, "source": _tool_source(tool), "group": _tool_group(tool, configured_groups)} for name, tool in zip(mounted_all, tools or (), strict=False)]
    # Sorted: a frozenset has no stable order, and the snapshot's byte size must
    # be reproducible for the same chain.
    deferred_all = sorted(getattr(deferred_setup, "deferred_names", None) or ())

    mounted_truncated = len(mounted) > MAX_TOOL_NAMES
    deferred_truncated = len(deferred_all) > MAX_TOOL_NAMES
    return {
        "mounted": mounted[:MAX_TOOL_NAMES],
        "mounted_count": len(mounted),
        "deferred_names": deferred_all[:MAX_TOOL_NAMES],
        "deferred_count": len(deferred_all),
        "auto_promote_top_k": auto_promote_top_k,
        # Both lists are config- and server-sized; either being cut is reported.
        "truncated": mounted_truncated or deferred_truncated,
    }


def _removed_tool_names(candidates: Any, authorized: Any) -> list[str]:
    """Candidates that did not survive Layer 1 authorization.

    Membership is by identity, matching how the factory itself splits the two
    lists, so two same-named tool objects are not conflated.
    """
    authorized_ids = {id(tool) for tool in authorized or ()}
    names = {_tool_name(tool) for tool in candidates or () if id(tool) not in authorized_ids}
    return sorted(names)


def serialized_size(record: dict[str, Any]) -> int:
    """Byte length of the canonical serialization, matching spec §6.5.1."""
    return len(json.dumps(record, ensure_ascii=False, default=str).encode("utf-8"))


def _apply_budget(record: dict[str, Any]) -> dict[str, Any]:
    """Fixed degradation order (§6.5).

    ``stages[]`` is never cut, and ``tool_authorization.removed`` — the field
    that best explains "why is my tool missing" — is what survives longest.
    """
    if serialized_size(record) <= MAX_CONSTITUTION_BYTES:
        return record

    record["truncated"] = True

    record["tools"].pop("mounted", None)
    if serialized_size(record) <= MAX_CONSTITUTION_BYTES:
        return record

    record["middlewares"] = []
    if serialized_size(record) <= MAX_CONSTITUTION_BYTES:
        return record

    record["tool_authorization"].pop("removed", None)
    return record


def build_constitution_record(
    *,
    middlewares: Any,
    tools: Any = (),
    deferred_setup: Any = None,
    authorization_candidates: Any = (),
    authorized_tools: Any = (),
    model_name: str | None = None,
    thinking_enabled: bool = False,
    reasoning_effort: str | None = None,
    agent_name: str | None = None,
    is_bootstrap: bool = False,
    checkpoint_mode: str | None = None,
    skill_setup: Any = None,
    mcp_routing_built: bool = False,
    is_plan_mode: bool = False,
    subagent_enabled: bool = False,
    max_concurrent_subagents: int | None = None,
    max_total_subagents: int | None = None,
    non_interactive: bool = False,
    app_config: Any = None,
) -> dict[str, Any]:
    """Derive the run's harness constitution from facts already computed.

    Every argument is something the agent factory already has in scope, so this
    adds no parsing, no I/O and no framework calls to the assembly path.
    """
    rows = [_middleware_row(middleware) for middleware in middlewares or ()]

    record: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "model": {
            "name": model_name,
            "thinking_enabled": bool(thinking_enabled),
            "reasoning_effort": reasoning_effort,
        },
        "agent": {"name": agent_name, "is_bootstrap": bool(is_bootstrap)},
        "checkpoint_mode": checkpoint_mode,
        "runtime_flags": {
            "is_plan_mode": bool(is_plan_mode),
            "subagent_enabled": bool(subagent_enabled),
            "max_concurrent_subagents": max_concurrent_subagents,
            "max_total_subagents": max_total_subagents,
            "non_interactive": bool(non_interactive),
        },
        "stages": _stages(rows),
        "middlewares": rows,
        "tools": _tools_block(
            tools,
            deferred_setup,
            auto_promote_top_k=_config_value(app_config, "tool_search", "auto_promote_top_k", default=0) or 0,
            configured_groups=_configured_tool_groups(app_config),
        ),
        "tool_authorization": _authorization_block(authorization_candidates, authorized_tools),
        # No `active_names`: this record is built at graph-assembly time, while
        # skill activation happens during the run, so any value here would be a
        # permanent lie. Consumers read `middleware:skill_activation` instead.
        "skills": {
            "available_count": len(getattr(skill_setup, "skill_names", None) or ()),
            "deferred_discovery": bool(_config_value(app_config, "skills", "deferred_discovery", default=False)),
            "describe_skill_bound": getattr(skill_setup, "describe_skill_tool", None) is not None,
        },
        "mcp_routing_built": bool(mcp_routing_built),
    }
    return _apply_budget(record)


def _authorization_block(candidates: Any, authorized: Any) -> dict[str, Any]:
    removed = _removed_tool_names(candidates, authorized)
    return {"removed": removed, "removed_count": len(removed)}


# --------------------------------------------------------------------------- #
# registry (§4)
# --------------------------------------------------------------------------- #
_RECORDS: WeakKeyDictionary[Any, dict[str, Any]] = WeakKeyDictionary()
"""Compiled graph -> constitution record.

Weak keys: the worker builds a graph per run and drops it, so entries vanish with
it. A pinned list would leak one full snapshot per run for the process lifetime.
"""


def publish_constitution(graph: Any, record: dict[str, Any]) -> None:
    """Attach ``record`` to ``graph``. Never raises: this is an observability hook."""
    try:
        _RECORDS[graph] = record
    except TypeError:
        # Graph is not weak-referenceable — degrade to "no snapshot" rather than
        # breaking agent construction.
        logger.warning("constitution snapshot unpublished: graph is not weak-referenceable")


def constitution_for(graph: Any) -> dict[str, Any] | None:
    """Return the record published for ``graph``, or ``None``. Never raises."""
    try:
        return _RECORDS.get(graph)
    except TypeError:
        # Not weak-referenceable, or unhashable — either way there is no record.
        return None


__all__ = [
    "EXTENSION_STAGE",
    "HOOK_ORDER",
    "MAX_CONSTITUTION_BYTES",
    "MAX_TOOL_NAMES",
    "MEMBER",
    "MiddlewareFacts",
    "ONCE_PER_RUN",
    "OVERLAY",
    "PER_MODEL_CALL",
    "PER_TOOL_CALL",
    "SCHEMA_VERSION",
    "STAGES",
    "STAGE_OF_MIDDLEWARE",
    "build_constitution_record",
    "constitution_for",
    "derive_frequency",
    "detect_hooks",
    "publish_constitution",
    "serialized_size",
]
