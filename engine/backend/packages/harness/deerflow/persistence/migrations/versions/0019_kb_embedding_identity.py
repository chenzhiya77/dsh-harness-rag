"""Add ``embedding_identity`` to ``knowledge_bases``.

Revision ID: 0019_kb_embedding_identity
Revises: 77df30935788
Create Date: 2026-10-04

Per-library record of which embedding coordinate space the stored vectors live in
(spec 2026-10-04 D2): a compact JSON of ``{provider, model, base_url}`` — no api key
(its rotation changes no vector) and no width (its own axis, its own channel).

Written only where uniformity is known: a fully successful ``reindex_kb`` rebuild, or
the library's first completed document. ``NULL`` means unstamped — legacy rows and
libraries whose space is unknown or mixed stay NULL rather than claim "current" (D4
reads NULL as "no claim", never as "in sync").

Goes through ``safe_add_column`` (idempotent + drift warning); the empty-DB bootstrap
path creates it via ``create_all`` from the ORM model before this runs.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from deerflow.persistence.migrations._helpers import safe_add_column, safe_drop_column

revision: str = "0019_kb_embedding_identity"
down_revision: str | Sequence[str] | None = "77df30935788"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    safe_add_column("knowledge_bases", sa.Column("embedding_identity", sa.String(length=512), nullable=True))


def downgrade() -> None:
    safe_drop_column("knowledge_bases", "embedding_identity")
