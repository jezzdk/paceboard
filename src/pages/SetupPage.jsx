import { useState } from "react"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ghAll } from "@/lib/github"

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || ""

export function TokenPage({ onDone, oauthStatus, oauthError, onConnectWithGithub }) {
  const [val,       setVal]       = useState("")
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [showPat,   setShowPat]   = useState(!CLIENT_ID)
  const [showGuide, setShowGuide] = useState(false)

  const isExchanging = oauthStatus === "exchanging"
  const hasOauthError = oauthStatus === "error"

  async function connectWithPat() {
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
            Authorize Paceboard to read your repositories and pull requests.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* OAuth section */}
          {CLIENT_ID && (
            <div className="space-y-2">
              {isExchanging ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Completing authorization…
                </div>
              ) : (
                <Button className="w-full gap-2" onClick={onConnectWithGithub}>
                  <Github className="h-4 w-4" />
                  Connect with GitHub
                </Button>
              )}
              {hasOauthError && (
                <p className="text-sm text-destructive text-center">{oauthError}</p>
              )}
            </div>
          )}

          {/* Divider between OAuth and PAT */}
          {CLIENT_ID && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <button
                  onClick={() => setShowPat(v => !v)}
                  className="bg-background px-2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPat ? "Hide manual token entry ▲" : "Or enter a personal access token ▼"}
                </button>
              </div>
            </div>
          )}

          {/* PAT section */}
          {showPat && (
            <div className="space-y-3">
              <Input type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={val} onChange={e => setVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && val && connectWithPat()} autoFocus={!CLIENT_ID} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" onClick={connectWithPat} disabled={loading || !val}>
                {loading ? "Connecting…" : "Connect →"}
              </Button>
              <a href="https://github.com/settings/tokens/new?scopes=repo&description=Paceboard+Dev+Analytics"
                target="_blank" rel="noreferrer"
                className="block text-center text-xs text-primary hover:underline pt-1">
                Create a token on GitHub ↗
              </a>

              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowGuide(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors text-left">
                  <span>How to get a token &amp; required permissions</span>
                  <span>{showGuide ? "▲" : "▼"}</span>
                </button>
                {showGuide && (
                  <div className="px-4 pb-4 pt-1 space-y-2 bg-muted/20 text-xs text-muted-foreground leading-relaxed">
                    <ol className="space-y-1.5 list-decimal list-inside">
                      <li>Open <span className="font-medium text-foreground">GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)</span></li>
                      <li>Click <span className="font-medium text-foreground">Generate new token (classic)</span></li>
                      <li>Give it a name, e.g. <span className="font-mono bg-muted px-1 rounded">Paceboard</span></li>
                      <li>
                        Select scopes:
                        <ul className="mt-1 ml-4 space-y-1 list-disc">
                          <li><code className="bg-muted px-1 rounded font-mono">repo</code> — full repository access (required)</li>
                          <li><code className="bg-muted px-1 rounded font-mono">read:org</code> — add this to include organisation repositories</li>
                        </ul>
                      </li>
                      <li>Click <span className="font-medium text-foreground">Generate token</span> and copy it immediately — it's only shown once</li>
                    </ol>
                    <p className="pt-1 border-t border-border/50">
                      Tokens are stored in your browser's localStorage and never sent anywhere except directly to the GitHub API.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

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
