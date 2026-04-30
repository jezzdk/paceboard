# ◈ Paceboard

**A single-page engineering health dashboard designed to run on a TV.**

Paceboard pulls data from GitHub and Linear and distills it into a glanceable view: throughput trends, lead time, flow metrics, and a live "needs attention" panel covering aging PRs, missing reviewers, and blocked issues.

---

## What it shows

**KPI strip** — 4 cards without Linear, 6 with it:

| Metric | Source |
|---|---|
| PRs merged (with weekly trend) | GitHub |
| Avg lead time — open → merge (with weekly trend) | GitHub |
| Open PRs | GitHub |
| Stale PRs / Issues in progress | GitHub / Linear |
| Issues closed (with weekly trend) | Linear |
| Avg cycle time — started → done (with weekly trend) | Linear |

**Charts**
- Merge throughput — daily/weekly bar chart over the selected period
- Lead time distribution — histogram bucketed by duration

**Attention panels** — things that need action right now:
- **Aging PRs** — open PRs older than 3 days, sorted by age
- **No reviewer** — open PRs with no reviewer assigned (highest-priority signal)
- **Blocked issues** — in-progress Linear issues labelled "blocked" *(Linear only)*
- **Recently merged** — last 8 merges with their lead times

---

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/)
- [Tailwind CSS v3](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/) primitives (shadcn-style components)
- [Lucide React](https://lucide.dev/) icons
- GitHub REST API — fetches only the PR list (merged + open). No per-PR detail calls.
- Linear GraphQL API — fetches completed and in-progress issues
- Cloudflare Worker — thin OAuth token-exchange proxy (no data stored)

---

## Getting started

### Prerequisites

- Node.js 18+
- A GitHub account with access to the repository you want to analyse

### Run locally

```bash
git clone https://github.com/yourname/paceboard.git
cd paceboard
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You can sign in via GitHub OAuth (requires the worker running locally, see [OAuth setup](#oauth-setup)) or paste a Personal Access Token directly.

### Personal Access Token (quickest start)

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new?scopes=repo&description=Paceboard)
2. Select the `repo` scope (add `read:org` for organisation repositories)
3. Click **Generate token**, copy it, and paste it into the Paceboard setup screen

For Linear, generate a personal API key at [linear.app/settings/api](https://linear.app/settings/api) and connect it via **Settings** once the dashboard is loaded.

### OAuth setup

Paceboard uses a minimal Cloudflare Worker to exchange OAuth codes for tokens — the client secret never touches the browser.

#### GitHub OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. Set **Authorization callback URL** to your deployed URL (or `http://localhost:5173` for local dev)
3. Copy the **Client ID** → set `VITE_GITHUB_CLIENT_ID` in `.env.local`
4. Generate a **Client Secret** → set `GITHUB_CLIENT_SECRET` in `worker/.dev.vars`

#### Linear OAuth App (optional)

1. Go to [linear.app/settings/api/applications](https://linear.app/settings/api/applications) → **New application**
2. Set **Redirect URI** to your deployed URL (or `http://localhost:5173`)
3. Copy the **Client ID** → set `VITE_LINEAR_CLIENT_ID` in `.env.local`
4. Copy the **Client Secret** → set `LINEAR_CLIENT_SECRET` in `worker/.dev.vars`

#### Run the worker locally

```bash
cd worker
npm install
npx wrangler dev
```

Set `VITE_GITHUB_WORKER_URL=http://localhost:8787` in `.env.local` to point the frontend at the local worker.

---

## Environment variables

### Frontend (`.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_GITHUB_CLIENT_ID` | For OAuth | GitHub OAuth App client ID |
| `VITE_GITHUB_WORKER_URL` | For OAuth | URL of the Cloudflare Worker |
| `VITE_LINEAR_CLIENT_ID` | For OAuth | Linear OAuth App client ID |
| `VITE_GITHUB_REDIRECT_URI` | No | Override OAuth redirect URI (defaults to `window.location.origin`) |
| `VITE_GITHUB_TOKEN` | No | Skip setup entirely — useful for private deployments |

### Worker (`worker/.dev.vars` locally, Worker Secrets in production)

| Variable | Description |
|---|---|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `LINEAR_CLIENT_ID` | Linear OAuth App client ID |
| `LINEAR_CLIENT_SECRET` | Linear OAuth App client secret |

See `worker/.dev.vars.example` for a template.

---

## Deployment

### Frontend

```bash
npm run build
```

Deploy `dist/` to any static host — Cloudflare Pages, Vercel, Netlify, or plain nginx. No server-side rendering required.

### Worker

```bash
cd worker
npx wrangler deploy
```

Set the four OAuth secrets in the Cloudflare dashboard (**Workers → your worker → Settings → Variables**):
`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`

---

## GitHub API usage

Paceboard fetches only two endpoints per analysis run — the merged PR list and the open PR list. No per-PR detail, review, or comment fetches.

| Merged PRs | API calls |
|---|---|
| any number | 2–3 |

The 5,000 calls/hour GitHub limit is effectively irrelevant for normal use.

---

## Data & privacy

Paceboard runs entirely in your browser. Your tokens and repository selection are stored in `localStorage` only. The Cloudflare Worker handles the OAuth code exchange and immediately discards the code — it stores nothing.

---

## localStorage keys

| Key | Description |
|---|---|
| `paceboard_gh_token` | GitHub token (PAT or OAuth) |
| `paceboard_gh_repos` | Selected repositories (JSON array of `owner/repo` strings) |
| `paceboard_gh_period` | Selected period in days |
| `paceboard_poll_interval` | Auto-refresh interval in minutes |
| `paceboard_linear_token` | Linear API token |
| `paceboard_linear_team` | Selected Linear team ID |
| `paceboard_theme` | UI theme (`light`, `dark`, or `system`) |

---

## Project structure

```
src/
├── lib/
│   ├── github.js          # GitHub API — PR list fetches, rate limit tracking
│   ├── process.js         # Metrics computation from raw PR data
│   ├── linear.js          # Linear GraphQL client — issues + teams
│   ├── processLinear.js   # Linear metrics — cycle time, WIP, blocked issues
│   ├── format.js          # Formatting helpers (fmtH, fmtDate, etc.)
│   └── utils.js           # Tailwind cn() helper
├── components/
│   ├── ui/                # Base UI components (Button, Card, Dialog, Badge…)
│   ├── charts.jsx         # BarChart, ThroughputChart
│   ├── pills.jsx          # LeadTimePill, AgePill
│   ├── Avatar.jsx         # GitHub avatar + AuthorCell
│   ├── RateLimitBadge.jsx
│   ├── RepoPickerModal.jsx
│   ├── SettingsDialog.jsx
│   └── DisconnectDialog.jsx
├── pages/
│   ├── SetupPage.jsx      # Token entry + repo picker
│   └── DashboardPage.jsx  # Single-page TV dashboard
├── hooks/
│   ├── useTheme.js        # Light / dark / system theme
│   ├── useGithubOAuth.js  # GitHub OAuth flow
│   └── useLinearOAuth.js  # Linear OAuth flow
├── App.jsx                # Root — routing, fetch orchestration, header
└── main.jsx               # Entry point
worker/
├── index.js               # Cloudflare Worker — OAuth token exchange
└── wrangler.toml          # Worker config
```

---

## License

MIT — see [LICENSE](LICENSE)
