"""Challenge expires_at + idempotency_key for safe create deduplication."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260202120000"
down_revision = "20260201120000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "challenges",
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "challenges",
        sa.Column("idempotency_key", sa.String(length=128), nullable=True),
    )
    op.create_index(
        "ix_challenges_initiator_idempotency",
        "challenges",
        ["initiator_clerk_user_id", "idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_challenges_initiator_idempotency", table_name="challenges")
    op.drop_column("challenges", "idempotency_key")
    op.drop_column("challenges", "expires_at")
