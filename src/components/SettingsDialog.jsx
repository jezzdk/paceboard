import { useState, useEffect } from "react"
import { Sun, Monitor, Moon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { verifyLinearToken, getLinearTeams } from "@/lib/linear"

const POLL_OPTIONS = [
  { label: "30s", value: 0.5 },
  { label: "1m",  value: 1   },
  { label: "2m",  value: 2   },
  { label: "5m",  value: 5   },
  { label: "15m", value: 15  },
  { label: "30m", value: 30  },
]

const THEME_OPTIONS = [
  { value: "light",  label: "Light",  Icon: Sun     },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark",   label: "Dark",   Icon: Moon    },
]

export function SettingsDialog({
  open, onClose,
  currentTheme,
  currentPollInterval,
  currentLinearToken,
  currentLinearTeam,
  onSave,
}) {
  const [selectedTheme,    setSelectedTheme]    = useState(currentTheme)
  const [selectedPoll,     setSelectedPoll]     = useState(currentPollInterval)
  const [linToken,         setLinToken]         = useState(currentLinearToken || "")
  const [linTeams,         setLinTeams]         = useState([])
  const [linTeamId,        setLinTeamId]        = useState(currentLinearTeam || "")
  const [linVerifying,     setLinVerifying]     = useState(false)
  const [linConnected,     setLinConnected]     = useState(false)
  const [linError,         setLinError]         = useState(null)

  useEffect(() => {
    if (!open) return
    setSelectedTheme(currentTheme)
    setSelectedPoll(currentPollInterval)
    setLinToken(currentLinearToken || "")
    setLinTeamId(currentLinearTeam || "")
    setLinTeams([])
    setLinConnected(false)
    setLinError(null)

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
    } catch {
      setLinError("Could not connect — check your API key.")
    } finally {
      setLinVerifying(false)
    }
  }

  function disconnectLinear() {
    setLinToken(""); setLinTeamId(""); setLinTeams([]); setLinConnected(false); setLinError(null)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">

          {/* Theme */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
              Theme
            </label>
            <div className="flex gap-2">
              {THEME_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setSelectedTheme(value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold border transition-colors",
                    selectedTheme === value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Poll interval */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
              Refresh interval
            </label>
            <div className="flex gap-2 flex-wrap">
              {POLL_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setSelectedPoll(o.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-semibold border transition-colors",
                    selectedPoll === o.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Data is automatically re-fetched on this interval.</p>
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
          <Button onClick={() => onSave({
            theme:        selectedTheme,
            pollInterval: selectedPoll,
            linearToken:  linConnected ? linToken : "",
            linearTeam:   linConnected ? linTeamId : "",
          })}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
