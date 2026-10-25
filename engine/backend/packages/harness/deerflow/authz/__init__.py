"""Pluggable fine-grained authorization (resource-level RBAC and beyond).

Re-exports are lazy: ``enforcement`` and ``tool_filter`` pull LangChain tool
types, and importing a light submodule such as ``deerflow.authz.principal``
would otherwise pay for the whole chain.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any

_EXPORTS: dict[str, str] = {
    "GuardrailAuthorizationAdapter": "adapter",
    "filter_tools_by_authorization": "enforcement",
    "build_principal_from_context": "principal",
    "normalize_authz_attributes": "principal",
    "AuthorizationProvider": "provider",
    "AuthzDecision": "provider",
    "AuthzReason": "provider",
    "AuthzRequest": "provider",
    "Principal": "provider",
    "RbacAuthorizationProvider": "rbac",
    "resolve_authorization_provider": "runtime",
    "apply_tool_authorization": "tool_filter",
}

__all__ = [
    "AuthzDecision",
    "AuthzReason",
    "AuthzRequest",
    "AuthorizationProvider",
    "GuardrailAuthorizationAdapter",
    "Principal",
    "RbacAuthorizationProvider",
    "apply_tool_authorization",
    "build_principal_from_context",
    "filter_tools_by_authorization",
    "normalize_authz_attributes",
    "resolve_authorization_provider",
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
