import { useState } from "react"
import { cn } from "@/lib/utils"
import { fmtDate } from "@/lib/format"

export function BarChart({ data, valueKey = "count", labelKey = "label", color = "bg-primary" }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className={cn("w-full rounded-t transition-all", color, d[valueKey] === 0 && "opacity-20")}
            style={{ height: `${(d[valueKey] / max) * 64}px`, minHeight: d[valueKey] > 0 ? 3 : 0 }}
          />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  )
}

export function ThroughputChart({ daily, weekly }) {
  const [gran, setGran] = useState("weekly")
  const [hov,  setHov]  = useState(null)
  const data = gran === "daily" ? daily : weekly
  const max  = Math.max(...data.map(d => d.count), 1)
  const avgV = data.length ? (data.reduce((s,d) => s+d.count, 0) / data.length).toFixed(1) : "0"
  const N    = data.length > 60 ? Math.ceil(data.length/18) : data.length > 28 ? 4 : data.length > 14 ? 2 : 1

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 rounded-md bg-muted p-0.5">
          {["daily","weekly"].map(g => (
            <button key={g} onClick={() => setGran(g)}
              className={cn("text-xs font-semibold px-2.5 py-1 rounded transition-colors",
                gran === g ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {g}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {hov != null
            ? <><span className="text-primary font-semibold">{data[hov]?.count}</span> PRs · {fmtDate(data[hov]?.date)}</>
            : <><span className="text-primary font-semibold">{avgV}</span> avg/{gran === "daily" ? "day" : "week"}</>}
        </span>
      </div>
      <div className="flex items-end gap-0.5 h-28 pb-6">
        {data.map((d, i) => {
          const h = Math.max((d.count / max) * 88, d.count > 0 ? 3 : 0)
          return (
            <div key={i} className="flex-1 flex flex-col justify-end items-center h-[88px] relative cursor-default"
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
              <div className={cn("w-full rounded-t transition-colors", hov === i ? "bg-primary/80" : d.count === 0 ? "bg-border" : "bg-primary")}
                style={{ height: h }} />
              {i % N === 0 && (
                <span className="absolute -bottom-5 text-[10px] text-muted-foreground whitespace-nowrap left-1/2 -translate-x-1/2">
                  {fmtDate(d.date)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function HeatmapCell({ value, max }) {
  const pct = max > 0 ? value / max : 0
  return (
    <td title={`${value || 0} reviews`}
      style={{ opacity: value === 0 ? 0.15 : 0.15 + pct * 0.85 }}
      className="w-8 h-7 text-center text-xs font-mono bg-primary text-primary-foreground border border-background cursor-default select-none">
      {value || ""}
    </td>
  )
}
