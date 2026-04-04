import { useMemo, useState } from "react"
import { useDashboardStore, userMatchesFilter } from "@/store/dashboardStore"
import { MONTHS, QUARTERS } from "@/config/months"
import { USERS } from "@/config/users"
import { fmt, fmtPct } from "@/lib/formatters"
import { parseSalesforceDate } from "@/lib/dateParser"
import type { Deal } from "@/types"
import { ADCell } from "@/components/shared/ADAvatar"
import { DealDetailModal } from "@/components/modals/DealDetailModal"
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts"
import {
  TrendingUp, AlertTriangle, CheckCircle2,
  Calendar, PlusCircle, Target, Clock, Info
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type EnrichedDeal = Deal & { _createdMonth: string; _daysToClose: number | null }
type ViewMode = "monthly" | "quarterly" | "ad" | "velocity"

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCreatedMonth(r: Deal): string {
  const rawCreated =
    r["Created Date"] ?? r["created date"] ??
    r["CreatedDate"] ?? r["Opportunity Created Date"] ?? ""
  if (rawCreated) {
    const p = parseSalesforceDate(rawCreated as string)
    if (p) return p.monthAbbr
  }
  const rawClose = r["Close Date"] || r["Close Date (2)"] || ""
  const age = Number(r.Age ?? 0)
  if (rawClose && age > 0) {
    const p = parseSalesforceDate(rawClose as string)
    if (p) {
      const created = new Date(p.date)
      created.setDate(created.getDate() - age)
      const abbrs = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      return abbrs[created.getMonth()]
    }
  }
  return ""
}

function getDaysToClose(r: Deal): number | null {
  const age = Number(r.Age ?? 0)
  return age > 0 ? age : null
}

// ── Clickable cell helper ─────────────────────────────────────────────────────

interface ClickableCellProps {
  value: string | number
  deals: EnrichedDeal[]
  onOpen: (title: string, deals: Deal[]) => void
  title: string
  className?: string
  emptyVal?: string
}

function ClickCell({ value, deals, onOpen, title, className, emptyVal = "—" }: ClickableCellProps) {
  if (!deals || deals.length === 0) {
    return <span className="text-muted-foreground">{emptyVal}</span>
  }
  return (
    <button
      onClick={() => onOpen(title, deals as Deal[])}
      className={cn(
        "tabular-nums font-medium underline-offset-2 hover:underline cursor-pointer transition-opacity hover:opacity-80",
        className
      )}
      title={`Click to see ${deals.length} deal${deals.length !== 1 ? "s" : ""}`}
    >
      {value}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PipeCreationTab() {
  const { data, filters } = useDashboardStore()
  const [view, setView] = useState<ViewMode>("monthly")
  const [minVal, setMinVal] = useState(0)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalDeals, setModalDeals] = useState<Deal[]>([])

  function openModal(title: string, deals: Deal[]) {
    setModalTitle(title)
    setModalDeals(deals)
    setModalOpen(true)
  }

  const hasCreatedDate = useMemo(() =>
    data.some(r => r["Created Date"] || r["created date"] || r["CreatedDate"] || r["Opportunity Created Date"])
  , [data])

  const base = useMemo(() =>
    data.filter(r => {
      if (!userMatchesFilter(r.User, filters.user)) return false
      if (r._val !== undefined && r._val < minVal) return false
      return true
    })
  , [data, filters.user, minVal])

  const enriched = useMemo<EnrichedDeal[]>(() =>
    base.map(r => ({
      ...r,
      _createdMonth: getCreatedMonth(r),
      _daysToClose: getDaysToClose(r),
    }))
  , [base])

  // ── Monthly ──────────────────────────────────────────────────────────────
  const monthlyData = useMemo(() =>
    MONTHS.map(m => {
      const created = enriched.filter(r => r._createdMonth === m)
      const won     = created.filter(r => r._stageSummary === "Won")
      const pipe    = created.filter(r => r._stageSummary === "Pipe")
      const lost    = created.filter(r => r._stageSummary === "Lost")
      const total   = created.reduce((s, r) => s + (r._val ?? 0), 0)
      const wonVal  = won.reduce((s, r) => s + (r._val ?? 0), 0)
      return { month: m, created, won, pipe, lost, total, wonVal,
        convRate: created.length > 0 ? won.length / created.length : 0 }
    })
  , [enriched])

  // ── Quarterly ────────────────────────────────────────────────────────────
  const quarterlyData = useMemo(() =>
    (["Q1","Q2","Q3","Q4"] as const).map(q => {
      const qMonths = QUARTERS[q]
      const created = enriched.filter(r => r._createdMonth && qMonths.includes(r._createdMonth))
      const won     = created.filter(r => r._stageSummary === "Won")
      const pipe    = created.filter(r => r._stageSummary === "Pipe")
      const total   = created.reduce((s, r) => s + (r._val ?? 0), 0)
      const wonVal  = won.reduce((s, r) => s + (r._val ?? 0), 0)
      return { quarter: q, months: qMonths.join("–"), created, won, pipe,
        total, wonVal, convRate: created.length > 0 ? won.length / created.length : 0 }
    })
  , [enriched])

  // ── Per-AD ───────────────────────────────────────────────────────────────
  const adData = useMemo(() =>
    USERS.map(u => {
      const created = enriched.filter(r => r.User === u && r._createdMonth)
      const won     = created.filter(r => r._stageSummary === "Won")
      const pipe    = created.filter(r => r._stageSummary === "Pipe")
      const lost    = created.filter(r => r._stageSummary === "Lost")
      const total   = created.reduce((s, r) => s + (r._val ?? 0), 0)
      const wonVal  = won.reduce((s, r) => s + (r._val ?? 0), 0)
      const dtcVals = won.filter(r => r._daysToClose !== null).map(r => r._daysToClose as number)
      const avgVelocity = dtcVals.length > 0 ? dtcVals.reduce((a,b)=>a+b,0)/dtcVals.length : null
      const byMonth = MONTHS.map(m => ({
        month: m,
        deals: created.filter(r => r._createdMonth === m),
        count: created.filter(r => r._createdMonth === m).length,
        value: created.filter(r => r._createdMonth === m).reduce((s,r)=>s+(r._val??0),0),
      }))
      return { user: u, first: u.split(" ")[0], created, won, pipe, lost,
        total, wonVal, avgVelocity, byMonth,
        convRate: created.length > 0 ? won.length / created.length : 0 }
    })
  , [enriched])

  // ── Velocity ─────────────────────────────────────────────────────────────
  const velocityBuckets = [
    { label:"< 30d",    min:0,   max:30 },
    { label:"30–60d",  min:30,  max:60 },
    { label:"60–90d",  min:60,  max:90 },
    { label:"90–120d", min:90,  max:120 },
    { label:"120–180d",min:120, max:180 },
    { label:"> 180d",  min:180, max:9999 },
  ]
  const velocityData = useMemo(() =>
    velocityBuckets.map(b => {
      const deals = enriched.filter(r => {
        const d = r._daysToClose
        return d !== null && d >= b.min && d < b.max
      })
      const won  = deals.filter(r => r._stageSummary === "Won")
      const pipe = deals.filter(r => r._stageSummary === "Pipe")
      return { label: b.label, deals, won, pipe,
        count: deals.length, value: deals.reduce((s,r)=>s+(r._val??0),0),
        convRate: deals.length > 0 ? won.length/deals.length : 0 }
    })
  , [enriched])

  // ── Summary KPIs ─────────────────────────────────────────────────────────
  const withCreated    = enriched.filter(r => r._createdMonth)
  const wonFromCreated = withCreated.filter(r => r._stageSummary === "Won")
  const pipeFromCreated= withCreated.filter(r => r._stageSummary === "Pipe")
  const lostFromCreated= withCreated.filter(r => r._stageSummary === "Lost")
  const totalVal       = withCreated.reduce((s,r)=>s+(r._val??0),0)
  const teamConvRate   = withCreated.length > 0 ? wonFromCreated.length/withCreated.length : 0
  const noCreatedMonthCount = enriched.filter(r => !r._createdMonth).length

  const bestMonth = monthlyData.reduce(
    (best, m) => m.created.length > best.created.length ? m : best,
    monthlyData[0]
  )

  const avgVelocityAll = (() => {
    const vals = enriched.filter(r => r._stageSummary==="Won" && r._daysToClose!==null).map(r => r._daysToClose as number)
    return vals.length > 0 ? vals.reduce((a,b)=>a+b,0)/vals.length : null
  })()

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-24">
        <TrendingUp className="w-12 h-12 opacity-30" />
        <p className="text-lg font-semibold">No data loaded</p>
        <p className="text-sm">Import your Salesforce data to see pipe creation metrics.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">

      {/* Deal popup modal */}
      <DealDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        deals={modalDeals}
      />

      {/* Data quality notice */}
      {!hasCreatedDate && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-amber-500">Using estimated creation dates.</span>
            <span className="text-muted-foreground ml-1">
              Add <code className="bg-muted px-1 rounded text-xs">Created Date</code> to your Salesforce report for exact dates.
              {noCreatedMonthCount > 0 && (
                <span className="ml-1 text-amber-500 font-medium">
                  {noCreatedMonthCount} deal{noCreatedMonthCount !== 1 ? "s" : ""} have no estimable creation date.
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* KPI strip — all clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Pipe Created (FY26)",
            value: withCreated.length.toString(),
            sub: `${fmt(totalVal)} total value`,
            icon: PlusCircle,
            color: "text-blue-500",
            deals: withCreated,
            title: "All Created Deals",
          },
          {
            label: "Best Creation Month",
            value: bestMonth.created.length > 0 ? bestMonth.month : "—",
            sub: bestMonth.created.length > 0
              ? `${bestMonth.created.length} deals · ${fmt(bestMonth.total)}`
              : "No data",
            icon: Calendar,
            color: "text-purple-500",
            deals: bestMonth.created,
            title: `${bestMonth.month} — Created Deals`,
          },
          {
            label: "Creation → Win Rate",
            value: withCreated.length > 0 ? fmtPct(teamConvRate) : "—",
            sub: `${wonFromCreated.length} won · ${pipeFromCreated.length} still open`,
            icon: Target,
            color: teamConvRate > 0.4 ? "text-emerald-500" : "text-amber-500",
            deals: wonFromCreated,
            title: "Won Deals (created this FY)",
          },
          {
            label: "Avg Days to Close",
            value: avgVelocityAll !== null ? `${Math.round(avgVelocityAll)}d` : "—",
            sub: avgVelocityAll !== null
              ? avgVelocityAll < 60 ? "Fast cycle" : avgVelocityAll < 120 ? "Normal cycle" : "Long cycle"
              : "No closed won data",
            icon: Clock,
            color: avgVelocityAll !== null
              ? avgVelocityAll < 60 ? "text-emerald-500" : avgVelocityAll < 120 ? "text-amber-500" : "text-red-500"
              : "text-muted-foreground",
            deals: enriched.filter(r => r._stageSummary === "Won" && r._daysToClose !== null),
            title: "Won Deals (velocity data)",
          },
        ].map(({ label, value, sub, icon: Icon, color, deals, title }) => (
          <button
            key={label}
            onClick={() => deals.length > 0 && openModal(title, deals as Deal[])}
            className={cn(
              "rounded-xl border bg-card p-4 text-left transition-all",
              deals.length > 0 && "hover:border-primary/50 hover:shadow-sm cursor-pointer"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn("w-4 h-4", color)} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
            </div>
            <div className={cn("text-2xl font-bold tracking-tight", color)}>{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{sub}</div>
            {deals.length > 0 && (
              <div className="text-[10px] text-muted-foreground/60 mt-2">
                Click to see {deals.length} deal{deals.length !== 1 ? "s" : ""}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* View toggle + min value filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["monthly","quarterly","ad","velocity"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "monthly" ? "Monthly" : v === "quarterly" ? "Quarterly" : v === "ad" ? "By AD" : "Velocity"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Min value:</span>
          {[0, 5000, 10000, 25000, 50000, 100000].map(v => (
            <button key={v} onClick={() => setMinVal(v)}
              className={cn("px-2 py-1 rounded border text-xs",
                minVal === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"
              )}
            >
              {v === 0 ? "All" : `£${v/1000}k+`}
            </button>
          ))}
        </div>
      </div>

      {/* ── MONTHLY VIEW ── */}
      {view === "monthly" && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4">Pipeline Created by Month</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData.map(m => ({
                month: m.month,
                Created: m.created.length,
                Won: m.won.length,
                "Still Open": m.pipe.length,
                Value: m.total,
              }))} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="count" orientation="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis yAxisId="value" orientation="right"
                  tickFormatter={(v: number) => `£${Math.round(v/1000)}k`}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={((value: number, name: string) => name === "Value" ? [fmt(value), name] : [value, name]) as any}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="count" dataKey="Created" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                <Bar yAxisId="count" dataKey="Won" fill="#10b981" radius={[4,4,0,0]} />
                <Bar yAxisId="count" dataKey="Still Open" fill="#f59e0b" radius={[4,4,0,0]} />
                <Line yAxisId="value" type="monotone" dataKey="Value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {["Month","Deals Created","Value Created","Won","Won Value","Still Open","Open Value","Lost","Conv % (val)"].map(h => (
                    <th key={h} className={cn(
                      "px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide",
                      h === "Month" ? "text-left" : "text-right"
                    )} style={h === "Conv % (val)" ? {minWidth:120} : {}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m, i) => {
                  const openVal = m.pipe.reduce((s,r) => s + (r._val ?? 0), 0)
                  const lostVal = m.lost.reduce((s,r) => s + (r._val ?? 0), 0)
                  // Value-based conv rate: won value / (won value + lost value)
                  const convVal = (m.wonVal + lostVal) > 0 ? m.wonVal / (m.wonVal + lostVal) : null
                  return (
                  <tr key={m.month} className={cn("border-b hover:bg-muted/30 transition-colors", i % 2 !== 0 && "bg-muted/20")}>
                    <td className="px-4 py-2 font-semibold">{m.month}</td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={m.created.length} deals={m.created} onOpen={openModal}
                        title={`${m.month} — All Created Deals`} className="text-foreground" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={m.total > 0 ? fmt(m.total) : "—"} deals={m.created} onOpen={openModal}
                        title={`${m.month} — All Created Deals`} className="text-primary font-semibold" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={m.won.length} deals={m.won} onOpen={openModal}
                        title={`${m.month} — Won (created this month)`} className="text-emerald-500" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={m.wonVal > 0 ? fmt(m.wonVal) : "—"} deals={m.won} onOpen={openModal}
                        title={`${m.month} — Won Value`} className="text-emerald-500 font-semibold" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={m.pipe.length} deals={m.pipe} onOpen={openModal}
                        title={`${m.month} — Still Open Pipeline`} className="text-amber-500" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={openVal > 0 ? fmt(openVal) : "—"} deals={m.pipe} onOpen={openModal}
                        title={`${m.month} — Open Pipeline Value`} className="text-amber-500 font-semibold" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={m.lost.length} deals={m.lost} onOpen={openModal}
                        title={`${m.month} — Lost`} className="text-red-500" />
                    </td>
                    <td className="px-4 py-2">
                      {convVal !== null ? (
                        <button
                          onClick={() => openModal(`${m.month} — Conv Rate Deals`, [...m.won, ...m.lost] as Deal[])}
                          className="w-full flex items-center gap-2 hover:opacity-80 transition-opacity"
                          title="Won Value ÷ (Won + Lost Value)"
                        >
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(convVal*100,100)}%` }} />
                          </div>
                          <span className={cn("text-xs tabular-nums font-medium",
                            convVal > 0.5 ? "text-emerald-500" : convVal > 0.25 ? "text-amber-500" : "text-red-500"
                          )}>{fmtPct(convVal)}</span>
                        </button>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/60 font-semibold border-t-2">
                  <td className="px-4 py-2 text-xs">Total</td>
                  <td className="px-4 py-2 text-right text-xs">
                    <ClickCell value={withCreated.length} deals={withCreated} onOpen={openModal}
                      title="All Created Deals (FY26)" className="text-foreground" />
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <ClickCell value={fmt(totalVal)} deals={withCreated} onOpen={openModal}
                      title="All Created Deals (FY26)" className="text-primary" />
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <ClickCell value={wonFromCreated.length} deals={wonFromCreated} onOpen={openModal}
                      title="All Won (created FY26)" className="text-emerald-500" />
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <ClickCell value={fmt(wonFromCreated.reduce((s,r)=>s+(r._val??0),0))} deals={wonFromCreated}
                      onOpen={openModal} title="All Won Value" className="text-emerald-500" />
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <ClickCell value={pipeFromCreated.length} deals={pipeFromCreated} onOpen={openModal}
                      title="All Still Open" className="text-amber-500" />
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <ClickCell value={fmt(pipeFromCreated.reduce((s,r)=>s+(r._val??0),0))} deals={pipeFromCreated}
                      onOpen={openModal} title="All Open Pipeline Value" className="text-amber-500" />
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <ClickCell value={lostFromCreated.length} deals={lostFromCreated} onOpen={openModal}
                      title="All Lost" className="text-red-500" />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(teamConvRate*100,100)}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-emerald-500">{fmtPct(teamConvRate)}</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── QUARTERLY VIEW ── */}
      {view === "quarterly" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quarterlyData.map(q => (
              <div key={q.quarter} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm">{q.quarter}</span>
                  <span className="text-xs text-muted-foreground">{q.months}</span>
                </div>
                <button
                  onClick={() => q.created.length > 0 && openModal(`${q.quarter} — All Created`, q.created as Deal[])}
                  className="text-2xl font-bold text-primary mb-1 hover:underline cursor-pointer"
                >
                  {q.created.length}
                </button>
                <div className="text-xs text-muted-foreground mb-3">{fmt(q.total)} created</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-500">Won</span>
                    <button
                      onClick={() => q.won.length > 0 && openModal(`${q.quarter} — Won`, q.won as Deal[])}
                      className="font-semibold hover:underline cursor-pointer"
                    >
                      {q.won.length} · {fmt(q.wonVal)}
                    </button>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-500">Open pipe</span>
                    <button
                      onClick={() => q.pipe.length > 0 && openModal(`${q.quarter} — Open Pipeline`, q.pipe as Deal[])}
                      className="font-semibold hover:underline cursor-pointer text-amber-500"
                    >
                      {q.pipe.length}
                    </button>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Conv rate</span>
                    <button
                      onClick={() => q.created.length > 0 && openModal(`${q.quarter} — All Deals`, q.created as Deal[])}
                      className={cn("font-semibold hover:underline cursor-pointer",
                        q.convRate > 0.5 ? "text-emerald-500" : q.convRate > 0.25 ? "text-amber-500" : "text-red-500"
                      )}
                    >
                      {q.created.length > 0 ? fmtPct(q.convRate) : "—"}
                    </button>
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(q.convRate*100,100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4">Quarterly Pipe Creation vs Won</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={quarterlyData.map(q => ({
                quarter: q.quarter,
                Created: q.created.length,
                Won: q.won.length,
                Open: q.pipe.length,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Created" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                <Bar dataKey="Won" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="Open" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Q detail table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {["Quarter","Months","Created","Value","Won","Won Value","Open","Conv Rate"].map(h => (
                    <th key={h} className={cn("px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide",
                      h === "Quarter" || h === "Months" ? "text-left" : "text-right"
                    )} style={h === "Conv Rate" ? {minWidth:120} : {}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quarterlyData.map((q, i) => (
                  <tr key={q.quarter} className={cn("border-b hover:bg-muted/30 transition-colors", i%2!==0 && "bg-muted/20")}>
                    <td className="px-4 py-2 font-bold">{q.quarter}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{q.months}</td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={q.created.length} deals={q.created} onOpen={openModal}
                        title={`${q.quarter} — All Created`} className="text-foreground" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={q.total > 0 ? fmt(q.total) : "—"} deals={q.created} onOpen={openModal}
                        title={`${q.quarter} — All Created`} className="text-primary" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={q.won.length} deals={q.won} onOpen={openModal}
                        title={`${q.quarter} — Won`} className="text-emerald-500" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={q.wonVal > 0 ? fmt(q.wonVal) : "—"} deals={q.won} onOpen={openModal}
                        title={`${q.quarter} — Won Value`} className="text-emerald-500 font-semibold" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={q.pipe.length} deals={q.pipe} onOpen={openModal}
                        title={`${q.quarter} — Open Pipeline`} className="text-amber-500" />
                    </td>
                    <td className="px-4 py-2">
                      {q.created.length > 0 ? (
                        <button onClick={() => openModal(`${q.quarter} — All`, q.created as Deal[])}
                          className="w-full flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(q.convRate*100,100)}%` }} />
                          </div>
                          <span className={cn("text-xs tabular-nums font-medium",
                            q.convRate > 0.5 ? "text-emerald-500" : q.convRate > 0.25 ? "text-amber-500" : "text-red-500"
                          )}>{fmtPct(q.convRate)}</span>
                        </button>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BY AD VIEW ── */}
      {view === "ad" && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4">Pipe Creation by Account Director — Monthly</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={MONTHS.map(m => {
                const row: Record<string, string | number> = { month: m }
                USERS.forEach(u => {
                  row[u.split(" ")[0]] = enriched.filter(r => r.User===u && r._createdMonth===m).reduce((s,r)=>s+(r._val??0),0)
                })
                return row
              })}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickFormatter={(v: number) => `£${Math.round(v/1000)}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={((v: number) => fmt(v)) as any}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {USERS.map((u, i) => (
                  <Bar key={u} dataKey={u.split(" ")[0]} stackId="a"
                    fill={["#6366f1","#0ea5e9","#10b981","#f59e0b","#8b5cf6"][i%5]}
                    radius={i === USERS.length-1 ? [4,4,0,0] : [0,0,0,0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {["Account Director","Created","Value","Won","Won Value","Open Pipe","Avg Days→Close","Conv Rate"].map(h => (
                    <th key={h} className={cn("px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide",
                      h === "Account Director" ? "text-left" : "text-right"
                    )} style={h === "Conv Rate" ? {minWidth:120} : {}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adData.sort((a,b)=>b.total-a.total).map((u, i) => (
                  <tr key={u.user} className={cn("border-b hover:bg-muted/30 transition-colors", i%2!==0 && "bg-muted/20")}>
                    <td className="px-4 py-2.5"><ADCell name={u.user} /></td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={u.created.length} deals={u.created} onOpen={openModal}
                        title={`${u.first} — All Created`} className="text-foreground" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={u.total > 0 ? fmt(u.total) : "—"} deals={u.created} onOpen={openModal}
                        title={`${u.first} — All Created`} className="text-primary font-semibold" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={u.won.length} deals={u.won} onOpen={openModal}
                        title={`${u.first} — Won`} className="text-emerald-500" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={u.wonVal > 0 ? fmt(u.wonVal) : "—"} deals={u.won} onOpen={openModal}
                        title={`${u.first} — Won Value`} className="text-emerald-500 font-semibold" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={u.pipe.length} deals={u.pipe} onOpen={openModal}
                        title={`${u.first} — Open Pipeline`} className="text-amber-500" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {u.avgVelocity !== null ? (
                        <button
                          onClick={() => openModal(`${u.first} — Won (velocity)`,
                            u.won.filter(r => r._daysToClose !== null) as Deal[]
                          )}
                          className={cn("font-medium hover:underline cursor-pointer",
                            u.avgVelocity < 60 ? "text-emerald-500" : u.avgVelocity < 120 ? "text-amber-500" : "text-red-500"
                          )}
                        >
                          {Math.round(u.avgVelocity)}d
                        </button>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {u.created.length > 0 ? (
                        <button onClick={() => openModal(`${u.first} — Conv Rate`, u.created as Deal[])}
                          className="w-full flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(u.convRate*100,100)}%` }} />
                          </div>
                          <span className={cn("text-xs tabular-nums font-medium",
                            u.convRate > 0.5 ? "text-emerald-500" : u.convRate > 0.25 ? "text-amber-500" : "text-red-500"
                          )}>{fmtPct(u.convRate)}</span>
                        </button>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Peak creation month per AD */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Peak Creation Month per AD</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {adData.map(u => {
                const peak = u.byMonth.reduce((b, m) => m.count > b.count ? m : b, u.byMonth[0])
                return (
                  <div key={u.user} className="flex items-start gap-3 rounded-lg border bg-muted/20 px-3 py-2.5">
                    <ADCell name={u.user} />
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-1 flex-wrap mt-1">
                        {u.byMonth.filter(m => m.count > 0).map(m => (
                          <button
                            key={m.month}
                            onClick={() => m.deals.length > 0 && openModal(`${u.first} — ${m.month} Created`, m.deals as Deal[])}
                            title={`${m.month}: ${m.count} deals · ${fmt(m.value)}`}
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-medium transition-opacity hover:opacity-70",
                              m.month === peak.month && peak.count > 0
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {m.month} {m.count}
                          </button>
                        ))}
                      </div>
                    </div>
                    {peak.count > 0 && (
                      <Badge variant="outline" className="text-xs shrink-0">Peak: {peak.month}</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── VELOCITY VIEW ── */}
      {view === "velocity" && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-1">Deal Velocity — Days from Creation to Close</h3>
            <p className="text-xs text-muted-foreground mb-4">Based on the Age field. Click any bar or row to see the underlying deals.</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={velocityData.map(b => ({
                label: b.label,
                "Total Deals": b.count,
                Won: b.won.length,
                Open: b.pipe.length,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Total Deals" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                <Bar dataKey="Won" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="Open" fill="#f59e0b" radius={[4,4,0,0]} />
                {avgVelocityAll !== null && (
                  <ReferenceLine
                    x={velocityData.find(b => {
                      const ranges = [30,60,90,120,180,9999]
                      return avgVelocityAll < ranges[velocityData.indexOf(b)]
                    })?.label ?? ""}
                    stroke="#ef4444" strokeDasharray="4 4"
                    label={{ value: "Avg", fontSize: 10 }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {["Cycle Time","Deals","Value","Won","Open","Win Rate"].map(h => (
                    <th key={h} className={cn("px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide",
                      h === "Cycle Time" ? "text-left" : "text-right"
                    )} style={h === "Win Rate" ? {minWidth:120} : {}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {velocityData.map((b, i) => (
                  <tr key={b.label} className={cn("border-b hover:bg-muted/30 transition-colors", i%2!==0 && "bg-muted/20")}>
                    <td className="px-4 py-2 font-semibold">{b.label}</td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={b.count} deals={b.deals} onOpen={openModal}
                        title={`Velocity ${b.label} — All Deals`} className="text-foreground" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={b.value > 0 ? fmt(b.value) : "—"} deals={b.deals} onOpen={openModal}
                        title={`Velocity ${b.label} — All Deals`} className="text-primary" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={b.won.length} deals={b.won} onOpen={openModal}
                        title={`Velocity ${b.label} — Won`} className="text-emerald-500" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ClickCell value={b.pipe.length} deals={b.pipe} onOpen={openModal}
                        title={`Velocity ${b.label} — Open`} className="text-amber-500" />
                    </td>
                    <td className="px-4 py-2">
                      {b.count > 0 ? (
                        <button onClick={() => openModal(`Velocity ${b.label} — All`, b.deals as Deal[])}
                          className="w-full flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(b.convRate*100,100)}%` }} />
                          </div>
                          <span className={cn("text-xs tabular-nums font-medium",
                            b.convRate > 0.5 ? "text-emerald-500" : b.convRate > 0.25 ? "text-amber-500" : "text-red-500"
                          )}>{fmtPct(b.convRate)}</span>
                        </button>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Velocity insights */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Velocity Insights</h3>
            {avgVelocityAll !== null && (
              <div className="flex items-start gap-2 text-sm">
                {avgVelocityAll < 60
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  : <AlertTriangle className={cn("w-4 h-4 mt-0.5 shrink-0", avgVelocityAll < 120 ? "text-amber-500" : "text-red-500")} />
                }
                <span className="text-muted-foreground">
                  Average deal cycle is <strong className="text-foreground">{Math.round(avgVelocityAll)} days</strong>.
                  {avgVelocityAll < 60 && " Fast cycle — strong deal execution."}
                  {avgVelocityAll >= 60 && avgVelocityAll < 120 && " Normal B2B cycle. Focus on removing blockers in Negotiation/Decision stages."}
                  {avgVelocityAll >= 120 && " Long cycle — review whether deals are being qualified out early enough."}
                </span>
              </div>
            )}
            {velocityData[5].count > velocityData[0].count && (
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">
                  More deals in the {">"}180d bucket than {"<"}30d.{" "}
                  <button
                    onClick={() => openModal("Deals > 180 days", velocityData[5].deals as Deal[])}
                    className="text-amber-500 underline hover:opacity-80"
                  >
                    View {velocityData[5].count} stale deals
                  </button>
                  {" "}— consider a pipeline audit.
                </span>
              </div>
            )}
            {adData.filter(u => u.avgVelocity !== null && u.avgVelocity! < 60).length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">
                    {adData.filter(u => u.avgVelocity !== null && u.avgVelocity! < 60).map(u => u.first).join(", ")}
                  </strong>
                  {" "}close deals fastest on average — study their qualification approach.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
