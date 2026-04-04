"""Persist outbound notification metadata (when DATABASE_URL is set)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.config import get_database_url
from app.db.models.notification import Notification
from app.db.session import session_scope


def log_email_notification(
    *,
    type_: str,
    recipient_email: str | None,
    subject: str,
    challenge_id: str | None,
    provider_message_id: str | None,
    error: str | None,
) -> None:
    if not get_database_url():
        return
    with session_scope() as session:
        now = datetime.now(timezone.utc)
        session.add(
            Notification(
                id=uuid.uuid4(),
                type=type_,
                channel="email",
                recipient_email=recipient_email,
                challenge_id=challenge_id,
                provider="resend",
                provider_message_id=provider_message_id,
                status="sent" if error is None and provider_message_id else ("failed" if error else "sent"),
                error_message=error,
                sent_at=now if error is None else None,
            )
        )
