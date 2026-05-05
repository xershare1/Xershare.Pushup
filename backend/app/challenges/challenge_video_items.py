"""Build challenge video list items from ChallengeAttempt + Challenge rows."""

from __future__ import annotations

from datetime import timedelta
from typing import Literal, cast

from app.challenges.schemas import (
    ChallengeVideoItemOut,
    ChallengeVideoOpponentOut,
    ChallengeVideoStatsOut,
    ChallengeVideosPageOut,
)
from app.config import get_video_ttl_hours
from app.db.models.challenge import Challenge
from app.db.models.challenge_attempt import ChallengeAttempt
from app.solo.video_playback import playback_url_for_video_key


def _initials(name: str) -> str:
    s = (name or "").strip()
    if not s:
        return "?"
    parts = [p for p in s.split() if p]
    if len(parts) >= 2:
        return (parts[0][0] + parts[1][0]).upper()
    if len(s) >= 2:
        return s[:2].upper()
    return s[0].upper()


def _winner(
    challenger_pushups: int | None,
    opponent_pushups: int | None,
) -> Literal["challenger", "opponent", "tie"]:
    a = challenger_pushups if challenger_pushups is not None else 0
    b = opponent_pushups if opponent_pushups is not None else 0
    if a == b:
        return "tie"
    if a > b:
        return "challenger"
    return "opponent"


def _result_for_viewer(
    role: Literal["challenger", "opponent"],
    winner: Literal["challenger", "opponent", "tie"],
) -> Literal["won", "lost", "tie"]:
    if winner == "tie":
        return "tie"
    if winner == "challenger":
        return "won" if role == "challenger" else "lost"
    return "won" if role == "opponent" else "lost"


def build_challenge_video_item(
    att: ChallengeAttempt,
    ch: Challenge,
    presign_expires_seconds: int,
) -> ChallengeVideoItemOut | None:
    """Return None if attempt cannot be serialized (invalid role or missing video key)."""
    key = (att.video_s3_key or "").strip()
    if not key:
        return None
    if att.participant_role not in ("challenger", "opponent"):
        return None
    role_o: Literal["challenger", "opponent"] = cast(
        Literal["challenger", "opponent"],
        att.participant_role,
    )

    if role_o == "challenger":
        opp_name = (ch.opponent_name or "").strip() or "Opponent"
        your_score = ch.challenger_pushups if ch.challenger_pushups is not None else 0
        their_score = ch.opponent_pushups if ch.opponent_pushups is not None else 0
    else:
        opp_name = (ch.challenger_name or "").strip() or "Challenger"
        your_score = ch.opponent_pushups if ch.opponent_pushups is not None else 0
        their_score = ch.challenger_pushups if ch.challenger_pushups is not None else 0

    winner = _winner(ch.challenger_pushups, ch.opponent_pushups)
    result = _result_for_viewer(role_o, winner)

    ttl_hours = get_video_ttl_hours()
    expires_at = att.submitted_at + timedelta(hours=ttl_hours)

    url = playback_url_for_video_key(key, expires_seconds=presign_expires_seconds) or None

    return ChallengeVideoItemOut(
        id=str(att.id),
        challengeId=att.challenge_id,
        opponent=ChallengeVideoOpponentOut(username=opp_name, initials=_initials(opp_name)),
        role=role_o,
        result=result,
        yourScore=int(your_score),
        theirScore=int(their_score),
        recordedAt=att.submitted_at,
        expiresAt=expires_at,
        videoUrl=url,
    )


def challenge_videos_page(items: list[ChallengeVideoItemOut]) -> ChallengeVideosPageOut:
    total = len(items)
    wins = sum(1 for x in items if x.result == "won")
    losses = sum(1 for x in items if x.result == "lost")
    best_reps = max((x.yourScore for x in items), default=0)
    stats = ChallengeVideoStatsOut(
        total=total,
        wins=wins,
        losses=losses,
        bestReps=best_reps,
    )
    return ChallengeVideosPageOut(challengeVideos=items, stats=stats)
