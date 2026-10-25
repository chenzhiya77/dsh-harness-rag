"""API-writable model configuration (``models_config.json``).

This module backs the web "Models" settings surface (spec 2026-09-10 §5). It is
the model-config counterpart of :mod:`deerflow.config.extensions_config`: a
*separate*, runtime-writable file that is merged into ``AppConfig.models`` at
load time, while ``config.yaml`` remains the operator-trusted source (it also
carries code-executing ``plugins:`` / ``extensions.middlewares`` and is
deliberately never written through Gateway APIs).

Security note (spec §5.3): the web UI never accepts a free-text ``use:`` class
path (a dynamic-import / code-execution boundary, same class as ``plugins:``).
It submits a curated *provider id*; :data:`PROVIDER_ALLOWLIST` maps that id to a
fixed ``use:`` class path and the correct endpoint key, and anything outside the
allowlist is rejected by the API layer.
"""

from __future__ import annotations

import json
import logging
import os
import stat
import tempfile
import threading
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from deerflow.config.model_config import ModelConfig
from deerflow.config.runtime_paths import existing_project_file

logger = logging.getLogger(__name__)

#: Sentinel echoed by read endpoints in place of a real api_key, and accepted on
#: write to mean "keep the stored key unchanged" (spec §5.4). Mirrors the channel
#: credentials masking convention.
MASKED_API_KEY = "********"

#: Curated provider allowlist (spec §5.3): provider id -> (use class path,
#: endpoint key). The endpoint key differs per adapter: ``PatchedChatDeepSeek``
#: declares ``api_base`` as its canonical endpoint field (see
#: ``models/factory._declares_api_base``), while OpenAI-compatible and Anthropic
#: clients take ``base_url``. The OpenAI-compatible cell defaults to the replaying
#: client (spec 2026-09-22): it captures the non-standard reasoning fields an
#: endpoint emits and echoes the wire name it actually used back on later turns.
PROVIDER_ALLOWLIST: dict[str, tuple[str, str]] = {
    "openai-compatible": ("deerflow.models.reasoning_replay:ReasoningReplayChatOpenAI", "base_url"),
    "anthropic": ("langchain_anthropic:ChatAnthropic", "base_url"),
    "deepseek": ("deerflow.models.patched_deepseek:PatchedChatDeepSeek", "api_base"),
}

#: The class the OpenAI-compatible cell used before the default swap. Kept so a
#: hand-written entry (``config.yaml``, or a ``models_config.json`` edited by hand)
#: still reports its provider to ``/api/models`` and keeps the caption dialect it
#: always had.
_LEGACY_USE_TO_PROVIDER: dict[str, str] = {"langchain_openai:ChatOpenAI": "openai-compatible"}

_USE_TO_PROVIDER: dict[str, str] = {use: provider for provider, (use, _endpoint) in PROVIDER_ALLOWLIST.items()}


def resolve_provider_use(provider: str) -> str | None:
    """Return the fixed ``use:`` class path for an allowlisted provider id, else ``None``."""
    entry = PROVIDER_ALLOWLIST.get(provider)
    return entry[0] if entry else None


def endpoint_key_for(provider: str) -> str | None:
    """Return the endpoint field name (``base_url`` / ``api_base``) for a provider id, else ``None``."""
    entry = PROVIDER_ALLOWLIST.get(provider)
    return entry[1] if entry else None


def reverse_lookup_provider(use: str) -> str | None:
    """Map a stored ``use:`` class path back to its provider id; ``None`` when not allowlisted."""
    return _USE_TO_PROVIDER.get(use) or _LEGACY_USE_TO_PROVIDER.get(use)


