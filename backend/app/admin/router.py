"""Admin dashboard API — allowlisted Clerk users only (ADMIN_CLERK_USER_IDS)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Literal, cast

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.admin_auth import require_admin_clerk_user_id
from app.billing.admin_credits import admin_adjust_credits
from app.challenges.repository import ChallengeRepositoryProtocol
from app.challenges.schemas import ChallengeOut, ChallengeVideoItemOut
from app.config import get_database_url, get_video_ttl_hours
from app.db.deps import get_challenge_repository, get_db_or_none, get_db_required_session
from app.db.models.challenge_attempt import ChallengeAttempt
from app.db.models.credit_account import CreditAccount
from app.db.models.solo_session import SoloSession
from app.db.models.user import User
from app.friends import service as friend_service
from app.friends.schemas import FriendOut, FriendsListOut
from app.solo.s3_storage import presigned_video_url
from app.solo.schemas import SoloSessionListItem, SoloSessionListOut

router = APIRouter()


class AdminUserSearchItem(BaseModel):
    clerkUserId: str
    email: str | None = None
    displayName: str | None = None


class AdminUserSearchOut(BaseModel):
    users: list[AdminUserSearchItem]


class AdminUserProfileOut(BaseModel):
    clerkUserId: str
    email: str | None = None
    displayName: str | None = None
    creditBalance: int
    challengeCount: int


class AdminGrantCreditsBody(BaseModel):
    credits: int = Field(..., description="Positive to add, negative to deduct.")
    reason: str = Field(..., min_length=1, max_length=200)


class AdminGrantCreditsOut(BaseModel):
    newBalance: int


@router.get("/session")
def admin_session_probe(
    _: Annotated[str, Depends(require_admin_clerk_user_id)],
) -> Response:
    """Returns 204 when the caller is an admin; 403 otherwise. Used by the SPA to gate /admin."""
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/users/lookup", response_model=AdminUserSearchOut)
def admin_lookup_users(
    query: Annotated[str, Query(min_length=2, max_length=200)],
    _: Annotated[str, Depends(require_admin_clerk_user_id)],
    db: Session = Depends(get_db_required_session),
) -> AdminUserSearchOut:
    raw = query.strip()
    like = f"%{raw}%"
    rows = db.scalars(
        select(User)
        .where(
            or_(
                User.clerk_user_id == raw,
                User.email.ilike(like),
                User.display_name.ilike(like),
            )
        )
        .order_by(User.created_at.desc())
        .limit(25)
    ).all()
    return AdminUserSearchOut(
        users=[
            AdminUserSearchItem(
                clerkUserId=u.clerk_user_id,
                email=u.email,
                displayName=u.display_name,
            )
            for u in rows
        ]
    )


@router.get("/users/{clerk_user_id}/profile", response_model=AdminUserProfileOut)
def admin_user_profile(
    clerk_user_id: str,
    _: Annotated[str, Depends(require_admin_clerk_user_id)],
    db: Session = Depends(get_db_required_session),
    repo: ChallengeRepositoryProtocol = Depends(get_challenge_repository),
) -> AdminUserProfileOut:
    u = db.scalars(select(User).where(User.clerk_user_id == clerk_user_id.strip())).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found.")
    acct = db.scalars(select(CreditAccount).where(CreditAccount.user_id == u.id)).first()
    bal = int(acct.balance) if acct is not None else 0
    n = len(repo.list_for_clerk_user(u.clerk_user_id))
    return AdminUserProfileOut(
        clerkUserId=u.clerk_user_id,
        email=u.email,
        displayName=u.display_name,
        creditBalance=bal,
        challengeCount=n,
    )


@router.get("/users/{clerk_user_id}/friends", response_model=FriendsListOut)
def admin_user_friends(
    clerk_user_id: str,
    _: Annotated[str, Depends(require_admin_clerk_user_id)],
    db: Session = Depends(get_db_required_session),
) -> FriendsListOut:
    u = db.scalars(select(User).where(User.clerk_user_id == clerk_user_id.strip())).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found.")
    rows = friend_service.list_friends(db, clerk_user_id=u.clerk_user_id)
    return FriendsListOut(friends=[FriendOut(**r) for r in rows])


@router.get("/users/{clerk_user_id}/challenges", response_model=list[ChallengeOut])
def admin_user_challenges(
    clerk_user_id: str,
    _: Annotated[str, Depends(require_admin_clerk_user_id)],
    repo: ChallengeRepositoryProtocol = Depends(get_challenge_repository),
) -> list[ChallengeOut]:
    c = (clerk_user_id or "").strip()
    if not c:
        raise HTTPException(status_code=400, detail="clerk_user_id required.")
    rows = repo.list_for_clerk_user(c)
    return [r.to_out() for r in rows]


@router.get("/users/{clerk_user_id}/challenge-videos", response_model=list[ChallengeVideoItemOut])
def admin_user_challenge_videos(
    clerk_user_id: str,
    _: Annotated[str, Depends(require_admin_clerk_user_id)],
    db: Annotated[Session | None, Depends(get_db_or_none)],
) -> list[ChallengeVideoItemOut]:
    if db is None:
        return []
    c = (clerk_user_id or "").strip()
    if not c:
        raise HTTPException(status_code=400, detail="clerk_user_id required.")
    rows = db.scalars(
        select(ChallengeAttempt)
        .where(
            ChallengeAttempt.clerk_user_id == c,
            ChallengeAttempt.video_s3_key.isnot(None),
        )
        .order_by(ChallengeAttempt.submitted_at.desc())
    ).all()
    ttl = int(get_video_ttl_hours() * 3600 * 2)
    out: list[ChallengeVideoItemOut] = []
    for att in rows:
        key = (att.video_s3_key or "").strip()
        if not key:
            continue
        if att.participant_role not in ("challenger", "opponent"):
            continue
        role_o: Literal["challenger", "opponent"] = cast(
            Literal["challenger", "opponent"],
            att.participant_role,
        )
        url = presigned_video_url(key, expires_seconds=ttl) or None
        out.append(
            ChallengeVideoItemOut(
                challengeId=att.challenge_id,
                role=role_o,
                pushupCount=att.pushup_count,
                submittedAt=att.submitted_at,
                videoUrl=url,
            )
        )
    return out


@router.get("/users/{clerk_user_id}/solo-sessions", response_model=SoloSessionListOut)
def admin_user_solo_sessions(
    clerk_user_id: str,
    _: Annotated[str, Depends(require_admin_clerk_user_id)],
    db: Session = Depends(get_db_required_session),
) -> SoloSessionListOut:
    u = db.scalars(select(User).where(User.clerk_user_id == clerk_user_id.strip())).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found.")
    now = datetime.now(timezone.utc)
    rows = db.scalars(
        select(SoloSession)
        .where(SoloSession.user_id == u.id)
        .order_by(SoloSession.created_at.desc())
        .limit(100)
    ).all()
    items: list[SoloSessionListItem] = []
    for row in rows:
        video_url: str | None = None
        if row.video_s3_key and row.expires_at > now:
            remaining = int((row.expires_at - now).total_seconds())
            video_url = presigned_video_url(
                row.video_s3_key,
                expires_seconds=max(60, remaining),
            ) or None
        items.append(
            SoloSessionListItem(
                sessionId=str(row.session_id),
                reps=row.reps,
                createdAt=row.created_at.isoformat(),
                expiresAt=row.expires_at.isoformat(),
                videoUrl=video_url,
            )
        )
    return SoloSessionListOut(sessions=items)


@router.post(
    "/users/{clerk_user_id}/credits",
    response_model=AdminGrantCreditsOut,
    status_code=status.HTTP_200_OK,
)
def admin_grant_credits(
    clerk_user_id: str,
    body: AdminGrantCreditsBody,
    actor: Annotated[str, Depends(require_admin_clerk_user_id)],
    db: Session = Depends(get_db_required_session),
) -> AdminGrantCreditsOut:
    if not get_database_url():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not configured.",
        )
    target = (clerk_user_id or "").strip()
    if not target:
        raise HTTPException(status_code=400, detail="clerk_user_id required.")
    try:
        new_balance = admin_adjust_credits(
            db,
            target_clerk_user_id=target,
            delta=body.credits,
            actor_clerk_user_id=actor,
            reason=body.reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return AdminGrantCreditsOut(newBalance=new_balance)
