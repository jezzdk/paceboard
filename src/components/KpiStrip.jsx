import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function KpiStrip({ kpis, fmtH, fmt, owner, repo }) {
  const base = owner && repo ? `https://github.com/${owner}/${repo}/pulls` : null

  const items = [
    {
      label: "Merged PRs", value: fmt(kpis.mergedCount),
      tip: "Total pull requests merged within the selected period.",
      href: base ? `${base}?q=is%3Apr+is%3Amerged` : null,
    },
    {
      label: "Open PRs", value: fmt(kpis.openCount), warn: kpis.openCount > 10,
      tip: "Pull requests currently open (not merged or closed).",
      href: base ? `${base}?q=is%3Apr+is%3Aopen` : null,
    },
    {
      label: "Avg Lead Time", value: fmtH(kpis.avgLeadTime), sub: "open → merge",
      tip: "Average time from when a PR was opened to when it was merged. Includes all merged PRs in the period.",
    },
    {
      label: "Avg Review Time", value: fmtH(kpis.avgReviewTime), sub: "open → 1st review",
      tip: "Average time from PR opened to the first review being submitted. PRs with no review are excluded.",
    },
    {
      label: "Avg Commits / PR", value: kpis.avgCommitsPerPR ?? "—",
      tip: "Average number of commits per merged pull request in the selected period.",
    },
    {
      label: "Avg Review Rounds", value: kpis.avgChangesReq ?? "—", sub: "changes requested",
      tip: "Average number of 'Changes Requested' review events per merged PR. Higher values indicate more back-and-forth.",
    },
    {
      label: "Stale PRs (>3d)", value: fmt(kpis.stalePRs), warn: kpis.stalePRs > 3,
      tip: "Open (non-draft) PRs that have been waiting for more than 3 days without being merged or closed.",
      href: base ? `${base}?q=is%3Apr+is%3Aopen` : null,
    },
    {
      label: "No Reviewer", value: fmt(kpis.prsNoReviewer), danger: kpis.prsNoReviewer > 0,
      tip: "Open (non-draft) PRs with no reviewer assigned. These are at risk of being forgotten.",
      href: base ? `${base}?q=is%3Apr+is%3Aopen+review%3Anone` : null,
    },
  ]

  return (
    <TooltipProvider>
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

          const card = item.href ? (
            <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="block">
              <Card className="p-4 cursor-pointer transition-all hover:ring-1 hover:ring-primary/40 hover:shadow-sm h-full">
                {inner}
              </Card>
            </a>
          ) : (
            <Card key={item.label} className="p-4 h-full">
              {inner}
            </Card>
          )

          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <div>{card}</div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-center leading-relaxed">
                {item.tip}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
