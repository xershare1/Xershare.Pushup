"""Challenge HTTP API + background email notifications."""

from __future__ import annotations

import logging
import math
from typing import Annotated, Literal, cast

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Header, HTTPException, UploadFile
from starlette import status

from app.billing.clerk_auth import require_clerk_user_id
from app.challenges.logic import lifecycle, outcome_from
from app.challenges.repository import (
    AttemptForbiddenError,
    ChallengeRepositoryProtocol,
    _norm_idempotency_key,
)
from app.challenges.schemas import (
    ChallengeOutcomeOut,
    ChallengeOut,
    ChallengeVideoItemOut,
    CreateChallengeBody,
    CreateChallengeResponse,
    LeaderboardEntryOut,
)
from app.clerk.backend_client import (
    challenge_notifications_enabled,
    fetch_clerk_user,
    primary_email,
)
from app.config import (
    get_challenge_max_pushups,
    get_challenge_max_video_bytes,
    get_clerk_secret_key,
    get_frontend_url,
    get_video_ttl_hours,
)
from app.abuse.rate_limit import enforce_daily_challenge_limit
from app.challenges.acceptance import accept_proposed, cancel_proposed, decline_proposed
from app.db.deps import get_challenge_repository, get_db_or_none
from app.db.models.challenge_attempt import ChallengeAttempt
from app.db.models.user import User
from app.solo.s3_storage import (
    delete_s3_object,
    presigned_video_url,
    upload_challenge_attempt_video,
)
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.notifications.challenge_emails import (
    notify_challenge_created,
    notify_result_ready,
)
from app.notifications.suppression import is_suppressed

logger = logging.getLogger(__name__)

router = APIRouter(tags=["challenges"])


async def _read_upload_bytes(upload: UploadFile, max_bytes: int) -> bytes:
    total = 0
    parts: list[bytes] = []
    while True:
        chunk = await upload.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video file exceeds maximum size ({max_bytes} bytes).",
            )
        parts.append(chunk)
    return b"".join(parts)


def _share_link(challenge_id: str) -> str:
    return f"{get_frontend_url()}/c/{challenge_id}?source=invite"


def _resolve_opponent_email_for_challenge(
    db: Session | None,
    opponent_clerk_id: str,
    opponent_clerk_json: dict | None,
) -> str | None:
    """
    Prefer ``users.email`` for the opponent when using Postgres; otherwise use
    Clerk ``primary_email`` (in-memory / missing local row).
    """
    if not opponent_clerk_id:
        return None
    resolved: str | None = None
    if db is not None:
        u = db.scalars(select(User).where(User.clerk_user_id == opponent_clerk_id)).first()
        if u is None:
            logger.warning(
                "challenge_opponent_not_in_local_users",
                extra={"opponent_clerk_user_id": opponent_clerk_id},
            )
        elif not (u.email and str(u.email).strip()):
            logger.warning(
                "challenge_opponent_email_missing_in_db",
                extra={"opponent_clerk_user_id": opponent_clerk_id},
            )
        else:
            resolved = str(u.email).strip()
    if resolved is None and opponent_clerk_json is not None:
        resolved = primary_email(opponent_clerk_json)
    return resolved if resolved else None


def _build_leaderboard(repo: ChallengeRepositoryProtocol) -> list[LeaderboardEntryOut]:
    scores: dict[str, int] = {}
    for r in repo.all_records():
        if r.challenger_pushups is not None:
            n = r.challenger_name
            scores[n] = max(scores.get(n, 0), r.challenger_pushups)
        if r.opponent_pushups is not None:
            n = r.opponent_name
            scores[n] = max(scores.get(n, 0), r.opponent_pushups)
    sorted_entries = sorted(scores.items(), key=lambda x: -x[1])
    return [
        LeaderboardEntryOut(rank=i + 1, displayName=name, bestPushups=cnt)
        for i, (name, cnt) in enumerate(sorted_entries[:50])
    ]


