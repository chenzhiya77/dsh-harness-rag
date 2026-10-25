"""Per-leg reasoning effort: checked legs pass their level, unchecked legs pass none (spec 2026-10-21).

Each RAG leg reads its own ``rag.<role>_reasoning_effort`` and hands it to the shared
``create_rag_chat_model`` wrapper. The level travels **only while thinking is on** — with
thinking off the entry's disable shape is the whole story, and a level sent beside it would
override that shape. ``None`` therefore means "follow the model's own default", including for
the ``dsh:`` aliases, which carry no default of their own.

The wrapper itself does no ranking: the factory reconciles the caller's level against the
entry and clamps it to the declared subset. The tests here pin both halves — the wrapper's
thinking gate and the factory's clamp, driven through its real code with a recording class.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from deerflow.config.app_config import AppConfig

SANDBOX = {"use": "deerflow.sandbox.local:LocalSandboxProvider"}

#: A thinking- and effort-capable entry. The subset stops at ``xhigh`` on purpose: the clamp
#: case asks for ``max`` and expects the nearest declared level below it.
EFFORT_ENTRY = {
    "name": "effort-entry",
    "use": "langchain_openai:ChatOpenAI",
    "model": "wire-effort",
    "base_url": "https://effort.example/v1",
    "api_key": "sk-effort",
    "supports_thinking": True,
    "supports_reasoning_effort": True,
    "supported_reasoning_efforts": ["low", "medium", "high", "xhigh"],
}

#: Declares thinking but no effort support: the factory has to drop the level.
NO_EFFORT_ENTRY = {
    **EFFORT_ENTRY,
    "name": "no-effort-entry",
    "model": "wire-no-effort",
    "supports_reasoning_effort": False,
}

#: Declares no thinking support: the wrapper presses thinking back off, and the level with it.
NO_THINKING_ENTRY = {
    **EFFORT_ENTRY,
    "name": "plain-entry",
    "model": "wire-plain",
    "supports_thinking": False,
}


def _config(models: list[dict] | None = None, rag: dict | None = None) -> AppConfig:
    return AppConfig.model_validate({"sandbox": SANDBOX, "models": models or [EFFORT_ENTRY], "rag": rag or {}})


@pytest.fixture()
def factory_capture(monkeypatch):
    """Record what every leg hands the model factory, keyword by keyword."""
    import deerflow.models.factory as models_factory

    calls: list[tuple[str | None, dict]] = []

    def _fake(name=None, **kwargs):
        calls.append((name, kwargs))
        return object()

    monkeypatch.setattr(models_factory, "create_chat_model", _fake)
    return calls


def _patch_app_config(monkeypatch, cfg):
    monkeypatch.setattr("deerflow.config.app_config.get_app_config", lambda: cfg)


def _build_extract(cfg):
    from deerflow.knowledge.graph.extractor import get_extract_llm

    return get_extract_llm(cfg)


def _build_wiki(cfg):
    from deerflow.knowledge.wiki.generator import _default_llm

    return _default_llm()


def _build_judge(cfg):
    from deerflow.knowledge.eval.factory import build_judge_llm

    return build_judge_llm(None, config=cfg)


def _build_synthesis(cfg):
    from deerflow.knowledge.eval.synthesis import _default_llm_factory

    return _default_llm_factory()


#: One distinct level per leg: swapping two call sites' fields makes exactly one case red,
#: which is what the wiring pin is for.
LEG_BUILDERS = [
    ("extract", _build_extract, "low"),
    ("wiki", _build_wiki, "medium"),
    ("judge", _build_judge, "high"),
    ("synthesis", _build_synthesis, "xhigh"),
]


# ── the wrapper's thinking gate ───────────────────────────────────────────


def test_the_wrapper_passes_the_level_while_thinking_is_on(factory_capture):
    from deerflow.knowledge.model_target import create_rag_chat_model

    cfg = _config()
    create_rag_chat_model("effort-entry", thinking=True, reasoning_effort="high", app_config=cfg)

    assert factory_capture[-1][1]["thinking_enabled"] is True
    assert factory_capture[-1][1]["reasoning_effort"] == "high"


def test_the_wrapper_sends_no_level_while_thinking_is_off(factory_capture):
    """The disable shape wins: a level beside it would override the off spelling."""
    from deerflow.knowledge.model_target import create_rag_chat_model

    cfg = _config()
    create_rag_chat_model("effort-entry", thinking=False, reasoning_effort="high", app_config=cfg)

    assert factory_capture[-1][1]["thinking_enabled"] is False
    assert "reasoning_effort" not in factory_capture[-1][1]


def test_the_wrapper_sends_no_level_when_the_entry_cannot_think(factory_capture, caplog):
    """Ordering pin: the thinking gate runs first, and the level falls with it."""
    import logging

    from deerflow.knowledge.model_target import create_rag_chat_model

    cfg = _config(models=[NO_THINKING_ENTRY])
    with caplog.at_level(logging.WARNING):
        create_rag_chat_model("plain-entry", thinking=True, reasoning_effort="high", app_config=cfg)

    assert factory_capture[-1][1]["thinking_enabled"] is False
    assert "reasoning_effort" not in factory_capture[-1][1]
    assert "does not support" in caplog.text


def test_the_wrapper_sends_no_level_when_the_leg_follows(factory_capture):
    from deerflow.knowledge.model_target import create_rag_chat_model

    cfg = _config()
    create_rag_chat_model("effort-entry", thinking=True, reasoning_effort=None, app_config=cfg)

    assert factory_capture[-1][1]["thinking_enabled"] is True
    assert "reasoning_effort" not in factory_capture[-1][1]


# ── the five construction sites ───────────────────────────────────────────


@pytest.mark.parametrize("role, build, level", LEG_BUILDERS, ids=[row[0] for row in LEG_BUILDERS])
def test_each_checked_leg_passes_its_own_level(role: str, build, level: str, factory_capture, monkeypatch):
    cfg = _config(rag={f"{role}_thinking": True, f"{role}_reasoning_effort": level})
    _patch_app_config(monkeypatch, cfg)

    build(cfg)

    assert factory_capture[-1][1]["thinking_enabled"] is True
    assert factory_capture[-1][1]["reasoning_effort"] == level


@pytest.mark.parametrize("role, build, level", LEG_BUILDERS, ids=[row[0] for row in LEG_BUILDERS])
def test_an_unchecked_leg_passes_no_level_even_when_one_is_stored(role: str, build, level: str, factory_capture, monkeypatch):
    """A stored level is inert while the leg is off — it is not a hidden second switch."""
    cfg = _config(rag={f"{role}_thinking": False, f"{role}_reasoning_effort": level})
    _patch_app_config(monkeypatch, cfg)

    build(cfg)

    assert factory_capture[-1][1]["thinking_enabled"] is False
    assert "reasoning_effort" not in factory_capture[-1][1]


@pytest.mark.asyncio
async def test_the_checked_wiki_worker_passes_the_wiki_level(factory_capture, monkeypatch):
    """The worker's inline construction site is the wiki leg's second door."""
    from deerflow.knowledge import worker as worker_module

    cfg = _config(rag={"wiki_thinking": True, "wiki_reasoning_effort": "max"})
    _patch_app_config(monkeypatch, cfg)

    async def _ready(*args, **kwargs):
        return True

    async def _no_generate(*args, **kwargs):
        return None

    async def _no_entries(*args, **kwargs):
        return []

    monkeypatch.setattr(worker_module, "wiki_trigger_ready", _ready)
    monkeypatch.setattr(worker_module, "generate_wiki", _no_generate)
    stub = SimpleNamespace(_main_llm=None, _wiki_store=SimpleNamespace(list_entries=_no_entries), _store=None, _graph_store=None, _vector_store=None)

    await worker_module.KnowledgeIndexWorker._maybe_generate_wiki(stub, "kb-1", None)

    assert factory_capture[-1][1]["thinking_enabled"] is True
    assert factory_capture[-1][1]["reasoning_effort"] == "max"


# ── the factory's half: clamp and drop, through its real code ─────────────


class _Recorder:
    """Stands in for the provider client; the factory only has to be able to call it."""

    model_fields: dict = {}

    def __init__(self, **kwargs):
        self.kwargs = kwargs


def _real_factory(monkeypatch):
    """Drive ``create_chat_model`` itself with the provider class replaced by a recorder."""
    import deerflow.models.factory as models_factory

    monkeypatch.setattr(models_factory, "resolve_class", lambda _path, _base: _Recorder)
    return models_factory.create_chat_model


def _build_real(name: str, cfg: AppConfig, *, thinking: bool, effort: str | None):
    from deerflow.knowledge.model_target import create_rag_chat_model

    return create_rag_chat_model(name, thinking=thinking, reasoning_effort=effort, app_config=cfg)


def test_the_factory_clamps_an_outside_subset_level_to_the_nearest_below(monkeypatch, caplog):
    """``max`` on an entry declaring up to ``xhigh`` travels as ``xhigh``, with a warning."""
    import logging

    create_chat_model = _real_factory(monkeypatch)
    cfg = _config()

    with caplog.at_level(logging.WARNING):
        instance = create_chat_model("effort-entry", thinking_enabled=True, app_config=cfg, reasoning_effort="max")

    assert instance.kwargs["reasoning_effort"] == "xhigh"
    assert "max" in caplog.text and "xhigh" in caplog.text


def test_the_factory_drops_the_level_when_the_entry_declares_no_effort_support(monkeypatch):
    create_chat_model = _real_factory(monkeypatch)
    cfg = _config(models=[NO_EFFORT_ENTRY])

    instance = create_chat_model("no-effort-entry", thinking_enabled=True, app_config=cfg, reasoning_effort="high")

    assert "reasoning_effort" not in instance.kwargs
