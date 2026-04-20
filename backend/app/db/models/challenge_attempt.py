"""One submission per participant (challenger or opponent)."""

from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ChallengeAttempt(Base):
    __tablename__ = "challenge_attempts"
    __table_args__ = (
        UniqueConstraint("challenge_id", "participant_role", name="uq_challenge_attempt_role"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    challenge_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("challenges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    participant_role: Mapped[str] = mapped_column(String(16), nullable=False)
    clerk_user_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pushup_count: Mapped[int] = mapped_column(Integer, nullable=False)
    video_s3_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    challenge: Mapped["Challenge"] = relationship("Challenge", back_populates="attempts")
