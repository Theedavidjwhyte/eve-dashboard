import { useState, useCallback } from "react"
import { useDashboardStore, getSelectedUsers, userMatchesFilter } from "@/store/dashboardStore"
import { getADBudget, getTeamBudgetForMonths } from "@/lib/budgetHelpers"
import { fmt, fmtPct } from "@/lib/formatters"
import { USERS, BUDGET_AD_MAP, BUDGET_AD_KEYS } from "@/config/users"
import { MONTHS, QUARTERS } from "@/config/months"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ADCell } from "@/components/shared/ADAvatar"
import {
  Copy, Check, FileText, Clock, ChevronDown, ChevronUp,
  Sparkles, TrendingUp, TrendingDown, Minus, Calendar,
} from "lucide-react"
import { openDealModal } from "@/App"

// ── Types ─────────────────────────────────────────────────────────────────────
interface SavedPost {
  id: string
  weekLabel: string
  month: string
  quarter: string
  generatedAt: string
  content: string
  summary: {
    commit: number
    won: number
    coverage: number
    budget: number
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad = (s: string, n: number) => s.padEnd(n, " ")
const fk = (v: number) => "£" + Math.round(v / 1000) + "k"
const fp = (v: number) => Math.round(v * 100) + "%"

function coverageEmoji(pct: number) {
  if (pct >= 1) return "✅"
  if (pct >= 0.8) return "🟡"
  return "🔴"
}

function trendArrow(current: number, previous: number | null) {
  if (previous === null) return ""
  const delta = current - previous
  if (delta > 500) return ` ↑ ${fk(delta)}`
  if (delta < -500) return ` ↓ ${fk(Math.abs(delta))}`
  return " →"
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ForecastPostTab() {
  const { data, filters, oiTargets, commitCompany, lostReviews } = useDashboardStore()
  const [commentary, setCommentary] = useState("")
  const [copied, setCopied] = useState(false)
  const [weekNum, setWeekNum] = useState(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  })
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>(() => {
    try { return JSON.parse(localStorage.getItem("eve_forecast_posts") || "[]") } catch { return [] }
  })
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<string | null>(null)
  const [quarterView, setQuarterView] = useState<"Q3" | "Q4" | "FY">("Q3")

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <FileText className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">No data loaded</p>
        <p className="text-sm">Import your Salesforce data to generate forecast posts</p>
      </div>
    )
  }

  // ── Data calculations ────────────────────────────────────────────────────────
  const now = new Date()
  const mNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const curMonthName = mNames[now.getMonth()]
  const curMonth = MONTHS.find(m => m === curMonthName) || MONTHS[MONTHS.length - 1]
  const qMap: Record<string, string> = {
    Jul:"Q1",Aug:"Q1",Sep:"Q1",Oct:"Q2",Nov:"Q2",Dec:"Q2",
    Jan:"Q3",Feb:"Q3",Mar:"Q3",Apr:"Q4",May:"Q4",Jun:"Q4"
  }
  const curQ = qMap[curMonth] || "Q3"

  // Get deals for a period
  const getDeals = (months: string[]) =>
    data.filter(r =>
      months.includes(r._month || "") &&
      userMatchesFilter(r.User, filters.user) &&
      (filters.product === "All" || r._product === filters.product)
    )

  // Current month data
  const curDeals = getDeals([curMonth])
  const curWon = curDeals.filter(r => r._stageSummary === "Won")
  const curPipe = curDeals.filter(r => r._stageSummary === "Pipe")
  const curCommitPipe = curPipe.filter(r => r._commit === "Commit")
  const curWonVal = curWon.reduce((s, r) => s + (r._val || 0), 0)
  const curCommitPipeVal = curCommitPipe.reduce((s, r) => s + (r._val || 0), 0)
  const curTotalCommit = curWonVal + curCommitPipeVal
  const curBudget = getTeamBudgetForMonths([curMonth], oiTargets)
  const curCoverage = curBudget > 0 ? curTotalCommit / curBudget : 0
  const curCommitToCompany = commitCompany[curMonth] || 0
  const curRisk = curPipe.filter(r => r._risk === "Risk")

  // Key deals
  const keyDeals = curPipe
    .filter(r => (r._abc || 0) > 30000)
    .sort((a, b) => (b._val || 0) - (a._val || 0))
    .slice(0, 5)

