/**
 * ARR Tab — Account Recurring Revenue Performance
 *
 * Shows:
 * 1. KPI summary — total ARR, targets, attainment
 * 2. AD breakdown — ARR by AD vs target, monthly
 * 3. Account performance — baseline ARR, 22% target, monthly actuals
 * 4. Exemptions — GDK exempt + Not Elevate deals
 * 5. Duplication log — deduplicated rows removed
 */

import { useMemo, useState, useEffect, useRef } from "react"
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Download, TrendingUp } from "lucide-react"
import { KPI } from "@/components/ui/kpi"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ADCell } from "@/components/shared/ADAvatar"
import { useDashboardStore } from "@/store/dashboardStore"
import { USERS } from "@/config/users"
import { MONTHS } from "@/config/months"
import { fmt, fmtPct } from "@/lib/formatters"
import { downloadCSV as _downloadCSVRaw } from "@/lib/exportHelpers"

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n")
  _downloadCSVRaw(filename, csv)
}
import { openDealModal } from "@/lib/modalBus"
import type { ARRDeal } from "@/lib/arrImport"

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMonthKey(closeDate: string): string {
  if (!closeDate) return ""
  const [y, m] = closeDate.split("-")
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return months[parseInt(m, 10) - 1] ?? ""
}

function sumARR(deals: ARRDeal[]): number {
  return deals.reduce((s, d) => s + d.totalAbc, 0)
}

// Traffic light colour
function attainmentColor(pct: number): string {
  if (pct >= 100) return "text-green-500"
  if (pct >= 70) return "text-amber-500"
  return "text-red-500"
}

// ── Collapsible section ───────────────────────────────────────────────────────

