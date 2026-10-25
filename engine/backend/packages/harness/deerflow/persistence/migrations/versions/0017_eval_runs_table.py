"""Create the ``eval_runs`` table.

Revision ID: 0017_eval_runs_table
Revises: 0016_manual_knowledge_table
Create Date: 2026-08-24

RAG evaluation metrics visualization (spec 2026-08-24): persists evaluation run
results (Layer 1 + Layer 2 metrics) for trend analysis and historical comparison.

Shape:
- Table: eval_runs (id PK, kb_id indexed, status, layer1_metrics JSON,
  layer2_metrics JSON, created_at, completed_at nullable, langfuse_trace_url
  nullable, baseline_diff JSON nullable)
- Idempotent: skips creation when full-metadata create_all already provisioned
  the table (same guard as 0011_knowledge).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0017_eval_runs_table"
down_revision: str | Sequence[str] | None = "0016_manual_knowledge_table"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("eval_runs"):
        # Idempotent: a DB whose full-metadata create_all already provisioned
        # the table must not have it re-created here.
        return

    op.create_table(
        "eval_runs",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("kb_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("layer1_metrics", sa.JSON(), nullable=False),
        sa.Column("layer2_metrics", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("langfuse_trace_url", sa.String(length=512), nullable=True),
        sa.Column("baseline_diff", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("eval_runs", schema=None) as batch_op:
        batch_op.create_index("ix_eval_runs_kb_id", ["kb_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("eval_runs", schema=None) as batch_op:
        batch_op.drop_index("ix_eval_runs_kb_id")
    op.drop_table("eval_runs")
