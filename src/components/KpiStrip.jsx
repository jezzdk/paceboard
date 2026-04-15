import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function KpiStrip({ kpis, fmtH, fmt }) {
  const items = [
    { label: "Merged PRs",         value: fmt(kpis.mergedCount) },
    { label: "Open PRs",           value: fmt(kpis.openCount),          warn: kpis.openCount > 10 },
    { label: "Median Lead Time",   value: fmtH(kpis.medianLeadTime),    sub: "open → merge" },
    { label: "Median Review Time", value: fmtH(kpis.medianReviewTime),  sub: "open → 1st review" },
    { label: "Avg Commits / PR",   value: kpis.avgCommitsPerPR ?? "—" },
    { label: "Avg Review Rounds",  value: kpis.avgChangesReq ?? "—",    sub: "changes requested" },
    { label: "Stale PRs (>3d)",    value: fmt(kpis.stalePRs),           warn: kpis.stalePRs > 3 },
    { label: "No Reviewer",        value: fmt(kpis.prsNoReviewer),      danger: kpis.prsNoReviewer > 0 },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      {items.map(item => (
        <Card key={item.label} className="p-4">
          <div className={cn("text-2xl font-bold leading-none mb-1",
            item.danger ? "text-destructive" : item.warn ? "text-amber-500" : "text-foreground")}>
            {item.value}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</div>
          {item.sub && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{item.sub}</div>}
        </Card>
      ))}
    </div>
  )
}
