import { useMemo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { PctBar } from "@/components/shared/PctBar"
import { fmt, fmtPct } from "@/lib/formatters"
import { getADBudget } from "@/lib/budgetHelpers"
import { getAvatar } from "@/config/avatars"
import { MONTHS } from "@/config/months"
import { useDashboardStore } from "@/store/dashboardStore"
import { TrendingUp, Target, AlertTriangle, CheckCircle2, Layers } from "lucide-react"
import type { Deal } from "@/types"

interface ADCardModalProps {
  name: string | null
  onClose: () => void
  open?: boolean
}

export function ADCardModal({ name, onClose }: ADCardModalProps) {
  const { data, nonSFDeals, oiTargets, monthlyBudget, arrDeals } = useDashboardStore()
  const avatar = name ? getAvatar(name) : null

  const stats = useMemo(() => {
    if (!name) return null
    const allDeals = [...data, ...(nonSFDeals ?? [])]
    const deals = allDeals.filter((d) => d.User === name)
    const won = deals.filter((d) => d._stageSummary === "Won")
    const pipe = deals.filter((d) => d._stageSummary === "Pipe")
    const lost = deals.filter((d) => d._stageSummary === "Lost")
    const commits = pipe.filter((d) => d._commit === "Commit")
    const risks = pipe.filter((d) => d._risk === "Risk")
    const keys = pipe.filter((d) => d._keyDeal === "Key")

    const totalWon = won.reduce((s, r) => s + (r._val ?? 0), 0)
    const totalPipe = pipe.reduce((s, r) => s + (r._val ?? 0), 0)
    const totalCommit = commits.reduce((s, r) => s + (r._val ?? 0), 0)
    const totalRisk = risks.reduce((s, r) => s + (r._val ?? 0), 0)
    const budget = getADBudget(name, MONTHS, oiTargets)
    const winRate = won.length + lost.length > 0 ? won.length / (won.length + lost.length) : 0

    // Top deals
    const topDeals = [...pipe]
      .sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
      .slice(0, 5)

    // Monthly won breakdown
    const monthlyWon: Record<string, number> = {}
    MONTHS.forEach((m) => {
      monthlyWon[m] = won
        .filter((d) => d._month === m)
        .reduce((s, r) => s + (r._val ?? 0), 0)
    })

    // ARR stats
    const adArr = arrDeals.filter((d) => d.assignedAD === name || d.user === name)
    const totalArr = adArr.reduce((s, r) => s + (r.totalAbc ?? 0), 0)

    return {
      deals, won, pipe, lost, commits, risks, keys,
      totalWon, totalPipe, totalCommit, totalRisk,
      budget, winRate, topDeals, monthlyWon, totalArr,
      arrDeals: adArr.length,
    }
  }, [name, data, nonSFDeals, oiTargets, arrDeals])

  if (!name || !stats) return null
  const av = avatar ?? { initials: "?", bg: "64748b", gradient: "from-slate-500 to-slate-600", role: "Account Manager" }

  const attainment = stats.budget > 0 ? stats.totalWon / stats.budget : 0
  const gap = stats.budget - stats.totalWon

  return (
    <Dialog open={!!name} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 bg-card border-border">

        {/* Header */}
        <div className={`bg-gradient-to-r ${av.gradient} p-6`}>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg"
              style={{ backgroundColor: `#${av.bg}` }}
            >
              {av.initials}
            </div>
            <div>
              <h2 className="text-white font-black text-2xl tracking-tight">{name}</h2>
              <p className="text-white/70 text-sm">{av.role}</p>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {stats.deals.length} deals
                </Badge>
                {stats.totalArr > 0 && (
                  <Badge className="bg-white/20 text-white border-white/30 text-xs">
                    ARR: {fmt(stats.totalArr)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-4 border">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground font-medium">YTD Won</span>
              </div>
              <div className="text-2xl font-black tabular-nums">{fmt(stats.totalWon)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stats.won.length} deals closed</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 border">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">FY Budget</span>
              </div>
              <div className="text-2xl font-black tabular-nums">{fmt(stats.budget)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {gap > 0 ? `${fmt(gap)} remaining` : `${fmt(Math.abs(gap))} over target`}
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 border">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground font-medium">Open Pipeline</span>
              </div>
              <div className="text-2xl font-black tabular-nums">{fmt(stats.totalPipe)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stats.pipe.length} deals · {fmt(stats.totalCommit)} commit</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 border">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground font-medium">At Risk</span>
              </div>
              <div className="text-2xl font-black tabular-nums">{fmt(stats.totalRisk)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stats.risks.length} risk deals · {stats.keys.length} key deals</div>
            </div>
          </div>

          {/* Attainment bar */}
          <div className="bg-muted/50 rounded-xl p-4 border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">Budget Attainment</span>
              <span className={`text-lg font-black tabular-nums ${attainment >= 1 ? "text-emerald-500" : attainment >= 0.7 ? "text-primary" : "text-destructive"}`}>
                {fmtPct(attainment)}
              </span>
            </div>
            <PctBar value={attainment} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>Won: {fmt(stats.totalWon)}</span>
              <span>Target: {fmt(stats.budget)}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/30 rounded-lg p-3 border">
              <div className="text-lg font-black">{fmtPct(stats.winRate)}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Win Rate</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border">
              <div className="text-lg font-black">{stats.lost.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Lost Deals</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border">
              <div className="text-lg font-black">{stats.commits.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Commits</div>
            </div>
          </div>

          {/* Top pipeline deals */}
          {stats.topDeals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Top Pipeline Deals</span>
              </div>
              <div className="space-y-2">
                {stats.topDeals.map((d, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 border">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{d["Opportunity Name"] ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{d["Account Name"] ?? "—"} · {d._month ?? "—"}</div>
                    </div>
                    <div className="shrink-0 ml-3 text-right">
                      <div className="text-xs font-bold tabular-nums">{fmt(d._val ?? 0)}</div>
                      <div className="text-[10px] text-muted-foreground">{d._commit ?? "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Won Heatmap */}
          <div>
            <div className="text-sm font-semibold mb-2">Monthly Won</div>
            <div className="grid grid-cols-6 gap-1">
              {MONTHS.map((m) => {
                const val = stats.monthlyWon[m] ?? 0
                const maxMonth = Math.max(...Object.values(stats.monthlyWon))
                const intensity = maxMonth > 0 ? val / maxMonth : 0
                return (
                  <div
                    key={m}
                    className="rounded p-2 text-center border"
                    style={{
                      backgroundColor: val > 0
                        ? `rgba(20, 184, 166, ${0.15 + intensity * 0.65})`
                        : undefined,
                    }}
                  >
                    <div className="text-[9px] text-muted-foreground font-medium">{m}</div>
                    <div className="text-[10px] font-bold tabular-nums mt-0.5">
                      {val > 0 ? fmt(val) : "—"}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
