"""Clerk webhook: verify Svix signature, upsert local user on user.created / user.updated."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from svix.webhooks import Webhook, WebhookVerificationError

from app.billing.user_service import upsert_user_from_clerk_webhook
from app.config import get_clerk_webhook_secret, get_database_url
from app.db.session import session_scope

logger = logging.getLogger(__name__)

router = APIRouter()


def _svix_headers(request: Request) -> dict[str, str]:
    out: dict[str, str] = {}
    for key in ("svix-id", "svix-timestamp", "svix-signature"):
        v = request.headers.get(key)
        if v:
            out[key] = v
    return out


@router.post("/api/v1/clerk/webhook")
async def clerk_webhook(request: Request) -> dict[str, bool]:
    secret = get_clerk_webhook_secret()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CLERK_WEBHOOK_SECRET is not configured",
        )

    payload = await request.body()
    headers = _svix_headers(request)

    try:
        wh = Webhook(secret)
        raw = wh.verify(payload, headers)
    except WebhookVerificationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        ) from e

    # Svix may return a dict (parsed) or str/bytes depending on library version.
    if isinstance(raw, dict):
        event: dict[str, Any] = raw
    else:
        try:
            event = json.loads(raw)
        except (TypeError, json.JSONDecodeError) as e:
            logger.warning("clerk webhook invalid payload: %s", e)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook payload",
            ) from e

    etype = event.get("type")
    data = event.get("data")

    if etype in ("user.created", "user.updated"):
        if not get_database_url():
            logger.warning(
                "clerk webhook user sync skipped: DATABASE_URL not set (type=%s)",
                etype,
            )
            return {"received": True}

        if not isinstance(data, dict):
            logger.warning("clerk webhook missing data object type=%s", etype)
            return {"received": True}

        try:
            with session_scope() as session:
                upsert_user_from_clerk_webhook(session, data)
        except ValueError as e:
            logger.warning("clerk webhook user upsert skipped: %s", e)
            return {"received": True}
        logger.info("clerk webhook user synced type=%s", etype)
    else:
        logger.debug("clerk webhook ignored type=%s", etype)

    return {"received": True}
