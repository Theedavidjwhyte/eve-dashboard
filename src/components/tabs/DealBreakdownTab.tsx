import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/ui/kpi"
import { PctBar } from "@/components/shared/PctBar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { useDashboardStore, getSelectedUsers, userMatchesFilter } from "@/store/dashboardStore"
import { getADBudget, getTeamBudgetForMonths } from "@/lib/budgetHelpers"
import { fmt, fmtPct } from "@/lib/formatters"
import { USERS } from "@/config/users"
import { MONTHS, QUARTERS } from "@/config/months"
import { openDealModal } from "@/App"
import type { BreakdownView } from "@/types"
import { cn } from "@/lib/utils"

function Pill({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("px-3 py-1.5 rounded text-xs border transition-colors", active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary")}>
      {children}
    </button>
  )
}

export function DealBreakdownTab() {
  const { data, filters, oiTargets, monthlyBudget, setBreakdownView, breakdownView } = useDashboardStore()

  const allData = data.filter(
    (r) =>
      userMatchesFilter(r.User, filters.user) &&
      (filters.product === "All" || r._product === filters.product) &&
      (!filters.keyDeals || (r._abc ?? 0) > 30000)
  )
  const won = allData.filter((r) => r._stageSummary === "Won")
  const pipe = allData.filter((r) => r._stageSummary === "Pipe")
  const commitPipe = pipe.filter((r) => r._commit === "Commit")
  const riskPipe = pipe.filter((r) => r._risk === "Risk")
  const keyDeals = allData.filter((r) => (r._abc ?? 0) > 30000)

  const totalWonV = won.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalPipeV = pipe.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalCommitV = commitPipe.reduce((s, r) => s + (r._val ?? 0), 0)
  const selectedUsers = getSelectedUsers(filters.user)
  const totalBud = selectedUsers.length < USERS.length
    ? selectedUsers.reduce((s, u) => s + getADBudget(u, MONTHS, oiTargets), 0)
    : getTeamBudgetForMonths(MONTHS, oiTargets)

  const userList = getSelectedUsers(filters.user)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-base font-semibold">Deal Breakdown</h2>
        <div className="flex gap-1 bg-card border rounded-lg p-1">
          {(["monthly", "quarterly", "ytd"] as BreakdownView[]).map((v) => (
            <Pill key={v} active={breakdownView === v} onClick={() => setBreakdownView(v)}>
              {v === "ytd" ? "YTD" : v.charAt(0).toUpperCase() + v.slice(1)}
            </Pill>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cursor-pointer" onClick={() => openDealModal("Won Deals", won)}>
          <KPI label="Won" value={fmt(totalWonV)} period={`${won.length} deals · ${totalBud > 0 ? fmtPct(totalWonV / totalBud) + " of budget" : ""}`} accent="sap" />
        </div>
        <div className="cursor-pointer" onClick={() => openDealModal("Pipeline", pipe)}>
          <KPI label="Pipeline" value={fmt(totalPipeV)} period={`${pipe.length} deals · ${fmt(totalCommitV)} commit`} accent="info" />
        </div>
        <div className="cursor-pointer" onClick={() => openDealModal("At Risk", riskPipe)}>
          <KPI label="At Risk" value={fmt(riskPipe.reduce((s, r) => s + (r._val ?? 0), 0))} period={`${riskPipe.length} deals (pushed >2x or >180 days)`} accent="destructive" />
        </div>
        <div className="cursor-pointer" onClick={() => openDealModal("Key Deals (>£30k)", keyDeals)}>
          <KPI label="Key Deals" value={fmt(keyDeals.reduce((s, r) => s + (r._val ?? 0), 0))} period={`${keyDeals.length} deals >£30k`} accent="teal" />
        </div>
      </div>

      {/* Monthly view */}
      {breakdownView === "monthly" && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-sm">Monthly Deal Breakdown</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Won Value</TableHead>
                    <TableHead className="text-right">Pipeline</TableHead>
                    <TableHead className="text-right">Pipe Value</TableHead>
                    <TableHead className="text-right">Commit</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="min-w-[80px]">Attainment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MONTHS.map((m) => {
                    const mWon = won.filter((r) => r._month === m)
                    const mPipe = pipe.filter((r) => r._month === m)
                    const mComm = mPipe.filter((r) => r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0)
                    const mWonV = mWon.reduce((s, r) => s + (r._val ?? 0), 0)
                    const mPipeV = mPipe.reduce((s, r) => s + (r._val ?? 0), 0)
                    const mBud = monthlyBudget[m] ?? 0
                    return (
                      <TableRow key={m} className="cursor-pointer"
                        onClick={() => openDealModal(`${m} — All Deals`, allData.filter((r) => r._month === m))}>
                        <TableCell className="font-semibold">{m}</TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{mWon.length}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{mWonV > 0 ? fmt(mWonV) : "—"}</TableCell>
                        <TableCell className="text-right">{mPipe.length}</TableCell>
                        <TableCell className="text-right">{mPipeV > 0 ? fmt(mPipeV) : "—"}</TableCell>
                        <TableCell className="text-right text-primary">{mComm > 0 ? fmt(mComm) : "—"}</TableCell>
                        <TableCell className="text-right">{fmt(mBud)}</TableCell>
                        <TableCell><PctBar value={mBud ? mWonV / mBud : 0} /></TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="font-bold border-t-2 bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{won.length}</TableCell>
                    <TableCell className="text-right">{fmt(totalWonV)}</TableCell>
                    <TableCell className="text-right">{pipe.length}</TableCell>
                    <TableCell className="text-right">{fmt(totalPipeV)}</TableCell>
                    <TableCell className="text-right">{fmt(totalCommitV)}</TableCell>
                    <TableCell className="text-right">{fmt(MONTHS.reduce((s, m) => s + (monthlyBudget[m] ?? 0), 0))}</TableCell>
                    <TableCell><PctBar value={totalBud ? totalWonV / totalBud : 0} /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* AD heatmap */}
          <Card>
            <CardHeader><CardTitle className="text-sm">AD Won by Month</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>AD</TableHead>
                    {MONTHS.map((m) => <TableHead key={m} className="text-right text-xs">{m}</TableHead>)}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userList.map((u) => {
                    let uTotal = 0
                    return (
                      <TableRow key={u}>
                        <TableCell className="font-medium">{u.split(" ")[0]}</TableCell>
                        {MONTHS.map((m) => {
                          const v = won.filter((r) => r.User === u && r._month === m).reduce((s, r) => s + (r._val ?? 0), 0)
                          uTotal += v
                          const opacity = v > 0 ? Math.min(v / 50000, 0.4) : 0
                          return (
                            <TableCell
                              key={m}
                              className="text-right text-xs cursor-pointer"
                              style={{ background: v > 0 ? `rgba(16,185,129,${opacity})` : undefined }}
                              onClick={() => openDealModal(`${u.split(" ")[0]} — ${m}`, data.filter((r) => r.User === u && r._month === m && r._stageSummary === "Won"))}
                            >
                              {v > 0 ? fmt(v) : ""}
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-right font-bold text-xs">{fmt(uTotal)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Quarterly view */}
      {breakdownView === "quarterly" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Quarterly Deal Breakdown</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarter</TableHead>
                  <TableHead>Months</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Won Value</TableHead>
                  <TableHead className="text-right">Pipeline</TableHead>
                  <TableHead className="text-right">Commit</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="min-w-[80px]">Attainment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(QUARTERS).map(([q, months]) => {
                  const qWon = won.filter((r) => months.includes(r._month ?? ""))
                  const qPipe = pipe.filter((r) => months.includes(r._month ?? ""))
                  const qWonV = qWon.reduce((s, r) => s + (r._val ?? 0), 0)
                  const qComm = qPipe.filter((r) => r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0)
                  const qBud = filters.user !== "All" ? getADBudget(filters.user, months, oiTargets) : getTeamBudgetForMonths(months, oiTargets)
                  return (
                    <TableRow key={q} className="cursor-pointer"
                      onClick={() => openDealModal(`${q} — All Deals`, allData.filter((r) => months.includes(r._month ?? "")))}>
                      <TableCell className="font-semibold">{q}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{months.join(", ")}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{qWon.length}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{qWonV > 0 ? fmt(qWonV) : "—"}</TableCell>
                      <TableCell className="text-right">{qPipe.length}</TableCell>
                      <TableCell className="text-right text-primary">{qComm > 0 ? fmt(qComm) : "—"}</TableCell>
                      <TableCell className="text-right">{fmt(qBud)}</TableCell>
                      <TableCell><PctBar value={qBud ? qWonV / qBud : 0} /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* YTD view */}
      {breakdownView === "ytd" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">AD YTD Summary</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AD</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Won Value</TableHead>
                  <TableHead className="text-right">Pipeline</TableHead>
                  <TableHead className="text-right">Pipe Value</TableHead>
                  <TableHead className="text-right">Commit</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="min-w-[80px]">Attainment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userList.map((u) => {
                  const uWon = won.filter((r) => r.User === u)
                  const uPipe = pipe.filter((r) => r.User === u)
                  const uWonV = uWon.reduce((s, r) => s + (r._val ?? 0), 0)
                  const uPipeV = uPipe.reduce((s, r) => s + (r._val ?? 0), 0)
                  const uComm = uPipe.filter((r) => r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0)
                  const uBud = getADBudget(u, MONTHS, oiTargets)
                  return (
                    <TableRow key={u} className="cursor-pointer"
                      onClick={() => openDealModal(`${u.split(" ")[0]} YTD`, [...uWon, ...uPipe])}>
                      <TableCell className="font-medium">{u.split(" ")[0]}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{uWon.length}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmt(uWonV)}</TableCell>
                      <TableCell className="text-right">{uPipe.length}</TableCell>
                      <TableCell className="text-right">{fmt(uPipeV)}</TableCell>
                      <TableCell className="text-right text-primary">{fmt(uComm)}</TableCell>
                      <TableCell className="text-right">{fmt(uBud)}</TableCell>
                      <TableCell><PctBar value={uBud ? uWonV / uBud : 0} /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