def _normalize_legacy_use(entry: Any) -> Any:
    """Point an entry still on the pre-swap OpenAI-compatible class at the new one.

    Applied in memory while loading the UI file, so entries written before the
    default swap pick up replay without being edited by hand; the file on disk is
    rewritten the next time the settings UI saves. Entries from ``config.yaml``
    never come through here (``merge_ui_models`` passes them straight through), so
    a hand-written ``use:`` stays exactly as the operator wrote it.
    """
    if not isinstance(entry, dict) or entry.get("use") not in _LEGACY_USE_TO_PROVIDER:
        return entry
    replacement = resolve_provider_use(_LEGACY_USE_TO_PROVIDER[entry["use"]])
    if replacement is None or replacement == entry["use"]:
        return entry
    logger.info("Upgrading model %s from the legacy OpenAI-compatible client to %s", entry.get("name", "<unnamed>"), replacement)
    return {**entry, "use": replacement}


def preserve_api_key(submitted: str, stored: str) -> str:
    """Resolve a submitted api_key against the stored one, honoring the masking sentinel."""
    return stored if submitted == MASKED_API_KEY else submitted


class ModelsConfig(BaseModel):
    """The UI-managed model set persisted in ``models_config.json``."""

    models: list[ModelConfig] = Field(default_factory=list, description="Models added/edited through the web settings UI.")
    hidden_in_chat: list[str] = Field(
        default_factory=list,
        description="Model names hidden from the chat model pickers (display filter only). Written wholesale by the settings PUT: omitting the key on write clears the list.",
    )

    @classmethod
    def resolve_config_path(cls, config_path: str | None = None) -> Path | None:
        """Resolve the models config file path.

        Priority: explicit argument, then ``DEER_FLOW_MODELS_CONFIG_PATH``, then a
        project-root / legacy search. An explicit argument or set env var is an
        operator assertion, so a missing file there raises ``FileNotFoundError``;
        the fallback search returns ``None`` (the file is optional — most
        deployments configure models only in ``config.yaml``).
        """
        if config_path:
            path = Path(config_path)
            if not path.exists():
                raise FileNotFoundError(f"Models config file specified by param `config_path` not found at {path}")
            return path
        elif env_path := os.getenv("DEER_FLOW_MODELS_CONFIG_PATH"):
            path = Path(env_path)
            if not path.exists():
                raise FileNotFoundError(f"Models config file specified by environment variable `DEER_FLOW_MODELS_CONFIG_PATH` not found at {path}")
            return path
        else:
            project_config = existing_project_file(("models_config.json",))
            if project_config is not None:
                return project_config

            backend_dir = Path(__file__).resolve().parents[4]
            repo_root = backend_dir.parent
            for candidate in (backend_dir / "models_config.json", repo_root / "models_config.json"):
                if candidate.exists():
                    return candidate
            return None

    @classmethod
    def resolve_env_variables(cls, config: Any) -> Any:
        """Recursively resolve ``$ENV_VAR`` references, mirroring ``config.yaml`` semantics.

        Unlike ``extensions_config`` (which blanks unresolved vars so MCP servers
        never see a literal ``$VAR``), an unresolved reference here raises, matching
        ``AppConfig.resolve_env_variables``: models are core config and a missing
        key should fail loudly rather than silently authenticate as empty.
        """
        if isinstance(config, str):
            if not config.startswith("$"):
                return config
            env_value = os.getenv(config[1:])
            if env_value is None:
                raise ValueError(f"Environment variable {config[1:]} not found for config value {config}")
            return env_value
        elif isinstance(config, dict):
            return {k: cls.resolve_env_variables(v) for k, v in config.items()}
        elif isinstance(config, list):
            return [cls.resolve_env_variables(item) for item in config]
        return config

    @classmethod
    def from_file(cls, config_path: str | None = None) -> ModelsConfig:
        """Load the UI-managed models from ``models_config.json``.

        Returns an empty config when the file does not exist (optional). Raises a
        clear ``ValueError`` for malformed JSON or entries that fail ``ModelConfig``
        validation so a bad UI write surfaces at load rather than as a silent drop.
        """
        resolved_path = cls.resolve_config_path(config_path)
        if resolved_path is None:
            return cls(models=[])
        try:
            with open(resolved_path, encoding="utf-8") as f:
                raw = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Models config file at {resolved_path} is not valid JSON: {e}") from e
        if raw is None:
            raw = {}
        if not isinstance(raw, dict):
            raise ValueError(f"Models config file at {resolved_path} must be a JSON object with a `models` list")
        try:
            resolved_models = cls.resolve_env_variables(raw.get("models") or [])
            normalized_models = [_normalize_legacy_use(entry) for entry in resolved_models] if isinstance(resolved_models, list) else resolved_models
            # The top-level `hidden_in_chat` list must be passed explicitly: this rebuilt
            # validation dict is what the model sees, so an unlisted key would be dropped
            # on load (a list that writes but never reads back).
            payload: dict[str, Any] = {"models": normalized_models}
            if "hidden_in_chat" in raw:
                payload["hidden_in_chat"] = raw["hidden_in_chat"]
            return cls.model_validate(payload)
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Models config file at {resolved_path} is invalid: {e}") from e


