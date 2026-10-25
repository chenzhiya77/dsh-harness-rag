"""Layer 2 end-to-end RAGAS evaluation CLI (spec 2026-08-23 §8).

Drives the golden dataset through the **real conversation chain** (the lead
agent picks retrieval tools and writes the answer), scores the standard RAGAS
metrics plus the three architecture-specific ones, pushes scores to Langfuse
(best-effort), and writes ``ragas-report.json`` / ``ragas-report.md``.

Report-only, never a gate — there is deliberately no failure threshold:

- 0  ok (metrics may be terrible; Layer 2 never fails on quality)
- 2  usage / IO error (bad golden file, unknown kb, unknown judge model)
- 3  skipped — required API keys absent (explicit, never a fake green)

``ragas`` itself is an optional dependency: when it is not installed the
standard metrics are marked skipped in the report and the run still succeeds
(the architecture-specific metrics only need the judge LLM).

Usage (from ``backend/``):

    uv run python scripts/run_ragas_eval.py \
        --kb-id <KB_ID> --golden tests/fixtures/rag_eval/golden.jsonl --out <dir> \
        [--limit N] [--agent-model <name>] [--judge-model <name>] \
        [--environment local|ci|nightly] [--mark-baseline]

``--mark-baseline`` marks this run as the KB's baseline (completed runs only —
ignored for error/skipped runs, previous baseline stays untouched).

Model selection: the agent and the judge are deliberately separable so the
judge can be an independent model family (self-judging bias is a real failure
mode). Both name entries from ``config.yaml`` ``models:``; omitting
``--judge-model`` uses RAG's own order (``rag.judge_model`` → the RAG default →
the first configured model). A name that is not a configured entry is a usage
error: one readable line on stderr, one ``status="error"`` row, exit 2.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path

# Judge/ragas 构建提升到 ``deerflow.knowledge.eval.factory``（gateway 按需
# 完整评测共用）；此处保留旧名绑定——既有测试通过 ``cli._build_judge_llm``
# 等名字 monkeypatch，``_async_main`` 走模块全局名解析，行为不变。
from deerflow.knowledge.eval.factory import (
    DashScopeLangChainEmbeddings as _DashScopeLangChainEmbeddings,  # noqa: F401 — 既有测试 monkeypatch 该名，必须保留模块属性
)
from deerflow.knowledge.eval.factory import (
    build_judge_llm as _build_judge_llm,
)
from deerflow.knowledge.eval.factory import (
    build_ragas_evaluator as _factory_build_ragas_evaluator,
)
from deerflow.knowledge.eval.persistence import ENV_LOCAL, ENVIRONMENTS, STATUS_COMPLETED, resolve_environment
from deerflow.knowledge.model_target import is_model_not_found_error

EXIT_OK = 0
EXIT_ERROR = 2
EXIT_SKIPPED = 3


def _generate_run_id() -> str:
    """run_id for runs that never produced a report (error/skipped rows)."""

    from uuid import uuid4

    return f"ragas-{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}-{uuid4().hex[:8]}"


async def _persist_eval_run(args: argparse.Namespace, *, config=None, status: str, report=None, questions=(), environment: str = ENV_LOCAL) -> None:
    """Best-effort eval_runs persistence (spec 2026-08-24 §3.1.1).

    Every CLI run writes exactly one row — completed runs carry the mapped
    layer2_metrics, error/skipped runs record the attempt with empty metrics.
    Persistence never changes the exit code: any failure is reported as a note
    on stderr. The engine lifecycle mirrors the call site (reused when the
    evaluation path already initialized it, initialized on demand otherwise).
    """

    try:
        from deerflow.config.app_config import get_app_config
        from deerflow.knowledge.eval import persistence as eval_persistence
        from deerflow.knowledge.eval.ragas_eval import report_to_dict
        from deerflow.persistence import engine as persistence_engine

        layer2_metrics: dict = {}
        completed_at = None
        created_at = datetime.now(UTC)
        run_id = _generate_run_id()
        if report is not None:
            payload = report_to_dict(report)
            layer2_metrics = eval_persistence.layer2_metrics_from_report(payload, questions=questions)
            run_id = report.run_id  # the run's own id (ragas-<stamp>-<hex>)
            # Single clock: created_at is the report's generated_at, never the DB default.
            created_at = datetime.fromisoformat(payload["generated_at"])
            completed_at = datetime.now(UTC)

        if args.mark_baseline and status != STATUS_COMPLETED:
            # §3.1.3 completed 门控：save_eval_run 会忽略该标记，这里给运维可见的提示。
            print(f"ragas-eval note: --mark-baseline ignored for {status} run (only completed runs can become the KB baseline)", file=sys.stderr)

        own_engine = persistence_engine.get_session_factory() is None
        if own_engine:
            await persistence_engine.init_engine_from_config((config or get_app_config()).database)
        try:
            await eval_persistence.save_eval_run(
                run_id=run_id,
                kb_id=args.kb_id,
                status=status,
                created_at=created_at,
                completed_at=completed_at,
                layer2_metrics=layer2_metrics,
                environment=environment,
                mark_baseline=args.mark_baseline,
            )
        finally:
            if own_engine:
                await persistence_engine.close_engine()
    except Exception as exc:  # noqa: BLE001 — persistence must never sink a run
        print(f"ragas-eval note: eval_runs persistence skipped ({type(exc).__name__}: {exc})", file=sys.stderr)


def _persist_quietly(args: argparse.Namespace, *, status: str, environment: str = ENV_LOCAL) -> None:
    """Sync wrapper for the missing-keys skip path in ``main()`` (no event loop yet)."""

    try:
        asyncio.run(_persist_eval_run(args, status=status, environment=environment))
    except Exception as exc:  # noqa: BLE001 — e.g. already inside an event loop
        print(f"ragas-eval note: eval_runs persistence skipped ({type(exc).__name__}: {exc})", file=sys.stderr)


#: Same credential contract as the Layer 1 CLI. The judge/agent LLM key
#: resolves through config.yaml model profiles — a missing ``$VAR`` there makes
#: ``AppConfig.from_file`` raise ValueError, which ``_async_main`` maps to
#: EXIT_SKIPPED.
REQUIRED_ENV_KEYS = ("DASHSCOPE_EMBEDDING_API_KEY", "DASHSCOPE_RERANK_API_KEY")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Layer 2 end-to-end RAGAS evaluation over the golden dataset (report-only).")
    parser.add_argument("--golden", required=True, help="Path to the golden JSONL dataset.")
    parser.add_argument("--out", required=True, help="Output directory for ragas-report.json / ragas-report.md.")
    parser.add_argument("--kb-id", required=True, help="Knowledge base the golden questions were annotated against.")
    parser.add_argument("--limit", type=int, default=None, help="Evaluate only the first N questions (smoke runs).")
    parser.add_argument("--agent-model", default=None, help="Chat model for the answering agent (default: config primary model).")
    parser.add_argument(
        "--judge-model",
        default=None,
        help="Judge model: a config.yaml model name. Default: RAG's own order (rag.judge_model → the RAG default → the first configured model).",
    )
    parser.add_argument(
        "--environment",
        choices=ENVIRONMENTS,
        default=None,
        help="Run environment marker for eval_runs (default: infer — CI=true → ci, else local; nightly passes --environment nightly).",
    )
    parser.add_argument(
        "--mark-baseline",
        action="store_true",
        help="Mark this completed run as the KB's baseline in eval_runs (clears the previous marker in the same transaction; ignored for error/skipped runs).",
    )
    return parser.parse_args(argv)


def missing_required_keys(environ: Mapping[str, str]) -> list[str]:
    return [key for key in REQUIRED_ENV_KEYS if not environ.get(key)]


def _build_ragas_evaluator(judge_llm):
    """工厂薄包装：embeddings 类在调用时从本模块全局名解析——既有测试对 ``cli._DashScopeLangChainEmbeddings`` 的 monkeypatch 保持生效。"""
    return _factory_build_ragas_evaluator(judge_llm, embeddings_cls=_DashScopeLangChainEmbeddings)


async def _async_main(args: argparse.Namespace, *, environment: str = ENV_LOCAL) -> int:
    try:
        from deerflow.config.app_config import get_app_config

        config = get_app_config()
    except ValueError as exc:  # unresolved $ENV in config.yaml → missing credential
        print(f"ragas-eval skipped: {exc}")
        return EXIT_SKIPPED

    # Fail fast on bad inputs BEFORE touching the persistence engine.
    from deerflow.knowledge.eval.dataset import GoldenDatasetError, load_golden

    try:
        questions = load_golden(args.golden)
    except GoldenDatasetError as exc:
        print(f"ragas-eval error: {exc}", file=sys.stderr)
        await _persist_eval_run(args, config=config, status="error", environment=environment)
        return EXIT_ERROR
    if args.limit is not None:
        questions = questions[: args.limit]

    from deerflow.knowledge.eval.ragas_eval import build_lead_agent_runner, render_markdown, run_layer2_evaluation, write_reports
    from deerflow.knowledge.store import get_knowledge_store
    from deerflow.persistence.engine import close_engine, init_engine_from_config

    # Judge: independent from the answering agent (spec §8) — independence is a different
    # entry name, not a second connection path. It is built BEFORE the engine so a wrong
    # name fails fast; a name that is not a configured model maps to a readable error row
    # (spec 2026-09-23 D9), which is still possible here because ``_persist_eval_run``
    # initializes its own engine on demand (``:110-112``) and closes it in ``finally``
    # (``:124-126``).
    try:
        judge_llm = _build_judge_llm(args.judge_model, config=config)
    except ValueError as exc:
        # Narrow on purpose (R28⑤): only the factory's "not a configured model" sentence is
        # mapped — every other ValueError still propagates as the bug it is.
        if not is_model_not_found_error(exc):
            raise
        print(f"ragas-eval error: {exc}", file=sys.stderr)
        await _persist_eval_run(args, config=config, status="error", environment=environment)
        return EXIT_ERROR

    await init_engine_from_config(config.database)
    try:
        store = get_knowledge_store()
        kb = await store.get_kb(args.kb_id)
        if kb is None:
            print(f"ragas-eval error: knowledge base not found: {args.kb_id}", file=sys.stderr)
            await _persist_eval_run(args, config=config, status="error", environment=environment)
            return EXIT_ERROR

        from uuid import uuid4

        run_id = f"ragas-{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}-{uuid4().hex[:8]}"
        agent_runner = build_lead_agent_runner(kb_id=args.kb_id, user_id=kb["owner_id"], run_id=run_id, model_name=args.agent_model)
        report = await run_layer2_evaluation(
            questions,
            agent_runner=agent_runner,
            judge_llm=judge_llm,
            ragas_evaluator=_build_ragas_evaluator(judge_llm),
            kb_id=args.kb_id,
            run_id=run_id,
        )
        await _persist_eval_run(args, config=config, status="completed", report=report, questions=questions, environment=environment)
    finally:
        await close_engine()

    json_path, md_path = write_reports(report, Path(args.out))
    aggregate = report.aggregate
    print(render_markdown(report))
    print(f"questions={aggregate['questions']} failures={aggregate['failures']} path_accuracy={aggregate['path_accuracy']}")
    print(f"report: {json_path} · {md_path}")
    # Report-only: quality numbers never affect the exit code.
    return EXIT_OK


def _run(args: argparse.Namespace, *, environment: str = ENV_LOCAL) -> int:
    # The markdown report embeds ✅/❌ marks; Windows consoles default to GBK
    # and would crash the print with UnicodeEncodeError after the report files
    # were already written. Force UTF-8 with replacement as a safety net.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass
    return asyncio.run(_async_main(args, environment=environment))


def _load_env_files() -> None:
    """Load .env files with repo-root as fallback and backend/.env taking precedence.

    Operators reasonably put keys in either place: the repo-root .env doubles
    as the docker-compose substitution source, while backend/.env is what the
    gateway reads. ``find_dotenv`` alone stops at the nearest file, so a key
    set only in the root .env would silently not reach the CLI.
    """

    from dotenv import load_dotenv

    repo_root_env = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(repo_root_env)  # fallback: fills only unset vars
    load_dotenv(override=True)  # backend/.env wins over the root file


def main(argv: list[str] | None = None, *, environ: Mapping[str, str] | None = None) -> int:
    args = parse_args(argv)
    if environ is None:
        # Production path: pick up .env files (tests inject ``environ``
        # explicitly and never touch dotenv).
        _load_env_files()
        environ = os.environ
    environment = resolve_environment(args.environment, environ)
    missing = missing_required_keys(environ)
    if missing:
        print(f"ragas-eval skipped: missing required API keys: {', '.join(missing)} (exit {EXIT_SKIPPED} — explicit skip, not a pass)")
        _persist_quietly(args, status="skipped", environment=environment)  # 留痕：何时尝试过（best-effort）
        return EXIT_SKIPPED
    return _run(args, environment=environment)


if __name__ == "__main__":
    sys.exit(main())
