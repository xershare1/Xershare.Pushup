"""solo_sessions: add session_id (client idempotency key), unique per user."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260401120000"
down_revision = "20260203120000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "solo_sessions",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.execute("UPDATE solo_sessions SET session_id = id WHERE session_id IS NULL")
    op.alter_column(
        "solo_sessions",
        "session_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.create_unique_constraint(
        "uq_solo_sessions_user_session",
        "solo_sessions",
        ["user_id", "session_id"],
    )
    op.create_index("ix_solo_sessions_session_id", "solo_sessions", ["session_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_solo_sessions_session_id", table_name="solo_sessions")
    op.drop_constraint("uq_solo_sessions_user_session", "solo_sessions", type_="unique")
    op.drop_column("solo_sessions", "session_id")
