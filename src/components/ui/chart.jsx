import * as React from "react"
import { ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

// ── Context ───────────────────────────────────────────────────────────────────

const ChartContext = React.createContext(null)

function useChart() {
  const ctx = React.useContext(ChartContext)
  if (!ctx) throw new Error("useChart must be used inside <ChartContainer>")
  return ctx
}

// ── ChartContainer ────────────────────────────────────────────────────────────
// config: { [seriesKey]: { label: string, color?: string } }
// Colors fall back to hsl(var(--chart-N)) in declaration order.

export function ChartContainer({ config, children, className }) {
  const colorVars = Object.fromEntries(
    Object.entries(config).map(([key, val], i) => [
      `--color-${key}`,
      val.color ?? `hsl(var(--chart-${i + 1}))`,
    ])
  )
  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn("w-full", className)} style={colorVars}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

// ── ChartTooltipContent ───────────────────────────────────────────────────────

export function ChartTooltipContent({
  active, payload, label,
  labelFormatter,
  hideLabel = false,
}) {
  const { config } = useChart()
  if (!active || !payload?.length) return null
  return (
    <div className="grid min-w-[8rem] gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      {!hideLabel && (
        <p className="font-medium text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="grid gap-1">
        {payload.map((item, i) => {
          const cfg = config[item.dataKey] ?? {}
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: item.fill || item.color }}
              />
              <span className="text-muted-foreground flex-1">{cfg.label ?? item.name}</span>
              <span className="font-mono font-medium tabular-nums text-foreground">{item.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── ChartLegendContent ────────────────────────────────────────────────────────

export function ChartLegendContent({ payload }) {
  const { config } = useChart()
  if (!payload?.length) return null
  return (
    <div className="flex items-center justify-center gap-4 pt-2">
      {payload.map((item, i) => {
        const cfg = config[item.dataKey ?? item.value] ?? {}
        return (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] text-muted-foreground">{cfg.label ?? item.value}</span>
          </div>
        )
      })}
    </div>
  )
}

// Re-export recharts primitives so consumers don't need a direct recharts import
export { Tooltip as ChartTooltip, Legend as ChartLegend } from "recharts"
