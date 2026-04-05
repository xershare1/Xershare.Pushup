"""User API response models (camelCase JSON)."""

from __future__ import annotations

from pydantic import BaseModel


class UserSyncOut(BaseModel):
    id: str
    clerkUserId: str
    email: str | None = None
    displayName: str | None = None