  // Quarter data builder
  const buildQuarterData = (q: string) => {
    const qMonths = QUARTERS[q as keyof typeof QUARTERS] || []
    const qDeals = getDeals(qMonths)
    const qWon = qDeals.filter(r => r._stageSummary === "Won")
    const qPipe = qDeals.filter(r => r._stageSummary === "Pipe")
    const qCommit = qPipe.filter(r => r._commit === "Commit")
    const qWonVal = qWon.reduce((s, r) => s + (r._val || 0), 0)
    const qCommitVal = qCommit.reduce((s, r) => s + (r._val || 0), 0)
    const qPipeVal = qPipe.reduce((s, r) => s + (r._val || 0), 0)
    const qBudget = getTeamBudgetForMonths(qMonths, oiTargets)
    const qCoverage = qBudget > 0 ? (qWonVal + qCommitVal) / qBudget : 0
    return { q, months: qMonths, won: qWonVal, commit: qCommitVal, pipe: qPipeVal, budget: qBudget, coverage: qCoverage, wonDeals: qWon.length, pipeDeals: qPipe.length }
  }

  // Next 3 quarters from current
  const allQs = ["Q1","Q2","Q3","Q4"]
  const curQIdx = allQs.indexOf(curQ)
  const next3Qs = [0, 1, 2].map(i => allQs[(curQIdx + i) % 4]).map(buildQuarterData)

  // Next 2 months data builder
  const curMonthIdx = MONTHS.indexOf(curMonth)
  const nextMonths = [1, 2].map(i => MONTHS[(curMonthIdx + i) % 12])

  const buildMonthData = (month: string) => {
    const mDeals = getDeals([month])
    const mWon = mDeals.filter(r => r._stageSummary === "Won")
    const mPipe = mDeals.filter(r => r._stageSummary === "Pipe")
    const mCommit = mPipe.filter(r => r._commit === "Commit")
    const mUpside = mPipe.filter(r => r._commit === "Upside")
    const mBestCase = mPipe // all pipe
    const mBudget = getTeamBudgetForMonths([month], oiTargets)

    const adBreakdown = USERS.map(u => {
      const uPipe = mPipe.filter(r => r.User === u)
      const uWon = mWon.filter(r => r.User === u)
      const uCommit = uPipe.filter(r => r._commit === "Commit")
      const uUpside = uPipe.filter(r => r._commit === "Upside")
      const uBestCase = uPipe
      const uBudget = getADBudget(u, [month], oiTargets)
      return {
        name: u,
        first: u.split(" ")[0],
        won: uWon.reduce((s, r) => s + (r._val || 0), 0),
        commit: uCommit.reduce((s, r) => s + (r._val || 0), 0),
        upside: uUpside.reduce((s, r) => s + (r._val || 0), 0),
        bestCase: uBestCase.reduce((s, r) => s + (r._val || 0), 0),
        budget: uBudget,
        commitDeals: uCommit.length,
        upsideDeals: uUpside.length,
        bestCaseDeals: uBestCase.length,
      }
    })

    return {
      month,
      budget: mBudget,
      won: mWon.reduce((s, r) => s + (r._val || 0), 0),
      wonDeals: mWon.length,
      commit: mCommit.reduce((s, r) => s + (r._val || 0), 0),
      commitDeals: mCommit.length,
      upside: mUpside.reduce((s, r) => s + (r._val || 0), 0),
      upsideDeals: mUpside.length,
      bestCase: mBestCase.reduce((s, r) => s + (r._val || 0), 0),
      bestCaseDeals: mBestCase.length,
      adBreakdown,
    }
  }

  const next2MonthsData = nextMonths.map(buildMonthData)

  // YTD
  const ytdWon = data.filter(r => r._stageSummary === "Won" && userMatchesFilter(r.User, filters.user))
  const ytdWonVal = ytdWon.reduce((s, r) => s + (r._val || 0), 0)
  const ytdBudget = getTeamBudgetForMonths(MONTHS, oiTargets)
  const ytdCoverage = ytdBudget > 0 ? ytdWonVal / ytdBudget : 0

