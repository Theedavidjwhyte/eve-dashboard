import { useState, useMemo } from "react"
import { useDashboardStore, getSelectedMonths } from "@/store/dashboardStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { KPI } from "@/components/ui/kpi"
import { fmtKM, fmtPct, fmt } from "@/lib/formatters"
import { openDealModal } from "@/lib/modalBus"
import { USERS } from "@/config/users"
import { MONTHS } from "@/config/months"
import { getADBudget, getTeamBudgetForMonths } from "@/lib/budgetHelpers"
import type { Deal, Filters, BudgetTargets } from "@/types"
import {
  Target, TrendingUp, Zap, ChevronDown, ChevronUp,
  Brain, Save, Edit2, Clock, CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── AD Notes (persisted to localStorage) ─────────────────────────────────────
function getNoteKey(ad: string, month: string) { return `eve_r2n_note::${ad}::${month}` }
function getNote(ad: string, month: string): { text: string; ts: string } | null {
  try { return JSON.parse(localStorage.getItem(getNoteKey(ad, month)) ?? "null") } catch { return null }
}
function saveNote(ad: string, month: string, text: string) {
  localStorage.setItem(getNoteKey(ad, month), JSON.stringify({ text, ts: new Date().toISOString() }))
}

function ADNotesSection({ ad }: { ad: string }) {
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth() < 6 ? new Date().getMonth() + 6 : new Date().getMonth() - 6] ?? MONTHS[0])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [, forceUpdate] = useState(0)

  const note = getNote(ad, selectedMonth)
  const monthsWithNotes = MONTHS.filter(m => getNote(ad, m))

  function startEdit() { setDraft(note?.text ?? ""); setEditing(true) }
  function cancelEdit() { setEditing(false) }
  function saveEdit() {
    if (draft.trim()) { saveNote(ad, selectedMonth, draft.trim()); forceUpdate(n => n + 1) }
    setEditing(false)
  }

  return (
    <div className="space-y-3">
      {/* Month selector */}
      <div className="flex flex-wrap gap-1">
        {MONTHS.map(m => {
          const hasNote = !!getNote(ad, m)
          return (
            <button
              key={m}
              onClick={() => { setSelectedMonth(m); setEditing(false) }}
              className={cn(
                "px-2 py-1 text-xs rounded-md border transition-all relative",
                selectedMonth === m ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border"
              )}
            >
              {m}
              {hasNote && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" />}
            </button>
          )
        })}
      </div>

      {/* Note editor */}
      <div className="rounded-lg border bg-muted/20 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground">{selectedMonth} note for {ad.split(" ")[0]}</span>
          <div className="flex gap-1">
            {editing ? (
              <>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={cancelEdit}>Cancel</Button>
                <Button size="sm" className="h-6 text-xs" onClick={saveEdit}><Save className="w-3 h-3 mr-1" />Save</Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={startEdit}>
                <Edit2 className="w-3 h-3 mr-1" />{note ? "Edit" : "Add Note"}
              </Button>
            )}
          </div>
        </div>
        {editing ? (
          <textarea
            className="w-full text-sm bg-background border rounded p-2 min-h-[80px] resize-none"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Add your notes for this month..."
            autoFocus
          />
        ) : note ? (
          <div>
            <p className="text-sm">{note.text}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <Clock className="w-3 h-3 inline mr-1" />
              {new Date(note.ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No note for {selectedMonth}</p>
        )}
      </div>

      {/* Note history */}
      {monthsWithNotes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Note History</p>
          <div className="space-y-1">
            {monthsWithNotes.map(m => {
              const n = getNote(ad, m)!
              return (
                <button key={m} onClick={() => setSelectedMonth(m)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/50 flex items-center justify-between text-xs">
                  <span className="font-medium">{m}</span>
                  <span className="text-muted-foreground truncate max-w-[200px]">{n.text.slice(0, 40)}{n.text.length > 40 ? "…" : ""}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Run Rate section ──────────────────────────────────────────────────────────
function RunRateSection({ deals }: { deals: Deal[] }) {
  const runRate = deals.filter(d => d._stageSummary === "Won" && d._createdMonth && d._createdMonth === d._month)
  const totalVal = runRate.reduce((s, d) => s + (d._val ?? 0), 0)
  const wonTotal = deals.filter(d => d._stageSummary === "Won").reduce((s, d) => s + (d._val ?? 0), 0)

  const byMonth = MONTHS.map(m => ({
    month: m,
    deals: runRate.filter(d => d._month === m),
    val: runRate.filter(d => d._month === m).reduce((s, d) => s + (d._val ?? 0), 0),
  })).filter(m => m.deals.length > 0)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Run Rate Won</p>
          <p className="text-xl font-bold text-amber-500">{fmtKM(totalVal)}</p>
        </div>
        <div className="rounded-lg bg-muted/30 border p-3 text-center">
          <p className="text-xs text-muted-foreground">% of Won OI</p>
          <p className="text-xl font-bold">{wonTotal > 0 ? `${Math.round((totalVal / wonTotal) * 100)}%` : "—"}</p>
        </div>
        <div className="rounded-lg bg-muted/30 border p-3 text-center">
          <p className="text-xs text-muted-foreground">Deal Count</p>
          <p className="text-xl font-bold">{runRate.length}</p>
        </div>
      </div>

      {byMonth.length > 0 ? (
        <div className="space-y-1">
          {byMonth.map(m => (
            <div key={m.month} className="flex items-center justify-between px-3 py-2 rounded hover:bg-muted/30 cursor-pointer border"
              onClick={() => openDealModal(`Run Rate — ${m.month}`, m.deals)}>
              <span className="text-sm font-medium">{m.month}</span>
              <span className="text-sm text-amber-500 font-bold">{fmtKM(m.val)}</span>
              <span className="text-xs text-muted-foreground">{m.deals.length} deals</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No run rate deals detected. Run rate requires a "Created Date" column in your Salesforce export.
        </p>
      )}
    </div>
  )
}

// ── Insights sub-tab ──────────────────────────────────────────────────────────
function R2NInsights({ deals, oiTargets, filters }: {
  deals: Deal[]
  oiTargets: BudgetTargets
  filters: Filters
}) {
  const selectedMonths = getSelectedMonths(filters.month)

  const teamBudget = getTeamBudgetForMonths(selectedMonths, oiTargets)
  const teamWon = deals.filter(d => d._stageSummary === "Won").reduce((s, d) => s + (d._val ?? 0), 0)
  const teamCommit = deals.filter(d => d._commit === "Commit").reduce((s, d) => s + (d._val ?? 0), 0)
  const teamUpside = deals.filter(d => d._commit === "Upside").reduce((s, d) => s + (d._val ?? 0), 0)
  const teamPipe = deals.filter(d => d._stageSummary === "Pipe").reduce((s, d) => s + (d._val ?? 0), 0)
  const gap = Math.max(0, teamBudget - teamWon)

  const winRate = deals.filter(d => d._stageSummary === "Won" || d._stageSummary === "Lost").length > 0
    ? deals.filter(d => d._stageSummary === "Won").length / deals.filter(d => d._stageSummary === "Won" || d._stageSummary === "Lost").length
    : 0.4

  const requiredPipe = winRate > 0 ? gap / winRate : gap * 2.5

  const adInsights = USERS.map(ad => {
    const adDeals = deals.filter(d => d.User === ad)
    const adWon = adDeals.filter(d => d._stageSummary === "Won").reduce((s, d) => s + (d._val ?? 0), 0)
    const adBudget = getADBudget(ad, selectedMonths, oiTargets)
    const adGap = Math.max(0, adBudget - adWon)
    const adPipe = adDeals.filter(d => d._stageSummary === "Pipe").reduce((s, d) => s + (d._val ?? 0), 0)
    const adCommit = adDeals.filter(d => d._commit === "Commit").reduce((s, d) => s + (d._val ?? 0), 0)
    const coverage = adGap > 0 ? (adCommit + adPipe) / adGap : 99
    return { ad, adWon, adBudget, adGap, adPipe, adCommit, coverage, attainment: adBudget > 0 ? adWon / adBudget : 0 }
  }).sort((a, b) => a.attainment - b.attainment)

  const productDeals = [...new Map(deals.filter(d => d._stageSummary === "Pipe").map(d => [d._product || "Unknown", d])).entries()]
    .map(([product]) => {
      const pDeals = deals.filter(d => d._stageSummary === "Pipe" && (d._product || "Unknown") === product)
      const pWon = deals.filter(d => d._stageSummary === "Won" && (d._product || "Unknown") === product)
      const pLost = deals.filter(d => d._stageSummary === "Lost" && (d._product || "Unknown") === product)
      const pWinRate = pWon.length + pLost.length > 0 ? pWon.length / (pWon.length + pLost.length) : 0
      const bestAD = USERS.map(ad => ({
        ad,
        wins: deals.filter(d => d._stageSummary === "Won" && (d._product || "Unknown") === product && d.User === ad).length,
      })).sort((a, b) => b.wins - a.wins)[0]
      return { product, pipeVal: pDeals.reduce((s, d) => s + (d._val ?? 0), 0), count: pDeals.length, winRate: pWinRate, bestAD: bestAD?.ad ?? "—" }
    }).sort((a, b) => b.pipeVal - a.pipeVal).slice(0, 5)

  return (
    <div className="space-y-4">
      {/* Team summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Target</p>
          <p className="text-xl font-bold">{fmtKM(teamBudget)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Won</p>
          <p className="text-xl font-bold text-green-500">{fmtKM(teamWon)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Gap to Target</p>
          <p className="text-xl font-bold text-red-500">{fmtKM(gap)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Required Pipe</p>
          <p className="text-xl font-bold text-amber-500">{fmtKM(requiredPipe)}</p>
          <p className="text-xs text-muted-foreground">@ {Math.round(winRate * 100)}% win rate</p>
        </div>
      </div>

      {/* Progress bar */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Pipeline Coverage vs Gap</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "Won", val: teamWon, color: "#22c55e" },
            { label: "Commit", val: teamCommit, color: "#6366f1" },
            { label: "Upside", val: teamUpside, color: "#f59e0b" },
            { label: "Pipe", val: teamPipe, color: "#64748b" },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-xs w-14 text-right text-muted-foreground">{r.label}</span>
              <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.min(100, teamBudget > 0 ? (r.val / teamBudget) * 100 : 0)}%`,
                  backgroundColor: r.color
                }} />
              </div>
              <span className="text-xs font-bold w-16">{fmtKM(r.val)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AD gap analysis */}
      <Card>
        <CardHeader><CardTitle className="text-sm">AD Focus Areas — Sorted by Risk</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">AD</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Target</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Won</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Gap</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Coverage</th>
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {adInsights.map(row => (
                <tr key={row.ad} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">{row.ad.split(" ")[0]}</td>
                  <td className="px-4 py-2 text-right">{fmtKM(row.adBudget)}</td>
                  <td className="px-4 py-2 text-right text-green-500">{fmtKM(row.adWon)}</td>
                  <td className="px-4 py-2 text-right text-red-500 font-medium">{fmtKM(row.adGap)}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={cn("font-bold", row.coverage >= 3 ? "text-green-500" : row.coverage >= 1.5 ? "text-amber-500" : "text-red-500")}>
                      {row.coverage >= 99 ? "✓" : `${row.coverage.toFixed(1)}x`}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", row.attainment >= 1 ? "bg-green-500/10 text-green-500" : row.attainment >= 0.7 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500")}>
                      {row.attainment >= 1 ? "On Target" : row.attainment >= 0.7 ? "Close" : "At Risk"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Best positioned by product */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Best Positioned to Help Close — By Product</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Product</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Active Pipe</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Win Rate</th>
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Best AD</th>
              </tr>
            </thead>
            <tbody>
              {productDeals.map(p => (
                <tr key={p.product} className="border-b hover:bg-muted/20 cursor-pointer"
                  onClick={() => openDealModal(`Pipe — ${p.product}`, deals.filter(d => d._stageSummary === "Pipe" && (d._product || "Unknown") === p.product))}>
                  <td className="px-4 py-2 font-medium">{p.product}</td>
                  <td className="px-4 py-2 text-right">{fmtKM(p.pipeVal)}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={p.winRate >= 0.6 ? "text-green-500 font-bold" : p.winRate >= 0.4 ? "text-amber-500 font-bold" : "text-red-500 font-bold"}>
                      {Math.round(p.winRate * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-primary font-medium">{p.bestAD.split(" ")[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function RouteToNumbersTab() {
  const { data, filters, oiTargets } = useDashboardStore()
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "insights">("overview")
  const [reviewMonth, setReviewMonth] = useState<string | null>(null)
  const [expandedAD, setExpandedAD] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({
    scorecard: true, plan: true, runrate: true, notes: false,
  })

  function toggleSection(key: string) {
    setExpandedSection(s => ({ ...s, [key]: !s[key] }))
  }

  const selectedMonths = reviewMonth ? [reviewMonth] : getSelectedMonths(filters.month)

  const filteredDeals = useMemo(() => {
    return data.filter(d => {
      const u = filters.user
      if (u !== "All") {
        const users = Array.isArray(u) ? u : [u]
        if (!users.includes(d.User ?? "")) return false
      }
      if (selectedMonths.length > 0 && !selectedMonths.includes("All")) {
        if (!selectedMonths.includes(d._month ?? "")) return false
      }
      return true
    })
  }, [data, filters, selectedMonths])

  const teamBudget = getTeamBudgetForMonths(selectedMonths, oiTargets)
  const teamWon = filteredDeals.filter(d => d._stageSummary === "Won").reduce((s, d) => s + (d._val ?? 0), 0)
  const teamCommit = filteredDeals.filter(d => d._commit === "Commit" && d._stageSummary === "Pipe").reduce((s, d) => s + (d._val ?? 0), 0)
  const teamPipe = filteredDeals.filter(d => d._stageSummary === "Pipe").reduce((s, d) => s + (d._val ?? 0), 0)
  const attainment = teamBudget > 0 ? teamWon / teamBudget : 0

  const adData = useMemo(() => {
    return USERS.map(ad => {
      const adDeals = filteredDeals.filter(d => d.User === ad)
      const won = adDeals.filter(d => d._stageSummary === "Won").reduce((s, d) => s + (d._val ?? 0), 0)
      const commit = adDeals.filter(d => d._commit === "Commit" && d._stageSummary === "Pipe").reduce((s, d) => s + (d._val ?? 0), 0)
      const pipe = adDeals.filter(d => d._stageSummary === "Pipe").reduce((s, d) => s + (d._val ?? 0), 0)
      const budget = getADBudget(ad, selectedMonths, oiTargets)
      const gap = Math.max(0, budget - won)
      const coverage = gap > 0 ? (commit + pipe) / gap : 99
      return { ad, won, commit, pipe, budget, gap, coverage, attainment: budget > 0 ? won / budget : 0, deals: adDeals }
    })
  }, [filteredDeals, oiTargets, selectedMonths])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Route to Numbers</h2>
          <p className="text-sm text-muted-foreground">
            {reviewMonth ? `Reviewing ${reviewMonth}` : "Live view — pipeline vs target"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-tab */}
          <div className="flex rounded-lg border overflow-hidden text-xs">
            <button onClick={() => setActiveSubTab("overview")} className={cn("px-3 py-1.5 font-medium", activeSubTab === "overview" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              Overview
            </button>
            <button onClick={() => setActiveSubTab("insights")} className={cn("px-3 py-1.5 font-medium", activeSubTab === "insights" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              🧠 Insights
            </button>
          </div>
          {/* Month review strip */}
          <div className="flex rounded-lg border overflow-hidden text-xs">
            <button onClick={() => setReviewMonth(null)} className={cn("px-2 py-1.5 font-medium", !reviewMonth ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>Live</button>
            {MONTHS.map(m => (
              <button key={m} onClick={() => setReviewMonth(m === reviewMonth ? null : m)}
                className={cn("px-2 py-1.5 font-medium", reviewMonth === m ? "bg-amber-500 text-white" : "hover:bg-muted")}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Review mode banner */}
      {reviewMonth && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
          <span className="text-amber-500 font-semibold">⚠ Reviewing {reviewMonth} — showing data for this month only</span>
          <button onClick={() => setReviewMonth(null)} className="text-xs underline text-muted-foreground hover:text-foreground">Back to live view</button>
        </div>
      )}

      {activeSubTab === "insights" ? (
        <R2NInsights deals={filteredDeals} oiTargets={oiTargets} filters={filters} />
      ) : (
        <>
          {/* Team Scorecard */}
          <div className="rounded-lg border bg-card">
            <button className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/20"
              onClick={() => toggleSection("scorecard")}>
              <span className="flex items-center gap-2"><Target className="w-4 h-4" /> Team Scorecard</span>
              {expandedSection.scorecard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection.scorecard && (
              <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPI label="Target" value={fmtKM(teamBudget)} icon={<Target className="w-4 h-4" />} accent="info" />
                <div onClick={() => openDealModal("Won Deals", filteredDeals.filter(d => d._stageSummary === "Won"))} className="cursor-pointer">
                <KPI label="Won" value={fmtKM(teamWon)} icon={<CheckCircle2 className="w-4 h-4" />} accent="success"
                  period={`${Math.round(attainment * 100)}% attainment`} />
                </div>
                <div onClick={() => openDealModal("Commit Deals", filteredDeals.filter(d => d._commit === "Commit"))} className="cursor-pointer">
                <KPI label="Commit" value={fmtKM(teamCommit)} icon={<TrendingUp className="w-4 h-4" />} accent="info" />
                </div>
                <div onClick={() => openDealModal("Pipeline", filteredDeals.filter(d => d._stageSummary === "Pipe"))} className="cursor-pointer">
                <KPI label="Total Pipe" value={fmtKM(teamPipe)} icon={<TrendingUp className="w-4 h-4" />} accent="warning" />
                </div>
              </div>
            )}
          </div>

          {/* AD Plan */}
          <div className="rounded-lg border bg-card">
            <button className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/20"
              onClick={() => toggleSection("plan")}>
              <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> AD Plan vs Actuals</span>
              {expandedSection.plan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection.plan && (
              <div className="px-0 pb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">AD</th>
                      <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Target</th>
                      <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Won</th>
                      <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Commit</th>
                      <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Pipe</th>
                      <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Gap</th>
                      <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Coverage</th>
                      <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adData.map(row => (
                      <>
                        <tr key={row.ad} className="border-b hover:bg-muted/20 cursor-pointer"
                          onClick={() => setExpandedAD(expandedAD === row.ad ? null : row.ad)}>
                          <td className="px-4 py-2 font-medium">{row.ad.split(" ")[0]}</td>
                          <td className="px-4 py-2 text-right">{fmtKM(row.budget)}</td>
                          <td className="px-4 py-2 text-right text-green-500 font-bold">{fmtKM(row.won)}</td>
                          <td className="px-4 py-2 text-right text-primary">{fmtKM(row.commit)}</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{fmtKM(row.pipe)}</td>
                          <td className="px-4 py-2 text-right text-red-500 font-medium">{fmtKM(row.gap)}</td>
                          <td className="px-4 py-2 text-right">
                            <span className={cn("font-bold text-xs", row.coverage >= 3 ? "text-green-500" : row.coverage >= 1.5 ? "text-amber-500" : "text-red-500")}>
                              {row.coverage >= 99 ? "✓" : `${row.coverage.toFixed(1)}x`}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center text-xs text-muted-foreground">
                            {expandedAD === row.ad ? <ChevronUp className="w-3 h-3 mx-auto" /> : <ChevronDown className="w-3 h-3 mx-auto" />}
                          </td>
                        </tr>
                        {expandedAD === row.ad && (
                          <tr className="bg-muted/10 border-b">
                            <td colSpan={8} className="px-4 py-4">
                              <ADNotesSection ad={row.ad} />
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Run Rate */}
          <div className="rounded-lg border bg-card">
            <button className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/20"
              onClick={() => toggleSection("runrate")}>
              <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Run Rate <span className="text-xs font-normal text-muted-foreground ml-1">opened & closed same month</span></span>
              {expandedSection.runrate ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection.runrate && (
              <div className="px-4 pb-4">
                <RunRateSection deals={filteredDeals} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
