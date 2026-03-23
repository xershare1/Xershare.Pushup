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
| `VITE_CHALLENGE_APP_URL` | Origin of the **product app** (`app/`), no trailing slash. **Start Challenge** and Pushups guide CTAs open this URL. Default in production: `https://app.pushuppros.com` if unset. |

Local [`.env.development`](.env.development) points to `http://localhost:5174` so the hero link matches the app dev server.

## Deploy

CDK deploys `marketing/dist` to S3 + CloudFront. See [`../infra/README.md`](../infra/README.md) for deploy flow.

Stacks: **`PushupProsMarketingDev`** (dev.pushuppros.com), **`PushupProsMarketingProd`** (pushuppros.com). Build before deploy: `npm run build`.

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
