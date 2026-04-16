import { useState, useMemo } from "react"
import { useDashboardStore } from "@/store/dashboardStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fmtKM, fmtPct } from "@/lib/formatters"
import { openDealModal } from "@/lib/modalBus"
import { USERS } from "@/config/users"
import { MONTHS } from "@/config/months"
import { Package } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

const COLOURS = ["#6366f1","#22c55e","#f59e0b","#ec4899","#14b8a6","#f97316","#8b5cf6","#06b6d4"]

export function ProductsTab() {
  const { data, filters } = useDashboardStore()
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return data.filter(d => {
      if (d._stageSummary === "Lost") return false
      const u = filters.user
      if (u !== "All") {
        const users = Array.isArray(u) ? u : [u]
        if (!users.includes(d.User ?? "")) return false
      }
      return true
    })
  }, [data, filters])

  const products = useMemo(() => {
    const map = new Map<string, { pipe: number; won: number; lost: number; count: number; wonCount: number; lostCount: number; deals: typeof data }>()
    data.forEach(d => {
      const p = d._product || "Unknown"
      if (!map.has(p)) map.set(p, { pipe: 0, won: 0, lost: 0, count: 0, wonCount: 0, lostCount: 0, deals: [] })
      const entry = map.get(p)!
      entry.deals.push(d)
      entry.count++
      if (d._stageSummary === "Won") { entry.won += d._val ?? 0; entry.wonCount++ }
      else if (d._stageSummary === "Lost") { entry.lost += d._val ?? 0; entry.lostCount++ }
      else { entry.pipe += d._val ?? 0 }
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v, winRate: v.wonCount + v.lostCount > 0 ? v.wonCount / (v.wonCount + v.lostCount) : 0 }))
      .sort((a, b) => (b.won + b.pipe) - (a.won + a.pipe))
  }, [data])

  const adMatrix = useMemo(() => {
    return USERS.map(ad => {
      const adDeals = filtered.filter(d => d.User === ad)
      const byProduct = products.map(p => {
        const pDeals = adDeals.filter(d => (d._product || "Unknown") === p.name)
        return { product: p.name, val: pDeals.reduce((s, d) => s + (d._val ?? 0), 0), count: pDeals.length }
      })
      return { ad, byProduct, total: adDeals.reduce((s, d) => s + (d._val ?? 0), 0) }
    })
  }, [filtered, products])

  const chartData = products.slice(0, 10).map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    fullName: p.name,
    won: p.won,
    pipe: p.pipe,
    winRate: Math.round(p.winRate * 100),
  }))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Products</h2>
        <p className="text-sm text-muted-foreground">{products.length} products detected across {data.length} deals</p>
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Pipeline by Product (Top 10)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} onClick={(e: any) => {
              if (e?.activePayload?.[0]) {
                const name = e.activePayload[0].payload.fullName
                const deals = data.filter(d => (d._product || "Unknown") === name)
                openDealModal(`Product: ${name}`, deals)
              }
            }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => fmtKM(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => fmtKM(Number(v))} />
              <Bar dataKey="won" name="Won" stackId="a" fill="#22c55e" radius={[0,0,0,0]} />
              <Bar dataKey="pipe" name="Pipe" stackId="a" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Product table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Product Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Product</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Pipe</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Won</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Lost</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Win Rate</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Deals</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr
                  key={p.name}
                  className="border-b hover:bg-muted/20 cursor-pointer"
                  onClick={() => openDealModal(`Product: ${p.name}`, p.deals)}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOURS[i % COLOURS.length] }} />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">{fmtKM(p.pipe)}</td>
                  <td className="px-4 py-2 text-right text-green-500 font-medium">{fmtKM(p.won)}</td>
                  <td className="px-4 py-2 text-right text-red-500">{fmtKM(p.lost)}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`font-semibold ${p.winRate >= 0.6 ? "text-green-500" : p.winRate >= 0.4 ? "text-amber-500" : "text-red-500"}`}>
                      {Math.round(p.winRate * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* AD × Product matrix */}
      <Card>
        <CardHeader><CardTitle className="text-sm">AD × Product Matrix</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">AD</th>
                {products.slice(0, 8).map(p => (
                  <th key={p.name} className="px-3 py-2 text-right font-semibold text-muted-foreground whitespace-nowrap">{p.name.slice(0, 10)}</th>
                ))}
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {adMatrix.map(row => (
                <tr key={row.ad} className="border-b hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.ad.split(" ")[0]}</td>
                  {row.byProduct.slice(0, 8).map(bp => (
                    <td key={bp.product} className="px-3 py-2 text-right">
                      {bp.val > 0 ? (
                        <span className="text-primary font-medium">{fmtKM(bp.val)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold">{fmtKM(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
