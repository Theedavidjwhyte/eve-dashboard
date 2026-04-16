import { useState, useMemo } from "react"
import { useDashboardStore } from "@/store/dashboardStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/ui/kpi"
import { fmtKM, fmtPct } from "@/lib/formatters"
import { openDealModal } from "@/lib/modalBus"
import { USERS } from "@/config/users"
import { MONTHS } from "@/config/months"
import { TrendingDown, AlertTriangle, ShieldAlert, Activity } from "lucide-react"

export function ChurnTab() {
  const { data, arrDeals, filters } = useDashboardStore()
  const [localUser, setLocalUser] = useState("All")

  // Detect churn deals from OI data
  const churnDeals = useMemo(() => {
    return data.filter(d => {
      const stage = (d.Stage ?? "").toLowerCase()
      const opp = (d["Opportunity Name"] ?? "").toLowerCase()
      const type = d._dealType
      return (
        type === "Churn" ||
        type === "Downsell" ||
        stage.includes("churn") ||
        stage.includes("lost") ||
        opp.includes("churn") ||
        opp.includes("downsell") ||
        opp.includes("cancell") ||
        opp.includes("renewal")
      )
    }).filter(d => {
      if (localUser === "All") return true
      return d.User === localUser
    })
  }, [data, localUser])

  // ARR churn from arrDeals
  const arrChurnDeals = useMemo(() => {
    return arrDeals.filter(d => {
      const stage = (d.stage ?? "").toLowerCase()
      const opp = (d.opportunityName ?? "").toLowerCase()
      return (
        stage.includes("churn") ||
        stage.includes("lost") ||
        opp.includes("churn") ||
        opp.includes("downsell") ||
        opp.includes("cancell")
      )
    })
  }, [arrDeals])

  const confirmedChurn = churnDeals.filter(d => d._stageSummary === "Lost")
  const atRiskChurn = churnDeals.filter(d => d._stageSummary === "Pipe")
  const totalChurnVal = churnDeals.reduce((s, d) => s + (d._abc ?? d._val ?? 0), 0)
  const confirmedChurnVal = confirmedChurn.reduce((s, d) => s + (d._abc ?? d._val ?? 0), 0)
  const atRiskVal = atRiskChurn.reduce((s, d) => s + (d._abc ?? d._val ?? 0), 0)
  const arrChurnVal = arrChurnDeals.reduce((s, d) => s + (d.totalAbc ?? 0), 0)

  // By AD
  const byAD = useMemo(() => {
    return USERS.map(ad => {
      const adDeals = churnDeals.filter(d => d.User === ad)
      return {
        ad,
        count: adDeals.length,
        val: adDeals.reduce((s, d) => s + (d._abc ?? d._val ?? 0), 0),
        confirmed: adDeals.filter(d => d._stageSummary === "Lost").length,
        atRisk: adDeals.filter(d => d._stageSummary === "Pipe").length,
        deals: adDeals,
      }
    }).filter(r => r.count > 0)
  }, [churnDeals])

  // By Month
  const byMonth = useMemo(() => {
    return MONTHS.map(m => {
      const mDeals = churnDeals.filter(d => d._month === m)
      return {
        month: m,
        count: mDeals.length,
        val: mDeals.reduce((s, d) => s + (d._abc ?? d._val ?? 0), 0),
        deals: mDeals,
      }
    }).filter(r => r.count > 0)
  }, [churnDeals])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" /> Churn Analysis
          </h2>
          <p className="text-sm text-muted-foreground">Churn, downsell and at-risk ARR tracking</p>
        </div>
        <select
          className="text-sm border rounded-md px-3 py-1.5 bg-background"
          value={localUser}
          onChange={e => setLocalUser(e.target.value)}
        >
          <option value="All">All ADs</option>
          {USERS.map(u => <option key={u} value={u}>{u.split(" ")[0]}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div onClick={() => openDealModal("All Churn Deals", churnDeals)} className="cursor-pointer">
        <KPI
          label="Total Churn Exposure"
          value={fmtKM(totalChurnVal)}
          icon={<TrendingDown className="w-4 h-4" />}
          accent="destructive"
          period={`${churnDeals.length} deals`}
        />
        </div>
        <div onClick={() => openDealModal("Confirmed Churn", confirmedChurn)} className="cursor-pointer">
        <KPI
          label="Confirmed Churn"
          value={fmtKM(confirmedChurnVal)}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent="destructive"
          period={`${confirmedChurn.length} lost`}
        />
        </div>
        <div onClick={() => openDealModal("At Risk Churn", atRiskChurn)} className="cursor-pointer">
        <KPI
          label="At Risk Pipeline"
          value={fmtKM(atRiskVal)}
          icon={<ShieldAlert className="w-4 h-4" />}
          accent="warning"
          period={`${atRiskChurn.length} at risk`}
        />
        </div>
        <KPI
          label="ARR Churn Exposure"
          value={fmtKM(arrChurnVal)}
          icon={<Activity className="w-4 h-4" />}
          accent="destructive"
          period={`${arrChurnDeals.length} ARR deals`}
        />
      </div>

      {churnDeals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <TrendingDown className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No churn deals detected</p>
            <p className="text-sm mt-1">Churn is identified from deal type, stage, or opportunity name containing churn/downsell/renewal keywords</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* By AD */}
          {byAD.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Churn by AD</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">AD</th>
                      <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Total Value</th>
                      <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Confirmed</th>
                      <th className="px-4 py-2 text-right font-semibold text-muted-foreground">At Risk</th>
                      <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Deals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byAD.map(row => (
                      <tr
                        key={row.ad}
                        className="border-b hover:bg-muted/20 cursor-pointer"
                        onClick={() => openDealModal(`${row.ad} — Churn`, row.deals)}
                      >
                        <td className="px-4 py-2 font-medium">{row.ad}</td>
                        <td className="px-4 py-2 text-right font-bold text-red-500">{fmtKM(row.val)}</td>
                        <td className="px-4 py-2 text-right text-red-400">{row.confirmed}</td>
                        <td className="px-4 py-2 text-right text-amber-500">{row.atRisk}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* By Month */}
          {byMonth.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Churn by Month</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Month</th>
                      <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Value</th>
                      <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Deals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMonth.map(row => (
                      <tr
                        key={row.month}
                        className="border-b hover:bg-muted/20 cursor-pointer"
                        onClick={() => openDealModal(`${row.month} Churn`, row.deals)}
                      >
                        <td className="px-4 py-2 font-medium">{row.month}</td>
                        <td className="px-4 py-2 text-right text-red-500 font-medium">{fmtKM(row.val)}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Deal list */}
          <Card>
            <CardHeader><CardTitle className="text-sm">All Churn Deals</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Opportunity</th>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Account</th>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">AD</th>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Stage</th>
                    <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Value</th>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Close</th>
                  </tr>
                </thead>
                <tbody>
                  {churnDeals.map((d, i) => (
                    <tr
                      key={i}
                      className="border-b hover:bg-muted/20 cursor-pointer"
                      onClick={() => openDealModal(d["Opportunity Name"] ?? "Deal", [d])}
                    >
                      <td className="px-4 py-2 max-w-[200px] truncate">{d["Opportunity Name"] ?? "—"}</td>
                      <td className="px-4 py-2 max-w-[150px] truncate text-muted-foreground">{d["Account Name"] ?? "—"}</td>
                      <td className="px-4 py-2">{(d.User ?? "—").split(" ")[0]}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          d._stageSummary === "Lost" ? "bg-red-500/10 text-red-500" :
                          d._stageSummary === "Won" ? "bg-green-500/10 text-green-500" :
                          "bg-amber-500/10 text-amber-500"
                        }`}>{d.Stage ?? d._stageSummary ?? "—"}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{fmtKM(d._abc ?? d._val ?? 0)}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{d._month ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
