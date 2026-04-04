import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ADCell } from "@/components/shared/ADAvatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { StatusBadge, CommitBadge } from "@/components/shared/StatusBadge"
import { fmt } from "@/lib/formatters"
import { ChevronUp, ChevronDown, X } from "lucide-react"
import type { Deal } from "@/types"

type SortKey = "_val" | "_month" | "User" | "Account Name" | "Opportunity Name" | "_product" | "_stageSummary" | "_commit"

interface DealDetailModalProps {
  open: boolean
  onClose: () => void
  title: string
  deals: Deal[]
}

export function DealDetailModal({ open, onClose, title, deals }: DealDetailModalProps) {
  const [sortKey, setSortKey] = useState<SortKey>("_val")
  const [sortAsc, setSortAsc] = useState(false)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortHdr({ col, label, right }: { col: SortKey; label: string; right?: boolean }) {
    const active = sortKey === col
    return (
      <TableHead
        className={`cursor-pointer select-none whitespace-nowrap ${right ? "text-right" : ""}`}
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1 justify-start">
          {label}
          {active
            ? sortAsc
              ? <ChevronUp className="w-3 h-3 text-primary" />
              : <ChevronDown className="w-3 h-3 text-primary" />
            : <ChevronDown className="w-3 h-3 opacity-20" />}
        </span>
      </TableHead>
    )
  }

  const sorted = [...deals].sort((a, b) => {
    const va = (a as any)[sortKey] ?? ""
    const vb = (b as any)[sortKey] ?? ""
    if (typeof va === "number" && typeof vb === "number")
      return sortAsc ? va - vb : vb - va
    return sortAsc
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va))
  })

  const totalVal = deals.reduce((s, r) => s + (r._val ?? 0), 0)
  const wonVal = deals.filter(r => r._stageSummary === "Won").reduce((s, r) => s + (r._val ?? 0), 0)
  const pipeVal = deals.filter(r => r._stageSummary === "Pipe").reduce((s, r) => s + (r._val ?? 0), 0)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-7xl h-[85vh] flex flex-col p-0 overflow-hidden gap-0 bg-card border-border shadow-2xl">

        {/* ── Header ── */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
                <span><span className="font-semibold text-foreground">{deals.length}</span> deals</span>
                <span>·</span>
                <span>Total <span className="font-semibold text-foreground">{fmt(totalVal)}</span></span>
                {wonVal > 0 && <>
                  <span>·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Won {fmt(wonVal)}</span>
                </>}
                {pipeVal > 0 && <>
                  <span>·</span>
                  <span className="text-primary font-medium">Pipe {fmt(pipeVal)}</span>
                </>}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mt-1 -mr-2" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* ── Scrollable table body ── */}
        <div className="flex-1 overflow-auto">
          {deals.length === 0 ? (
            <p className="text-muted-foreground text-sm py-16 text-center">
              No deals to show.
            </p>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <SortHdr col="User" label="AD" />
                  <SortHdr col="Account Name" label="Account" />
                  <SortHdr col="Opportunity Name" label="Opportunity" />
                  <SortHdr col="_val" label="Value" right />
                  <SortHdr col="_stageSummary" label="Status" />
                  <SortHdr col="_commit" label="Commit" />
                  <SortHdr col="_month" label="Month" />
                  <SortHdr col="_product" label="Product" />
                  <TableHead>Next Step</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((r, i) => {
                  const isWon = r._stageSummary === "Won"
                  const isLost = r._stageSummary === "Lost"
                  return (
                    <TableRow key={i} className={isWon ? "bg-emerald-50/30 dark:bg-emerald-950/10" : isLost ? "bg-red-50/30 dark:bg-red-950/10" : ""}>
                      <TableCell className="whitespace-nowrap">
                        <ADCell name={r.User ?? ""} />
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <span className="block truncate" title={r["Account Name"] ?? ""}>
                          {r["Account Name"] ?? ""}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium max-w-[220px]">
                        <span className="block truncate" title={r["Opportunity Name"] ?? ""}>
                          {r["Opportunity Name"] ?? ""}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-bold whitespace-nowrap ${isWon ? "text-emerald-600 dark:text-emerald-400" : isLost ? "text-destructive" : ""}`}>
                        {fmt(r._val ?? 0)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r._stageSummary ?? "Pipe"} />
                      </TableCell>
                      <TableCell>
                        <CommitBadge commit={r._commit ?? ""} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{r._month ?? "—"}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {r._product ?? ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                        <span className="block truncate" title={r["Next Step"] ?? ""}>
                          {(r["Next Step"] ?? "").substring(0, 80) || "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* ── Footer summary ── */}
        {deals.length > 0 && (
          <div className="px-6 py-3 border-t bg-muted/30 flex-shrink-0 flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
            <span>{sorted.length} rows shown</span>
            {deals.filter(r => r._stageSummary === "Won").length > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {deals.filter(r => r._stageSummary === "Won").length} won · {fmt(wonVal)}
              </span>
            )}
            {deals.filter(r => r._stageSummary === "Pipe").length > 0 && (
              <span className="text-primary font-medium">
                {deals.filter(r => r._stageSummary === "Pipe").length} pipe · {fmt(pipeVal)}
              </span>
            )}
            <span className="ml-auto text-muted-foreground">Click column headers to sort</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
