import asyncio
import logging
from typing import Any
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from app.gateway.accessors import get_config, get_optional_user_from_request, require_admin_user
from app.gateway.authz import (
    _AuthorizationUnavailable,
    _is_internal_caller,
    resolve_model_authorization,
)
from deerflow.authz.provider import AuthzDecision, AuthzRequest
from deerflow.config.app_config import AppConfig
from deerflow.config.model_config import ModelConfig, ReasoningEffort
from deerflow.config.models_config import (
    MASKED_API_KEY,
    PROVIDER_ALLOWLIST,
    ModelsConfig,
    atomic_write_models_config,
    endpoint_key_for,
    models_config_write_lock,
    preserve_api_key,
    resolve_provider_use,
    reverse_lookup_provider,
)
from deerflow.config.runtime_paths import project_root

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["models"])


class ModelResponse(BaseModel):
    """Response model for model information."""

    name: str = Field(..., description="Unique identifier for the model")
    model: str = Field(..., description="Actual provider model identifier")
    display_name: str | None = Field(None, description="Human-readable name")
    description: str | None = Field(None, description="Model description")
    supports_thinking: bool = Field(default=False, description="Whether model supports thinking mode")
    supports_reasoning_effort: bool = Field(default=False, description="Whether model supports reasoning effort")
    supported_reasoning_efforts: list[ReasoningEffort] | None = Field(
        default=None,
        description="Declared effort subset the composer offers; null = undeclared (all six levels).",
    )
    reasoning_effort: ReasoningEffort | None = Field(
        default=None,
        description="Default effort level the composer preselects; null = none declared.",
    )
    context_window: int | None = Field(
        default=None,
        description="Total context window size in tokens (prompt + completion); None when unconfigured",
    )
    hidden_in_chat: bool = Field(
        default=False,
        description="Listed in models_config.json's hidden_in_chat: hidden from the chat model pickers (display filter only; the model stays usable).",
    )


class TokenUsageResponse(BaseModel):
    """Token usage display configuration."""

    enabled: bool = Field(default=False, description="Whether token usage display is enabled")


class ModelsListResponse(BaseModel):
    """Response model for listing all models."""

    models: list[ModelResponse]
    token_usage: TokenUsageResponse


@router.get(
    "/models",
    response_model=ModelsListResponse,
    summary="List All Models",
    description="Retrieve a list of all available AI models configured in the system.",
)
async def list_models(
    request: Request,
    config: AppConfig = Depends(get_config),
) -> ModelsListResponse:
    """List all available models from configuration.

    Returns model information suitable for frontend display,
    excluding sensitive fields like API keys and internal configuration.

    When ``authorization.enabled`` is true, only models the caller's role may
    ``list`` are returned (filtered via ``provider.filter_resources``). A
    provider error yields an empty list (fail-closed) or all models (fail-open).

    Returns:
        A list of all configured models with their metadata and token usage display settings.

    Example Response:
        ```json
        {
            "models": [
                {
                    "name": "gpt-4",
                    "model": "gpt-4",
                    "display_name": "GPT-4",
                    "description": "OpenAI GPT-4 model",
                    "supports_thinking": false,
                    "supports_reasoning_effort": false
                },
                {
                    "name": "claude-3-opus",
                    "model": "claude-3-opus",
                    "display_name": "Claude 3 Opus",
                    "description": "Anthropic Claude 3 Opus model",
                    "supports_thinking": true,
                    "supports_reasoning_effort": false
                }
            ],
            "token_usage": {
                "enabled": true
            }
        }
        ```
    """
    visible_models = config.models
    fail_closed = config.authorization.fail_closed

    user = await get_optional_user_from_request(request)
    if user is not None:
        try:
            provider, principal = resolve_model_authorization(user, is_internal=_is_internal_caller(request, user))
        except _AuthorizationUnavailable as exc:
            if exc.fail_closed:
                visible_models = []
        else:
            if provider is not None and principal is not None:
                try:
                    allowed_names = provider.filter_resources(principal, "model", [m.name for m in config.models])
                    if not isinstance(allowed_names, list) or any(not isinstance(n, str) for n in allowed_names):
                        raise TypeError("AuthorizationProvider.filter_resources must return list[str]")
                    allowed_set = set(allowed_names)
                    visible_models = [m for m in config.models if m.name in allowed_set]
                except Exception:
                    logger.warning("Authorization provider failed while filtering models", exc_info=True)
                    visible_models = [] if fail_closed else config.models

    models = [
        ModelResponse(
            name=model.name,
            model=model.model,
            display_name=model.display_name,
            description=model.description,
            supports_thinking=model.supports_thinking,
            supports_reasoning_effort=model.supports_reasoning_effort,
            supported_reasoning_efforts=model.supported_reasoning_efforts,
            reasoning_effort=model.reasoning_effort,
            context_window=model.context_window,
            hidden_in_chat=model.name in config.hidden_in_chat_names,
        )
        for model in visible_models
    ]
    return ModelsListResponse(
        models=models,
        token_usage=TokenUsageResponse(enabled=config.token_usage.enabled),
    )


