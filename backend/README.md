# Pushup API (FastAPI)

## Database (Postgres)

1. Set `DATABASE_URL` (e.g. `postgresql+psycopg://postgres:postgres@localhost:5432/pushup` from Docker Compose).
2. Run migrations from this directory:

```powershell
alembic upgrade head
```

If `DATABASE_URL` is **unset**, challenges use the **in-memory** store (no billing/credit persistence).

## Local Postgres + pgAdmin

Use `docker-compose.yml` in this folder: `docker compose up -d`, then set `DATABASE_URL` to match `POSTGRES_*` and run `alembic upgrade head`.

## Solo sessions

`POST /solo/session` accepts multipart form fields `reps` (required) and `video` (optional). Requires a Clerk session JWT (`Authorization: Bearer`) and `DATABASE_URL`. Each row stores reps, timestamps, and optional S3 object key `solo/{user_id}/{session_id}.mp4`. Rows expire after `VIDEO_TTL_HOURS` (default 24); a background task runs hourly to delete expired database rows and matching S3 objects. Set `AWS_S3_BUCKET` (and `AWS_REGION` if not `us-east-1`) to enable video uploads; reps-only sessions work without S3.

## Env

See `.env.example` for `DATABASE_URL`, `CHALLENGE_RATE_LIMIT_DAILY`, Clerk, Stripe, Resend, and solo/S3 variables.
