/**
 * ARR Exemptions — standalone tab
 * Shows exempt deals and Not Elevate accounts
 */

import { useMemo } from "react"
import { AlertCircle, CheckCircle2, Download, TrendingUp } from "lucide-react"
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

const ELEVATE_ADS = ["Chevonne Souness", "Dan Turner", "David Whyte", "James Roberts", "Samantha Backhouse"]

export function ARRExemptTab() {
  const { arrExemptLog, arrImportDate } = useDashboardStore()

  const loaded = arrExemptLog.length > 0

  const exempt = useMemo(() => arrExemptLog.filter((d) => !d.isNotElevate), [arrExemptLog])
  const notElevate = useMemo(() => arrExemptLog.filter((d) => d.isNotElevate), [arrExemptLog])

  const exemptTotal = useMemo(() => exempt.reduce((s, d) => s + d.totalAbc, 0), [exempt])
  const notElevateTotal = useMemo(() => notElevate.reduce((s, d) => s + d.totalAbc, 0), [notElevate])

  function exportAll() {
    const rows = arrExemptLog.map((d) => [
      d.closeDate, d.accountName, d.opportunityName,
      d.totalAbc.toFixed(2), d.exemptReason ?? "",
      d.isNotElevate ? "Yes" : "No", d.opportunityId,
    ])
    downloadCSV("ARR_Exemptions.csv", [
      ["Close Date","Account","Opportunity","Total ABC","Reason","Not Elevate","Opp ID"],
      ...rows,
    ])
  }

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <CheckCircle2 className="w-12 h-12 text-green-500/40" />
        <div>
          <p className="font-semibold text-lg">No exemptions found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Import your combined Salesforce report to see ARR exemptions
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button size="sm" variant="outline" onClick={exportAll}>
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export All
        </Button>
      </div>


      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Exemptions</p>
          <p className="text-2xl font-bold text-amber-500">{arrExemptLog.length}</p>
          <p className="text-xs text-muted-foreground mt-1">deals excluded from ARR</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">ARR Exempt Value</p>
          <p className="text-2xl font-bold">{fmt(exemptTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">{exempt.length} deals (GDK etc.)</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Not Elevate Value</p>
          <p className="text-2xl font-bold text-muted-foreground">{fmt(notElevateTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">{notElevate.length} deals · OI only</p>
        </div>
      </div>

      {/* ARR Exempt section */}
      {exempt.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-sm">ARR Exempt — {exempt.length} deals</span>
              <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px]">
                {fmt(exemptTotal)} excluded
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px]"
              onClick={() => {
                const rows = exempt.map((d) => [
                  d.closeDate, d.accountName, d.opportunityName,
                  d.totalAbc.toFixed(2), d.exemptReason, d.opportunityId,
                ])
                downloadCSV("ARR_Exempt_GDK.csv", [
                  ["Close Date","Account","Opportunity","Total ABC","Reason","Opp ID"],
                  ...rows,
                ])
              }}
            >
              <Download className="w-3 h-3 mr-1" /> CSV
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Close Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead className="text-right">Total ABC</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="font-mono text-[10px]">Opp ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exempt.sort((a, b) => b.totalAbc - a.totalAbc).map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs text-muted-foreground">{d.closeDate}</TableCell>
                  <TableCell className="text-xs font-medium">{d.accountName}</TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate" title={d.opportunityName}>
                    {d.opportunityName}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-xs">{fmt(d.totalAbc)}</TableCell>
                  <TableCell className="text-xs text-amber-600">{d.exemptReason}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{d.opportunityId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Not Elevate section */}
      {notElevate.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Not Elevate — {notElevate.length} deals</span>
              <Badge variant="secondary" className="text-[10px]">
                {fmt(notElevateTotal)} · excluded from ARR
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px]"
              onClick={() => {
                const rows = notElevate.map((d) => [
                  d.closeDate, d.accountName, d.opportunityName,
                  d.totalAbc.toFixed(2), d.user, d.opportunityId,
                ])
                downloadCSV("ARR_Not_Elevate.csv", [
                  ["Close Date","Account","Opportunity","Total ABC","User","Opp ID"],
                  ...rows,
                ])
              }}
            >
              <Download className="w-3 h-3 mr-1" /> CSV
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Close Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead className="text-right">Total ABC</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Counts as OI?</TableHead>
                <TableHead className="font-mono text-[10px]">Opp ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notElevate.sort((a, b) => b.totalAbc - a.totalAbc).map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs text-muted-foreground">{d.closeDate}</TableCell>
                  <TableCell className="text-xs font-medium">{d.accountName}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={d.opportunityName}>
                    {d.opportunityName}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-xs">{fmt(d.totalAbc)}</TableCell>
                  <TableCell className="text-xs">{d.user}</TableCell>
                  <TableCell className="text-xs">
                    {d.accountTeam.some((t) => ELEVATE_ADS.includes(t)) ? (
                      <span className="text-green-600 font-medium">Yes (OI only)</span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{d.opportunityId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
