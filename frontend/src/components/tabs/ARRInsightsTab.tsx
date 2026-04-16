/**
 * ARR Insights Tab
 * AI-driven insights and analysis for ARR performance
 */

import { useMemo, useState } from "react"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Zap, RefreshCw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ADCell } from "@/components/shared/ADAvatar"
import { useDashboardStore } from "@/store/dashboardStore"
import { USERS, BUDGET_AD_KEYS, BUDGET_AD_MAP } from "@/config/users"
import { MONTHS } from "@/config/months"
import { fmt, fmtPct } from "@/lib/formatters"
import { downloadCSV as _downloadCSVRaw } from "@/lib/exportHelpers"
import type { ARRDeal } from "@/lib/arrImport"

function getMonthKey(closeDate: string): string {
  if (!closeDate) return ""
  const [, m] = closeDate.split("-")
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return months[parseInt(m, 10) - 1] ?? ""
}

function sumARR(deals: ARRDeal[]): number {
  return deals.reduce((s, d) => s + d.totalAbc, 0)
}

function generateInsights(
  arrDeals: ARRDeal[],
  arrExemptLog: ARRDeal[],
  arrDupLog: { opportunityId: string; rowCount: number; totalAbc: number; opportunityName: string; accountName: string }[],
  arrBaseData: { ad: string; a: string; base: number; uplift: number }[],
  arrTargets: Record<string, Record<string, number>>
): string[] {
  const insights: string[] = []
  const activDeals = arrDeals.filter((d) => !d.isExempt)

  // Budget per AD
  const budgetByAD: Record<string, number> = {}
  for (const u of USERS) budgetByAD[u] = 0
  for (const month of MONTHS) {
    const mb = arrTargets[month] ?? {}
    for (const key of BUDGET_AD_KEYS) {
      const name = BUDGET_AD_MAP[key]
      if (name && USERS.includes(name)) budgetByAD[name] = (budgetByAD[name] ?? 0) + (mb[key] ?? 0)
    }
  }

  // Won per AD
  const wonByAD: Record<string, number> = {}
  const dealsByAD: Record<string, ARRDeal[]> = {}
  for (const u of USERS) { wonByAD[u] = 0; dealsByAD[u] = [] }
  for (const d of activDeals) {
    if (USERS.includes(d.assignedAD)) {
      wonByAD[d.assignedAD] = (wonByAD[d.assignedAD] ?? 0) + d.totalAbc
      dealsByAD[d.assignedAD].push(d)
    }
  }

  const teamWon = Object.values(wonByAD).reduce((s, v) => s + v, 0)
  const teamBudget = Object.values(budgetByAD).reduce((s, v) => s + v, 0)
  const teamPct = teamBudget > 0 ? (teamWon / teamBudget) * 100 : 0

  // 1. Overall team attainment
  insights.push(`📊 Team ARR attainment is ${teamPct.toFixed(1)}% — ${fmt(teamWon)} won against ${fmt(teamBudget)} full-year budget, with ${fmt(Math.max(0, teamBudget - teamWon))} remaining.`)

  // 2. Top performer
  const topAD = USERS.reduce((best, u) => {
    const pct = budgetByAD[u] > 0 ? wonByAD[u] / budgetByAD[u] : 0
    const bestPct = budgetByAD[best] > 0 ? wonByAD[best] / budgetByAD[best] : 0
    return pct > bestPct ? u : best
  }, USERS[0])
  const topPct = budgetByAD[topAD] > 0 ? (wonByAD[topAD] / budgetByAD[topAD]) * 100 : 0
  insights.push(`🏆 Top performer: ${topAD} at ${topPct.toFixed(1)}% attainment — ${fmt(wonByAD[topAD])} won from ${fmt(budgetByAD[topAD])} budget across ${dealsByAD[topAD].length} deals.`)

  // 3. At-risk ADs
  const atRisk = USERS.filter((u) => {
    const pct = budgetByAD[u] > 0 ? (wonByAD[u] / budgetByAD[u]) * 100 : 0
    return pct < 50 && budgetByAD[u] > 0
  })
  if (atRisk.length > 0) {
    insights.push(`⚠️ At risk of missing target: ${atRisk.join(", ")} — all below 50% attainment with significant budget remaining. Immediate focus required.`)
  }

  // 4. Ahead of target ADs
  const ahead = USERS.filter((u) => {
    const pct = budgetByAD[u] > 0 ? (wonByAD[u] / budgetByAD[u]) * 100 : 0
    return pct >= 100
  })
  if (ahead.length > 0) {
    insights.push(`✅ Ahead of full-year target: ${ahead.join(", ")} — these ADs have already met or exceeded their ARR budget.`)
  }

  // 5. Duplication analysis
  if (arrDupLog.length > 0) {
    const totalInflation = arrDupLog.reduce((s, d) => s + d.totalAbc * (d.rowCount - 1), 0)
    insights.push(`🔄 Deduplication removed ${arrDupLog.length} duplicate entries (${arrDupLog.reduce((s, d) => s + d.rowCount - 1, 0)} rows), preventing £${Math.round(totalInflation).toLocaleString()} of ARR inflation in the report.`)
  }

  // 6. Exempt analysis
  const exemptValue = sumARR(arrExemptLog)
  if (exemptValue > 0) {
    insights.push(`🚫 ${arrExemptLog.length} deals totalling ${fmt(exemptValue)} are exempt from ARR targets — ${arrExemptLog.filter(d=>d.isNotElevate).length} are Not Elevate accounts and ${arrExemptLog.filter(d=>!d.isNotElevate).length} are one-off exempt (e.g. GDK).`)
  }

  // 7. Monthly trend
  const monthlyTotals = MONTHS.map((m) => ({
    month: m,
    total: sumARR(activDeals.filter((d) => getMonthKey(d.closeDate) === m))
  })).filter((m) => m.total > 0)

  if (monthlyTotals.length >= 2) {
    const lastTwo = monthlyTotals.slice(-2)
    const trend = lastTwo[1].total > lastTwo[0].total ? "up" : "down"
    const diff = Math.abs(lastTwo[1].total - lastTwo[0].total)
    insights.push(`📈 Monthly trend: ARR intake moved ${trend === "up" ? "▲" : "▼"} from ${fmt(lastTwo[0].total)} in ${lastTwo[0].month} to ${fmt(lastTwo[1].total)} in ${lastTwo[1].month} — a ${trend === "up" ? "positive" : "negative"} shift of ${fmt(diff)}.`)
  }

  // 8. Accounts with zero ARR activity
  const accountsNoActivity = arrBaseData.filter((row) => {
    const actual = sumARR(activDeals.filter((d) =>
      d.accountName.toLowerCase().includes(row.a.toLowerCase()) ||
      d.ultimateParent.toLowerCase().includes(row.a.toLowerCase())
    ))
    return actual === 0 && row.base > 0
  })
  if (accountsNoActivity.length > 0) {
    const topMissing = accountsNoActivity.sort((a, b) => (b.base * b.uplift) - (a.base * a.uplift)).slice(0, 3)
    insights.push(`💡 ${accountsNoActivity.length} portfolio accounts have zero ARR activity. Highest priority: ${topMissing.map(a => `${a.a} (${fmt(a.base * a.uplift)} target)`).join(", ")}.`)
  }

  // 9. Split deal analysis
  const splitDeals = activDeals.filter((d) => d.isSplit)
  if (splitDeals.length > 0) {
    insights.push(`🔀 ${splitDeals.length} split deals (50/50 Wingstop/Heineken) totalling ${fmt(sumARR(splitDeals))} — these are shared between Chevonne Souness and Dan Turner.`)
  }

  // 10. Product mix
  const productMap: Record<string, number> = {}
  for (const d of activDeals) {
    productMap[d.product] = (productMap[d.product] ?? 0) + d.totalAbc
  }
  const topProduct = Object.entries(productMap).sort((a, b) => b[1] - a[1])[0]
  if (topProduct) {
    insights.push(`🏷️ Top ARR product: ${topProduct[0] || "Unclassified"} — ${fmt(topProduct[1])} (${((topProduct[1] / teamWon) * 100).toFixed(1)}% of total ARR won).`)
  }

  return insights
}

