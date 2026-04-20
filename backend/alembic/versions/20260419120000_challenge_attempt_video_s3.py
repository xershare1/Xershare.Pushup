"""challenge_attempts.video_s3_key for submitted challenge recordings."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260419120000"
down_revision = "20260418120000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "challenge_attempts",
        sa.Column("video_s3_key", sa.String(length=1024), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("challenge_attempts", "video_s3_key")