  // AD breakdown
  const adRows = USERS.map(u => {
    const uDeals = curDeals.filter(r => r.User === u)
    const uWon = uDeals.filter(r => r._stageSummary === "Won")
    const uPipe = uDeals.filter(r => r._stageSummary === "Pipe")
    const uCommit = uPipe.filter(r => r._commit === "Commit")
    const uWonVal = uWon.reduce((s, r) => s + (r._val || 0), 0)
    const uCommitVal = uCommit.reduce((s, r) => s + (r._val || 0), 0)
    const uTotalCommit = uWonVal + uCommitVal
    const uBudget = getADBudget(u, [curMonth], oiTargets)
    const uCoverage = uBudget > 0 ? uTotalCommit / uBudget : 0
    const uServices = uWon.reduce((s, r) => s + (r._services || 0), 0)
    const uPipeTotal = uPipe.reduce((s, r) => s + (r._val || 0), 0)
    const uInitials = uWon.reduce((s, r) => s + (r._initials || 0), 0)
    return {
      name: u, first: u.split(" ")[0],
      won: uWonVal, commit: uCommitVal, total: uTotalCommit,
      budget: uBudget, coverage: uCoverage,
      services: uServices, pipe: uPipeTotal, initials: uInitials,
      deals: uWon.length, pipeDeals: uPipe.length,
    }
  })

  // Previous post for trend
  const prevPost = savedPosts.length > 0 ? savedPosts[savedPosts.length - 1] : null
  const prevCommit = prevPost?.summary.commit || null

