"""Challenge row."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    challenger_name: Mapped[str] = mapped_column(String(255), nullable=False)
    opponent_name: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    challenger_pushups: Mapped[int | None] = mapped_column(Integer, nullable=True)
    opponent_pushups: Mapped[int | None] = mapped_column(Integer, nullable=True)
    challenger_email: Mapped[str | None] = mapped_column(String(512), nullable=True)
    opponent_email: Mapped[str | None] = mapped_column(String(512), nullable=True)
    challenger_clerk_user_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    opponent_clerk_user_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        server_default="pending",
        index=True,
    )
    initiator_clerk_user_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    opponent_is_member: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    rules_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # True = challenger paid for opponent's entry (2 credits at send; opponent pay 0 on accept)
    gifted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    attempts: Mapped[list["ChallengeAttempt"]] = relationship(
        "ChallengeAttempt",
        back_populates="challenge",
        cascade="all, delete-orphan",
    )
