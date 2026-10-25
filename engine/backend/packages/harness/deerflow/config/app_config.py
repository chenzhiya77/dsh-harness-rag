import logging
import os
from collections.abc import Mapping
from contextvars import ContextVar
from pathlib import Path
from typing import Any, Literal, Self

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr, model_validator

from deerflow.config.acp_config import ACPAgentConfig, load_acp_config_from_dict
from deerflow.config.agent_storage_config import AgentStorageConfig
from deerflow.config.agents_api_config import AgentsApiConfig, load_agents_api_config_from_dict
from deerflow.config.auth_config import AuthAppConfig
from deerflow.config.authorization_config import AuthorizationConfig, load_authorization_config_from_dict
from deerflow.config.channel_connections_config import ChannelConnectionsConfig
from deerflow.config.checkpointer_config import CheckpointerConfig, load_checkpointer_config_from_dict
from deerflow.config.database_config import DatabaseConfig
from deerflow.config.dedupe_storage_config import DedupeStorageConfig
from deerflow.config.extension_spec import ExtensionSpec
from deerflow.config.extensions_config import ExtensionsConfig
from deerflow.config.file_signature import ConfigSignature as _ConfigSignature
from deerflow.config.file_signature import get_config_signature as _get_config_signature
from deerflow.config.guardrails_config import GuardrailsConfig, load_guardrails_config_from_dict
from deerflow.config.input_polish_config import InputPolishConfig
from deerflow.config.loop_detection_config import LoopDetectionConfig
from deerflow.config.memory_config import MemoryConfig, load_memory_config_from_dict
from deerflow.config.model_config import ModelConfig, ReasoningEffort
from deerflow.config.models_config import ModelsConfig, merge_ui_models
from deerflow.config.rag_config_file import RagConfigFile, merge_rag_config
from deerflow.config.read_before_write_config import ReadBeforeWriteConfig
from deerflow.config.reload_boundary import format_field_description
from deerflow.config.run_events_config import RunEventsConfig
from deerflow.config.run_ownership_config import RunOwnershipConfig
from deerflow.config.runtime_paths import existing_project_file
from deerflow.config.safety_finish_reason_config import SafetyFinishReasonConfig
from deerflow.config.sandbox_config import SandboxConfig
from deerflow.config.scheduler_config import SchedulerConfig
from deerflow.config.skill_evolution_config import SkillEvolutionConfig
from deerflow.config.skill_scan_config import SkillScanConfig
from deerflow.config.skills_config import SkillsConfig
from deerflow.config.stream_bridge_config import StreamBridgeConfig, load_stream_bridge_config_from_dict
from deerflow.config.subagents_config import SubagentsAppConfig, load_subagents_config_from_dict
from deerflow.config.suggestions_config import SuggestionsConfig
from deerflow.config.summarization_config import SummarizationConfig, load_summarization_config_from_dict
from deerflow.config.title_config import TitleConfig, load_title_config_from_dict
from deerflow.config.token_budget_config import TokenBudgetConfig
from deerflow.config.token_usage_config import TokenUsageConfig
from deerflow.config.tool_config import ToolConfig, ToolGroupConfig
from deerflow.config.tool_output_config import ToolOutputConfig
from deerflow.config.tool_progress_config import ToolProgressConfig
from deerflow.config.tool_search_config import ToolSearchConfig, load_tool_search_config_from_dict

load_dotenv()

logger = logging.getLogger(__name__)


CONFIG_FILE_DATABASE_DEFAULTS = {
    "backend": "sqlite",
    "sqlite_dir": ".deer-flow/data",
}


class CircuitBreakerConfig(BaseModel):
    """Configuration for the LLM Circuit Breaker."""

    failure_threshold: int = Field(default=5, description="Number of consecutive failures before tripping the circuit")
    recovery_timeout_sec: int = Field(default=60, description="Time in seconds before attempting to recover the circuit")


class LlmCallConfig(BaseModel):
    """Configuration for LLM call execution (concurrency / rate shaping).

    Distinct from :class:`CircuitBreakerConfig` (which handles a *failing*
    provider) and from :class:`ModelConfig` (which describes model endpoints):
    these knobs shape how many LLM calls run at once and how the retry/backoff
    loop behaves. Capping concurrency caps the *slope* of the request rate,
    which is what a provider burst-rate (``limit_burst_rate``) limit fires on.
    """

    max_concurrent_calls: int = Field(
        default=0,
        ge=0,
        description=(
            "Process-wide cap on concurrently in-flight LLM calls. 0 disables "
            "the cap (default, preserving existing behavior). Set to a positive "
            "int to smooth provider burst-rate (limit_burst_rate) spikes by "
            "bounding the request-rate slope at the morning peak. Per-process, "
            "not per-cluster: with GATEWAY_WORKERS > 1 the aggregate cap is "
            "effectively max_concurrent_calls * GATEWAY_WORKERS (and a "
            "multi-node rollout multiplies it further), so size the per-process "
            "value accordingly and pair it with an nginx limit_req at the ingress "
            "for a true cluster-wide slope cap. Startup-only: the cap is captured "
            "at the first LLM run and frozen for the process lifetime, so editing "
            "it in config.yaml takes effect only after a gateway restart (the "
            "other llm_call.* knobs remain hot-reloadable). Freezing avoids the "
            "downscale/config-freshness races a runtime-mutable cap would "
            "introduce on a process-wide, cross-loop limiter."
        ),
    )
    retry_max_attempts: int = Field(
        default=3,
        ge=1,
        description="Max LLM call attempts (1 = no retry) for retriable transient errors.",
    )
    retry_base_delay_ms: int = Field(
        default=1000,
        ge=0,
        description="Base (ms) for the decorrelated-jitter retry backoff; seeds the first retry delay.",
    )
    retry_cap_delay_ms: int = Field(
        default=8000,
        ge=0,
        description="Hard cap (ms) on any single retry backoff delay.",
    )
    burst_retry_base_delay_ms: int = Field(
        default=5000,
        ge=0,
        description=(
            "Base (ms) for the backoff when the provider returns a burst-rate "
            "(limit_burst_rate) 429. Higher than retry_base_delay_ms so the "
            "single burst retry lands after the throttle window subsides. "
            "Ignored when the provider sends Retry-After (honored verbatim)."
        ),
    )


class LoggingEnhanceConfig(BaseModel):
    """Request trace logging enhancement settings."""

    enabled: bool = Field(default=False, description="Enable request-level trace ids in Gateway response headers and log records.")
    format: Literal["text", "json"] = Field(default="text", description="Enhanced log output format.")


