"""Add ``documents.content_hash`` column.

Revision ID: 0013_documents_content_hash
Revises: 0012_documents_path_status
Create Date: 2026-08-14

Task 11 (duplicate-upload interception): persists SHA-256 hash of file content for
duplicate detection — frontend computes hash on upload selection and compares against
existing documents in the same KB. The hash is written at upload time; legacy rows
stay NULL (no backfill required per spec).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from deerflow.persistence.migrations._helpers import safe_add_column, safe_drop_column

# revision identifiers, used by Alembic.
revision: str = "0013_documents_content_hash"
down_revision: str | Sequence[str] | None = "0012_documents_path_status"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    safe_add_column("documents", sa.Column("content_hash", sa.TEXT(), nullable=True))


def downgrade() -> None:
    safe_drop_column("documents", "content_hash")
