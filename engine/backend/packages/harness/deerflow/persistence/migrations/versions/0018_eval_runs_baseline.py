"""Add ``is_baseline`` + ``environment`` to ``eval_runs``.

Revision ID: 0018_eval_runs_baseline
Revises: 0017_eval_runs_table
Create Date: 2026-08-24

RAG evaluation metrics visualization (spec 2026-08-24 §3.1.1 v3 / §3.1.3, plan
Task 0c):

- ``is_baseline`` Boolean NOT NULL DEFAULT false — marks the KB's current
  baseline run; the trend API's threshold line reads it and
  ``--baseline auto`` diffs against it. At most one marked row per KB,
  backstopped by the partial unique index ``uq_eval_runs_kb_baseline``
  (``sqlite_where`` + ``postgresql_where`` both declared, so the constraint
  survives a future PostgreSQL migration).
- ``environment`` String(16) NOT NULL DEFAULT 'local' — ``local`` / ``ci`` /
  ``nightly``; legacy rows backfill to ``local``. CI runs stay out of the
  default latest/trend read sets.

Both columns go through ``safe_add_column`` (idempotent + drift warning); the
index uses the existing inspect-guard pattern (see 0004/0007) because the
empty-DB bootstrap path creates it via ``create_all`` from the ORM
``__table_args__`` before stamping head.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from deerflow.persistence.migrations._helpers import safe_add_column, safe_drop_column

revision: str = "0018_eval_runs_baseline"
down_revision: str | Sequence[str] | None = "0017_eval_runs_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_BASELINE_INDEX = "uq_eval_runs_kb_baseline"


def upgrade() -> None:
    safe_add_column(
        "eval_runs",
        sa.Column("is_baseline", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    safe_add_column(
        "eval_runs",
        sa.Column("environment", sa.String(length=16), nullable=False, server_default=sa.text("'local'")),
    )

    # Idempotent index creation: the legacy/empty bootstrap path runs
    # create_all (which creates the index from the ORM __table_args__) before
    # upgrade head, so the migration must not fail when the index already
    # exists.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("eval_runs"):
        return
    existing = {ix["name"] for ix in inspector.get_indexes("eval_runs")}
    if _BASELINE_INDEX not in existing:
        with op.batch_alter_table("eval_runs", schema=None) as batch_op:
            batch_op.create_index(
                _BASELINE_INDEX,
                ["kb_id"],
                unique=True,
                sqlite_where=sa.text("is_baseline = true"),
                postgresql_where=sa.text("is_baseline = true"),
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("eval_runs"):
        existing = {ix["name"] for ix in inspector.get_indexes("eval_runs")}
        if _BASELINE_INDEX in existing:
            with op.batch_alter_table("eval_runs", schema=None) as batch_op:
                batch_op.drop_index(_BASELINE_INDEX)

    safe_drop_column("eval_runs", "is_baseline")
    safe_drop_column("eval_runs", "environment")
