"""Manual credit adjustments by allowlisted admins — auditable ledger rows."""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.billing.user_service import get_or_create_user_by_clerk_id
from app.db.models.credit_account import CreditAccount
from app.db.models.credit_transaction import CreditTransaction

logger = logging.getLogger(__name__)

_MAX_ABS_DELTA = 10_000


def admin_adjust_credits(
    session: Session,
    *,
    target_clerk_user_id: str,
    delta: int,
    actor_clerk_user_id: str,
    reason: str,
) -> int:
    """
    Apply a credit delta to the target user. ``reason`` is stored on the ledger row (truncated).
    Returns the new balance.
    """
    target = (target_clerk_user_id or "").strip()
    if not target:
        raise ValueError("target_clerk_user_id is required.")
    if delta == 0:
        raise ValueError("delta must be non-zero.")
    if abs(delta) > _MAX_ABS_DELTA:
        raise ValueError(f"delta must be between -{_MAX_ABS_DELTA} and {_MAX_ABS_DELTA}.")

    actor = (actor_clerk_user_id or "").strip()
    reason_clean = (reason or "").strip() or "admin"
    if len(reason_clean) > 200:
        reason_clean = reason_clean[:200]

    user_uuid = get_or_create_user_by_clerk_id(session, target)

    acct = session.scalars(select(CreditAccount).where(CreditAccount.user_id == user_uuid)).first()
    if acct is None:
        acct = CreditAccount(user_id=user_uuid, balance=0)
        session.add(acct)
        session.flush()

    new_balance = acct.balance + delta
    if new_balance < 0:
        raise ValueError("Adjustment would make credit balance negative.")

    tx_id = uuid.uuid4()
    idem = f"admin:{actor}:{tx_id}"
    acct.balance = new_balance
    session.add(
        CreditTransaction(
            id=tx_id,
            account_id=acct.id,
            delta=delta,
            balance_after=new_balance,
            type="admin_adj",
            reference_type="admin",
            reference_id=f"{actor}:{reason_clean}",
            idempotency_key=idem,
        )
    )
    session.flush()

    logger.info(
        "admin_credits_adjusted",
        extra={
            "actor_clerk_user_id": actor,
            "target_clerk_user_id": target,
            "delta": delta,
            "balance_after": new_balance,
            "reason": reason_clean,
        },
    )
    return new_balance
