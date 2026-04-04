"""Post-payment fulfillment. Replace with a ledger/DB when ready."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def fulfill_credits(
    *,
    stripe_session_id: str,
    clerk_user_id: str | None,
    bundle_code: str | None,
    credits: int,
) -> None:
    """
    Called after Stripe verifies `checkout.session.completed`.
    Today: structured log only. Later: CreditLedger.credit(user_id, credits, stripe_session_id).
    """
    logger.info(
        "credits_fulfilled",
        extra={
            "stripe_session_id": stripe_session_id,
            "clerk_user_id": clerk_user_id,
            "bundle_code": bundle_code,
            "credits": credits,
        },
    )
    # TODO: ledger.credit(clerk_user_id, credits, idempotency_key=stripe_session_id)
    # Optional: Clerk publicMetadata bump — read-modify-write via Backend API if needed.
