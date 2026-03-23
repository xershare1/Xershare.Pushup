# PushupPros API (FastAPI)

Backend for PushupPros. App Runner uses `backend/` as the source directory (configure in console or pipeline).

## Run locally

From repo root:

```powershell
pip install -r backend/requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
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