def merge_ui_models(yaml_models: list[dict], ui: ModelsConfig) -> list[dict]:
    """Union ``config.yaml`` models with UI-managed models, UI winning on name collision.

    The UI version replaces the ``config.yaml`` entry *in place* so the merged
    list's first occurrence of a collided name is the UI one (``AppConfig``'s
    name index keeps the first match).
    """
    merged: list[dict] = [dict(m) for m in yaml_models if isinstance(m, dict)]
    index: dict[str, int] = {}
    for position, entry in enumerate(merged):
        name = entry.get("name")
        if isinstance(name, str):
            index.setdefault(name, position)
    for ui_model in ui.models:
        dumped = ui_model.model_dump()
        name = dumped["name"]
        if name in index:
            merged[index[name]] = dumped
        else:
            index[name] = len(merged)
            merged.append(dumped)
    return merged


def _fsync_directory_best_effort(directory: Path) -> None:
    try:
        directory_fd = os.open(directory, os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(directory_fd)
    except OSError:
        logger.debug("Could not fsync models config directory: %s", directory, exc_info=True)
    finally:
        try:
            os.close(directory_fd)
        except OSError:
            logger.debug("Could not close models config directory fd: %s", directory, exc_info=True)


def atomic_write_models_config(path: Path, data: dict[str, Any]) -> None:
    """Write models config without exposing a truncated or partial file.

    Mirrors ``atomic_write_extensions_config``: temp file in the target directory,
    fsync, ``os.replace``, best-effort directory fsync, temp cleanup on failure.
    """
    path = Path(path)
    target_path = path.resolve(strict=False) if path.is_symlink() else path
    target_path.parent.mkdir(parents=True, exist_ok=True)

    existing_mode: int | None = None
    try:
        existing_mode = stat.S_IMODE(target_path.stat().st_mode)
    except FileNotFoundError:
        pass

    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=target_path.parent,
            prefix=f".{target_path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            json.dump(data, temporary_file, indent=2)
            if existing_mode is not None:
                temporary_path.chmod(existing_mode)
            temporary_file.flush()
            os.fsync(temporary_file.fileno())

        os.replace(temporary_path, target_path)
        _fsync_directory_best_effort(target_path.parent)
    finally:
        if temporary_path is not None:
            try:
                temporary_path.unlink(missing_ok=True)
            except OSError:
                logger.warning("Could not remove temporary models config file: %s", temporary_path, exc_info=True)


#: Serializes read-modify-write cycles on ``models_config.json`` across writers
#: (the models management API). Same rationale as ``extensions_config_write_lock``:
#: a ``threading.Lock`` owned *inside* the worker performing the RMW, so it stays
#: held across the write and reload and has no event-loop affinity.
models_config_write_lock = threading.Lock()
