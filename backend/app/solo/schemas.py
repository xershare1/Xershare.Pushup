"""Solo session API models (camelCase JSON)."""

from __future__ import annotations

from pydantic import BaseModel


class SoloSessionOut(BaseModel):
    sessionId: str
    reps: int
    videoUrl: str | None = None


class SoloSessionListItem(BaseModel):
    sessionId: str
    reps: int
    createdAt: str
    expiresAt: str
    videoUrl: str | None = None


class SoloSessionListOut(BaseModel):
    sessions: list[SoloSessionListItem]
