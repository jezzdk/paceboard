export const fmt  = n => n == null ? "—" : n.toLocaleString()
export const fmtH = h => {
  if (h == null) return "—"
  if (h < 1)  return `${Math.round(h * 60)}m`
  if (h < 24) return `${h.toFixed(1)}h`
  return `${(h / 24).toFixed(1)}d`
}
export const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
export const fmtDateFull = iso => new Date(iso).toLocaleDateString()
