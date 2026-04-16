import { useState } from "react"
import {
  Dialog,
  DialogContent,
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
import { fmt, fmtPct } from "@/lib/formatters"
import { ChevronUp, ChevronDown, X, TrendingUp, Target, AlertTriangle, Trophy, Layers } from "lucide-react"
import type { Deal } from "@/types"

type SortKey = "_val" | "_month" | "User" | "Account Name" | "Opportunity Name" | "_product" | "_stageSummary" | "_commit" | "_abc" | "_services"

interface DealDetailModalProps {
  open: boolean
  onClose: () => void
  title: string
  deals: Deal[]
}

function MetricTile({ icon, label, value, sub, accent }: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: "green" | "blue" | "amber" | "red" | "purple" | "default"
}) {
  const colors = {
    green: "text-emerald-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
    red: "text-red-400",
    purple: "text-purple-400",
    default: "text-foreground",
  }
  return (
    <div className="bg-muted/40 rounded-xl p-3 flex flex-col gap-1 min-w-[120px]">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="w-3.5 h-3.5">{icon}</span>
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-lg font-bold leading-tight ${colors[accent ?? "default"]}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>}
    </div>
  )
}

export function DealDetailModal({ open, onClose, title, deals }: DealDetailModalProps) {
  const [sortKey, setSortKey] = useState<SortKey>("_val")
  const [sortAsc, setSortAsc] = useState(false)
  const [view, setView] = useState<"table" | "summary">("table")

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
        <span className={`flex items-center gap-1 ${right ? "justify-end" : "justify-start"}`}>
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
    const va = (a as Record<string, unknown>)[sortKey] ?? ""
    const vb = (b as Record<string, unknown>)[sortKey] ?? ""
    if (typeof va === "number" && typeof vb === "number")
      return sortAsc ? va - vb : vb - va
    return sortAsc
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va))
  })

  // ── Metrics ──────────────────────────────────────────────────────────────
  const wonDeals = deals.filter(r => r._stageSummary === "Won")
  const lostDeals = deals.filter(r => r._stageSummary === "Lost")
  const pipeDeals = deals.filter(r => r._stageSummary === "Pipe")
  const commitDeals = pipeDeals.filter(r => r._commit === "Commit")
  const riskDeals = deals.filter(r => r._risk === "Risk")

  const totalVal = deals.reduce((s, r) => s + (r._val ?? 0), 0)
  const wonVal = wonDeals.reduce((s, r) => s + (r._val ?? 0), 0)
  const pipeVal = pipeDeals.reduce((s, r) => s + (r._val ?? 0), 0)
  const commitVal = commitDeals.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalABC = deals.reduce((s, r) => s + (r._abc ?? 0), 0)
  const totalServices = deals.reduce((s, r) => s + (r._services ?? 0), 0)
  const riskVal = riskDeals.reduce((s, r) => s + (r._val ?? 0), 0)

  const closedCount = wonDeals.length + lostDeals.length
  const winRate = closedCount > 0 ? wonDeals.length / closedCount : 0

  // AD breakdown
  const adBreakdown = Array.from(new Set(deals.map(r => r.User ?? ""))).map(u => ({
    user: u,
    won: deals.filter(r => r.User === u && r._stageSummary === "Won").reduce((s, r) => s + (r._val ?? 0), 0),
    pipe: deals.filter(r => r.User === u && r._stageSummary === "Pipe").reduce((s, r) => s + (r._val ?? 0), 0),
    count: deals.filter(r => r.User === u).length,
  })).sort((a, b) => (b.won + b.pipe) - (a.won + a.pipe))

  // Top pipeline deals
  const topPipe = [...pipeDeals].sort((a, b) => (b._val ?? 0) - (a._val ?? 0)).slice(0, 5)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden gap-0 bg-card border-border shadow-2xl">

        {/* ── Header ── */}
        <div className="px-6 py-4 border-b flex-shrink-0 bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span><span className="font-semibold text-foreground">{deals.length}</span> deals</span>
                <span>·</span>
                <span>Split ABC <span className="font-semibold text-foreground">{fmt(totalVal)}</span></span>
                {totalABC > 0 && <><span>·</span><span>Total ABC <span className="font-semibold text-foreground">{fmt(totalABC)}</span></span></>}
                {wonVal > 0 && <><span>·</span><span className="text-emerald-400 font-medium">Won {fmt(wonVal)}</span></>}
                {pipeVal > 0 && <><span>·</span><span className="text-blue-400 font-medium">Pipe {fmt(pipeVal)}</span></>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-border overflow-hidden text-[10px]">
                {(["table", "summary"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-3 py-1.5 transition-colors capitalize ${view === v ? "bg-primary text-primary-foreground font-semibold" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                    {v}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="px-6 py-3 border-b flex-shrink-0 bg-muted/20">
          <div className="flex gap-3 overflow-x-auto pb-1">
            <MetricTile icon={<Trophy className="w-3.5 h-3.5" />} label="Won" value={fmt(wonVal)} sub={`${wonDeals.length} deals closed`} accent="green" />
            <MetricTile icon={<TrendingUp className="w-3.5 h-3.5" />} label="Open Pipeline" value={fmt(pipeVal)} sub={`${pipeDeals.length} deals · ${fmt(commitVal)} commit`} accent="blue" />
            <MetricTile icon={<Target className="w-3.5 h-3.5" />} label="Win Rate" value={fmtPct(winRate)} sub={`${wonDeals.length}W · ${lostDeals.length}L · ${closedCount} closed`} accent={winRate >= 0.6 ? "green" : winRate >= 0.4 ? "amber" : "red"} />
            <MetricTile icon={<Layers className="w-3.5 h-3.5" />} label="Commits" value={String(commitDeals.length)} sub={fmt(commitVal)} accent="purple" />
            {riskDeals.length > 0 && <MetricTile icon={<AlertTriangle className="w-3.5 h-3.5" />} label="At Risk" value={fmt(riskVal)} sub={`${riskDeals.length} risk deals`} accent="red" />}
            {totalServices > 0 && <MetricTile icon={<Layers className="w-3.5 h-3.5" />} label="Services" value={fmt(totalServices)} sub="attached services" accent="amber" />}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto">
          {deals.length === 0 ? (
            <p className="text-muted-foreground text-sm py-16 text-center">No deals to show.</p>
          ) : view === "table" ? (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <SortHdr col="User" label="AD" />
                  <SortHdr col="Account Name" label="Account" />
                  <SortHdr col="Opportunity Name" label="Opportunity" />
                  <SortHdr col="_val" label="Split ABC" right />
                  <SortHdr col="_abc" label="Total ABC" right />
                  <SortHdr col="_services" label="Services" right />
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
                      <TableCell className="whitespace-nowrap"><ADCell name={r.User ?? ""} /></TableCell>
                      <TableCell className="max-w-[160px]"><span className="block truncate text-xs" title={r["Account Name"] ?? ""}>{r["Account Name"] ?? ""}</span></TableCell>
                      <TableCell className="font-medium max-w-[200px]"><span className="block truncate text-xs" title={r["Opportunity Name"] ?? ""}>{r["Opportunity Name"] ?? ""}</span></TableCell>
                      <TableCell className={`text-right font-bold whitespace-nowrap text-xs ${isWon ? "text-emerald-400" : isLost ? "text-destructive" : ""}`}>{fmt(r._val ?? 0)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{(r._abc ?? 0) > 0 ? fmt(r._abc ?? 0) : "—"}</TableCell>
                      <TableCell className="text-right text-xs text-emerald-500">{(r._services ?? 0) > 0 ? fmt(r._services ?? 0) : "—"}</TableCell>
                      <TableCell><StatusBadge status={r._stageSummary ?? "Pipe"} /></TableCell>
                      <TableCell><CommitBadge commit={r._commit ?? ""} /></TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{r._month ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r._product ?? ""}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px]"><span className="block truncate" title={r["Next Step"] ?? ""}>{(r["Next Step"] ?? "").substring(0, 60) || "—"}</span></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            /* ── Summary View ── */
            <div className="p-6 space-y-6">
              {/* AD Breakdown */}
              {adBreakdown.length > 1 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">AD Breakdown</p>
                  <div className="space-y-2">
                    {adBreakdown.map((ad) => {
                      const total = ad.won + ad.pipe
                      const maxTotal = Math.max(...adBreakdown.map(a => a.won + a.pipe))
                      const pct = maxTotal > 0 ? total / maxTotal : 0
                      return (
                        <div key={ad.user} className="flex items-center gap-3">
                          <span className="text-xs font-medium w-28 shrink-0">{ad.user.split(" ")[0]}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct * 100}%` }} />
                          </div>
                          <span className="text-xs font-bold w-20 text-right">{fmt(ad.won + ad.pipe)}</span>
                          <span className="text-xs text-muted-foreground w-16 text-right">{ad.count} deals</span>
                          {ad.won > 0 && <span className="text-xs text-emerald-400 w-20 text-right">{fmt(ad.won)} won</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Top Pipeline */}
              {topPipe.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Pipeline Deals</p>
                  <div className="space-y-2">
                    {topPipe.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r["Opportunity Name"] ?? ""}</p>
                          <p className="text-xs text-muted-foreground">{r["Account Name"] ?? ""} · {r._month ?? ""}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <CommitBadge commit={r._commit ?? ""} />
                          <span className="text-sm font-bold">{fmt(r._val ?? 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Won deals */}
              {wonDeals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Closed Won ({wonDeals.length})</p>
                  <div className="space-y-2">
                    {[...wonDeals].sort((a,b) => (b._val??0)-(a._val??0)).map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r["Opportunity Name"] ?? ""}</p>
                          <p className="text-xs text-muted-foreground">{r["Account Name"] ?? ""} · {r._month ?? ""}</p>
                        </div>
                        <span className="text-sm font-bold text-emerald-400 shrink-0 ml-3">{fmt(r._val ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {deals.length > 0 && (
          <div className="px-6 py-3 border-t bg-muted/30 flex-shrink-0 flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
            <span>{sorted.length} rows</span>
            {wonDeals.length > 0 && <span className="text-emerald-400 font-medium">{wonDeals.length} won · {fmt(wonVal)}</span>}
            {pipeDeals.length > 0 && <span className="text-blue-400 font-medium">{pipeDeals.length} pipe · {fmt(pipeVal)}</span>}
            {lostDeals.length > 0 && <span className="text-destructive font-medium">{lostDeals.length} lost</span>}
            <span className="ml-auto">Click column headers to sort · Toggle Summary for visual breakdown</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
