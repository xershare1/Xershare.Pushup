"""Stripe Checkout Session creation (authenticated with Clerk session JWT)."""

from __future__ import annotations

from typing import Literal

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.billing.clerk_auth import require_clerk_user_id
from app.config import build_bundles, get_frontend_url, get_stripe_secret_key

router = APIRouter()


class CreateCheckoutBody(BaseModel):
    bundle_code: Literal["starter", "challenger", "pro"] = Field(
        ...,
        description="Catalog key; mapped server-side to Stripe Price and credits.",
    )


class CreateCheckoutResponse(BaseModel):
    url: str


@router.post("create-checkout-session", response_model=CreateCheckoutResponse)
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
