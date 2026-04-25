"""challenges.gifted — pay-for-both (gift) challenges."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260420120000_challenge_gifted"
down_revision = "20260419120000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "challenges",
        sa.Column(
            "gifted",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("challenges", "gifted")
