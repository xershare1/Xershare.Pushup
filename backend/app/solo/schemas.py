"""Solo session API models (camelCase JSON)."""

from __future__ import annotations

from pydantic import BaseModel


class SoloSessionOut(BaseModel):
    sessionId: str
    reps: int
    videoUrl: str | None = None
