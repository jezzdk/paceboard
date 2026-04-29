import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function RepoPickerModal({ open, onClose, allRepos, selectedRepos, onSave }) {
  const [search,   setSearch]   = useState("")
  const [selected, setSelected] = useState(new Set(selectedRepos))

  // Sync selection when the modal opens
  useEffect(() => {
    if (open) {
      setSelected(new Set(selectedRepos))
      setSearch("")
    }
  }, [open, selectedRepos])

  const filtered = allRepos.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(fullName) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(fullName) ? next.delete(fullName) : next.add(fullName)
      return next
    })
  }

  function handleSave() {
    // Preserve the original order of selected repos as they appear in allRepos
    const ordered = allRepos
      .filter(r => selected.has(r.full_name))
      .map(r => r.full_name)
    onSave(ordered)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Select repositories</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {allRepos.length} repos available · {selected.size} selected
          </p>
        </DialogHeader>

        <div className="px-6 pb-2">
          <Input
            placeholder="Filter repos…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className="border rounded-lg overflow-hidden">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No repos match &ldquo;{search}&rdquo;
              </p>
            )}
            {filtered.map(r => {
              const checked = selected.has(r.full_name)
              return (
                <label
                  key={r.full_name}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b last:border-0 transition-colors",
                    checked ? "bg-accent" : "hover:bg-muted/50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(r.full_name)}
                    className="accent-primary flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.full_name}</div>
                    {r.description && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</div>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {r.private && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">private</span>
                    )}
                    {r.language && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{r.language}</span>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={selected.size === 0}>
            Save {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
