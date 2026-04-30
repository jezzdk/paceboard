import { useMemo } from "react";
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { fmtDate } from "@/lib/format";

// ── Throughput chart ──────────────────────────────────────────────────────────
// dailyData: [{ date, prs, issues? }] — last ~30 days, one row per day

const PR_COLOR = "hsl(var(--chart-1))";
const ISSUES_COLOR = "hsl(var(--chart-2))";

const throughputConfig = {
  prs: { label: "PRs merged", color: PR_COLOR },
  issues: { label: "Issues closed", color: ISSUES_COLOR },
};

export function ThroughputChart({ dailyData, hasLinear }) {
  const data = useMemo(() => dailyData, [dailyData]);
  const interval = data.length > 20 ? Math.ceil(data.length / 8) - 1 : 0;

  return (
    <div>
      <div className="flex min-h-[22px] items-center justify-end mb-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: PR_COLOR }}
            />
            <span className="text-[11px] text-muted-foreground">
              PRs merged
            </span>
          </div>
          {hasLinear && (
            <div className="flex items-center gap-1.5">
              <span
                className="h-0.5 w-3 rounded-sm"
                style={{ backgroundColor: ISSUES_COLOR }}
              />
              <span className="text-[11px] text-muted-foreground">
                Issues closed
              </span>
            </div>
          )}
        </div>
      </div>

      <ChartContainer config={throughputConfig} className="h-52">
        <ComposedChart data={data} barGap={2} barCategoryGap="18%">
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
          />
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
          <Bar
            dataKey="prs"
            fill="var(--color-prs)"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          {hasLinear && (
            <Line
              type="monotone"
              dataKey="issues"
              stroke="var(--color-issues)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}

// ── Lead time distribution chart ──────────────────────────────────────────────
// data: [{ label, count }]

const leadTimeConfig = {
  count: { label: "Merged PRs", color: PR_COLOR },
};

export function LeadTimeChart({ data }) {
  return (
    <div>
      <div className="flex min-h-[22px] items-center justify-end mb-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: PR_COLOR }}
            />
            <span className="text-[11px] text-muted-foreground">
              Merged PRs
            </span>
          </div>
        </div>
      </div>

      <ChartContainer config={leadTimeConfig} className="h-52">
        <BarChart data={data} barCategoryGap="20%">
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
          />
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
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[3, 3, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
