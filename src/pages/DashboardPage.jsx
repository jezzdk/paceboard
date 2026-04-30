import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ThroughputChart, LeadTimeChart } from "@/components/charts";
import { AgePill } from "@/components/pills";
import { AuthorCell } from "@/components/Avatar";
import { fmtH } from "@/lib/format";
import { cn } from "@/lib/utils";

// ── Trend arrow (this week vs same span last week) ───────────────────────────

function Trend({ current, previous, higherIsBetter = true }) {
  if (current == null || previous == null) return null;
  if (previous === 0) {
    if (current === 0)
      return <span className="text-muted-foreground text-base">≈</span>;
    const good = higherIsBetter ? current > 0 : current < 0;
    return (
      <span
        className={cn(
          "text-base font-bold",
          good ? "text-emerald-500" : "text-destructive",
        )}
      >
        {higherIsBetter ? "↑" : "↓"}
      </span>
    );
  }
  const pctChange = Math.abs(current - previous) / previous;
  if (pctChange < 0.05)
    return <span className="text-muted-foreground text-base">≈</span>;
  const improved = higherIsBetter ? current > previous : current < previous;
  return (
    <span
      className={cn(
        "text-base font-bold",
        improved ? "text-emerald-500" : "text-destructive",
      )}
    >
      {current > previous ? "↑" : "↓"}
    </span>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, trend, source }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {source === "linear" && (
            <span className="text-[10px] font-mono text-violet-500 border border-violet-500/30 rounded px-1">
              Linear
            </span>
          )}
          {source === "github" && (
            <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1">
              GitHub
            </span>
          )}
        </div>
        <div className="flex items-end gap-2.5">
          <span className="text-4xl font-bold tabular-nums leading-none">
            {value}
          </span>
          {trend}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Panel heading ─────────────────────────────────────────────────────────────

function PanelLabel({ children, count, ok, source }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {children}
        </p>
        {source === "linear" && (
          <span className="text-[10px] font-mono text-violet-500 border border-violet-500/30 rounded px-1">
            Linear
          </span>
        )}
      </div>
      {count != null && (
        <span
          className={cn(
            "text-xs font-mono font-bold",
            ok ? "text-emerald-500" : "text-destructive",
          )}
        >
          {ok ? "✓ clear" : count}
        </span>
      )}
    </div>
  );
}

function Empty({ children }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-6">{children}</p>
  );
}

// ── Row components ────────────────────────────────────────────────────────────

