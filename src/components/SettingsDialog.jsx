import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ghAll } from "@/lib/github"
import { verifyLinearToken, getLinearTeams } from "@/lib/linear"

const PERIODS = [14, 30, 60, 90, 180]

export function SettingsDialog({
  open, onClose, token,
  currentRepo, currentPeriod,
  currentLinearToken, currentLinearTeam,
  onSave,
}) {
  // GitHub
  const [repos,          setRepos]          = useState([])
  const [loadingRepos,   setLoadingRepos]   = useState(false)
  const [repoSearch,     setRepoSearch]     = useState("")
  const [selectedRepo,   setSelectedRepo]   = useState(currentRepo)
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod)

  // Linear
  const [linToken,      setLinToken]      = useState(currentLinearToken || "")
  const [linTeams,      setLinTeams]      = useState([])
  const [linTeamId,     setLinTeamId]     = useState(currentLinearTeam || "")
  const [linVerifying,  setLinVerifying]  = useState(false)
  const [linConnected,  setLinConnected]  = useState(false)
  const [linError,      setLinError]      = useState(null)

  useEffect(() => {
    if (!open) return
    setSelectedRepo(currentRepo)
    setSelectedPeriod(currentPeriod)
    setRepoSearch("")
    setLinToken(currentLinearToken || "")
    setLinTeamId(currentLinearTeam || "")
    setLinTeams([])
    setLinConnected(false)
    setLinError(null)

    if (token && repos.length === 0) {
      setLoadingRepos(true)
      ghAll("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", token)
        .then(r => setRepos(r.sort((a, b) => a.full_name.localeCompare(b.full_name))))
        .catch(() => {})
        .finally(() => setLoadingRepos(false))
    }

    if (currentLinearToken) {
      setLinVerifying(true)
      getLinearTeams(currentLinearToken)
        .then(teams => { setLinTeams(teams); setLinConnected(true) })
        .catch(() => {})
        .finally(() => setLinVerifying(false))
    }
  }, [open])

  async function connectLinear() {
    if (!linToken.trim()) return
    setLinVerifying(true)
    setLinError(null)
    try {
      await verifyLinearToken(linToken.trim())
      const teams = await getLinearTeams(linToken.trim())
      setLinTeams(teams)
      setLinConnected(true)
      if (teams.length === 1) setLinTeamId(teams[0].id)
    } catch (e) {
      setLinError("Could not connect — check your API key.")
    } finally {
      setLinVerifying(false)
    }
  }

  function disconnectLinear() {
    setLinToken("")
    setLinTeamId("")
    setLinTeams([])
    setLinConnected(false)
    setLinError(null)
  }

  const filtered = repos.filter(r => r.full_name.toLowerCase().includes(repoSearch.toLowerCase()))

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">

          {/* Period */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Period</label>
            <div className="flex gap-2 flex-wrap">
              {PERIODS.map(p => (
                <button key={p} onClick={() => setSelectedPeriod(p)}
                  className={cn("px-3 py-1.5 rounded-md text-sm font-semibold border transition-colors",
                    selectedPeriod === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input bg-background text-muted-foreground hover:text-foreground")}>
                  {p < 60 ? `${p}d` : p === 60 ? "60d" : p === 90 ? "90d" : "6mo"}
                </button>
              ))}
            </div>
          </div>

          {/* Repository */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Repository</label>
            <Input placeholder="Filter repos…" value={repoSearch} onChange={e => setRepoSearch(e.target.value)} className="mb-2" />
            {loadingRepos
              ? <p className="text-sm text-muted-foreground py-4 text-center">Loading repos…</p>
              : (
                <div className="border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                  {filtered.map(r => (
                    <label key={r.full_name}
                      className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b last:border-0 transition-colors",
                        selectedRepo === r.full_name ? "bg-accent" : "hover:bg-muted/50")}>
                      <input type="radio" name="settingsRepo" checked={selectedRepo === r.full_name}
                        onChange={() => setSelectedRepo(r.full_name)}
                        className="accent-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.full_name}</div>
                        {r.description && <div className="text-xs text-muted-foreground truncate">{r.description}</div>}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {r.private && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">private</span>}
                        {r.language && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{r.language}</span>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
          </div>

          {/* Linear */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Linear</label>
            <p className="text-xs text-muted-foreground mb-3">
              Optional. Generate a personal API key at{" "}
              <a href="https://linear.app/settings/api" target="_blank" rel="noreferrer"
                className="underline hover:text-foreground">linear.app/settings/api</a>.
            </p>

            {linConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium">
                  <span>✓ Connected</span>
                  <button onClick={disconnectLinear}
                    className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors">
                    Disconnect
                  </button>
                </div>
                {linTeams.length > 1 && (
                  <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {linTeams.map(t => (
                      <label key={t.id}
                        className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b last:border-0 transition-colors",
                          linTeamId === t.id ? "bg-accent" : "hover:bg-muted/50")}>
                        <input type="radio" name="linTeam" checked={linTeamId === t.id}
                          onChange={() => setLinTeamId(t.id)}
                          className="accent-primary flex-shrink-0" />
                        <span className="text-sm font-medium">{t.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto font-mono">{t.key}</span>
                      </label>
                    ))}
                  </div>
                )}
                {linTeams.length === 1 && (
                  <p className="text-sm text-muted-foreground">
                    Team: <span className="font-medium text-foreground">{linTeams[0].name}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="lin_api_…"
                    value={linToken}
                    onChange={e => setLinToken(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && connectLinear()}
                    className="font-mono text-xs"
                  />
                  <Button size="sm" onClick={connectLinear} disabled={linVerifying || !linToken.trim()}>
                    {linVerifying ? "…" : "Connect"}
                  </Button>
                </div>
                {linError && <p className="text-xs text-destructive">{linError}</p>}
              </div>
            )}
          </div>

        </div>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave(selectedRepo, selectedPeriod, linConnected ? linToken : "", linConnected ? linTeamId : "")}
            disabled={!selectedRepo}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
