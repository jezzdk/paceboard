import { useState, useEffect, useCallback, useRef } from "react"
import { Sun, Monitor, Moon, Settings, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { SettingsDialog } from "@/components/SettingsDialog"
import { DisconnectDialog } from "@/components/DisconnectDialog"
import { RepoPickerModal } from "@/components/RepoPickerModal"
import { TokenPage, RepoPage } from "@/pages/SetupPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { useTheme } from "@/hooks/useTheme"
import { useGithubOAuth } from "@/hooks/useGithubOAuth"
import { ghAll, loadMultiRepoDashboard } from "@/lib/github"
import { processData } from "@/lib/process"
import { loadLinearData } from "@/lib/linear"
import { processLinearData } from "@/lib/processLinear"
import { cn } from "@/lib/utils"

const LS_TOKEN         = "paceboard_gh_token"
const LS_REPOS         = "paceboard_gh_repos"      // JSON array of "owner/repo" strings
const LS_REPO          = "paceboard_gh_repo"        // legacy single-repo key (migration only)
const LS_PERIOD        = "paceboard_gh_period"
const LS_POLL_INTERVAL = "paceboard_poll_interval"  // minutes (float)
const LS_LINEAR_TOKEN  = "paceboard_linear_token"
const LS_LINEAR_TEAM   = "paceboard_linear_team"

const PERIODS = [
  { label: "14d", days: 14  },
  { label: "30d", days: 30  },
  { label: "60d", days: 60  },
  { label: "90d", days: 90  },
  { label: "6mo", days: 180 },
]

const ENV_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || ""

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStoredRepos() {
  try {
    const stored = localStorage.getItem(LS_REPOS)
    if (stored) return JSON.parse(stored)
  } catch {}
  // Migrate from old single-repo storage
  const legacy = localStorage.getItem(LS_REPO)
  if (legacy) return [legacy]
  return []
}

function initStep() {
  const token = ENV_TOKEN || localStorage.getItem(LS_TOKEN)
  const repos  = getStoredRepos()
  if (token && repos.length > 0) return "ready"
  if (token)                      return "repos"
  return "token"
}

const THEME_ICONS = { light: Sun, system: Monitor, dark: Moon }

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const { theme, setTheme, cycle } = useTheme()
  const oauth = useGithubOAuth()

  // ── setup state ───────────────────────────────────────────────────────────
  const [step,        setStep]        = useState(initStep)
  const [allRepos,    setAllRepos]    = useState([])   // full repo objects from GitHub API
  const [oauthStatus, setOauthStatus] = useState(
    () => new URLSearchParams(window.location.search).has("code") ? "exchanging" : "idle"
  )
  const [oauthError, setOauthError] = useState(null)

  const [token,          setToken]          = useState(() => ENV_TOKEN || localStorage.getItem(LS_TOKEN)       || "")
  const [selectedRepos,  setSelectedRepos]  = useState(() => getStoredRepos())
  const [period,         setPeriod]         = useState(() => parseInt(localStorage.getItem(LS_PERIOD) || "30"))
  const [pollInterval,   setPollInterval]   = useState(() => parseFloat(localStorage.getItem(LS_POLL_INTERVAL) || "1"))
  const [linearToken,    setLinearToken]    = useState(() => localStorage.getItem(LS_LINEAR_TOKEN)             || "")
  const [linearTeam,     setLinearTeam]     = useState(() => localStorage.getItem(LS_LINEAR_TEAM)              || "")

  const [loading,      setLoading]      = useState(false)
  const [progress,     setProgress]     = useState({ pct: 0, label: "" })
  const [error,        setError]        = useState(null)
  const [result,       setResult]       = useState(null)
  const [linearResult, setLinearResult] = useState(null)

  const [showSettings,    setShowSettings]    = useState(false)
  const [showDisconnect,  setShowDisconnect]  = useState(false)
  const [showRepoPicker,  setShowRepoPicker]  = useState(false)
  const [lastFetch,       setLastFetch]       = useState(null)

  // ── OAuth callback ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (oauthStatus !== "exchanging") return
    oauth.handleCallback().then(res => {
      if (!res) { setOauthStatus("idle"); return }
      if (res.error) { setOauthStatus("error"); setOauthError(res.error); return }
      const tok = res.token
      localStorage.setItem(LS_TOKEN, tok)
      setToken(tok)
      setOauthStatus("idle")
      ghAll("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", tok)
        .then(r => { setAllRepos(r.sort((a, b) => a.full_name.localeCompare(b.full_name))); setStep("repos") })
        .catch(() => { setOauthStatus("error"); setOauthError("Could not load repositories — please try again.") })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // If arriving at "repos" step with a token but no repo list, fetch it
  useEffect(() => {
    if (step === "repos" && token && allRepos.length === 0) {
      ghAll("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", token)
        .then(r => setAllRepos(r.sort((a, b) => a.full_name.localeCompare(b.full_name))))
        .catch(() => setStep("token"))
    }
  }, [step, token])

  // ── Core fetch ────────────────────────────────────────────────────────────
  const run = useCallback(async () => {
    if (selectedRepos.length === 0) return
    const since     = new Date(Date.now() - period * 86_400_000).toISOString()
    const prevSince = new Date(Date.now() - period * 2 * 86_400_000).toISOString()

    setLoading(true); setError(null)
    try {
      const raw = await loadMultiRepoDashboard(
        selectedRepos, token, since, prevSince,
        (label, pct) => setProgress({ label, pct })
      )
      setResult({ ...processData(raw), repos: selectedRepos, period })

      if (linearToken && linearTeam) {
        setProgress({ pct: 100, label: "Fetching Linear data…" })
        try {
          const linRaw = await loadLinearData(linearToken, linearTeam, since)
          setLinearResult(processLinearData(linRaw))
        } catch (e) {
          console.warn("Linear fetch failed:", e.message)
        }
      }

      setLastFetch(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, selectedRepos, period, linearToken, linearTeam])

  // Auto-fetch when repos or period change (and we're in the ready state)
  const reposKey = selectedRepos.join(",")
  const prevDepsRef = useRef(null)
  useEffect(() => {
    if (step !== "ready" || selectedRepos.length === 0) return
    const key = `${reposKey}__${period}`
    if (prevDepsRef.current === key) return
    prevDepsRef.current = key
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reposKey, period, step])

  // Polling
  useEffect(() => {
    if (step !== "ready" || selectedRepos.length === 0) return
    const ms = pollInterval * 60 * 1000
    const id = setInterval(() => run(), ms)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, reposKey, pollInterval])

  // ── Setup callbacks ───────────────────────────────────────────────────────
  function onTokenDone(tok, repoList) {
    localStorage.setItem(LS_TOKEN, tok)
    setToken(tok); setAllRepos(repoList); setStep("repos")
  }

  function onReposSelect(fullNames) {
    localStorage.setItem(LS_REPOS, JSON.stringify(fullNames))
    setSelectedRepos(fullNames)
    setStep("ready")
  }

  function onReposUpdate(fullNames) {
    localStorage.setItem(LS_REPOS, JSON.stringify(fullNames))
    setSelectedRepos(fullNames)
    setShowRepoPicker(false)
    // prevDepsRef will differ → triggers auto-fetch via the effect above
  }

  // Ensure allRepos is loaded when opening the repo picker from the header
  function openRepoPicker() {
    if (token && allRepos.length === 0) {
      ghAll("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", token)
        .then(r => setAllRepos(r.sort((a, b) => a.full_name.localeCompare(b.full_name))))
        .catch(() => {})
    }
    setShowRepoPicker(true)
  }

  function onSettingsSave({ theme: newTheme, pollInterval: newPoll, linearToken: newLinToken, linearTeam: newLinTeam }) {
    if (newTheme !== theme) setTheme(newTheme)

    if (newPoll !== pollInterval) {
      localStorage.setItem(LS_POLL_INTERVAL, newPoll)
      setPollInterval(newPoll)
    }

    if (newLinToken !== linearToken) {
      if (newLinToken) localStorage.setItem(LS_LINEAR_TOKEN, newLinToken)
      else             localStorage.removeItem(LS_LINEAR_TOKEN)
      setLinearToken(newLinToken)
    }
    if (newLinTeam !== linearTeam) {
      if (newLinTeam) localStorage.setItem(LS_LINEAR_TEAM, newLinTeam)
      else            localStorage.removeItem(LS_LINEAR_TEAM)
      setLinearTeam(newLinTeam)
    }
    if (!newLinToken) {
      localStorage.removeItem(LS_LINEAR_TOKEN)
      localStorage.removeItem(LS_LINEAR_TEAM)
      setLinearResult(null)
    }

    setShowSettings(false)
  }

  function onDisconnect() {
    oauth.revokeToken(token)
    ;[LS_TOKEN, LS_REPOS, LS_REPO, LS_PERIOD, LS_LINEAR_TOKEN, LS_LINEAR_TEAM].forEach(k => localStorage.removeItem(k))
    setToken(""); setSelectedRepos([]); setAllRepos([]); setResult(null); setLinearResult(null)
    setError(null); setOauthStatus("idle"); setOauthError(null)
    setShowDisconnect(false); setStep("token")
  }

  // ── Theme icon ────────────────────────────────────────────────────────────
  const ThemeIcon = THEME_ICONS[theme] ?? Monitor

  // ── Setup screens ─────────────────────────────────────────────────────────
  if (step === "token") return (
    <TokenPage
      onDone={onTokenDone}
      oauthStatus={oauthStatus}
      oauthError={oauthError}
      onConnectWithGithub={oauth.startRedirect}
    />
  )

  if (step === "repos") return (
    <RepoPage
      repos={allRepos}
      onSelect={onReposSelect}
      onBack={() => setStep("token")}
    />
  )

  // ── Repo label for header ─────────────────────────────────────────────────
  const repoLabel = selectedRepos.length === 1
    ? selectedRepos[0]
    : `${selectedRepos.length} repos`

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      <header className="border-b px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-extrabold tracking-tight">◈ Paceboard</span>
          <Badge variant="outline" className="text-[10px] font-mono">Dev Analytics</Badge>
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Period selector */}
        <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.label}
              onClick={() => { setPeriod(p.days); localStorage.setItem(LS_PERIOD, p.days) }}
              className={cn(
                "text-xs font-semibold px-2.5 py-1 rounded transition-colors",
                period === p.days
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {linearToken && (
            <Badge variant="outline" className="text-[10px] font-mono text-violet-500 border-violet-500/40">
              Linear
            </Badge>
          )}

          {/* Repo selector button */}
          <button
            onClick={openRepoPicker}
            className="text-xs text-muted-foreground font-mono hidden sm:block truncate max-w-[200px] hover:text-foreground transition-colors"
            title="Change repositories"
          >
            {repoLabel}
          </button>

          <Separator orientation="vertical" className="h-5" />

          {/* Theme cycle button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cycle}
            title={`Theme: ${theme}`}
          >
            <ThemeIcon className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} title="Settings">
            <Settings className="h-4 w-4" />
          </Button>

          {!ENV_TOKEN && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDisconnect(true)}
              title="Disconnect"
              className="text-muted-foreground hover:text-destructive"
            >
              <Power className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

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

      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-24 text-center">
          <div className="text-5xl text-muted-foreground/20">◈</div>
          <p className="text-lg font-semibold text-muted-foreground">Loading data…</p>
        </div>
      )}

      {result && !loading && <DashboardPage result={result} linear={linearResult} />}

      <footer className="border-t px-6 py-2 text-xs text-muted-foreground flex items-center gap-1.5 flex-shrink-0 mt-auto">
        <span className="font-semibold text-foreground/60">◈ Paceboard</span>
        <span>·</span>
        <span>
          {lastFetch
            ? <>Last fetch: <span className="font-medium text-foreground/80">{lastFetch.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} at {lastFetch.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span></>
            : "No data fetched yet"}
        </span>
        <a href="https://pulldog.dev" target="_blank" rel="noreferrer"
          className="ml-auto flex items-center gap-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          🐕 <span>Keep PRs from going stale —</span> <span className="font-medium">pulldog.dev</span> <span className="opacity-50">↗</span>
        </a>
      </footer>

      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        currentTheme={theme}
        currentPollInterval={pollInterval}
        currentLinearToken={linearToken}
        currentLinearTeam={linearTeam}
        onSave={onSettingsSave}
      />

      <RepoPickerModal
        open={showRepoPicker}
        onClose={() => setShowRepoPicker(false)}
        allRepos={allRepos}
        selectedRepos={selectedRepos}
        onSave={onReposUpdate}
      />

      <DisconnectDialog
        open={showDisconnect}
        onClose={() => setShowDisconnect(false)}
        onConfirm={onDisconnect}
      />
    </div>
  )
}