function Collapsible({
  id, title, badge, badgeVariant = "secondary", action, children, defaultOpen = false,
}: {
  id?: string
  title: string
  badge?: string
  badgeVariant?: "secondary" | "destructive" | "outline"
  action?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div id={id} className="border rounded-lg overflow-hidden scroll-mt-4">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{title}</span>
          {badge && <Badge variant={badgeVariant} className="text-[10px]">{badge}</Badge>}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {action}
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ARRTab({ scrollTo }: { scrollTo?: string | null }) {
  const { arrDeals, arrDupLog, arrExemptLog, arrImportDate, oiTargets, arrBaseData } = useDashboardStore()
  const [expandedAD, setExpandedAD] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to section when navigated from sidebar
  useEffect(() => {
    if (!scrollTo) return
    const idMap: Record<string, string> = {
      monthly: "arr-section-monthly",
      exempt:  "arr-section-exempt",
      dupes:   "arr-section-dupes",
    }
    const targetId = idMap[scrollTo]
    if (!targetId) return
    // Small delay to allow render
    const t = setTimeout(() => {
      const el = document.getElementById(targetId)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
    return () => clearTimeout(t)
  }, [scrollTo])

  const loaded = arrDeals.length > 0
  const hasZeroValues = loaded && arrDeals.filter(d => !d.isExempt).every(d => d.totalAbc === 0)

  // ── ARR targets: sum base × uplift from arrBaseData per AD ───────────────
  const arrTargetByAD = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const row of arrBaseData) {
      totals[row.ad] = (totals[row.ad] ?? 0) + row.base * row.uplift
    }
    return totals
  }, [arrBaseData])

  // ── Group deals by AD ──────────────────────────────────────────────────────
  const dealsByAD = useMemo(() => {
    const map: Record<string, ARRDeal[]> = {}
    for (const u of USERS) map[u] = []
    for (const d of arrDeals) {
      if (!d.isExempt && USERS.includes(d.assignedAD)) {
        if (!map[d.assignedAD]) map[d.assignedAD] = []
        map[d.assignedAD].push(d)
      }
    }
    return map
  }, [arrDeals])

  // ── Group deals by month ───────────────────────────────────────────────────
  const dealsByMonth = useMemo(() => {
    const map: Record<string, ARRDeal[]> = {}
    for (const d of arrDeals) {
      if (d.isExempt) continue
      const m = getMonthKey(d.closeDate)
      if (!m) continue
      if (!map[m]) map[m] = []
      map[m].push(d)
    }
    return map
  }, [arrDeals])

  // ── Overall totals ─────────────────────────────────────────────────────────
  const totalARR = useMemo(() => sumARR(arrDeals.filter((d) => !d.isExempt)), [arrDeals])
  const totalTarget = useMemo(() => Object.values(arrTargetByAD).reduce((s, v) => s + v, 0), [arrTargetByAD])
  const overallPct = totalTarget > 0 ? (totalARR / totalTarget) * 100 : 0

  // ── Account performance from arrBaseData ───────────────────────────────────
  const accountPerf = useMemo(() => {
    return arrBaseData.map((row) => {
      const target = row.base * row.uplift
      const actual = sumARR(
        arrDeals.filter((d) => !d.isExempt && (
          d.accountName.toLowerCase().includes(row.a.toLowerCase()) ||
          d.ultimateParent.toLowerCase().includes(row.p.toLowerCase())
        ))
      )
      const pct = target > 0 ? (actual / target) * 100 : 0
      // Monthly breakdown
      const monthly: Record<string, number> = {}
      for (const m of MONTHS) monthly[m] = 0
      for (const d of arrDeals) {
        if (d.isExempt) continue
        const match =
          d.accountName.toLowerCase().includes(row.a.toLowerCase()) ||
          d.ultimateParent.toLowerCase().includes(row.p.toLowerCase())
        if (!match) continue
        const m = getMonthKey(d.closeDate)
        if (m && monthly[m] !== undefined) monthly[m] += d.totalAbc
      }
      return { ...row, target, actual, pct, monthly }
    }).sort((a, b) => b.actual - a.actual)
  }, [arrBaseData, arrDeals])

  // ── Active months (have data) ──────────────────────────────────────────────
  const activeMonths = useMemo(() => MONTHS.filter((m) => dealsByMonth[m]?.length > 0), [dealsByMonth])

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <TrendingUp className="w-12 h-12 text-muted-foreground/40" />
        <div>
          <p className="font-semibold text-lg">No ARR data loaded</p>
          <p className="text-sm text-muted-foreground mt-1">
            Import your combined Salesforce report using the <strong>Import Data</strong> button —
            Closed Won deals are automatically routed to ARR
          </p>
        </div>
      </div>
    )
  }

  if (hasZeroValues) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-lg">
          <div className="text-3xl mb-3">⚠️</div>
          <h3 className="font-semibold text-amber-800 text-lg mb-2">ARR values showing £0</h3>
          <p className="text-amber-700 text-sm mb-4">
            {arrDeals.length} deals imported but all values are £0. Your SF report may be missing the <strong>"Total ABC"</strong> column or it may be named differently.
          </p>
          <div className="bg-white rounded-lg p-3 text-left text-xs text-amber-800 border border-amber-200 mb-3">
            <p className="font-semibold mb-1">Check your SF report includes:</p>
            <p>✅ Total ABC &nbsp;·&nbsp; ✅ Close Date &nbsp;·&nbsp; ✅ Stage</p>
            <p className="mt-1 text-amber-600">Make sure the column is named exactly <strong>"Total ABC"</strong> — not "Total ABC Currency"</p>
          </div>
          <p className="text-xs text-amber-600">Re-import after fixing the column name</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" ref={containerRef}>

      {/* ── Import info bar ── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
        <span>
          <span className="font-semibold text-foreground">{arrDeals.length}</span> ARR deals ·{" "}
          <span className="font-semibold text-foreground">{arrDupLog.length}</span> duplicates removed ·{" "}
          <span className="font-semibold text-foreground">{arrExemptLog.length}</span> exempt
          {arrImportDate && (
            <span className="ml-2">
              · Imported {new Date(arrImportDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px]"
          onClick={() => {
            const rows = arrDeals.map((d) => [
              d.closeDate, d.assignedAD, d.accountName, d.opportunityName,
              d.product, d.totalAbc.toFixed(2), d.isSplit ? "Yes" : "No", d.user,
            ])
            downloadCSV("ARR_Deals.csv", [
              ["Close Date","AD","Account","Opportunity","Product","Total ABC","Split","User"],
              ...rows,
            ])
          }}
        >
          <Download className="w-3 h-3 mr-1" /> Export
        </Button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Total ARR Won"
          value={fmt(totalARR)}
          description={`${arrDeals.filter((d) => !d.isExempt).length} deals`}
          accent="info"
        />
        <KPI
          label="ARR Target"
          value={fmt(totalTarget)}
          description="Full portfolio target"
        />
        <KPI
          label="Attainment"
          value={fmtPct(overallPct / 100)}
          description={`${fmt(Math.max(0, totalTarget - totalARR))} remaining`}
          accent={overallPct >= 100 ? "success" : overallPct >= 70 ? "warning" : "destructive"}
        />
        <KPI
          label="Exempt / Not Elevate"
          value={String(arrExemptLog.length)}
          description={`${arrDupLog.length} dupes removed`}
          accent="warning"
        />
      </div>

      {/* ── AD Summary ── */}
      <Collapsible title="AD ARR Breakdown" defaultOpen>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Director</TableHead>
                {activeMonths.map((m) => (
                  <TableHead key={m} className="text-right text-[10px]">{m}</TableHead>
                ))}
                <TableHead className="text-right">Total ARR</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Attainment</TableHead>
                <TableHead className="text-right">Gap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {USERS.map((u) => {
                const deals = dealsByAD[u] ?? []
                const total = sumARR(deals)
                const target = arrTargetByAD[u] ?? 0
                const pct = target > 0 ? (total / target) * 100 : 0
                const gap = target - total
                return (
                  <TableRow key={u}>
                    <TableCell>
                      <button
                        className="flex items-center gap-1"
                        onClick={() => setExpandedAD(expandedAD === u ? null : u)}
                      >
                        <ADCell name={u} />
                        {expandedAD === u
                          ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        }
                      </button>
                    </TableCell>
                    {activeMonths.map((m) => {
                      const mv = sumARR((dealsByAD[u] ?? []).filter((d) => getMonthKey(d.closeDate) === m))
                      return (
                        <TableCell key={m} className="text-right text-xs">
                          {mv > 0 ? (
                            <button
                              className="text-primary hover:underline"
                              onClick={() => {
                                const mDeals = deals.filter((d) => getMonthKey(d.closeDate) === m)
                                openDealModal(`${u} — ${m} ARR`, mDeals.map((d) => ({
                                  "Opportunity Name": d.opportunityName,
                                  "Account Name": d.accountName,
                                  User: d.user,
                                  "ABC Split Value": d.totalAbc,
                                  Stage: d.stage,
                                  _val: d.totalAbc, _product: d.product,
                                  _month: getMonthKey(d.closeDate),
                                  _stageSummary: "Won",
                                } as never)))
                              }}
                            >
                              {fmt(mv)}
                            </button>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right font-semibold text-primary">{fmt(total)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{target > 0 ? fmt(target) : "—"}</TableCell>
                    <TableCell className={`text-right font-bold ${attainmentColor(pct)}`}>
                      {target > 0 ? `${pct.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className={`text-right text-xs ${gap > 0 ? "text-red-500" : "text-green-500"}`}>
                      {target > 0 ? (gap > 0 ? fmt(gap) : "✓ Covered") : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Expanded AD deal list */}
        {expandedAD && (
          <div className="mt-3 border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-muted/30 text-xs font-semibold">
              {expandedAD} — {(dealsByAD[expandedAD] ?? []).length} deals
            </div>
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Opportunity</TableHead>
                    <TableHead className="text-right">ARR Value</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Split</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dealsByAD[expandedAD] ?? []).sort((a, b) => b.totalAbc - a.totalAbc).map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{d.accountName}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{d.opportunityName}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600 text-xs">{fmt(d.totalAbc)}</TableCell>
                      <TableCell className="text-xs">{getMonthKey(d.closeDate)}</TableCell>
                      <TableCell className="text-xs">{d.product}</TableCell>
                      <TableCell className="text-xs">{d.isSplit ? <Badge variant="outline" className="text-[9px]">50/50</Badge> : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Collapsible>

      {/* ── Account Performance ── */}
      {arrBaseData.length > 0 && (
        <Collapsible title="Account ARR Performance" badge={`${arrBaseData.length} accounts`} defaultOpen>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>AD</TableHead>
                  <TableHead className="text-right">Baseline ARR</TableHead>
                  <TableHead className="text-right">22% Target</TableHead>
                  {activeMonths.map((m) => (
                    <TableHead key={m} className="text-right text-[10px]">{m}</TableHead>
                  ))}
                  <TableHead className="text-right">YTD Won</TableHead>
                  <TableHead className="text-right">Attainment</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountPerf.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-xs max-w-[160px] truncate" title={row.a}>{row.a}</TableCell>
                    <TableCell className="text-xs"><ADCell name={row.ad} /></TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{fmt(row.base)}</TableCell>
                    <TableCell className="text-right text-xs font-medium">{fmt(row.target)}</TableCell>
                    {activeMonths.map((m) => (
                      <TableCell key={m} className="text-right text-xs">
                        {(row.monthly[m] ?? 0) > 0
                          ? <span className="text-green-600">{fmt(row.monthly[m])}</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-semibold text-green-600">{fmt(row.actual)}</TableCell>
                    <TableCell className={`text-right font-bold text-xs ${attainmentColor(row.pct)}`}>
                      {row.target > 0 ? `${row.pct.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className={`text-right text-xs ${(row.target - row.actual) > 0 ? "text-red-500" : "text-green-500"}`}>
                      {row.target > 0
                        ? (row.target - row.actual) > 0
                          ? fmt(row.target - row.actual)
                          : "✓"
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* No-activity accounts */}
          {(() => {
            const noActivity = accountPerf.filter((a) => a.actual === 0 && a.base > 0)
            if (noActivity.length === 0) return null
            return (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs font-semibold text-amber-600 mb-2">
                  ⚠ No ARR Activity — {noActivity.length} accounts
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {noActivity.map((a, i) => (
                    <span key={i} className="text-[10px] bg-background border rounded px-2 py-0.5">
                      {a.a} ({a.ad.split(" ")[0]}) — {fmt(a.target)} target
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}
        </Collapsible>
      )}

      {/* ── Monthly summary ── */}
      <Collapsible
        id="arr-section-monthly"
        title="Monthly ARR Intake"
        action={
          <button
            title="Export Monthly ARR CSV"
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              const rows = MONTHS.filter((m) => (dealsByMonth[m]?.length ?? 0) > 0).map((m) => {
                const mDeals = dealsByMonth[m] ?? []
                const total = sumARR(mDeals)
                return [m, String(mDeals.length), total.toFixed(2), String(mDeals.filter((d) => d.isSplit).length), mDeals.length > 0 ? (total / mDeals.length).toFixed(2) : "0"]
              })
              downloadCSV("ARR_Monthly_Intake.csv", [["Month","Deals","ARR Won","Splits","Avg Deal"], ...rows])
            }}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Deals</TableHead>
                <TableHead className="text-right">ARR Won</TableHead>
                <TableHead className="text-right">Splits</TableHead>
                <TableHead className="text-right">Avg Deal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MONTHS.filter((m) => dealsByMonth[m]?.length > 0).map((m) => {
                const mDeals = dealsByMonth[m] ?? []
                const total = sumARR(mDeals)
                const splits = mDeals.filter((d) => d.isSplit).length
                return (
                  <TableRow key={m}>
                    <TableCell className="font-medium">{m}</TableCell>
                    <TableCell className="text-right">{mDeals.length}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{fmt(total)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{splits > 0 ? `${splits} split` : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{mDeals.length > 0 ? fmt(total / mDeals.length) : "—"}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Collapsible>

      {/* ── Exemptions ── */}
      <Collapsible
        id="arr-section-exempt"
        title="Exemptions & Not Elevate"
        badge={`${arrExemptLog.length} deals`}
        badgeVariant={arrExemptLog.length > 0 ? "destructive" : "secondary"}
        action={
          <button
            title="Export Exemptions CSV"
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              const rows = arrExemptLog.map((d) => [
                d.closeDate, d.accountName, d.opportunityName, d.totalAbc.toFixed(2),
                d.exemptReason, d.isNotElevate ? "Yes" : "No", d.opportunityId,
              ])
              downloadCSV("ARR_Exemptions.csv", [["Close Date","Account","Opportunity","Total ABC","Reason","Not Elevate","Opp ID"], ...rows])
            }}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="space-y-4">
          {/* ARR Exempt (GDK etc.) */}
          {(() => {
            const exempt = arrExemptLog.filter((d) => !d.isNotElevate)
            if (exempt.length === 0) return null
            return (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold">ARR Exempt — {exempt.length} deals</span>
                  <span className="text-xs text-muted-foreground">{fmt(exempt.reduce((s, d) => s + d.totalAbc, 0))} total value</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Opportunity</TableHead>
                        <TableHead className="text-right">Total ABC</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Opp ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exempt.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{d.accountName}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{d.opportunityName}</TableCell>
                          <TableCell className="text-right font-semibold text-xs">{fmt(d.totalAbc)}</TableCell>
                          <TableCell className="text-xs text-amber-600">{d.exemptReason}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{d.opportunityId}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )
          })()}

          {/* Not Elevate */}
          {(() => {
            const notElv = arrExemptLog.filter((d) => d.isNotElevate)
            if (notElv.length === 0) return null
            return (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Not Elevate — {notElv.length} deals</span>
                  <span className="text-xs text-muted-foreground">{fmt(notElv.reduce((s, d) => s + d.totalAbc, 0))} · excluded from ARR targets</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Opportunity</TableHead>
                        <TableHead className="text-right">Total ABC</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Counts as OI?</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notElv.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{d.accountName}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{d.opportunityName}</TableCell>
                          <TableCell className="text-right font-semibold text-xs">{fmt(d.totalAbc)}</TableCell>
                          <TableCell className="text-xs">{d.user}</TableCell>
                          <TableCell className="text-xs">
                            {d.accountTeam.some((t) => ["Chevonne Souness","Dan Turner","David Whyte","James Roberts","Samantha Backhouse"].includes(t))
                              ? <span className="text-green-600 font-medium">Yes (OI only)</span>
                              : <span className="text-muted-foreground">No</span>
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )
          })()}
        </div>
      </Collapsible>

      {/* ── Duplication log ── */}
      <Collapsible
        id="arr-section-dupes"
        title="Deduplication Log"
        badge={`${arrDupLog.length} removed`}
        badgeVariant={arrDupLog.length > 0 ? "outline" : "secondary"}
        action={
          arrDupLog.length > 0 ? (
            <button
              title="Export Duplication Log CSV"
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                const rows = arrDupLog.map((d) => [
                  d.opportunityName, d.accountName, d.totalAbc.toFixed(2),
                  String(d.rowCount), String(d.rowCount - 1), d.opportunityId,
                ])
                downloadCSV("ARR_Duplication_Log.csv", [["Opportunity","Account","Total ABC","Raw Rows","Rows Removed","Opp ID"], ...rows])
              }}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          ) : undefined
        }
      >
        {arrDupLog.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            No duplicate rows detected in this import
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              These opportunities appeared multiple times in the report (one row per Account Team member).
              Only the first row was kept for ARR calculations.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opportunity</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Total ABC</TableHead>
                    <TableHead className="text-right">Raw Rows</TableHead>
                    <TableHead className="text-right">Rows Removed</TableHead>
                    <TableHead>Opp ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrDupLog.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs max-w-[200px] truncate">{d.opportunityName}</TableCell>
                      <TableCell className="text-xs">{d.accountName}</TableCell>
                      <TableCell className="text-right font-semibold text-xs">{fmt(d.totalAbc)}</TableCell>
                      <TableCell className="text-right text-xs">{d.rowCount}</TableCell>
                      <TableCell className="text-right text-xs text-amber-600">{d.rowCount - 1}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{d.opportunityId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Total rows removed: {arrDupLog.reduce((s, d) => s + d.rowCount - 1, 0)} ·
              Total inflation prevented: {fmt(arrDupLog.reduce((s, d) => s + d.totalAbc * (d.rowCount - 1), 0))}
            </div>
          </>
        )}
      </Collapsible>

      {/* ── Export ── */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const rows = accountPerf.map((a) => [
              a.a, a.ad, a.base.toFixed(2), a.target.toFixed(2),
              ...activeMonths.map((m) => (a.monthly[m] ?? 0).toFixed(2)),
              a.actual.toFixed(2), `${a.pct.toFixed(1)}%`, (a.target - a.actual).toFixed(2),
            ])
            downloadCSV("ARR_Account_Performance.csv", [
              ["Account","AD","Baseline ARR","22% Target",...activeMonths,"YTD Won","Attainment","Remaining"],
              ...rows,
            ])
          }}
        >
          <Download className="w-3 h-3 mr-1" /> Account Performance CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const rows = arrExemptLog.map((d) => [
              d.closeDate, d.accountName, d.opportunityName, d.totalAbc.toFixed(2),
              d.exemptReason, d.isNotElevate ? "Yes" : "No", d.opportunityId,
            ])
            downloadCSV("ARR_Exemptions.csv", [
              ["Close Date","Account","Opportunity","Total ABC","Reason","Not Elevate","Opp ID"],
              ...rows,
            ])
          }}
        >
          <Download className="w-3 h-3 mr-1" /> Exemptions CSV
        </Button>
      </div>

    </div>
  )
}
