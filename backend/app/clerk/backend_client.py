"""Clerk REST API (users, public_metadata). Uses CLERK_SECRET_KEY."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_clerk_secret_key

logger = logging.getLogger(__name__)

CLERK_API = "https://api.clerk.com/v1"


def _headers() -> dict[str, str]:
    key = get_clerk_secret_key()
    if not key:
        return {}
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def fetch_clerk_user(user_id: str) -> dict[str, Any] | None:
    """GET /v1/users/{id}. Returns None if 404 or secret missing."""
    if not get_clerk_secret_key():
        logger.warning("CLERK_SECRET_KEY not set; cannot fetch Clerk user")
        return None
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.get(f"{CLERK_API}/users/{user_id}", headers=_headers())
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()
    except httpx.HTTPError as e:
        logger.exception("Clerk user fetch failed: %s", e)
        return None


def primary_email(user: dict[str, Any]) -> str | None:
    pid = user.get("primary_email_address_id")
    for e in user.get("email_addresses") or []:
        if isinstance(e, dict) and e.get("id") == pid:
            em = e.get("email_address")
            if em:
                return str(em).strip()
    for e in user.get("email_addresses") or []:
        if isinstance(e, dict) and e.get("email_address"):
            return str(e["email_address"]).strip()
    return None


def challenge_notifications_enabled(user: dict[str, Any]) -> bool:
    """Default True when missing; False only when explicitly False in public_metadata."""
    meta = user.get("public_metadata")
    if not isinstance(meta, dict):
        return True
    v = meta.get("challenge_notifications_enabled")
    if v is False:
        return False
    return True


def disable_challenge_notifications(user_id: str) -> bool:
    """Merge public_metadata.challenge_notifications_enabled = false. Returns False if user missing."""
    if not get_clerk_secret_key():
        logger.warning("CLERK_SECRET_KEY not set; cannot update preferences")
        return False
    user = fetch_clerk_user(user_id)
    if not user:
        return False
    meta = dict(user.get("public_metadata") or {})
    meta["challenge_notifications_enabled"] = False
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.patch(
                f"{CLERK_API}/users/{user_id}",
                headers=_headers(),
                json={"public_metadata": meta},
            )
            r.raise_for_status()
        return True
    except httpx.HTTPError as e:
        logger.exception("Clerk user patch failed: %s", e)
        return False
