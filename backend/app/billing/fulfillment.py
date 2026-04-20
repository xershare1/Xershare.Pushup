"""Post-payment fulfillment — idempotent Stripe events + credit ledger."""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.billing.user_service import get_or_create_user_by_clerk_id
from app.config import get_database_url
from app.db.models.credit_account import CreditAccount
from app.db.models.credit_transaction import CreditTransaction
from app.db.models.payment_transaction import PaymentTransaction
from app.db.models.stripe_event import StripeEvent

logger = logging.getLogger(__name__)


def fulfill_credits(
    *,
    stripe_event_id: str,
    stripe_session_id: str,
    clerk_user_id: str | None,
    bundle_code: str | None,
    credits: int,
) -> None:
    if not get_database_url():
        logger.info(
            "credits_fulfilled (no DATABASE_URL; log only)",
            extra={
                "stripe_event_id": stripe_event_id,
                "stripe_session_id": stripe_session_id,
                "clerk_user_id": clerk_user_id,
                "bundle_code": bundle_code,
                "credits": credits,
            },
        )
        return

    if not stripe_event_id.strip():
        logger.warning("fulfill_credits skipped: empty stripe_event_id")
        return

    if not clerk_user_id or credits <= 0:
        logger.warning(
            "fulfill_credits skipped: missing clerk_user_id or non-positive credits event=%s",
            stripe_event_id,
        )
        return

    from app.db.session import session_scope

    with session_scope() as session:
        key = stripe_session_id or stripe_event_id

        if (
            session.scalars(
                select(StripeEvent).where(StripeEvent.stripe_event_id == stripe_event_id)
            ).first()
            is not None
        ):
            logger.info("stripe event already processed: %s", stripe_event_id)
            return

        if (
            session.scalars(
                select(CreditTransaction).where(CreditTransaction.idempotency_key == key)
            ).first()
            is not None
        ):
            logger.info("credit already applied idempotency_key=%s", key)
            return

        try:
            session.add(
                StripeEvent(
                    stripe_event_id=stripe_event_id,
                    event_type="checkout.session.completed",
                )
            )
            session.flush()
        except IntegrityError:
            session.rollback()
            logger.info("stripe event race duplicate: %s", stripe_event_id)
            return

        user_uuid = get_or_create_user_by_clerk_id(session, clerk_user_id)

        pay = PaymentTransaction(
            id=uuid.uuid4(),
            user_id=user_uuid,
            stripe_checkout_session_id=stripe_session_id or None,
            bundle_code=bundle_code,
            status="succeeded",
        )
        session.add(pay)
        session.flush()

        acct = session.scalars(
            select(CreditAccount).where(CreditAccount.user_id == user_uuid)
        ).first()
        if not acct:
            acct = CreditAccount(user_id=user_uuid, balance=0)
            session.add(acct)
            session.flush()

        new_balance = acct.balance + credits
        acct.balance = new_balance
        try:
            session.add(
                CreditTransaction(
                    account_id=acct.id,
                    delta=credits,
                    balance_after=new_balance,
                    type="purchase",
                    reference_type="payment_transaction",
                    reference_id=str(pay.id),
                    idempotency_key=key,
                )
            )
            session.flush()
        except IntegrityError:
            session.rollback()
            logger.info("credit ledger race duplicate key=%s", key)
            return

        logger.info(
            "credits_fulfilled user=%s credits=%s session=%s",
            clerk_user_id,
            credits,
            stripe_session_id,
        )