class LoggingConfig(BaseModel):
    """Logging configuration."""

    enhance: LoggingEnhanceConfig = Field(default_factory=LoggingEnhanceConfig, description="Request trace correlation logging settings.")


class RagVideoConfig(BaseModel):
    """Video-ingestion pipeline knobs (spec 2026-09-08 §7).

    ``enabled`` is the master gate: the upload-allowlist union (text ∪ video
    suffixes) and every video leg key off it. Default false keeps the whole
    video feature's exposure surface at zero.
    """

    enabled: bool = Field(default=False, description="Master gate for video ingestion; when false, video suffixes are rejected at upload.")
    max_size_mb: int = Field(default=2048, ge=1, description="Max video upload size in MB; the upload gate rejects larger files at the door.")
    max_shot_seconds: float = Field(default=5.0, gt=0, description="Upper bound for one shot; longer static scenes are force-cut (长镜头兜底).")
    fallback_window_seconds: float = Field(default=10.0, gt=0, description="Uniform window length when the scene-detection leg fails (degraded).")
    keyframes_per_shot: int = Field(default=1, ge=1, description="Persisted keyframes per shot; caption frames (≤3) are transient.")
    asr_provider: Literal["funasr", "whisper", "openai-audio", "dashscope"] = Field(default="funasr", description="ASR backend: an in-process engine (funasr / whisper) or a transcription service (openai-audio / dashscope).")
    asr_model: str | None = Field(default=None, description="ASR model name for the chosen provider; required — no default (spec 2026-09-30 A-1). A service tier takes the service-side name, e.g. qwen-audio-3.1-asr-flash.")
    card_text_mode: Literal["full", "caption_only", "asr_only"] = Field(default="full", description="Shot-card text assembly mode; non-full modes are caption-quality ablation experiments (spec §6), not a production path.")


class RagTableConfig(BaseModel):
    """Table-ingestion knobs (spec 2026-09-09 §4).

    ``enabled`` gates the spreadsheet suffixes (``.xlsx``/``.xls``/``.tsv``) at the
    upload door and in /supported-formats. ``.csv`` is deliberately **not** gated:
    it already lives in the frozen text allowlist, and routing it through
    table-aware chunking is a correctness fix for the hard-split damage (spec §1),
    not a new exposure surface.
    """

    enabled: bool = Field(default=False, description="Master gate for spreadsheet uploads (.xlsx/.xls/.tsv); when false those suffixes are rejected at upload. .csv is never gated.")
    max_size_mb: int = Field(default=50, ge=1, description="Max table-file upload size in MB; the upload gate rejects larger files at the door (row-explosion guard).")
    card_mode: Literal["markdown", "linearized"] = Field(default="markdown", description="Row-card body serialization: markdown (GFM rows) or linearized (col: value sentences); the latter is a recall-quality ablation (spec §7).")


