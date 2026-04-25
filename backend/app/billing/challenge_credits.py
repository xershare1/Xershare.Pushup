"""Credits for head-to-head challenges: send, opponent accept, refunds on proposed terminal."""

from __future__ import annotations

import logging
import uuid
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.billing.user_service import get_or_create_user_by_clerk_id
from app.db.models.credit_account import CreditAccount
from app.db.models.credit_transaction import CreditTransaction

logger = logging.getLogger(__name__)

RefundReason = Literal["decline", "cancel", "expire"]

IDEM_CHALLENGE_SEND = "challenge_send"
IDEM_OPPONENT_ACCEPT = "challenge_accept"
IDEM_CHALLENGER_REFUND = "challenge_refund"


def _ensure_account(session: Session, clerk_user_id: str) -> CreditAccount:
    user_uuid = get_or_create_user_by_clerk_id(session, (clerk_user_id or "").strip())
    acct = session.scalars(
        select(CreditAccount).where(CreditAccount.user_id == user_uuid)
    ).first()
    if acct is None:
        acct = CreditAccount(user_id=user_uuid, balance=0)
        session.add(acct)
        session.flush()
    return acct


def _existing_txn(session: Session, idempotency_key: str) -> CreditTransaction | None:
    return session.scalars(
        select(CreditTransaction).where(CreditTransaction.idempotency_key == idempotency_key)
    ).first()


def _insert_txn(
    session: Session,
    *,
    account: CreditAccount,
    delta: int,
    type_: str,
    reference_id: str,
    idempotency_key: str,
) -> int:
    new_balance = int(account.balance) + delta
    if new_balance < 0:
        raise ValueError("Insufficient credits.")
    account.balance = new_balance
    session.add(
        CreditTransaction(
            id=uuid.uuid4(),
            account_id=account.id,
            delta=delta,
            balance_after=new_balance,
            type=type_,
            reference_type="challenge",
            reference_id=reference_id,
            idempotency_key=idempotency_key,
        )
    )
    session.flush()
    return new_balance


def balance_for_clerk(session: Session, clerk_user_id: str) -> int:
    acct = _ensure_account(session, clerk_user_id)
    return int(acct.balance)


def charge_challenger_on_send(
    session: Session,
    *,
    challenge_id: str,
    clerk_user_id: str,
    cost: int,
    gifted: bool,
) -> int:
    """
    Deduct 1 (standard) or 2 (gift) credits at challenge send. Idempotent per challenge.
    """
    c = (clerk_user_id or "").strip()
    if not c:
        raise ValueError("challengerClerkUserId is required to charge credits.")
    if cost not in (1, 2):
        raise ValueError("Invalid challenge send cost.")
    if cost == 2 and not gifted:
        raise ValueError("Inconsistent: cost 2 requires gift mode.")
    if cost == 1 and gifted:
        raise ValueError("Inconsistent: gift mode requires cost 2.")

    idem = f"{IDEM_CHALLENGE_SEND}:{challenge_id}"
    if _existing_txn(session, idem) is not None:
        return balance_for_clerk(session, c)

    acct = _ensure_account(session, c)
    return _insert_txn(
        session,
        account=acct,
        delta=-cost,
        type_="challenge_send",
        reference_id=challenge_id,
        idempotency_key=idem,
    )


def charge_opponent_on_accept(
    session: Session,
    *,
    challenge_id: str,
    opponent_clerk_user_id: str,
) -> int:
    """Deduct 1 credit when a non-gifted challenge is accepted. Idempotent per challenge."""
    c = (opponent_clerk_user_id or "").strip()
    if not c:
        raise ValueError("opponent is not bound to a Clerk user for credit charge.")

    idem = f"{IDEM_OPPONENT_ACCEPT}:{challenge_id}"
    if _existing_txn(session, idem) is not None:
        return balance_for_clerk(session, c)

    acct = _ensure_account(session, c)
    return _insert_txn(
        session,
        account=acct,
        delta=-1,
        type_="challenge_accept",
        reference_id=challenge_id,
        idempotency_key=idem,
    )


def refund_challenger_proposed_terminal(
    session: Session,
    *,
    challenge_id: str,
    challenger_clerk_user_id: str,
    gifted: bool,
    reason: RefundReason,
) -> int | None:
    """
    Refund 1 (standard) or 2 (gift) credits to challenger when a proposed challenge
    ends without acceptance. At most one refund per challenge (idempotent).
    """
    c = (challenger_clerk_user_id or "").strip()
    if not c:
        return None
    amount = 2 if gifted else 1
    idem = f"{IDEM_CHALLENGER_REFUND}:{challenge_id}"
    if _existing_txn(session, idem) is not None:
        return balance_for_clerk(session, c)

    acct = _ensure_account(session, c)
    return _insert_txn(
        session,
        account=acct,
        delta=amount,
        type_=f"challenge_refund_{reason}",
        reference_id=challenge_id,
        idempotency_key=idem,
    )


def maybe_refund_proposed_in_session(
    session: Session,
    *,
    challenge_id: str,
    challenger_clerk_user_id: str | None,
    prior_status: str,
    gifted: bool,
    reason: RefundReason,
) -> None:
    if (prior_status or "").lower() != "proposed":
        return
    c = (challenger_clerk_user_id or "").strip()
    if not c:
        return
    bal = refund_challenger_proposed_terminal(
        session,
        challenge_id=challenge_id,
        challenger_clerk_user_id=c,
        gifted=gifted,
        reason=reason,
    )
    logger.info(
        "challenge_challenger_refund",
        extra={"challenge_id": challenge_id, "reason": reason, "balance_after": bal},
    )
