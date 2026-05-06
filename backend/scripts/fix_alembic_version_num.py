"""Widen alembic_version.version_num for long Alembic revision ids (default is VARCHAR 32)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

_backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_backend_dir))
load_dotenv(_backend_dir / ".env")

from app.db.session import normalize_postgresql_url_for_sqlalchemy  # noqa: E402


def main() -> None:
    raw = os.getenv("DATABASE_URL")
    if not raw or not str(raw).strip():
        print("DATABASE_URL not set; skip (in-memory / no Postgres).")
        sys.exit(0)
    url = normalize_postgresql_url_for_sqlalchemy(str(raw).strip())
    engine = create_engine(url)
    stmt = text(
        """
        DO $body$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'alembic_version'
          ) THEN
            ALTER TABLE public.alembic_version
              ALTER COLUMN version_num TYPE VARCHAR(128);
          END IF;
        END
        $body$;
        """
    )
    with engine.connect() as conn:
        conn.execute(stmt)
        conn.commit()
    print("alembic_version.version_num widened to VARCHAR(128) (if table existed).")


if __name__ == "__main__":
    main()
