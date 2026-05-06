"""User API response models (camelCase JSON)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class UserSyncOut(BaseModel):
    id: str
    clerkUserId: str
    email: str | None = None
    displayName: str | None = None
    voiceRepCounterEnabled: bool = False


class VoiceRepCounterPrefIn(BaseModel):
    voiceRepCounterEnabled: bool


class UserLookupOut(BaseModel):
    clerkUserId: str
    displayName: str | None = None


class ChallengeRecordEntry(BaseModel):
    challengeId: str
    opponentName: str
    userPushups: int
    opponentPushups: int
    outcome: Literal["win", "loss", "tie"]
    completedAt: str | None = None


class MyChallengeRecordOut(BaseModel):
    wins: int
    losses: int
    ties: int
    entries: list[ChallengeRecordEntry]
