/**
 * ARR Account Director Tab
 * Shows per-AD ARR summary, insights, and deal breakdown
 */

import { useMemo, useState } from "react"
import { TrendingUp, ChevronDown, ChevronRight, Download, Users, User } from "lucide-react"

import { KPI } from "@/components/ui/kpi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ADCell } from "@/components/shared/ADAvatar"
import { useDashboardStore } from "@/store/dashboardStore"
import { USERS, BUDGET_AD_KEYS, BUDGET_AD_MAP } from "@/config/users"
import { MONTHS } from "@/config/months"
import { fmt, fmtPct } from "@/lib/formatters"
import { downloadCSV as _downloadCSVRaw } from "@/lib/exportHelpers"
import type { ARRDeal } from "@/lib/arrImport"

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
  _downloadCSVRaw(filename, csv)
}

function getMonthKey(closeDate: string): string {
  if (!closeDate) return ""
  const [, m] = closeDate.split("-")
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return months[parseInt(m, 10) - 1] ?? ""
}

function sumARR(deals: ARRDeal[]): number {
  return deals.reduce((s, d) => s + d.totalAbc, 0)
}

function attainmentColor(pct: number): string {
  if (pct >= 100) return "text-green-500"
  if (pct >= 70)  return "text-amber-500"
  return "text-red-500"
}

function attainmentBg(pct: number): string {
  if (pct >= 100) return "bg-green-500"
  if (pct >= 70)  return "bg-amber-500"
  return "bg-red-500"
}

