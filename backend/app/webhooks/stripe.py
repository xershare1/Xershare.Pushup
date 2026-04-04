"""Stripe webhook: verify signature, fulfill checkout.session.completed."""

from __future__ import annotations

import logging

import stripe
from fastapi import APIRouter, HTTPException, Request, status

from app.billing.fulfillment import fulfill_credits
from app.config import get_stripe_secret_key, get_stripe_webhook_secret

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request) -> dict[str, bool]:
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    if not sig:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header",
        )
    stripe.api_key = get_stripe_secret_key()
    try:
        event = stripe.Webhook.construct_event(
            payload, sig, get_stripe_webhook_secret()
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload",
        ) from e
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        ) from e

    if event["type"] == "checkout.session.completed":
        obj = event["data"]["object"]
        md = obj.get("metadata") or {}
        clerk_user_id = md.get("clerk_user_id")
        bundle_code = md.get("bundle_code")
        credits_raw = md.get("credits")
        try:
            credits = int(credits_raw) if credits_raw is not None else 0
        except (TypeError, ValueError):
            credits = 0
        session_id = obj.get("id") or ""
        fulfill_credits(
            stripe_session_id=session_id,
            clerk_user_id=clerk_user_id if isinstance(clerk_user_id, str) else None,
            bundle_code=bundle_code if isinstance(bundle_code, str) else None,
            credits=credits,
        )
    else:
        logger.debug("stripe webhook ignored type=%s", event.get("type"))

    return {"received": True}
