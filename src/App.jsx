import { useState, useEffect, useCallback, useRef } from "react"
import { Sun, Moon, Settings, Power, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { RateLimitBadge } from "@/components/RateLimitBadge"
import { SettingsDialog } from "@/components/SettingsDialog"
import { DisconnectDialog } from "@/components/DisconnectDialog"
import { TokenPage, RepoPage } from "@/pages/SetupPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { useTheme } from "@/hooks/useTheme"
import { ghAll, preflight, loadDashboard, setRateLimitCallback, SAFE_THRESHOLD } from "@/lib/github"
import { processData } from "@/lib/process"
import { fmtH } from "@/lib/format"
import { cn } from "@/lib/utils"

const LS_TOKEN  = "paceboard_gh_token"
const LS_REPO   = "paceboard_gh_repo"
const LS_PERIOD = "paceboard_gh_period"
const PERIODS   = [{ label:"14d",days:14},{label:"30d",days:30},{label:"60d",days:60},{label:"90d",days:90},{label:"6mo",days:180}]

const ENV_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || ""

function initStep() {
  const token = ENV_TOKEN || localStorage.getItem(LS_TOKEN)
  const repo  = localStorage.getItem(LS_REPO)
  if (token && repo) return "ready"
  if (token)         return "repos"
  return "token"
}

export default function App() {
  const { theme, toggle } = useTheme()

  // ── setup state ───────────────────────────────────────────────────────────
  const [step,    setStep]    = useState(initStep)
  const [repos,   setRepos]   = useState([])

  // ── persisted prefs ───────────────────────────────────────────────────────
  const [token,  setToken]  = useState(() => ENV_TOKEN || localStorage.getItem(LS_TOKEN)  || "")
  const [repo,   setRepo]   = useState(() => localStorage.getItem(LS_REPO)   || "")
  const [period, setPeriod] = useState(() => parseInt(localStorage.getItem(LS_PERIOD) || "30"))

  // ── dashboard state ───────────────────────────────────────────────────────
  const [loading,   setLoading]   = useState(false)
  const [progress,  setProgress]  = useState({ pct: 0, label: "" })
  const [error,     setError]     = useState(null)
  const [warning,   setWarning]   = useState(null)
  const [result,    setResult]    = useState(null)
  const [rateLimit, setRateLimit] = useState(null)

  // ── modal state ───────────────────────────────────────────────────────────
  const [showSettings,   setShowSettings]   = useState(false)
  const [showDisconnect, setShowDisconnect] = useState(false)
  const [lastFetch,      setLastFetch]      = useState(null)

  // wire rate limit callback
  useEffect(() => { setRateLimitCallback(setRateLimit) }, [])

  // auto re-fetch when period changes if we already have data loaded
  const hadResult = useRef(false)
  useEffect(() => { if (result) hadResult.current = true }, [result])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (hadResult.current) run() }, [period])

  // if arriving at "repos" step with a token but no repos list, fetch repos
  useEffect(() => {
    if (step === "repos" && token && repos.length === 0) {
      ghAll("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", token)
        .then(r => setRepos(r.sort((a, b) => a.full_name.localeCompare(b.full_name))))
        .catch(() => { setStep("token") })
    }
  }, [step, token])

  // ── setup handlers ────────────────────────────────────────────────────────
  function onTokenDone(tok, repoList) {
    localStorage.setItem(LS_TOKEN, tok)
    setToken(tok); setRepos(repoList); setStep("repos")
  }

  function onRepoSelect(fullName) {
    localStorage.setItem(LS_REPO, fullName)
    setRepo(fullName); setStep("ready")
  }

  function onSettingsSave(newRepo, newPeriod) {
    if (newRepo !== repo) {
      localStorage.setItem(LS_REPO, newRepo)
      setRepo(newRepo); setResult(null); setError(null); setWarning(null)
    }
    if (newPeriod !== period) {
      localStorage.setItem(LS_PERIOD, newPeriod)
      setPeriod(newPeriod)
    }
    setShowSettings(false)
  }

  function onDisconnect() {
    [LS_TOKEN, LS_REPO, LS_PERIOD].forEach(k => localStorage.removeItem(k))
    setToken(""); setRepo(""); setRepos([]); setResult(null)
    setError(null); setWarning(null); setShowDisconnect(false); setStep("token")
  }

  // ── fetch ─────────────────────────────────────────────────────────────────
  const doFetch = useCallback(async (owner, repoName, since) => {
    setWarning(null); setLoading(true); setError(null); setResult(null)
    try {
      const raw = await loadDashboard(owner, repoName, token, since, (label, pct) => setProgress({ label, pct }))
      setResult({ ...processData(raw), owner, repo: repoName, period })
      setLastFetch(new Date())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [token, period])

  const run = useCallback(async () => {
    const [owner, repoName] = repo.split("/")
    if (!owner || !repoName) return
    const since = new Date(Date.now() - period * 86_400_000).toISOString()

    if (rateLimit && rateLimit.remaining < 100) {
      const resetIn = Math.ceil((rateLimit.reset * 1000 - Date.now()) / 60000)
      setError(`Only ${rateLimit.remaining} API calls remaining. Resets in ~${resetIn}m.`)
      return
    }

    setLoading(true); setError(null); setWarning(null)
    try {
      const pf = await preflight(owner, repoName, token, since)
      setLoading(false)
      if (rateLimit && rateLimit.remaining < pf.estimated) {
        const resetIn = Math.ceil((rateLimit.reset * 1000 - Date.now()) / 60000)
        setError(`Not enough API calls remaining (${rateLimit.remaining} left, need ~${pf.estimated}). Resets in ~${resetIn}m.`)
        return
      }
      if (pf.estimated > SAFE_THRESHOLD) { setWarning({ ...pf, owner, repoName, since }) }
      else { doFetch(owner, repoName, since) }
    } catch (e) { setLoading(false); setError(e.message) }
  }, [token, repo, period, doFetch, rateLimit])

  // ── setup screens ─────────────────────────────────────────────────────────
  if (step === "token") return <TokenPage onDone={onTokenDone} />
  if (step === "repos") return <RepoPage repos={repos} onSelect={onRepoSelect} onBack={() => setStep("token")} />

  // ── dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-extrabold tracking-tight">◈ Paceboard</span>
          <Badge variant="outline" className="text-[10px] font-mono">Dev Analytics</Badge>
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Period selector */}
        <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
          {PERIODS.map(p => (
            <button key={p.label} onClick={() => { setPeriod(p.days); localStorage.setItem(LS_PERIOD, p.days) }}
              className={cn("text-xs font-semibold px-2.5 py-1 rounded transition-colors",
                period === p.days ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {p.label}
            </button>
          ))}
        </div>

        <Button onClick={run} disabled={loading} size="sm" className="ml-1">
          {loading
            ? <><span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />Analyzing…</>
            : <><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Analyze</>}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {rateLimit && <RateLimitBadge rl={rateLimit} />}
          <span className="text-xs text-muted-foreground font-mono hidden sm:block truncate max-w-[180px]">{repo}</span>
          <Separator orientation="vertical" className="h-5" />
          <Button variant="ghost" size="icon" onClick={toggle} title="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} title="Settings">
            <Settings className="h-4 w-4" />
          </Button>
          {!ENV_TOKEN && (
            <Button variant="ghost" size="icon" onClick={() => setShowDisconnect(true)} title="Disconnect"
              className="text-muted-foreground hover:text-destructive">
              <Power className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Warning banner */}
      {warning && !loading && (
        <div className="mx-6 mt-4 px-4 py-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <div className="flex gap-3">
            <span className="text-lg leading-none mt-0.5">⚠</span>
            <div className="flex-1">
              <p className="font-semibold mb-1">Large dataset detected</p>
              <p className="text-sm opacity-90 leading-relaxed">
                At least <strong>{warning.mergedEstimate}</strong> merged PRs{warning.isLikelyMore ? " (first page is full — likely more)" : ""}.{" "}
                Estimated <strong>~{warning.estimated}{warning.isLikelyMore ? "+" : ""}</strong> API calls out of your 5,000/hr limit.
                Consider a shorter period, or proceed if you have budget.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="warning" onClick={() => doFetch(warning.owner, warning.repoName, warning.since)}
                  className="bg-amber-500 text-white hover:bg-amber-600 border-0">
                  Proceed anyway
                </Button>
                <Button size="sm" variant="outline" onClick={() => setWarning(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 py-24">
          <div className="text-4xl animate-spin">◈</div>
          <p className="text-lg font-semibold text-muted-foreground">Fetching data…</p>
          <div className="w-60 space-y-2">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress.pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground text-center">{progress.label}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !warning && !error && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-24 text-center">
          <div className="text-5xl text-muted-foreground/20">◈</div>
          <p className="text-lg font-semibold text-muted-foreground">Ready to analyse</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            <span className="text-foreground font-medium">{repo}</span><br />
            Select a period and hit Analyze.
          </p>
        </div>
      )}

      {/* Dashboard */}
      {result && !loading && <DashboardPage result={result} />}

      {/* Footer */}
      <footer className="border-t px-6 py-2 text-xs text-muted-foreground flex items-center gap-1.5 flex-shrink-0 mt-auto">
        <span className="font-semibold text-foreground/60">◈ Paceboard</span>
        <span>·</span>
        <span>
          {lastFetch
            ? <>Last data fetch: <span className="font-medium text-foreground/80">{lastFetch.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})} at {lastFetch.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</span></>
            : "No data fetched yet"}
        </span>
        <a href="https://pulldog.dev" target="_blank" rel="noreferrer"
          className="ml-auto flex items-center gap-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          🐕 <span>Keep PRs from going stale —</span> <span className="font-medium">pulldog.dev</span> <span className="opacity-50">↗</span>
        </a>
      </footer>

      {/* Modals */}
      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        token={token}
        currentRepo={repo}
        currentPeriod={period}
        onSave={onSettingsSave}
      />
      <DisconnectDialog
        open={showDisconnect}
        onClose={() => setShowDisconnect(false)}
        onConfirm={onDisconnect}
      />
    </div>
  )
}