export function ARRADTab() {
  const { arrDeals, arrTargets, arrBaseData, manualArrDeals } = useDashboardStore()
  const [expandedAD, setExpandedAD] = useState<string | null>(null)

  const loaded = arrDeals.length > 0

  // ── ARR budget per AD per month from arrTargets ────────────────────────────
  const budgetByAD = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const u of USERS) totals[u] = 0
    for (const month of MONTHS) {
      const monthBudget = arrTargets[month] ?? {}
      for (const key of BUDGET_AD_KEYS) {
        const name = BUDGET_AD_MAP[key]
        if (name && USERS.includes(name)) {
          totals[name] = (totals[name] ?? 0) + (monthBudget[key] ?? 0)
        }
      }
    }
    return totals
  }, [arrTargets])

  // ── Monthly budget per AD ──────────────────────────────────────────────────
  const monthlyBudgetByAD = useMemo(() => {
    const result: Record<string, Record<string, number>> = {}
    for (const u of USERS) result[u] = {}
    for (const month of MONTHS) {
      const monthBudget = arrTargets[month] ?? {}
      for (const key of BUDGET_AD_KEYS) {
        const name = BUDGET_AD_MAP[key]
        if (name && USERS.includes(name)) {
          result[name][month] = monthBudget[key] ?? 0
        }
      }
    }
    return result
  }, [arrTargets])

  // ── Deals by AD ───────────────────────────────────────────────────────────
  const dealsByAD = useMemo(() => {
    const map: Record<string, ARRDeal[]> = {}
    for (const u of USERS) map[u] = []
    for (const d of arrDeals) {
      if (!d.isExempt && USERS.includes(d.assignedAD)) {
        map[d.assignedAD].push(d)
      }
    }
    return map
  }, [arrDeals])

  // ── Active months ──────────────────────────────────────────────────────────
  const activeMonths = useMemo(() => {
    const months = new Set<string>()
    for (const d of arrDeals) { if (!d.isExempt) months.add(getMonthKey(d.closeDate)) }
    return MONTHS.filter((m) => months.has(m))
  }, [arrDeals])

  // ── Portfolio baseline per AD from arrBaseData ─────────────────────────────
  const portfolioByAD = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const row of arrBaseData) {
      totals[row.ad] = (totals[row.ad] ?? 0) + row.base
    }
    return totals
  }, [arrBaseData])

  // ── Team totals ────────────────────────────────────────────────────────────
  const teamTotal = useMemo(() => sumARR(arrDeals.filter((d) => !d.isExempt)), [arrDeals])
  const teamBudget = useMemo(() => Object.values(budgetByAD).reduce((s, v) => s + v, 0), [budgetByAD])
  const teamPct = teamBudget > 0 ? (teamTotal / teamBudget) * 100 : 0

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <User className="w-12 h-12 text-muted-foreground/40" />
        <div>
          <p className="font-semibold text-lg">No ARR data loaded</p>
          <p className="text-sm text-muted-foreground mt-1">Import your combined Salesforce report to see AD performance</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Team KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Team ARR Won"    value={fmt(teamTotal)}   description={`${arrDeals.filter(d=>!d.isExempt).length} deals`} accent="info" />
        <KPI label="Team Budget"     value={fmt(teamBudget)}  description="Full FY ARR budget" />
        <KPI label="Team Attainment" value={fmtPct(teamPct/100)} description={`${fmt(Math.max(0,teamBudget-teamTotal))} remaining`} accent={teamPct>=100?"success":teamPct>=70?"warning":"destructive"} />
        <KPI label="Manual Entries"  value={String(manualArrDeals.length)} description="Manually added ARR deals" accent="warning" />
      </div>

      {/* ── Director Summary Table ── */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
          <h3 className="font-semibold text-sm">Director Summary — ARR vs Budget</h3>
          <Button variant="outline" size="sm" className="h-6 text-[10px]"
            onClick={() => {
              const rows = USERS.map((u) => {
                const won = sumARR(dealsByAD[u] ?? [])
                const budget = budgetByAD[u] ?? 0
                const pct = budget > 0 ? ((won/budget)*100).toFixed(1)+"%" : "—"
                return [u, fmt(portfolioByAD[u]??0), fmt(budget), fmt(won), pct, fmt(Math.max(0,budget-won))]
              })
              downloadCSV("ARR_AD_Summary.csv", [
                ["Director","Portfolio ARR","FY Budget","YTD Won","Attainment","Remaining"],
                ...rows,
              ])
            }}
          >
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Director</TableHead>
                <TableHead className="text-right">Portfolio ARR</TableHead>
                <TableHead className="text-right">FY Budget</TableHead>
                <TableHead className="text-right">YTD Won</TableHead>
                <TableHead className="text-right">Attainment</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Deals</TableHead>
                <TableHead className="text-right">Avg Deal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {USERS.map((u) => {
                const deals = dealsByAD[u] ?? []
                const won = sumARR(deals)
                const budget = budgetByAD[u] ?? 0
                const pct = budget > 0 ? (won/budget)*100 : 0
                const remaining = Math.max(0, budget - won)
                const avgDeal = deals.length > 0 ? won/deals.length : 0
                return (
                  <TableRow key={u} className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setExpandedAD(expandedAD === u ? null : u)}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ADCell name={u} />
                        {expandedAD === u
                          ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmt(portfolioByAD[u]??0)}</TableCell>
                    <TableCell className="text-right">{budget > 0 ? fmt(budget) : "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{fmt(won)}</TableCell>
                    <TableCell className={`text-right font-bold ${attainmentColor(pct)}`}>
                      {budget > 0 ? `${pct.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className={`text-right text-xs ${remaining > 0 ? "text-red-500" : "text-green-500"}`}>
                      {budget > 0 ? (remaining > 0 ? fmt(remaining) : "✓ Ahead") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="w-24 bg-muted rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${attainmentBg(pct)}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs">{deals.length}</TableCell>
                    <TableCell className="text-right text-xs">{avgDeal > 0 ? fmt(avgDeal) : "—"}</TableCell>
                  </TableRow>
                )
              })}
              {/* Team total row */}
              <TableRow className="font-bold border-t-2 bg-muted/20">
                <TableCell>Team Total</TableCell>
                <TableCell className="text-right">{fmt(Object.values(portfolioByAD).reduce((s,v)=>s+v,0))}</TableCell>
                <TableCell className="text-right">{fmt(teamBudget)}</TableCell>
                <TableCell className="text-right text-primary">{fmt(teamTotal)}</TableCell>
                <TableCell className={`text-right font-bold ${attainmentColor(teamPct)}`}>{`${teamPct.toFixed(1)}%`}</TableCell>
                <TableCell className={`text-right text-xs ${(teamBudget-teamTotal)>0?"text-red-500":"text-green-500"}`}>
                  {(teamBudget-teamTotal)>0?fmt(teamBudget-teamTotal):"✓ Ahead"}
                </TableCell>
                <TableCell>
                  <div className="w-24 bg-muted rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${attainmentBg(teamPct)}`} style={{width:`${Math.min(100,teamPct)}%`}} />
                  </div>
                </TableCell>
                <TableCell className="text-right text-xs">{arrDeals.filter(d=>!d.isExempt).length}</TableCell>
                <TableCell className="text-right text-xs">
                  {arrDeals.filter(d=>!d.isExempt).length > 0 ? fmt(teamTotal/arrDeals.filter(d=>!d.isExempt).length) : "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Expanded AD deal list */}
        {expandedAD && (
          <div className="border-t bg-muted/10">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground border-b">
              {expandedAD} — {(dealsByAD[expandedAD]??[]).length} deals
              {manualArrDeals.filter(d=>d.assignedAD===expandedAD).length > 0 && (
                <Badge variant="outline" className="ml-2 text-[9px]">
                  {manualArrDeals.filter(d=>d.assignedAD===expandedAD).length} manual
                </Badge>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Opportunity</TableHead>
                    <TableHead className="text-right">ARR Value</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dealsByAD[expandedAD]??[]).sort((a,b)=>b.totalAbc-a.totalAbc).map((d, i) => {
                    const isManual = manualArrDeals.some(m=>m.opportunityId===d.opportunityId)
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{d.accountName}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{d.opportunityName}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600 text-xs">{fmt(d.totalAbc)}</TableCell>
                        <TableCell className="text-xs">{getMonthKey(d.closeDate)}</TableCell>
                        <TableCell className="text-xs">{d.product}</TableCell>
                        <TableCell className="text-xs">
                          {isManual
                            ? <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-600">Manual</Badge>
                            : d.isSplit
                            ? <Badge variant="outline" className="text-[9px]">50/50</Badge>
                            : null}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* ── Monthly breakdown per AD ── */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b">
          <h3 className="font-semibold text-sm">Monthly ARR Intake — Budget vs Actual by Director</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                {USERS.map((u) => (
                  <TableHead key={u} colSpan={3} className="text-center text-[10px] border-l">
                    {u.split(" ")[0]}
                  </TableHead>
                ))}
                <TableHead colSpan={3} className="text-center text-[10px] border-l text-primary">Team</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-xs text-muted-foreground">FY26</TableHead>
                {USERS.map((u) => (
                  <>
                    <TableHead key={u+"-a"} className="text-right text-[10px] text-green-600 border-l">Actual</TableHead>
                    <TableHead key={u+"-b"} className="text-right text-[10px] text-muted-foreground">Budget</TableHead>
                    <TableHead key={u+"-p"} className="text-right text-[10px]">%</TableHead>
                  </>
                ))}
                <TableHead className="text-right text-[10px] text-green-600 border-l">Actual</TableHead>
                <TableHead className="text-right text-[10px] text-muted-foreground">Budget</TableHead>
                <TableHead className="text-right text-[10px]">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MONTHS.map((m) => {
                const teamActual = USERS.reduce((s, u) => s + sumARR((dealsByAD[u]??[]).filter(d=>getMonthKey(d.closeDate)===m)), 0)
                const teamBudgetM = USERS.reduce((s, u) => s + (monthlyBudgetByAD[u]?.[m]??0), 0)
                const teamPctM = teamBudgetM > 0 ? (teamActual/teamBudgetM)*100 : 0
                return (
                  <TableRow key={m} className={m===new Date().toLocaleString("en-GB",{month:"short"})?"bg-primary/5":""}>
                    <TableCell className="font-medium text-xs">{m}</TableCell>
                    {USERS.map((u) => {
                      const actual = sumARR((dealsByAD[u]??[]).filter(d=>getMonthKey(d.closeDate)===m))
                      const budget = monthlyBudgetByAD[u]?.[m] ?? 0
                      const pct = budget > 0 ? (actual/budget)*100 : 0
                      return (
                        <>
                          <TableCell key={u+"-a"} className={`text-right text-xs font-semibold border-l ${actual>0?"text-green-600":"text-muted-foreground"}`}>
                            {actual > 0 ? fmt(actual) : "—"}
                          </TableCell>
                          <TableCell key={u+"-b"} className="text-right text-xs text-muted-foreground">
                            {budget > 0 ? fmt(budget) : "—"}
                          </TableCell>
                          <TableCell key={u+"-p"} className={`text-right text-xs font-bold ${budget>0?attainmentColor(pct):"text-muted-foreground"}`}>
                            {budget > 0 ? `${pct.toFixed(0)}%` : "—"}
                          </TableCell>
                        </>
                      )
                    })}
                    <TableCell className={`text-right text-xs font-semibold border-l ${teamActual>0?"text-green-600":"text-muted-foreground"}`}>
                      {teamActual > 0 ? fmt(teamActual) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{teamBudgetM > 0 ? fmt(teamBudgetM) : "—"}</TableCell>
                    <TableCell className={`text-right text-xs font-bold ${teamBudgetM>0?attainmentColor(teamPctM):"text-muted-foreground"}`}>
                      {teamBudgetM > 0 ? `${teamPctM.toFixed(0)}%` : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
              {/* YTD row */}
              <TableRow className="font-bold border-t-2 bg-muted/20">
                <TableCell className="text-xs">YTD</TableCell>
                {USERS.map((u) => {
                  const actual = sumARR(dealsByAD[u]??[])
                  const budget = budgetByAD[u] ?? 0
                  const pct = budget > 0 ? (actual/budget)*100 : 0
                  return (
                    <>
                      <TableCell key={u+"-a"} className={`text-right text-xs font-bold border-l ${actual>0?"text-green-600":"text-muted-foreground"}`}>{fmt(actual)}</TableCell>
                      <TableCell key={u+"-b"} className="text-right text-xs">{fmt(budget)}</TableCell>
                      <TableCell key={u+"-p"} className={`text-right text-xs font-bold ${attainmentColor(pct)}`}>{`${pct.toFixed(0)}%`}</TableCell>
                    </>
                  )
                })}
                <TableCell className="text-right text-xs font-bold border-l text-green-600">{fmt(teamTotal)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(teamBudget)}</TableCell>
                <TableCell className={`text-right text-xs font-bold ${attainmentColor(teamPct)}`}>{`${teamPct.toFixed(0)}%`}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  )
}