@router.post("/challenges", response_model=CreateChallengeResponse)
def create_challenge(
    body: CreateChallengeBody,
    background_tasks: BackgroundTasks,
    repo: Annotated[ChallengeRepositoryProtocol, Depends(get_challenge_repository)],
    db: Annotated[Session | None, Depends(get_db_or_none)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> CreateChallengeResponse:
    if not body.challengerName.strip() or not body.opponentName.strip():
        raise HTTPException(status_code=400, detail="Challenger and opponent names are required.")

    if not (body.challengerClerkUserId or "").strip():
        raise HTTPException(
            status_code=400,
            detail="challengerClerkUserId is required so your opponent can accept the challenge.",
        )

    enforce_daily_challenge_limit(body.challengerClerkUserId)

    ikey = _norm_idempotency_key(idempotency_key)
    if ikey and not (body.challengerClerkUserId or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Idempotency-Key requires challengerClerkUserId.",
        )

    ch_clerk = (body.challengerClerkUserId or "").strip()
    op_clerk = (body.opponentClerkUserId or "").strip()
    if ch_clerk and op_clerk and ch_clerk == op_clerk:
        raise HTTPException(status_code=400, detail="Cannot challenge yourself.")

    oid = (body.opponentClerkUserId or "").strip()
    opponent_user = None
    if oid:
        if not get_clerk_secret_key():
            raise HTTPException(
                status_code=503,
                detail="Clerk backend is not configured (CLERK_SECRET_KEY).",
            )
        opponent_user = fetch_clerk_user(oid)
        if not opponent_user:
            raise HTTPException(status_code=404, detail="Opponent user not found.")

    if repo.clerk_pair_challenge_blocked(ch_clerk, op_clerk):
        raise HTTPException(
            status_code=403,
            detail="Challenge not allowed between these users (blocked).",
        )

    resolved_opp = _resolve_opponent_email_for_challenge(db, oid, opponent_user)
    rec = repo.create(
        body,
        idempotency_key=ikey,
        resolved_opponent_email=resolved_opp,
    )
    logger.info(
        "challenge_created",
        extra={
            "challenge_id": rec.id,
            "challenger_clerk_user_id": body.challengerClerkUserId,
        },
    )
    link = _share_link(rec.id)
    notification_sent = False
    if opponent_user is not None:
        em = primary_email(opponent_user)
        can_send = (
            bool(em)
            and challenge_notifications_enabled(opponent_user)
            and not is_suppressed(em)
        )
        if can_send:
            notification_sent = True
            background_tasks.add_task(notify_challenge_created, rec.id)
        else:
            if not em:
                reason = "no_clerk_primary_email"
            elif not challenge_notifications_enabled(opponent_user):
                reason = "challenge_notifications_disabled"
            else:
                reason = "email_suppressed"
            logger.warning(
                "challenge_create_notification_not_sent",
                extra={"opponent_clerk_user_id": oid, "reason": reason},
            )

    return CreateChallengeResponse(
        challenge=rec.to_out(),
        shareLink=link,
        notificationSent=notification_sent,
    )


@router.get("/challenges/me", response_model=list[ChallengeOut])
def get_my_challenges(
    repo: Annotated[ChallengeRepositoryProtocol, Depends(get_challenge_repository)],
    actor_clerk_user_id: str = Depends(require_clerk_user_id),
) -> list[ChallengeOut]:
    rows = repo.list_for_clerk_user(actor_clerk_user_id)
    return [r.to_out() for r in rows]


@router.post("/challenges/{challenge_id}/accept", response_model=ChallengeOut)
def post_accept_challenge(
    challenge_id: str,
    repo: Annotated[ChallengeRepositoryProtocol, Depends(get_challenge_repository)],
    actor_clerk_user_id: str = Depends(require_clerk_user_id),
) -> ChallengeOut:
    try:
        rec = accept_proposed(repo, challenge_id, actor_clerk_user_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Challenge not found.") from None
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return rec.to_out()


@router.post("/challenges/{challenge_id}/decline", response_model=ChallengeOut)
def post_decline_challenge(
    challenge_id: str,
    repo: Annotated[ChallengeRepositoryProtocol, Depends(get_challenge_repository)],
    actor_clerk_user_id: str = Depends(require_clerk_user_id),
) -> ChallengeOut:
    try:
        rec = decline_proposed(repo, challenge_id, actor_clerk_user_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Challenge not found.") from None
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return rec.to_out()


@router.post("/challenges/{challenge_id}/cancel", response_model=ChallengeOut)
def post_cancel_challenge(
    challenge_id: str,
    repo: Annotated[ChallengeRepositoryProtocol, Depends(get_challenge_repository)],
    actor_clerk_user_id: str = Depends(require_clerk_user_id),
) -> ChallengeOut:
    try:
        rec = cancel_proposed(repo, challenge_id, actor_clerk_user_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Challenge not found.") from None
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return rec.to_out()


@router.get("/challenges/{challenge_id}", response_model=ChallengeOut)
def get_challenge(
    challenge_id: str,
    repo: Annotated[ChallengeRepositoryProtocol, Depends(get_challenge_repository)],
) -> ChallengeOut:
    rec = repo.get(challenge_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Challenge not found.")
    return rec.to_out()


@router.post("/challenges/{challenge_id}/attempts", response_model=ChallengeOut)
async def submit_attempt(
    challenge_id: str,
    background_tasks: BackgroundTasks,
    repo: Annotated[ChallengeRepositoryProtocol, Depends(get_challenge_repository)],
    actor_clerk_user_id: str = Depends(require_clerk_user_id),
    participant_name: str = Form(...),
    pushup_count: float = Form(...),
    role: str = Form(...),
    video: UploadFile | None = File(None),
) -> ChallengeOut:
    rec = repo.get(challenge_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Challenge not found.")

    max_push = get_challenge_max_pushups()
    if (
        not math.isfinite(pushup_count)
        or pushup_count < 1
        or pushup_count > max_push
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Pushup count must be between 1 and {max_push}.",
        )
    if not str(participant_name).strip():
        raise HTTPException(status_code=400, detail="Participant name is required.")

    if role not in ("challenger", "opponent"):
        raise HTTPException(status_code=400, detail="role must be challenger or opponent.")
    role_lit: Literal["challenger", "opponent"] = cast(Literal["challenger", "opponent"], role)

    before = lifecycle(rec)
    count = int(pushup_count)

    video_key: str | None = None
    if video is not None and (video.filename or "").strip():
        max_bytes = get_challenge_max_video_bytes()
        try:
            raw = await _read_upload_bytes(video, max_bytes)
        except HTTPException:
            raise
        if len(raw) == 0:
            raise HTTPException(status_code=400, detail="Empty video upload.")
        try:
            video_key = upload_challenge_attempt_video(
                challenge_id=challenge_id,
                clerk_user_id=actor_clerk_user_id,
                role=role_lit,
                body=raw,
                content_type=video.content_type,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    try:
        rec = repo.apply_attempt(
            challenge_id,
            role=role_lit,
            pushup_count=count,
            actor_clerk_user_id=actor_clerk_user_id,
            video_s3_key=video_key,
        )
    except KeyError:
        if video_key:
            delete_s3_object(video_key)
        raise HTTPException(status_code=404, detail="Challenge not found.") from None
    except AttemptForbiddenError as e:
        if video_key:
            delete_s3_object(video_key)
        raise HTTPException(status_code=403, detail=e.message) from e
    except ValueError as e:
        if video_key:
            delete_s3_object(video_key)
        raise HTTPException(status_code=400, detail=str(e)) from e

    after = lifecycle(rec)

    if before != "complete" and after == "complete":
        background_tasks.add_task(notify_result_ready, challenge_id)

    logger.info(
        "challenge_attempt_submitted",
        extra={
            "challenge_id": challenge_id,
            "role": role_lit,
            "pushup_count": count,
            "has_video": bool(video_key),
        },
    )

    return rec.to_out()


@router.get("/challenges/me/videos", response_model=list[ChallengeVideoItemOut])
def list_my_challenge_videos(
    db: Annotated[Session | None, Depends(get_db_or_none)],
    clerk_user_id: Annotated[str, Depends(require_clerk_user_id)],
) -> list[ChallengeVideoItemOut]:
    if db is None:
        return []
    rows = db.scalars(
        select(ChallengeAttempt)
        .where(
            ChallengeAttempt.clerk_user_id == clerk_user_id,
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


@router.get("/challenges/{challenge_id}/result", response_model=ChallengeOutcomeOut)
def get_result(
    challenge_id: str,
    repo: Annotated[ChallengeRepositoryProtocol, Depends(get_challenge_repository)],
) -> ChallengeOutcomeOut:
    rec = repo.get(challenge_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Challenge not found.")
    if lifecycle(rec) != "complete":
        raise HTTPException(status_code=400, detail="Challenge is not complete yet.")
    a, b, w = outcome_from(rec)
    return ChallengeOutcomeOut(
        challengeId=challenge_id,
        challengerName=rec.challenger_name,
        opponentName=rec.opponent_name,
        challengerPushups=a,
        opponentPushups=b,
        winner=w,
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntryOut])
def get_leaderboard(
    repo: Annotated[ChallengeRepositoryProtocol, Depends(get_challenge_repository)],
) -> list[LeaderboardEntryOut]:
    return _build_leaderboard(repo)