class RagConfig(BaseModel):
    """Configuration for the RAG knowledge-base subsystem.

    The ``*_api_key`` / ``mineru_api_token`` fields are **secrets** and are normally
    left unset here: they come from the API-writable ``rag_config.json`` (spec
    2026-09-10 rag functional-model config §3) or, as the fallback, from the
    environment (``DASHSCOPE_EMBEDDING_API_KEY``, ``DASHSCOPE_RERANK_API_KEY``,
    ``MINERU_API_TOKEN``). Their resolution order is ``explicit argument > file > environment``.
    """

    qdrant_url: str = Field(default="http://localhost:6333", description="Qdrant server URL hosting the knowledge vector collections (kb_chunks / kb_entities / kb_wiki_entries).")
    embedding_model: str | None = Field(default=None, description="Embedding model name; required — no default, a config that declares none is refused at build time (spec 2026-09-30 A-1).")
    embedding_api_key: str | None = Field(default=None, description="Embedding API key from rag_config.json; None falls back to DASHSCOPE_EMBEDDING_API_KEY.")
    rerank_model: str | None = Field(default=None, description="Rerank model name; required for providers that take one (TEI serves its own model), no default (spec 2026-09-30 A-1).")
    rerank_api_key: str | None = Field(default=None, description="Rerank API key from rag_config.json; None falls back to DASHSCOPE_RERANK_API_KEY.")
    vlm_model: str | None = Field(default=None, description="Name of a config `models:` entry used for captioning images and video shots; None follows the RAG default, then the first configured model.")
    vlm_timeout: float | None = Field(default=None, description="Read timeout for VLM requests; None uses default 180s from code. Connect timeout is always 15s.")
    vlm_connect_timeout: float = Field(default=15.0, description="Connection timeout for VLM requests (seconds).")
    caption_max_tokens: int = Field(default=1024, ge=1, description="Output cap for both caption dialects; room for a full-page transcription.")
    caption_temperature: float = Field(default=0.15, ge=0.0, le=2.0, description="Sampling temperature for caption requests; a low value keeps OCR-style transcriptions stable.")
    extract_model: str | None = Field(default=None, description="Name of the config `models:` entry used for graph extraction (small, cheap, stable JSON output); None uses the first configured model.")
    judge_model: str | None = Field(default=None, description="Name of the config `models:` entry used as the ragas eval judge; None uses the first configured model.")
    default_model: str | None = Field(default=None, description="Name of the config `models:` entry every RAG role falls back to when it declares none of its own; None uses the first configured model.")
    wiki_model: str | None = Field(default=None, description="Name of the config `models:` entry used to write wiki entries; None uses the first configured model.")
    synthesis_model: str | None = Field(default=None, description="Name of the config `models:` entry used to synthesize eval questions; None uses the first configured model.")
    # Follow-chat thinking toggles (spec 2026-10-03 leg-thinking-follow-chat D1=甲): a
    # checked leg sends "thinking on" exactly like chat does — entry gate and the entry's
    # default effort included. Default False keeps today's non-thinking legs unchanged.
    extract_thinking: bool = Field(default=False, description="Follow chat's thinking treatment on the graph-extraction leg.")
    wiki_thinking: bool = Field(default=False, description="Follow chat's thinking treatment on the wiki-writing leg.")
    judge_thinking: bool = Field(default=False, description="Follow chat's thinking treatment on the ragas eval judge leg.")
    synthesis_thinking: bool = Field(default=False, description="Follow chat's thinking treatment on the eval-question synthesis leg.")
    vlm_thinking: bool = Field(default=False, description="Follow chat's thinking treatment on the caption legs; while on, the effective output budget rises to at least 4096 (spec D2=甲).")
    # Per-leg reasoning effort (spec 2026-10-21): a level is sent only while the leg's thinking
    # is on, so "off" stays expressed by the boolean above (and its disable shape) rather than
    # by a seventh level. None follows the model's own default.
    extract_reasoning_effort: ReasoningEffort | None = Field(default=None, description="Reasoning effort for the graph-extraction leg; None follows the model's own default. Sent only while the leg's thinking is on.")
    wiki_reasoning_effort: ReasoningEffort | None = Field(default=None, description="Reasoning effort for the wiki-writing leg; None follows the model's own default. Sent only while the leg's thinking is on.")
    judge_reasoning_effort: ReasoningEffort | None = Field(default=None, description="Reasoning effort for the ragas eval judge leg; None follows the model's own default. Sent only while the leg's thinking is on.")
    synthesis_reasoning_effort: ReasoningEffort | None = Field(default=None, description="Reasoning effort for the eval-question synthesis leg; None follows the model's own default. Sent only while the leg's thinking is on.")
    vlm_reasoning_effort: ReasoningEffort | None = Field(default=None, description="Reasoning effort for the caption legs; None follows the model's own default. Sent only while the leg's thinking is on.")
    mineru_api_token: str | None = Field(default=None, description="MinerU parsing token from rag_config.json; None falls back to MINERU_API_TOKEN.")

    # Provider dimension (spec 2026-09-14 rag model provider adaptation §4.1). Every
    # default reproduces today's behaviour, so a config.yaml that only sets the models
    # above keeps resolving to exactly the providers it used before. The ids are
    # validated against `deerflow.knowledge.providers.PROVIDER_ALLOWLIST`.
    embedding_provider: Literal["dashscope", "volcengine-ark", "openai-compatible"] = Field(default="dashscope", description="Embedding provider id (curated allowlist); `openai-compatible` emits dense only.")
    embedding_base_url: str | None = Field(default=None, description="Embedding endpoint; None uses the provider's own default.")
    embedding_dimension: int | None = Field(default=None, ge=1, description="Override for the dense dimension; None means 1024. A declared width is what the library is written at — changing it rebuilds every collection before the switch.")
    embedding_sparse_source: Literal["provider", "external", "bm25"] = Field(default="provider", description="Who supplies the sparse vectors: the embedding provider itself, the separate `sparse_*` service, or a local BM25 encoder.")
    sparse_provider: Literal["tei-sparse"] | None = Field(default=None, description="Sparse service provider id; used when embedding_sparse_source=external.")
    sparse_base_url: str | None = Field(default=None, description="Sparse service endpoint; used when embedding_sparse_source=external.")
    sparse_model: str | None = Field(default=None, description="Sparse model name; used when embedding_sparse_source=external.")
    sparse_api_key: str | None = Field(default=None, description="Sparse service API key; None falls back to RAG_SPARSE_API_KEY.")
    rerank_provider: Literal["dashscope", "generic-rerank", "tei-rerank"] = Field(default="dashscope", description="Rerank provider id (curated allowlist).")
    rerank_base_url: str | None = Field(default=None, description="Rerank endpoint; None uses the provider's own default.")
    parse_provider: Literal["mineru-cloud", "mineru-local"] = Field(default="mineru-cloud", description="Document-parsing provider: the MinerU cloud API, or a local MinerU service.")
    parse_base_url: str | None = Field(
        default=None,
        description="Parsing-service address: empty means the official MinerU cloud endpoint (https://mineru.net); a self-hosted `mineru-local` needs it (that service ships without auth, so keep it internal).",
    )
    parse_tier: Literal["flash", "basic", "standard", "advanced"] | None = Field(
        default=None,
        description="Optional tier for the local MinerU 4.x service; None lets the service decide (its own default is standard). A flash-only service needs an explicit tier: with none it answers 503 for PDFs.",
    )
    parse_language: Literal["ch", "ch_server", "en", "japan", "korean", "chinese_cht", "ta", "te", "ka", "el", "th", "latin", "arabic", "cyrillic", "east_slavic", "devanagari"] = Field(
        default="ch",
        description="Document language pack for the MinerU cloud leg; `ch` covers Chinese and English (the platform's own default too). The local leg has no language knob.",
    )
    parse_model_version: Literal["pipeline", "vlm"] = Field(
        default="vlm",
        description="MinerU model version for the cloud leg. `vlm` is what this deployment has always sent; `MinerU-HTML` is unreachable because `.html` is not an accepted upload suffix.",
    )
    # The ASR leg's connection info sits here rather than inside `video:` (spec 2026-09-28 D4,
    # ① 乙): every other leg keeps its address and key at this level, and `video` holds the
    # pipeline's own knobs. Only the two service rows read them; the in-process engines take
    # neither.
    asr_base_url: str | None = Field(default=None, description="Transcription service endpoint; required for the service rows (`openai-audio` / `dashscope`), unused by the in-process engines.")
    asr_api_key: str | None = Field(default=None, description="Transcription service API key; None falls back to the selected provider's environment variable (`DASHSCOPE_ASR_API_KEY` / `RAG_ASR_API_KEY`).")

    worker_concurrency: int = Field(default=2, ge=1, description="Max documents the offline indexing worker processes concurrently.")
    extract_concurrency: int = Field(default=8, ge=1, le=32, description="Graph-leg chunk-extraction semaphore width; the knee N = min((RPM/60)*T, (TPM*T)/(60*K)) is model/endpoint-specific (spec 2026-10-01).")
    sweep_enabled: bool = Field(default=True, description="Run the background orphan-vector sweep (spec 2026-10-04): deletes Qdrant points whose business rows no longer exist; a library with a live run is skipped.")
    sweep_interval_hours: float = Field(default=24.0, gt=0, description="Hours between orphan-vector sweep rounds; the first round runs after a short startup jitter.")
    # Phase-2 graph-quality knobs (spec 2026-08-10 D1). Setting the caps large
    # and the guarantee to 0 approximates the phase-1 behaviour.
    graph_per_entity_cap: int = Field(default=3, ge=1, description="Max candidate evidence chunks kept per entity source before selection.")
    graph_per_edge_cap: int = Field(default=2, ge=1, description="Max candidate evidence chunks kept per relation edge source before selection.")
    graph_hop0_guarantee: int = Field(default=2, ge=0, description="Guaranteed evidence slices per directly-matched (hop-0) entity, paid out round-robin by entity score.")
    graph_evidence_limit: int = Field(default=8, ge=1, description="Hard cap on evidence chunks returned by graph_search after ranking.")
    graph_rerank: bool = Field(default=False, description="Opt-in qwen3-rerank precision pass over graph evidence candidates; RerankerError degrades to the embedding-cosine order.")
    graph_rerank_threshold: int = Field(default=12, ge=0, description="Only rerank when the candidate pool exceeds this size.")
    graph_hop_penalty: float = Field(default=0.0, ge=0, description="Experimental A/B knob: subtract penalty × hop from the competition score; 0 keeps the pure chunk-score order.")
    # Phase-2 expansion pruning (spec 2026-08-10 D2).
    graph_neighbor_min_score: float = Field(default=0.4, ge=0, description="Cosine gate a neighbour entity must pass against the query to enter the expansion; 0 restores phase-1 full BFS.")
    graph_max_expanded_nodes: int = Field(default=25, ge=1, description="Hard budget on the expanded subgraph size; hop-0 entities always survive the trim.")
    graph_hub_degree_threshold: int = Field(default=50, ge=0, description="Nodes above this degree only spread their neighbours when semantically relevant (hop-0 exempt).")
    # Phase-2 entity re-resolution (spec 2026-08-10 D3).
    graph_resolution_full_scan_threshold: int = Field(default=500, ge=1, description="Below this graph size the re-resolver scans the whole entity table; larger graphs resolve only touched entities + 1-hop neighbours.")
    entity_merge_similarity: float = Field(default=0.92, ge=0, le=1, description="Cosine threshold for merging alias entity names, shared by per-slice normalization and the incremental re-resolver.")
    # Video ingestion (spec 2026-09-08 §7): master-gated, default off.
    video: RagVideoConfig = Field(default_factory=RagVideoConfig, description="Video ingestion pipeline knobs (shot segmentation / ASR / captioning gates and budgets).")
    # Table ingestion (spec 2026-09-09 §4): master-gated, default off.
    table: RagTableConfig = Field(default_factory=RagTableConfig, description="Table ingestion knobs (spreadsheet upload gate, size ceiling, row-card serialization mode).")


