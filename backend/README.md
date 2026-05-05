# Pushup API (FastAPI)

## Database (Postgres)

1. Set `DATABASE_URL` (e.g. `postgresql+psycopg://postgres:postgres@localhost:5432/pushup` from Docker Compose).
2. Run migrations from this directory:

```powershell
alembic upgrade head
```

If you hit **`version_num` too long** (see below), run `python scripts/fix_alembic_version_num.py` once, then `alembic upgrade head` again.

### Migration error: `version_num` too long (VARCHAR 32)

If Postgres raises **`StringDataRightTruncation`** / **value too long for type character varying(32)** while updating `alembic_version`, the revision id is longer than Alembic’s default column width.

**Option A (recommended):** from this directory, with `DATABASE_URL` set in `.env`:

```powershell
python scripts/fix_alembic_version_num.py
alembic upgrade head
```

**Option B:** run the SQL in [`scripts/fix_alembic_version_num.sql`](scripts/fix_alembic_version_num.sql) with `psql` or any SQL client, then `alembic upgrade head`.

Going forward, either keep `version_num` at VARCHAR(128)+ or use revision ids ≤ 32 characters in new Alembic files.

If `DATABASE_URL` is **unset**, challenges use the **in-memory** store (no billing/credit persistence).

## Local Postgres + pgAdmin

Use `docker-compose.yml` in this folder: `docker compose up -d`, then set `DATABASE_URL` to match `POSTGRES_*` and run `alembic upgrade head`.

## Solo sessions

Solo saves use **`POST /solo/session/prepare-upload`** (JSON: `reps`, optional `sessionId`, `contentType`, `videoSizeBytes`) to obtain a **presigned S3 PUT URL**, then the browser uploads the recording **directly to S3**, then **`POST /solo/session/complete-upload`** (JSON: `reps`, `sessionId`, optional `contentType` when a video was uploaded) creates the row after `HeadObject` verification. Reps-only sessions call **complete-upload** only. Requires a Clerk JWT and `DATABASE_URL`. The S3 object key is `solo/{user_id}/{session_id}.mp4`. Configure **`AWS_S3_BUCKET`** (+ region) and **bucket CORS** (allow `PUT`/`GET`/`HEAD` from your app origins). Rows expire per `VIDEO_TTL_HOURS`; see app/infra README for TTL cleanup.

## Env

See `.env.example` for `DATABASE_URL`, `CHALLENGE_RATE_LIMIT_DAILY`, Clerk, Stripe, Resend, and solo/S3 variables.
