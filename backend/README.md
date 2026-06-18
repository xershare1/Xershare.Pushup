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

Solo saves use **`POST /solo/session/prepare-upload`** (JSON: `reps`, optional `sessionId`, `contentType`, `videoSizeBytes`) with a **Clerk JWT** and **`DATABASE_URL`** set. The response picks a strategy from **`videoSizeBytes`** vs the server threshold (`SOLO_MULTIPART_THRESHOLD_BYTES`, default 100 MiB):

- **`uploadStrategy: simple_put`** — includes a **presigned S3 PUT URL** (`uploadUrl` + `uploadHeaders`). The browser **PUT**s the whole file to that URL, then calls **`POST /solo/session/complete-upload`** (JSON: `reps`, `sessionId`, optional `contentType` when a video was uploaded). The API verifies with **HeadObject** before persisting the row.
- **`uploadStrategy: multipart`** — no direct URL yet; the body includes multipart hints (`multipartThresholdBytes`, recommended part size, max concurrency). Then: **`POST /solo/session/multipart/init`** (same shape as prepare) returns **`uploadId`** and **`objectKey`**; **`POST /solo/session/multipart/presign-parts`** (JSON: `sessionId`, `uploadId`, `partNumbers`) returns presigned URLs per part; the browser **PUT**s each part to S3; **`POST /solo/session/multipart/complete`** (JSON: `sessionId`, `uploadId`) finishes the multipart upload in S3; finally **`POST /solo/session/complete-upload`** as above. Optional **`POST /solo/session/multipart/abort`** cancels an in-progress multipart.

Reps-only sessions call **complete-upload** only (no video). The S3 object key is **`solo/{user_id}/{session_id}.mp4`**. Configure **`AWS_S3_BUCKET`** (+ **`AWS_REGION`**), **bucket CORS** (allow `PUT`/`GET`/`HEAD` from your app origins), and **`SOLO_VIDEO_TTL_HOURS`** (default **720** ≈ 30 days) for solo row + S3 object retention. **Playback URLs** (`videoUrl` on list) are presigned/signed GET links that expire in **1 hour**; the app re-fetches the list to mint a new URL while the object still exists. Challenge video display uses separate **`VIDEO_TTL_HOURS`**; challenge **open window** uses **`CHALLENGE_EXPIRY_HOURS`**. Expired solo rows and S3 objects are purged hourly by the API background task.

## Env

See `.env.example` for `DATABASE_URL`, `CHALLENGE_RATE_LIMIT_DAILY`, Clerk, Stripe, Resend, and solo/S3 variables.
