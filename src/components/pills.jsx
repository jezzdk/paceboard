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

