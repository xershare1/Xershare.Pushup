"""solo_sessions capture_context_json for TICKET-003 analytics."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB


revision = "20260510120000_solo_capture_context_json"
down_revision = "20260428120000_voice_rep_counter_preference"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "solo_sessions",
        sa.Column(
            "capture_context_json",
            JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("solo_sessions", "capture_context_json")
