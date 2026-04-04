"""Challenge persistence — in-memory (default) or Postgres via DbChallengeRepository."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal, Protocol

from app.challenges.logic import maybe_expire_record, submit_attempt_blocked_reason
from app.challenges.schemas import ChallengeOut, CreateChallengeBody
from app.config import get_challenge_expiry_hours


def _norm_clerk_id(raw: str | None) -> str | None:
    if raw is None or not str(raw).strip():
        return None
    return str(raw).strip()


def _norm_idempotency_key(raw: str | None) -> str | None:
    if raw is None or not str(raw).strip():
        return None
    return str(raw).strip()[:128]


@dataclass
class ChallengeRecord:
    id: str
    challenger_name: str
    opponent_name: str
    message: str | None = None
    challenger_pushups: int | None = None
    opponent_pushups: int | None = None
    challenger_email: str | None = None
    opponent_email: str | None = None
    challenger_clerk_user_id: str | None = None
    opponent_clerk_user_id: str | None = None
    status: str = "pending"
    expires_at: datetime | None = None

    def to_out(self) -> ChallengeOut:
        return ChallengeOut(
            id=self.id,
            challengerName=self.challenger_name,
            opponentName=self.opponent_name,
            message=self.message,
            challengerPushups=self.challenger_pushups,
            opponentPushups=self.opponent_pushups,
            challengerEmail=self.challenger_email,
            opponentEmail=self.opponent_email,
            challengerClerkUserId=self.challenger_clerk_user_id,
            opponentClerkUserId=self.opponent_clerk_user_id,
            status=self.status,
            expiresAt=self.expires_at,
        )


def _sync_rec_status(rec: ChallengeRecord) -> None:
    st = (rec.status or "pending").lower()
    if st in ("cancelled", "expired"):
        return
    a = rec.challenger_pushups is not None
    b = rec.opponent_pushups is not None
    if a and b:
        rec.status = "completed"
    elif a or b:
        rec.status = "active"
    else:
        rec.status = "pending"


class ChallengeRepositoryProtocol(Protocol):
    def create(
        self, body: CreateChallengeBody, *, idempotency_key: str | None = None
    ) -> ChallengeRecord: ...

    def get(self, challenge_id: str) -> ChallengeRecord | None: ...

    def upsert(self, rec: ChallengeRecord) -> None: ...

    def all_records(self) -> list[ChallengeRecord]: ...

    def apply_attempt(
        self,
        challenge_id: str,
        *,
        role: Literal["challenger", "opponent"],
        pushup_count: int,
    ) -> ChallengeRecord: ...


class ChallengeRepository:
    """In-memory store (used when DATABASE_URL is unset)."""

    def __init__(self) -> None:
        self._by_id: dict[str, ChallengeRecord] = {}
        self._idem: dict[tuple[str, str], str] = {}

    def create(
        self, body: CreateChallengeBody, *, idempotency_key: str | None = None
    ) -> ChallengeRecord:
        init = _norm_clerk_id(body.challengerClerkUserId)
        ikey = _norm_idempotency_key(idempotency_key)
        if ikey and init:
            existing_id = self._idem.get((init, ikey))
            if existing_id:
                existing = self.get(existing_id)
                if existing:
                    return existing

        cid = str(uuid.uuid4())
        hours = get_challenge_expiry_hours()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)
        rec = ChallengeRecord(
            id=cid,
            challenger_name=body.challengerName.strip(),
            opponent_name=body.opponentName.strip(),
            message=body.message.strip() if body.message and body.message.strip() else None,
            challenger_email=_norm_email(body.challengerEmail),
            opponent_email=_norm_email(body.opponentEmail),
            challenger_clerk_user_id=init,
            opponent_clerk_user_id=_norm_clerk_id(body.opponentClerkUserId),
            status="pending",
            expires_at=expires_at,
        )
        self._by_id[cid] = rec
        if ikey and init:
            self._idem[(init, ikey)] = cid
        return rec

    def get(self, challenge_id: str) -> ChallengeRecord | None:
        rec = self._by_id.get(challenge_id)
        if rec is None:
            return None
        if maybe_expire_record(rec):
            self._by_id[rec.id] = rec
        return rec

    def upsert(self, rec: ChallengeRecord) -> None:
        self._by_id[rec.id] = rec

    def all_records(self) -> list[ChallengeRecord]:
        return list(self._by_id.values())

    def apply_attempt(
        self,
        challenge_id: str,
        *,
        role: Literal["challenger", "opponent"],
        pushup_count: int,
    ) -> ChallengeRecord:
        rec = self.get(challenge_id)
        if not rec:
            raise KeyError(challenge_id)
        reason = submit_attempt_blocked_reason(rec)
        if reason:
            raise ValueError(reason)
        if role == "challenger":
            if rec.challenger_pushups is not None:
                raise ValueError("Challenger has already submitted.")
            rec.challenger_pushups = pushup_count
        else:
            if rec.opponent_pushups is not None:
                raise ValueError("Opponent has already submitted.")
            rec.opponent_pushups = pushup_count
        _sync_rec_status(rec)
        self.upsert(rec)
        return rec


def _norm_email(raw: str | None) -> str | None:
    if raw is None or not str(raw).strip():
        return None
    return str(raw).strip()


memory_repo = ChallengeRepository()
repo = memory_repo
