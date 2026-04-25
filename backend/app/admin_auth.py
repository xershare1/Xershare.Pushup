"""Gate /admin APIs to allowlisted Clerk user ids (see ADMIN_CLERK_USER_IDS)."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status

from app.billing.clerk_auth import require_clerk_user_id
from app.config import get_admin_clerk_user_ids


async def require_admin_clerk_user_id(
    clerk_user_id: str = Depends(require_clerk_user_id),
) -> str:
    allowed = get_admin_clerk_user_ids()
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is not configured (ADMIN_CLERK_USER_IDS).",
        )
    if clerk_user_id not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return clerk_user_id
