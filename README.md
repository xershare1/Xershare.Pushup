# Xershare Pushup API

Minimal **FastAPI** service deployed to **AWS App Runner** with separate **dev** and **prod** stacks (AWS CDK, Python). Scope follows [Linear XER-5](https://linear.app/xershare/issue/XER-5/setup-fastapi-hello-world-app-with-dev-and-prod-aws-app-runner).

## API

| Method | Path      | Response |
|--------|-----------|----------|
| GET    | `/`       | `{"message": "Hello World"}` |
| GET    | `/health` | `{"status": "ok"}` |

## Run locally

From the repo root:

```powershell
.\.venv\Scripts\Activate.ps1   # or: py -3 -m venv .venv
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or: `python -m app.main` (uses `PORT` or `8000`).

## Docker

```powershell
docker build -t pushup-api .
docker run --rm -p 8000:8000 pushup-api
```

## App Runner configuration file (`apprunner.yaml`)

If the service uses **“Configure all settings from a configuration file”** (repository mode), App Runner reads [`apprunner.yaml`](apprunner.yaml) at the **repository root**.

This repo uses the **managed Python 3.11** runtime (`runtime: python311`, revised build): **`pre-run`** installs deps with **`pip3 install --no-cache-dir -r requirements.txt`** (recommended for the revised build); **`command`** runs **`python3 -m app.main`** so Uvicorn listens on App Runner’s **`PORT`** (see `app/main.py`). See [Using the Python platform](https://docs.aws.amazon.com/apprunner/latest/dg/service-source-code-python.html#service-source-code-python.callouts) and [Python runtime release information](https://docs.aws.amazon.com/apprunner/latest/dg/service-source-code-python-releases.html).

**Build vs deploy:** If logs show **“Successfully built”** but **“Failed to deploy”**, the image built but the running task failed (often **health checks** or **wrong listen port**). Check **CloudWatch → App Runner → your service → Application logs**. After changing CDK health/instance settings, run **`cdk deploy`** again.

The root [`Dockerfile`](Dockerfile) is **not** used by App Runner in this setup; keep it for **optional local** `docker build` / parity testing.

**Important:** With repository-based config, **`ENV` is defined in `apprunner.yaml`**, not in CDK. The template uses `ENV=dev` for **`develop`**. On the **`production`** branch, set `run.env` → `value: prod` for `ENV` (commit that on `production`, or resolve it when you merge `develop` → `production` so prod does not stay on `dev`).

CDK: [`infra/lib/pushup_apprunner_service.py`](infra/lib/pushup_apprunner_service.py) uses `configuration_source="REPOSITORY"`.

## Infrastructure (CDK)

Code lives under [`infra/`](infra/).

### Prerequisites

1. **Python**: use the repo `.venv` and install CDK deps:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   pip install -r infra\requirements.txt
   ```

2. **AWS CLI** configured (`aws configure` or SSO) for the account/region you deploy to.

3. **AWS CDK CLI**: use a **recent** CLI so it matches `aws-cdk-lib` (schema errors mean the CLI is too old). Example:

   ```powershell
   npx aws-cdk@2.1107.0 --version
   ```

   Or install a current global `cdk` that matches your `aws-cdk-lib` major version.

4. **GitHub → AWS (CodeConnections)**: in the AWS console, create a **CodeConnections** connection to GitHub and wait until status is **Available**. You need the **connection ARN** for deploy.

5. **Bootstrap** (once per account/region):

   ```powershell
   npx aws-cdk@2.1107.0 bootstrap aws://ACCOUNT/REGION
   ```

### Context (required for real deploy)

Set your GitHub connection and repo URL. Either copy the example file:

```powershell
copy infra\cdk.context.example.json infra\cdk.context.json
# edit infra\cdk.context.json — not committed (see .gitignore)
```

Or pass flags:

```text
-c githubConnectionArn=arn:aws:codestar-connections:REGION:ACCOUNT:connection/UUID
-c githubRepositoryUrl=https://github.com/ORG/REPO
```

If context is missing, `cdk synth` still works but uses **placeholders** and shows **warnings** — replace with real values before `cdk deploy`.

### Stacks

| Stack          | App Runner service   | Git branch    | `ENV`   |
|----------------|----------------------|---------------|---------|
| `PushupApiDev` | `pushup-api-dev`     | `develop`     | `dev`   |
| `PushupApiProd`| `pushup-api-prod`    | `production`  | `prod`  |

### Synth & deploy

From repo root (with venv activated so `python` resolves):

```powershell
cd infra
$env:PYTHONPATH = "."
npx aws-cdk@2.1107.0 synth
npx aws-cdk@2.1107.0 deploy PushupApiDev PushupApiProd -c githubConnectionArn="..." -c githubRepositoryUrl="https://github.com/ORG/REPO"
```

Deploy one stack at a time if you prefer:

```powershell
npx aws-cdk@2.1107.0 deploy PushupApiDev -c githubConnectionArn="..." -c githubRepositoryUrl="..."
```

After deploy, note the **ServiceUrl** output for each stack.

### Promotion (branches)

- **Dev**: push to **`develop`** — App Runner can auto-rebuild when **Auto deploy** is enabled (as defined in CDK).
- **Prod**: merge or PR **`develop` → `production`** so the prod service (tracking **`production`**) picks up the release.
- After a merge, confirm **`apprunner.yaml`** on **`production`** has `ENV: prod` (see [App Runner configuration file](#app-runner-configuration-file-apprunneryaml)).

## Layout

```text
app/
  main.py
requirements.txt
Dockerfile               # optional: local container; App Runner uses apprunner.yaml
apprunner.yaml           # managed python311 build/run (port, ENV, …)
infra/
  app.py                 # CDK entry
  cdk.json
  requirements.txt       # aws-cdk-lib + constructs
  lib/
    pushup_apprunner_service.py
  stacks/
    dev_stack.py
    prod_stack.py
```
