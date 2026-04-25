"""Pydantic models aligned with the React client (camelCase JSON)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class CreateChallengeBody(BaseModel):
    challengerName: str
    opponentName: str
    message: str | None = None
    # Optional; client often omits these. Server may persist challenger from body;
    # for ``opponentClerkUserId`` challenges, opponent may be filled from ``users.email``.
    challengerEmail: str | None = None
    opponentEmail: str | None = None
    # Member path: verified server-side via Clerk; emails go to Clerk primary email only
    challengerClerkUserId: str | None = None
    opponentClerkUserId: str | None = None
    # True = pay 2 credits at send; opponent accepts for free. Default: pay 1 (standard).
    coverOpponentEntry: bool = False


class ChallengeOut(BaseModel):
    id: str
    challengerName: str
    opponentName: str
    message: str | None = None
    challengerPushups: int | None = None
    opponentPushups: int | None = None
    challengerEmail: str | None = None
    opponentEmail: str | None = None
    challengerClerkUserId: str | None = None
    opponentClerkUserId: str | None = None
    status: str | None = None
    expiresAt: datetime | None = None
    gifted: bool = False


class CreateChallengeResponse(BaseModel):
    challenge: ChallengeOut
    shareLink: str
    notificationSent: bool
    balanceAfter: int | None = None


class SubmitAttemptBody(BaseModel):
    participantName: str
    pushupCount: float
    role: Literal["challenger", "opponent"]


class ChallengeVideoItemOut(BaseModel):
    challengeId: str
    role: Literal["challenger", "opponent"]
    pushupCount: int
    submittedAt: datetime
    videoUrl: str | None = None


class ChallengeOutcomeOut(BaseModel):
    challengeId: str
    challengerName: str
    opponentName: str
    challengerPushups: int
    opponentPushups: int
    winner: Literal["challenger", "opponent", "tie"]


class LeaderboardEntryOut(BaseModel):
    rank: int
    displayName: str
    bestPushups: int


class OkOut(BaseModel):
    ok: bool
