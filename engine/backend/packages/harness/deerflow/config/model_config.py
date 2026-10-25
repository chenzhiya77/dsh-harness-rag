from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

# Fixed enum of selectable context-window sizes (tokens). The settings UI renders these
# as the multi-select options and `supported_context_windows` must be a subset of them.
CONTEXT_WINDOW_OPTIONS: list[int] = [200_000, 400_000, 1_000_000]

# Reasoning-effort levels ordered lightest -> deepest. Reuses the frontend input-box
# vocabulary (threads/types.ts) and, since spec 2026-10-21, extends it with the two deepest
# names DSH publishes so a RAG leg can pass the host's level through verbatim. The backend
# agent-level enum (low/medium/high, without `minimal`) is a separate vocabulary and is
# intentionally not unified here.
REASONING_EFFORT_LEVELS: list[str] = ["minimal", "low", "medium", "high", "xhigh", "max"]
ReasoningEffort = Literal["minimal", "low", "medium", "high", "xhigh", "max"]


def nearest_declared_effort(level: str, declared: list[str]) -> str:
    """The declared level closest to *level*: the same one, else the highest one below it.

    Mirrors the fallback a reference client applies to an out-of-range level. When the whole
    declaration sits above *level* there is nothing below to fall back to, so the lowest
    declared level is the closest thing there is.

    Only meaningful for a level in :data:`REASONING_EFFORT_LEVELS`: the ranking is a direct
    lookup, so anything else raises rather than guessing. Callers reach this through
    :func:`resolve_effective_effort`, which filters first.
    """
    rank = {name: index for index, name in enumerate(REASONING_EFFORT_LEVELS)}
    if level in declared:
        return level
    at_or_below = [name for name in declared if rank.get(name, -1) <= rank[level]]
    if at_or_below:
        return max(at_or_below, key=lambda name: rank[name])
    return min(declared, key=lambda name: rank.get(name, len(rank)))


def effort_substitution_note(model_name: str, requested: str, effective: str, declared: list[str]) -> str:
    """The sentence every caller logs when a level is replaced, worded once.

    Both callers of :func:`resolve_effective_effort` — the resolution site and the model
    factory — announce the same substitution, and a second copy of this sentence would be a
    second description of one fact.
    """
    return f"Model '{model_name}' does not declare reasoning effort '{requested}'; sending '{effective}' instead. Declared levels: {declared}."


#: Our level names as the Anthropic Messages protocol spells them. OpenAI's parameter is
#: already called ``reasoning_effort``, so that leg is an identity and needs no table. The
#: levels the other side has no counterpart for map to the closest one that exists rather
#: than inventing a value the protocol would reject: ``minimal`` (its lowest is ``low``),
#: and ``xhigh`` / ``max`` (its deepest is ``high``). Lives here, not in the model factory,
#: because the caption leg speaks Messages directly and must fold through the same table.
_ANTHROPIC_EFFORT_NAMES: dict[str, str] = {
    "minimal": "low",
    "low": "low",
    "medium": "medium",
    "high": "high",
    "xhigh": "high",
    "max": "high",
}


def anthropic_effort_name(level: str) -> str | None:
    """The Messages spelling of *level*, or ``None`` when the protocol has no counterpart."""
    return _ANTHROPIC_EFFORT_NAMES.get(level)


def clamp_declared_effort(level: str | None, *, supports: bool, declared: list[str] | None) -> tuple[str | None, bool]:
    """The level that will actually be sent, and whether it differs from the one asked for.

    The two rules shared by every caller — the LangChain factory and both raw-HTTP caption
    dialects — live here so they cannot drift:

    * the coarse gate — an entry that does not support effort sends none at all, whatever
      the caller asked for;
    * the declared subset — a level the entry does not declare is replaced by the closest one
      it does. The editor and the composer only ever offer that subset, so an out-of-range
      value can only arrive from a request-level override, an operator's file, or a stale
      host declaration, and none of those should be able to make the request fail.

    An entry that declares no subset means "every level is fine" and is passed through
    untouched, which is what the OpenAI leg has always done. A level outside
    :data:`REASONING_EFFORT_LEVELS` is passed through too: the Codex path writes ``none``,
    which this repo never declares, and the ranking has no entry for it.
    """
    if not supports:
        return None, False
    if level is None or level not in REASONING_EFFORT_LEVELS:
        return level, False
    subset = list(declared or [])
    if not subset or level in subset:
        return level, False
    return nearest_declared_effort(level, subset), True


def resolve_effective_effort(model_config: "ModelConfig", level: str | None) -> tuple[str | None, bool]:
    """The level a call will actually use, and whether that differs from the one asked for.

    Two things can change the level between the caller and the wire, and both are decided
    by :func:`clamp_declared_effort` so that whoever *records* the level can ask instead of
    re-deriving it:

    * the coarse gate — an entry that does not support effort sends none at all, whatever the
      caller asked for;
    * the declared subset — a level the entry does not declare is replaced by the closest one
      it does.

    The ranking and the pass-through rules are stated once on that function; this wrapper
    only reads them off a model entry.
    """
    return clamp_declared_effort(
        level,
        supports=model_config.supports_reasoning_effort,
        declared=model_config.supported_reasoning_efforts,
    )


