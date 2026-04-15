# ◈ Paceboard

**Developer productivity analytics for GitHub teams.**

Paceboard connects to your GitHub repository and gives you a clear picture of how your team is performing — PR lead times, review bottlenecks, merge throughput, code churn, and more. Inspired by tools like Screenful and LinearB, but simpler, self-hosted, and free.

---

## Features

- **Merge throughput** — daily and weekly bar charts showing how many PRs your team ships over time
- **PR lead times** — median and distribution of time from PR open to merge, per team member and overall
- **Time to first review** — how long PRs sit before anyone looks at them
- **Review round-trips** — how many times PRs bounce back with change requests
- **PR size distribution** — XS/S/M/L/XL breakdown to spot oversized PRs that slow reviews
- **Code churn** — total lines added/removed and growth ratio over the selected period
- **Team breakdown** — per-contributor table covering merges, reviews given, review comments, lead times, and commit counts
- **Review heatmap** — a matrix showing who reviews whose code, making knowledge silos visible at a glance
- **Open PR bottlenecks** — stale PRs, PRs without a reviewer, and draft PRs surfaced in one view
- **Rate limit awareness** — live GitHub API usage indicator with warnings before fetching large datasets

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/)
- [Tailwind CSS v3](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/) primitives (shadcn-style components)
- [Lucide React](https://lucide.dev/) icons
- GitHub REST API (no backend — all requests made client-side)

## Getting started

### Prerequisites

- Node.js 18+
- A GitHub Personal Access Token with `repo` scope

### Create a token

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Give it a name (e.g. `Paceboard`)
3. Select the `repo` scope
4. Click **Generate token** and copy it

### Run locally

```bash
git clone https://github.com/yourname/paceboard.git
cd paceboard
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173), paste your token, and select a repository.

### Build for production

```bash
npm run build
```

The `dist/` folder can be deployed to any static host — Vercel, Netlify, Cloudflare Pages, or a plain nginx server.

```bash
# Example: serve locally with npx
npx serve dist
```

## Data & privacy

Paceboard runs entirely in your browser. Your GitHub token and repository selection are stored in `localStorage` only — nothing is sent to any server other than the GitHub API directly.

## GitHub API rate limits

GitHub allows **5,000 API requests per hour** for authenticated users. Paceboard fetches full details, reviews, and comments for every merged PR in the selected period, which means:

| Merged PRs | Estimated API calls |
|---|---|
| 50 | ~153 |
| 100 | ~303 |
| 200 | ~603 |
| 400 | ~1,203 |

Paceboard shows a live rate limit indicator in the header and warns you before starting a fetch that would consume a large portion of your budget. Shorter periods (14d, 30d) are recommended for active repositories.

## Configuration

All settings are persisted to `localStorage`:

| Key | Description |
|---|---|
| `paceboard_gh_token` | Your GitHub PAT |
| `paceboard_gh_repo` | Selected repository (`owner/repo`) |
| `paceboard_gh_period` | Selected period in days |
| `paceboard_theme` | UI theme (`light` or `dark`) |

You can clear these from the browser's DevTools or by clicking **Disconnect** in the app.

## Project structure

```
src/
├── lib/
│   ├── github.js       # GitHub API layer — fetching, batching, rate limits, preflight
│   ├── process.js      # Data processing — all metrics, aggregations, heatmap
│   ├── format.js       # Formatting helpers (fmtH, fmtDate, etc.)
│   └── utils.js        # Tailwind cn() helper
├── components/
│   ├── ui/             # Base UI components (Button, Card, Dialog, Badge, Tabs…)
│   ├── charts.jsx      # BarChart, ThroughputChart, HeatmapCell
│   ├── pills.jsx       # LeadTimePill, AgePill, SizePill, StatusPill
│   ├── KpiStrip.jsx    # Top-level KPI cards
│   ├── Avatar.jsx      # GitHub avatar + AuthorCell
│   ├── RateLimitBadge.jsx
│   ├── SettingsDialog.jsx
│   └── DisconnectDialog.jsx
├── pages/
│   ├── SetupPage.jsx   # Token entry + repo picker
│   └── DashboardPage.jsx  # All dashboard tabs
├── hooks/
│   └── useTheme.js     # Dark/light theme toggle
├── App.jsx             # Root component — routing, state, header
├── main.jsx            # Entry point
└── index.css           # Tailwind base + CSS variable themes
```

## Roadmap

- [ ] Multi-repo support
- [ ] CSV export
- [ ] Webhook-based auto-refresh
- [ ] GitHub Actions integration (deployment frequency)
- [ ] Team comparison view

## License

MIT — see [LICENSE](LICENSE)
