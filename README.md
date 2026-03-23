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