class ModelConfig(BaseModel):
    """Config section for a model"""

    name: str = Field(..., description="Unique name for the model")
    display_name: str | None = Field(..., default_factory=lambda: None, description="Display name for the model")
    description: str | None = Field(..., default_factory=lambda: None, description="Description for the model")
    use: str = Field(
        ...,
        description="Class path of the model provider(e.g. langchain_openai.ChatOpenAI)",
    )
    model: str = Field(..., description="Model name")
    model_config = ConfigDict(extra="allow")
    use_responses_api: bool | None = Field(
        default=None,
        description="Whether to route OpenAI ChatOpenAI calls through the /v1/responses API",
    )
    output_version: str | None = Field(
        default=None,
        description="Structured output version for OpenAI responses content, e.g. responses/v1",
    )
    supports_thinking: bool = Field(default_factory=lambda: False, description="Whether the model supports thinking")
    supports_reasoning_effort: bool = Field(default_factory=lambda: False, description="Whether the model supports reasoning effort")
    reasoning_effort: ReasoningEffort | None = Field(
        default=None,
        description=(
            "Default reasoning-effort level (minimal/low/medium/high/xhigh/max) for this model. Consumed by the "
            "runtime effort-resolution chain as the per-model default (user-selected > model default > "
            "mode heuristic). If `supported_reasoning_efforts` is also set, this must be one of them."
        ),
    )
    supported_reasoning_efforts: list[ReasoningEffort] | None = Field(
        default=None,
        description=(
            "Selectable reasoning-effort levels for this model — a subset of minimal/low/medium/high/xhigh/max. "
            "When set it must be non-empty, de-duplicated, and ordered lightest->deepest. The settings "
            "UI and the input-box reasoning-depth selector render exactly these levels. Leave unset to "
            "mean 'subset not declared' (the UI falls back to all six levels)."
        ),
    )
    when_thinking_enabled: dict | None = Field(
        default_factory=lambda: None,
        description="Extra settings to be passed to the model when thinking is enabled",
    )
    when_thinking_disabled: dict | None = Field(
        default_factory=lambda: None,
        description="Extra settings to be passed to the model when thinking is disabled",
    )
    supports_vision: bool = Field(default_factory=lambda: False, description="Whether the model supports vision/image inputs")
    context_window: int | None = Field(
        default=None,
        gt=0,
        description=(
            "Default total context window size in tokens (prompt + completion). Used to compute the "
            "real-time context usage percentage displayed in the chat UI. Distinct from `max_tokens`, "
            "which is the per-call output cap passed to the provider. When `supported_context_windows` "
            "is also set, this is the default choice and must be one of the supported sizes. Leave "
            "unset if unknown; the UI will hide the percentage."
        ),
    )
    supported_context_windows: list[int] | None = Field(
        default=None,
        description=(
            "Selectable context-window sizes in tokens, drawn from CONTEXT_WINDOW_OPTIONS "
            "(200K/400K/1M). When set it must be a non-empty, de-duplicated, ascending subset of those "
            "options; `context_window` is the default and must be a member. Leave unset to mean "
            "'subset not declared' (only the single `context_window` default is known)."
        ),
    )
    stream_chunk_timeout: float | None = Field(
        default=None,
        description=(
            "Maximum seconds to wait between successive streaming chunks before "
            "langchain-openai raises StreamChunkTimeoutError. None means use the "
            "factory default (240s for OpenAI-compatible clients). Tune higher for "
            "reasoning models with long thinking pauses; lower for latency-sensitive "
            "interactive endpoints. Has no effect on non-OpenAI-compatible providers."
        ),
    )
    thinking: dict | None = Field(
        default_factory=lambda: None,
        description=(
            "Thinking settings for the model. If provided, these settings will be passed to the model when thinking is enabled. "
            "This is a shortcut for `when_thinking_enabled` and will be merged with `when_thinking_enabled` if both are provided."
        ),
    )

    @model_validator(mode="after")
    def _validate_capability_subsets(self) -> "ModelConfig":
        """Enforce the capability-subset invariants (spec 2026-09-10 model-capability-config).

        Validated at config-load time so an invalid combination fails loudly here rather than
        surfacing later as a broken settings UI or a runtime resolution that silently picks an
        unsupported level. Every field is optional: a legacy config that declares none of them
        skips each branch below and loads unchanged.
        """
        windows = self.supported_context_windows
        if windows is not None:
            if not windows:
                raise ValueError("supported_context_windows must be non-empty when set")
            outside = [w for w in windows if w not in CONTEXT_WINDOW_OPTIONS]
            if outside:
                raise ValueError(f"supported_context_windows contains sizes outside CONTEXT_WINDOW_OPTIONS {CONTEXT_WINDOW_OPTIONS}: {outside}")
            if len(set(windows)) != len(windows):
                raise ValueError("supported_context_windows contains duplicates")
            if windows != sorted(windows):
                raise ValueError("supported_context_windows must be in ascending order")
            if self.context_window is not None and self.context_window not in windows:
                raise ValueError(f"context_window ({self.context_window}) must be one of supported_context_windows ({windows})")

        efforts = self.supported_reasoning_efforts
        if efforts is not None:
            # Element membership (minimal/low/medium/high/xhigh/max) is enforced by the Literal
            # type; here we check the list-level invariants and the default's membership.
            if not efforts:
                raise ValueError("supported_reasoning_efforts must be non-empty when set")
            if len(set(efforts)) != len(efforts):
                raise ValueError("supported_reasoning_efforts contains duplicates")
            rank = {level: i for i, level in enumerate(REASONING_EFFORT_LEVELS)}
            if [rank[e] for e in efforts] != sorted(rank[e] for e in efforts):
                raise ValueError("supported_reasoning_efforts must be ordered minimal<low<medium<high<xhigh<max")
            if self.reasoning_effort is not None and self.reasoning_effort not in efforts:
                raise ValueError(f"reasoning_effort ({self.reasoning_effort}) must be one of supported_reasoning_efforts ({efforts})")

        return self
