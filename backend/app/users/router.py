"""Authenticated user notification preferences."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.billing.clerk_auth import require_clerk_user_id
from app.billing.user_service import ClerkProfileUnavailableError, sync_user_from_clerk
from app.challenges.schemas import OkOut
from app.clerk.backend_client import disable_challenge_notifications
from app.db.deps import get_db_required_session
from app.users.schemas import UserSyncOut

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/sync", response_model=UserSyncOut)
def post_sync_user(
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
) -> UserSyncOut:
    """Create or update local user from Clerk profile (GET /v1/users/{id})."""
    try:
        u = sync_user_from_clerk(db, clerk_user_id)
    except ClerkProfileUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not load profile from Clerk (check CLERK_SECRET_KEY and network).",
        ) from None
    return UserSyncOut(
        id=str(u.id),
        clerkUserId=u.clerk_user_id,
        email=u.email,
        displayName=u.display_name,
    )


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
