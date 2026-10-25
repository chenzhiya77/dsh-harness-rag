"""Tool catalog package.

The catalog is built lazily so importing a concrete tool module (for example
the knowledge search implementations) does not execute ``tools.py`` and its
sandbox/MCP wiring.
"""

from __future__ import annotations

from typing import Any

__all__ = ["get_available_tools", "skill_manage_tool"]


def __getattr__(name: str) -> Any:
    if name == "get_available_tools":
        from .tools import get_available_tools

        globals()[name] = get_available_tools
        return get_available_tools
    if name == "skill_manage_tool":
        from .skill_manage_tool import skill_manage_tool

        globals()[name] = skill_manage_tool
        return skill_manage_tool
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
