"""Add ``wiki_entries.supplement_content`` column.

Revision ID: 0014_wiki_supplement_content
Revises: 0013_documents_content_hash
Create Date: 2026-08-15

Phase-3 Batch-1 (P1): add supplement layer to Wiki entries for dual-mode editing,
enabling user annotations that persist across dirty regeneration cycles. The main
content area remains subject to LLM re-generation while the supplement layer is
preserved as user-owned annotations and passed as reference material during updates.

Shape:
- Column: wiki_entries.s supplement_content TEXT NULL (nullable, no server default)
- Old rows read NULL (backward compatible)
- Migration follows safe_add_column pattern (same as Task 11)
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from deerflow.persistence.migrations._helpers import safe_add_column, safe_drop_column

# revision identifiers, used by Alembic.
revision: str = "0014_wiki_supplement_content"
down_revision: str | Sequence[str] | None = "0013_documents_content_hash"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    safe_add_column("wiki_entries", sa.Column("supplement_content", sa.TEXT(), nullable=True))


def downgrade() -> None:
    safe_drop_column("wiki_entries", "supplement_content")
