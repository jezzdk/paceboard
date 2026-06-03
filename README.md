# 🏃 Paceboard

**A single-page engineering flow dashboard, built to live on a TV.**

Paceboard pulls issue data from Linear and distills it into a glanceable view of delivery health: throughput, cycle time, flow efficiency, aging work, and review load.

---

## What it shows

- **KPI strip** — started vs. finished, cycle time, WIP, flow efficiency, with sparkline trends.
- **Started vs. finished** — daily/weekly flow over the selected period.
- **Flow trend** — cycle-time and throughput trend.
- **Flow efficiency** — active vs. waiting time, with configurable waiting patterns.
- **Aging panel** — in-progress issues that have been sitting too long.
- **Review panel** — issues waiting on review.
- **Team table** — per-assignee breakdown of in-flight work.

---

## Tech stack

- [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`) + [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite`
- [Chart.js](https://www.chartjs.org/) for charts
- [Linear GraphQL API](https://developers.linear.app/) — issues, teams, viewer
- ESLint (flat config) + Prettier
- No backend — runs entirely in the browser, state in `localStorage`

---

## Getting started

### Prerequisites

- Node.js 18+
- A Linear account with API access

### Run locally

```bash
git clone https://github.com/yourname/paceboard.git
cd paceboard
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Sign in with **Connect with Linear** (OAuth), or expand **Or enter a personal API key** to paste a key directly.

### Linear OAuth (primary)

OAuth needs a tiny Cloudflare Worker to exchange the authorization code for a token — the client secret never touches the browser. See [OAuth setup](#oauth-setup) to run it locally.

### Linear API key (fallback)

1. Go to [linear.app/settings/api](https://linear.app/settings/api)
2. Create a **Personal API key**
3. Paste it into the Paceboard setup screen

Either way the token is stored in your browser's `localStorage` and sent only to `api.linear.app`.

### OAuth setup

1. Go to [linear.app/settings/api/applications](https://linear.app/settings/api/applications) → **New application**
2. Set the callback URL to `http://localhost:5173` (and your production URL)
3. Copy the **Client ID** → set `VITE_LINEAR_CLIENT_ID` in `.env`
4. Copy the **Client Secret** → set `LINEAR_CLIENT_SECRET` in `worker/.dev.vars`

Run the worker locally:

```bash
cd worker
npx wrangler dev   # serves on http://localhost:8787
```

Point the frontend at it with `VITE_LINEAR_WORKER_URL=http://localhost:8787`. For production, `cd worker && npx wrangler deploy` and set `LINEAR_CLIENT_ID` / `LINEAR_CLIENT_SECRET` as Worker Secrets.

---

## Scripts

```bash
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # production build to dist/
npm run preview    # preview the built bundle
npm run lint       # ESLint
npm run lint:fix   # ESLint with autofix
npm run format     # Prettier
```

---

## Environment variables

All optional. Vite exposes variables prefixed with `VITE_` or `LINEAR_` to the client (see `vite.config.js`).

| Variable | Description |
|---|---|
| `VITE_LINEAR_CLIENT_ID` | Linear OAuth app client ID — enables the "Connect with Linear" button. |
| `VITE_LINEAR_WORKER_URL` | URL of the Cloudflare Worker that exchanges the OAuth code for a token. |
| `LINEAR_API_TOKEN` | Skip the setup screen by baking a token into the build. Useful for private/kiosk deployments. **Never commit a real token.** |

The worker reads its own secrets (`LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`) from `worker/.dev.vars` locally — see `worker/.dev.vars.example`.

Create a `.env.local` (gitignored) to set them locally.

---

## Deployment

A production deploy has two parts: the **static frontend** and the **OAuth worker**. Deploy the worker first so you have its URL for the frontend's `VITE_LINEAR_WORKER_URL`.

### 1. Worker (Cloudflare)

```bash
cd worker
npx wrangler deploy
```

Then set the worker's secrets (these are read from `worker/.dev.vars` locally, but **`.dev.vars` is not deployed** — you must set them as Worker Secrets):

```bash
npx wrangler secret put LINEAR_CLIENT_ID
npx wrangler secret put LINEAR_CLIENT_SECRET
```

| Worker secret | Where to get it |
|---|---|
| `LINEAR_CLIENT_ID` | Linear OAuth app → Client ID |
| `LINEAR_CLIENT_SECRET` | Linear OAuth app → Client Secret |

`wrangler deploy` prints the worker URL (e.g. `https://paceboard-auth.<subdomain>.workers.dev`). Add your production origin to `ALLOWED_ORIGINS` in [`worker/index.js`](worker/index.js) (it ships with `https://paceboard.dev` and `http://localhost:5173`), and redeploy if you changed it.

### 2. Frontend (any static host)

Set the build-time env vars in your host's dashboard (Cloudflare Pages, Vercel, Netlify, …), then build:

```bash
npm run build
```

| Build env var | Value |
|---|---|
| `VITE_LINEAR_CLIENT_ID` | Linear OAuth app client ID (public — safe to expose) |
| `VITE_LINEAR_WORKER_URL` | The deployed worker URL from step 1 |
| `LINEAR_API_TOKEN` | *(optional)* bakes in a token and skips the setup screen — never commit a real one |

> These are inlined at **build time**, not read at runtime. Rebuild after changing them.

Deploy the resulting `dist/` to any static host — no server-side rendering, no API routes.

### 3. Linear OAuth app

In your [Linear OAuth app](https://linear.app/settings/api/applications), register the callback URLs for every origin you serve from — both production and local:

```
https://your-production-domain
http://localhost:5173
```

The callback must exactly match the app's `window.location.origin`.

---

## Data & privacy

Paceboard runs entirely in your browser. Your Linear API key and preferences are stored in `localStorage` only and never sent anywhere except `api.linear.app`.

### localStorage keys

| Key | Description |
|---|---|
| `paceboard.linearToken` | Linear token (OAuth access token or personal API key) |
| `paceboard.linearTokenSource` | How the token was obtained (`oauth` or `pat`) — controls the `Authorization` header format and OAuth revocation on disconnect |
| `paceboard.waitingPatterns` | User-defined label/state patterns that count as "waiting" time for flow efficiency |
| `paceboard.pollIntervalMs` | Auto-refresh interval in milliseconds |
| `paceboard.thresholds` | User-configured health thresholds (WIP, cycle time, issue age, review age, flow efficiency) |
| `paceboard.selectedMemberIds` | Array of Linear user IDs to include in metrics; `null` = all members |
| `paceboard:theme` | UI theme (`light`, `dark`, or `system`) |

---

## Project structure

```
src/
├── App.vue                # Root — composes header, KPI row, panels
├── main.js                # Entry
├── app.css                # Tailwind layers + theme tokens
├── helpers.js             # Shared formatting/utility helpers
├── lib/                   # Framework-free data layer
│   ├── linear.js          # Linear GraphQL client
│   └── flowRows.js        # Issue → flow-row transforms
├── composables/           # Reusable reactive logic
│   ├── useFlowData.js     # Fetch + derive flow metrics
│   ├── useLinearAuth.js   # Token storage + viewer verification
│   ├── useSettings.js     # Period, waiting patterns, etc.
│   └── useTheme.js        # Light / dark / system theme
└── components/
    ├── charts/            # Chart.js wrappers (Sparkline, FlowTrend, …)
    ├── panels/            # Dashboard panels (Aging, Review, TeamTable, …)
    ├── KpiRow.vue
    ├── DeltaPill.vue
    ├── VerdictBanner.vue
    ├── SetupScreen.vue
    ├── SettingsModal.vue
    ├── ThemeSwitcher.vue
    ├── FlowDrillOver.vue
    └── KpiDrillOver.vue
```

Layering rule: **`lib/` is framework-free, `composables/` owns reactive state and side effects, `components/` is presentation.** See [AGENTS.md](AGENTS.md) for full contribution guidelines.

---

## Contributing

See [AGENTS.md](AGENTS.md) for coding standards, project conventions, and the pre-PR checklist.

---

## License

MIT — see [LICENSE](LICENSE)
