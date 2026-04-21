"""Stripe Checkout Session creation (authenticated with Clerk session JWT)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.billing.clerk_auth import require_clerk_user_id
from app.billing.user_service import get_or_create_user_by_clerk_id
from app.config import build_bundles, get_frontend_url, get_stripe_secret_key
from app.db.deps import get_db_required_session
from app.db.models.credit_account import CreditAccount
from app.db.models.credit_transaction import CreditTransaction
from app.db.models.payment_transaction import PaymentTransaction

router = APIRouter()

# Product-facing pack names (catalog codes: starter / challenger / pro).
_BUNDLE_PURCHASE_LABEL: dict[str, str] = {
    "starter": "Starter",
    "challenger": "Pro",
    "pro": "Best value",
}
_BUNDLE_PRICE_USD_FALLBACK: dict[str, float] = {
    "starter": 5.0,
    "challenger": 10.0,
    "pro": 20.0,
}


class CreateCheckoutBody(BaseModel):
    bundle_code: Literal["starter", "challenger", "pro"] = Field(
        ...,
        description="Catalog key; mapped server-side to Stripe Price and credits.",
    )


class CreateCheckoutResponse(BaseModel):
    url: str


class CreditBalanceOut(BaseModel):
    balance: int


class CreditHistoryItemOut(BaseModel):
    id: str
    type: Literal["earn", "spend"]
    description: str
    credits: int
    date: datetime
    amount_paid_usd: float | None = None


class CreditHistoryOut(BaseModel):
    items: list[CreditHistoryItemOut]


def _history_description(
    txn: CreditTransaction,
    payment: PaymentTransaction | None,
) -> str:
    if payment and payment.bundle_code:
        label = _BUNDLE_PURCHASE_LABEL.get(payment.bundle_code)
        if label:
            return f"Purchased {label} pack"
    if txn.type == "purchase":
        return "Purchased credits"
    if txn.delta < 0:
        return "Credit spend"
    return "Credits earned"


def _history_amount_usd(
    payment: PaymentTransaction | None,
) -> float | None:
    if payment is None:
        return None
    if payment.amount_cents is not None:
        return round(payment.amount_cents / 100.0, 2)
    if payment.bundle_code:
        fallback = _BUNDLE_PRICE_USD_FALLBACK.get(payment.bundle_code)
        if fallback is not None:
            return fallback
    return None


@router.get("/balance", response_model=CreditBalanceOut)
def get_credit_balance(
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> CreditBalanceOut:
    """Current credit balance for the authenticated user (0 if no account row yet)."""
    user_uuid = get_or_create_user_by_clerk_id(db, clerk_user_id)
    acct = db.scalars(
        select(CreditAccount).where(CreditAccount.user_id == user_uuid)
    ).first()
    if acct is None:
        return CreditBalanceOut(balance=0)
    return CreditBalanceOut(balance=int(acct.balance))


@router.get("/history", response_model=CreditHistoryOut)
def get_credit_history(
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> CreditHistoryOut:
    """Ledger entries for the authenticated user (newest first)."""
    user_uuid = get_or_create_user_by_clerk_id(db, clerk_user_id)
    acct = db.scalars(
        select(CreditAccount).where(CreditAccount.user_id == user_uuid)
    ).first()
    if acct is None:
        return CreditHistoryOut(items=[])

    txns = list(
        db.scalars(
            select(CreditTransaction)
            .where(CreditTransaction.account_id == acct.id)
            .order_by(CreditTransaction.created_at.desc())
            .limit(100)
        ).all()
    )

    pay_ids: list[uuid.UUID] = []
    for t in txns:
        if t.reference_type == "payment_transaction" and t.reference_id:
            try:
                pay_ids.append(uuid.UUID(t.reference_id))
            except ValueError:
                pass

    payments: dict[uuid.UUID, PaymentTransaction] = {}
    if pay_ids:
        rows = db.scalars(
            select(PaymentTransaction).where(PaymentTransaction.id.in_(pay_ids))
        ).all()
        payments = {p.id: p for p in rows}

    items: list[CreditHistoryItemOut] = []
    for t in txns:
        pay: PaymentTransaction | None = None
        if t.reference_type == "payment_transaction" and t.reference_id:
            try:
                pay = payments.get(uuid.UUID(t.reference_id))
            except ValueError:
                pay = None

        delta = int(t.delta)
        row_type: Literal["earn", "spend"] = "spend" if delta < 0 else "earn"
        amount_usd = (
            _history_amount_usd(pay) if row_type == "earn" and pay is not None else None
        )

        items.append(
            CreditHistoryItemOut(
                id=str(t.id),
                type=row_type,
                description=_history_description(t, pay),
                credits=delta,
                date=t.created_at,
                amount_paid_usd=amount_usd,
            )
        )

    return CreditHistoryOut(items=items)


@router.post("/create-checkout-session", response_model=CreateCheckoutResponse)
def create_checkout_session(
    body: CreateCheckoutBody,
    clerk_user_id: str = Depends(require_clerk_user_id),
) -> CreateCheckoutResponse:
    bundles = build_bundles()
    bundle = bundles.get(body.bundle_code)
    if not bundle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown or unconfigured bundle: {body.bundle_code}",
        )
    price_id = str(bundle["price_id"])
    credits = int(bundle["credits"])
    stripe.api_key = get_stripe_secret_key()
    base = get_frontend_url()
    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{base}/purchase/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{base}/purchase/cancel",
            metadata={
                "clerk_user_id": clerk_user_id,
                "bundle_code": body.bundle_code,
                "credits": str(credits),
            },
        )
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e.user_message or e),
        ) from e
    url = session.url
    if not url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe did not return a checkout URL",
        )
    return CreateCheckoutResponse(url=url)
