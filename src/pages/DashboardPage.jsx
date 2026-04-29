import { Card, CardContent } from "@/components/ui/card"
import { ThroughputChart, BarChart } from "@/components/charts"
import { AgePill, LeadTimePill } from "@/components/pills"
import { AuthorCell } from "@/components/Avatar"
import { fmtH } from "@/lib/format"
import { cn } from "@/lib/utils"

// ── Trend arrow ───────────────────────────────────────────────────────────────

function Trend({ current, previous, higherIsBetter = true }) {
  if (previous == null || current == null || previous === 0) return null
  const pctChange = Math.abs(current - previous) / previous
  if (pctChange < 0.05) return <span className="text-muted-foreground text-base">≈</span>
  const improved = higherIsBetter ? current > previous : current < previous
  return (
    <span className={cn("text-base font-bold", improved ? "text-emerald-500" : "text-destructive")}>
      {current > previous ? "↑" : "↓"}
    </span>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, trend, warn, danger, source }) {
  return (
    <Card className={cn(
      danger && "border-destructive/60 bg-destructive/5",
      warn   && "border-amber-500/60 bg-amber-500/5",
    )}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          {source === "linear" && (
            <span className="text-[10px] font-mono text-violet-500 border border-violet-500/30 rounded px-1">Linear</span>
          )}
        </div>
        <div className="flex items-end gap-2.5">
          <span className={cn("text-4xl font-bold tabular-nums leading-none",
            danger && "text-destructive",
            warn   && "text-amber-500",
          )}>
            {value}
          </span>
          {trend}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionLabel({ children, count, ok, source }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
        {source === "linear" && (
          <span className="text-[10px] font-mono text-violet-500 border border-violet-500/30 rounded px-1">Linear</span>
        )}
      </div>
      {count != null && (
        <span className={cn("text-xs font-mono font-bold",
          ok       ? "text-emerald-500"
          : count > 0 ? "text-amber-500"
          : "text-muted-foreground",
        )}>
          {ok ? "✓ clear" : count}
        </span>
      )}
    </div>
  )
}

function Empty({ children }) {
  return <p className="text-sm text-muted-foreground text-center py-6">{children}</p>
}

// ── PR row ────────────────────────────────────────────────────────────────────

function PRRow({ pr, pill, href }) {
  return (
    <div className="flex items-center gap-2">
      <AuthorCell login={pr.author} />
      <a href={href || "#"} target="_blank" rel="noreferrer"
        className="text-xs text-muted-foreground truncate flex-1 hover:text-foreground hover:underline min-w-0">
        {pr.title}
      </a>
      <div className="flex-shrink-0">{pill}</div>
    </div>
  )
}

// ── Linear issue row ──────────────────────────────────────────────────────────

function IssueRow({ issue }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 w-14 truncate">
        {issue.identifier}
      </span>
      <a href={issue.url || "#"} target="_blank" rel="noreferrer"
        className="text-xs text-muted-foreground truncate flex-1 hover:text-foreground hover:underline min-w-0">
        {issue.title}
      </a>
      <div className="flex-shrink-0">
        <AgePill hours={issue.age} />
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function DashboardPage({ result, linear }) {
  const {
    kpis, enriched, openPRStats, histogram,
    mergeFreqDaily, mergeFreqWeekly,
    owner, repo,
  } = result

  const ghBase = owner && repo ? `https://github.com/${owner}/${repo}` : null
  const now = Date.now()

  const inWindow = (d, minDays, maxDays) => {
    const age = (now - new Date(d).getTime()) / 86_400_000
    return age >= minDays && age < maxDays
  }

  // GitHub weekly deltas
  const last7Count  = mergeFreqDaily.filter(d => inWindow(d.date, 0,  7)).reduce((s, d) => s + d.count, 0)
  const prior7Count = mergeFreqDaily.filter(d => inWindow(d.date, 7, 14)).reduce((s, d) => s + d.count, 0)

  const last7PRs  = enriched.filter(p => inWindow(p.mergedAt, 0,  7))
  const prior7PRs = enriched.filter(p => inWindow(p.mergedAt, 7, 14))
  const avgLT = arr => arr.length ? arr.reduce((s, p) => s + p.leadTime, 0) / arr.length : null
  const lt7    = avgLT(last7PRs)
  const ltPrior = avgLT(prior7PRs)

  // Attention panels
  const agingPRs   = openPRStats.filter(p => p.age > 72 && !p.draft).sort((a, b) => b.age - a.age)
  const noReviewer = openPRStats.filter(p => !p.draft && p.reviewers.length === 0).sort((a, b) => b.age - a.age)
  const recentMerged = [...enriched].sort((a, b) => new Date(b.mergedAt) - new Date(a.mergedAt)).slice(0, 8)

  const hasLinear = !!linear

  return (
    <div className="p-6 space-y-5">

      {/* ── KPI row ── */}
      <div className={cn("grid gap-4", hasLinear ? "grid-cols-2 lg:grid-cols-6" : "grid-cols-2 lg:grid-cols-4")}>

        <KpiCard
          label="PRs merged"
          value={kpis.mergedCount}
          sub={`${last7Count} last 7d · ${prior7Count} prior 7d`}
          trend={<Trend current={last7Count} previous={prior7Count} higherIsBetter />}
        />

        {hasLinear && (
          <KpiCard
            source="linear"
            label="Issues closed"
            value={linear.completedCount}
            sub={`${linear.completed7Count} last 7d · ${linear.completed14Count} prior 7d`}
            trend={<Trend current={linear.completed7Count} previous={linear.completed14Count} higherIsBetter />}
          />
        )}

        <KpiCard
          label="Avg lead time"
          value={fmtH(kpis.avgLeadTime)}
          sub={lt7 != null ? `${fmtH(lt7)} last 7d · ${ltPrior != null ? fmtH(ltPrior) + " prior 7d" : "no prior data"}` : undefined}
          trend={<Trend current={lt7} previous={ltPrior} higherIsBetter={false} />}
        />

        {hasLinear && (
          <KpiCard
            source="linear"
            label="Avg cycle time"
            value={fmtH(linear.avgCycleTime)}
            sub={linear.cycleTime7 != null
              ? `${fmtH(linear.cycleTime7)} last 7d · ${linear.cycleTime14 != null ? fmtH(linear.cycleTime14) + " prior 7d" : "no prior data"}`
              : undefined}
            trend={<Trend current={linear.cycleTime7} previous={linear.cycleTime14} higherIsBetter={false} />}
          />
        )}

        <KpiCard
          label="Open PRs"
          value={kpis.openCount}
          sub="currently open"
          warn={kpis.openCount > 5 && kpis.openCount <= 10}
          danger={kpis.openCount > 10}
        />

        {hasLinear ? (
          <KpiCard
            source="linear"
            label="In progress"
            value={linear.wipCount}
            sub="issues in flight"
            warn={linear.wipCount > 10 && linear.wipCount <= 20}
            danger={linear.wipCount > 20}
          />
        ) : (
          <KpiCard
            label="Stale PRs"
            value={kpis.stalePRs}
            sub="> 3 days without merge"
            warn={kpis.stalePRs > 0 && kpis.stalePRs <= 3}
            danger={kpis.stalePRs > 3}
          />
        )}

      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Merge throughput</p>
            <ThroughputChart daily={mergeFreqDaily} weekly={mergeFreqWeekly} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Lead time distribution</p>
            <BarChart data={histogram} />
          </CardContent>
        </Card>
      </div>

      {/* ── Attention row ── */}
      <div className={cn("grid gap-4", hasLinear ? "grid-cols-1 lg:grid-cols-4" : "grid-cols-1 lg:grid-cols-3")}>

        {/* Aging PRs */}
        <Card className={agingPRs.length > 0 ? "border-amber-500/40" : ""}>
          <CardContent className="pt-5">
            <SectionLabel count={agingPRs.length} ok={agingPRs.length === 0}>Aging PRs</SectionLabel>
            {agingPRs.length === 0
              ? <Empty>No PRs older than 3 days</Empty>
              : (
                <div className="space-y-2.5">
                  {agingPRs.slice(0, 7).map(p => (
                    <PRRow key={p.number} pr={p}
                      href={ghBase ? `${ghBase}/pull/${p.number}` : null}
                      pill={<AgePill hours={p.age} />} />
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        {/* No reviewer */}
        <Card className={noReviewer.length > 0 ? "border-destructive/40" : ""}>
          <CardContent className="pt-5">
            <SectionLabel count={noReviewer.length} ok={noReviewer.length === 0}>No reviewer</SectionLabel>
            {noReviewer.length === 0
              ? <Empty>All open PRs have reviewers</Empty>
              : (
                <div className="space-y-2.5">
                  {noReviewer.slice(0, 7).map(p => (
                    <PRRow key={p.number} pr={p}
                      href={ghBase ? `${ghBase}/pull/${p.number}` : null}
                      pill={<AgePill hours={p.age} />} />
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Blocked issues — only when Linear is connected */}
        {hasLinear && (
          <Card className={linear.blockedIssues.length > 0 ? "border-destructive/40" : ""}>
            <CardContent className="pt-5">
              <SectionLabel source="linear" count={linear.blockedIssues.length} ok={linear.blockedIssues.length === 0}>
                Blocked
              </SectionLabel>
              {linear.blockedIssues.length === 0
                ? <Empty>No blocked issues</Empty>
                : (
                  <div className="space-y-2.5">
                    {linear.blockedIssues.map(i => (
                      <IssueRow key={i.id} issue={i} />
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Recently merged */}
        <Card>
          <CardContent className="pt-5">
            <SectionLabel>Recently merged</SectionLabel>
            {recentMerged.length === 0
              ? <Empty>No merged PRs in this period</Empty>
              : (
                <div className="space-y-2.5">
                  {recentMerged.map(p => (
                    <PRRow key={p.number} pr={p}
                      href={ghBase ? `${ghBase}/pull/${p.number}` : null}
                      pill={<LeadTimePill hours={p.leadTime} />} />
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
