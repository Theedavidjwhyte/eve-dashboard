/**
 * ARR Duplication Log — standalone tab
 * Shows deduplicated rows removed during import
 */

import { CheckCircle2, Download, AlertCircle, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDashboardStore } from "@/store/dashboardStore"
import { fmt } from "@/lib/formatters"
import { downloadCSV as _downloadCSVRaw } from "@/lib/exportHelpers"


function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n")
  _downloadCSVRaw(filename, csv)
}

export function ARRDupesTab() {
  const { arrDupLog } = useDashboardStore()

  const totalRowsRemoved = arrDupLog.reduce((s, d) => s + d.rowCount - 1, 0)
  const totalInflation = arrDupLog.reduce((s, d) => s + d.totalAbc * (d.rowCount - 1), 0)

  function exportDupes() {
    const rows = arrDupLog.map((d) => [
      d.opportunityId, d.opportunityName, d.accountName,
      d.rowCount.toString(), fmt(d.totalAbc),
      fmt(d.totalAbc * (d.rowCount - 1)),
    ])
    downloadCSV("ARR_Duplications.csv", [
      ["Opp ID", "Opportunity", "Account", "Raw Rows", "Total ABC", "Inflation Saved"],
      ...rows,
    ])
  }

  if (arrDupLog.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 rounded-lg border bg-card">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
          <div>
            <p className="font-semibold text-lg text-green-600">No duplicates detected</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your import was clean — all opportunity IDs were unique
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={exportDupes}>
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Duplicate Opportunities</p>
          <p className="text-2xl font-bold text-amber-500">{arrDupLog.length}</p>
          <p className="text-xs text-muted-foreground mt-1">unique opps with multiple rows</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Rows Removed</p>
          <p className="text-2xl font-bold">{totalRowsRemoved}</p>
          <p className="text-xs text-muted-foreground mt-1">extra rows deduplicated</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Inflation Prevented</p>
          <p className="text-2xl font-bold text-green-600">{fmt(totalInflation)}</p>
          <p className="text-xs text-muted-foreground mt-1">would have been double-counted</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          Salesforce reports include one row per Account Team member. E.V.E deduplicates by Opportunity ID —
          only the first row is retained for ARR calculations. The table below shows every opportunity
          that appeared more than once.
        </p>
      </div>

      {/* Duplication table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b flex items-center gap-2">
          <span className="font-semibold text-sm">Deduplicated Opportunities</span>
          <Badge variant="outline" className="text-[10px]">{arrDupLog.length} entries</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opportunity</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Total ABC</TableHead>
              <TableHead className="text-right">Raw Rows</TableHead>
              <TableHead className="text-right">Rows Removed</TableHead>
              <TableHead className="text-right">Inflation Saved</TableHead>
              <TableHead className="font-mono text-[10px]">Opp ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {arrDupLog
              .slice()
              .sort((a, b) => (b.rowCount - 1) - (a.rowCount - 1))
              .map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs max-w-[200px] truncate font-medium" title={d.opportunityName}>
                    {d.opportunityName}
                  </TableCell>
                  <TableCell className="text-xs">{d.accountName}</TableCell>
                  <TableCell className="text-right font-semibold text-xs">{fmt(d.totalAbc)}</TableCell>
                  <TableCell className="text-right text-xs">{d.rowCount}</TableCell>
                  <TableCell className="text-right text-xs text-amber-600 font-semibold">
                    {d.rowCount - 1}
                  </TableCell>
                  <TableCell className="text-right text-xs text-green-600 font-semibold">
                    {fmt(d.totalAbc * (d.rowCount - 1))}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{d.opportunityId}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <div className="px-4 py-3 bg-muted/20 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Total rows removed: <strong className="text-foreground">{totalRowsRemoved}</strong></span>
          <span>Total inflation prevented: <strong className="text-green-600">{fmt(totalInflation)}</strong></span>
        </div>
      </div>
    </div>
  )
}
