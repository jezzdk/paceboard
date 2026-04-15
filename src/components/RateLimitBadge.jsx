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
            <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", color)}
                style={{ width: `${Math.max(pct * 100, 2)}%` }} />
            </div>
            <span className={cn("text-xs font-mono font-medium", text)}>
              {rl.remaining.toLocaleString()}<span className="text-muted-foreground">/{rl.limit.toLocaleString()}</span>
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {rl.remaining.toLocaleString()} API calls remaining · {resetStr}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