function PRRow({ pr, pill }) {
  const href =
    pr.owner && pr.repoName
      ? `https://github.com/${pr.owner}/${pr.repoName}/pull/${pr.number}`
      : null;
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
  );
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
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function DashboardPage({ result, linear }) {
  const { kpis, prevKpis, openPRStats, histogram, mergeFreqDaily, weekLabel } =
    result;

  const hasLinear = !!linear;

  const throughputData = useMemo(() => {
    const byDate = {};
    mergeFreqDaily.forEach(({ date, count }) => {
      byDate[date] = { date, prs: count, issues: 0 };
    });
    if (linear?.issuesClosedByDay) {
      linear.issuesClosedByDay.forEach(({ date, count }) => {
        if (byDate[date]) byDate[date].issues = count;
        else byDate[date] = { date, prs: 0, issues: count };
      });
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [mergeFreqDaily, linear]);

  const agingPRs = openPRStats
    .filter((p) => p.age > 72 && !p.draft)
    .sort((a, b) => b.age - a.age);
  const reviewQueue = openPRStats
    .filter((p) => !p.draft && p.awaitingFirstReview)
    .sort((a, b) => b.age - a.age);

  const periodSub = (cur, prev, fmt = (v) => v) =>
    prev != null
      ? `vs ${fmt(prev)} last week · ${weekLabel}`
      : `· ${weekLabel}`;

  return (
    <div className="p-6 space-y-5">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          source="github"
          label="PRs merged"
          value={kpis.mergedCount}
          sub={periodSub(kpis.mergedCount, prevKpis.mergedCount)}
          trend={
            <Trend
              current={kpis.mergedCount}
              previous={prevKpis.mergedCount}
              higherIsBetter
            />
          }
        />

        <KpiCard
          source="linear"
          label="Issues closed"
          value={hasLinear ? linear.issuesClosedWeek : "—"}
          sub={
            hasLinear
              ? periodSub(linear.issuesClosedWeek, linear.issuesClosedPrevWeek)
              : "Connect Linear in settings"
          }
          trend={
            hasLinear ? (
              <Trend
                current={linear.issuesClosedWeek}
                previous={linear.issuesClosedPrevWeek}
                higherIsBetter
              />
            ) : null
          }
        />

        <KpiCard
          source="github"
          label="Avg lead time"
          value={kpis.avgLeadTime != null ? fmtH(kpis.avgLeadTime) : "—"}
          sub={
            prevKpis.avgLeadTime != null
              ? periodSub(kpis.avgLeadTime, prevKpis.avgLeadTime, fmtH)
              : `· ${weekLabel}`
          }
          trend={
            <Trend
              current={kpis.avgLeadTime}
              previous={prevKpis.avgLeadTime}
              higherIsBetter={false}
            />
          }
        />

        <KpiCard
          source="linear"
          label="Avg cycle time"
          value={
            hasLinear && linear.avgCycleTime != null
              ? fmtH(linear.avgCycleTime)
              : "—"
          }
          sub={
            hasLinear && linear.avgCycleTimePrevWeek != null
              ? periodSub(
                  linear.avgCycleTime,
                  linear.avgCycleTimePrevWeek,
                  fmtH,
                )
              : hasLinear
                ? `· ${weekLabel}`
                : "Connect Linear in settings"
          }
          trend={
            hasLinear ? (
              <Trend
                current={linear.avgCycleTime}
                previous={linear.avgCycleTimePrevWeek}
                higherIsBetter={false}
              />
            ) : null
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Throughput trend (30 days)
            </p>
            <p className="text-[11px] text-muted-foreground/80 mb-2">
              {hasLinear
                ? "PRs merged per day (bars) and issues closed (line)."
                : "PRs merged per day. Connect Linear to overlay issues closed."}
            </p>
            <ThroughputChart dailyData={throughputData} hasLinear={hasLinear} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Lead time distribution
            </p>
            <p className="text-[11px] text-muted-foreground/80 mb-2">
              Merged PRs (last 30 days): open → merge
            </p>
            <LeadTimeChart data={histogram} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card
          className={cn(
            agingPRs.length === 0
              ? "border-emerald-500/35 bg-emerald-500/[0.03]"
              : "border-destructive/50 bg-destructive/[0.04]",
          )}
        >
          <CardContent className="pt-5">
            <PanelLabel count={agingPRs.length} ok={agingPRs.length === 0}>
              Aging PRs
            </PanelLabel>
            <p className="text-[11px] text-muted-foreground mb-2">
              Open &gt; 3 days, not draft
            </p>
            {agingPRs.length === 0 ? (
              <Empty>None — all clear</Empty>
            ) : (
              <div className="space-y-2.5">
                {agingPRs.slice(0, 10).map((p) => (
                  <PRRow
                    key={`${p.repo}-${p.number}`}
                    pr={p}
                    pill={<AgePill hours={p.age} />}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {hasLinear ? (
          <Card
            className={cn(
              linear.blockedIssues.length === 0
                ? "border-emerald-500/35 bg-emerald-500/[0.03]"
                : "border-destructive/50 bg-destructive/[0.04]",
            )}
          >
            <CardContent className="pt-5">
              <PanelLabel
                source="linear"
                count={linear.blockedIssues.length}
                ok={linear.blockedIssues.length === 0}
              >
                Blocked issues
              </PanelLabel>
              <p className="text-[11px] text-muted-foreground mb-2">
                Blocked status or label
              </p>
              {linear.blockedIssues.length === 0 ? (
                <Empty>None — all clear</Empty>
              ) : (
                <div className="space-y-2.5">
                  {linear.blockedIssues.map((i) => (
                    <IssueRow key={i.id} issue={i} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-5">
              <PanelLabel>Blocked issues</PanelLabel>
              <p className="text-[11px] text-muted-foreground mb-2">Linear</p>
              <Empty>Connect Linear to see blocked work</Empty>
            </CardContent>
          </Card>
        )}

        <Card
          className={cn(
            reviewQueue.length === 0
              ? "border-emerald-500/35 bg-emerald-500/[0.03]"
              : "border-destructive/50 bg-destructive/[0.04]",
          )}
        >
          <CardContent className="pt-5">
            <PanelLabel
              count={reviewQueue.length}
              ok={reviewQueue.length === 0}
            >
              Review queue
            </PanelLabel>
            <p className="text-[11px] text-muted-foreground mb-2">
              Open PRs with no submitted review yet
            </p>
            {reviewQueue.length === 0 ? (
              <Empty>None — all clear</Empty>
            ) : (
              <div className="space-y-2.5">
                {reviewQueue.slice(0, 10).map((p) => (
                  <PRRow
                    key={`${p.repo}-${p.number}`}
                    pr={p}
                    pill={<AgePill hours={p.age} />}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
