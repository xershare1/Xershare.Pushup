# PushupPros marketing site

Static **Vite + React** app for [pushuppros.com](https://pushuppros.com) ([Linear XER-6](https://linear.app/xershare/issue/XER-6/create-static-react-marketing-site-for-pushuppros-pushupproscom)).

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173 (see vite.config.ts)
npm run build    # output to dist/
npm run lint
```

Styles are shared with the product app via [`../shared/pushuppros-theme/`](../shared/pushuppros-theme/) — edit `theme.css` imports there to keep both sites aligned.

## Environment

| Variable | Purpose |
|----------|---------|
| `VITE_CHALLENGE_APP_URL` | Origin of the **product app** (`pushuppros-app`), no trailing slash. **Start Challenge** and Pushups guide CTAs open this URL. Default in production builds: `https://xershare.com/pushup` if unset. |

Local [`.env.development`](.env.development) points to `http://localhost:5174` so the hero link matches the app dev server.

## Deploy (S3 + CloudFront)

Infrastructure is defined in [`../infra/stacks/pushup_pros_web_stack.py`](../infra/stacks/pushup_pros_web_stack.py) as stack **`PushupProsWeb`**.

1. **Deploy the stack** (once): from `infra/`, `cdk deploy PushupProsWeb`
2. Note **SiteBucketName**, **CloudFrontDistributionId**, **CloudFrontDomainName** from stack outputs.
3. **Build and upload**:

   ```bash
   npm run build
   aws s3 sync dist/ s3://SITE_BUCKET_NAME --delete
   aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"
   ```

4. **DNS**: Create a **CNAME** (or Route 53 alias) for `pushuppros.com` → CloudFront domain name. For HTTPS on a custom domain, add an **ACM certificate in us-east-1** and attach it to the distribution (future CDK iteration or console).

## Routes

| Path | Page |
|------|------|
| `/` | Landing |
| `/how-it-works` | How it works |
| `/challenge` | Challenge shell |
| `/pushups/history` | Pushups — history |
| `/pushups/variations` | Pushups — variations |
| `/pushups/form` | Pushups — form |
| `/pushups/training` | Pushups — training |
| `/pushups/records` | Pushups — records / leaderboard placeholder |

On the **landing** page, **Start Challenge** opens the **product app** (`VITE_CHALLENGE_APP_URL`) in a **new tab**.

On **Pushups** guide pages, **Start a Pushup Challenge** uses the same URL.
