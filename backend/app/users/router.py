"""Authenticated user notification preferences."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.billing.clerk_auth import require_clerk_user_id
from app.challenges.schemas import OkOut
from app.clerk.backend_client import disable_challenge_notifications

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/notifications/challenges/disable", response_model=OkOut)
def post_disable_challenge_notifications(
    clerk_user_id: str = Depends(require_clerk_user_id),
) -> OkOut:
    ok = disable_challenge_notifications(clerk_user_id)
    if not ok:
        raise HTTPException(
            status_code=503,
            detail="Could not update notification preferences (Clerk backend unavailable).",
        )
    return OkOut(ok=True)
