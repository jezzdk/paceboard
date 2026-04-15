import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function RateLimitBadge({ rl }) {
  const pct      = rl.remaining / rl.limit
  const resetIn  = Math.max(0, Math.ceil((rl.reset * 1000 - Date.now()) / 60000))
  const resetStr = resetIn === 0 ? "resetting…" : `resets in ${resetIn}m`
  const color    = pct > 0.4 ? "bg-emerald-500" : pct > 0.15 ? "bg-amber-500" : "bg-destructive"
  const text     = pct > 0.4 ? "text-emerald-500" : pct > 0.15 ? "text-amber-500" : "text-destructive"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card cursor-default select-none">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ratelimit</span>
            <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", color)}
                style={{ width: `${Math.max(pct * 100, 2)}%` }} />
            </div>
            <span className={cn("text-xs font-mono font-medium", text)}>
              {rl.remaining.toLocaleString()}<span className="text-muted-foreground">/{rl.limit.toLocaleString()}</span>
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] space-y-1 py-2">
          <p className="font-semibold">GitHub API Rate Limit</p>
          <p className="text-xs leading-relaxed opacity-90">
            GitHub allows 5,000 authenticated API requests per hour. Paceboard uses these to fetch PR lists, details, reviews, and comments.
          </p>
          <p className="text-xs opacity-75">{rl.remaining.toLocaleString()} remaining · {resetStr}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
