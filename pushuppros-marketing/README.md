# PushupPros marketing site

Static **Vite + React** app for [pushuppros.com](https://pushuppros.com) ([Linear XER-6](https://linear.app/xershare/issue/XER-6/create-static-react-marketing-site-for-pushuppros-pushupproscom)).

## Scripts

```bash
npm install
npm run dev      # local dev server
npm run build    # output to dist/
npm run lint
```

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

On the **landing** page, **Start Challenge** opens `/challenge` in a **new tab** (same site).

On **Pushups** guide pages, **Start a Pushup Challenge** links to **`https://xershare.com/pushup`** in a new tab (challenge app entry).
