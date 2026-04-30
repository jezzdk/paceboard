import { useMemo, useState } from "react"
import {
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip, Legend,
  ResponsiveContainer,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegendContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { fmtDate } from "@/lib/format"

// ── Throughput chart ──────────────────────────────────────────────────────────
// dailyData: [{ date, prs, issues? }]  — issues present only when Linear connected

const PR_COLOR     = "hsl(var(--chart-1))"
const ISSUES_COLOR = "hsl(var(--chart-2))"

const throughputConfig = {
  prs:    { label: "PRs merged",    color: PR_COLOR     },
  issues: { label: "Issues closed", color: ISSUES_COLOR },
}

function toWeekly(daily) {
  const weeks = {}
  daily.forEach(({ date, prs, issues = 0 }) => {
    const d   = new Date(date)
    const mon = new Date(d)
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const key = mon.toISOString().slice(0, 10)
    if (!weeks[key]) weeks[key] = { date: key, prs: 0, issues: 0 }
    weeks[key].prs    += prs
    weeks[key].issues += issues
  })
  return Object.values(weeks).sort((a, b) => a.date.localeCompare(b.date))
}

export function ThroughputChart({ dailyData, hasLinear }) {
  const [gran, setGran] = useState("weekly")

  const data = useMemo(
    () => gran === "weekly" ? toWeekly(dailyData) : dailyData,
    [dailyData, gran]
  )

  const interval = data.length > 20 ? Math.ceil(data.length / 8) - 1 : 0

  return (
    <div>
      {/* Granularity toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 rounded-md bg-muted p-0.5">
          {["daily", "weekly"].map(g => (
            <button
              key={g}
              onClick={() => setGran(g)}
              className={cn(
                "text-xs font-semibold px-2.5 py-1 rounded transition-colors",
                gran === g
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {g}
            </button>
          ))}
        </div>
        {hasLinear && (
          <div className="flex items-center gap-3">
            {[
              { key: "prs",    label: "PRs merged",    color: PR_COLOR     },
              { key: "issues", label: "Issues closed", color: ISSUES_COLOR },
            ].map(s => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="text-[11px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ChartContainer config={throughputConfig} className="h-44">
        <BarChart data={data} barGap={2} barCategoryGap="25%">
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={interval}
            tickFormatter={fmtDate}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis hide />
          <ChartTooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
            content={<ChartTooltipContent labelFormatter={fmtDate} />}
          />
          <Bar dataKey="prs" fill="var(--color-prs)" radius={[3, 3, 0, 0]} maxBarSize={32} />
          {hasLinear && (
            <Bar dataKey="issues" fill="var(--color-issues)" radius={[3, 3, 0, 0]} maxBarSize={32} />
          )}
        </BarChart>
      </ChartContainer>
    </div>
  )
}

// ── Lead time distribution chart ──────────────────────────────────────────────
// data: [{ label, count }]

const leadTimeConfig = {
  count: { label: "PRs", color: PR_COLOR },
}

export function LeadTimeChart({ data }) {
  return (
    <ChartContainer config={leadTimeConfig} className="h-44">
      <BarChart data={data} barCategoryGap="20%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis hide />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  )
}