# ── Admin models management (web "Models" settings, spec 2026-09-10 §5.3–§5.5) ──
# NOTE: these routes are declared BEFORE ``/models/{model_name}`` below: FastAPI
# matches in registration order and the ``{model_name}`` path param would
# otherwise shadow ``/models/config`` (model_name="config" → 404).

_ADMIN_DETAIL = "Admin privileges required to manage model configuration."


class ManagedModelInput(BaseModel):
    """One UI-managed model submitted by the settings UI.

    ``extra="forbid"`` is the security boundary: a free-text ``use:`` class path
    (a dynamic-import / code-execution vector) is rejected outright; the caller
    supplies a curated ``provider`` id that the server maps to a fixed class
    path (spec §5.3).
    """

    model_config = ConfigDict(extra="forbid")

    provider: str = Field(..., description="Curated provider id from the allowlist (openai-compatible / anthropic / deepseek).")
    name: str = Field(..., description="Unique model name (defaults to the provider model id in the UI).")
    model: str = Field(..., description="Provider-side model identifier.")
    api_key: str | None = Field(default=None, description="API key; the masking sentinel means 'keep the stored key'.")
    endpoint: str | None = Field(default=None, description="Endpoint override; stored under the provider's canonical key (base_url or api_base).")
    display_name: str | None = Field(default=None, description="Human-readable name.")
    description: str | None = Field(default=None, description="Model description.")
    supports_thinking: bool = Field(default=False, description="Whether the model supports thinking mode.")
    supports_vision: bool = Field(default=False, description="Whether the model supports vision inputs.")
    supports_reasoning_effort: bool = Field(default=False, description="Whether the model supports reasoning effort.")
    supported_context_windows: list[int] | None = Field(
        default=None,
        description="Declared window subset (non-empty, de-duplicated, ascending members of CONTEXT_WINDOW_OPTIONS); None = undeclared.",
    )
    supported_reasoning_efforts: list[ReasoningEffort] | None = Field(
        default=None,
        description="Declared effort subset (non-empty, de-duplicated, ordered minimal<low<medium<high<xhigh<max); None = undeclared.",
    )
    reasoning_effort: ReasoningEffort | None = Field(
        default=None,
        description="Default reasoning-effort level; must be a member of supported_reasoning_efforts when both are set.",
    )
    context_window: int | None = Field(default=None, gt=0, description="Total context window in tokens (prompt + completion).")
    max_tokens: int | None = Field(default=None, gt=0, description="Per-call output cap.")
    use_responses_api: bool | None = Field(default=None, description="Route OpenAI-compatible calls through /v1/responses.")
    when_thinking_enabled: dict | None = Field(default=None, description="Request-body recipe applied when thinking is on.")
    when_thinking_disabled: dict | None = Field(default=None, description="Request-body recipe applied when thinking is off.")
    default_headers: dict[str, str] | None = Field(default=None, description="Extra HTTP headers sent with every call to this model.")


class ModelsConfigUpdateRequest(BaseModel):
    """Whole-collection replacement of the UI-managed model set."""

    model_config = ConfigDict(extra="forbid")

    models: list[ManagedModelInput] = Field(default_factory=list)
    hidden_in_chat: list[str] = Field(
        default_factory=list,
        description="Names hidden from the chat model pickers, written wholesale: omitting the key on a save clears the list.",
    )


