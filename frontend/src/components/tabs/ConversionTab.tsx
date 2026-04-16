import { useState, useMemo } from "react"
import { useDashboardStore } from "@/store/dashboardStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/ui/kpi"
import { fmtKM, fmtPct, fmt } from "@/lib/formatters"
import { openDealModal } from "@/lib/modalBus"
import { USERS } from "@/config/users"
import { MONTHS } from "@/config/months"
import { TrendingUp, Target, Clock, Award } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts"

export function ConversionTab() {
  const { data, filters } = useDashboardStore()
  const [expandedAD, setExpandedAD] = useState<string | null>(null)
  const [localUser, setLocalUser] = useState("All")

  const closed = useMemo(() => {
    return data.filter(d => d._stageSummary === "Won" || d._stageSummary === "Lost")
      .filter(d => localUser === "All" || d.User === localUser)
  }, [data, localUser])

  const won = closed.filter(d => d._stageSummary === "Won")
  const lost = closed.filter(d => d._stageSummary === "Lost")
  const winRate = closed.length > 0 ? won.length / closed.length : 0
  const wonVal = won.reduce((s, d) => s + (d._val ?? 0), 0)
  const lostVal = lost.reduce((s, d) => s + (d._val ?? 0), 0)

  const avgDealSize = won.length > 0 ? wonVal / won.length : 0
  const avgCloseTime = useMemo(() => {
    const times = won.filter(d => d._stageDur && d._stageDur > 0).map(d => d._stageDur!)
    return times.length > 0 ? times.reduce((s, t) => s + t, 0) / times.length : 0
  }, [won])

  // Monthly chart
  const monthlyData = useMemo(() => {
    return MONTHS.map(m => {
      const mWon = won.filter(d => d._month === m)
      const mLost = lost.filter(d => d._month === m)
      const total = mWon.length + mLost.length
      return {
        month: m,
        won: mWon.length,
        lost: mLost.length,
        wonVal: mWon.reduce((s, d) => s + (d._val ?? 0), 0),
        winRate: total > 0 ? Math.round((mWon.length / total) * 100) : 0,
        wonDeals: mWon,
        lostDeals: mLost,
      }
    }).filter(m => m.won + m.lost > 0)
  }, [won, lost])

  // AD breakdown
  const adData = useMemo(() => {
    return USERS.map(ad => {
      const adWon = won.filter(d => d.User === ad)
      const adLost = lost.filter(d => d.User === ad)
      const total = adWon.length + adLost.length
      const adWonVal = adWon.reduce((s, d) => s + (d._val ?? 0), 0)
      const adAvgClose = adWon.filter(d => d._stageDur).map(d => d._stageDur!).reduce((s, t, _, a) => s + t / a.length, 0)

      // By product
      const byProduct = [...new Set([...adWon, ...adLost].map(d => d._product || "Unknown"))].map(p => {
        const pw = adWon.filter(d => (d._product || "Unknown") === p)
        const pl = adLost.filter(d => (d._product || "Unknown") === p)
        return { product: p, won: pw.length, lost: pl.length, winRate: pw.length + pl.length > 0 ? pw.length / (pw.length + pl.length) : 0 }
      }).sort((a, b) => b.won - a.won)

      // By month
      const byMonth = MONTHS.map(m => ({
        month: m,
        won: adWon.filter(d => d._month === m).length,
        lost: adLost.filter(d => d._month === m).length,
      })).filter(m => m.won + m.lost > 0)

      return {
        ad,
        won: adWon.length,
        lost: adLost.length,
        total,
        winRate: total > 0 ? adWon.length / total : 0,
        wonVal: adWonVal,
        avgDeal: adWon.length > 0 ? adWonVal / adWon.length : 0,
        avgClose: adAvgClose,
        byProduct,
        byMonth,
        wonDeals: adWon,
        lostDeals: adLost,
      }
    }).filter(r => r.total > 0)
  }, [won, lost])

  // Products
  const productData = useMemo(() => {
    const map = new Map<string, { won: number; lost: number }>()
    closed.forEach(d => {
      const p = d._product || "Unknown"
      if (!map.has(p)) map.set(p, { won: 0, lost: 0 })
      const e = map.get(p)!
      if (d._stageSummary === "Won") { e.won++ } else { e.lost++ }
    })
    return [...map.entries()]
      .map(([p, v]) => ({ product: p, ...v, winRate: v.won + v.lost > 0 ? v.won / (v.won + v.lost) : 0 }))
      .sort((a, b) => b.won - a.won)
  }, [closed])

  // Lost by stage
  const lostByStage = useMemo(() => {
    const map = new Map<string, { count: number; deals: typeof lost }>()
    lost.forEach(d => {
      const s = d.Stage ?? "Unknown"
      if (!map.has(s)) map.set(s, { count: 0, deals: [] })
      map.get(s)!.count++
      map.get(s)!.deals.push(d)
    })
    return [...map.entries()].map(([stage, v]) => ({ stage, ...v })).sort((a, b) => b.count - a.count)
  }, [lost])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Conversion Analysis</h2>
          <p className="text-sm text-muted-foreground">{closed.length} closed deals · win rate, close time, funnel analysis</p>
        </div>
        <select className="text-sm border rounded-md px-3 py-1.5 bg-background" value={localUser} onChange={e => setLocalUser(e.target.value)}>
          <option value="All">All ADs</option>
          {USERS.map(u => <option key={u} value={u}>{u.split(" ")[0]}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div onClick={() => openDealModal("All Won Deals", won)} className="cursor-pointer">
        <KPI label="Win Rate" value={`${Math.round(winRate * 100)}%`} icon={<Award className="w-4 h-4" />}
          accent={winRate >= 0.6 ? "success" : winRate >= 0.4 ? "warning" : "destructive"}
          period={`${won.length}W / ${lost.length}L`} />
        </div>
        <div onClick={() => openDealModal("Won Deals", won)} className="cursor-pointer">
        <KPI label="Won Value" value={fmtKM(wonVal)} icon={<TrendingUp className="w-4 h-4" />}
          accent="success" period={`${won.length} deals`} />
        </div>
        <div onClick={() => openDealModal("Lost Deals", lost)} className="cursor-pointer">
        <KPI label="Lost Value" value={fmtKM(lostVal)} icon={<Target className="w-4 h-4" />}
          accent="destructive" period={`${lost.length} deals`} />
        </div>
        <KPI label="Avg Close Time" value={`${Math.round(avgCloseTime)}d`} icon={<Clock className="w-4 h-4" />}
          accent="info" period={`Avg deal: ${fmtKM(avgDealSize)}`} />
      </div>

      {/* Monthly Won/Lost chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Won vs Lost by Month</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} onClick={(e: any) => {
              if (e?.activePayload?.[0]) {
                const d = e.activePayload[0].payload
                openDealModal(`${d.month} — Closed Deals`, [...d.wonDeals, ...d.lostDeals])
              }
            }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="won" name="Won" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="lost" name="Lost" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Win rate trend */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Win Rate Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => `${v}%`} />
              <Line type="monotone" dataKey="winRate" name="Win Rate %" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AD Conversion table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">AD Conversion Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">AD</th>
                <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Win Rate</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Won</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Lost</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Won Value</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Avg Deal</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Avg Close</th>
              </tr>
            </thead>
            <tbody>
              {adData.map(row => (
                <>
                  <tr
                    key={row.ad}
                    className="border-b hover:bg-muted/20 cursor-pointer"
                    onClick={() => setExpandedAD(expandedAD === row.ad ? null : row.ad)}
                  >
                    <td className="px-4 py-2 font-medium">{row.ad}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${Math.round(row.winRate * 100)}%`,
                            backgroundColor: row.winRate >= 0.6 ? "#22c55e" : row.winRate >= 0.4 ? "#f59e0b" : "#ef4444"
                          }} />
                        </div>
                        <span className="text-xs font-semibold w-8">{Math.round(row.winRate * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-green-500 font-medium">{row.won}</td>
                    <td className="px-4 py-2 text-right text-red-500">{row.lost}</td>
                    <td className="px-4 py-2 text-right font-bold">{fmtKM(row.wonVal)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{fmtKM(row.avgDeal)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{row.avgClose > 0 ? `${Math.round(row.avgClose)}d` : "—"}</td>
                  </tr>
                  {expandedAD === row.ad && (
                    <tr className="bg-muted/10">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">By Product</p>
                            <div className="space-y-1">
                              {row.byProduct.slice(0, 5).map(p => (
                                <div key={p.product} className="flex items-center justify-between text-xs">
                                  <span className="truncate max-w-[120px]">{p.product}</span>
                                  <span className={`font-semibold ${p.winRate >= 0.6 ? "text-green-500" : p.winRate >= 0.4 ? "text-amber-500" : "text-red-500"}`}>
                                    {Math.round(p.winRate * 100)}% ({p.won}W/{p.lost}L)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">By Month</p>
                            <div className="space-y-1">
                              {row.byMonth.slice(0, 5).map(m => (
                                <div key={m.month} className="flex items-center justify-between text-xs">
                                  <span>{m.month}</span>
                                  <span>{m.won}W / {m.lost}L</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Product win rates */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Win Rate by Product</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Product</th>
                <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Win Rate</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Won</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Lost</th>
              </tr>
            </thead>
            <tbody>
              {productData.map(p => (
                <tr key={p.product} className="border-b hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">{p.product}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${Math.round(p.winRate * 100)}%`,
                          backgroundColor: p.winRate >= 0.6 ? "#22c55e" : p.winRate >= 0.4 ? "#f59e0b" : "#ef4444"
                        }} />
                      </div>
                      <span className={`text-xs font-semibold w-8 ${p.winRate >= 0.6 ? "text-green-500" : p.winRate >= 0.4 ? "text-amber-500" : "text-red-500"}`}>
                        {Math.round(p.winRate * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right text-green-500 font-medium">{p.won}</td>
                  <td className="px-4 py-2 text-right text-red-500">{p.lost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Where are we losing */}
      {lostByStage.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Where Are We Losing?</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Stage</th>
                  <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Lost Deals</th>
                  <th className="px-4 py-2 text-right font-semibold text-muted-foreground">% of Losses</th>
                </tr>
              </thead>
              <tbody>
                {lostByStage.map(row => (
                  <tr key={row.stage} className="border-b hover:bg-muted/20 cursor-pointer"
                    onClick={() => openDealModal(`Lost at ${row.stage}`, row.deals)}>
                    <td className="px-4 py-2 font-medium">{row.stage}</td>
                    <td className="px-4 py-2 text-right text-red-500 font-medium">{row.count}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {lost.length > 0 ? `${Math.round((row.count / lost.length) * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
