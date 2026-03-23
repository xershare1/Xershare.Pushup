# PushupPros infrastructure

CDK app lives in [`cdk/`](cdk/). Run all commands from `cdk/`:

```powershell
cd infra/cdk
pip install -r requirements.txt
npx aws-cdk@2.1107.0 synth   # use at least 2.1107.0 (CLI must match aws-cdk-lib)
```

## Stacks

| Stack | Purpose | Region | Deploy order |
|-------|---------|--------|--------------|
| `PushupProsAcm` | ACM cert for pushuppros.com | us-east-1 | 1 |
| `PushupProsMarketingDev` | dev.pushuppros.com | us-east-2 | 2 |
| `PushupProsMarketingProd` | pushuppros.com | us-east-2 | 2 |
| `PushupProsAppDev` | app.dev.pushuppros.com | us-east-2 | 2 |
| `PushupProsAppProd` | app.pushuppros.com | us-east-2 | 2 |
| `PushupApiDev` | App Runner API (develop branch) | us-east-2 | 3 |
| `PushupApiProd` | App Runner API (production branch) | us-east-2 | 3 |

## Deploy flow

1. **ACM**: `cdk deploy PushupProsAcm` (us-east-1). Note the `CertificateArn` output.
2. **Build frontends** (set env vars for target environment first):
   ```powershell
   # Dev
   $env:VITE_CHALLENGE_APP_URL="https://app.dev.pushuppros.com"; $env:VITE_API_BASE_URL="https://api.dev.pushuppros.com"
   cd marketing; npm run build; cd ..
   cd app; npm run build; cd ..
   ```
3. **Marketing & app**: `cdk deploy PushupProsMarketingDev PushupProsAppDev -c certificateArn=<arn>`
4. **API**: `cdk deploy PushupApiDev -c githubConnectionArn=... -c githubRepositoryUrl=...`

### Using an existing App Runner service

If you already created an App Runner service manually and want CDK to reference it instead of creating a new one, pass the service ARN and URL:

```powershell
cdk deploy PushupApiDev -c existingAppRunnerServiceArnDev=<arn> -c existingAppRunnerServiceUrlDev=<url>
cdk deploy PushupApiProd -c existingAppRunnerServiceArnProd=<arn> -c existingAppRunnerServiceUrlProd=<url>
```

You can find the ARN and URL in the App Runner console. The URL looks like `https://xxxxx.us-east-2.awsapprunner.com`.

Ensure Route 53 has a hosted zone for `pushuppros.com`. App Runner source directory must be set to `backend/` manually.
