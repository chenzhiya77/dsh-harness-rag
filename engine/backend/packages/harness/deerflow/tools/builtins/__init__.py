"""Built-in agent tools, loaded on first access.

Importing ``deerflow.tools.builtins.<module>`` normally executes this
initializer first; eager imports here would pull every built-in (and the
sandbox/MCP stack some of them need) into processes that use one tool.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any

_EXPORTS: dict[str, str] = {
    "ask_clarification_tool": "clarification_tool",
    "graph_search": "graph_search_tool",
    "hybrid_search": "hybrid_search_tool",
    "list_uploaded_files": "list_uploaded_files_tool",
    "present_file_tool": "present_file_tool",
    "review_skill_package": "review_skill_package_tool",
    "setup_agent": "setup_agent_tool",
    "task_tool": "task_tool",
    "update_agent": "update_agent_tool",
    "view_image_tool": "view_image_tool",
    "list_wiki_entries": "wiki_entries_tool",
    "wiki_search": "wiki_search_tool",
}

__all__ = [
    "setup_agent",
    "update_agent",
    "present_file_tool",
    "review_skill_package",
    "ask_clarification_tool",
    "view_image_tool",
    "task_tool",
    "list_uploaded_files",
    "hybrid_search",
    "wiki_search",
    "graph_search",
    "list_wiki_entries",
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
