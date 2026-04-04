"""Daily challenge creation limit per Clerk user (Postgres only)."""

from __future__ import annotations

from datetime import date

from fastapi import HTTPException
from sqlalchemy import select

from app.config import get_challenge_rate_limit_daily, get_database_url
from app.db.models.rate_limit_counter import RateLimitCounter
from app.db.session import session_scope


def enforce_daily_challenge_limit(clerk_user_id: str | None) -> None:
    if not clerk_user_id or not str(clerk_user_id).strip():
        return
    if not get_database_url():
        return

    limit = get_challenge_rate_limit_daily()
    today = date.today()
    cid = str(clerk_user_id).strip()

    with session_scope() as session:
        row = session.scalars(
            select(RateLimitCounter).where(
                RateLimitCounter.clerk_user_id == cid,
                RateLimitCounter.bucket == "daily_challenges",
                RateLimitCounter.window_start == today,
            )
        ).first()
        if row is None:
            session.add(
                RateLimitCounter(
                    clerk_user_id=cid,
                    bucket="daily_challenges",
                    window_start=today,
                    count=1,
                )
            )
            return
        if row.count >= limit:
            raise HTTPException(
                status_code=429,
                detail="Daily challenge limit reached. Try again tomorrow.",
            )
        row.count += 1