  // ── Post generator ───────────────────────────────────────────────────────────
  const generatePost = useCallback(() => {
    const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    const lines: string[] = []

    const sep = "─".repeat(50)
    const thick = "═".repeat(50)

    lines.push(`📊 FY26 FORECAST REPORT — Week ${weekNum} | ${curMonth} ${now.getFullYear()}`)
    lines.push(thick)
    lines.push(`Generated: ${dateStr} by E.V.E`)
    lines.push("")

    // ── COMPANY COMMIT ──
    lines.push("💰 COMPANY COMMIT")
    lines.push(sep)
    if (curCommitToCompany > 0) {
      lines.push(`${pad("Commit to Company:", 28)} ${fmt(curCommitToCompany)}`)
    }
    lines.push(`${pad("Salesforce Commit:", 28)} ${fmt(curTotalCommit)}${trendArrow(curTotalCommit, prevCommit)}`)
    lines.push(`${pad("  ✅ Won:", 28)} ${fmt(curWonVal)} (${curWon.length} deals)`)
    lines.push(`${pad("  🔄 Commit Pipe:", 28)} ${fmt(curCommitPipeVal)} (${curCommitPipe.length} deals)`)
    lines.push(`${pad("Budget:", 28)} ${fmt(curBudget)}`)
    lines.push(`${pad("Coverage:", 28)} ${fp(curCoverage)} ${coverageEmoji(curCoverage)}`)
    if (curBudget - curTotalCommit > 0) {
      lines.push(`${pad("GAP to Budget:", 28)} ${fmt(curBudget - curTotalCommit)} ⚠️`)
    } else {
      lines.push(`${pad("GAP to Budget:", 28)} COVERED ✅`)
    }
    lines.push("")

    // ── AD BREAKDOWN ──
    lines.push(`👥 AD BREAKDOWN — ${curMonth}`)
    lines.push(sep)
    lines.push(`${pad("AD", 14)}${pad("Won", 10)}${pad("Commit", 10)}${pad("Budget", 10)}${pad("Cov%", 8)}`)
    lines.push("─".repeat(52))
    adRows.forEach(row => {
      const cov = row.budget > 0 ? fp(row.coverage) : "N/A"
      const emoji = row.coverage >= 1 ? "🟢" : row.coverage >= 0.7 ? "🟡" : "🔴"
      lines.push(`${pad(row.first, 14)}${pad(fmt(row.won), 10)}${pad(fmt(row.commit), 10)}${pad(fmt(row.budget), 10)}${pad(cov, 8)} ${emoji}`)
    })
    const teamCov = curBudget > 0 ? fp(curCoverage) : "N/A"
    lines.push("─".repeat(52))
    lines.push(`${pad("TEAM", 14)}${pad(fmt(curWonVal), 10)}${pad(fmt(curCommitPipeVal), 10)}${pad(fmt(curBudget), 10)}${pad(teamCov, 8)} ${coverageEmoji(curCoverage)}`)
    lines.push("")

    // ── OI / FORECAST / SERVICES ──
    lines.push("📦 OI · FORECAST · SERVICES BREAKDOWN")
    lines.push(sep)
    lines.push(`${pad("AD", 14)}${pad("OI Won", 12)}${pad("Forecast", 12)}${pad("Services", 12)}${pad("Initials", 12)}`)
    lines.push("─".repeat(62))
    adRows.forEach(row => {
      const forecast = row.won + row.commit
      lines.push(
        `${pad(row.first, 14)}${pad(fmt(row.won), 12)}${pad(fmt(forecast), 12)}${pad(row.services > 0 ? fmt(row.services) : "—", 12)}${pad(row.initials > 0 ? fmt(row.initials) : "—", 12)}`
      )
    })
    lines.push("─".repeat(62))
    const teamServices = adRows.reduce((s, r) => s + r.services, 0)
    const teamInitials = adRows.reduce((s, r) => s + r.initials, 0)
    const teamForecast = curTotalCommit
    lines.push(
      `${pad("TEAM", 14)}${pad(fmt(curWonVal), 12)}${pad(fmt(teamForecast), 12)}${pad(teamServices > 0 ? fmt(teamServices) : "—", 12)}${pad(teamInitials > 0 ? fmt(teamInitials) : "—", 12)}`
    )
    lines.push("")

    // ── KEY DEALS ──
    if (keyDeals.length > 0) {
      lines.push("🎯 KEY DEALS (>£30k)")
      lines.push(sep)
      keyDeals.forEach(d => {
        const ad = (d.User || "").split(" ")[0]
        const name = (d["Account Name"] || d["Opportunity Name"] || "").toString().substring(0, 35)
        const val = fk(d._val || 0)
        const status = d._commit || "Pipeline"
        lines.push(`• ${pad(ad, 12)} ${pad(name, 37)} ${pad(val, 8)} [${status}]`)
      })
      lines.push("")
    }

    // ── NEXT 3 QUARTERS ──
    lines.push("📈 NEXT 3 QUARTERS OUTLOOK")
    lines.push(sep)
    next3Qs.forEach(q => {
      const cov = q.budget > 0 ? fp(q.coverage) : "N/A"
      const emoji = q.coverage >= 1 ? "✅" : q.coverage >= 0.7 ? "🟡" : "🔴"
      lines.push(`${q.q} (${q.months.join("-")}):`)
      lines.push(`  Won: ${fmt(q.won)}  |  Commit: ${fmt(q.commit)}  |  Pipeline: ${fmt(q.pipe)}`)
      lines.push(`  Budget: ${fmt(q.budget)}  |  Coverage: ${cov} ${emoji}`)
    })
    lines.push("")

    // ── NEXT 2 MONTHS PIPELINE ──
    next2MonthsData.forEach(m => {
      lines.push(`📅 ${m.month.toUpperCase()} PIPELINE OUTLOOK`)
      lines.push(sep)
      lines.push(`Budget: ${fmt(m.budget)}`)
      lines.push("")
      lines.push(`${pad("AD", 14)}${pad("Commit", 12)}${pad("Upside", 12)}${pad("Best Case", 12)}${pad("Budget", 12)}`)
      lines.push("─".repeat(62))

      m.adBreakdown.forEach(row => {
        const hasData = row.commit > 0 || row.upside > 0 || row.bestCase > 0
        if (!hasData) {
          lines.push(`${pad(row.first, 14)}${pad("—", 12)}${pad("—", 12)}${pad("—", 12)}${pad(fmt(row.budget), 12)}`)
        } else {
          lines.push(
            `${pad(row.first, 14)}` +
            `${pad(row.commit > 0 ? fmt(row.commit) + ` (${row.commitDeals})` : "—", 12)}` +
            `${pad(row.upside > 0 ? fmt(row.upside) + ` (${row.upsideDeals})` : "—", 12)}` +
            `${pad(fmt(row.bestCase) + ` (${row.bestCaseDeals})`, 12)}` +
            `${pad(fmt(row.budget), 12)}`
          )
        }
      })

      lines.push("─".repeat(62))
      lines.push(
        `${pad("TEAM", 14)}` +
        `${pad(m.commit > 0 ? fmt(m.commit) + ` (${m.commitDeals})` : "—", 12)}` +
        `${pad(m.upside > 0 ? fmt(m.upside) + ` (${m.upsideDeals})` : "—", 12)}` +
        `${pad(fmt(m.bestCase) + ` (${m.bestCaseDeals})`, 12)}` +
        `${pad(fmt(m.budget), 12)}`
      )
      const mCoverage = m.budget > 0 ? (m.won + m.commit) / m.budget : 0
      lines.push(`Coverage (Won + Commit vs Budget): ${fp(mCoverage)} ${coverageEmoji(mCoverage)}`)
      lines.push("")
    })

    // ── YTD SUMMARY ──
    lines.push("📊 FY26 YTD SUMMARY")
    lines.push(sep)
    lines.push(`${pad("YTD Won:", 28)} ${fmt(ytdWonVal)} (${ytdWon.length} deals)`)
    lines.push(`${pad("Annual Budget:", 28)} ${fmt(ytdBudget)}`)
    lines.push(`${pad("YTD Attainment:", 28)} ${fp(ytdCoverage)} ${coverageEmoji(ytdCoverage)}`)
    lines.push(`${pad("Remaining to Budget:", 28)} ${ytdBudget > ytdWonVal ? fmt(ytdBudget - ytdWonVal) : "ACHIEVED ✅"}`)
    lines.push("")

    // ── BUDGET vs COMMIT vs ACTUAL ──
    lines.push("💡 BUDGET vs COMMIT vs ACTUAL")
    lines.push(sep)
    const budgetGap = curBudget - curTotalCommit
    const wonGap = curBudget - curWonVal
    lines.push(`Our ${curMonth} budget is ${fmt(curBudget)}.`)
    if (curWonVal > 0) {
      lines.push(`We have closed ${fmt(curWonVal)} (${fp(curBudget > 0 ? curWonVal / curBudget : 0)} actual).`)
    } else {
      lines.push(`No deals closed in ${curMonth} yet.`)
    }
    lines.push(`Our total commit (won + pipeline commit) stands at ${fmt(curTotalCommit)}.`)
    if (budgetGap <= 0) {
      lines.push(`✅ Commit exceeds budget — we are ${fmt(Math.abs(budgetGap))} above target.`)
    } else {
      lines.push(`⚠️ We need ${fmt(budgetGap)} more to cover budget — ${fp(curCoverage)} covered.`)
    }
    if (curRisk.length > 0) {
      lines.push(`⚠️ ${curRisk.length} deals at risk worth ${fmt(curRisk.reduce((s, r) => s + (r._val || 0), 0))} — needs attention.`)
    }
    lines.push("")

    // ── RISKS ──
    if (curRisk.length > 0) {
      lines.push(`⚠️ FORECAST RISKS (${curRisk.length} deals · ${fmt(curRisk.reduce((s, r) => s + (r._val || 0), 0))})`)
      lines.push(sep)
      curRisk
        .sort((a, b) => (b._val || 0) - (a._val || 0))
        .slice(0, 5)
        .forEach(d => {
          const ad = (d.User || "").split(" ")[0]
          const name = (d["Opportunity Name"] || "").toString().substring(0, 40)
          lines.push(`• ${ad} — ${name} (${fk(d._val || 0)}, ${d._push} pushes)`)
        })
      lines.push("")
    }

    // ── EXECUTIVE COMMENTARY ──
    if (commentary.trim()) {
      lines.push("💬 EXECUTIVE COMMENTARY")
      lines.push(sep)
      lines.push(commentary.trim())
      lines.push("")
    }

    lines.push(thick)
    lines.push(`E.V.E — Elevate Value Add Engine | Week ${weekNum} | ${dateStr}`)

    return lines.join("\n")
  }, [curMonth, curWon, curPipe, curCommitPipe, curWonVal, curCommitPipeVal, curTotalCommit,
      curBudget, curCoverage, curCommitToCompany, curRisk, keyDeals, adRows, next3Qs,
      next2MonthsData, ytdWonVal, ytdWon, ytdBudget, ytdCoverage, commentary, weekNum, prevCommit])

