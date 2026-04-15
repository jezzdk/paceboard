import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ghAll } from "@/lib/github"

const PERIODS = [14, 30, 60, 90, 180]

export function SettingsDialog({ open, onClose, token, currentRepo, currentPeriod, onSave }) {
  const [repos,         setRepos]         = useState([])
  const [loadingRepos,  setLoadingRepos]  = useState(false)
  const [repoSearch,    setRepoSearch]    = useState("")
  const [selectedRepo,  setSelectedRepo]  = useState(currentRepo)
  const [selectedPeriod,setSelectedPeriod]= useState(currentPeriod)

  useEffect(() => {
    if (!open) return
    setSelectedRepo(currentRepo)
    setSelectedPeriod(currentPeriod)
    setRepoSearch("")
    if (token && repos.length === 0) {
      setLoadingRepos(true)
      ghAll("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", token)
        .then(r => setRepos(r.sort((a, b) => a.full_name.localeCompare(b.full_name))))
        .catch(() => {})
        .finally(() => setLoadingRepos(false))
    }
  }, [open])

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

          {/* Repo */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Repository</label>
            <Input placeholder="Filter repos…" value={repoSearch} onChange={e => setRepoSearch(e.target.value)} className="mb-2" />
            {loadingRepos
              ? <p className="text-sm text-muted-foreground py-4 text-center">Loading repos…</p>
              : (
                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
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
        </div>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(selectedRepo, selectedPeriod)} disabled={!selectedRepo}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