def is_trace_correlation_enabled(config: Any) -> bool:
    """Return ``True`` when ``logging.enhance.enabled`` is set on *config*.

    Single source of truth for the request-trace-correlation gate, shared by
    the Gateway ``TraceMiddleware`` and the embedded ``DeerFlowClient`` so
    the two entry points cannot drift on when ``deerflow_trace_id`` is
    emitted (Langfuse metadata) and when a request-level trace id is bound
    at all. Accepts any object exposing ``logging.enhance.enabled`` via
    ``getattr`` chains (``AppConfig``, ``SimpleNamespace`` fixtures, etc.);
    missing intermediate attributes silently degrade to ``False``.
    """
    logging_config = getattr(config, "logging", None)
    enhance = getattr(logging_config, "enhance", None)
    return bool(getattr(enhance, "enabled", False))


def _legacy_config_candidates() -> tuple[Path, ...]:
    """Return source-tree config.yaml locations for monorepo compatibility."""
    backend_dir = Path(__file__).resolve().parents[4]
    repo_root = backend_dir.parent
    return (backend_dir / "config.yaml", repo_root / "config.yaml")


def logging_level_from_config(name: str | None) -> int:
    """Map ``config.yaml`` ``log_level`` string to a :mod:`logging` level constant."""
    mapping = logging.getLevelNamesMapping()
    return mapping.get((name or "info").strip().upper(), logging.INFO)


def apply_logging_level(name: str | None) -> None:
    """Resolve *name* to a logging level and apply it to the ``deerflow``/``app`` logger hierarchies.

    Only the ``deerflow`` and ``app`` logger levels are changed so that
    third-party library verbosity (e.g. uvicorn, sqlalchemy) is not
    affected. Root handler levels are lowered (never raised) so that
    messages from the configured loggers can propagate through without
    being filtered, while preserving handler thresholds that may be
    intentionally restrictive for third-party log output.
    """
    level = logging_level_from_config(name)
    for logger_name in ("deerflow", "app"):
        logging.getLogger(logger_name).setLevel(level)
    for handler in logging.root.handlers:
        if level < handler.level:
            handler.setLevel(level)


