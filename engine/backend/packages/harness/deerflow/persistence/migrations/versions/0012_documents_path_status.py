"""Add ``documents.path_status`` column.

Revision ID: 0012_documents_path_status
Revises: 0011_knowledge
Create Date: 2026-08-12

Phase-2 batch-1 P3 (spec ``2026-08-11-rag-phase2-batch1-design.md`` §5):
persists the per-path indexing sub-status
(``{"vector": pending|indexing|done|failed, "graph": ...|degraded}``) on the
document row — the vector leg previously had no persisted completion state at
all, and the only graph signal was the coarse ``progress_percent`` plus the
``graph degraded`` error sub-marker.

The column is nullable with no server default on purpose: legacy rows stay
``NULL`` and the frontend renders no per-path hover for them (spec §5 兼容).
The wiki leg is deliberately NOT stored here — wiki generation is a
library-level triggered batch, so its sub-status is a library-wide mirror
injected at read time by the documents list endpoint.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from deerflow.persistence.migrations._helpers import safe_add_column, safe_drop_column

# revision identifiers, used by Alembic.
revision: str = "0012_documents_path_status"
down_revision: str | Sequence[str] | None = "0011_knowledge"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    safe_add_column("documents", sa.Column("path_status", sa.JSON(), nullable=True))


def downgrade() -> None:
    safe_drop_column("documents", "path_status")