export function ARRInsightsTab() {
  const { arrDeals, arrExemptLog, arrDupLog, arrBaseData, arrTargets } = useDashboardStore()
  const [refreshKey, setRefreshKey] = useState(0)

  const loaded = arrDeals.length > 0

  const insights = useMemo(() => {
    return generateInsights(arrDeals, arrExemptLog, arrDupLog, arrBaseData, arrTargets)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrDeals, arrExemptLog, arrDupLog, arrBaseData, arrTargets, refreshKey])

  // ── Scoring summary ────────────────────────────────────────────────────────
  const activDeals = arrDeals.filter((d) => !d.isExempt)
  const teamWon = useMemo(() => activDeals.reduce((s, d) => s + d.totalAbc, 0), [activDeals])

  // Budget per AD
  const teamBudget = useMemo(() => {
    let total = 0
    for (const month of MONTHS) {
      const mb = arrTargets[month] ?? {}
      for (const key of BUDGET_AD_KEYS) {
        total += mb[key] ?? 0
      }
    }
    return total
  }, [arrTargets])

  const teamPct = teamBudget > 0 ? (teamWon / teamBudget) * 100 : 0

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <Zap className="w-12 h-12 text-muted-foreground/40" />
        <div>
          <p className="font-semibold text-lg">No ARR data loaded</p>
          <p className="text-sm text-muted-foreground mt-1">Import your Salesforce report to generate AI insights</p>
        </div>
      </div>
    )
  }

  const insightIcons: Record<string, React.ReactNode> = {
    "📊": <TrendingUp className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />,
    "🏆": <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />,
    "⚠️": <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />,
    "✅": <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />,
    "🔄": <RefreshCw className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
    "🚫": <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
    "📈": <TrendingUp className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />,
    "💡": <Zap className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />,
    "🔀": <RefreshCw className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />,
    "🏷️": <TrendingUp className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />,
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">ARR Intelligence</h2>
          <p className="text-sm text-muted-foreground">{insights.length} insights generated from {activDeals.length} deals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => {
              const text = insights.join("\n\n")
              _downloadCSVRaw("ARR_Insights.txt", text)
            }}
          >
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* ── Score cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 text-center">
          <p className="text-2xl font-black text-primary">{teamPct.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Team Attainment</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${teamPct >= 100 ? "bg-green-500" : teamPct >= 70 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${Math.min(100, teamPct)}%` }}
            />
          </div>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-2xl font-black text-green-600">{fmt(teamWon)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total ARR Won</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-2xl font-black text-red-500">{fmt(Math.max(0, teamBudget - teamWon))}</p>
          <p className="text-xs text-muted-foreground mt-1">Remaining to Budget</p>
        </div>
      </div>

      {/* ── Insights list ── */}
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const emoji = insight.slice(0, 2)
          const icon = insightIcons[emoji]
          const text = insight.slice(2).trim()
          const isAlert = emoji === "⚠️"
          const isSuccess = emoji === "✅" || emoji === "🏆"

          return (
            <div
              key={i}
              className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                isAlert
                  ? "bg-red-500/5 border-red-500/20"
                  : isSuccess
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-muted/20 border-border"
              }`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed">{text}</p>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0">#{i + 1}</Badge>
            </div>
          )
        })}
      </div>

      {/* ── AD quick reference ── */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b">
          <h3 className="font-semibold text-sm">AD Quick Reference</h3>
        </div>
        <div className="divide-y">
          {USERS.map((u) => {
            const deals = activDeals.filter((d) => d.assignedAD === u)
            const won = deals.reduce((s, d) => s + d.totalAbc, 0)
            let budget = 0
            for (const month of MONTHS) {
              const mb = arrTargets[month] ?? {}
              for (const key of BUDGET_AD_KEYS) {
                if (BUDGET_AD_MAP[key] === u) budget += mb[key] ?? 0
              }
            }
            const pct = budget > 0 ? (won / budget) * 100 : 0
            const products = [...new Set(deals.map(d => d.product).filter(Boolean))]

            return (
              <div key={u} className="flex items-center gap-4 px-4 py-3">
                <ADCell name={u} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{u}</span>
                    {pct >= 100 && <Badge className="text-[9px] bg-green-500">On Target</Badge>}
                    {pct < 50 && budget > 0 && <Badge variant="destructive" className="text-[9px]">At Risk</Badge>}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {products.slice(0, 3).join(" · ") || "No deals"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-primary">{fmt(won)}</div>
                  <div className={`text-[10px] font-semibold ${pct >= 100 ? "text-green-500" : pct >= 70 ? "text-amber-500" : "text-red-500"}`}>
                    {budget > 0 ? `${pct.toFixed(1)}%` : "—"}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