class ManagedModelResponse(BaseModel):
    """Admin view of one model: masked key, provider, source, editability."""

    name: str
    model: str
    display_name: str | None = None
    description: str | None = None
    provider: str | None = Field(default=None, description="Allowlisted provider id; None when the stored use: is not allowlisted.")
    endpoint_key: str | None = Field(default=None, description="Canonical endpoint field name (base_url / api_base).")
    endpoint: str | None = Field(default=None, description="Current endpoint override value.")
    api_key: str = Field(default=MASKED_API_KEY, description="Always the masking sentinel; never the real key.")
    supports_thinking: bool = False
    supports_vision: bool = False
    supports_reasoning_effort: bool = False
    supported_context_windows: list[int] | None = None
    supported_reasoning_efforts: list[ReasoningEffort] | None = None
    reasoning_effort: ReasoningEffort | None = None
    context_window: int | None = None
    when_thinking_enabled: dict | None = Field(default=None, description="Request-body recipe applied when thinking is on.")
    when_thinking_disabled: dict | None = Field(default=None, description="Request-body recipe applied when thinking is off.")
    default_headers: dict[str, str] | None = Field(default=None, description="Extra HTTP headers sent with every call to this model.")
    max_tokens: int | None = Field(default=None, description="Per-call output cap; None when never set.")
    use_responses_api: bool | None = Field(default=None, description="Route OpenAI-compatible calls through /v1/responses; None when never set.")
    source: str = Field(default="config_file", description="Origin: 'ui' (models_config.json) or 'config_file' (config.yaml).")
    editable: bool = Field(default=False, description="True only for UI-managed models.")
    hidden_in_chat: bool = Field(default=False, description="Listed in hidden_in_chat: hidden from the chat model pickers (display filter).")
    order_pinned: bool = Field(default=False, description="Merged position is pinned by config.yaml (name declared under models:); the settings UI may not drag the row.")


class ModelsConfigResponse(BaseModel):
    models: list[ManagedModelResponse]


def _validate_capabilities(model_name: str, entry: dict) -> None:
    """Reject an illegal capability combination before it reaches ``models_config.json``.

    ``AppConfig.from_file`` loads that file on every hot reload with no fallback, so
    persisting e.g. a default window outside its own declared subset would break every
    later config read. The check reuses the harness ``ModelConfig`` validator rather
    than restating its rules here.
    """
    try:
        ModelConfig.model_validate(entry)
    except ValidationError as exc:
        message = exc.errors()[0]["msg"].removeprefix("Value error, ")
        raise HTTPException(status_code=422, detail=f"Model '{model_name}' has an invalid capability configuration: {message}") from None


#: Bounded probe budget (spec §5.3.2): an admin ringing a dead endpoint must get
#: an answer, not a hung request.
_VALIDATE_TIMEOUT_SECONDS = 10.0

#: OpenAI-compatible providers (OpenAI / DeepSeek) list models at ``{base}/models``.
_DEFAULT_MODELS_PATH = "/models"
#: Anthropic is the one allowlisted provider that is neither OpenAI-compatible in
#: path nor in auth: it lists models at a versioned ``/v1/models`` and expects
#: ``x-api-key`` plus a required API-version header, so a Bearer probe would 401
#: on a perfectly valid key.
_ANTHROPIC_MODELS_PATH = "/v1/models"
_ANTHROPIC_API_VERSION = "2023-06-01"

#: How many upstream model ids to echo back when the requested one is missing.
_MODELS_DETAIL_SAMPLE = 10
#: Cap on the upstream error-body snippet included in ``detail``.
_ERROR_BODY_SNIPPET = 200


