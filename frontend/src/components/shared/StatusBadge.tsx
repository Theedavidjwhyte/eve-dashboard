import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status: "Won" | "Lost" | "Pipe"
}

interface CommitBadgeProps {
  commit: string
}

interface RiskBadgeProps {
  risk?: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "Won")
    return <Badge variant="solid" accent="sap">Won</Badge>
  if (status === "Lost")
    return <Badge variant="destructive">Lost</Badge>
  return <Badge variant="outline" accent="orange">Pipe</Badge>
}

export function CommitBadge({ commit }: CommitBadgeProps) {
  if (commit === "Commit")
    return <Badge variant="solid" accent="info">Commit</Badge>
  if (commit === "Upside")
    return <Badge variant="solid" accent="purple">Upside</Badge>
  return <Badge variant="outline">{commit || "Pipeline"}</Badge>
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  if (!risk) return null
  return <Badge variant="destructive">Risk</Badge>
}

export function KeyDealBadge({ keyDeal }: { keyDeal?: string }) {
  if (!keyDeal) return null
  return <Badge variant="solid" accent="teal">Key</Badge>
}
