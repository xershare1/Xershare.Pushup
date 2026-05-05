-- One-time fix when alembic upgrade fails with:
--   StringDataRightTruncation / value too long for type character varying(32)
-- Alembic's default alembic_version.version_num is VARCHAR(32); revision IDs in
-- this repo can be longer (e.g. 20260421120000_backfill_challenge_gifted_from_ledger).
--
-- Run against the same database as DATABASE_URL (once per database), then:
--   alembic upgrade head

ALTER TABLE alembic_version
  ALTER COLUMN version_num TYPE VARCHAR(128);
