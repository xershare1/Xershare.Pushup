"""Challenge HTTP API + background email notifications."""

from __future__ import annotations

import math

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.challenges.logic import lifecycle, outcome_from
from app.challenges.repository import repo
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
from app.config import get_clerk_secret_key, get_frontend_url
from app.notifications.challenge_emails import (
    notify_attempt_submitted,
    notify_challenge_created,
    notify_result_ready,
)
from app.notifications.suppression import is_suppressed

router = APIRouter(tags=["challenges"])


def _share_link(challenge_id: str) -> str:
    return f"{get_frontend_url()}/c/{challenge_id}?source=invite"


def _build_leaderboard() -> list[LeaderboardEntryOut]:
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
) -> CreateChallengeResponse:
    if not body.challengerName.strip() or not body.opponentName.strip():
        raise HTTPException(status_code=400, detail="Challenger and opponent names are required.")

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

    rec = repo.create(body)
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
def get_challenge(challenge_id: str) -> ChallengeOut:
    rec = repo.get(challenge_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Challenge not found.")
    return rec.to_out()


@router.post("/challenges/{challenge_id}/attempts", response_model=ChallengeOut)
def submit_attempt(
    challenge_id: str,
    body: SubmitAttemptBody,
    background_tasks: BackgroundTasks,
) -> ChallengeOut:
    rec = repo.get(challenge_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Challenge not found.")

    if not math.isfinite(body.pushupCount) or body.pushupCount < 0:
        raise HTTPException(status_code=400, detail="Pushup count must be a non-negative number.")
    if not body.participantName.strip():
        raise HTTPException(status_code=400, detail="Participant name is required.")

    before = lifecycle(rec)
    count = int(body.pushupCount)

    if body.role == "challenger":
        if rec.challenger_pushups is not None:
            raise HTTPException(status_code=400, detail="Challenger has already submitted.")
        rec.challenger_pushups = count
    else:
        if rec.opponent_pushups is not None:
            raise HTTPException(status_code=400, detail="Opponent has already submitted.")
        rec.opponent_pushups = count

    repo.upsert(rec)
    after = lifecycle(rec)

    background_tasks.add_task(notify_attempt_submitted, challenge_id, body.role)
    if before != "complete" and after == "complete":
        background_tasks.add_task(notify_result_ready, challenge_id)

    return rec.to_out()


@router.get("/challenges/{challenge_id}/result", response_model=ChallengeOutcomeOut)
def get_result(challenge_id: str) -> ChallengeOutcomeOut:
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
def get_leaderboard() -> list[LeaderboardEntryOut]:
    return _build_leaderboard()
