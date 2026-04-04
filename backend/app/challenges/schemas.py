"""Pydantic models aligned with the React client (camelCase JSON)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class CreateChallengeBody(BaseModel):
    challengerName: str
    opponentName: str
    message: str | None = None
    # Display-only labels; never used for automated email sends
    challengerEmail: str | None = None
    opponentEmail: str | None = None
    # Member path: verified server-side via Clerk; emails go to Clerk primary email only
    challengerClerkUserId: str | None = None
    opponentClerkUserId: str | None = None


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


class CreateChallengeResponse(BaseModel):
    challenge: ChallengeOut
    shareLink: str
    notificationSent: bool


class SubmitAttemptBody(BaseModel):
    participantName: str
    pushupCount: float
    role: Literal["challenger", "opponent"]


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
