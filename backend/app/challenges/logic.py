"""Challenge lifecycle and outcome (mirrors frontend challengeLifecycle)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from app.challenges.repository import ChallengeRecord


def maybe_expire_record(rec: ChallengeRecord) -> bool:
    """
    If past expires_at and not both sides submitted, set status to expired.
    Returns True if the record was mutated.
    """
    st = (rec.status or "pending").lower()
    if st in ("completed", "cancelled", "expired", "declined"):
        return False
    if rec.expires_at is None:
        return False
    if datetime.now(timezone.utc) <= rec.expires_at:
        return False
    if rec.challenger_pushups is not None and rec.opponent_pushups is not None:
        return False
    rec.status = "expired"
    return True


def submit_attempt_blocked_reason(rec: ChallengeRecord) -> str | None:
    """After maybe_expire_record, return a reason if no further attempts are allowed."""
    st = (rec.status or "pending").lower()
    if st == "completed":
        return "Challenge is already complete."
    if st == "cancelled":
        return "Challenge was cancelled."
    if st == "expired":
        return "Challenge has expired."
    if st == "proposed":
        return "The opponent has not accepted this challenge yet."
    if st == "declined":
        return "This challenge was declined."
    return None


def lifecycle(
    rec: ChallengeRecord,
) -> Literal["proposed", "pending", "partial", "complete"]:
    st = (rec.status or "pending").lower()
    if st == "proposed":
        return "proposed"
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
