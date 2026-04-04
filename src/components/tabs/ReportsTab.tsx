import { useRef, useState } from "react"
import Papa from "papaparse"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useDashboardStore } from "@/store/dashboardStore"
import { getADBudget } from "@/lib/budgetHelpers"
import { fmt, fmtPct } from "@/lib/formatters"
import { USERS, BUDGET_AD_KEYS, BUDGET_AD_MAP } from "@/config/users"
import { MONTHS, QUARTERS } from "@/config/months"
import { downloadCSV, dealsToCSV } from "@/lib/exportHelpers"
import { exportPPTX } from "@/lib/exportPPTX"
import {
  BarChart2, FileText, Download, Presentation, Table2, Users, TrendingUp, Map,
  Upload, Package, BookOpen, AlertTriangle, Star, Wrench, CheckCircle2, RefreshCw,
} from "lucide-react"

// ── helpers ──────────────────────────────────────────────────────────────────
interface ExportCardProps {
  icon: React.ReactNode
  label: string
  desc: string
  onClick: () => void
  badge?: string
}
function ExportCard({ icon, label, desc, onClick, badge }: ExportCardProps) {
  return (
    <div
      className="flex items-center gap-3 p-4 bg-card border rounded-xl cursor-pointer hover:-translate-y-0.5 transition-transform hover:border-primary"
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm">{label}</div>
          {badge && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{badge}</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  )
}

interface ImportExportPairProps {
  icon: React.ReactNode
  label: string
  desc: string
  exportFn: () => void
  importFn: (file: File) => void
  accept?: string
}
function ImportExportPair({ icon, label, desc, exportFn, importFn, accept = ".csv" }: ImportExportPairProps) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-3 p-4 bg-card border rounded-xl">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={exportFn}>
          <Download className="w-3 h-3" /> Export
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => ref.current?.click()}>
          <Upload className="w-3 h-3" /> Import
        </Button>
        <input
          ref={ref} type="file" accept={accept} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { importFn(f); e.target.value = "" } }}
        />
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export function ReportsTab() {
  const {
    data, oiTargets, arrTargets, notes, freeNotes, lostReviews, svcRequired,
    manualDeals, accountMatch, arrBaseData, commitNotesTS, commitCompany,
    filters, clearData, setOiTargets, setArrTargets, setNotes, setFreeNotes,
    setAccountMatch, setArrBaseData, setSvcRequired,
  } = useDashboardStore()
  const [importStatus, setImportStatus] = useState<string | null>(null)

  function flash(msg: string) {
    setImportStatus(msg)
    setTimeout(() => setImportStatus(null), 3500)
  }

  // ── DEALS ──
  function exportAllDeals() {
    downloadCSV(`FY26_All_Deals_${today()}.csv`, dealsToCSV(data))
  }

  // ── ACCOUNTS ──
  function exportAccountMatch() {
    const headers = ["Account Code","Account Name","Parent Account","Owner","ELV ID","ELV AD"]
    let csv = headers.join(",") + "\n"
    accountMatch.forEach((r) => {
      csv += `"${r.c}","${r.a.replace(/"/g,'""')}","${r.p.replace(/"/g,'""')}","${r.o}","${r.e}","${r.ea}"\n`
    })
    downloadCSV(`Account_Match_${today()}.csv`, csv)
  }
  function importAccountMatch(file: File) {
    readCSV(file, (rows) => {
      const mapped = rows.map((row: Record<string, string>) => ({
        c: row["Account Code"] ?? row["code"] ?? "",
        a: row["Account Name"] ?? row["account"] ?? "",
        p: row["Parent Account"] ?? row["parent"] ?? "",
        o: row["Owner"] ?? row["owner"] ?? "",
        e: row["ELV ID"] ?? row["elvId"] ?? "",
        ea: row["ELV AD"] ?? row["elvAD"] ?? "",
      })).filter((r) => r.a)
      setAccountMatch(mapped)
      flash(`✓ ${mapped.length} account records imported`)
    })
  }

  // ── ARR BASE ──
  function exportArrBase() {
    const headers = ["Account Director","Grandparent Account Name","ELV ID","Parent ACC","Account Name","FY25 Base ARR","ARR Uplift %"]
    let csv = headers.join(",") + "\n"
    arrBaseData.forEach((r) => {
      csv += `"${r.ad}","${r.p}","${r.e}","${r.pa}","${r.a.replace(/"/g,'""')}",${r.base.toFixed(2)},${Math.round(r.uplift * 100)}%\n`
    })
    downloadCSV(`ARR_Base_${today()}.csv`, csv)
  }
  function importArrBase(file: File) {
    readCSV(file, (rows) => {
      const mapped = rows.map((row: Record<string, string>) => ({
        ad: row["Account Director"] ?? row["ad"] ?? "",
        p: row["Grandparent Account Name"] ?? row["parent"] ?? row["p"] ?? "",
        e: row["ELV ID"] ?? row["e"] ?? "",
        pa: row["Parent ACC"] ?? row["pa"] ?? "",
        a: row["Account Name"] ?? row["a"] ?? "",
        base: parseFloat((row["FY25 Base ARR"] ?? row["base"] ?? "0").replace(/[£,]/g, "")) || 0,
        uplift: (() => { const v = parseFloat((row["ARR Uplift %"] ?? row["uplift"] ?? "22").replace("%", "")); return v > 1 ? v / 100 : v })(),
      })).filter((r) => r.a)
      setArrBaseData(mapped)
      flash(`✓ ${mapped.length} ARR base records imported`)
    })
  }

  // ── OI BUDGET ──
  function exportOiBudget() {
    let csv = '"Month"'
    BUDGET_AD_KEYS.forEach((k) => { csv += `,"${BUDGET_AD_MAP[k]}"` })
    csv += ',"Team Total"\n'
    MONTHS.forEach((m) => {
      let rowTotal = 0
      csv += `"${m}"`
      BUDGET_AD_KEYS.forEach((k) => {
        const v = oiTargets[m]?.[k] ?? 0
        rowTotal += v
        csv += `,${v.toFixed(2)}`
      })
      csv += `,${rowTotal.toFixed(2)}\n`
    })
    downloadCSV(`OI_Budget_${today()}.csv`, csv)
  }
  function importOiBudget(file: File) {
    readCSV(file, (rows) => {
      const updated = { ...oiTargets }
      rows.forEach((row: Record<string, string>) => {
        const m = (row["Month"] ?? "").trim()
        if (!MONTHS.includes(m)) return
        if (!updated[m]) updated[m] = {} as Record<string, number>
        BUDGET_AD_KEYS.forEach((k) => {
          const name = BUDGET_AD_MAP[k]
          const raw = (row[name] ?? "").replace(/[£,\s]/g, "")
          const v = parseFloat(raw)
          if (!isNaN(v)) updated[m][k] = v
        })
      })
      setOiTargets(updated)
      flash("✓ OI Budget imported")
    })
  }

  // ── ARR BUDGET ──
  function exportArrBudget() {
    let csv = '"Month"'
    BUDGET_AD_KEYS.forEach((k) => { csv += `,"${BUDGET_AD_MAP[k]}"` })
    csv += ',"Team Total"\n'
    MONTHS.forEach((m) => {
      let rowTotal = 0
      csv += `"${m}"`
      BUDGET_AD_KEYS.forEach((k) => {
        const v = arrTargets[m]?.[k] ?? 0
        rowTotal += v
        csv += `,${v.toFixed(2)}`
      })
      csv += `,${rowTotal.toFixed(2)}\n`
    })
    downloadCSV(`ARR_Budget_${today()}.csv`, csv)
  }
  function importArrBudget(file: File) {
    readCSV(file, (rows) => {
      const updated = { ...arrTargets }
      rows.forEach((row: Record<string, string>) => {
        const m = (row["Month"] ?? "").trim()
        if (!MONTHS.includes(m)) return
        if (!updated[m]) updated[m] = {} as Record<string, number>
        BUDGET_AD_KEYS.forEach((k) => {
          const name = BUDGET_AD_MAP[k]
          const raw = (row[name] ?? "").replace(/[£,\s]/g, "")
          const v = parseFloat(raw)
          if (!isNaN(v)) updated[m][k] = v
        })
      })
      setArrTargets(updated)
      flash("✓ ARR Budget imported")
    })
  }

  // ── NOTES ──
  function exportNotes() {
    let csv = '"Month","Account Director","W1","W2","W3","W4","W5","Summary Note"\n'
    MONTHS.forEach((m) => {
      const freeNote = (freeNotes[m] ?? "").replace(/"/g, '""')
      USERS.forEach((u, i) => {
        const w = (k: string) => (notes[m]?.[u]?.[k as "W1"] ?? "").replace(/"/g, '""')
        const summary = i === 0 ? freeNote : ""
        if (w("W1") || w("W2") || w("W3") || w("W4") || w("W5") || summary) {
          csv += `"${m}","${u}","${w("W1")}","${w("W2")}","${w("W3")}","${w("W4")}","${w("W5")}","${summary}"\n`
        }
      })
    })
    downloadCSV(`Forecast_Notes_${today()}.csv`, csv)
  }
  function importNotes(file: File) {
    readCSV(file, (rows) => {
      const newNotes = { ...notes }
      const newFree = { ...freeNotes }
      rows.forEach((row: Record<string, string>) => {
        const m = (row["Month"] ?? "").trim()
        const u = (row["Account Director"] ?? "").trim()
        if (!m || !u) return
        if (!newNotes[m]) newNotes[m] = {} as never
        if (!newNotes[m][u]) newNotes[m][u] = { W1: "", W2: "", W3: "", W4: "", W5: "" }
        ;(["W1","W2","W3","W4","W5"] as const).forEach((w) => {
          const val = (row[w] ?? "").trim()
          if (val) newNotes[m][u][w] = val
        })
        const summary = (row["Summary Note"] ?? "").trim()
        if (summary) newFree[m] = summary
      })
      setNotes(newNotes)
      setFreeNotes(newFree)
      flash("✓ Notes imported")
    })
  }

  // ── MANUAL DEALS ──
  function exportManualDeals() {
    if (manualDeals.length === 0) return alert("No manual deals to export.")
    downloadCSV(`Manual_Deals_${today()}.csv`, dealsToCSV(manualDeals))
  }

  // ── LOST REVIEWS ──
  function exportLostReviews() {
    const reviewed = Object.entries(lostReviews).filter(([, rev]) => rev.reason)
    if (reviewed.length === 0) return alert("No reviews to export.")
    const headers = ["Opportunity","Reason","Detail","Decision","Competitor","Next Steps","Review Date"]
    let csv = headers.join(",") + "\n"
    reviewed.forEach(([opp, rev]) => {
      csv += `"${opp.replace(/"/g,'""')}","${(rev.reason||"").replace(/"/g,'""')}","${(rev.detail||"").replace(/"/g,'""')}","${(rev.decision||"").replace(/"/g,'""')}","${(rev.competitor||"").replace(/"/g,'""')}","${(rev.nextSteps||"").replace(/"/g,'""')}","${rev.reviewDate||""}"\n`
    })
    downloadCSV(`Lost_Reviews_${today()}.csv`, csv)
  }

  // ── SVC REQUIRED ──
  function exportSvcRequired() {
    let csv = '"Opportunity Name","Required"\n'
    Object.entries(svcRequired).forEach(([opp, val]) => {
      csv += `"${opp.replace(/"/g,'""')}","${val}"\n`
    })
    downloadCSV(`Services_Required_${today()}.csv`, csv)
  }
  function importSvcRequired(file: File) {
    readCSV(file, (rows) => {
      const updated: Record<string, string> = {}
      rows.forEach((row: Record<string, string>) => {
        const opp = (row["Opportunity Name"] ?? "").trim()
        const val = (row["Required"] ?? "").trim()
        if (opp && val) updated[opp] = val
      })
      setSvcRequired(updated)
      flash(`✓ ${Object.keys(updated).length} services flags imported`)
    })
  }

  // ── AD & ACCOUNT SUMMARIES ──
  function exportAccountSummary() {
    const accounts: Record<string, { name: string; ad: string; wonVal: number; wonCount: number; pipeVal: number; pipeCount: number; lostVal: number; lostCount: number; services: number }> = {}
    data.forEach((r) => {
      const acc = r["Account Name"] ?? "Unknown"
      if (!accounts[acc]) accounts[acc] = { name: acc, ad: r.User ?? "", wonVal: 0, wonCount: 0, pipeVal: 0, pipeCount: 0, lostVal: 0, lostCount: 0, services: 0 }
      const a = accounts[acc]
      if (r._stageSummary === "Won") { a.wonVal += r._val ?? 0; a.wonCount++; a.services += r._services ?? 0 }
      else if (r._stageSummary === "Lost") { a.lostVal += r._val ?? 0; a.lostCount++ }
      else { a.pipeVal += r._val ?? 0; a.pipeCount++ }
    })
    const headers = ["Account","AD","Won Value","Won Deals","Pipeline Value","Pipeline Deals","Lost Value","Lost Deals","Services","Win Rate"]
    let csv = headers.join(",") + "\n"
    Object.values(accounts).sort((a, b) => b.wonVal + b.pipeVal - a.wonVal - a.pipeVal).forEach((a) => {
      const wr = (a.wonCount + a.lostCount) > 0 ? Math.round(a.wonCount / (a.wonCount + a.lostCount) * 100) + "%" : "N/A"
      csv += `"${a.name.replace(/"/g,'""')}","${a.ad}",${a.wonVal.toFixed(0)},${a.wonCount},${a.pipeVal.toFixed(0)},${a.pipeCount},${a.lostVal.toFixed(0)},${a.lostCount},${a.services.toFixed(0)},${wr}\n`
    })
    downloadCSV(`Account_Summary_${today()}.csv`, csv)
  }

  function exportADSummary() {
    const headers = ["AD","Won Value","Won Deals","Pipe Value","Pipe Deals","Commit Value","Lost Value","Lost Deals","Budget","% Target","Win Rate","Services"]
    let csv = headers.join(",") + "\n"
    USERS.forEach((u) => {
      const uWon = data.filter((r) => r.User === u && r._stageSummary === "Won")
      const uPipe = data.filter((r) => r.User === u && r._stageSummary === "Pipe")
      const uLost = data.filter((r) => r.User === u && r._stageSummary === "Lost")
      const wonV = uWon.reduce((s, r) => s + (r._val ?? 0), 0)
      const pipeV = uPipe.reduce((s, r) => s + (r._val ?? 0), 0)
      const commV = uPipe.filter((r) => r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0)
      const lostV = uLost.reduce((s, r) => s + (r._val ?? 0), 0)
      const svc = uWon.reduce((s, r) => s + (r._services ?? 0), 0)
      const budget = getADBudget(u, MONTHS, oiTargets)
      const pct = budget > 0 ? Math.round(wonV / budget * 100) + "%" : "N/A"
      const wr = (uWon.length + uLost.length) > 0 ? Math.round(uWon.length / (uWon.length + uLost.length) * 100) + "%" : "N/A"
      csv += `"${u}",${wonV.toFixed(0)},${uWon.length},${pipeV.toFixed(0)},${uPipe.length},${commV.toFixed(0)},${lostV.toFixed(0)},${uLost.length},${budget.toFixed(0)},${pct},${wr},${svc.toFixed(0)}\n`
    })
    downloadCSV(`AD_Summary_${today()}.csv`, csv)
  }

  function exportAttainment() {
    const periods = [
      { label: "FY26 YTD", months: MONTHS },
      { label: "Q1", months: QUARTERS.Q1 },
      { label: "Q2", months: QUARTERS.Q2 },
      { label: "Q3", months: QUARTERS.Q3 },
      { label: "Q4", months: QUARTERS.Q4 },
    ]
    const headers = ["Period","User","Budget","Won","Attainment %"]
    let csv = headers.join(",") + "\n"
    periods.forEach((p) => {
      USERS.forEach((u) => {
        const won = data.filter((r) => r._stageSummary === "Won" && r.User === u && p.months.includes(r._month ?? "")).reduce((s, r) => s + (r._val ?? 0), 0)
        const budget = getADBudget(u, p.months, oiTargets)
        const att = budget > 0 ? Math.round(won / budget * 100) + "%" : "N/A"
        csv += `"${p.label}","${u}",${budget.toFixed(0)},${won.toFixed(0)},${att}\n`
      })
      csv += "\n"
    })
    downloadCSV(`Team_Attainment_${today()}.csv`, csv)
  }

  // ── FULL BACKUP / RESTORE ──
  function exportFullBackup() {
    const backup = {
      version: 2,
      exportDate: new Date().toISOString(),
      notes,
      freeNotes,
      oiTargets,
      arrTargets,
      accountMatch,
      arrBaseData,
      svcRequired,
      manualDeals,
      commitNotesTS,
      commitCompany,
      lostReviews,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `EVE_Backup_${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  function importFullBackup(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const b = JSON.parse(e.target?.result as string)
        if (b.notes) setNotes(b.notes)
        if (b.freeNotes) setFreeNotes(b.freeNotes)
        if (b.oiTargets) setOiTargets(b.oiTargets)
        if (b.arrTargets) setArrTargets(b.arrTargets)
        if (b.accountMatch) setAccountMatch(b.accountMatch)
        if (b.arrBaseData) setArrBaseData(b.arrBaseData)
        if (b.svcRequired) setSvcRequired(b.svcRequired)
        flash("✓ Full backup restored successfully")
      } catch {
        flash("✗ Invalid backup file")
      }
    }
    reader.readAsText(file)
  }

  // ── HTML DASHBOARD EXPORT ──
  function exportHTMLDashboard() {
    const { arrDeals, arrExemptLog, arrDupLog, arrBaseData, monthlyBudget } = useDashboardStore.getState()
    const fmt = (n: number) => "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    const pct = (n: number) => (n * 100).toFixed(1) + "%"
    const today2 = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })

    // OI summary per AD
    const adOI = USERS.map((u) => {
      const won = data.filter((r) => r.User === u && r._stageSummary === "Won").reduce((s, r) => s + (r._val ?? 0), 0)
      const pipe = data.filter((r) => r.User === u && r._stageSummary === "Pipe").reduce((s, r) => s + (r._val ?? 0), 0)
      const commit = data.filter((r) => r.User === u && r._stageSummary === "Pipe" && r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0)
      const budget = getADBudget(u, MONTHS, oiTargets)
      const attainment = budget > 0 ? won / budget : 0
      const forecast = won + commit
      return { name: u.split(" ")[0], won, pipe, commit, budget, attainment, forecast }
    })
    const teamOI = {
      won: adOI.reduce((s, a) => s + a.won, 0),
      pipe: adOI.reduce((s, a) => s + a.pipe, 0),
      commit: adOI.reduce((s, a) => s + a.commit, 0),
      budget: adOI.reduce((s, a) => s + a.budget, 0),
      forecast: adOI.reduce((s, a) => s + a.forecast, 0),
    }

    // ARR summary per AD
    const arrByAD = USERS.map((u) => {
      const firstName = u.split(" ")[0]
      const deals = arrDeals.filter((d) => !d.isExempt && d.assignedAD === u)
      const won = deals.reduce((s, d) => s + d.totalAbc, 0)
      const baseRow = arrBaseData.filter((r) => r.ad === u)
      const target = baseRow.reduce((s, r) => s + r.base * r.uplift, 0)
      const attainment = target > 0 ? won / target : 0
      return { name: firstName, won, target, attainment, deals: deals.length }
    })
    const teamARR = {
      won: arrByAD.reduce((s, a) => s + a.won, 0),
      target: arrByAD.reduce((s, a) => s + a.target, 0),
      deals: arrByAD.reduce((s, a) => s + a.deals, 0),
    }

    // Monthly OI actuals
    const monthlyRows = MONTHS.map((m) => {
      const mWon = data.filter((r) => r._month === m && r._stageSummary === "Won").reduce((s, r) => s + (r._val ?? 0), 0)
      const mBudget = monthlyBudget[m] ?? 0
      return { m, mWon, mBudget }
    }).filter((r) => r.mWon > 0 || r.mBudget > 0)

    const adOIRows = adOI.map((a) => `
      <tr>
        <td>${a.name}</td>
        <td class="money">${fmt(a.won)}</td>
        <td class="money">${fmt(a.commit)}</td>
        <td class="money">${fmt(a.forecast)}</td>
        <td class="money">${fmt(a.pipe)}</td>
        <td class="money">${fmt(a.budget)}</td>
        <td class="${a.attainment >= 1 ? "green" : a.attainment >= 0.7 ? "amber" : "red"}">${pct(a.attainment)}</td>
      </tr>`).join("")

    const adARRRows = arrByAD.map((a) => `
      <tr>
        <td>${a.name}</td>
        <td>${a.deals}</td>
        <td class="money">${fmt(a.won)}</td>
        <td class="money">${fmt(a.target)}</td>
        <td class="${a.attainment >= 1 ? "green" : a.attainment >= 0.7 ? "amber" : "red"}">${pct(a.attainment)}</td>
        <td class="money ${(a.target - a.won) > 0 ? "red" : "green"}">${(a.target - a.won) > 0 ? fmt(a.target - a.won) + " gap" : "✓ Covered"}</td>
      </tr>`).join("")

    const monthlyOIRows = monthlyRows.map(({ m, mWon, mBudget }) => {
      const a = mBudget > 0 ? mWon / mBudget : 0
      return `<tr>
        <td>${m}</td>
        <td class="money">${fmt(mWon)}</td>
        <td class="money">${fmt(mBudget)}</td>
        <td class="${a >= 1 ? "green" : a >= 0.6 ? "amber" : "red"}">${mBudget > 0 ? pct(a) : "—"}</td>
      </tr>`
    }).join("")

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>E.V.E Dashboard Export — ${today2}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; color: #e2e8f0; padding: 24px; }
  h1 { font-size: 22px; font-weight: 800; color: #14b8a6; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: #64748b; margin-bottom: 28px; }
  h2 { font-size: 14px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin: 28px 0 12px; }
  .kpi-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
  .kpi { background: #1e2433; border: 1px solid #2d3748; border-radius: 10px; padding: 14px 18px; min-width: 150px; flex: 1; }
  .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .kpi-value { font-size: 22px; font-weight: 800; color: #f1f5f9; }
  .kpi-sub { font-size: 11px; color: #475569; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; background: #1e2433; border-radius: 10px; overflow: hidden; margin-bottom: 8px; }
  th { background: #161b2e; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 14px; text-align: left; border-bottom: 1px solid #2d3748; }
  td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #1a2235; }
  tr:last-child td { border-bottom: none; }
  tr.total td { background: #161b2e; font-weight: 700; border-top: 2px solid #2d3748; }
  .money { font-variant-numeric: tabular-nums; text-align: right; }
  th.money { text-align: right; }
  .green { color: #22c55e; font-weight: 600; }
  .amber { color: #f59e0b; font-weight: 600; }
  .red { color: #ef4444; font-weight: 600; }
  .bullet-section { background: #1e2433; border: 1px solid #2d3748; border-radius: 10px; padding: 18px 20px; margin-bottom: 16px; }
  .bullet-section h3 { font-size: 13px; font-weight: 700; color: #14b8a6; margin-bottom: 10px; }
  ul { list-style: none; padding: 0; }
  ul li { font-size: 13px; color: #cbd5e1; padding: 4px 0 4px 16px; position: relative; }
  ul li::before { content: "•"; position: absolute; left: 0; color: #14b8a6; }
  .footer { margin-top: 32px; font-size: 11px; color: #334155; text-align: center; }
  @media (max-width: 600px) { .kpi-row { flex-direction: column; } }
</style>
</head>
<body>
<h1>⚡ E.V.E Dashboard Export</h1>
<div class="subtitle">Generated ${today2} · Elevate Value Add Engine</div>

<!-- OI KPIs -->
<h2>OI Pipeline — Team Summary</h2>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-label">YTD Won</div><div class="kpi-value">${fmt(teamOI.won)}</div><div class="kpi-sub">${data.filter((r) => r._stageSummary === "Won").length} deals</div></div>
  <div class="kpi"><div class="kpi-label">Commit Pipe</div><div class="kpi-value">${fmt(teamOI.commit)}</div><div class="kpi-sub">In forecast</div></div>
  <div class="kpi"><div class="kpi-label">Total Forecast</div><div class="kpi-value">${fmt(teamOI.forecast)}</div><div class="kpi-sub">Won + Commit</div></div>
  <div class="kpi"><div class="kpi-label">Open Pipeline</div><div class="kpi-value">${fmt(teamOI.pipe)}</div><div class="kpi-sub">${data.filter((r) => r._stageSummary === "Pipe").length} deals</div></div>
  <div class="kpi"><div class="kpi-label">FY Budget</div><div class="kpi-value">${fmt(teamOI.budget)}</div><div class="kpi-sub">${pct(teamOI.budget > 0 ? teamOI.won / teamOI.budget : 0)} attained</div></div>
</div>

<!-- OI by AD -->
<table>
  <thead><tr><th>Account Director</th><th class="money">Won</th><th class="money">Commit Pipe</th><th class="money">Total Forecast</th><th class="money">Open Pipeline</th><th class="money">FY Budget</th><th class="money">Attainment</th></tr></thead>
  <tbody>
    ${adOIRows}
    <tr class="total">
      <td>Team</td>
      <td class="money">${fmt(teamOI.won)}</td>
      <td class="money">${fmt(teamOI.commit)}</td>
      <td class="money">${fmt(teamOI.forecast)}</td>
      <td class="money">${fmt(teamOI.pipe)}</td>
      <td class="money">${fmt(teamOI.budget)}</td>
      <td class="${teamOI.budget > 0 && teamOI.won / teamOI.budget >= 1 ? "green" : teamOI.budget > 0 && teamOI.won / teamOI.budget >= 0.7 ? "amber" : "red"}">${pct(teamOI.budget > 0 ? teamOI.won / teamOI.budget : 0)}</td>
    </tr>
  </tbody>
</table>

<!-- Monthly OI -->
<h2>Monthly OI Actuals vs Budget</h2>
<table>
  <thead><tr><th>Month</th><th class="money">Won</th><th class="money">Budget</th><th>Attainment</th></tr></thead>
  <tbody>${monthlyOIRows}</tbody>
</table>

${arrDeals.length > 0 ? `
<!-- ARR KPIs -->
<h2>ARR Performance — Team Summary</h2>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-label">Total ARR Won</div><div class="kpi-value">${fmt(teamARR.won)}</div><div class="kpi-sub">${teamARR.deals} deals</div></div>
  <div class="kpi"><div class="kpi-label">ARR Target</div><div class="kpi-value">${fmt(teamARR.target)}</div><div class="kpi-sub">Baseline + uplift</div></div>
  <div class="kpi"><div class="kpi-label">Attainment</div><div class="kpi-value">${pct(teamARR.target > 0 ? teamARR.won / teamARR.target : 0)}</div><div class="kpi-sub">${fmt(Math.max(0, teamARR.target - teamARR.won))} remaining</div></div>
  <div class="kpi"><div class="kpi-label">Exempt / Dupes</div><div class="kpi-value">${arrExemptLog.length} / ${arrDupLog.length}</div><div class="kpi-sub">Removed from totals</div></div>
</div>

<table>
  <thead><tr><th>Account Director</th><th>Deals</th><th class="money">ARR Won</th><th class="money">Target</th><th>Attainment</th><th class="money">Gap</th></tr></thead>
  <tbody>
    ${adARRRows}
    <tr class="total">
      <td>Team</td>
      <td>${teamARR.deals}</td>
      <td class="money">${fmt(teamARR.won)}</td>
      <td class="money">${fmt(teamARR.target)}</td>
      <td class="${teamARR.target > 0 && teamARR.won / teamARR.target >= 1 ? "green" : teamARR.target > 0 && teamARR.won / teamARR.target >= 0.7 ? "amber" : "red"}">${pct(teamARR.target > 0 ? teamARR.won / teamARR.target : 0)}</td>
      <td class="money ${(teamARR.target - teamARR.won) > 0 ? "red" : "green"}">${(teamARR.target - teamARR.won) > 0 ? fmt(teamARR.target - teamARR.won) + " gap" : "✓ Covered"}</td>
    </tr>
  </tbody>
</table>` : ""}

<!-- Bullet Summary -->
<h2>Executive Summary</h2>
<div class="bullet-section">
  <h3>OI Performance</h3>
  <ul>
    <li>Team has won <strong>${fmt(teamOI.won)}</strong> against a FY budget of <strong>${fmt(teamOI.budget)}</strong> — <strong>${pct(teamOI.budget > 0 ? teamOI.won / teamOI.budget : 0)}</strong> attainment</li>
    <li>Total forecast (Won + Commit) stands at <strong>${fmt(teamOI.forecast)}</strong></li>
    <li>Open pipeline of <strong>${fmt(teamOI.pipe)}</strong> across ${data.filter((r) => r._stageSummary === "Pipe").length} deals</li>
    ${adOI.map((a) => `<li>${a.name}: <strong>${fmt(a.won)}</strong> won (${pct(a.attainment)} of budget) · <strong>${fmt(a.commit)}</strong> commit pipe · <strong>${fmt(a.pipe)}</strong> open</li>`).join("")}
  </ul>
</div>
${arrDeals.length > 0 ? `
<div class="bullet-section">
  <h3>ARR Performance</h3>
  <ul>
    <li>Team ARR won: <strong>${fmt(teamARR.won)}</strong> against target of <strong>${fmt(teamARR.target)}</strong> — <strong>${pct(teamARR.target > 0 ? teamARR.won / teamARR.target : 0)}</strong> attainment</li>
    <li>${arrExemptLog.length} deals exempt from ARR · ${arrDupLog.length} duplicate rows removed</li>
    ${arrByAD.map((a) => `<li>${a.name}: <strong>${fmt(a.won)}</strong> ARR won (${pct(a.attainment)} of target) — ${(a.target - a.won) > 0 ? fmt(a.target - a.won) + " remaining" : "✓ target covered"}</li>`).join("")}
  </ul>
</div>` : ""}
<div class="bullet-section">
  <h3>Baseline Growth (ARR Uplift Targets)</h3>
  <ul>
    ${arrBaseData.slice(0, 15).map((r) => `<li>${r.a} (${r.ad.split(" ")[0]}): baseline <strong>${fmt(r.base)}</strong> · ${Math.round(r.uplift * 100)}% uplift target = <strong>${fmt(r.base * r.uplift)}</strong></li>`).join("")}
    ${arrBaseData.length > 15 ? `<li>…and ${arrBaseData.length - 15} more accounts</li>` : ""}
  </ul>
</div>

<div class="footer">E.V.E — Elevate Value Add Engine · Exported ${today2}</div>
</body>
</html>`

    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `EVE_Dashboard_Export_${today()}.html`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // ── PPTX ──
  async function handleExportPPTX() {
    if (data.length === 0) return alert("No data loaded.")
    const { monthlyBudget } = useDashboardStore.getState()
    try {
      const filterUser = Array.isArray(filters.user)
        ? (filters.user.length === 1 ? filters.user[0] : undefined)
        : (filters.user === "All" ? undefined : filters.user)
      await exportPPTX({ data, oiTargets, monthlyBudget, filterUser, filterProduct: filters.product })
    } catch (e) {
      alert("PPTX export failed: " + String(e))
    }
  }

  // ── data counts ──
  const reviewCount = Object.values(lostReviews).filter((r) => r.reason).length
  const manualCount = manualDeals.length
  const svcCount = Object.keys(svcRequired).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold mb-1">Reports & Exports</h2>
          <p className="text-sm text-muted-foreground">Export, import and backup all data tables used across the dashboard.</p>
        </div>
        {importStatus && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${importStatus.startsWith("✓") ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
            <CheckCircle2 className="w-4 h-4" />
            {importStatus}
          </div>
        )}
      </div>

      {/* ── REPORTS ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Presentation className="w-4 h-4 text-primary" /> Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ExportCard icon={<Presentation className="w-5 h-5" />} label="Executive PPTX" desc="Branded PowerPoint with charts & leaderboard" onClick={handleExportPPTX} />
          <ExportCard icon={<FileText className="w-5 h-5" />} label="Weekly PDF" desc="Print-formatted forecast report" onClick={() => window.print()} />
          <ExportCard icon={<TrendingUp className="w-5 h-5" />} label="Team Attainment CSV" desc="YTD + Q1–Q4 attainment by AD" onClick={exportAttainment} />
          <ExportCard
            icon={<BarChart2 className="w-5 h-5" />}
            label="HTML Dashboard Export"
            desc="Self-contained HTML with OI + ARR summary, budgets, actuals, baseline growth — paste into any dashboard"
            onClick={exportHTMLDashboard}
            badge="NEW"
          />
        </CardContent>
      </Card>

      {/* ── DEAL DATA ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Table2 className="w-4 h-4 text-primary" /> Deal Data
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ExportCard icon={<Table2 className="w-5 h-5" />} label="All Deals CSV" desc="Full Salesforce deal list with all computed fields" onClick={exportAllDeals} />
          <ExportCard icon={<Users className="w-5 h-5" />} label="AD Summary CSV" desc="Performance breakdown by Account Director" onClick={exportADSummary} />
          <ExportCard icon={<Map className="w-5 h-5" />} label="Account Summary CSV" desc="All accounts with won, pipeline and win rate" onClick={exportAccountSummary} />
          <ExportCard
            icon={<BarChart2 className="w-5 h-5" />}
            label={`Manual Deals CSV ${manualCount > 0 ? `(${manualCount})` : ""}`}
            desc="Deals added manually outside Salesforce"
            onClick={exportManualDeals}
            badge={manualCount > 0 ? String(manualCount) : undefined}
          />
        </CardContent>
      </Card>

      {/* ── REFERENCE DATA (import/export pairs) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Reference Data
            <span className="text-xs text-muted-foreground font-normal ml-1">— export to edit in Excel, re-import to update</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ImportExportPair
            icon={<Map className="w-5 h-5" />}
            label="Account Match Table"
            desc={`${accountMatch.length} accounts · ELV ID reference used for deal matching`}
            exportFn={exportAccountMatch}
            importFn={importAccountMatch}
          />
          <ImportExportPair
            icon={<TrendingUp className="w-5 h-5" />}
            label="ARR Base & Uplift"
            desc={`${arrBaseData.length} accounts · FY25 base ARR and uplift % targets`}
            exportFn={exportArrBase}
            importFn={importArrBase}
          />
          <ImportExportPair
            icon={<BarChart2 className="w-5 h-5" />}
            label="OI Budget Targets"
            desc="Monthly OI targets per Account Director — edit & re-import to update"
            exportFn={exportOiBudget}
            importFn={importOiBudget}
          />
          <ImportExportPair
            icon={<BarChart2 className="w-5 h-5" />}
            label="ARR Budget Targets"
            desc="Monthly ARR targets per Account Director"
            exportFn={exportArrBudget}
            importFn={importArrBudget}
          />
        </CardContent>
      </Card>

      {/* ── NOTES & REVIEWS ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> Notes & Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ImportExportPair
            icon={<BookOpen className="w-5 h-5" />}
            label="Weekly Commit Notes"
            desc="W1–W5 weekly notes and month summary notes per AD"
            exportFn={exportNotes}
            importFn={importNotes}
          />
          <ImportExportPair
            icon={<Wrench className="w-5 h-5" />}
            label={`Services Required Flags ${svcCount > 0 ? `(${svcCount})` : ""}`}
            desc="Deal-level Yes / No / Included services flags"
            exportFn={exportSvcRequired}
            importFn={importSvcRequired}
          />
          <div className="flex items-center gap-3 p-4 bg-card border rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm">Lost Deal Reviews</div>
                {reviewCount > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{reviewCount} completed</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">Completed loss review forms — export to CSV for analysis</div>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-shrink-0" onClick={exportLostReviews}>
              <Download className="w-3 h-3" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── FULL BACKUP ── */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" /> Full Backup / Restore
            <Badge className="text-[10px] px-1.5 py-0 ml-1">Recommended</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Complete Backup (JSON)</div>
              <div className="text-xs text-muted-foreground">
                Saves all notes, budgets, account match, ARR base, services flags, manual deals and commit intelligence in one file. Use to share the full dashboard state with a colleague or restore after clearing data.
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" className="h-7 text-xs gap-1" onClick={exportFullBackup}>
                <Download className="w-3 h-3" /> Backup
              </Button>
              <label className="inline-flex">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                  <span><Upload className="w-3 h-3" /> Restore</span>
                </Button>
                <input type="file" accept=".json" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { importFullBackup(f); e.target.value = "" } }} />
              </label>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> The backup does not include raw Salesforce deal data — re-import that via "Import Data" in the header. Everything else is saved here.
          </p>
        </CardContent>
      </Card>

      {/* ── DATA MANAGEMENT ── */}
      <Card className="border border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-destructive">Data Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Clears all Salesforce deal data from this browser. Reference data (budgets, accounts, notes) is preserved unless you also restore from a backup. Take a backup first if needed.
          </p>
          <Button
            variant="outline" size="sm"
            className="text-destructive border-destructive/50 hover:bg-destructive/10"
            onClick={() => {
              if (confirm("Clear all Salesforce deal data? Reference data and notes are kept. Are you sure?")) {
                clearData()
                window.location.reload()
              }
            }}
          >
            Clear Deal Data
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split("T")[0] }
function readCSV(file: File, cb: (rows: Record<string, string>[]) => void) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = Papa.parse<Record<string, string>>(e.target?.result as string, {
      header: true, skipEmptyLines: true,
    })
    cb(result.data)
  }
  reader.readAsText(file)
}
