"""Email suppression list — DB when configured."""

from __future__ import annotations

from sqlalchemy import select

from app.config import get_database_url
from app.db.models.email_suppression import EmailSuppression
from app.db.session import session_scope


def is_suppressed(email: str) -> bool:
    em = (email or "").strip().lower()
    if not em:
        return False
    if not get_database_url():
        return False
    with session_scope() as session:
        row = session.scalars(
            select(EmailSuppression).where(EmailSuppression.email == em)
        ).first()
        return row is not None
