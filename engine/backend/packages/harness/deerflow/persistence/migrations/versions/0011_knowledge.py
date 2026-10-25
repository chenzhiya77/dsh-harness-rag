"""RAG knowledge-base tables.

Six tables backing the Phase-1 RAG knowledge base (spec §3.2–§3.5):
knowledge_bases, documents, chunks, graph_entities, graph_relations,
wiki_entries.

Revision ID: 0011_knowledge
Revises: 0010_run_cancel_request
Create Date: 2026-08-09
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011_knowledge"
down_revision: str | Sequence[str] | None = "0010_run_cancel_request"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("knowledge_bases"):
        # Idempotent: a DB whose full-metadata create_all already provisioned
        # the knowledge tables must not have them re-created here.
        return

    op.create_table(
        "knowledge_bases",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("owner_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("visibility", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("knowledge_bases", schema=None) as batch_op:
        batch_op.create_index("ix_knowledge_bases_owner_id", ["owner_id"], unique=False)

    op.create_table(
        "documents",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("kb_id", sa.String(length=64), nullable=False),
        sa.Column("uploader_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.String(length=1024), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("progress_percent", sa.Integer(), nullable=False),
        sa.Column("chunk_count", sa.Integer(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("documents", schema=None) as batch_op:
        batch_op.create_index("ix_documents_kb_id", ["kb_id"], unique=False)
        batch_op.create_index("ix_documents_status", ["status"], unique=False)

    op.create_table(
        "chunks",
        sa.Column("chunk_id", sa.String(length=160), nullable=False),
        sa.Column("doc_id", sa.String(length=64), nullable=False),
        sa.Column("kb_id", sa.String(length=64), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("heading_path", sa.JSON(), nullable=False),
        sa.Column("page", sa.Integer(), nullable=True),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("entities", sa.JSON(), nullable=False),
        sa.Column("extract_status", sa.String(length=16), nullable=False),
        sa.Column("extract_error", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("chunk_id"),
    )
    with op.batch_alter_table("chunks", schema=None) as batch_op:
        batch_op.create_index("ix_chunks_doc_id", ["doc_id"], unique=False)
        batch_op.create_index("ix_chunks_kb_id", ["kb_id"], unique=False)
        batch_op.create_index("ix_chunks_extract_status", ["extract_status"], unique=False)

    op.create_table(
        "graph_entities",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("kb_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source_chunk_ids", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("kb_id", "name", name="uq_graph_entities_kb_name"),
    )
    with op.batch_alter_table("graph_entities", schema=None) as batch_op:
        batch_op.create_index("ix_graph_entities_kb_id", ["kb_id"], unique=False)

    op.create_table(
        "graph_relations",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("kb_id", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=False),
        sa.Column("target", sa.String(length=255), nullable=False),
        sa.Column("relation", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source_chunk_ids", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("graph_relations", schema=None) as batch_op:
        batch_op.create_index("ix_graph_relations_kb_id", ["kb_id"], unique=False)

    op.create_table(
        "wiki_entries",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("kb_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("source_chunk_ids", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("wiki_entries", schema=None) as batch_op:
        batch_op.create_index("ix_wiki_entries_kb_id", ["kb_id"], unique=False)
        batch_op.create_index("ix_wiki_entries_status", ["status"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("wiki_entries", schema=None) as batch_op:
        batch_op.drop_index("ix_wiki_entries_status")
        batch_op.drop_index("ix_wiki_entries_kb_id")
    op.drop_table("wiki_entries")

    with op.batch_alter_table("graph_relations", schema=None) as batch_op:
        batch_op.drop_index("ix_graph_relations_kb_id")
    op.drop_table("graph_relations")

    with op.batch_alter_table("graph_entities", schema=None) as batch_op:
        batch_op.drop_index("ix_graph_entities_kb_id")
    op.drop_table("graph_entities")

    with op.batch_alter_table("chunks", schema=None) as batch_op:
        batch_op.drop_index("ix_chunks_extract_status")
        batch_op.drop_index("ix_chunks_kb_id")
        batch_op.drop_index("ix_chunks_doc_id")
    op.drop_table("chunks")

    with op.batch_alter_table("documents", schema=None) as batch_op:
        batch_op.drop_index("ix_documents_status")
        batch_op.drop_index("ix_documents_kb_id")
    op.drop_table("documents")

    with op.batch_alter_table("knowledge_bases", schema=None) as batch_op:
        batch_op.drop_index("ix_knowledge_bases_owner_id")
    op.drop_table("knowledge_bases")
