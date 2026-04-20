"""Stripe Checkout Session creation (authenticated with Clerk session JWT)."""

from __future__ import annotations

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

router = APIRouter()


class CreateCheckoutBody(BaseModel):
    bundle_code: Literal["starter", "challenger", "pro"] = Field(
        ...,
        description="Catalog key; mapped server-side to Stripe Price and credits.",
    )


class CreateCheckoutResponse(BaseModel):
    url: str


class CreditBalanceOut(BaseModel):
    balance: int


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
