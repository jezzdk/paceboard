import { Badge } from "@/components/ui/badge"
import { fmtH } from "@/lib/format"

export function LeadTimePill({ hours }) {
  if (hours == null) return <span className="text-muted-foreground">—</span>
  let variant = "blue"
  if (hours < 2)   variant = "success"
  else if (hours < 8)  variant = "success"
  else if (hours > 168) variant = "danger"
  else if (hours > 72)  variant = "warning"
  return <Badge variant={variant} className="font-mono">{fmtH(hours)}</Badge>
}

export function AgePill({ hours }) {
  let variant = "success"
  if (hours > 168) variant = "danger"
  else if (hours > 72) variant = "warning"
  return <Badge variant={variant} className="font-mono">{fmtH(hours)}</Badge>
}

export function SizePill({ size, add, del }) {
  return <Badge variant={size.variant} title={`+${add} −${del}`} className="font-mono cursor-help">{size.label}</Badge>
}

export function StatusPill({ draft, age }) {
  if (draft) return <Badge variant="secondary">Draft</Badge>
  if (age > 72) return <Badge variant="danger">Stale</Badge>
  return <Badge variant="success">Active</Badge>
}
