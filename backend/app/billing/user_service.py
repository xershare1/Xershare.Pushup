"""Local user rows keyed by Clerk id."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.user import User


def get_or_create_user_by_clerk_id(session: Session, clerk_user_id: str) -> uuid.UUID:
    u = session.scalars(select(User).where(User.clerk_user_id == clerk_user_id)).first()
    if u:
        return u.id
    u = User(clerk_user_id=clerk_user_id)
    session.add(u)
    session.flush()
    return u.id
