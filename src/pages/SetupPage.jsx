import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ghAll } from "@/lib/github"

export function TokenPage({ onDone }) {
  const [val,     setVal]     = useState("")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function connect() {
    setLoading(true); setError(null)
    try {
      const repos = await ghAll(
        "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
        val
      )
      if (!repos.length) throw new Error("No repositories found for this token.")
      onDone(val, repos.sort((a, b) => a.full_name.localeCompare(b.full_name)))
    } catch (e) {
      setError(e.message.includes("401") ? "Invalid token — check your PAT and try again." : e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="text-3xl font-extrabold tracking-tight mb-1">◈ Paceboard</div>
        <div className="text-sm text-muted-foreground">Developer Analytics</div>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect to GitHub</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Enter a Personal Access Token with <code className="text-xs bg-muted px-1 py-0.5 rounded">repo</code> scope.
            Saved locally so you only need to do this once.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && val && connect()} autoFocus />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={connect} disabled={loading || !val}>
            {loading ? "Connecting…" : "Connect →"}
          </Button>
          <a href="https://github.com/settings/tokens/new?scopes=repo&description=Paceboard+Dev+Analytics"
            target="_blank" rel="noreferrer"
            className="block text-center text-xs text-primary hover:underline pt-1">
            Create a token on GitHub ↗
          </a>
        </CardContent>
      </Card>
    </div>
  )
}

export function RepoPage({ repos, onSelect, onBack }) {
  const [search, setSearch] = useState("")
  const filtered = repos.filter(r => r.full_name.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="text-3xl font-extrabold tracking-tight mb-1">◈ Paceboard</div>
        <div className="text-sm text-muted-foreground">Developer Analytics</div>
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Select a repository</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{repos.length} repos available</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Filter repos…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          <div className="border rounded-lg overflow-y-auto max-h-80">
            {filtered.map(r => (
              <button key={r.full_name} onClick={() => onSelect(r.full_name)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{r.full_name}</div>
                  {r.description && <div className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</div>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {r.private && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">private</span>}
                  {r.language && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{r.language}</span>}
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No repos match "{search}"</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">← Back</Button>
        </CardContent>
      </Card>
    </div>
  )
}
