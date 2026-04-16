/**
 * ARR Monthly Tab — ARR Budget vs Actual by Director
 * Mirrors the screenshot: ACTUAL | BUDGET | % per AD per month
 */

import { useMemo, useState } from "react"
import { Download, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { useDashboardStore } from "@/store/dashboardStore"
import { USERS, BUDGET_AD_KEYS, BUDGET_AD_MAP } from "@/config/users"
import { MONTHS } from "@/config/months"
import { fmt } from "@/lib/formatters"
import { downloadCSV as _downloadCSVRaw } from "@/lib/exportHelpers"
import type { ARRDeal } from "@/lib/arrImport"
import type { Deal } from "@/types"

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
  if (pct >= 100) return "text-green-400"
  if (pct >= 70) return "text-amber-400"
  return "text-red-400"
}

export function ARRMonthlyTab() {
  const { arrDeals, arrTargets, data, oiTargets } = useDashboardStore()
  const [activeTab, setActiveTab] = useState<"arr" | "oi">("arr")
  const loaded = arrDeals.length > 0

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

  // ── Monthly budget per AD (from arrTargets store) ─────────────────────────
  const monthlyBudgetByAD = useMemo(() => {
    const result: Record<string, Record<string, number>> = {}
    for (const u of USERS) result[u] = {}
    for (const month of MONTHS) {
      const mb = arrTargets[month] ?? {}
      for (const key of BUDGET_AD_KEYS) {
        const name = BUDGET_AD_MAP[key]
        if (name && USERS.includes(name)) {
          result[name][month] = mb[key] ?? 0
        }
      }
    }
    return result
  }, [arrTargets])

  // ── YTD totals per AD ─────────────────────────────────────────────────────
  const ytdByAD = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const u of USERS) totals[u] = sumARR(dealsByAD[u] ?? [])
    return totals
  }, [dealsByAD])

  const ytdBudgetByAD = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const u of USERS) {
      totals[u] = MONTHS.reduce((s, m) => s + (monthlyBudgetByAD[u]?.[m] ?? 0), 0)
    }
    return totals
  }, [monthlyBudgetByAD])

  // ── Team columns ──────────────────────────────────────────────────────────
  function teamActual(month: string): number {
    return USERS.reduce((s, u) => s + sumARR((dealsByAD[u]??[]).filter(d=>getMonthKey(d.closeDate)===month)), 0)
  }
  function teamBudget(month: string): number {
    return USERS.reduce((s, u) => s + (monthlyBudgetByAD[u]?.[month] ?? 0), 0)
  }

  // ── OI Won by AD + month ──────────────────────────────────────────────────
  const oiWonByADMonth = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    for (const u of USERS) { map[u] = {}; for (const m of MONTHS) map[u][m] = 0 }
    for (const d of data) {
      if (d._stageSummary === "Won" && d.User && d._month) {
        map[d.User] = map[d.User] ?? {}
        map[d.User][d._month] = (map[d.User][d._month] ?? 0) + (d._val ?? 0)
      }
    }
    return map
  }, [data])

  const oiBudgetByADMonth = useMemo(() => {
    const result: Record<string, Record<string, number>> = {}
    for (const u of USERS) result[u] = {}
    for (const month of MONTHS) {
      const mb = (oiTargets ?? {})[month] ?? {}
      for (const key of BUDGET_AD_KEYS) {
        const name = BUDGET_AD_MAP[key]
        if (name && USERS.includes(name)) {
          result[name][month] = mb[key] ?? 0
        }
      }
    }
    return result
  }, [oiTargets])

  function oiTeamActual(month: string) { return USERS.reduce((s,u)=>s+(oiWonByADMonth[u]?.[month]??0),0) }
  function oiTeamBudget(month: string) { return USERS.reduce((s,u)=>s+(oiBudgetByADMonth[u]?.[month]??0),0) }

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <TrendingUp className="w-12 h-12 text-muted-foreground/40" />
        <div>
          <p className="font-semibold text-lg">No ARR data loaded</p>
          <p className="text-sm text-muted-foreground mt-1">Import your combined Salesforce report to see monthly ARR vs budget</p>
        </div>
      </div>
    )
  }

  const currentMonth = new Date().toLocaleString("en-GB", { month: "short" })

  return (
    <div className="space-y-4">

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("arr")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "arr" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >ARR vs Budget</button>
        <button
          onClick={() => setActiveTab("oi")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "oi" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >OI vs Budget</button>
      </div>

      {/* ── Header + export ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">{activeTab === "arr" ? "ARR Intake vs Budget" : "OI Won vs Budget"}</h2>
          <p className="text-sm text-muted-foreground">Monthly actual vs budget by Account Director</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (activeTab === "oi") {
              const headers = ["Month", ...USERS.flatMap(u => [u+" Actual", u+" Budget", u+" %"]), "Team Actual", "Team Budget", "Team %"]
              const rows = MONTHS.map((m) => {
                const ta = oiTeamActual(m); const tb = oiTeamBudget(m)
                const tp = tb > 0 ? ((ta/tb)*100).toFixed(1)+"%" : "—"
                return [m, ...USERS.flatMap(u => {
                  const a = oiWonByADMonth[u]?.[m] ?? 0; const b = oiBudgetByADMonth[u]?.[m] ?? 0
                  return [a.toFixed(2), b.toFixed(2), b>0?((a/b)*100).toFixed(1)+"%":"—"]
                }), ta.toFixed(2), tb.toFixed(2), tp]
              })
              downloadCSV("OI_Monthly_Budget_vs_Actual.csv", [headers, ...rows])
              return
            }
            const headers = ["Month", ...USERS.flatMap(u => [u+" Actual", u+" Budget", u+" %"]), "Team Actual", "Team Budget", "Team %"]
            const rows = MONTHS.map((m) => {
              const ta = teamActual(m)
              const tb = teamBudget(m)
              const tp = tb > 0 ? ((ta/tb)*100).toFixed(1)+"%" : "—"
              return [
                m,
                ...USERS.flatMap(u => {
                  const a = sumARR((dealsByAD[u]??[]).filter(d=>getMonthKey(d.closeDate)===m))
                  const b = monthlyBudgetByAD[u]?.[m] ?? 0
                  const p = b > 0 ? ((a/b)*100).toFixed(1)+"%" : "—"
                  return [a.toFixed(2), b.toFixed(2), p]
                }),
                ta.toFixed(2), tb.toFixed(2), tp
              ]
            })
            downloadCSV("ARR_Monthly_Budget_vs_Actual.csv", [headers, ...rows])
          }}
        >
          <Download className="w-3 h-3 mr-1" /> Export
        </Button>
      </div>

      {/* ── OI Table ── */}
      {activeTab === "oi" && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-bold">Month</TableHead>
                  {USERS.map((u) => (
                    <TableHead key={u} colSpan={3} className="text-center text-[10px] font-bold border-l uppercase tracking-wider">
                      {u.split(" ")[0]} {u.split(" ")[1]?.[0]}.
                    </TableHead>
                  ))}
                  <TableHead colSpan={3} className="text-center text-[10px] font-bold border-l text-primary uppercase tracking-wider">
                    Team Total
                  </TableHead>
                </TableRow>
                <TableRow className="bg-muted/20">
                  <TableHead className="text-[10px] text-muted-foreground">FY26</TableHead>
                  {USERS.map((u) => (
                    <>
                      <TableHead key={u+"-a"} className="text-right text-[10px] text-green-500 border-l font-semibold">Won</TableHead>
                      <TableHead key={u+"-b"} className="text-right text-[10px] text-muted-foreground font-semibold">Budget</TableHead>
                      <TableHead key={u+"-p"} className="text-right text-[10px] font-semibold">%</TableHead>
                    </>
                  ))}
                  <TableHead className="text-right text-[10px] text-green-500 border-l font-semibold">Won</TableHead>
                  <TableHead className="text-right text-[10px] text-muted-foreground font-semibold">Budget</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MONTHS.map((m) => {
                  const ta = oiTeamActual(m); const tb = oiTeamBudget(m)
                  const tpct = tb > 0 ? (ta/tb)*100 : 0
                  const isCurrent = m === currentMonth
                  return (
                    <TableRow key={m} className={isCurrent ? "bg-primary/5 font-medium" : ""}>
                      <TableCell className="text-xs font-semibold">{m}{isCurrent ? " ◄" : ""}</TableCell>
                      {USERS.map((u) => {
                        const a = oiWonByADMonth[u]?.[m] ?? 0
                        const b = oiBudgetByADMonth[u]?.[m] ?? 0
                        const pct = b > 0 ? (a/b)*100 : 0
                        return (
                          <>
                            <TableCell key={u+"-a"} className={`text-right text-xs border-l ${a>0?"text-green-500 font-semibold":"text-muted-foreground"}`}>
                              {a > 0 ? fmt(a) : "£0"}
                            </TableCell>
                            <TableCell key={u+"-b"} className="text-right text-xs text-muted-foreground">
                              {b > 0 ? fmt(b) : "—"}
                            </TableCell>
                            <TableCell key={u+"-p"} className={`text-right text-xs font-bold ${b>0?attainmentColor(pct):"text-muted-foreground"}`}>
                              {b > 0 ? `${pct.toFixed(0)}%` : "—"}
                            </TableCell>
                          </>
                        )
                      })}
                      <TableCell className={`text-right text-xs border-l ${ta>0?"text-green-500 font-bold":"text-muted-foreground"}`}>{ta>0?fmt(ta):"£0"}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{tb>0?fmt(tb):"—"}</TableCell>
                      <TableCell className={`text-right text-xs font-bold ${tb>0?attainmentColor(tpct):"text-muted-foreground"}`}>{tb>0?`${tpct.toFixed(0)}%`:"—"}</TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="font-bold border-t-2 bg-muted/30">
                  <TableCell className="text-xs">YTD</TableCell>
                  {USERS.map((u) => {
                    const a = MONTHS.reduce((s,m)=>s+(oiWonByADMonth[u]?.[m]??0),0)
                    const b = MONTHS.reduce((s,m)=>s+(oiBudgetByADMonth[u]?.[m]??0),0)
                    const pct = b>0?(a/b)*100:0
                    return (
                      <>
                        <TableCell key={u+"-a"} className={`text-right text-xs border-l font-bold ${a>0?"text-green-500":"text-muted-foreground"}`}>{fmt(a)}</TableCell>
                        <TableCell key={u+"-b"} className="text-right text-xs">{fmt(b)}</TableCell>
                        <TableCell key={u+"-p"} className={`text-right text-xs font-bold ${attainmentColor(pct)}`}>{`${pct.toFixed(0)}%`}</TableCell>
                      </>
                    )
                  })}
                  {(() => {
                    const ta = USERS.reduce((s,u)=>s+MONTHS.reduce((ss,m)=>ss+(oiWonByADMonth[u]?.[m]??0),0),0)
                    const tb = USERS.reduce((s,u)=>s+MONTHS.reduce((ss,m)=>ss+(oiBudgetByADMonth[u]?.[m]??0),0),0)
                    const pct = tb>0?(ta/tb)*100:0
                    return (<>
                      <TableCell className="text-right text-xs border-l font-bold text-green-500">{fmt(ta)}</TableCell>
                      <TableCell className="text-right text-xs">{fmt(tb)}</TableCell>
                      <TableCell className={`text-right text-xs font-bold ${attainmentColor(pct)}`}>{`${pct.toFixed(0)}%`}</TableCell>
                    </>)
                  })()}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── ARR Main table ── */}
      {activeTab === "arr" && <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-bold">Month</TableHead>
                {USERS.map((u) => (
                  <TableHead key={u} colSpan={3} className="text-center text-[10px] font-bold border-l uppercase tracking-wider">
                    {u.split(" ")[0]} {u.split(" ")[1]?.[0]}.
                  </TableHead>
                ))}
                <TableHead colSpan={3} className="text-center text-[10px] font-bold border-l text-primary uppercase tracking-wider">
                  Elevate Team
                </TableHead>
              </TableRow>
              <TableRow className="bg-muted/20">
                <TableHead className="text-[10px] text-muted-foreground">FY26</TableHead>
                {USERS.map((u) => (
                  <>
                    <TableHead key={u+"-a"} className="text-right text-[10px] text-green-500 border-l font-semibold">Actual</TableHead>
                    <TableHead key={u+"-b"} className="text-right text-[10px] text-muted-foreground font-semibold">Budget</TableHead>
                    <TableHead key={u+"-p"} className="text-right text-[10px] font-semibold">%</TableHead>
                  </>
                ))}
                <TableHead className="text-right text-[10px] text-green-500 border-l font-semibold">Actual</TableHead>
                <TableHead className="text-right text-[10px] text-muted-foreground font-semibold">Budget</TableHead>
                <TableHead className="text-right text-[10px] font-semibold">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MONTHS.map((m) => {
                const ta = teamActual(m)
                const tb = teamBudget(m)
                const tpct = tb > 0 ? (ta/tb)*100 : 0
                const isCurrent = m === currentMonth
                return (
                  <TableRow key={m} className={isCurrent ? "bg-primary/5 font-medium" : ""}>
                    <TableCell className="text-xs font-semibold">{m}{isCurrent ? " ◄" : ""}</TableCell>
                    {USERS.map((u) => {
                      const actual = sumARR((dealsByAD[u]??[]).filter(d=>getMonthKey(d.closeDate)===m))
                      const budget = monthlyBudgetByAD[u]?.[m] ?? 0
                      const pct = budget > 0 ? (actual/budget)*100 : 0
                      return (
                        <>
                          <TableCell key={u+"-a"} className={`text-right text-xs border-l ${actual>0?"text-green-500 font-semibold":"text-muted-foreground"}`}>
                            {actual > 0 ? fmt(actual) : "£0"}
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
                    <TableCell className={`text-right text-xs border-l ${ta>0?"text-green-500 font-bold":"text-muted-foreground"}`}>
                      {ta > 0 ? fmt(ta) : "£0"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{tb > 0 ? fmt(tb) : "—"}</TableCell>
                    <TableCell className={`text-right text-xs font-bold ${tb>0?attainmentColor(tpct):"text-muted-foreground"}`}>
                      {tb > 0 ? `${tpct.toFixed(0)}%` : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}

              {/* YTD row */}
              <TableRow className="font-bold border-t-2 bg-muted/30">
                <TableCell className="text-xs">YTD</TableCell>
                {USERS.map((u) => {
                  const actual = ytdByAD[u] ?? 0
                  const budget = ytdBudgetByAD[u] ?? 0
                  const pct = budget > 0 ? (actual/budget)*100 : 0
                  return (
                    <>
                      <TableCell key={u+"-a"} className={`text-right text-xs border-l font-bold ${actual>0?"text-green-500":"text-muted-foreground"}`}>{fmt(actual)}</TableCell>
                      <TableCell key={u+"-b"} className="text-right text-xs">{fmt(budget)}</TableCell>
                      <TableCell key={u+"-p"} className={`text-right text-xs font-bold ${attainmentColor(pct)}`}>{`${pct.toFixed(0)}%`}</TableCell>
                    </>
                  )
                })}
                {(() => {
                  const ta = USERS.reduce((s,u)=>s+(ytdByAD[u]??0),0)
                  const tb = USERS.reduce((s,u)=>s+(ytdBudgetByAD[u]??0),0)
                  const tpct = tb>0?(ta/tb)*100:0
                  return (
                    <>
                      <TableCell className="text-right text-xs border-l font-bold text-green-500">{fmt(ta)}</TableCell>
                      <TableCell className="text-right text-xs">{fmt(tb)}</TableCell>
                      <TableCell className={`text-right text-xs font-bold ${attainmentColor(tpct)}`}>{`${tpct.toFixed(0)}%`}</TableCell>
                    </>
                  )
                })()}
              </TableRow>

              {/* FY Target row */}
              <TableRow className="bg-muted/10 text-muted-foreground">
                <TableCell className="text-xs">FY Target</TableCell>
                {USERS.map((u) => {
                  const actual = ytdByAD[u] ?? 0
                  const budget = ytdBudgetByAD[u] ?? 0
                  const pct = budget > 0 ? (actual/budget)*100 : 0
                  return (
                    <>
                      <TableCell key={u+"-a"} className="text-right text-xs border-l">{fmt(actual)}</TableCell>
                      <TableCell key={u+"-b"} className="text-right text-xs">{fmt(budget)}</TableCell>
                      <TableCell key={u+"-p"} className={`text-right text-xs ${attainmentColor(pct)}`}>{`${pct.toFixed(0)}%`}</TableCell>
                    </>
                  )
                })}
                {(() => {
                  const ta = USERS.reduce((s,u)=>s+(ytdByAD[u]??0),0)
                  const tb = USERS.reduce((s,u)=>s+(ytdBudgetByAD[u]??0),0)
                  const tpct = tb>0?(ta/tb)*100:0
                  return (
                    <>
                      <TableCell className="text-right text-xs border-l">{fmt(ta)}</TableCell>
                      <TableCell className="text-right text-xs">{fmt(tb)}</TableCell>
                      <TableCell className={`text-right text-xs ${attainmentColor(tpct)}`}>{`${tpct.toFixed(0)}%`}</TableCell>
                    </>
                  )
                })()}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>}

    </div>
  )
}
