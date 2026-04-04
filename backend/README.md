# PushupPros API (FastAPI)

Backend for PushupPros. App Runner uses `backend/` as the source directory (configure in console or pipeline).

## Environment

1. Copy [`.env.example`](.env.example) to `.env` in this directory.
2. Set **Clerk** (`CLERK_JWKS_URL`, `CLERK_JWT_ISSUER` from the Clerk Dashboard → **Configure** → **API keys**; JWKS URL is listed there).
3. Set **Stripe** keys and **Price** IDs for each bundle.
4. Set **`FRONTEND_URL`** to your app origin (e.g. `http://localhost:5174`).

On startup, `app/main.py` loads `.env` via `python-dotenv`. In production, configure the same variables on the host (App Runner, etc.); do not commit `.env`.

## Run locally

From repo root:

```powershell
pip install -r backend/requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend
```

Or from this directory:

```powershell
cd backend
pip install -r requirements.txt
python -m app.main
```

## Docker (optional)

```powershell
docker build -t pushup-api backend/
docker run -rm -p 8000:8000 pushup-api
```
