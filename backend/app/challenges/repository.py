"""In-memory challenge store (swap for DB later)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from app.challenges.schemas import CreateChallengeBody, ChallengeOut


def _norm_clerk_id(raw: str | None) -> str | None:
    if raw is None or not str(raw).strip():
        return None
    return str(raw).strip()


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
        )


class ChallengeRepository:
    def __init__(self) -> None:
        self._by_id: dict[str, ChallengeRecord] = {}

    def create(self, body: CreateChallengeBody) -> ChallengeRecord:
        cid = str(uuid.uuid4())
        rec = ChallengeRecord(
            id=cid,
            challenger_name=body.challengerName.strip(),
            opponent_name=body.opponentName.strip(),
            message=body.message.strip() if body.message and body.message.strip() else None,
            challenger_email=_norm_email(body.challengerEmail),
            opponent_email=_norm_email(body.opponentEmail),
            challenger_clerk_user_id=_norm_clerk_id(body.challengerClerkUserId),
            opponent_clerk_user_id=_norm_clerk_id(body.opponentClerkUserId),
        )
        self._by_id[cid] = rec
        return rec

    def get(self, challenge_id: str) -> ChallengeRecord | None:
        return self._by_id.get(challenge_id)

    def upsert(self, rec: ChallengeRecord) -> None:
        self._by_id[rec.id] = rec

    def all_records(self) -> list[ChallengeRecord]:
        return list(self._by_id.values())


def _norm_email(raw: str | None) -> str | None:
    if raw is None or not str(raw).strip():
        return None
    return str(raw).strip()


repo = ChallengeRepository()
