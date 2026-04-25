"""Set challenges.gifted from credit ledger where a 2-credit send was recorded."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260421120000_backfill_challenge_gifted_from_ledger"
down_revision = "20260420120000_challenge_gifted"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Gift sends deduct 2 credits; `gifted` must stay in sync for opponent UI and refunds.
    op.execute(
        sa.text(
            """
            UPDATE challenges AS c
            SET gifted = true
            WHERE c.gifted = false
              AND EXISTS (
                SELECT 1
                FROM credit_transactions t
                WHERE t.reference_id = c.id
                  AND t.reference_type = 'challenge'
                  AND t.type = 'challenge_send'
                  AND t.delta = -2
              );
            """
        )
    )


def downgrade() -> None:
    # Data repair: cannot safely reverse without another source of truth.
    pass
