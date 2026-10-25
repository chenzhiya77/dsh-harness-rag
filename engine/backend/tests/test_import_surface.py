"""Regression pins for the knowledge service's startup import surface.

The heavy agent modules must stay out of the minimal entrypoint: importing any
``deerflow.*`` submodule executes its package initializer, so an eager re-export
in ``deerflow.runtime`` or ``deerflow.tools`` silently pulls the whole agent
stack back in.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def test_knowledge_app_does_not_load_agent_surface() -> None:
    script = """
import sys
import app.gateway.knowledge_app

heavy = {
    "deerflow.runtime.runs",
    "deerflow.runtime.stream_bridge",
    "deerflow.tools.tools",
    "deerflow.tools.builtins.graph_search_tool",
    "deerflow.tools.builtins.hybrid_search_tool",
    "deerflow.tools.builtins.wiki_search_tool",
    "deerflow.agents.lead_agent.agent",
    "deerflow.guardrails.middleware",
    "deerflow.extensions.loader",
}
print("\\n".join(sorted(heavy & set(sys.modules))))
"""
    result = subprocess.run(
        [sys.executable, "-c", script],
        cwd=BACKEND_ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "", f"heavy modules imported: {result.stdout.strip()}"


def test_lazy_reexports_still_resolve() -> None:
    from deerflow.config.extension_spec import ExtensionSpec as ConfigExtensionSpec
    from deerflow.extensions.loader import ExtensionSpec as LoaderExtensionSpec
    from deerflow.runtime import RunManager
    from deerflow.tools import get_available_tools
    from deerflow.tools.builtins import hybrid_search

    assert RunManager is not None
    assert callable(get_available_tools)
    assert hybrid_search is not None
    assert LoaderExtensionSpec is ConfigExtensionSpec
