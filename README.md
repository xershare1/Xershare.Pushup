# Xershare Pushup

Monorepo for **PushupPros**: backend API, marketing site, product app, and infrastructure.

## Layout

```text
backend/           # Python FastAPI — App Runner source directory
  app/
  apprunner.yaml
  Dockerfile
  requirements.txt

marketing/         # Marketing site (Vite React) → S3 + CloudFront
app/               # Product app (Vite React) → S3 + CloudFront
shared/
  pushuppros-theme/   # Shared CSS

infra/
  cdk/             # CDK app (run from here)
    app.py
    cdk.json
    stacks/
      acm_stack.py         # us-east-1
      marketing_stack.py
      app_stack.py
      dev_stack.py
      prod_stack.py
    lib/
```

## API

| Method | Path      | Response |
|--------|-----------|----------|
| GET    | `/`       | `{"message": "Hello World"}` |
| GET    | `/health` | `{"status": "ok"}` |

## Run locally

### One-click dev stack (Windows)

From the repo root `Xershare.Pushup/`:

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (daemon running or the script will try to start it), `ngrok` on your `PATH` (with an account that can use your reserved hostname, e.g. `client-pro.ngrok.app`), Node.js/npm for the frontends, and [`backend/.venv`](backend/) with dependencies installed.

```powershell
pwsh -File .\scripts\start-dev-stack.ps1
```

This will:

1. Wait for Docker (and start Docker Desktop if needed).
2. Run `docker compose up -d db pgadmin` in the sibling [`../Xershare.Core`](../Xershare.Core) (Postgres + pgAdmin only — no Core FastAPI on port 8000).
3. Open separate windows for: Pushup API (uvicorn on `127.0.0.1:8000`), `ngrok http 8000`, `ngrok http 5174 --url client-pro.ngrok.app`, `npm run dev` in [`app/`](app/), and `npm run dev` in [`marketing/`](marketing/).

To start the API under **debugpy** (attach your IDE to `127.0.0.1:5678`; ensure `debugpy` is installed in `backend/.venv`):

```powershell
pwsh -File .\scripts\start-dev-stack.ps1 -Debug
```

If `Xershare.Core` lives somewhere other than next to `Xershare.Pushup`, pass the monorepo root explicitly:

```powershell
pwsh -File .\scripts\start-dev-stack.ps1 -MonorepoRoot 'C:\path\to\Xershare.Master'
```

You still need matching `VITE_API_BASE_URL`, `CORS_EXTRA_ORIGINS`, and Clerk allowlists for whatever ngrok URLs you use.

### Manual commands

**Backend**

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Marketing** → http://localhost:5173

```powershell
cd marketing && npm install && npm run dev
```

**Product app** → http://localhost:5174

```powershell
cd app && npm install && npm run dev
```

See [`marketing/README.md`](marketing/README.md) and [`app/README.md`](app/README.md).

## Deploy

CDK lives in [`infra/cdk/`](infra/cdk/). See [`infra/README.md`](infra/README.md) for stack list and deploy flow.

1. Deploy `PushupProsAcm` in us-east-1.
2. Build marketing and app, then deploy marketing/app stacks with `-c certificateArn=<arn>`.
3. Deploy API stacks (App Runner). Set source directory to `backend/` in the service config.

Domains: `pushuppros.com`, `dev.pushuppros.com`, `app.pushuppros.com`, `app.dev.pushuppros.com` (Route 53).
