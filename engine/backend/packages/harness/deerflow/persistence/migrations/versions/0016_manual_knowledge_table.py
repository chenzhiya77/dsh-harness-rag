"""Create the ``manual_knowledge`` table.

Revision ID: 0016_manual_knowledge_table
Revises: 0015_chunk_last_edited_at
Create Date: 2026-08-15

Phase-3 Batch-1 (P6, spec §8): user-managed knowledge cards — a manual channel
alongside the AI-generated wiki entries. Cards never auto-regenerate and never
get disqualified; each carries an ``include_in_wiki_search`` toggle (default
off) that opts it into the wiki retrieval path's shared top_k pool (Task 8).

Shape:
- Table: manual_knowledge (id PK, kb_id indexed, owner_id, title, content,
  include_in_wiki_search, tags JSON, created_at/updated_at)
- Idempotent: skips creation when full-metadata create_all already provisioned
  the table (same guard as 0011_knowledge).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0016_manual_knowledge_table"
down_revision: str | Sequence[str] | None = "0015_chunk_last_edited_at"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("manual_knowledge"):
        # Idempotent: a DB whose full-metadata create_all already provisioned
        # the table must not have it re-created here.
        return

    op.create_table(
        "manual_knowledge",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("kb_id", sa.String(length=64), nullable=False),
        sa.Column("owner_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("include_in_wiki_search", sa.Boolean(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("manual_knowledge", schema=None) as batch_op:
        batch_op.create_index("ix_manual_knowledge_kb_id", ["kb_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("manual_knowledge", schema=None) as batch_op:
        batch_op.drop_index("ix_manual_knowledge_kb_id")
    op.drop_table("manual_knowledge")
