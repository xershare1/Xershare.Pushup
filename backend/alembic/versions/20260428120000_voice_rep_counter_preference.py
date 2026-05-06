"""Add users.voice_rep_counter_enabled (default off)."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260428120000_voice_rep_counter_preference"
down_revision = "20260421120000_backfill_challenge_gifted_from_ledger"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "voice_rep_counter_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "voice_rep_counter_enabled")
