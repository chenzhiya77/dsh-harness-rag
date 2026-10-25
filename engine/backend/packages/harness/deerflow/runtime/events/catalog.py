"""Canonical names and categories for persisted run events.

Producers import these definitions instead of repeating event-name/category
pairs. The public JSON contract is checked against this catalog in backend
tests, so either side changing without the other fails CI.
"""

from __future__ import annotations

from dataclasses import dataclass

from deerflow.constants import (
    RUN_EVENT_CATEGORY_MAX_LENGTH,
    RUN_EVENT_TYPE_MAX_LENGTH,
    WORKSPACE_CHANGES_EVENT_CATEGORY,
    WORKSPACE_CHANGES_EVENT_TYPE,
)


def _validate_category(category: str) -> None:
    if not category:
        raise ValueError("Run event category must not be empty")
    if len(category) > RUN_EVENT_CATEGORY_MAX_LENGTH:
        raise ValueError(f"Run event category must not exceed {RUN_EVENT_CATEGORY_MAX_LENGTH} characters: {category!r}")


@dataclass(frozen=True, slots=True)
class RunEventDefinition:
    event_type: str
    category: str

    def __post_init__(self) -> None:
        if not self.event_type:
            raise ValueError("Run event type must not be empty")
        if len(self.event_type) > RUN_EVENT_TYPE_MAX_LENGTH:
            raise ValueError(f"Run event type must not exceed {RUN_EVENT_TYPE_MAX_LENGTH} characters: {self.event_type!r}")
        _validate_category(self.category)


@dataclass(frozen=True, slots=True)
class RunEventPattern:
    pattern: str
    prefix: str
    category: str

    def __post_init__(self) -> None:
        _validate_category(self.category)

    def event_type(self, suffix: str) -> str:
        if not suffix:
            raise ValueError("Run event suffix must not be empty")
        max_suffix_length = RUN_EVENT_TYPE_MAX_LENGTH - len(self.prefix)
        if len(suffix) > max_suffix_length:
            raise ValueError(f"Run event suffix for {self.pattern!r} must not exceed {max_suffix_length} characters: {suffix!r}")
        return f"{self.prefix}{suffix}"


# ``content`` always carries ``chain``. The first root chain start of a run also
# carries ``constitution`` — the derived harness snapshot published by the agent
# factory (see the constitution-snapshot spec §6.3). A run emits one run.start per
# ``astream`` (user turn plus each goal continuation), so only the first carries it.
RUN_START_EVENT = RunEventDefinition("run.start", "trace")
RUN_END_EVENT = RunEventDefinition("run.end", "outputs")
RUN_ERROR_EVENT = RunEventDefinition("run.error", "error")
LLM_HUMAN_INPUT_EVENT = RunEventDefinition("llm.human.input", "message")
LLM_AI_RESPONSE_EVENT = RunEventDefinition("llm.ai.response", "message")
LLM_TOOL_RESULT_EVENT = RunEventDefinition("llm.tool.result", "message")
LLM_ERROR_EVENT = RunEventDefinition("llm.error", "trace")
MEMORY_CONTEXT_EVENT = RunEventDefinition("context:memory", "context")

SUBAGENT_START_EVENT = RunEventDefinition("subagent.start", "subagent")
SUBAGENT_STEP_EVENT = RunEventDefinition("subagent.step", "subagent")
SUBAGENT_END_EVENT = RunEventDefinition("subagent.end", "subagent")

WORKSPACE_CHANGES_EVENT = RunEventDefinition(WORKSPACE_CHANGES_EVENT_TYPE, WORKSPACE_CHANGES_EVENT_CATEGORY)

# Terminal delivery receipt for a run: what it produced under outputs, and whether
# ``present_files`` actually handed it over. Written by the run worker (and
# backfilled by the manager during orphan recovery), never by the journal — so it
# belongs in its own family rather than JOURNAL_RUN_EVENT_DEFINITIONS, whose test
# asserts an exact match against the events the journal itself observes.
# Spec: docs/superpowers/specs/2026-09-12-harness-delivery-layer-design.md
RUN_DELIVERY_EVENT = RunEventDefinition("run.delivery", "outputs")

MIDDLEWARE_EVENT_PATTERN = RunEventPattern(
    pattern="middleware:{tag}",
    prefix="middleware:",
    category="middleware",
)
MIDDLEWARE_EVENT_TAG_MAX_LENGTH = RUN_EVENT_TYPE_MAX_LENGTH - len(MIDDLEWARE_EVENT_PATTERN.prefix)
MIDDLEWARE_GUARDRAIL_TAG = "guardrail"
MIDDLEWARE_SAFETY_TERMINATION_TAG = "safety_termination"
MIDDLEWARE_SKILL_ACTIVATION_TAG = "skill_activation"
MIDDLEWARE_SKILL_SECRETS_TAG = "skill_secrets"
# Gate instrumentation: emitted when a gate actually changes execution — blocks a
# tool call, drops delegations, or releases deferred tool schemas. Spec:
# docs/superpowers/specs/2026-09-11-harness-gate-instrumentation-design.md
MIDDLEWARE_READ_GATE_TAG = "read_gate"
MIDDLEWARE_TOOL_PROGRESS_TAG = "tool_progress"
MIDDLEWARE_SUBAGENT_LIMIT_TAG = "subagent_limit"
MIDDLEWARE_TOOL_PROMOTION_TAG = "tool_promotion"
MIDDLEWARE_SANDBOX_AUDIT_TAG = "sandbox_audit"
MIDDLEWARE_SKILL_POLICY_TAG = "skill_policy"
MIDDLEWARE_EVENT_TAGS = (
    MIDDLEWARE_GUARDRAIL_TAG,
    MIDDLEWARE_SAFETY_TERMINATION_TAG,
    MIDDLEWARE_SKILL_ACTIVATION_TAG,
    MIDDLEWARE_SKILL_SECRETS_TAG,
    MIDDLEWARE_READ_GATE_TAG,
    MIDDLEWARE_TOOL_PROGRESS_TAG,
    MIDDLEWARE_SUBAGENT_LIMIT_TAG,
    MIDDLEWARE_TOOL_PROMOTION_TAG,
    MIDDLEWARE_SANDBOX_AUDIT_TAG,
    MIDDLEWARE_SKILL_POLICY_TAG,
)

JOURNAL_RUN_EVENT_DEFINITIONS = (
    RUN_START_EVENT,
    RUN_END_EVENT,
    RUN_ERROR_EVENT,
    LLM_HUMAN_INPUT_EVENT,
    LLM_AI_RESPONSE_EVENT,
    LLM_TOOL_RESULT_EVENT,
    LLM_ERROR_EVENT,
    MEMORY_CONTEXT_EVENT,
)

SUBAGENT_RUN_EVENT_DEFINITIONS = (
    SUBAGENT_START_EVENT,
    SUBAGENT_STEP_EVENT,
    SUBAGENT_END_EVENT,
)

WORKSPACE_RUN_EVENT_DEFINITIONS = (WORKSPACE_CHANGES_EVENT,)

DELIVERY_RUN_EVENT_DEFINITIONS = (RUN_DELIVERY_EVENT,)

FIXED_RUN_EVENT_DEFINITIONS = (
    *JOURNAL_RUN_EVENT_DEFINITIONS,
    *SUBAGENT_RUN_EVENT_DEFINITIONS,
    *WORKSPACE_RUN_EVENT_DEFINITIONS,
    *DELIVERY_RUN_EVENT_DEFINITIONS,
)
