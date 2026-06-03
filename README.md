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

Open [http://localhost:5173](http://localhost:5173) and paste a Linear API key into the setup screen.

### Linear API key

1. Go to [linear.app/settings/api](https://linear.app/settings/api)
2. Create a **Personal API key**
3. Paste it into the Paceboard setup screen

The key is stored in your browser's `localStorage` and sent only to `api.linear.app`.

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
| `LINEAR_API_TOKEN` | Skip the setup screen by baking a token into the build. Useful for private/kiosk deployments. **Never commit a real token.** |

Create a `.env.local` (gitignored) to set them locally.

---

## Deployment

```bash
npm run build
```

Deploy `dist/` to any static host — Cloudflare Pages, Vercel, Netlify, or plain nginx. No server-side rendering, no API routes.

---

## Data & privacy

Paceboard runs entirely in your browser. Your Linear API key and preferences are stored in `localStorage` only and never sent anywhere except `api.linear.app`.

### localStorage keys

| Key | Description |
|---|---|
| `paceboard.linearToken` | Linear API key |
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
