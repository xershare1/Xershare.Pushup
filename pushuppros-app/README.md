# PushupPros app (product)

Standalone **Vite + React** client for the PushupPros **challenge flow** ([Linear XER-7](https://linear.app/xershare/issue/XER-7/create-react-pwa-app-for-pushuppros-core-challenge-experience)). This is separate from the marketing site in [`../pushuppros-marketing/`](../pushuppros-marketing/).

**MVP loop:** Create → Share → Respond → Result.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5174 (see vite.config.ts; marketing uses 5173)
npm run build    # output to dist/
npm run lint
```

Styles are shared with the marketing site via [`../shared/pushuppros-theme/`](../shared/pushuppros-theme/) — edit `theme.css` imports there to keep both sites aligned.

## Environment

Copy [`.env.example`](.env.example) to `.env.development` or configure variables in your host (Netlify, Vercel, S3 static hosting env, etc.).

| Variable | Purpose |
|----------|---------|
| `VITE_USE_MOCK_API` | Set to `true` to use the **in-browser mock** API (persisted in `localStorage`). No FastAPI required. |
| `VITE_API_BASE_URL` | Base URL for the FastAPI service **without trailing slash** (e.g. `http://localhost:8000`). Required when **not** using the mock API. |

Default local dev (`.env.development`) enables the mock so you can build the UI without backend challenge routes.

## Routes

| Path | Page |
|------|------|
| `/` | Home / entry |
| `/challenge/create` | Create challenge |
| `/c/:challengeId` | Challenge detail (share target) |
| `/c/:challengeId/submit` | Submit reps |
| `/c/:challengeId/result` | Result |
| `/leaderboard` | Leaderboard (stub / optional API) |

## API layer

- [`src/api/challenges.ts`](src/api/challenges.ts) — facade: mock vs real.
- [`src/api/real/challenges.ts`](src/api/real/challenges.ts) — `fetch` to FastAPI (`POST /challenges`, `GET /challenges/:id`, etc.).
- [`src/api/mock/`](src/api/mock/) — mock persistence and behavior until backend endpoints exist.

Request/response types live under [`src/types/challenge.ts`](src/types/challenge.ts). When the backend uses different JSON field names, add mapping in the real client only.

## PWA

The app is structured so a future change can add installability, a service worker, offline behavior, and push — **not implemented** in this ticket.

## Deploy

Build produces static assets in `dist/`. Host independently from the marketing site; set `VITE_API_BASE_URL` and `VITE_USE_MOCK_API` for each environment.
