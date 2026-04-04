"""Delete expired solo session rows and their S3 objects."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select

from app.config import get_database_url
from app.db.models.solo_session import SoloSession
from app.solo.s3_storage import delete_s3_object


def purge_expired_solo_sessions() -> int:
    """Remove sessions with expires_at < now. Returns deleted row count."""
    if not get_database_url():
        return 0

    from app.db.session import session_scope

    now = datetime.now(timezone.utc)
    with session_scope() as session:
        rows = session.scalars(
            select(SoloSession).where(SoloSession.expires_at < now)
        ).all()
        n = 0
        for r in rows:
            if r.video_s3_key:
                delete_s3_object(r.video_s3_key)
            session.delete(r)
            n += 1
        return n
