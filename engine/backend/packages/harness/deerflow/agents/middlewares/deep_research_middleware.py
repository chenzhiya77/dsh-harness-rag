"""Deep-research mode injector for the ``rag`` agent (spec §4.7).

SOUL.md carries the static dual-mode retrieval guidance; when the run context
carries ``deep_research=true`` (the frontend「深度检索」toggle), this middleware
appends the mandatory three-path instruction to the **first model call after
the user turn** — tool-loop iterations are skipped so the instruction is not
repeated. The injection rides on ``request.override(...)`` and therefore never
lands in the checkpoint (Phase-1 soft enforcement; a Phase-2 hard orchestration
would force the three paths at the tool layer instead).
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import override

from langchain.agents.middleware import AgentMiddleware
from langchain.agents.middleware.types import ModelCallResult, ModelRequest, ModelResponse
from langchain_core.messages import HumanMessage

#: Injected once per run when ``context.deep_research`` is true.
DEEP_RESEARCH_INSTRUCTION = "【深度检索模式】本轮必须同时调用 wiki_search 和 graph_search（在 hybrid_search 之外），并综合三路证据作答。若某一路返回空，如实说明，不得跳过调用。"


class DeepResearchMiddleware(AgentMiddleware):
    """Appends the deep-research instruction for ``deep_research=true`` runs."""

    def _maybe_inject(self, request: ModelRequest) -> ModelRequest:
        context = getattr(getattr(request, "runtime", None), "context", None) or {}
        if not context.get("deep_research"):
            return request
        messages = list(getattr(request, "messages", []) or [])
        # Only the first call after a user turn: mid-tool-loop calls end with a
        # ToolMessage and must not be re-injected.
        if not messages or not isinstance(messages[-1], HumanMessage):
            return request
        # hide_from_ui: model-facing plumbing — without it the run journal
        # mistakes the instruction for the user's input (first_human_message)
        # and the frontend renders it as a user bubble.
        return request.override(messages=[*messages, HumanMessage(content=DEEP_RESEARCH_INSTRUCTION, name="deep_research_mode", additional_kwargs={"hide_from_ui": True})])

    @override
    def wrap_model_call(self, request: ModelRequest, handler: Callable[[ModelRequest], ModelResponse]) -> ModelCallResult:
        return handler(self._maybe_inject(request))

    @override
    async def awrap_model_call(self, request: ModelRequest, handler: Callable[[ModelRequest], Awaitable[ModelResponse]]) -> ModelCallResult:
        return await handler(self._maybe_inject(request))
