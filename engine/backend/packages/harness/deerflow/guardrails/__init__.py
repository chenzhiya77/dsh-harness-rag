"""Pre-tool-call authorization middleware, loaded on first access.

``GuardrailMiddleware`` depends on the LangChain agent machinery. Keeping the
re-export lazy lets authorization adapter code import the light provider types
without pulling that stack in.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any

_EXPORTS: dict[str, str] = {
    "AllowlistProvider": "builtin",
    "GuardrailMiddleware": "middleware",
    "GuardrailDecision": "provider",
    "GuardrailProvider": "provider",
    "GuardrailReason": "provider",
    "GuardrailRequest": "provider",
}

__all__ = [
    "AllowlistProvider",
    "GuardrailDecision",
    "GuardrailMiddleware",
    "GuardrailProvider",
    "GuardrailReason",
    "GuardrailRequest",
]


def __getattr__(name: str) -> Any:
    module_name = _EXPORTS.get(name)
    if module_name is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    value = getattr(import_module(f".{module_name}", __name__), name)
    globals()[name] = value
    return value


def __dir__() -> list[str]:
    return sorted(__all__)