  // ── Save post ────────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    const post = generatePost()
    setGeneratedPost(post)

    const newSaved: SavedPost = {
      id: Date.now().toString(),
      weekLabel: `W${weekNum}`,
      month: curMonth,
      quarter: curQ,
      generatedAt: new Date().toISOString(),
      content: post,
      summary: {
        commit: curTotalCommit,
        won: curWonVal,
        coverage: curCoverage,
        budget: curBudget,
      },
    }

    const updated = [...savedPosts, newSaved].slice(-24) // keep last 24
    setSavedPosts(updated)
    localStorage.setItem("eve_forecast_posts", JSON.stringify(updated))
  }

  // ── Copy — writes both HTML (for Teams rich paste) and plain text ────────────
  const handleCopy = async (text: string) => {
    // Convert plain text to Teams-friendly HTML
    const htmlLines = text.split("\n").map(line => {
      // Section headers (lines with emojis at start)
      if (/^[📊💰👥📦🎯📈💡⚠️💬✅🏆🎖]/.test(line) && line.trim().length > 2) {
        return `<p style="font-weight:bold;font-size:13pt;color:#1a1a2e;margin:12px 0 4px">${line}</p>`
      }
      // Separator lines
      if (/^[═─]+$/.test(line.trim())) {
        return `<hr style="border:1px solid #ddd;margin:4px 0"/>`
      }
      // Key value lines (contain colon padding)
      if (line.includes(":") && !line.startsWith("•") && !line.startsWith("-")) {
        const parts = line.split(/\s{2,}/)
        if (parts.length >= 2) {
          return `<p style="margin:2px 0;font-family:Calibri,sans-serif;font-size:10pt"><span style="color:#555;min-width:180px;display:inline-block">${parts[0]}</span><strong>${parts.slice(1).join("  ")}</strong></p>`
        }
      }
      // Bullet points
      if (line.startsWith("•") || line.startsWith("-")) {
        return `<p style="margin:2px 8px;font-family:Calibri,sans-serif;font-size:10pt">${line}</p>`
      }
      // Empty line
      if (!line.trim()) return `<p style="margin:4px 0"></p>`
      // Normal line
      return `<p style="margin:2px 0;font-family:Calibri,sans-serif;font-size:10pt">${line}</p>`
    }).join("")

    const html = `<div style="font-family:Calibri,sans-serif;font-size:10pt;line-height:1.4">${htmlLines}</div>`

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        })
      ])
    } catch {
      // Fallback to plain text
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        const el = document.createElement("textarea")
        el.value = text
        document.body.appendChild(el)
        el.select()
        document.execCommand("copy")
        document.body.removeChild(el)
      }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayPost = selectedHistoryId
    ? savedPosts.find(p => p.id === selectedHistoryId)?.content || ""
    : generatedPost || ""

  // ── Quarter overview cards ───────────────────────────────────────────────────
  const quarterData = buildQuarterData(quarterView === "FY" ? curQ : quarterView)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Forecast Post Generator</h2>
          <p className="text-sm text-muted-foreground">
            Generate weekly Teams-ready forecast summaries — stored as rolling history
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{savedPosts.length} posts saved</span>
        </div>
      </div>

      {/* Quarter overview strip */}
      <div className="grid grid-cols-4 gap-3">
        {next3Qs.map((q, i) => (
          <Card
            key={q.q}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => openDealModal(
              `${q.q} — All Deals`,
              data.filter(r => q.months.includes(r._month || "") && userMatchesFilter(r.User, filters.user))
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {i === 0 ? "Current" : i === 1 ? "Next" : "+2"} · {q.q}
                </span>
                <span className="text-lg">{coverageEmoji(q.coverage)}</span>
              </div>
              <div className="text-xl font-bold">{fmt(q.won + q.commit)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {fmt(q.won)} won · {fmt(q.commit)} commit
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(q.coverage * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {fmtPct(q.coverage)} of {fmt(q.budget)}
              </div>
            </CardContent>
          </Card>
        ))}
        {/* YTD card */}
        <Card className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => openDealModal("YTD Won", data.filter(r => r._stageSummary === "Won" && userMatchesFilter(r.User, filters.user)))}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">FY26 YTD</span>
              <span className="text-lg">{coverageEmoji(ytdCoverage)}</span>
            </div>
            <div className="text-xl font-bold">{fmt(ytdWonVal)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{ytdWon.length} deals closed</div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(ytdCoverage * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {fmtPct(ytdCoverage)} of {fmt(ytdBudget)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next 2 months breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {next2MonthsData.map(m => {
          const mCoverage = m.budget > 0 ? (m.won + m.commit) / m.budget : 0
          return (
            <Card key={m.month}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {m.month} Pipeline Outlook
                  </span>
                  <span className="text-xs text-muted-foreground">Budget: {fmt(m.budget)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">AD</th>
                      <th className="text-right px-2 py-2 text-blue-600 font-medium">Commit</th>
                      <th className="text-right px-2 py-2 text-purple-600 font-medium">Upside</th>
                      <th className="text-right px-2 py-2 text-emerald-600 font-medium">Best Case</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium">Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.adBreakdown.map(row => (
                      <tr key={row.name} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-1.5 font-medium">{row.first}</td>
                        <td className="text-right px-2 py-1.5">
                          {row.commit > 0 ? (
                            <span className="text-blue-600 font-semibold">
                              {fmt(row.commit)}
                              <span className="text-muted-foreground font-normal ml-1">({row.commitDeals})</span>
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="text-right px-2 py-1.5">
                          {row.upside > 0 ? (
                            <span className="text-purple-600 font-semibold">
                              {fmt(row.upside)}
                              <span className="text-muted-foreground font-normal ml-1">({row.upsideDeals})</span>
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="text-right px-2 py-1.5">
                          {row.bestCase > 0 ? (
                            <span className="text-emerald-600 font-semibold">
                              {fmt(row.bestCase)}
                              <span className="text-muted-foreground font-normal ml-1">({row.bestCaseDeals})</span>
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="text-right px-3 py-1.5 text-muted-foreground">{fmt(row.budget)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/40 font-bold border-t-2">
                      <td className="px-3 py-2">TEAM</td>
                      <td className="text-right px-2 py-2 text-blue-600">
                        {m.commit > 0 ? `${fmt(m.commit)} (${m.commitDeals})` : "—"}
                      </td>
                      <td className="text-right px-2 py-2 text-purple-600">
                        {m.upside > 0 ? `${fmt(m.upside)} (${m.upsideDeals})` : "—"}
                      </td>
                      <td className="text-right px-2 py-2 text-emerald-600">
                        {fmt(m.bestCase)} ({m.bestCaseDeals})
                      </td>
                      <td className="text-right px-3 py-2">{fmt(m.budget)}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="px-3 py-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Coverage (Won + Commit vs Budget)
                  </span>
                  <span className={`font-bold ${mCoverage >= 1 ? "text-emerald-600" : mCoverage >= 0.7 ? "text-amber-600" : "text-red-600"}`}>
                    {fmtPct(mCoverage)} {coverageEmoji(mCoverage)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT — Controls */}
        <div className="space-y-4">
          {/* Post settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Post Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground w-20">Week number</label>
                <input
                  type="number"
                  value={weekNum}
                  onChange={e => setWeekNum(Number(e.target.value))}
                  min={1} max={52}
                  className="w-20 text-center px-2 py-1 rounded border bg-background text-sm font-semibold focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground">Auto-detected from today</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground w-20">Period</label>
                <span className="text-sm font-semibold">{curMonth} {now.getFullYear()} · {curQ}</span>
              </div>
            </CardContent>
          </Card>

          {/* AD snapshot */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">AD Snapshot — {curMonth}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">AD</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Won</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Commit</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Budget</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Cov</th>
                  </tr>
                </thead>
                <tbody>
                  {adRows.map(row => (
                    <tr key={row.name} className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => openDealModal(`${row.first} — ${curMonth}`,
                        curDeals.filter(r => r.User === row.name))}>
                      <td className="px-4 py-2">
                        <ADCell name={row.name} />
                      </td>
                      <td className="text-right px-3 py-2 text-emerald-600 dark:text-emerald-400 font-medium">
                        {row.won > 0 ? fmt(row.won) : "—"}
                      </td>
                      <td className="text-right px-3 py-2 text-amber-600 dark:text-amber-400 font-medium">
                        {row.commit > 0 ? fmt(row.commit) : "—"}
                      </td>
                      <td className="text-right px-3 py-2 text-muted-foreground">{fmt(row.budget)}</td>
                      <td className="text-right px-3 py-2">
                        <span className={`font-semibold ${
                          row.coverage >= 1 ? "text-emerald-600 dark:text-emerald-400" :
                          row.coverage >= 0.7 ? "text-amber-600 dark:text-amber-400" : "text-destructive"
                        }`}>
                          {row.budget > 0 ? fmtPct(row.coverage) : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/20">
                    <td className="px-4 py-2 font-bold text-xs">Team</td>
                    <td className="text-right px-3 py-2 font-bold text-emerald-600 dark:text-emerald-400">{fmt(curWonVal)}</td>
                    <td className="text-right px-3 py-2 font-bold text-amber-600 dark:text-amber-400">{fmt(curCommitPipeVal)}</td>
                    <td className="text-right px-3 py-2 font-bold">{fmt(curBudget)}</td>
                    <td className="text-right px-3 py-2">
                      <span className={`font-bold ${
                        curCoverage >= 1 ? "text-emerald-600 dark:text-emerald-400" :
                        curCoverage >= 0.7 ? "text-amber-600 dark:text-amber-400" : "text-destructive"
                      }`}>
                        {fmtPct(curCoverage)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Executive commentary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Executive Commentary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={commentary}
                onChange={e => setCommentary(e.target.value)}
                placeholder={`Add your ${curMonth} executive summary here...\n\nE.g. Strong pipeline conversion expected in final week. Chevonne to close Stonegate deal by Friday. Services attach rate improving — Dan has scoped £12k on the Fulham Shore deal.`}
                className="w-full min-h-[140px] text-sm p-3 rounded-lg border bg-background resize-y focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This appears verbatim in the generated post under "Executive Commentary"
              </p>
            </CardContent>
          </Card>

          {/* Generate button */}
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleGenerate}
          >
            <Sparkles className="w-4 h-4" />
            Generate & Save Forecast Post
          </Button>

          {/* Trend strip (if history exists) */}
          {savedPosts.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                  Commit Trend — Last {Math.min(savedPosts.length, 8)} Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1.5 h-16">
                  {savedPosts.slice(-8).map((p, i, arr) => {
                    const maxC = Math.max(...arr.map(x => x.summary.commit), 1)
                    const h = Math.max((p.summary.commit / maxC) * 52, 4)
                    const isLast = i === arr.length - 1
                    const prev = i > 0 ? arr[i - 1].summary.commit : null
                    const up = prev !== null && p.summary.commit > prev + 500
                    const down = prev !== null && p.summary.commit < prev - 500
                    return (
                      <div key={p.id} className="flex flex-col items-center gap-0.5 flex-1 cursor-pointer"
                        onClick={() => { setSelectedHistoryId(p.id); setShowHistory(true) }}>
                        {up && <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />}
                        {down && <TrendingDown className="w-2.5 h-2.5 text-destructive" />}
                        {!up && !down && prev !== null && <Minus className="w-2.5 h-2.5 text-muted-foreground" />}
                        {prev === null && <div className="w-2.5 h-2.5" />}
                        <div
                          className={`w-full rounded-sm transition-all ${isLast ? "bg-primary" : "bg-primary/40"}`}
                          style={{ height: `${h}px` }}
                          title={`${p.weekLabel} ${p.month}: ${fmt(p.summary.commit)}`}
                        />
                        <span className="text-[9px] text-muted-foreground">{p.weekLabel}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT — Post preview */}
        <div className="space-y-4">
          {displayPost ? (
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {selectedHistoryId
                      ? `Historical Post — ${savedPosts.find(p => p.id === selectedHistoryId)?.weekLabel} ${savedPosts.find(p => p.id === selectedHistoryId)?.month}`
                      : `Week ${weekNum} — ${curMonth} Forecast Post`
                    }
                  </CardTitle>
                  <div className="flex gap-2">
                    {selectedHistoryId && (
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7"
                        onClick={() => setSelectedHistoryId(null)}>
                        Back to latest
                      </Button>
                    )}
                    <Button
                      variant={copied ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5 text-xs h-7"
                      onClick={() => handleCopy(displayPost)}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy to Teams"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-xs leading-5 font-mono bg-muted/30 rounded-lg p-4 whitespace-pre-wrap overflow-auto max-h-[600px] select-all border">
                  {displayPost}
                </pre>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex flex-col items-center justify-center py-20">
              <Sparkles className="w-10 h-10 text-primary/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Click "Generate" to create your forecast post</p>
              <p className="text-xs text-muted-foreground mt-1">
                The post is ready to paste directly into Microsoft Teams
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* History panel */}
      {savedPosts.length > 0 && (
        <Card>
          <CardHeader
            className="pb-2 cursor-pointer"
            onClick={() => setShowHistory(v => !v)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Post History — {savedPosts.length} saved
              </CardTitle>
              {showHistory
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
              }
            </div>
          </CardHeader>
          {showHistory && (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {[...savedPosts].reverse().map(p => {
                  const isSelected = selectedHistoryId === p.id
                  const date = new Date(p.generatedAt).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short",
                  })
                  const time = new Date(p.generatedAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit", minute: "2-digit",
                  })
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedHistoryId(isSelected ? null : p.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-primary">{p.weekLabel}</span>
                        <span className={`text-xs ${
                          p.summary.coverage >= 1 ? "text-emerald-600 dark:text-emerald-400" :
                          p.summary.coverage >= 0.7 ? "text-amber-600 dark:text-amber-400" : "text-destructive"
                        }`}>
                          {fp(p.summary.coverage)}
                        </span>
                      </div>
                      <div className="text-xs font-medium">{p.month} {p.quarter}</div>
                      <div className="text-xs text-muted-foreground">{fmt(p.summary.commit)} commit</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{date} {time}</div>
                      <div className="flex gap-1 mt-1.5">
                        <button
                          onClick={e => { e.stopPropagation(); handleCopy(p.content) }}
                          className="text-[10px] text-primary hover:underline"
                        >
                          Copy
                        </button>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            const updated = savedPosts.filter(x => x.id !== p.id)
                            setSavedPosts(updated)
                            localStorage.setItem("eve_forecast_posts", JSON.stringify(updated))
                            if (selectedHistoryId === p.id) setSelectedHistoryId(null)
                          }}
                          className="text-[10px] text-destructive hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
