"""Accept / decline / cancel proposed challenges."""

from __future__ import annotations

from app.challenges.repository import ChallengeRecord, ChallengeRepositoryProtocol


def _strip(s: str | None) -> str:
    return (s or "").strip()


def accept_proposed(
    repo: ChallengeRepositoryProtocol,
    challenge_id: str,
    actor_clerk_user_id: str,
) -> ChallengeRecord:
    rec = repo.get(challenge_id)
    if not rec:
        raise KeyError(challenge_id)
    st = (rec.status or "").lower()
    if st != "proposed":
        raise ValueError("This challenge is not waiting for acceptance.")
    actor = _strip(actor_clerk_user_id)
    ch = _strip(rec.challenger_clerk_user_id)
    op = _strip(rec.opponent_clerk_user_id)
    if not ch:
        raise ValueError("This challenge cannot be accepted (missing challenger).")
    if op:
        if actor != op:
            raise PermissionError("You are not the invited opponent for this challenge.")
    else:
        if actor == ch:
            raise PermissionError("You cannot accept your own challenge.")
        rec.opponent_clerk_user_id = actor
    rec.status = "pending"
    repo.upsert(rec)
    updated = repo.get(challenge_id)
    if not updated:
        raise KeyError(challenge_id)
    return updated


def decline_proposed(
    repo: ChallengeRepositoryProtocol,
    challenge_id: str,
    actor_clerk_user_id: str,
) -> ChallengeRecord:
    rec = repo.get(challenge_id)
    if not rec:
        raise KeyError(challenge_id)
    st = (rec.status or "").lower()
    if st != "proposed":
        raise ValueError("This challenge is not waiting for a response.")
    actor = _strip(actor_clerk_user_id)
    ch = _strip(rec.challenger_clerk_user_id)
    op = _strip(rec.opponent_clerk_user_id)
    if not ch:
        raise ValueError("This challenge cannot be declined (missing challenger).")
    if op:
        if actor != op:
            raise PermissionError("You are not the invited opponent for this challenge.")
    else:
        if actor == ch:
            raise PermissionError("You cannot decline your own challenge.")
    rec.status = "declined"
    repo.upsert(rec)
    updated = repo.get(challenge_id)
    if not updated:
        raise KeyError(challenge_id)
    return updated


def cancel_proposed(
    repo: ChallengeRepositoryProtocol,
    challenge_id: str,
    actor_clerk_user_id: str,
) -> ChallengeRecord:
    rec = repo.get(challenge_id)
    if not rec:
        raise KeyError(challenge_id)
    st = (rec.status or "").lower()
    if st != "proposed":
        raise ValueError("Only a pending proposal can be cancelled.")
    actor = _strip(actor_clerk_user_id)
    ch = _strip(rec.challenger_clerk_user_id)
    if actor != ch:
        raise PermissionError("Only the challenger can cancel this proposal.")
    rec.status = "cancelled"
    repo.upsert(rec)
    updated = repo.get(challenge_id)
    if not updated:
        raise KeyError(challenge_id)
    return updated
