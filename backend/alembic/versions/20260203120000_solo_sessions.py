"""solo_sessions — reps + optional ephemeral video."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260203120000"
down_revision = "20260202120000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "solo_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reps", sa.Integer(), nullable=False),
        sa.Column("video_s3_key", sa.String(length=1024), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_solo_sessions_user_id", "solo_sessions", ["user_id"], unique=False)
    op.create_index("ix_solo_sessions_expires_at", "solo_sessions", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_solo_sessions_expires_at", table_name="solo_sessions")
    op.drop_index("ix_solo_sessions_user_id", table_name="solo_sessions")
    op.drop_table("solo_sessions")
