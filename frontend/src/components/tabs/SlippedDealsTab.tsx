import { useMemo, useState } from "react"
import { AlertTriangle, TrendingDown, RefreshCw, DollarSign, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CommitBadge } from "@/components/shared/StatusBadge"
import { useDashboardStore } from "@/store/dashboardStore"
import { fmt } from "@/lib/formatters"
import { USERS } from "@/config/users"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

type SortCol = "opp" | "ad" | "val" | "push" | "stage" | "close" | "commit" | "risk"
type SortDir = "asc" | "desc"

function RagBadge({ score }: { score: number }) {
  if (score >= 3) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">🔴 High Risk</span>
  if (score === 2) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">🟡 Medium</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">🟢 Low</span>
}

function riskScore(deal: { _push?: number; _commit?: string; _stageDur?: number }): number {
  let score = 0
  if ((deal._push ?? 0) >= 3) score += 2
  else if ((deal._push ?? 0) >= 1) score += 1
  if (deal._commit === "Commit") score += 1
  if ((deal._stageDur ?? 0) > 60) score += 1
  return score
}

export function SlippedDealsTab() {
  const { data, filters } = useDashboardStore()
  const [adFilter, setAdFilter] = useState("All")
  const [commitFilter, setCommitFilter] = useState("All")
  const [pushFilter, setPushFilter] = useState("All")
  const [sortCol, setSortCol] = useState<SortCol>("push")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortCol(col); setSortDir("desc") }
  }

  // All active pipeline deals that have been pushed at least once
  const slipped = useMemo(() => {
    let rows = data.filter(d =>
      d._stageSummary === "Pipe" &&
      (d._push ?? 0) > 0
    )
    // Apply global user filter
    if (filters.user !== "All") {
      const users = Array.isArray(filters.user) ? filters.user : [filters.user]
      rows = rows.filter(d => users.includes(d.User ?? ""))
    }
    // Apply local filters
    if (adFilter !== "All") rows = rows.filter(d => d.User === adFilter)
    if (commitFilter !== "All") rows = rows.filter(d => d._commit === commitFilter)
    if (pushFilter === "1") rows = rows.filter(d => d._push === 1)
    if (pushFilter === "2") rows = rows.filter(d => d._push === 2)
    if (pushFilter === "3+") rows = rows.filter(d => (d._push ?? 0) >= 3)

    // Sort
    rows.sort((a, b) => {
      let va: number | string = 0
      let vb: number | string = 0
      if (sortCol === "push") { va = a._push ?? 0; vb = b._push ?? 0 }
      else if (sortCol === "val") { va = a._val ?? 0; vb = b._val ?? 0 }
      else if (sortCol === "stage") { va = a._stageDur ?? 0; vb = b._stageDur ?? 0 }
      else if (sortCol === "opp") { va = a["Opportunity Name"] as string ?? ""; vb = b["Opportunity Name"] as string ?? "" }
      else if (sortCol === "ad") { va = a.User ?? ""; vb = b.User ?? "" }
      else if (sortCol === "close") { va = a["Close Date"] ?? ""; vb = b["Close Date"] ?? "" }
      else if (sortCol === "commit") { va = a._commit ?? ""; vb = b._commit ?? "" }
      else if (sortCol === "risk") { va = riskScore(a); vb = riskScore(b) }

      if (typeof va === "number" && typeof vb === "number")
        return sortDir === "asc" ? va - vb : vb - va
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va))
    })
    return rows
  }, [data, filters, adFilter, commitFilter, pushFilter, sortCol, sortDir])

  // KPIs
  const totalValue = slipped.reduce((s, d) => s + (d._val ?? 0), 0)
  const avgPushes = slipped.length > 0 ? (slipped.reduce((s, d) => s + (d._push ?? 0), 0) / slipped.length).toFixed(1) : "0"
  const highRisk = slipped.filter(d => riskScore(d) >= 3).length
  const commitSlipped = slipped.filter(d => d._commit === "Commit")
  const commitValue = commitSlipped.reduce((s, d) => s + (d._val ?? 0), 0)

  // Push frequency buckets
  const push1 = slipped.filter(d => d._push === 1).length
  const push2 = slipped.filter(d => d._push === 2).length
  const push3 = slipped.filter(d => (d._push ?? 0) >= 3).length

  // By AD breakdown
  const byAD = useMemo(() => USERS.map(u => {
    const deals = slipped.filter(d => d.User === u)
    return {
      name: u.split(" ")[0],
      fullName: u,
      count: deals.length,
      value: deals.reduce((s, d) => s + (d._val ?? 0), 0),
      avgPush: deals.length > 0 ? deals.reduce((s, d) => s + (d._push ?? 0), 0) / deals.length : 0,
      highRisk: deals.filter(d => riskScore(d) >= 3).length,
    }
  }).filter(a => a.count > 0), [slipped])

  // Push frequency chart data
  const pushChartData = [
    { label: "1 Push", count: push1, color: "#22c55e" },
    { label: "2 Pushes", count: push2, color: "#f59e0b" },
    { label: "3+ Pushes", count: push3, color: "#ef4444" },
  ]

  function exportCSV() {
    const headers = ["AD", "Opportunity Name", "Account", "Split ABC", "Close Date", "Stage", "Commit", "Push Count", "Days in Stage", "Risk"]
    const rows = slipped.map(d => [
      d.User ?? "", d["Opportunity Name"] ?? "", d["Account Name"] ?? "",
      d._val ?? 0, d["Close Date"] ?? "", d.Stage ?? "", d._commit ?? "",
      d._push ?? 0, d._stageDur ?? 0,
      riskScore(d) >= 3 ? "High" : riskScore(d) === 2 ? "Medium" : "Low",
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "slipped_deals.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  function SortHdr({ col, label, right }: { col: SortCol; label: string; right?: boolean }) {
    const active = sortCol === col
    return (
      <TableHead className={`cursor-pointer select-none hover:text-foreground ${right ? "text-right" : ""}`} onClick={() => toggleSort(col)}>
        {label}{active ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
      </TableHead>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Slipped Deals</p>
                <p className="text-2xl font-bold">{slipped.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmt(totalValue)} at risk</p>
              </div>
              <TrendingDown className="w-5 h-5 text-amber-500 mt-0.5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Avg Push Count</p>
                <p className="text-2xl font-bold">{avgPushes}x</p>
                <p className="text-xs text-muted-foreground mt-0.5">per slipped deal</p>
              </div>
              <RefreshCw className="w-5 h-5 text-blue-500 mt-0.5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">High Risk</p>
                <p className="text-2xl font-bold text-destructive">{highRisk}</p>
                <p className="text-xs text-muted-foreground mt-0.5">3+ pushes or long stage</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Commit Slipped</p>
                <p className="text-2xl font-bold text-amber-500">{commitSlipped.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmt(commitValue)} committed value</p>
              </div>
              <DollarSign className="w-5 h-5 text-amber-500 mt-0.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Push Frequency */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Push Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={pushChartData} barCategoryGap="40%">
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v} deals`, ""]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {pushChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By AD */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Slipped Deals by AD</CardTitle>
          </CardHeader>
          <CardContent>
            {byAD.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No slipped deals</p>
            ) : (
              <div className="space-y-2">
                {byAD.sort((a, b) => b.value - a.value).map(ad => (
                  <div key={ad.fullName} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-20 shrink-0">{ad.name}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-amber-500 transition-all"
                        style={{ width: `${Math.min(100, (ad.value / (totalValue || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums font-bold w-20 text-right">{fmt(ad.value)}</span>
                    <span className="text-xs text-muted-foreground w-16 text-right">{ad.count} deal{ad.count !== 1 ? "s" : ""}</span>
                    {ad.highRisk > 0 && (
                      <span className="text-[10px] text-destructive font-semibold">{ad.highRisk} 🔴</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Deal Table ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">
              Slipped Deal Register
              <span className="text-xs font-normal text-muted-foreground ml-2">{slipped.length} deals · {fmt(totalValue)}</span>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* AD filter */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">AD</span>
                <select value={adFilter} onChange={e => setAdFilter(e.target.value)} className="h-6 text-xs rounded border border-border bg-background px-1.5">
                  <option value="All">All</option>
                  {USERS.map(u => <option key={u} value={u}>{u.split(" ")[0]}</option>)}
                </select>
              </div>
              {/* Commit filter */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Commit</span>
                <select value={commitFilter} onChange={e => setCommitFilter(e.target.value)} className="h-6 text-xs rounded border border-border bg-background px-1.5">
                  {["All", "Commit", "Upside", "Pipeline"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              {/* Push filter */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Pushes</span>
                <select value={pushFilter} onChange={e => setPushFilter(e.target.value)} className="h-6 text-xs rounded border border-border bg-background px-1.5">
                  {["All", "1", "2", "3+"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <button onClick={exportCSV} className="flex items-center gap-1 h-6 px-2 text-xs rounded border border-border bg-background hover:bg-muted transition-colors">
                <Download className="w-3 h-3" /> Export
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {slipped.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12">
              🎉 No slipped deals — all pipeline deals are on track
            </p>
          ) : (
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHdr col="ad" label="AD" />
                    <SortHdr col="opp" label="Opportunity" />
                    <TableHead>Account</TableHead>
                    <SortHdr col="val" label="Split ABC" right />
                    <SortHdr col="close" label="Close Date" />
                    <SortHdr col="commit" label="Commit" />
                    <SortHdr col="push" label="Pushes" right />
                    <SortHdr col="stage" label="Days in Stage" right />
                    <SortHdr col="risk" label="Risk" />
                    <TableHead>Next Steps</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slipped.map((d, i) => {
                    const rs = riskScore(d)
                    const pushCount = d._push ?? 0
                    return (
                      <TableRow key={i} className={rs >= 3 ? "bg-destructive/5" : rs === 2 ? "bg-amber-500/5" : ""}>
                        <TableCell className="text-xs font-medium">{(d.User ?? "").split(" ")[0]}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate font-medium">{d["Opportunity Name"] ?? ""}</TableCell>
                        <TableCell className="text-xs max-w-[140px] truncate text-muted-foreground">{d["Account Name"] ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs font-bold tabular-nums">{fmt(d._val ?? 0)}</TableCell>
                        <TableCell className="text-xs">{d["Close Date"] ?? "—"}</TableCell>
                        <TableCell><CommitBadge commit={d._commit ?? ""} /></TableCell>
                        <TableCell className="text-right">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                            pushCount >= 3 ? "bg-destructive/20 text-destructive" :
                            pushCount === 2 ? "bg-amber-500/20 text-amber-500" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {pushCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {(d._stageDur ?? 0) > 0 ? (
                            <span className={(d._stageDur ?? 0) > 60 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                              {d._stageDur}d
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell><RagBadge score={rs} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                          {(d["Next Step"] ?? "—").replace(/^⚡ NSF \| ?/, "").substring(0, 60)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/60 font-semibold">
                    <TableCell colSpan={3} className="text-xs">Total — {slipped.length} deal{slipped.length !== 1 ? "s" : ""}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{fmt(totalValue)}</TableCell>
                    <TableCell colSpan={6} />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
