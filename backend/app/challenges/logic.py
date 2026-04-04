"""Challenge lifecycle and outcome (mirrors frontend challengeLifecycle)."""

from __future__ import annotations

from typing import Literal

from app.challenges.repository import ChallengeRecord


def lifecycle(rec: ChallengeRecord) -> Literal["pending", "partial", "complete"]:
    if rec.challenger_pushups is not None and rec.opponent_pushups is not None:
        return "complete"
    if rec.challenger_pushups is not None or rec.opponent_pushups is not None:
        return "partial"
    return "pending"


def outcome_from(rec: ChallengeRecord) -> tuple[int, int, Literal["challenger", "opponent", "tie"]]:
    a = rec.challenger_pushups if rec.challenger_pushups is not None else 0
    b = rec.opponent_pushups if rec.opponent_pushups is not None else 0
    if a == b:
        return a, b, "tie"
    if a > b:
        return a, b, "challenger"
    return a, b, "opponent"
