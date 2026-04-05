"""Local user rows keyed by Clerk id.

App state (email/display copy, credits, challenges) lives in Postgres and is updated here
or via webhooks. Anything that must live in Clerk (e.g. public_metadata) is written
upstream through ``app.clerk.backend_client``, not by re-fetching on every request.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.clerk.backend_client import (
    challenge_notifications_enabled,
    fetch_clerk_user,
    primary_email,
)
from app.db.models.user import User


class ClerkProfileUnavailableError(Exception):
    """Clerk Backend API did not return a user (missing secret, network, 404)."""


def get_or_create_user_by_clerk_id(session: Session, clerk_user_id: str) -> uuid.UUID:
    u = session.scalars(select(User).where(User.clerk_user_id == clerk_user_id)).first()
    if u:
        return u.id
    new_id = uuid.uuid4()
    session.execute(
        insert(User)
        .values(id=new_id, clerk_user_id=clerk_user_id)
        .on_conflict_do_nothing(index_elements=[User.clerk_user_id])
    )
    session.flush()
    row = session.scalars(select(User).where(User.clerk_user_id == clerk_user_id)).first()
    if row is None:
        raise RuntimeError("User row missing after insert conflict or get_or_create")
    return row.id


def _display_name_from_clerk(clerk: dict[str, Any]) -> str | None:
    raw = clerk.get("username")
    if raw is not None:
        s = str(raw).strip()
        if s:
            return s
    fn = (clerk.get("first_name") or "").strip()
    ln = (clerk.get("last_name") or "").strip()
    if fn and ln:
        return f"{fn} {ln}"
    if fn:
        return fn
    if ln:
        return ln
    return None


def apply_clerk_user_dict(user: User, clerk: dict[str, Any]) -> None:
    """Map Clerk user JSON (API or webhook `data`) onto a User row."""
    em = primary_email(clerk)
    if em:
        user.email = em

    dn = _display_name_from_clerk(clerk)
    if dn:
        user.display_name = dn

    user.challenge_notifications_enabled = challenge_notifications_enabled(clerk)


def upsert_user_from_clerk_webhook(session: Session, data: dict[str, Any]) -> User:
    """Create or update User from Clerk webhook `data` (no REST call)."""
    raw_id = data.get("id")
    if not raw_id or not isinstance(raw_id, str):
        raise ValueError("webhook data missing string id")
    clerk_user_id = raw_id.strip()
    if not clerk_user_id:
        raise ValueError("webhook data id empty")

    uid = get_or_create_user_by_clerk_id(session, clerk_user_id)
    u = session.get(User, uid)
    if u is None:
        raise RuntimeError("User row missing after get_or_create")

    apply_clerk_user_dict(u, data)
    session.flush()
    return u


def sync_user_from_clerk(session: Session, clerk_user_id: str) -> User:
    """
    Ensure a User row exists. If one already exists, return it without calling Clerk.

    Only for a **new** local row do we call Clerk GET /v1/users/{id} to populate
    email, display_name, and notification prefs (webhook or a later flow can
    enrich existing rows without this API).
    """
    existing = session.scalars(
        select(User).where(User.clerk_user_id == clerk_user_id)
    ).first()
    if existing is not None:
        return existing

    uid = get_or_create_user_by_clerk_id(session, clerk_user_id)
    u = session.get(User, uid)
    if u is None:
        raise RuntimeError("User row missing after get_or_create")

    clerk = fetch_clerk_user(clerk_user_id)
    if not clerk:
        raise ClerkProfileUnavailableError()

    apply_clerk_user_dict(u, clerk)
    session.flush()
    return u