class AppConfig(BaseModel):
    """Config for the DeerFlow application"""

    log_level: str = Field(
        default="info",
        description=format_field_description(
            "log_level",
            field_doc="Logging level for deerflow and app modules (debug/info/warning/error); third-party libraries are not affected.",
        ),
    )
    logging: LoggingConfig = Field(
        default_factory=LoggingConfig,
        description=format_field_description(
            "logging",
            field_doc="Structured logging and request trace correlation settings.",
        ),
    )
    token_usage: TokenUsageConfig = Field(default_factory=TokenUsageConfig, description="Token usage tracking configuration")
    token_budget: TokenBudgetConfig = Field(default_factory=TokenBudgetConfig, description="Token Budget tracking and limits configuration.")
    plugins: list[ExtensionSpec] = Field(
        default_factory=list,
        description=format_field_description(
            "plugins",
            field_doc=(
                "Extension packages to load at startup, in order. Each entry names an install "
                "entry point as 'module.path:install' and carries its own private config block. "
                "Distinct from the `extensions` field above, which configures MCP servers, skills "
                "and config-declared middlewares and is backed by the HTTP-writable "
                "extensions_config.json."
            ),
        ),
    )
    max_recursion_limit: int = Field(
        default=1000,
        ge=1,
        description="Hard server-side ceiling for a client-supplied run recursion_limit. Client values above this are clamped; prevents runaway LangGraph super-steps (LLM cost / DoS).",
    )
    models: list[ModelConfig] = Field(default_factory=list, description="Available models")
    sandbox: SandboxConfig = Field(
        description=format_field_description(
            "sandbox",
            field_doc="Sandbox provider configuration (local filesystem or Docker-based aio sandbox).",
        ),
    )
    tools: list[ToolConfig] = Field(default_factory=list, description="Available tools")
    tool_groups: list[ToolGroupConfig] = Field(default_factory=list, description="Available tool groups")
    skills: SkillsConfig = Field(default_factory=SkillsConfig, description="Skills configuration")
    skill_scan: SkillScanConfig = Field(default_factory=SkillScanConfig, description="Native deterministic skill safety scanning configuration")
    skill_evolution: SkillEvolutionConfig = Field(default_factory=SkillEvolutionConfig, description="Agent-managed skill evolution configuration")
    extensions: ExtensionsConfig = Field(default_factory=ExtensionsConfig, description="Extensions configuration (MCP servers and skills state)")
    tool_output: ToolOutputConfig = Field(default_factory=ToolOutputConfig, description="Tool output budget protection configuration")
    tool_search: ToolSearchConfig = Field(default_factory=ToolSearchConfig, description="Tool search / deferred loading configuration")
    title: TitleConfig = Field(default_factory=TitleConfig, description="Automatic title generation configuration")
    summarization: SummarizationConfig = Field(default_factory=SummarizationConfig, description="Conversation summarization configuration")
    memory: MemoryConfig = Field(default_factory=MemoryConfig, description="Memory subsystem configuration")
    agents_api: AgentsApiConfig = Field(default_factory=AgentsApiConfig, description="Custom-agent management API configuration")
    acp_agents: dict[str, ACPAgentConfig] = Field(default_factory=dict, description="ACP-compatible agent configuration")
    subagents: SubagentsAppConfig = Field(default_factory=SubagentsAppConfig, description="Subagent runtime configuration")
    guardrails: GuardrailsConfig = Field(default_factory=GuardrailsConfig, description="Guardrail middleware configuration")
    authorization: AuthorizationConfig = Field(default_factory=AuthorizationConfig, description="Fine-grained resource authorization configuration (RBAC and beyond)")
    input_polish: InputPolishConfig = Field(default_factory=InputPolishConfig, description="Pre-send input polishing configuration.")
    suggestions: SuggestionsConfig = Field(default_factory=SuggestionsConfig, description="Follow-up suggestions configuration.")
    circuit_breaker: CircuitBreakerConfig = Field(default_factory=CircuitBreakerConfig, description="LLM circuit breaker configuration")
    llm_call: LlmCallConfig = Field(default_factory=LlmCallConfig, description="LLM call execution configuration (concurrency / rate shaping)")
    channel_connections: ChannelConnectionsConfig = Field(
        default_factory=ChannelConnectionsConfig,
        description=format_field_description(
            "channel_connections",
            field_doc="User-facing IM channel connection configuration.",
        ),
    )
    loop_detection: LoopDetectionConfig = Field(default_factory=LoopDetectionConfig, description="Loop detection middleware configuration")
    tool_progress: ToolProgressConfig = Field(default_factory=ToolProgressConfig, description="Tool progress state machine middleware configuration")
    read_before_write: ReadBeforeWriteConfig = Field(default_factory=ReadBeforeWriteConfig, description="Read-before-write file gate middleware configuration")
    safety_finish_reason: SafetyFinishReasonConfig = Field(default_factory=SafetyFinishReasonConfig, description="Provider safety-filter finish_reason interception middleware configuration")
    auth: AuthAppConfig = Field(default_factory=AuthAppConfig, description="Authentication configuration (local + OIDC SSO)")
    model_config = ConfigDict(extra="allow")
    database: DatabaseConfig = Field(
        default_factory=DatabaseConfig,
        description=format_field_description(
            "database",
            field_doc="Unified database backend for run/feedback metadata (memory, sqlite, or postgres).",
        ),
    )
    run_events: RunEventsConfig = Field(
        default_factory=RunEventsConfig,
        description=format_field_description(
            "run_events",
            field_doc="Run-event store backend (memory for dev, db for production queries, jsonl for lightweight single-node persistence).",
        ),
    )
    agent_storage: AgentStorageConfig = Field(
        default_factory=AgentStorageConfig,
        description=format_field_description(
            "agent_storage",
            field_doc="Custom agent definition storage backend ('file' for today's per-user on-disk layout, 'db' to share definitions across nodes via the SQL persistence layer).",
        ),
    )
    scheduler: SchedulerConfig = Field(
        default_factory=SchedulerConfig,
        description=format_field_description(
            "scheduler",
            field_doc="Scheduled task runtime configuration (background poller for one-time and cron agent runs).",
        ),
    )
    checkpointer: CheckpointerConfig | None = Field(
        default=None,
        description=format_field_description(
            "checkpointer",
            field_doc="LangGraph state-persistence checkpointer configuration.",
        ),
    )
    stream_bridge: StreamBridgeConfig | None = Field(
        default=None,
        description=format_field_description(
            "stream_bridge",
            field_doc="Stream bridge connecting agent workers to SSE endpoints.",
        ),
    )
    run_ownership: RunOwnershipConfig = Field(
        default_factory=RunOwnershipConfig,
        description=format_field_description(
            "run_ownership",
            field_doc="Run ownership and lease configuration for multi-worker deployments.",
        ),
    )
    dedupe_storage: DedupeStorageConfig = Field(
        default_factory=DedupeStorageConfig,
        description=format_field_description(
            "dedupe_storage",
            field_doc="Inbound webhook dedupe storage backend (memory / postgres / auto) for cross-pod redelivery dedup. See issue #4120.",
        ),
    )
    rag: RagConfig = Field(default_factory=RagConfig, description="RAG knowledge-base configuration (Qdrant endpoint, embedding/rerank/VLM model names, indexing worker knobs)")

    # Name -> config lookup tables, (re)built after validation by
    # ``_build_name_indexes``. They make ``get_model_config`` / ``get_tool_config``
    # / ``get_tool_group_config`` O(1) instead of an O(n) ``next(...)`` scan per
    # call. Private attrs are excluded from serialization.
    _models_by_name: dict[str, ModelConfig] = PrivateAttr(default_factory=dict)
    _tools_by_name: dict[str, ToolConfig] = PrivateAttr(default_factory=dict)
    _tool_groups_by_name: dict[str, ToolGroupConfig] = PrivateAttr(default_factory=dict)
    # Names of models sourced from the API-writable models_config.json (spec
    # 2026-09-10 §5.2). Derived at load, never written back to any config file;
    # kept off ModelConfig itself so it can never leak into provider kwargs.
    _ui_model_names: set[str] = PrivateAttr(default_factory=set)
    # Names declared under config.yaml `models:` (captured before the UI file merges
    # in). A name declared there owns its merged slot, so the settings UI may not
    # drag it elsewhere (spec 2026-10-08 models-list-grouping §3 D2).
    _yaml_model_names: set[str] = PrivateAttr(default_factory=set)
    # The UI file's top-level `hidden_in_chat` name list: a chat-picker display filter
    # (spec 2026-10-08 models-list-grouping §2④). Not a disable switch — hidden models
    # stay usable and findable; only the picker's options shrink.
    _hidden_in_chat: set[str] = PrivateAttr(default_factory=set)
    # The `rag:` block exactly as config.yaml declares it, captured before the API-writable
    # file is merged over it. The settings PUT validates the configuration it is *about to
    # persist*, and that merge is `config.yaml ⊕ file`: using the already-merged `rag` as the
    # base would judge a field the admin just cleared at the value the replaced file gave it
    # (spec 2026-09-16 §3 D3).
    _yaml_rag: dict[str, Any] = PrivateAttr(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def _drop_null_config_sections(cls, data: Any) -> Any:
        """Treat a present-but-null config section as absent so its default applies.

        Commenting out every entry under a top-level YAML key — e.g. ``models:``
        (a list) or ``memory:`` (an object), with only comments beneath it as
        shipped throughout ``config.example.yaml`` — makes PyYAML parse the value
        as ``None``. Without this, the documented ``cp config.example.yaml
        config.yaml`` first-run flow crashes with an opaque ``Input should be a
        valid list`` / ``valid dictionary`` pydantic error for that section.

        Dropping the ``None`` lets each field fall back to its default: list
        sections become ``[]`` via ``default_factory=list`` and object sections
        get their default config. This generalizes the earlier list-only
        handling to every section that defines a default. The ``database``
        section is independent and still owned by ``_apply_database_defaults``
        (in ``from_file``), which applies concrete defaults beyond null-coercion.
        Required sections without a default (``sandbox``) intentionally still
        error when null — there is nothing to fall back to.
        """
        if isinstance(data, dict):
            return {key: value for key, value in data.items() if value is not None}
        return data

    @classmethod
    def resolve_config_path(cls, config_path: str | None = None) -> Path:
        """Resolve the config file path.

        Priority:
        1. If provided `config_path` argument, use it.
        2. If provided `DEER_FLOW_CONFIG_PATH` environment variable, use it.
        3. Otherwise, search the caller project root.
        4. Finally, search legacy backend/repository-root defaults for monorepo compatibility.
        """
        if config_path:
            path = Path(config_path)
            if not Path.exists(path):
                raise FileNotFoundError(f"Config file specified by param `config_path` not found at {path}")
            return path
        elif os.getenv("DEER_FLOW_CONFIG_PATH"):
            path = Path(os.getenv("DEER_FLOW_CONFIG_PATH"))
            if not Path.exists(path):
                raise FileNotFoundError(f"Config file specified by environment variable `DEER_FLOW_CONFIG_PATH` not found at {path}")
            return path
        else:
            project_config = existing_project_file(("config.yaml",))
            if project_config is not None:
                return project_config

            for path in _legacy_config_candidates():
                if path.exists():
                    return path
            raise FileNotFoundError("`config.yaml` file not found in the project root or legacy backend/repository root locations")

    @classmethod
    def from_file(cls, config_path: str | None = None) -> Self:
        """Load config from YAML file.

        See `resolve_config_path` for more details.

        Args:
            config_path: Path to the config file.

        Returns:
            AppConfig: The loaded config.
        """
        resolved_path = cls.resolve_config_path(config_path)
        with open(resolved_path, encoding="utf-8") as f:
            config_data = yaml.safe_load(f) or {}

        # Check config version before processing
        cls._check_config_version(config_data, resolved_path)

        config_data = cls.resolve_env_variables(config_data)
        cls._apply_database_defaults(config_data)

        # Load circuit_breaker config if present
        if "circuit_breaker" in config_data:
            config_data["circuit_breaker"] = config_data["circuit_breaker"]

        # Load extensions config separately (it's in a different file), while
        # preserving any config.yaml-backed extension fields. config.yaml wins
        # when it explicitly declares a field because those values are part of
        # the main AppConfig hot-reload contract.
        yaml_extensions = config_data.get("extensions")
        extensions_config = ExtensionsConfig.from_file()
        extensions_data = extensions_config.model_dump(by_alias=True)
        if isinstance(yaml_extensions, Mapping):
            yaml_extensions_config = ExtensionsConfig.model_validate(yaml_extensions)
            extensions_data.update(yaml_extensions_config.model_dump(by_alias=True, exclude_unset=True))
        config_data["extensions"] = extensions_data

        # Merge the API-writable models file (models_config.json) over the
        # config.yaml `models:` list: union by name, UI-managed entry winning
        # collisions (spec 2026-09-10 §5.2). config.yaml is never written back.
        ui_models_config = ModelsConfig.from_file()
        ui_model_names = {model.name for model in ui_models_config.models}
        yaml_models = config_data.get("models") or []
        yaml_model_names = {m["name"] for m in yaml_models if isinstance(m, dict) and isinstance(m.get("name"), str)}
        config_data["models"] = merge_ui_models(yaml_models, ui_models_config)

        # Merge the API-writable rag file (rag_config.json) over config.yaml's `rag:`
        # block, field by field, so the settings UI can configure the RAG roles without
        # writing the operator-trusted config.yaml (spec 2026-09-10 rag functional-model
        # config §3). Untouched knobs keep their config.yaml values.
        rag_file = RagConfigFile.from_file()
        yaml_rag = config_data.get("rag")
        config_data["rag"] = merge_rag_config(yaml_rag, rag_file)

        result = cls.model_validate(config_data)
        result._ui_model_names = ui_model_names
        result._yaml_model_names = yaml_model_names
        result._hidden_in_chat = set(ui_models_config.hidden_in_chat)
        result._yaml_rag = dict(yaml_rag) if isinstance(yaml_rag, Mapping) else {}
        if not result.models:
            logger.warning(
                "No models are configured in %s. Add at least one entry under `models:` (see the commented examples in config.example.yaml) or run `make setup`.",
                resolved_path,
            )
        acp_agents = cls._validate_acp_agents(config_data.get("acp_agents", {}))
        cls._apply_singleton_configs(result, acp_agents)
        return result

    @classmethod
    def _validate_acp_agents(
        cls,
        config_data: Mapping[str, Mapping[str, object]] | None,
    ) -> dict[str, ACPAgentConfig]:
        if config_data is None:
            config_data = {}
        return {name: ACPAgentConfig(**cfg) for name, cfg in config_data.items()}

    @classmethod
    def _apply_singleton_configs(cls, config: Self, acp_agents: dict[str, ACPAgentConfig]) -> None:
        from deerflow.config.checkpointer_config import get_checkpointer_config

        previous_checkpointer_config = get_checkpointer_config()

        load_title_config_from_dict(config.title.model_dump())
        load_summarization_config_from_dict(config.summarization.model_dump())
        load_memory_config_from_dict(config.memory.model_dump())
        load_agents_api_config_from_dict(config.agents_api.model_dump())
        load_subagents_config_from_dict(config.subagents.model_dump())
        load_tool_search_config_from_dict(config.tool_search.model_dump())
        load_guardrails_config_from_dict(config.guardrails.model_dump())
        load_authorization_config_from_dict(config.authorization.model_dump())
        load_checkpointer_config_from_dict(config.checkpointer.model_dump() if config.checkpointer is not None else None)
        load_stream_bridge_config_from_dict(config.stream_bridge.model_dump() if config.stream_bridge is not None else None)
        load_acp_config_from_dict({name: agent.model_dump() for name, agent in acp_agents.items()})

        if previous_checkpointer_config != config.checkpointer:
            # These runtime singletons derive their backend from checkpointer config.
            # Keep imports local to avoid cycles: both providers import get_app_config.
            #
            # The unified ``database`` section is intentionally NOT handled here.
            # ``database`` is a restart-required field (reload_boundary.STARTUP_ONLY_FIELDS):
            # ``init_engine_from_config()`` builds the ORM engine once at startup and
            # never rebuilds it on a config.yaml edit. Resetting only the sync
            # checkpointer/store singletons on a live ``database``/``postgres_schema``
            # change would half-migrate the deployment -- new checkpoint/store tables
            # would land in the new schema while ORM rows keep landing in the old one,
            # with no error surfaced. Requiring the documented restart keeps the
            # deployment self-consistent.
            from deerflow.runtime.checkpointer import reset_checkpointer
            from deerflow.runtime.store import reset_store

            reset_checkpointer()
            reset_store()

    @classmethod
    def _apply_database_defaults(cls, config_data: dict[str, Any]) -> None:
        """Apply config.yaml defaults for persistence when the section is absent."""
        database_config = config_data.get("database")
        if database_config is None:
            database_config = {}
            config_data["database"] = database_config
        if not isinstance(database_config, dict):
            return
        for key, value in CONFIG_FILE_DATABASE_DEFAULTS.items():
            database_config.setdefault(key, value)

    @classmethod
    def _check_config_version(cls, config_data: dict, config_path: Path) -> None:
        """Check if the user's config.yaml is outdated compared to config.example.yaml.

        Emits a warning if the user's config_version is lower than the example's.
        Missing config_version is treated as version 0 (pre-versioning).
        """
        try:
            user_version = int(config_data.get("config_version", 0))
        except (TypeError, ValueError):
            user_version = 0

        # Find config.example.yaml by searching config.yaml's directory and its parents
        example_path = None
        search_dir = config_path.parent
        for _ in range(5):  # search up to 5 levels
            candidate = search_dir / "config.example.yaml"
            if candidate.exists():
                example_path = candidate
                break
            parent = search_dir.parent
            if parent == search_dir:
                break
            search_dir = parent
        if example_path is None:
            return

        try:
            with open(example_path, encoding="utf-8") as f:
                example_data = yaml.safe_load(f)
            raw = example_data.get("config_version", 0) if example_data else 0
            try:
                example_version = int(raw)
            except (TypeError, ValueError):
                example_version = 0
        except Exception:
            return

        if user_version < example_version:
            logger.warning(
                "Your config.yaml (version %d) is outdated — the latest version is %d. Run `make config-upgrade` to merge new fields into your config.",
                user_version,
                example_version,
            )

    @classmethod
    def resolve_env_variables(cls, config: Any) -> Any:
        """Recursively resolve environment variables in the config.

        Environment variables are resolved using the `os.getenv` function. Example: $OPENAI_API_KEY

        Args:
            config: The config to resolve environment variables in.

        Returns:
            The config with environment variables resolved.
        """
        if isinstance(config, str):
            if config.startswith("$"):
                env_value = os.getenv(config[1:])
                if env_value is None:
                    raise ValueError(f"Environment variable {config[1:]} not found for config value {config}")
                return env_value
            return config
        elif isinstance(config, dict):
            return {k: cls.resolve_env_variables(v) for k, v in config.items()}
        elif isinstance(config, list):
            return [cls.resolve_env_variables(item) for item in config]
        return config

    @model_validator(mode="after")
    def _build_name_indexes(self) -> "AppConfig":
        """Build name -> config lookup tables for O(1) ``get_*_config``.

        ``get_tool_config`` runs 2-3x per community-tool invocation (e.g.
        web_search) and ``get_model_config`` several times per agent build, so
        the previous O(n) ``next(...)`` scans sat on hot paths. Rebuilt here so a
        config reload (which constructs a fresh ``AppConfig``) refreshes them.
        ``setdefault`` keeps the first entry on duplicate names, preserving the
        prior ``next(...)`` first-match semantics.
        """
        models_by_name: dict[str, ModelConfig] = {}
        for model in self.models:
            models_by_name.setdefault(model.name, model)
        tools_by_name: dict[str, ToolConfig] = {}
        for tool in self.tools:
            tools_by_name.setdefault(tool.name, tool)
        tool_groups_by_name: dict[str, ToolGroupConfig] = {}
        for group in self.tool_groups:
            tool_groups_by_name.setdefault(group.name, group)
        self._models_by_name = models_by_name
        self._tools_by_name = tools_by_name
        self._tool_groups_by_name = tool_groups_by_name
        return self

    def get_model_config(self, name: str) -> ModelConfig | None:
        """Get the model config by name.

        Args:
            name: The name of the model to get the config for.

        Returns:
            The model config if found, otherwise None.
        """
        return self._models_by_name.get(name)

    def is_ui_managed_model(self, name: str) -> bool:
        """Return True when *name* came from the API-writable models_config.json.

        Drives the settings UI's read-only vs editable distinction (spec §5.2):
        config.yaml-sourced models are display-only, UI-managed ones editable.
        """
        return name in self._ui_model_names

    @property
    def yaml_model_names(self) -> frozenset[str]:
        """Names declared under config.yaml ``models:`` — their merged slot is pinned.

        Includes a same-name entry that the UI file overrides: the override keeps the
        yaml entry's position, so the slot stays unmovable (spec 2026-10-08 §3 D2).
        """
        return frozenset(self._yaml_model_names)

    @property
    def hidden_in_chat_names(self) -> frozenset[str]:
        """Names the UI file lists under ``hidden_in_chat`` (chat-picker display filter)."""
        return frozenset(self._hidden_in_chat)

    @property
    def yaml_rag(self) -> dict[str, Any]:
        """The `rag:` block as ``config.yaml`` declares it, before ``rag_config.json`` merges in.

        Read-only and captured at load. The settings PUT's save-time validation needs this base
        to judge the configuration it is about to persist (spec 2026-09-16 §3 D3); the live
        ``rag`` already carries the *current* file and would therefore answer for a field the
        admin just cleared.
        """
        return dict(self._yaml_rag)

    def get_tool_config(self, name: str) -> ToolConfig | None:
        """Get the tool config by name.

        Args:
            name: The name of the tool to get the config for.

        Returns:
            The tool config if found, otherwise None.
        """
        return self._tools_by_name.get(name)

    def get_tool_group_config(self, name: str) -> ToolGroupConfig | None:
        """Get the tool group config by name.

        Args:
            name: The name of the tool group to get the config for.

        Returns:
            The tool group config if found, otherwise None.
        """
        return self._tool_groups_by_name.get(name)


# Compatibility singleton layer for code paths that have not yet been
# migrated to explicit ``AppConfig`` threading. New composition roots should
# prefer constructing ``AppConfig`` once and passing it down directly.
_app_config: AppConfig | None = None
_app_config_path: Path | None = None
_app_config_mtime: float | None = None
_app_config_signature: _ConfigSignature | None = None
_app_config_models_signature: _ConfigSignature | None = None
_app_config_rag_signature: _ConfigSignature | None = None
_app_config_is_custom = False
_current_app_config: ContextVar[AppConfig | None] = ContextVar("deerflow_current_app_config", default=None)
_current_app_config_stack: ContextVar[tuple[AppConfig | None, ...]] = ContextVar("deerflow_current_app_config_stack", default=())


def _get_config_mtime(config_path: Path) -> float | None:
    """Get the modification time of a config file if it exists."""
    try:
        return config_path.stat().st_mtime
    except OSError:
        return None


def _get_rag_config_signature() -> _ConfigSignature | None:
    """Get the content signature of the API-writable rag file, if present.

    Tracked separately from config.yaml so an edit to ``rag_config.json`` alone
    triggers an AppConfig reload (spec 2026-09-10 rag functional-model config §3). A
    missing file or an unresolvable path yields ``None`` (the file is optional).
    """
    try:
        rag_path = RagConfigFile.resolve_config_path()
    except FileNotFoundError:
        return None
    if rag_path is None:
        return None
    return _get_config_signature(rag_path)


def _get_models_config_signature() -> _ConfigSignature | None:
    """Get the content signature of the API-writable models file, if present.

    Tracked separately from config.yaml so an edit to ``models_config.json``
    alone triggers an AppConfig reload (spec 2026-09-10 §5.6). A missing file or
    an unresolvable path yields ``None`` (the file is optional).
    """
    try:
        models_path = ModelsConfig.resolve_config_path()
    except FileNotFoundError:
        return None
    if models_path is None:
        return None
    return _get_config_signature(models_path)


def _load_and_cache_app_config(config_path: str | None = None) -> AppConfig:
    """Load config from disk and refresh cache metadata."""
    global _app_config, _app_config_path, _app_config_mtime, _app_config_signature, _app_config_models_signature, _app_config_rag_signature, _app_config_is_custom

    resolved_path = AppConfig.resolve_config_path(config_path)
    _app_config = AppConfig.from_file(str(resolved_path))
    _app_config_path = resolved_path
    _app_config_mtime = _get_config_mtime(resolved_path)
    _app_config_signature = _get_config_signature(resolved_path)
    _app_config_models_signature = _get_models_config_signature()
    _app_config_rag_signature = _get_rag_config_signature()
    _app_config_is_custom = False
    return _app_config


def get_app_config() -> AppConfig:
    """Get the DeerFlow config instance.

    Returns a cached singleton instance and automatically reloads it when the
    underlying config file path or content signature changes. Use
    `reload_app_config()` to force a reload, or `reset_app_config()` to clear
    the cache.
    """
    global _app_config, _app_config_path, _app_config_mtime, _app_config_signature

    runtime_override = _current_app_config.get()
    if runtime_override is not None:
        return runtime_override

    if _app_config is not None and _app_config_is_custom:
        return _app_config

    resolved_path = AppConfig.resolve_config_path()
    current_mtime = _get_config_mtime(resolved_path)
    current_signature = _get_config_signature(resolved_path)
    current_models_signature = _get_models_config_signature()
    current_rag_signature = _get_rag_config_signature()

    should_reload = _app_config is None or _app_config_path != resolved_path or _app_config_signature != current_signature or _app_config_models_signature != current_models_signature or _app_config_rag_signature != current_rag_signature
    if should_reload:
        if _app_config_path == resolved_path and _app_config_mtime is not None and current_mtime is not None and _app_config_mtime != current_mtime:
            logger.info(
                "Config file has been modified (mtime: %s -> %s), reloading AppConfig",
                _app_config_mtime,
                current_mtime,
            )
        elif _app_config_path == resolved_path and _app_config_signature != current_signature:
            logger.info("Config file content signature changed, reloading AppConfig")
        elif _app_config_path == resolved_path and _app_config_models_signature != current_models_signature:
            logger.info("Models config file changed, reloading AppConfig")
        elif _app_config_path == resolved_path and _app_config_rag_signature != current_rag_signature:
            logger.info("Rag config file changed, reloading AppConfig")
        _load_and_cache_app_config(str(resolved_path))
    return _app_config


def reload_app_config(config_path: str | None = None) -> AppConfig:
    """Reload the config from file and update the cached instance.

    This is useful when the config file has been modified and you want
    to pick up the changes without restarting the application.

    Args:
        config_path: Optional path to config file. If not provided,
                     uses the default resolution strategy.

    Returns:
        The newly loaded AppConfig instance.
    """
    return _load_and_cache_app_config(config_path)


def reset_app_config() -> None:
    """Reset the cached config instance.

    This clears the singleton cache, causing the next call to
    `get_app_config()` to reload from file. Useful for testing
    or when switching between different configurations.
    """
    global _app_config, _app_config_path, _app_config_mtime, _app_config_signature, _app_config_models_signature, _app_config_rag_signature, _app_config_is_custom
    _app_config = None
    _app_config_path = None
    _app_config_mtime = None
    _app_config_signature = None
    _app_config_models_signature = None
    _app_config_rag_signature = None
    _app_config_is_custom = False


def set_app_config(config: AppConfig) -> None:
    """Set a custom config instance.

    This allows injecting a custom or mock config for testing purposes.

    Args:
        config: The AppConfig instance to use.
    """
    global _app_config, _app_config_path, _app_config_mtime, _app_config_signature, _app_config_models_signature, _app_config_rag_signature, _app_config_is_custom
    _app_config = config
    _app_config_path = None
    _app_config_mtime = None
    _app_config_signature = None
    _app_config_models_signature = None
    _app_config_rag_signature = None
    _app_config_is_custom = True


def peek_current_app_config() -> AppConfig | None:
    """Return the runtime-scoped AppConfig override, if one is active."""
    return _current_app_config.get()


def push_current_app_config(config: AppConfig) -> None:
    """Push a runtime-scoped AppConfig override for the current execution context."""
    stack = _current_app_config_stack.get()
    _current_app_config_stack.set(stack + (_current_app_config.get(),))
    _current_app_config.set(config)


def pop_current_app_config() -> None:
    """Pop the latest runtime-scoped AppConfig override for the current execution context."""
    stack = _current_app_config_stack.get()
    if not stack:
        _current_app_config.set(None)
        return
    previous = stack[-1]
    _current_app_config_stack.set(stack[:-1])
    _current_app_config.set(previous)
