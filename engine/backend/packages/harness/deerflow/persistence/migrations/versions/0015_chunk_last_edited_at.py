"""Add ``chunks.last_edited_at`` column.

Revision ID: 0015_chunk_last_edited_at
Revises: 0014_wiki_supplement_content
Create Date: 2026-08-15

Phase-3 Batch-1 (P2): add last_edited_at timestamp to chunks for slice text editing.
Tracks when a chunk was manually edited via the PATCH endpoint, enabling audit
trails and distinguishing user-edited content from auto-generated embeddings.

Shape:
- Column: chunks.last_edited_at TIMESTAMP NULL (nullable, no server default)
- Old rows read NULL (backward compatible)
- Migration follows safe_add_column pattern (same as Task 11, 14)
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from deerflow.persistence.migrations._helpers import safe_add_column, safe_drop_column

# revision identifiers, used by Alembic.
revision: str = "0015_chunk_last_edited_at"
down_revision: str | Sequence[str] | None = "0014_wiki_supplement_content"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    safe_add_column("chunks", sa.Column("last_edited_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    safe_drop_column("chunks", "last_edited_at")
