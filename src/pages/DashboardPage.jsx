import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { KpiStrip } from "@/components/KpiStrip"
import { BarChart, ThroughputChart, HeatmapCell } from "@/components/charts"
import { LeadTimePill, AgePill, SizePill, StatusPill } from "@/components/pills"
import { AuthorCell, Avatar } from "@/components/Avatar"
import { fmt, fmtH, fmtDate, fmtDateFull } from "@/lib/format"
import { prSize } from "@/lib/process"

const SIZE_LABELS = ["XS","S","M","L","XL"]
function sizeStyle(lbl) { return prSize(lbl==="XS"?0:lbl==="S"?10:lbl==="M"?50:lbl==="L"?200:800, 0) }

function Table({ headers, children }) {
  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {headers.map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
function TR({ children, i }) {
  return <tr className={i % 2 === 0 ? "" : "bg-muted/20"}>{children}</tr>
}
function TD({ children, className = "" }) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>
}
function Mono({ children }) {
  return <span className="font-mono text-xs">{children}</span>
}

export function DashboardPage({ result }) {
  const { kpis, enriched, openPRStats, teamMembers, histogram, sizeDist, heatmap, mergeFreqDaily, mergeFreqWeekly } = result

  return (
    <div className="p-6 space-y-6">
      <KpiStrip kpis={kpis} fmtH={fmtH} fmt={fmt} />

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="prs">PR Details</TabsTrigger>
          <TabsTrigger value="open">Open PRs</TabsTrigger>
          <TabsTrigger value="heatmap">Review Heatmap</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Merge Throughput</p>
                  <ThroughputChart daily={mergeFreqDaily} weekly={mergeFreqWeekly} />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Lead Time Distribution</p>
                  <BarChart data={histogram} />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">PR Size Distribution</p>
                  <BarChart data={sizeDist} color="bg-violet-500" />
                  <div className="flex gap-2 flex-wrap mt-3">
                    {SIZE_LABELS.map(lbl => (
                      <Badge key={lbl} variant={sizeStyle(lbl).variant} className="font-mono">{lbl}</Badge>
                    ))}
                    <span className="text-xs text-muted-foreground self-center">XS&lt;10 · S&lt;50 · M&lt;200 · L&lt;800 · XL 800+</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Code Churn</p>
                  <div className="flex gap-8">
                    <div>
                      <div className="text-2xl font-bold text-emerald-500">+{(kpis.totalAdd/1000).toFixed(1)}k</div>
                      <div className="text-xs text-muted-foreground mt-0.5">lines added</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-destructive">−{(kpis.totalDel/1000).toFixed(1)}k</div>
                      <div className="text-xs text-muted-foreground mt-0.5">lines removed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {((kpis.totalAdd / (kpis.totalAdd + kpis.totalDel || 1)) * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">growth ratio</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── TEAM ── */}
        <TabsContent value="team">
          <Table headers={["Contributor","Merged","Open","Median Lead","→ Review","Chg. Req.","Reviews Given","Rev. Cmts","Commits","Sizes"]}>
            {teamMembers.map((m, i) => (
              <TR key={m.login} i={i}>
                <TD>
                  <div className="flex items-center gap-2">
                    <AuthorCell login={m.login} />
                    {i === 0 && m.prsMerged > 0 && <Badge variant="warning" className="ml-1 text-[10px]">⚡ top</Badge>}
                  </div>
                </TD>
                <TD><Mono>{fmt(m.prsMerged)}</Mono></TD>
                <TD><Mono>{fmt(m.prsOpen)}</Mono></TD>
                <TD><LeadTimePill hours={m.medianLeadTime} /></TD>
                <TD><Mono>{fmtH(m.medianReviewTime)}</Mono></TD>
                <TD><Mono className={m.changesRequested > 0 ? "text-amber-500" : ""}>{fmt(m.changesRequested)}</Mono></TD>
                <TD><Mono>{fmt(m.reviewsGiven)}</Mono></TD>
                <TD><Mono>{fmt(m.reviewComments)}</Mono></TD>
                <TD><Mono>{fmt(m.commits)}</Mono></TD>
                <TD>
                  <div className="flex gap-1 flex-wrap">
                    {SIZE_LABELS.map(lbl => m.sizes[lbl] > 0 && (
                      <Badge key={lbl} variant={sizeStyle(lbl).variant} className="text-[10px] font-mono px-1.5">
                        {lbl}:{m.sizes[lbl]}
                      </Badge>
                    ))}
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        </TabsContent>

        {/* ── PR DETAILS ── */}
        <TabsContent value="prs">
          <Table headers={["#","Title","Author","Size","Lead Time","→ Review","Rounds","Reviewers","Commits","Merged"]}>
            {[...enriched].sort((a,b) => new Date(b.mergedAt)-new Date(a.mergedAt)).slice(0,100).map((p, i) => (
              <TR key={p.number} i={i}>
                <TD><span className="text-muted-foreground font-mono text-xs">#{p.number}</span></TD>
                <TD className="max-w-[200px]"><span className="truncate block text-xs">{p.title}</span></TD>
                <TD><AuthorCell login={p.author} /></TD>
                <TD><SizePill size={p.size} add={p.additions} del={p.deletions} /></TD>
                <TD><LeadTimePill hours={p.leadTime} /></TD>
                <TD><Mono>{fmtH(p.timeToFirstReview)}</Mono></TD>
                <TD><Mono className={p.changesRequested > 1 ? "text-amber-500" : ""}>{p.changesRequested || "—"}</Mono></TD>
                <TD><Mono>{p.reviewerCount || "—"}</Mono></TD>
                <TD><Mono>{fmt(p.commitCount)}</Mono></TD>
                <TD><span className="text-xs text-muted-foreground font-mono">{fmtDateFull(p.mergedAt)}</span></TD>
              </TR>
            ))}
          </Table>
        </TabsContent>

        {/* ── OPEN PRs ── */}
        <TabsContent value="open">
          <Table headers={["#","Title","Author","Age","Reviewers","Status"]}>
            {[...openPRStats].sort((a,b) => b.age-a.age).map((p, i) => (
              <TR key={p.number} i={i}>
                <TD><span className="text-muted-foreground font-mono text-xs">#{p.number}</span></TD>
                <TD className="max-w-[260px]"><span className="truncate block text-xs">{p.title}</span></TD>
                <TD><AuthorCell login={p.author} /></TD>
                <TD><AgePill hours={p.age} /></TD>
                <TD>
                  <span className="text-xs">
                    {p.reviewers.length ? p.reviewers.join(", ") : <span className="text-destructive">none</span>}
                  </span>
                </TD>
                <TD><StatusPill draft={p.draft} age={p.age} /></TD>
              </TR>
            ))}
          </Table>
        </TabsContent>

        {/* ── HEATMAP ── */}
        <TabsContent value="heatmap">
          {(() => {
            const reviewers = Object.keys(heatmap).sort()
            const authors   = [...new Set(Object.values(heatmap).flatMap(r => Object.keys(r)))].sort()
            const maxVal    = Math.max(...reviewers.flatMap(r => authors.map(a => heatmap[r][a] || 0)), 1)
            if (!reviewers.length) return <p className="text-muted-foreground text-center py-12">No review data found.</p>
            return (
              <div>
                <p className="text-xs text-muted-foreground mb-4">Rows = reviewer · Columns = PR author · Cell = reviews given</p>
                <div className="overflow-x-auto">
                  <table className="border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium min-w-[130px] text-xs">↓ reviewer / author →</th>
                        {authors.map(a => (
                          <th key={a} className="px-1 py-2 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <Avatar login={a} size={20} />
                              <span className="text-[10px] text-muted-foreground font-normal"
                                style={{ writingMode:"vertical-rl", transform:"rotate(180deg)", maxHeight:72, overflow:"hidden", whiteSpace:"nowrap" }}>
                                {a}
                              </span>
                            </div>
                          </th>
                        ))}
                        <th className="px-3 py-2 text-muted-foreground font-medium text-xs">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewers.map((reviewer, ri) => {
                        const total = authors.reduce((s, a) => s + (heatmap[reviewer][a] || 0), 0)
                        return (
                          <tr key={reviewer} className={ri % 2 === 0 ? "" : "bg-muted/20"}>
                            <td className="px-3 py-1.5">
                              <AuthorCell login={reviewer} />
                            </td>
                            {authors.map(a => (
                              <HeatmapCell key={a} value={heatmap[reviewer][a] || 0} max={maxVal} />
                            ))}
                            <td className="px-3 py-1.5 font-mono font-bold text-muted-foreground text-right">{total}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}
        </TabsContent>
      </Tabs>
    </div>
  )
}
