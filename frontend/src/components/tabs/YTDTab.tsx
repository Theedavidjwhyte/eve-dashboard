import { useState } from "react"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/ui/kpi"
import { ADKPIIcon } from "@/components/shared/ADKPIIcon"
import { PctBar } from "@/components/shared/PctBar"
import { Button } from "@/components/ui/button"
import { Copy, Check, RefreshCw } from "lucide-react"
import { useDashboardStore, userMatchesFilter, getSelectedUsers, isUserFiltered } from "@/store/dashboardStore"
import { getADBudget, getTeamBudgetForMonths } from "@/lib/budgetHelpers"
import { fmt, fmtPct } from "@/lib/formatters"
import { USERS } from "@/config/users"
import { MONTHS, HALVES } from "@/config/months"
import { openDealModal } from "@/lib/modalBus"
import { generateMultiMonthCelebration } from "@/lib/celebrationBuilder"
import { ADCard } from "@/components/shared/ADAvatar"

export function YTDTab() {
  const { data, filters, oiTargets, monthlyBudget } = useDashboardStore()
  const [celebVar, setCelebVar] = useState(0)
  const [copied, setCopied] = useState(false)

  const userFilter = isUserFiltered(filters.user)
  const userList = getSelectedUsers(filters.user)

  const won = data.filter(
    (r) =>
      r._stageSummary === "Won" &&
      userMatchesFilter(r.User, filters.user) &&
      (filters.product === "All" || r._product === filters.product)
  )
  const totalWon = won.reduce((s, r) => s + (r._val ?? 0), 0)
  const annualBudget = Object.values(monthlyBudget).reduce((a, b) => a + b, 0)
  const annualTarget = userFilter
    ? getADBudget(filters.user, MONTHS, oiTargets)
    : getTeamBudgetForMonths(MONTHS, oiTargets)

  // Cumulative chart
  let cum = 0, cumBud = 0
  const chartData = MONTHS.map((m) => {
    const mWon = won.filter((r) => r._month === m).reduce((s, r) => s + (r._val ?? 0), 0)
    cum += mWon
    cumBud += monthlyBudget[m] ?? 0
    return { month: m, won: cum, budget: cumBud }
  })

  // League table
  const league = USERS.map((u) => {
    const uWon = won.filter((r) => r.User === u).reduce((s, r) => s + (r._val ?? 0), 0)
    const uTarget = getADBudget(u, MONTHS, oiTargets)
    return {
      user: u,
      won: uWon,
      target: uTarget,
      pct: uTarget ? uWon / uTarget : 0,
      deals: won.filter((r) => r.User === u).length,
      pipe: data.filter((r) => r.User === u && r._stageSummary === "Pipe").reduce((s, r) => s + (r._val ?? 0), 0),
    }
  }).sort((a, b) => b.pct - a.pct)

  // Halves
  const halfData = Object.entries(HALVES).map(([h, months]) => {
    const hWon = won.filter((r) => months.includes(r._month ?? "")).reduce((s, r) => s + (r._val ?? 0), 0)
    const hBudget = months.reduce((s, m) => s + (monthlyBudget[m] ?? 0), 0)
    return { half: h, won: hWon, budget: hBudget }
  })

  // Celebrate
  const celebWon = [...won].sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
  const activeMonths = MONTHS.filter((m) => won.some((r) => r._month === m))

  async function copyPost() {
    const text = generateMultiMonthCelebration(celebWon, "FY26 YTD", activeMonths, {
      variation: celebVar, oiTargets, monthlyBudget, allData: data,
    })
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="YTD Closed Won" value={fmt(totalWon)} period={`${won.length} deals`} accent="sap" icon={<ADKPIIcon />} />
        <KPI label="Annual Budget" value={fmt(annualBudget)} period={fmtPct(annualBudget ? totalWon / annualBudget : 0) + " achieved"} accent="info" icon={<ADKPIIcon />} />
        <KPI label="Annual Target" value={fmt(annualTarget)} period={fmtPct(annualTarget ? totalWon / annualTarget : 0) + " achieved"} accent="teal" icon={<ADKPIIcon />} />
        <KPI
          label="Gap to Target"
          value={fmt(annualTarget - totalWon)}
          period={totalWon >= annualTarget ? "Target achieved!" : "Remaining to close"}
          accent={totalWon >= annualTarget ? "sap" : "destructive"}
          icon={<ADKPIIcon />}
        />
      </div>

      {/* Cumulative chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Cumulative YTD Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => "£" + Math.round(v / 1000) + "k"} tick={{ fontSize: 11 }} />
                <Tooltip formatter={((v: number) => fmt(v)) as any} />
                <Line type="monotone" dataKey="won" name="Cumulative Won" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="budget" name="Cumulative Budget" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard — AD Cards */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
          Leaderboard — YTD % to Target
        </h3>
        {userFilter && userList.length === 1 ? (
          // Single AD — large card
          <div className="max-w-sm">
            {league.map((u, i) => (
              <ADCard
                key={u.user}
                name={u.user}
                rank={i}
                wonVal={u.won}
                pct={u.pct}
                pipeVal={u.pipe}
                target={u.target}
                dealCount={u.deals}
                riskCount={data.filter((r) => r.User === u.user && r._risk === "Risk").length}
                isSelected
                fmt={fmt}
                fmtPct={fmtPct}
              />
            ))}
          </div>
        ) : (
          // All ADs — compact list on top, full grid below
          <div className="space-y-4">
            {/* Top performer hero card */}
            {league[0] && (
              <ADCard
                name={league[0].user}
                rank={0}
                wonVal={league[0].won}
                pct={league[0].pct}
                pipeVal={league[0].pipe}
                target={league[0].target}
                dealCount={league[0].deals}
                riskCount={data.filter((r) => r.User === league[0].user && r._risk === "Risk").length}
                onClick={() => openDealModal(`${league[0].user.split(" ")[0]} — Won`, data.filter((r) => r.User === league[0].user && r._stageSummary === "Won"))}
                fmt={fmt}
                fmtPct={fmtPct}
              />
            )}
            {/* Rest — compact rows */}
            <Card>
              <CardContent className="pt-3 pb-2 divide-y divide-border">
                {league.slice(1).map((u, i) => (
                  <ADCard
                    key={u.user}
                    name={u.user}
                    rank={i + 1}
                    wonVal={u.won}
                    pct={u.pct}
                    pipeVal={u.pipe}
                    target={u.target}
                    dealCount={u.deals}
                    riskCount={data.filter((r) => r.User === u.user && r._risk === "Risk").length}
                    compact
                    onClick={() => openDealModal(`${u.user.split(" ")[0]} — Won`, data.filter((r) => r.User === u.user && r._stageSummary === "Won"))}
                    fmt={fmt}
                    fmtPct={fmtPct}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Half breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {halfData.map(({ half, won: hWon, budget: hBudget }) => (
          <Card key={half}>
            <CardHeader><CardTitle className="text-sm">{half} Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold mb-1">{fmt(hWon)}</p>
              <p className="text-sm text-muted-foreground mb-3">
                {fmtPct(hBudget ? hWon / hBudget : 0)} of {fmt(hBudget)} budget
              </p>
              <PctBar value={hBudget ? hWon / hBudget : 0} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Celebrate */}
      {celebWon.length > 0 && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Celebrate Wins — FY26 YTD</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setCelebVar((v) => v + 1)}>
                  <RefreshCw className="w-3 h-3" />Refresh
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={copyPost}>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy Post"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-xs leading-relaxed bg-muted rounded-xl p-4 whitespace-pre-wrap font-sans select-all max-h-72 overflow-y-auto">
              {generateMultiMonthCelebration(celebWon, "FY26 YTD", activeMonths, {
                variation: celebVar, oiTargets, monthlyBudget, allData: data,
              })}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
