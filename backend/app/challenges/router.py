"""Challenge HTTP API + background email notifications."""

from __future__ import annotations

import logging
import math
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException

from app.challenges.logic import lifecycle, outcome_from
from app.challenges.repository import ChallengeRepositoryProtocol, _norm_idempotency_key
from app.challenges.schemas import (
    ChallengeOutcomeOut,
    ChallengeOut,
    CreateChallengeBody,
    CreateChallengeResponse,
    LeaderboardEntryOut,
    SubmitAttemptBody,
)
from app.clerk.backend_client import (
    challenge_notifications_enabled,
    fetch_clerk_user,
    primary_email,
)
from app.config import get_challenge_max_pushups, get_clerk_secret_key, get_frontend_url
from app.abuse.rate_limit import enforce_daily_challenge_limit
from app.db.deps import get_challenge_repository
from app.notifications.challenge_emails import (
    notify_attempt_submitted,
    notify_challenge_created,
    notify_result_ready,
)
from app.notifications.suppression import is_suppressed

logger = logging.getLogger(__name__)

router = APIRouter(tags=["challenges"])


def _share_link(challenge_id: str) -> str:
    return f"{get_frontend_url()}/c/{challenge_id}?source=invite"


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
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> CreateChallengeResponse:
    if not body.challengerName.strip() or not body.opponentName.strip():
        raise HTTPException(status_code=400, detail="Challenger and opponent names are required.")

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

    rec = repo.create(body, idempotency_key=ikey)
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
        if (
            em
            and challenge_notifications_enabled(opponent_user)
            and not is_suppressed(em)
        ):
            notification_sent = True
            background_tasks.add_task(notify_challenge_created, rec.id)

    return CreateChallengeResponse(
        challenge=rec.to_out(),
        shareLink=link,
        notificationSent=notification_sent,
    )


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
def submit_attempt(
    challenge_id: str,
    body: SubmitAttemptBody,
    background_tasks: BackgroundTasks,
    repo: Annotated[ChallengeRepositoryProtocol, Depends(get_challenge_repository)],
) -> ChallengeOut:
    rec = repo.get(challenge_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Challenge not found.")

    max_push = get_challenge_max_pushups()
    if (
        not math.isfinite(body.pushupCount)
        or body.pushupCount < 1
        or body.pushupCount > max_push
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Pushup count must be between 1 and {max_push}.",
        )
    if not body.participantName.strip():
        raise HTTPException(status_code=400, detail="Participant name is required.")

    before = lifecycle(rec)
    count = int(body.pushupCount)

    try:
        rec = repo.apply_attempt(challenge_id, role=body.role, pushup_count=count)
    except KeyError:
        raise HTTPException(status_code=404, detail="Challenge not found.") from None
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    after = lifecycle(rec)

    background_tasks.add_task(notify_attempt_submitted, challenge_id, body.role)
    if before != "complete" and after == "complete":
        background_tasks.add_task(notify_result_ready, challenge_id)

    logger.info(
        "challenge_attempt_submitted",
        extra={
            "challenge_id": challenge_id,
            "role": body.role,
            "pushup_count": count,
        },
    )

    return rec.to_out()


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
