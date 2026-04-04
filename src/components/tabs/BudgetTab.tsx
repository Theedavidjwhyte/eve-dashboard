import { useState, useRef } from "react"
import Papa from "papaparse"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/ui/kpi"
import { PctBar } from "@/components/shared/PctBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { useDashboardStore } from "@/store/dashboardStore"
import { getADBudget, getTeamBudgetForMonths } from "@/lib/budgetHelpers"
import { fmt, fmtPct } from "@/lib/formatters"
import { USERS, BUDGET_AD_KEYS, BUDGET_AD_MAP } from "@/config/users"
import { MONTHS } from "@/config/months"
import { openDealModal } from "@/App"
import type { BudgetTargets } from "@/types"
import { ChevronDown, ChevronUp } from "lucide-react"
import { downloadCSV } from "@/lib/exportHelpers"

function BudgetTable({
  label,
  prefix,
  targetData,
  onUpdate,
  onImport,
}: {
  label: string
  prefix: string
  targetData: BudgetTargets
  onUpdate: (month: string, adKey: string, value: number) => void
  onImport: (data: BudgetTargets) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const grandTotal = MONTHS.reduce(
    (s, m) => s + BUDGET_AD_KEYS.reduce((s2, k) => s2 + (targetData[m]?.[k] ?? 0), 0),
    0
  )
  const colTotals: Record<string, number> = {}
  BUDGET_AD_KEYS.forEach((k) => {
    colTotals[k] = MONTHS.reduce((s, m) => s + (targetData[m]?.[k] ?? 0), 0)
  })

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = Papa.parse<string[]>(ev.target?.result as string, { header: false, skipEmptyLines: true })
        const rows = parsed.data
        const header = rows[0]
        const colMap: Record<string, number> = {}
        BUDGET_AD_KEYS.forEach((k) => {
          const name = BUDGET_AD_MAP[k]
          const idx = header.findIndex((h) => h.trim().toLowerCase().includes(name.split(" ")[0].toLowerCase()))
          if (idx >= 0) colMap[k] = idx
        })
        const updated = { ...targetData }
        rows.slice(1).forEach((row) => {
          const month = (row[1] ?? "").trim()
          if (!MONTHS.includes(month)) return
          if (!updated[month]) updated[month] = {}
          BUDGET_AD_KEYS.forEach((k) => {
            if (colMap[k] !== undefined) {
              const raw = (row[colMap[k]] ?? "").toString().replace(/[£,\s]/g, "")
              const val = parseFloat(raw)
              if (!isNaN(val)) updated[month][k] = val
            }
          })
        })
        onImport(updated)
      } catch {}
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  function exportCsv() {
    let csv = `"Type","Month"`
    BUDGET_AD_KEYS.forEach((k) => (csv += `,"${BUDGET_AD_MAP[k]}"`))
    csv += `,"Team Total"\n`
    MONTHS.forEach((m) => {
      let rowTotal = 0
      csv += `"${label}","${m}"`
      BUDGET_AD_KEYS.forEach((k) => {
        const v = targetData[m]?.[k] ?? 0
        rowTotal += v
        csv += `,${v.toFixed(2)}`
      })
      csv += `,${rowTotal.toFixed(2)}\n`
    })
    downloadCSV(`${label.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`, csv)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{label} <span className="text-muted-foreground font-normal text-xs">· Team Total: {fmt(grandTotal)}</span></CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={exportCsv}>Export</Button>
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => fileRef.current?.click()}>Import</Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary totals row */}
        <div className="overflow-auto mb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Total</TableHead>
                {BUDGET_AD_KEYS.map((k) => (
                  <TableHead key={k} className="text-right text-xs">{BUDGET_AD_MAP[k].split(" ")[0]}</TableHead>
                ))}
                <TableHead className="text-right font-bold">Team</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>FY26</TableCell>
                {BUDGET_AD_KEYS.map((k) => (
                  <TableCell key={k} className="text-right text-xs">{fmt(colTotals[k] ?? 0)}</TableCell>
                ))}
                <TableCell className="text-right font-bold">{fmt(grandTotal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Expandable monthly detail */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Collapse monthly" : "Expand monthly"}
        </button>

        {expanded && (
          <div className="overflow-auto mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  {BUDGET_AD_KEYS.map((k) => (
                    <TableHead key={k} className="text-right text-xs">{BUDGET_AD_MAP[k].split(" ")[0]}</TableHead>
                  ))}
                  <TableHead className="text-right font-bold border-l">Team</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MONTHS.map((m) => {
                  let rowTotal = 0
                  return (
                    <TableRow key={m}>
                      <TableCell className="font-medium text-xs">{m}</TableCell>
                      {BUDGET_AD_KEYS.map((k) => {
                        const v = targetData[m]?.[k] ?? 0
                        rowTotal += v
                        return (
                          <TableCell key={k} className="p-1">
                            <input
                              type="text"
                              defaultValue={v > 0 ? v.toFixed(2) : "0.00"}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value.replace(/[£,\s]/g, ""))
                                if (!isNaN(val)) onUpdate(m, k, val)
                              }}
                              className="w-20 text-right text-xs bg-transparent border border-transparent rounded px-1 py-0.5 focus:outline-none focus:border-primary focus:bg-muted"
                            />
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-right text-xs font-semibold border-l">{fmt(rowTotal)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function BudgetTab() {
  const {
    data, filters, oiTargets, arrTargets, monthlyBudget,
    updateOITarget, updateARRTarget, importOITargets, importARRTargets,
    addTeamMember,
  } = useDashboardStore()

  const [newMember, setNewMember] = useState("")

  const allWon = data.filter(
    (r) =>
      r._stageSummary === "Won" &&
      (filters.user === "All" || r.User === filters.user) &&
      (filters.product === "All" || r._product === filters.product)
  )
  const allPipe = data.filter(
    (r) =>
      r._stageSummary === "Pipe" &&
      (filters.user === "All" || r.User === filters.user) &&
      (filters.product === "All" || r._product === filters.product)
  )

  const totalWon = allWon.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalOITarget = MONTHS.reduce(
    (s, m) => s + BUDGET_AD_KEYS.reduce((s2, k) => s2 + (oiTargets[m]?.[k] ?? 0), 0),
    0
  )
  const totalARRTarget = MONTHS.reduce(
    (s, m) => s + BUDGET_AD_KEYS.reduce((s2, k) => s2 + (arrTargets[m]?.[k] ?? 0), 0),
    0
  )
  const oiAttainment = totalOITarget > 0 ? totalWon / totalOITarget : 0
  const commitPipe = allPipe.filter((r) => r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0)

  const chartData = MONTHS.map((m) => ({
    month: m,
    won: allWon.filter((r) => r._month === m).reduce((s, r) => s + (r._val ?? 0), 0),
    target: BUDGET_AD_KEYS.reduce((s, k) => s + (oiTargets[m]?.[k] ?? 0), 0),
  }))

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="FY26 OI Budget" value={fmt(totalOITarget)} period="Annual order intake budget" accent="info" />
        <div className="cursor-pointer" onClick={() => openDealModal("FY26 YTD Won", allWon)}>
          <KPI label="FY26 YTD Won" value={fmt(totalWon)} period={`${allWon.length} deals closed`} accent="sap" />
        </div>
        <KPI
          label="YTD Attainment"
          value={fmtPct(oiAttainment)}
          period={`${fmt(totalWon)} of ${fmt(totalOITarget)}`}
          accent={oiAttainment >= 0.8 ? "sap" : oiAttainment >= 0.5 ? "warning" : "destructive"}
        />
        <KPI label="FY26 ARR Budget" value={fmt(totalARRTarget)} period="Annual recurring revenue budget" accent="teal" />
      </div>

      {/* OI vs Won by AD */}
      <Card>
        <CardHeader><CardTitle className="text-sm">OI Budget vs YTD Won — by Account Director</CardTitle></CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>AD</TableHead>
                <TableHead className="text-right">FY26 OI Budget</TableHead>
                <TableHead className="text-right">YTD Won</TableHead>
                <TableHead className="text-right">YTD Gap</TableHead>
                <TableHead className="min-w-[80px]">Attainment</TableHead>
                <TableHead className="text-right">Commit Pipe</TableHead>
                <TableHead className="text-right">Best Case</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {USERS.map((u) => {
                const uOI = getADBudget(u, MONTHS, oiTargets)
                const uWon = allWon.filter((r) => r.User === u).reduce((s, r) => s + (r._val ?? 0), 0)
                const uCommit = allPipe.filter((r) => r.User === u && r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0)
                const uGap = uOI - uWon
                const uAtt = uOI > 0 ? uWon / uOI : 0
                return (
                  <TableRow key={u} className="cursor-pointer"
                    onClick={() => openDealModal(`${u.split(" ")[0]} — All Deals`, [...allWon.filter((r) => r.User === u), ...allPipe.filter((r) => r.User === u)])}>
                    <TableCell className="font-medium">{u.split(" ")[0]}</TableCell>
                    <TableCell className="text-right">{fmt(uOI)}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(uWon)}</TableCell>
                    <TableCell className={`text-right font-medium ${uGap > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {uGap > 0 ? fmt(uGap) : "Covered"}
                    </TableCell>
                    <TableCell><PctBar value={uAtt} /></TableCell>
                    <TableCell className="text-right text-amber-600 dark:text-amber-400">{fmt(uCommit)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(uWon + uCommit)}</TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="font-bold border-t-2 bg-muted/50">
                <TableCell>Team</TableCell>
                <TableCell className="text-right">{fmt(totalOITarget)}</TableCell>
                <TableCell className="text-right">{fmt(totalWon)}</TableCell>
                <TableCell className={`text-right ${totalOITarget - totalWon > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {totalOITarget - totalWon > 0 ? fmt(totalOITarget - totalWon) : "Covered"}
                </TableCell>
                <TableCell><PctBar value={totalOITarget ? totalWon / totalOITarget : 0} /></TableCell>
                <TableCell className="text-right">{fmt(commitPipe)}</TableCell>
                <TableCell className="text-right">{fmt(totalWon + commitPipe)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Monthly OI — Won vs Target</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => "£" + Math.round(v / 1000) + "k"} tick={{ fontSize: 11 }} />
                <Tooltip formatter={((v: number) => fmt(v)) as any} />
                <Bar dataKey="won" name="Won" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="OI Target" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Team management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm">Team Members</CardTitle>
            <div className="flex gap-2 items-center">
              <Input
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                placeholder="New team member name..."
                className="h-7 w-52 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMember.trim()) {
                    addTeamMember(newMember.trim())
                    setNewMember("")
                  }
                }}
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  if (newMember.trim()) {
                    addTeamMember(newMember.trim())
                    setNewMember("")
                  }
                }}
              >
                + Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {USERS.map((u) => (
              <div key={u} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {u}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* OI Budget table */}
      <BudgetTable
        label="OI Budget"
        prefix="oi"
        targetData={oiTargets}
        onUpdate={updateOITarget}
        onImport={importOITargets}
      />

      {/* ARR Budget table */}
      <BudgetTable
        label="ARR Budget"
        prefix="arr"
        targetData={arrTargets}
        onUpdate={updateARRTarget}
        onImport={importARRTargets}
      />
    </div>
  )
}
