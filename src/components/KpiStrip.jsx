import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function KpiStrip({ kpis, fmtH, fmt, owner, repo }) {
  const base = owner && repo ? `https://github.com/${owner}/${repo}/pulls` : null

  const items = [
    {
      label: "Merged PRs", value: fmt(kpis.mergedCount),
      href: base ? `${base}?q=is%3Apr+is%3Amerged` : null,
    },
    {
      label: "Open PRs", value: fmt(kpis.openCount), warn: kpis.openCount > 10,
      href: base ? `${base}?q=is%3Apr+is%3Aopen` : null,
    },
    { label: "Median Lead Time",   value: fmtH(kpis.medianLeadTime),   sub: "open → merge" },
    { label: "Median Review Time", value: fmtH(kpis.medianReviewTime), sub: "open → 1st review" },
    { label: "Avg Commits / PR",   value: kpis.avgCommitsPerPR ?? "—" },
    { label: "Avg Review Rounds",  value: kpis.avgChangesReq ?? "—",   sub: "changes requested" },
    {
      label: "Stale PRs (>3d)", value: fmt(kpis.stalePRs), warn: kpis.stalePRs > 3,
      href: base ? `${base}?q=is%3Apr+is%3Aopen` : null,
    },
    {
      label: "No Reviewer", value: fmt(kpis.prsNoReviewer), danger: kpis.prsNoReviewer > 0,
      href: base ? `${base}?q=is%3Apr+is%3Aopen+review%3Anone` : null,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      {items.map(item => {
        const inner = (
          <>
            <div className={cn("text-2xl font-bold leading-none mb-1",
              item.danger ? "text-destructive" : item.warn ? "text-amber-500" : "text-foreground")}>
              {item.value}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</div>
            {item.sub && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{item.sub}</div>}
          </>
        )
        return item.href ? (
          <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="block">
            <Card className="p-4 cursor-pointer transition-all hover:ring-1 hover:ring-primary/40 hover:shadow-sm">
              {inner}
            </Card>
          </a>
        ) : (
          <Card key={item.label} className="p-4">
            {inner}
          </Card>
        )
      })}
    </div>
  )
}
