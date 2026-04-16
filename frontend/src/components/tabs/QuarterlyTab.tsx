import { useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/ui/kpi"
import { ADKPIIcon } from "@/components/shared/ADKPIIcon"
import { PctBar } from "@/components/shared/PctBar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { useDashboardStore, userMatchesFilter, getSelectedUsers } from "@/store/dashboardStore"
import { getADBudget, getTeamBudgetForMonths } from "@/lib/budgetHelpers"
import { fmt, fmtPct } from "@/lib/formatters"
import { USERS } from "@/config/users"
import { MONTHS, QUARTERS } from "@/config/months"
import { openDealModal } from "@/lib/modalBus"
import { generateMultiMonthCelebration } from "@/lib/celebrationBuilder"
import { useState, useCallback } from "react"
import { Copy, Check, RefreshCw, ClipboardList, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Deal } from "@/types"
import { ADCell, ADCard } from "@/components/shared/ADAvatar"

const QLIST = ["Q1", "Q2", "Q3", "Q4"] as const

function moneyTick(v: number) { return "£" + Math.round(v / 1000) + "k" }

export function QuarterlyTab() {
  const { data, filters, oiTargets, monthlyBudget } = useDashboardStore()
  const [celebVar, setCelebVar] = useState(0)
  const [copied, setCopied] = useState(false)
  const [copiedClari, setCopiedClari] = useState(false)
  const [copiedExec, setCopiedExec] = useState(false)

  const qFilter = filters.quarter !== "All" ? [filters.quarter] : [...QLIST]
  const userList = getSelectedUsers(filters.user)

  const getQ = (q: string) => {
    const months = QUARTERS[q]
    const won = data.filter(
      (r) =>
        r._stageSummary === "Won" &&
        months.includes(r._month ?? "") &&
        userMatchesFilter(r.User, filters.user) &&
        (filters.product === "All" || r._product === filters.product)
    )
    const pipe = data.filter(
      (r) =>
        r._stageSummary === "Pipe" &&
        months.includes(r._month ?? "") &&
        userMatchesFilter(r.User, filters.user) &&
        (filters.product === "All" || r._product === filters.product)
    )
    const wonVal = won.reduce((s, r) => s + (r._val ?? 0), 0)
    const pipeVal = pipe.reduce((s, r) => s + (r._val ?? 0), 0)
    const budget = filters.user !== "All"
      ? getADBudget(filters.user, months, oiTargets)
      : getTeamBudgetForMonths(months, oiTargets)
    return { won, pipe, wonVal, pipeVal, budget, months }
  }

  const chartData = MONTHS.map((m) => ({
    month: m,
    won: data
      .filter(
        (r) =>
          r._month === m &&
          r._stageSummary === "Won" &&
          userMatchesFilter(r.User, filters.user)
      )
      .reduce((s, r) => s + (r._val ?? 0), 0),
    budget: monthlyBudget[m] ?? 0,
  }))

  // Celebrate for selected quarter(s)
  const celebMonths = qFilter.flatMap((q) => QUARTERS[q])
  const celebWon = data.filter(
    (r) =>
      r._stageSummary === "Won" &&
      celebMonths.includes(r._month ?? "") &&
      userMatchesFilter(r.User, filters.user) &&
      (filters.product === "All" || r._product === filters.product)
  )
  const celebLabel = qFilter.length === 1 ? qFilter[0] : "FY26"

  async function copyPost() {
    const text = generateMultiMonthCelebration(celebWon, celebLabel, celebMonths.filter((m) => celebWon.some((r) => r._month === m)), {
      variation: celebVar, oiTargets, monthlyBudget, allData: data,
    })
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // AD cards data for the sidebar strip
  const adSummary = USERS.map((u) => {
    const uWon = data.filter((r) => r.User === u && r._stageSummary === "Won" && celebMonths.includes(r._month ?? "")).reduce((s, r) => s + (r._val ?? 0), 0)
    const uTarget = getADBudget(u, celebMonths, oiTargets)
    const uPipe = data.filter((r) => r.User === u && r._stageSummary === "Pipe" && celebMonths.includes(r._month ?? "")).reduce((s, r) => s + (r._val ?? 0), 0)
    const uRisk = data.filter((r) => r.User === u && r._risk === "Risk" && celebMonths.includes(r._month ?? "")).length
    return { user: u, won: uWon, target: uTarget, pct: uTarget ? uWon / uTarget : 0, pipe: uPipe, risk: uRisk }
  }).sort((a, b) => b.pct - a.pct)

  return (
    <div className="space-y-5">
      {/* AD summary strip */}
      {filters.user !== "All" ? (
        <div className="max-w-sm">
          {adSummary.filter((u) => u.user === filters.user).map((u, i) => (
            <ADCard
              key={u.user}
              name={u.user}
              wonVal={u.won}
              pct={u.pct}
              pipeVal={u.pipe}
              target={u.target}
              riskCount={u.risk}
              isSelected
              fmt={fmt}
              fmtPct={fmtPct}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-3 pb-2 divide-y divide-border">
            {adSummary.map((u, i) => (
              <ADCard
                key={u.user}
                name={u.user}
                rank={i}
                wonVal={u.won}
                pct={u.pct}
                pipeVal={u.pipe}
                target={u.target}
                riskCount={u.risk}
                compact
                onClick={() => openDealModal(`${u.user.split(" ")[0]} — Won`, data.filter((r) => r.User === u.user && r._stageSummary === "Won" && (filters.product === "All" || r._product === filters.product) && (filters.quarter === "All" || QUARTERS[filters.quarter]?.includes(r._month ?? ""))))}
                fmt={fmt}
                fmtPct={fmtPct}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Q KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {QLIST.map((q) => {
          const d = getQ(q)
          const pct = d.budget ? d.wonVal / d.budget : 0
          const label = d.wonVal > 0 ? fmt(d.wonVal) : fmt(d.pipeVal)
          const sub = d.wonVal > 0
            ? `${fmtPct(pct)} of ${fmt(d.budget)} budget`
            : `${fmt(d.pipeVal)} pipeline (${d.pipe.length} deals)`
          return (
            <div
              key={q}
              className="cursor-pointer"
              onClick={() => openDealModal(`${q} Deals`, [...d.won, ...d.pipe])}
            >
              <KPI
                label={q}
                value={label}
                period={sub}
                accent={d.wonVal > 0 ? (pct >= 0.8 ? "sap" : pct >= 0.5 ? "warning" : "destructive") : "info"}
                icon={<ADKPIIcon />}
              />
            </div>
          )
        })}
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Monthly Closed Won Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={moneyTick} tick={{ fontSize: 11 }} />
                <Tooltip formatter={((v: number) => fmt(v)) as any} />
                <Bar dataKey="won" name="Won" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* AD breakdown by quarter */}
      <Card>
        <CardHeader><CardTitle className="text-sm">AD Breakdown by Quarter</CardTitle></CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>AD</TableHead>
                {qFilter.map((q) => (
                  <>
                    <TableHead key={q + "w"} className="text-right border-l">{q} Won</TableHead>
                    <TableHead key={q + "b"} className="text-right">{q} Budget</TableHead>
                    <TableHead key={q + "p"} className="min-w-[80px]">%</TableHead>
                  </>
                ))}
                {qFilter.length > 1 && (
                  <>
                    <TableHead className="text-right border-l">FY Won</TableHead>
                    <TableHead className="text-right">FY Budget</TableHead>
                    <TableHead className="min-w-[80px]">FY %</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {userList.map((u) => {
                let fyWon = 0, fyBudget = 0
                return (
                  <TableRow key={u}>
                    <TableCell><ADCell name={u} /></TableCell>
                    {qFilter.map((q) => {
                      const months = QUARTERS[q]
                      const uWon = data
                        .filter((r) => r.User === u && months.includes(r._month ?? "") && r._stageSummary === "Won" && (filters.product === "All" || r._product === filters.product))
                        .reduce((s, r) => s + (r._val ?? 0), 0)
                      const uBudget = getADBudget(u, months, oiTargets)
                      fyWon += uWon; fyBudget += uBudget
                      return (
                        <>
                          <TableCell key={q + "w"} className="text-right border-l cursor-pointer font-medium"
                            onClick={() => openDealModal(`${u.split(" ")[0]} ${q}`, data.filter((r) => r.User === u && months.includes(r._month ?? "") && r._stageSummary === "Won"))}>
                            {fmt(uWon)}
                          </TableCell>
                          <TableCell key={q + "b"} className="text-right">{fmt(uBudget)}</TableCell>
                          <TableCell key={q + "p"}><PctBar value={uBudget ? uWon / uBudget : 0} /></TableCell>
                        </>
                      )
                    })}
                    {qFilter.length > 1 && (
                      <>
                        <TableCell className="text-right border-l font-semibold">{fmt(fyWon)}</TableCell>
                        <TableCell className="text-right">{fmt(fyBudget)}</TableCell>
                        <TableCell><PctBar value={fyBudget ? fyWon / fyBudget : 0} /></TableCell>
                      </>
                    )}
                  </TableRow>
                )
              })}
              {/* Team totals */}
              {userList.length > 1 && (() => {
                let tFyWon = 0, tFyBudget = 0
                const qTotals = qFilter.map((q) => {
                  const months = QUARTERS[q]
                  const qWon = data.filter((r) => months.includes(r._month ?? "") && r._stageSummary === "Won" && (filters.user === "All" || r.User === filters.user) && (filters.product === "All" || r._product === filters.product)).reduce((s, r) => s + (r._val ?? 0), 0)
                  const qBudget = filters.user !== "All" ? getADBudget(filters.user, months, oiTargets) : getTeamBudgetForMonths(months, oiTargets)
                  tFyWon += qWon; tFyBudget += qBudget
                  return { q, qWon, qBudget }
                })
                return (
                  <TableRow className="font-bold border-t-2 bg-muted/50">
                    <TableCell>Team</TableCell>
                    {qTotals.map(({ q, qWon, qBudget }) => (
                      <>
                        <TableCell key={q + "w"} className="text-right border-l">{fmt(qWon)}</TableCell>
                        <TableCell key={q + "b"} className="text-right">{fmt(qBudget)}</TableCell>
                        <TableCell key={q + "p"}><PctBar value={qBudget ? qWon / qBudget : 0} /></TableCell>
                      </>
                    ))}
                    {qFilter.length > 1 && (
                      <>
                        <TableCell className="text-right border-l">{fmt(tFyWon)}</TableCell>
                        <TableCell className="text-right">{fmt(tFyBudget)}</TableCell>
                        <TableCell><PctBar value={tFyBudget ? tFyWon / tFyBudget : 0} /></TableCell>
                      </>
                    )}
                  </TableRow>
                )
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Celebrate */}
      {celebWon.length > 0 && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Celebrate Wins — {celebLabel}</CardTitle>
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
              {generateMultiMonthCelebration(celebWon, celebLabel, celebMonths.filter((m) => celebWon.some((r) => r._month === m)), {
                variation: celebVar, oiTargets, monthlyBudget, allData: data,
              })}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* ── Executive Summary ── */}
      {(() => {
        const fk = (v: number) => "£" + (v >= 1000000 ? (v / 1000000).toFixed(1) + "m" : Math.round(v / 1000) + "k")
        const activeMonths = qFilter.flatMap((q) => QUARTERS[q])
        const qLabel = qFilter.length === 1 ? qFilter[0] : "FY26"
        const filteredData = data.filter(
          (r) => activeMonths.includes(r._month ?? "") &&
          (filters.user === "All" || r.User === filters.user) &&
          (filters.product === "All" || r._product === filters.product)
        )
        const won = filteredData.filter((r) => r._stageSummary === "Won")
        const lost = filteredData.filter((r) => r._stageSummary === "Lost")
        const pipe = filteredData.filter((r) => r._stageSummary === "Pipe")
        const commit = pipe.filter((r) => r._commit === "Commit")
        const upside = pipe.filter((r) => r._commit === "Upside")
        const keyDeals = pipe.filter((r) => (r._val ?? 0) >= 100000)
        const keyWins = won.filter((r) => (r._val ?? 0) >= 30000).sort((a, b) => (b._val ?? 0) - (a._val ?? 0)).slice(0, 5)
        const keyLost = lost.filter((r) => (r._val ?? 0) >= 30000).sort((a, b) => (b._val ?? 0) - (a._val ?? 0)).slice(0, 5)
        const bigDeals = [...won, ...pipe].filter((r) => (r._val ?? 0) >= 100000).sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
        const wonTotal = won.reduce((s, r) => s + (r._val ?? 0), 0)
        const budget = filters.user !== "All" ? getADBudget(filters.user, activeMonths, oiTargets) : getTeamBudgetForMonths(activeMonths, oiTargets)
        const attainment = budget ? wonTotal / budget : 0
        const pipeTotal = pipe.reduce((s, r) => s + (r._val ?? 0), 0)
        const commitTotal = commit.reduce((s, r) => s + (r._val ?? 0), 0)
        const upsideTotal = upside.reduce((s, r) => s + (r._val ?? 0), 0)
        const winRate = (won.length + lost.length) > 0 ? won.length / (won.length + lost.length) : 0

        // Champions — top AD by won value
        const champions = USERS.map((u) => ({
          name: u.split(" ")[0],
          won: won.filter((r) => r.User === u).reduce((s, r) => s + (r._val ?? 0), 0),
          count: won.filter((r) => r.User === u).length,
        })).filter((u) => u.won > 0).sort((a, b) => b.won - a.won)

        const execText = [
          `📊 ${qLabel} EXECUTIVE SUMMARY`,
          `═══════════════════════════════`,
          ``,
          `🔑 KEY INSIGHTS`,
          `• Attainment: ${fk(wonTotal)} of ${fk(budget)} budget (${Math.round(attainment * 100)}%)`,
          `• Win Rate: ${Math.round(winRate * 100)}% (${won.length} won, ${lost.length} lost)`,
          `• Total Commit: ${fk(wonTotal + commitTotal)} (Won + Commit Pipe)`,
          `• Coverage Ratio: ${pipeTotal > 0 && budget > wonTotal ? ((pipeTotal) / (budget - wonTotal)).toFixed(1) + "x" : "N/A"}`,
          ``,
          `📂 SUMMARY OF REMAINING OPEN DEALS`,
          `• Commit: ${commit.length} deals · ${fk(commitTotal)}`,
          `• Upside: ${upside.length} deals · ${fk(upsideTotal)}`,
          `• Pipeline: ${pipe.length} deals · ${fk(pipeTotal)}`,
          ``,
          `📈 PERFORMANCE SUMMARY & OUTLOOK`,
          `• ${attainment >= 1 ? "✅ Target achieved" : attainment >= 0.75 ? "🟡 On track — strong close required" : attainment >= 0.5 ? "🟠 Behind — focus on commit deals" : "🔴 Significantly behind — immediate action required"}`,
          `• Remaining gap to target: ${fk(Math.max(0, budget - wonTotal))}`,
          `• Commit pipe covers ${commitTotal > 0 ? Math.round((commitTotal / Math.max(1, budget - wonTotal)) * 100) + "%" : "0%"} of gap`,
          ``,
          `🎯 FOCUS AREAS`,
          ...(commit.slice(0, 3).map((r) => `• ${(r["Account Name"] ?? "").substring(0, 30)} — ${fk(r._val ?? 0)} (${r._commit})`)),
          commit.length === 0 ? ["• No commit deals — focus on pipeline conversion"] : [],
          ``,
          `💼 KEY DEALS (£100k+)`,
          ...(keyDeals.length > 0 ? keyDeals.slice(0, 5).map((r) => `• ${(r["Account Name"] ?? "").substring(0, 30)} — ${fk(r._val ?? 0)} (${r._commit ?? "Pipe"})`) : ["• No £100k+ open deals"]),
          ``,
          `🏆 KEY WINS`,
          ...(keyWins.length > 0 ? keyWins.map((r) => `• ${(r["Account Name"] ?? "").substring(0, 30)} — ${fk(r._val ?? 0)} (${r.User?.split(" ")[0]})`) : ["• No major wins this period"]),
          ``,
          `❌ KEY LOST`,
          ...(keyLost.length > 0 ? keyLost.map((r) => `• ${(r["Account Name"] ?? "").substring(0, 30)} — ${fk(r._val ?? 0)} (${r.User?.split(" ")[0]})`) : ["• No major losses this period"]),
          ``,
          `💰 £100K+ DEALS SUMMARY`,
          ...(bigDeals.length > 0 ? bigDeals.slice(0, 8).map((r) => `• ${r._stageSummary === "Won" ? "✅" : "🔵"} ${(r["Account Name"] ?? "").substring(0, 28)} — ${fk(r._val ?? 0)} (${r.User?.split(" ")[0]})`) : ["• No £100k+ deals"]),
          ``,
          `🥇 CHAMPIONS OF THE QUARTER`,
          ...(champions.length > 0 ? champions.map((c, i) => `${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  "} ${c.name} — ${fk(c.won)} (${c.count} deals)`) : ["• No wins recorded"]),
        ].flat().join("\n")

        return (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <CardTitle className="text-sm">
                    Executive Summary — {qLabel}
                    <span className="font-normal text-muted-foreground ml-2 text-xs">Copy and paste into email or Teams</span>
                  </CardTitle>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                  onClick={async () => { await navigator.clipboard.writeText(execText); setCopiedExec(true); setTimeout(() => setCopiedExec(false), 2000) }}>
                  {copiedExec ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Summary</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs leading-relaxed bg-muted rounded-xl p-4 whitespace-pre-wrap font-mono select-all max-h-96 overflow-y-auto text-foreground/80">
                {execText}
              </pre>
            </CardContent>
          </Card>
        )
      })()}

      {/* ── Forecast Paste (Clari / Teams) ── */}
      {(() => {
        const fk = (v: number) => "£" + Math.round(v / 1000) + "k"
        const activeMonths = qFilter.flatMap((q) => QUARTERS[q])
        const filteredData = data.filter(
          (r) => activeMonths.includes(r._month ?? "") &&
          (filters.user === "All" || r.User === filters.user) &&
          (filters.product === "All" || r._product === filters.product)
        )
        const won = filteredData.filter((r) => r._stageSummary === "Won")
        const pipe = filteredData.filter((r) => r._stageSummary === "Pipe")
        if (pipe.length === 0 && won.length === 0) return null

        const commitDeals = [...pipe].filter((r) => r._commit === "Commit").sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
        const upsideDeals = [...pipe].filter((r) => r._commit === "Upside").sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
        const pipeDeals = [...pipe].filter((r) => r._commit !== "Commit" && r._commit !== "Upside").sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
        const wonTotal = won.reduce((s, r) => s + (r._val ?? 0), 0)
        const commitTotal = commitDeals.reduce((s, r) => s + (r._val ?? 0), 0)
        const upsideTotal = upsideDeals.reduce((s, r) => s + (r._val ?? 0), 0)
        const line = (r: Deal) => `- ${(r.User ?? "").split(" ")[0].padEnd(10)} ${(r["Account Name"] ?? "").substring(0, 32).padEnd(33)} ${fk(r._val ?? 0)}`

        const text = [
          `${celebLabel} — Forecast Summary`,
          `Won: ${fk(wonTotal)} (${won.length})   Commit: ${fk(commitTotal)} (${commitDeals.length})   Upside: ${fk(upsideTotal)} (${upsideDeals.length})`,
          `Total Commit: ${fk(wonTotal + commitTotal)}`,
          ``,
          `WON (${won.length})`,
          ...(won.length > 0 ? won.slice().sort((a, b) => (b._val ?? 0) - (a._val ?? 0)).map(line) : ["(none)"]),
          ``,
          `COMMIT PIPE (${commitDeals.length})`,
          ...(commitDeals.length > 0 ? commitDeals.map(line) : ["(none)"]),
          ``,
          `UPSIDE (${upsideDeals.length})`,
          ...(upsideDeals.length > 0 ? upsideDeals.map(line) : ["(none)"]),
          ``,
          `PIPELINE (${pipeDeals.length})`,
          ...(pipeDeals.length > 0 ? pipeDeals.map(line) : ["(none)"]),
        ].join("\n")

        return (
          <Card className="opacity-90">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm">
                    Forecast Paste — {celebLabel}
                    <span className="font-normal text-muted-foreground ml-2 text-xs">Ready to paste into Clari, Teams or email</span>
                  </CardTitle>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                  onClick={async () => { await navigator.clipboard.writeText(text); setCopiedClari(true); setTimeout(() => setCopiedClari(false), 2000) }}>
                  {copiedClari ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy All</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs leading-relaxed bg-muted rounded-xl p-4 whitespace-pre-wrap font-mono select-all max-h-64 overflow-y-auto text-foreground/80">
                {text}
              </pre>
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}
