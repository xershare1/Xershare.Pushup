"""Authenticated user notification preferences."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.billing.clerk_auth import require_clerk_user_id
from app.billing.user_service import (
    ClerkProfileUnavailableError,
    find_users_by_display_name,
    sync_user_from_clerk,
)
from app.challenges.repository import ChallengeRepositoryProtocol
from app.challenges.schemas import OkOut
from app.clerk.backend_client import disable_challenge_notifications
from app.db.deps import get_challenge_repository, get_db_required_session
from app.users.schemas import (
    ChallengeRecordEntry,
    MyChallengeRecordOut,
    UserLookupOut,
    UserSyncOut,
)

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


@router.get("/lookup-by-display-name", response_model=UserLookupOut)
def get_lookup_by_display_name(
    clerk_user_id: str = Depends(require_clerk_user_id),
    db: Session = Depends(get_db_required_session),
    displayName: Annotated[str | None, Query(alias="displayName")] = None,
) -> UserLookupOut:
    """Resolve a member by ``users.display_name`` (case-insensitive, trimmed)."""
    q = (displayName or "").strip()
    if not q:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="displayName is required.",
        )
    matches = find_users_by_display_name(db, q)
    if len(matches) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No member found with that display name.",
        )
    if len(matches) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Multiple members match that display name; ask them to set a unique name.",
        )
    u = matches[0]
    if u.clerk_user_id == clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot challenge yourself.",
        )
    return UserLookupOut(clerkUserId=u.clerk_user_id, displayName=u.display_name)


@router.get("/my-challenge-record", response_model=MyChallengeRecordOut)
def get_my_challenge_record(
    clerk_user_id: str = Depends(require_clerk_user_id),
    repo: ChallengeRepositoryProtocol = Depends(get_challenge_repository),
) -> MyChallengeRecordOut:
    """Completed head-to-head challenges for the signed-in user (wins / losses / ties)."""
    clerk = (clerk_user_id or "").strip()
    rows: list[tuple[datetime, ChallengeRecordEntry]] = []
    wins = losses = ties = 0

    for rec in repo.all_records():
        if (rec.status or "").lower() != "completed":
            continue
        ch_id = (rec.challenger_clerk_user_id or "").strip()
        op_id = (rec.opponent_clerk_user_id or "").strip()
        cp = rec.challenger_pushups
        opp_n = rec.opponent_pushups
        if cp is None or opp_n is None:
            continue
        is_ch = ch_id == clerk and ch_id != ""
        is_op = op_id == clerk and op_id != ""
        if is_ch and is_op:
            continue
        if is_ch:
            user_p, their_p, opp_name = cp, opp_n, rec.opponent_name
        elif is_op:
            user_p, their_p, opp_name = opp_n, cp, rec.challenger_name
        else:
            continue

        if user_p > their_p:
            outcome: Literal["win", "loss", "tie"] = "win"
            wins += 1
        elif user_p < their_p:
            outcome = "loss"
            losses += 1
        else:
            outcome = "tie"
            ties += 1

        completed_at = rec.completed_at
        completed_str = completed_at.isoformat() if completed_at else None
        sort_key = completed_at or datetime.min.replace(tzinfo=timezone.utc)

        rows.append(
            (
                sort_key,
                ChallengeRecordEntry(
                    challengeId=rec.id,
                    opponentName=opp_name,
                    userPushups=user_p,
                    opponentPushups=their_p,
                    outcome=outcome,
                    completedAt=completed_str,
                ),
            )
        )

    rows.sort(key=lambda x: x[0], reverse=True)
    entries = [e for _, e in rows]
    return MyChallengeRecordOut(wins=wins, losses=losses, ties=ties, entries=entries)


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
