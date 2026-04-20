"""Background tasks and modules that cannot use FastAPI Depends — unified repo access."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from app.challenges.repository import ChallengeRepositoryProtocol, memory_repo
from app.config import get_database_url


@contextmanager
def challenge_repo_context() -> Iterator[ChallengeRepositoryProtocol]:
    if not get_database_url():
        yield memory_repo
        return
    from app.challenges.db_repository import DbChallengeRepository
    from app.db.session import session_scope

    with session_scope() as session:
        yield DbChallengeRepository(session)
