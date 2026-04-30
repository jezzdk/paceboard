import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ThroughputChart, LeadTimeChart } from "@/components/charts"
import { AgePill } from "@/components/pills"
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
            <span className="text-[10px] font-mono text-violet-500 border border-violet-500/30 rounded px-1">
              Linear
            </span>
          )}
        </div>
        <div className="flex items-end gap-2.5">
          <span className={cn(
            "text-4xl font-bold tabular-nums leading-none",
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

// ── Panel heading ─────────────────────────────────────────────────────────────

function PanelLabel({ children, count, ok, source }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
        {source === "linear" && (
          <span className="text-[10px] font-mono text-violet-500 border border-violet-500/30 rounded px-1">
            Linear
          </span>
        )}
      </div>
      {count != null && (
        <span className={cn(
          "text-xs font-mono font-bold",
          ok          ? "text-emerald-500"
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

// ── Row components ────────────────────────────────────────────────────────────

function PRRow({ pr, pill }) {
  const href = pr.owner && pr.repoName
    ? `https://github.com/${pr.owner}/${pr.repoName}/pull/${pr.number}`
    : null
  return (
    <div className="flex items-center gap-2">
      <AuthorCell login={pr.author} />
      <a
        href={href || "#"}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-muted-foreground truncate flex-1 hover:text-foreground hover:underline min-w-0"
      >
        {pr.title}
      </a>
      <div className="flex-shrink-0">{pill}</div>
    </div>
  )
}

function IssueRow({ issue }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 w-14 truncate">
        {issue.identifier}
      </span>
      <a
        href={issue.url || "#"}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-muted-foreground truncate flex-1 hover:text-foreground hover:underline min-w-0"
      >
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
  const { kpis, prevKpis, enriched, openPRStats, histogram, mergeFreqDaily, period } = result

  const periodLabel = period === 180 ? "6mo" : `${period}d`
  const hasLinear   = !!linear

  // Merge GitHub + Linear daily data into one series for the throughput chart
  const throughputData = useMemo(() => {
    const byDate = {}
    mergeFreqDaily.forEach(({ date, count }) => {
      byDate[date] = { date, prs: count, issues: 0 }
    })
    if (linear?.completedByDay) {
      Object.entries(linear.completedByDay).forEach(([date, count]) => {
        if (byDate[date]) byDate[date].issues = count
        else byDate[date] = { date, prs: 0, issues: count }
      })
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [mergeFreqDaily, linear])

  // Attention panels
  const agingPRs   = openPRStats.filter(p => p.age > 72 && !p.draft).sort((a, b) => b.age - a.age)
  const reviewQueue = openPRStats.filter(p => !p.draft && p.reviewers.length === 0).sort((a, b) => b.age - a.age)

  return (
    <div className="p-6 space-y-5">

      {/* ── KPI strip ── */}
      <div className={cn("grid gap-4", hasLinear ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-4")}>

        <KpiCard
          label="PRs merged"
          value={kpis.mergedCount}
          sub={`vs ${prevKpis.mergedCount} prev ${periodLabel}`}
          trend={<Trend current={kpis.mergedCount} previous={prevKpis.mergedCount} higherIsBetter />}
        />

        <KpiCard
          label="Avg lead time"
          value={fmtH(kpis.avgLeadTime)}
          sub={prevKpis.avgLeadTime != null
            ? `vs ${fmtH(prevKpis.avgLeadTime)} prev ${periodLabel}`
            : undefined}
          trend={<Trend current={kpis.avgLeadTime} previous={prevKpis.avgLeadTime} higherIsBetter={false} />}
        />

        {hasLinear ? (
          <>
            <KpiCard
              source="linear"
              label="Issues closed"
              value={linear.completedCount}
              sub={`vs ${linear.completed14Count} prev ${periodLabel}`}
              trend={<Trend current={linear.completed7Count} previous={linear.completed14Count} higherIsBetter />}
            />
            <KpiCard
              source="linear"
              label="Avg cycle time"
              value={fmtH(linear.avgCycleTime)}
              sub={linear.cycleTime14 != null
                ? `vs ${fmtH(linear.cycleTime14)} prev 7d`
                : undefined}
              trend={<Trend current={linear.cycleTime7} previous={linear.cycleTime14} higherIsBetter={false} />}
            />
          </>
        ) : (
          <>
            <KpiCard
              label="Open PRs"
              value={kpis.openCount}
              sub="currently open"
              warn={kpis.openCount > 5 && kpis.openCount <= 10}
              danger={kpis.openCount > 10}
            />
            <KpiCard
              label="Stale PRs"
              value={kpis.stalePRs}
              sub="> 3 days without merge"
              warn={kpis.stalePRs > 0 && kpis.stalePRs <= 3}
              danger={kpis.stalePRs > 3}
            />
          </>
        )}

      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Throughput
            </p>
            <ThroughputChart dailyData={throughputData} hasLinear={hasLinear} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Lead time distribution
            </p>
            <LeadTimeChart data={histogram} />
          </CardContent>
        </Card>
      </div>

      {/* ── Attention panels ── */}
      <div className={cn("grid gap-4", hasLinear ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-2")}>

        {/* Aging PRs */}
        <Card className={agingPRs.length > 0 ? "border-amber-500/40" : ""}>
          <CardContent className="pt-5">
            <PanelLabel count={agingPRs.length} ok={agingPRs.length === 0}>Aging PRs</PanelLabel>
            {agingPRs.length === 0
              ? <Empty>No PRs older than 3 days</Empty>
              : (
                <div className="space-y-2.5">
                  {agingPRs.slice(0, 7).map(p => (
                    <PRRow key={`${p.repo}-${p.number}`} pr={p} pill={<AgePill hours={p.age} />} />
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Review queue */}
        <Card className={reviewQueue.length > 0 ? "border-destructive/40" : ""}>
          <CardContent className="pt-5">
            <PanelLabel count={reviewQueue.length} ok={reviewQueue.length === 0}>
              Review queue
            </PanelLabel>
            {reviewQueue.length === 0
              ? <Empty>All open PRs have reviewers</Empty>
              : (
                <div className="space-y-2.5">
                  {reviewQueue.slice(0, 7).map(p => (
                    <PRRow key={`${p.repo}-${p.number}`} pr={p} pill={<AgePill hours={p.age} />} />
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Blocked issues — Linear only */}
        {hasLinear && (
          <Card className={linear.blockedIssues.length > 0 ? "border-destructive/40" : ""}>
            <CardContent className="pt-5">
              <PanelLabel
                source="linear"
                count={linear.blockedIssues.length}
                ok={linear.blockedIssues.length === 0}
              >
                Blocked
              </PanelLabel>
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

      </div>
    </div>
  )
}
