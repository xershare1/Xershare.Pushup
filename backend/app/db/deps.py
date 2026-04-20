"""FastAPI dependencies: optional Postgres vs in-memory challenge store."""

from __future__ import annotations

from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.challenges.repository import ChallengeRepositoryProtocol
from app.config import get_database_url
from app.db.session import get_db


def get_db_or_none() -> Generator[Session | None, None, None]:
    if not get_database_url():
        yield None
        return
    from app.db.session import get_session_factory

    SessionLocal = get_session_factory()
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db_required_session() -> Generator[Session, None, None]:
    """Postgres session; raises 503 when DATABASE_URL is unset."""
    if not get_database_url():
        raise HTTPException(
            status_code=503,
            detail="Database is not configured (DATABASE_URL).",
        )
    yield from get_db()


def get_challenge_repository(
    db: Annotated[Session | None, Depends(get_db_or_none)],
) -> ChallengeRepositoryProtocol:
    from app.challenges.db_repository import DbChallengeRepository
    from app.challenges.repository import memory_repo

    if db is None:
        return memory_repo
    return DbChallengeRepository(db)
