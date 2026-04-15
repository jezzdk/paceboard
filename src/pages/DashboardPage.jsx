import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { KpiStrip } from "@/components/KpiStrip"
import { BarChart, ThroughputChart, HeatmapCell, SizeHeatmapCell } from "@/components/charts"
import { LeadTimePill, AgePill, SizePill, StatusPill } from "@/components/pills"
import { AuthorCell, Avatar } from "@/components/Avatar"
import { fmt, fmtH, fmtDateFull } from "@/lib/format"
import { prSize } from "@/lib/process"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

const SIZE_LABELS = ["XS","S","M","L","XL"]
function sizeStyle(lbl) { return prSize(lbl==="XS"?0:lbl==="S"?10:lbl==="M"?50:lbl==="L"?200:800, 0) }

const SIZE_COLORS = { XS: "bg-emerald-500", S: "bg-emerald-400", M: "bg-amber-400", L: "bg-amber-500", XL: "bg-red-500" }

function SizeMiniChart({ sizes }) {
  const max = Math.max(...SIZE_LABELS.map(l => sizes[l] || 0), 1)
  const total = SIZE_LABELS.reduce((s, l) => s + (sizes[l] || 0), 0)
  if (total === 0) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <TooltipProvider>
      <div className="flex items-end gap-0.5 h-6">
        {SIZE_LABELS.map(lbl => {
          const count = sizes[lbl] || 0
          const h = count > 0 ? Math.max((count / max) * 20, 2) : 1
          return (
            <Tooltip key={lbl}>
              <TooltipTrigger asChild>
                <div
                  className={cn("w-4 rounded-sm cursor-default", SIZE_COLORS[lbl], count === 0 && "opacity-20")}
                  style={{ height: h }} />
              </TooltipTrigger>
              <TooltipContent>{lbl}: {count}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

// ── Shared table primitives ───────────────────────────────────────────────────

function SortTH({ label, col, sortCol, sortDir, onSort, className = "" }) {
  const active = sortCol === col
  return (
    <th
      onClick={() => onSort(col)}
      className={cn(
        "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap select-none cursor-pointer hover:text-foreground transition-colors",
        active && "text-foreground",
        className
      )}>
      {label}
      <span className="ml-1 opacity-60">{active ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
    </th>
  )
}

function StaticTH({ label, className = "" }) {
  return (
    <th className={cn("px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap", className)}>
      {label}
    </th>
  )
}

function TR({ children, i, href }) {
  if (href) {
    return (
      <tr
        className={cn(
          "cursor-pointer transition-colors hover:bg-primary/5",
          i % 2 !== 0 && "bg-muted/20"
        )}
        onClick={() => window.open(href, "_blank", "noreferrer")}>
        {children}
      </tr>
    )
  }
  return <tr className={i % 2 === 0 ? "" : "bg-muted/20"}>{children}</tr>
}

function TD({ children, className = "" }) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>
}

function Mono({ children, className = "" }) {
  return <span className={cn("font-mono text-xs", className)}>{children}</span>
}

function useSort(defaultCol, defaultDir = "desc") {
  const [sortCol, setSortCol] = useState(defaultCol)
  const [sortDir, setSortDir] = useState(defaultDir)
  function onSort(col) {
    if (col === sortCol) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortCol(col); setSortDir("desc") }
  }
  function sortData(arr, getVal) {
    return [...arr].sort((a, b) => {
      const av = getVal(a) ?? -Infinity
      const bv = getVal(b) ?? -Infinity
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
  }
  return { sortCol, sortDir, onSort, sortData }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function DashboardPage({ result }) {
  const { kpis, enriched, openPRStats, teamMembers, histogram, sizeDist, heatmap, mergeFreqDaily, mergeFreqWeekly, mergeByDayOfWeek, owner, repo } = result
  const ghBase = owner && repo ? `https://github.com/${owner}/${repo}` : null

  // Team sort
  const teamSort = useSort("prsMerged")
  const TEAM_COL_VAL = {
    prsMerged:       m => m.prsMerged,
    prsOpen:         m => m.prsOpen,
    avgLeadTime:     m => m.avgLeadTime,
    avgReviewTime:   m => m.avgReviewTime,
    changesRequested:m => m.changesRequested,
    reviewsGiven:    m => m.reviewsGiven,
    reviewComments:  m => m.reviewComments,
    commits:         m => m.commits,
  }
  const sortedTeam = teamSort.sortData(teamMembers, m => TEAM_COL_VAL[teamSort.sortCol]?.(m))

  // PR Details sort
  const prSort = useSort("mergedAt")
  const PR_COL_VAL = {
    number:            p => p.number,
    title:             p => p.title,
    author:            p => p.author,
    size:              p => p.additions + p.deletions,
    leadTime:          p => p.leadTime,
    timeToFirstReview: p => p.timeToFirstReview,
    changesRequested:  p => p.changesRequested,
    reviewerCount:     p => p.reviewerCount,
    commitCount:       p => p.commitCount,
    mergedAt:          p => new Date(p.mergedAt).getTime(),
  }
  const sortedPRs = prSort.sortData(enriched, p => PR_COL_VAL[prSort.sortCol]?.(p)).slice(0, 100)

  // Open PRs sort
  const openSort = useSort("age")
  const OPEN_COL_VAL = {
    number:    p => p.number,
    title:     p => p.title,
    author:    p => p.author,
    age:       p => p.age,
    reviewers: p => p.reviewers.length,
    status:    p => p.age,
  }
  const sortedOpenPRs = openSort.sortData(openPRStats, p => OPEN_COL_VAL[openSort.sortCol]?.(p))

  // Heatmap derived
  const reviewers = Object.keys(heatmap).sort()
  const authors   = [...new Set(Object.values(heatmap).flatMap(r => Object.keys(r)))].sort()
  const maxVal    = Math.max(...reviewers.flatMap(r => authors.map(a => heatmap[r][a] || 0)), 1)

  // Author×Size matrix
  const sizeMax = Math.max(...teamMembers.flatMap(m => SIZE_LABELS.map(s => m.sizes[s] || 0)), 1)

  return (
    <div className="p-6 space-y-6">
      <KpiStrip kpis={kpis} fmtH={fmtH} fmt={fmt} owner={owner} repo={repo} />

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
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Merge Activity by Day of Week</p>
                  <BarChart data={mergeByDayOfWeek} color="bg-emerald-500" />
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
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <StaticTH label="Contributor" />
                  <SortTH label="Merged"        col="prsMerged"        {...teamSort} />
                  <SortTH label="Open"          col="prsOpen"          {...teamSort} />
                  <SortTH label="Avg Lead"      col="avgLeadTime"      {...teamSort} />
                  <SortTH label="→ Review"      col="avgReviewTime"    {...teamSort} />
                  <SortTH label="Chg. Req."     col="changesRequested" {...teamSort} />
                  <SortTH label="Reviews Given" col="reviewsGiven"     {...teamSort} />
                  <SortTH label="Rev. Cmts"     col="reviewComments"   {...teamSort} />
                  <SortTH label="Commits"       col="commits"          {...teamSort} />
                  <StaticTH label="Sizes" />
                </tr>
              </thead>
              <tbody>
                {sortedTeam.map((m, i) => (
                  <TR key={m.login} i={i}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <a href={`https://github.com/${owner}/${repo}/pulls?q=is%3Apr+author%3A${m.login}`} target="_blank" rel="noreferrer"
                          className="hover:underline flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <AuthorCell login={m.login} />
                        </a>
                        {i === 0 && m.prsMerged > 0 && <Badge variant="warning" className="ml-1 text-[10px]">⚡ top</Badge>}
                      </div>
                    </TD>
                    <TD>
                      <a href={`https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Amerged+author%3A${m.login}`} target="_blank" rel="noreferrer"
                        className="hover:underline" onClick={e => e.stopPropagation()}>
                        <Mono>{fmt(m.prsMerged)}</Mono>
                      </a>
                    </TD>
                    <TD>
                      <a href={`https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+author%3A${m.login}`} target="_blank" rel="noreferrer"
                        className="hover:underline" onClick={e => e.stopPropagation()}>
                        <Mono>{fmt(m.prsOpen)}</Mono>
                      </a>
                    </TD>
                    <TD><LeadTimePill hours={m.avgLeadTime} /></TD>
                    <TD><Mono>{fmtH(m.avgReviewTime)}</Mono></TD>
                    <TD><Mono className={m.changesRequested > 0 ? "text-amber-500" : ""}>{fmt(m.changesRequested)}</Mono></TD>
                    <TD><Mono>{fmt(m.reviewsGiven)}</Mono></TD>
                    <TD><Mono>{fmt(m.reviewComments)}</Mono></TD>
                    <TD><Mono>{fmt(m.commits)}</Mono></TD>
                    <TD><SizeMiniChart sizes={m.sizes} /></TD>
                  </TR>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── PR DETAILS ── */}
        <TabsContent value="prs">
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <SortTH label="#"          col="number"            {...prSort} />
                  <SortTH label="Title"      col="title"             {...prSort} />
                  <SortTH label="Author"     col="author"            {...prSort} />
                  <SortTH label="Size"       col="size"              {...prSort} />
                  <SortTH label="Lead Time"  col="leadTime"          {...prSort} />
                  <SortTH label="→ Review"   col="timeToFirstReview" {...prSort} />
                  <SortTH label="Rounds"     col="changesRequested"  {...prSort} />
                  <SortTH label="Reviewers"  col="reviewerCount"     {...prSort} />
                  <SortTH label="Commits"    col="commitCount"       {...prSort} />
                  <SortTH label="Merged"     col="mergedAt"          {...prSort} />
                </tr>
              </thead>
              <tbody>
                {sortedPRs.map((p, i) => (
                  <TR key={p.number} i={i} href={ghBase ? `${ghBase}/pull/${p.number}` : undefined}>
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
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── OPEN PRs ── */}
        <TabsContent value="open">

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <SortTH label="#"         col="number"    {...openSort} />
                  <SortTH label="Title"     col="title"     {...openSort} />
                  <SortTH label="Author"    col="author"    {...openSort} />
                  <SortTH label="Age"       col="age"       {...openSort} />
                  <SortTH label="Reviewers" col="reviewers" {...openSort} />
                  <SortTH label="Status"    col="status"    {...openSort} />
                </tr>
              </thead>
              <tbody>
                {sortedOpenPRs.map((p, i) => (
                  <TR key={p.number} i={i} href={ghBase ? `${ghBase}/pull/${p.number}` : undefined}>
                    <TD><span className="text-muted-foreground font-mono text-xs">#{p.number}</span></TD>
                    <TD className="max-w-[260px]"><span className="truncate block text-xs">{p.title}</span></TD>
                    <TD><AuthorCell login={p.author} /></TD>
                    <TD><AgePill hours={p.age} /></TD>
                    <TD>
                      {p.reviewers.length ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {p.reviewers.map(r => (
                            <div key={r} title={r} className="flex items-center">
                              <Avatar login={r} size={20} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-destructive">none</span>
                      )}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusPill draft={p.draft} age={p.age} />
                        {p.approved && <Badge variant="success" className="text-[10px]">✓ Approved</Badge>}
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── HEATMAP ── */}
        <TabsContent value="heatmap">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

            {/* Who Reviews Whom */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Who Reviews Whom</p>
              <p className="text-xs text-muted-foreground mb-4">Rows = reviewer · Columns = PR author · Cell = reviews given</p>
              {!reviewers.length
                ? <p className="text-muted-foreground text-center py-12">No review data found.</p>
                : (
                  <div className="overflow-x-auto">
                    <table className="border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium min-w-[150px] text-xs">↓ reviewer / author →</th>
                          {authors.map(a => (
                            <th key={a} className="px-1 py-2 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <Avatar login={a} size={24} />
                                <span className="text-[10px] text-muted-foreground font-normal"
                                  style={{ writingMode:"vertical-rl", transform:"rotate(180deg)", maxHeight:80, overflow:"hidden", whiteSpace:"nowrap" }}>
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
                              <td className="px-3 py-1.5"><AuthorCell login={reviewer} /></td>
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
                )}
            </div>

            {/* Author × PR Size */}
            {teamMembers.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Author × PR Size</p>
                <p className="text-xs text-muted-foreground mb-4">Rows = author · Columns = size bucket · Cell = PR count</p>
                <div className="overflow-x-auto">
                  <table className="border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium min-w-[150px] text-xs">Author</th>
                        {SIZE_LABELS.map(s => (
                          <th key={s} className="px-1 py-2 text-center text-[10px] text-muted-foreground font-semibold w-10">{s}</th>
                        ))}
                        <th className="px-3 py-2 text-muted-foreground font-medium text-xs">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.filter(m => m.prsMerged > 0).map((m, ri) => {
                        const total = SIZE_LABELS.reduce((s, lbl) => s + (m.sizes[lbl] || 0), 0)
                        return (
                          <tr key={m.login} className={ri % 2 === 0 ? "" : "bg-muted/20"}>
                            <td className="px-3 py-1.5"><AuthorCell login={m.login} /></td>
                            {SIZE_LABELS.map(lbl => (
                              <SizeHeatmapCell key={lbl} value={m.sizes[lbl] || 0} max={sizeMax} />
                            ))}
                            <td className="px-3 py-1.5 font-mono font-bold text-muted-foreground text-right">{total}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
