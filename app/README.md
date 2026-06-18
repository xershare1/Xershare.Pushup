# PushupPros app (product)

Standalone **Vite + React** client for the PushupPros **challenge flow** ([Linear XER-7](https://linear.app/xershare/issue/XER-7/create-react-pwa-app-for-pushuppros-core-challenge-experience)). This is separate from the marketing site in [`../marketing/`](../marketing/).

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

## Pose overlay (challenge video)

The challenge start screen runs **MoveNet** (TensorFlow.js `@tensorflow-models/pose-detection`, Thunder model) in `getUserMedia` on the WebGL backend and draws a skeleton on a canvas over the video—same stack as `xershare.web` (`usePreJoinRoom`, `UploadVideo`). BlazePose is not used.

Vite aliases `@mediapipe/pose` to a small shim because the published package is UMD-only and breaks ESM bundling; only MoveNet is needed at runtime.

## Pushup algorithm lab (dev only)

Route: `/dev/pushup-lab` (Vite `import.meta.env.DEV` only). Solo and challenge sessions share the same rep counter (`pushupRepTracking.ts` + `pushupService.ts`).

### Tune workflow

1. **Record** — Run a solo or challenge set in [`PushupSession`](src/components/pushupSession/PushupSession.tsx). On the results screen (dev), click **Analyze in pushup lab** or download the session video and upload it manually.
2. **Replay & tune** — In the lab, enable **Run analysis** while playing the video. Adjust thresholds in the panel (saved to `localStorage`). Optional: **Simulate framing-loss pause** and **Flip horizontal** for live-session parity. Set **Expected reps** to compare counts.
3. **Export** — **Download CSV** for trends (one row per frame); **Download JSON** includes `algorithmConfig`, `repEvents`, and full per-frame debug.
4. **Promote** — Copy tuned values into [`src/lib/pose/pushupAlgorithmConfig.ts`](src/lib/pose/pushupAlgorithmConfig.ts) (`DEFAULT_PUSHUP_ALGORITHM_CONFIG`), commit, and redeploy. Live solo and challenge pick up the new defaults automatically.

Shared config module: [`src/lib/pose/pushupAlgorithmConfig.ts`](src/lib/pose/pushupAlgorithmConfig.ts).

## Routes

| Path | Page |
|------|------|
| `/` | Home / entry |
| `/solo` | Solo pushup session |
| `/dev/pushup-lab` | Algorithm lab (dev only) |
| `/challenge`, `/challenge/create` | Create challenge (wizard) |
| `/challenge/start` | Redirects to `/challenge` (legacy URL) |
| `/c/:challengeId` | Challenge detail (share target) |
| `/c/:challengeId/submit` | Submit reps |
| `/c/:challengeId/result` | Redirects to `/c/:challengeId` (same screen) |
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