class ModelsConfigValidateRequest(BaseModel):
    """Credential + model-presence probe submitted by the add-model wizard.

    ``extra="forbid"`` for the same reason as :class:`ManagedModelInput`: this
    route must not become a second, unvalidated way to describe a model.
    """

    model_config = ConfigDict(extra="forbid")

    provider: str = Field(..., description="Curated provider id from the allowlist.")
    endpoint: str = Field(..., min_length=1, description="Provider base URL; http(s) only.")
    api_key: str = Field(..., min_length=1, description="Key used for this probe only; never stored.")
    model: str = Field(..., min_length=1, description="Provider-side model id whose presence is checked.")

    @field_validator("endpoint")
    @classmethod
    def _require_http_url(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped.startswith(("http://", "https://")):
            raise ValueError("Endpoint must be an http(s) URL.")
        return stripped


class ModelsConfigValidateResponse(BaseModel):
    """Probe outcome; ``detail`` is human-readable and never contains the API key."""

    ok: bool = Field(..., description="True when the endpoint answered with a model list.")
    model_present: bool = Field(..., description="True when the requested model id appears in that list.")
    detail: str = Field(..., description="Why the probe succeeded or failed.")
    warning: str | None = Field(default=None, description="Non-blocking advice about the submitted endpoint (spec: base-URL field holding a method or model-list path); absent when there is nothing to say.")


#: Path segments that mean the value in the endpoint field is a *method or list URL*, not the
#: base URL the client will use. The probe tolerates them (it strips and re-joins the path), so
#: without this advisory a wrong value validates here and then fails on the first real call.
_ENDPOINT_PATH_ADVICE: tuple[tuple[str, str], ...] = (
    ("/chat/completions", "chat completions"),
    ("/completions", "completions"),
    ("/messages", "messages"),
    ("/responses", "responses"),
    ("/models", "the model list"),
)


def _endpoint_path_warning(endpoint: str) -> str | None:
    """Advice when the submitted endpoint carries a method or model-list path.

    Purely advisory: the probe already tolerates these values, but the stored value is used
    verbatim at runtime, where a complete path (`.../v1/chat/completions`) makes the client
    append its own path and 404. Query strings and fragments are ignored.
    """
    path = urlsplit(endpoint.strip()).path.rstrip("/")
    for suffix, label in _ENDPOINT_PATH_ADVICE:
        if path.endswith(suffix):
            return f"The endpoint path ends with '{suffix}' ({label}). Use the base URL — the client appends its own path — otherwise this value may validate here and still fail when the model is used."
    return None


def _models_probe_url(endpoint: str, models_path: str) -> str:
    """Join the caller's endpoint with the provider's model-list path.

    A caller that pasted a full list URL (``.../models``) or already included the
    version segment (``.../v1``) must not get it twice.
    """
    base = endpoint.rstrip("/")
    if base.endswith(models_path):
        return base
    version = models_path.rsplit("/", 1)[0]
    if version and base.endswith(version):
        base = base[: -len(version)]
    return f"{base}{models_path}"


def _models_probe_headers(provider: str, api_key: str) -> dict[str, str]:
    if provider == "anthropic":
        return {"x-api-key": api_key, "anthropic-version": _ANTHROPIC_API_VERSION}
    return {"Authorization": f"Bearer {api_key}"}


def _extract_model_ids(payload: Any) -> list[str] | None:
    """Read model ids from an OpenAI/Anthropic-style ``{"data": [{"id": ...}]}`` payload."""
    entries = payload.get("data") if isinstance(payload, dict) else payload
    if not isinstance(entries, list):
        return None
    ids: list[str] = []
    for entry in entries:
        if isinstance(entry, str):
            ids.append(entry)
        elif isinstance(entry, dict) and isinstance(entry.get("id"), str):
            ids.append(entry["id"])
    return ids


def _probe_failure(detail: str, warning: str | None = None) -> ModelsConfigValidateResponse:
    return ModelsConfigValidateResponse(ok=False, model_present=False, detail=detail, warning=warning)


def _managed_response(
    *,
    name: str,
    model: str,
    display_name: str | None,
    description: str | None,
    provider: str | None,
    endpoint_key: str | None,
    endpoint: str | None,
    supports_thinking: bool,
    supports_vision: bool,
    supports_reasoning_effort: bool,
    supported_context_windows: list[int] | None,
    supported_reasoning_efforts: list[ReasoningEffort] | None,
    reasoning_effort: ReasoningEffort | None,
    context_window: int | None,
    when_thinking_enabled: dict | None,
    when_thinking_disabled: dict | None,
    default_headers: dict[str, str] | None,
    max_tokens: int | None,
    use_responses_api: bool | None,
    source: str,
    hidden_in_chat: bool = False,
    order_pinned: bool = False,
) -> ManagedModelResponse:
    return ManagedModelResponse(
        name=name,
        model=model,
        display_name=display_name,
        description=description,
        provider=provider,
        endpoint_key=endpoint_key,
        endpoint=endpoint,
        api_key=MASKED_API_KEY,
        supports_thinking=supports_thinking,
        supports_vision=supports_vision,
        supports_reasoning_effort=supports_reasoning_effort,
        supported_context_windows=supported_context_windows,
        supported_reasoning_efforts=supported_reasoning_efforts,
        reasoning_effort=reasoning_effort,
        context_window=context_window,
        when_thinking_enabled=when_thinking_enabled,
        when_thinking_disabled=when_thinking_disabled,
        default_headers=default_headers,
        max_tokens=max_tokens,
        use_responses_api=use_responses_api,
        source=source,
        editable=(source == "ui"),
        hidden_in_chat=hidden_in_chat,
        order_pinned=order_pinned,
    )


@router.get(
    "/models/config",
    response_model=ModelsConfigResponse,
    summary="List Managed Models (admin)",
    description="Admin view of all models with masked API keys, provider, source and editability.",
)
async def get_models_config(
    request: Request,
    config: AppConfig = Depends(get_config),
) -> ModelsConfigResponse:
    """Return the merged model set for the settings UI (spec §5.5).

    config.yaml-sourced models are read-only (``source=config_file``);
    models_config.json-sourced models are editable (``source=ui``).
    """
    await require_admin_user(request, detail=_ADMIN_DETAIL)

    responses = []
    for model in config.models:
        dumped = model.model_dump()
        provider = reverse_lookup_provider(model.use)
        endpoint_key = endpoint_key_for(provider) if provider else None
        endpoint = dumped.get(endpoint_key) if endpoint_key else None
        source = "ui" if config.is_ui_managed_model(model.name) else "config_file"
        responses.append(
            _managed_response(
                name=model.name,
                model=model.model,
                display_name=model.display_name,
                description=model.description,
                provider=provider,
                endpoint_key=endpoint_key,
                endpoint=endpoint,
                supports_thinking=model.supports_thinking,
                supports_vision=model.supports_vision,
                supports_reasoning_effort=model.supports_reasoning_effort,
                supported_context_windows=model.supported_context_windows,
                supported_reasoning_efforts=model.supported_reasoning_efforts,
                reasoning_effort=model.reasoning_effort,
                context_window=model.context_window,
                when_thinking_enabled=model.when_thinking_enabled,
                when_thinking_disabled=model.when_thinking_disabled,
                default_headers=dumped.get("default_headers"),
                max_tokens=dumped.get("max_tokens"),
                use_responses_api=model.use_responses_api,
                source=source,
                hidden_in_chat=model.name in config.hidden_in_chat_names,
                order_pinned=model.name in config.yaml_model_names,
            )
        )
    return ModelsConfigResponse(models=responses)


@router.post(
    "/models/config/validate",
    response_model=ModelsConfigValidateResponse,
    # Additive wire: `warning` is a new, optional field, so it must be absent (not null) when
    # there is nothing to say — older clients keep seeing exactly the response they used to.
    response_model_exclude_none=True,
    summary="Validate Model Credentials (admin)",
    description="Probe the provider's model list with the submitted credentials. Nothing is persisted.",
)
async def validate_models_config(
    request: Request,
    body: ModelsConfigValidateRequest,
) -> ModelsConfigValidateResponse:
    """Credential + model-presence probe for the add-model wizard (spec §5.3.2).

    The URL is the caller's endpoint plus a per-provider model-list path, so this
    route cannot be turned into an arbitrary-URL fetcher. Admin-gated, bounded by
    a short timeout, and purely observational: the key is used for this call only
    and never persists, so the wizard can block step 2 before anything is stored.
    """
    await require_admin_user(request, detail=_ADMIN_DETAIL)

    if resolve_provider_use(body.provider) is None:
        allowed = ", ".join(sorted(PROVIDER_ALLOWLIST))
        raise HTTPException(status_code=422, detail=f"Unknown provider '{body.provider}'. Allowed providers: {allowed}.")

    models_path = _ANTHROPIC_MODELS_PATH if body.provider == "anthropic" else _DEFAULT_MODELS_PATH
    url = _models_probe_url(body.endpoint, models_path)
    headers = _models_probe_headers(body.provider, body.api_key)
    warning = _endpoint_path_warning(body.endpoint)

    try:
        async with httpx.AsyncClient(timeout=_VALIDATE_TIMEOUT_SECONDS) as client:
            response = await client.get(url, headers=headers)
    except (httpx.HTTPError, httpx.InvalidURL) as exc:
        return _probe_failure(f"Could not reach {url}: {exc}", warning)

    if response.status_code != 200:
        detail = f"{url} returned HTTP {response.status_code}."
        snippet = " ".join(response.text.split())[:_ERROR_BODY_SNIPPET]
        return _probe_failure(f"{detail} {snippet}" if snippet else detail, warning)

    try:
        model_ids = _extract_model_ids(response.json())
    except ValueError:
        model_ids = None
    if model_ids is None:
        return _probe_failure(f"{url} did not return a JSON model list.", warning)

    if body.model in model_ids:
        return ModelsConfigValidateResponse(ok=True, model_present=True, detail=f"Model '{body.model}' is available.", warning=warning)
    detail = f"Model '{body.model}' was not found on this endpoint."
    available = ", ".join(model_ids[:_MODELS_DETAIL_SAMPLE])
    return ModelsConfigValidateResponse(ok=True, model_present=False, detail=f"{detail} Available: {available}." if available else detail, warning=warning)


@router.get(
    "/models/{model_name}",
    response_model=ModelResponse,
    summary="Get Model Details",
    description="Retrieve detailed information about a specific AI model by its name.",
)
async def get_model(
    model_name: str,
    request: Request,
    config: AppConfig = Depends(get_config),
) -> ModelResponse:
    """Get a specific model by name.

    Args:
        model_name: The unique name of the model to retrieve.

    Returns:
        Model information if found.

    Raises:
        HTTPException: 404 if model not found; 403 if the caller's role may not
        ``use`` the model (only when ``authorization.enabled`` is true). A
        provider resolution error yields 403 (fail-closed) or allows the request
        (fail-open), mirroring ``list_models``'s provider-error semantics.

    Example Response:
        ```json
        {
            "name": "gpt-4",
            "display_name": "GPT-4",
            "description": "OpenAI GPT-4 model",
            "supports_thinking": false
        }
        ```
    """
    model = config.get_model_config(model_name)
    if model is None:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")

    # Phase 3: enforce model:use authorization (deny → 403, not 404, since the
    # model exists but the role lacks permission to use it).
    fail_closed = config.authorization.fail_closed
    user = await get_optional_user_from_request(request)
    if user is not None:
        try:
            provider, principal = resolve_model_authorization(user, is_internal=_is_internal_caller(request, user))
        except _AuthorizationUnavailable:
            if fail_closed:
                raise HTTPException(status_code=403, detail=f"Model '{model_name}' is not available for your role")
        else:
            if provider is not None and principal is not None:
                try:
                    decision = provider.authorize(AuthzRequest(principal=principal, resource="model", action="use", target=model_name))
                    if not isinstance(decision, AuthzDecision):
                        raise TypeError("AuthorizationProvider.authorize must return AuthzDecision")
                    allowed = decision.allow
                except Exception:
                    logger.warning(
                        "Authorization provider failed while checking model:use for %s",
                        model_name,
                        exc_info=True,
                    )
                    allowed = not fail_closed
                if not allowed:
                    raise HTTPException(status_code=403, detail=f"Model '{model_name}' is not available for your role")

    return ModelResponse(
        name=model.name,
        model=model.model,
        display_name=model.display_name,
        description=model.description,
        supports_thinking=model.supports_thinking,
        supports_reasoning_effort=model.supports_reasoning_effort,
        supported_reasoning_efforts=model.supported_reasoning_efforts,
        reasoning_effort=model.reasoning_effort,
        context_window=model.context_window,
        hidden_in_chat=model.name in config.hidden_in_chat_names,
    )


@router.put(
    "/models/config",
    response_model=ModelsConfigResponse,
    summary="Replace Managed Models (admin)",
    description="Replace the UI-managed model set in models_config.json. config.yaml is never written.",
)
async def put_models_config(
    request: Request,
    body: ModelsConfigUpdateRequest,
    config: AppConfig = Depends(get_config),
) -> ModelsConfigResponse:
    """Validate and persist the whole UI-managed model collection (spec §5.3–§5.5).

    Each entry's ``provider`` is mapped to a fixed ``use:`` class path and the
    provider's canonical endpoint key; a masking-sentinel ``api_key`` preserves
    the stored key. Writes are atomic and lock-serialized; the config hot-reload
    signature picks the change up on the next read.
    """
    await require_admin_user(request, detail=_ADMIN_DETAIL)

    hidden_set = set(body.hidden_in_chat)
    stored = ModelsConfig.from_file()
    stored_keys: dict[str, str] = {}
    for existing in stored.models:
        stored_keys[existing.name] = str(existing.model_dump().get("api_key") or "")

    seen: set[str] = set()
    entries: list[dict] = []
    responses: list[ManagedModelResponse] = []
    for item in body.models:
        if item.name in seen:
            raise HTTPException(status_code=422, detail=f"Duplicate model name '{item.name}' in request.")
        seen.add(item.name)
        if not item.name.strip():
            raise HTTPException(status_code=422, detail="Model name must be non-empty.")
        if not item.model.strip():
            raise HTTPException(status_code=422, detail=f"Model '{item.name}' must specify a provider model id.")
        use = resolve_provider_use(item.provider)
        if use is None:
            allowed = ", ".join(sorted(PROVIDER_ALLOWLIST))
            raise HTTPException(status_code=422, detail=f"Unknown provider '{item.provider}'. Allowed providers: {allowed}.")
        endpoint_key = endpoint_key_for(item.provider) or "base_url"
        api_key = preserve_api_key(item.api_key, stored_keys.get(item.name, "")) if item.api_key is not None else stored_keys.get(item.name, "")

        entry: dict = {
            "name": item.name,
            "use": use,
            "model": item.model,
            "display_name": item.display_name,
            "description": item.description,
            "api_key": api_key,
            "supports_thinking": item.supports_thinking,
            "supports_vision": item.supports_vision,
            "supports_reasoning_effort": item.supports_reasoning_effort,
            "supported_context_windows": item.supported_context_windows,
            "supported_reasoning_efforts": item.supported_reasoning_efforts,
            "reasoning_effort": item.reasoning_effort,
            "context_window": item.context_window,
            "max_tokens": item.max_tokens,
            "use_responses_api": item.use_responses_api,
            "when_thinking_enabled": item.when_thinking_enabled,
            "when_thinking_disabled": item.when_thinking_disabled,
            "default_headers": item.default_headers,
        }
        if item.endpoint:
            entry[endpoint_key] = item.endpoint
        stored_entry = {key: value for key, value in entry.items() if value is not None}
        _validate_capabilities(item.name, stored_entry)
        entries.append(stored_entry)

        responses.append(
            _managed_response(
                name=item.name,
                model=item.model,
                display_name=item.display_name,
                description=item.description,
                provider=item.provider,
                endpoint_key=endpoint_key,
                endpoint=item.endpoint,
                supports_thinking=item.supports_thinking,
                supports_vision=item.supports_vision,
                supports_reasoning_effort=item.supports_reasoning_effort,
                supported_context_windows=item.supported_context_windows,
                supported_reasoning_efforts=item.supported_reasoning_efforts,
                reasoning_effort=item.reasoning_effort,
                context_window=item.context_window,
                when_thinking_enabled=item.when_thinking_enabled,
                when_thinking_disabled=item.when_thinking_disabled,
                default_headers=item.default_headers,
                max_tokens=item.max_tokens,
                use_responses_api=item.use_responses_api,
                source="ui",
                hidden_in_chat=item.name in hidden_set,
                order_pinned=item.name in config.yaml_model_names,
            )
        )

    target_path = ModelsConfig.resolve_config_path() or (project_root() / "models_config.json")

    def _write() -> None:
        with models_config_write_lock:
            # The name list is written wholesale alongside the models: an omitted
            # `hidden_in_chat` in the request means "clear the list", matching the
            # whole-collection replacement semantics of `models` itself.
            atomic_write_models_config(target_path, {"models": entries, "hidden_in_chat": list(body.hidden_in_chat)})

    await asyncio.to_thread(_write)
    return ModelsConfigResponse(models=responses)
