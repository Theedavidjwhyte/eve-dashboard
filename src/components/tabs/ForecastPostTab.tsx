import { useState, useCallback, useRef } from "react"
import { useDashboardStore, getSelectedUsers, userMatchesFilter } from "@/store/dashboardStore"
import { getADBudget, getTeamBudgetForMonths } from "@/lib/budgetHelpers"
import { fmt, fmtPct } from "@/lib/formatters"
import { USERS, BUDGET_AD_MAP } from "@/config/users"
import { MONTHS, QUARTERS, HALVES } from "@/config/months"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ADCell } from "@/components/shared/ADAvatar"
import {
  Copy, Check, FileText, Clock, ChevronDown, ChevronUp,
  Sparkles, TrendingUp, TrendingDown, Minus, Calendar,
  Trash2, AlertTriangle, Bot, ChevronLeft, ChevronRight,
  ArrowUpDown,
} from "lucide-react"
import { openDealModal } from "@/App"

// ── Types ─────────────────────────────────────────────────────────────────────
type ForecastPeriod = "Next" | "Q1" | "H1" | "FY26"
const PERIOD_ORDER: ForecastPeriod[] = ["Next", "Q1", "H1", "FY26"]

interface SavedPost {
  id: string
  weekLabel: string
  month: string
  quarter: string
  period: ForecastPeriod
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

/** FY26 starts 1 July 2025 = Week 1 */
function getFYWeek(): number {
  const FY_START = new Date(2025, 6, 1) // 1 Jul 2025
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - FY_START.getTime()) / 86400000)
  return Math.max(1, Math.ceil((daysDiff + 1) / 7))
}

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

/** Get months for a given ForecastPeriod */
function getMonthsForPeriod(period: ForecastPeriod, curQ: string): string[] {
  switch (period) {
    case "Next": {
      // next quarter from current
      const allQs = ["Q1", "Q2", "Q3", "Q4"]
      const idx = allQs.indexOf(curQ)
      const nextQ = allQs[(idx + 1) % 4]
      return QUARTERS[nextQ] || []
    }
    case "Q1": return QUARTERS["Q1"]
    case "H1": return HALVES["H1"]
    case "FY26": return MONTHS
    default: return []
  }
}

/** Auto-generate executive commentary from live data */
function generateCommentary(params: {
  curMonth: string
  curQ: string
  period: ForecastPeriod
  curTotalCommit: number
  curBudget: number
  curCoverage: number
  curWonVal: number
  curWon: number
  curRiskCount: number
  curRiskVal: number
  keyDealCount: number
  weekNum: number
  adRows: Array<{ first: string; coverage: number; won: number; commit: number; budget: number }>
}): string {
  const {
    curMonth, curQ, period, curTotalCommit, curBudget, curCoverage,
    curWonVal, curWon, curRiskCount, curRiskVal, keyDealCount, weekNum, adRows,
  } = params

  const coveragePct = Math.round(curCoverage * 100)
  const gap = curBudget - curTotalCommit
  const leaders = adRows.filter(r => r.coverage >= 1).map(r => r.first)
  const laggards = adRows.filter(r => r.coverage < 0.6 && r.budget > 0).map(r => r.first)

  const lines: string[] = []

  // Opening
  if (curCoverage >= 1) {
    lines.push(`${curMonth} is tracking positively with total commit of ${fmt(curTotalCommit)} against a ${fmt(curBudget)} budget — ${coveragePct}% covered and ${fmt(Math.abs(gap))} above target.`)
  } else if (curCoverage >= 0.8) {
    lines.push(`${curMonth} is in a strong position at ${coveragePct}% commit coverage (${fmt(curTotalCommit)} vs ${fmt(curBudget)} budget) with a ${fmt(gap)} gap to close by month end.`)
  } else {
    lines.push(`${curMonth} requires focused effort — commit sits at ${fmt(curTotalCommit)} (${coveragePct}% of the ${fmt(curBudget)} budget) leaving a ${fmt(gap)} gap that needs to be addressed this week.`)
  }

  // Won performance
  if (curWon > 0) {
    lines.push(`We have closed ${curWon} deal${curWon > 1 ? "s" : ""} worth ${fmt(curWonVal)} in ${curMonth} to date.`)
  }

  // AD highlights
  if (leaders.length > 0) {
    lines.push(`${leaders.join(" and ")} ${leaders.length === 1 ? "has" : "have"} exceeded budget coverage this month — strong conversion from pipeline to closed.`)
  }
  if (laggards.length > 0) {
    lines.push(`${laggards.join(" and ")} ${laggards.length === 1 ? "requires" : "require"} pipeline acceleration to meet ${curMonth} targets.`)
  }

  // Risk & key deals
  if (curRiskCount > 0) {
    lines.push(`${curRiskCount} deal${curRiskCount > 1 ? "s" : ""} totalling ${fmt(curRiskVal)} are flagged at risk — these require immediate review and re-qualification in ${curQ}.`)
  }
  if (keyDealCount > 0) {
    lines.push(`There ${keyDealCount === 1 ? "is" : "are"} ${keyDealCount} key deal${keyDealCount > 1 ? "s" : ""} over £30k in the pipeline for ${curMonth} — closing these would materially improve month-end attainment.`)
  }

  // Period context
  if (period === "FY26") {
    lines.push(`From a full-year perspective, the team remains focused on FY26 attainment and pipeline health into ${curQ} and beyond.`)
  } else if (period === "H1") {
    lines.push(`H1 pipeline discipline will be critical — ensuring commit accuracy and services attach rates remain a priority through the second half of the half-year.`)
  }

  return lines.join(" ")
}

// ── Sort types for history table ──────────────────────────────────────────────
type SortCol = "week" | "period" | "month" | "date" | "commit" | "coverage"
type SortDir = "asc" | "desc"

// ── Main component ─────────────────────────────────────────────────────────────
export function ForecastPostTab() {
  const { data, filters, oiTargets, commitCompany, lostReviews } = useDashboardStore()

  // ── State ────────────────────────────────────────────────────────────────────
  const [commentary, setCommentary] = useState("")
  const [copied, setCopied] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [weekNum, setWeekNum] = useState<number>(getFYWeek)
  const [period, setPeriod] = useState<ForecastPeriod>("Q1")
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>(() => {
    try { return JSON.parse(localStorage.getItem("eve_forecast_posts") || "[]") } catch { return [] }
  })
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<string | null>(null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState("")
  const [sortCol, setSortCol] = useState<SortCol>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <FileText className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-lg font-medium">No data loaded</p>
        <p className="text-sm">Import your Salesforce data to generate forecast posts</p>
      </div>
    )
  }

  // ── Data calculations ─────────────────────────────────────────────────────
  const now = new Date()
  const mNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const curMonthName = mNames[now.getMonth()]
  const curMonth = MONTHS.find(m => m === curMonthName) || MONTHS[MONTHS.length - 1]
  const qMap: Record<string, string> = {
    Jul:"Q1",Aug:"Q1",Sep:"Q1",Oct:"Q2",Nov:"Q2",Dec:"Q2",
    Jan:"Q3",Feb:"Q3",Mar:"Q3",Apr:"Q4",May:"Q4",Jun:"Q4"
  }
  const curQ = qMap[curMonth] || "Q1"

  const getDeals = (months: string[]) =>
    data.filter(r =>
      months.includes(r._month || "") &&
      userMatchesFilter(r.User, filters.user) &&
      (filters.product === "All" || r._product === filters.product)
    )

  // Sort months chronologically from current month
  const sortedMonthsFromNow = [...MONTHS].sort((a, b) => {
    const ai = (MONTHS.indexOf(a) - MONTHS.indexOf(curMonth) + 12) % 12
    const bi = (MONTHS.indexOf(b) - MONTHS.indexOf(curMonth) + 12) % 12
    return ai - bi
  })

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

  const keyDeals = curPipe
    .filter(r => (r._abc || 0) > 30000)
    .sort((a, b) => (b._val || 0) - (a._val || 0))
    .slice(0, 5)

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

  const allQs = ["Q1","Q2","Q3","Q4"]
  const curQIdx = allQs.indexOf(curQ)
  const next3Qs = [0, 1, 2].map(i => allQs[(curQIdx + i) % 4]).map(buildQuarterData)

  // Next 2 months sorted chronologically
  const curMonthIdx = MONTHS.indexOf(curMonth)
  const nextMonths = [1, 2].map(i => MONTHS[(curMonthIdx + i) % 12])

  const buildMonthData = (month: string) => {
    const mDeals = getDeals([month])
    const mWon = mDeals.filter(r => r._stageSummary === "Won")
    const mPipe = mDeals.filter(r => r._stageSummary === "Pipe")
    const mCommit = mPipe.filter(r => r._commit === "Commit")
    const mUpside = mPipe.filter(r => r._commit === "Upside")
    const mBestCase = mPipe
    const mBudget = getTeamBudgetForMonths([month], oiTargets)

    const adBreakdown = USERS.map(u => {
      const uPipe = mPipe.filter(r => r.User === u)
      const uWon = mWon.filter(r => r.User === u)
      const uCommit = uPipe.filter(r => r._commit === "Commit")
      const uUpside = uPipe.filter(r => r._commit === "Upside")
      const uBestCase = uPipe
      const uBudget = getADBudget(u, [month], oiTargets)
      return {
        name: u, first: u.split(" ")[0],
        won: uWon.reduce((s, r) => s + (r._val || 0), 0),
        commit: uCommit.reduce((s, r) => s + (r._val || 0), 0),
        upside: uUpside.reduce((s, r) => s + (r._val || 0), 0),
        bestCase: uBestCase.reduce((s, r) => s + (r._val || 0), 0),
        budget: uBudget,
        commitDeals: uCommit.length, upsideDeals: uUpside.length, bestCaseDeals: uBestCase.length,
      }
    })

    return {
      month, budget: mBudget,
      won: mWon.reduce((s, r) => s + (r._val || 0), 0), wonDeals: mWon.length,
      commit: mCommit.reduce((s, r) => s + (r._val || 0), 0), commitDeals: mCommit.length,
      upside: mUpside.reduce((s, r) => s + (r._val || 0), 0), upsideDeals: mUpside.length,
      bestCase: mBestCase.reduce((s, r) => s + (r._val || 0), 0), bestCaseDeals: mBestCase.length,
      adBreakdown,
    }
  }

  // Sort next 2 months chronologically from current
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

  const prevPost = savedPosts.length > 0 ? savedPosts[savedPosts.length - 1] : null
  const prevCommit = prevPost?.summary.commit || null

  // ── AI commentary generator ───────────────────────────────────────────────
  const handleGenerateAI = () => {
    setIsGeneratingAI(true)
    // Small timeout for UX feedback
    setTimeout(() => {
      const result = generateCommentary({
        curMonth, curQ, period,
        curTotalCommit, curBudget, curCoverage,
        curWonVal, curWon: curWon.length,
        curRiskCount: curRisk.length,
        curRiskVal: curRisk.reduce((s, r) => s + (r._val || 0), 0),
        keyDealCount: keyDeals.length,
        weekNum, adRows,
      })
      setCommentary(result)
      setIsGeneratingAI(false)
    }, 600)
  }

  // ── Post generator ────────────────────────────────────────────────────────
  const generatePost = useCallback(() => {
    const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    const lines: string[] = []
    const sep = "─".repeat(50)
    const thick = "═".repeat(50)

    lines.push(`📊 FY26 FORECAST REPORT — Week ${weekNum} | ${curMonth} ${now.getFullYear()} | ${period}`)
    lines.push(thick)
    lines.push(`Generated: ${dateStr} by E.V.E`)
    lines.push("")

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
    lines.push(`${pad("GAP to Budget:", 28)} ${curBudget - curTotalCommit > 0 ? fmt(curBudget - curTotalCommit) + " ⚠️" : "COVERED ✅"}`)
    lines.push("")

    lines.push(`👥 AD BREAKDOWN — ${curMonth}`)
    lines.push(sep)
    lines.push(`${pad("AD", 14)}${pad("Won", 10)}${pad("Commit", 10)}${pad("Budget", 10)}${pad("Cov%", 8)}`)
    lines.push("─".repeat(52))
    adRows.forEach(row => {
      const cov = row.budget > 0 ? fp(row.coverage) : "N/A"
      const emoji = row.coverage >= 1 ? "🟢" : row.coverage >= 0.7 ? "🟡" : "🔴"
      lines.push(`${pad(row.first, 14)}${pad(fmt(row.won), 10)}${pad(fmt(row.commit), 10)}${pad(fmt(row.budget), 10)}${pad(cov, 8)} ${emoji}`)
    })
    lines.push("─".repeat(52))
    lines.push(`${pad("TEAM", 14)}${pad(fmt(curWonVal), 10)}${pad(fmt(curCommitPipeVal), 10)}${pad(fmt(curBudget), 10)}${pad(fp(curCoverage), 8)} ${coverageEmoji(curCoverage)}`)
    lines.push("")

    lines.push("📦 OI · FORECAST · SERVICES BREAKDOWN")
    lines.push(sep)
    lines.push(`${pad("AD", 14)}${pad("OI Won", 12)}${pad("Forecast", 12)}${pad("Services", 12)}${pad("Initials", 12)}`)
    lines.push("─".repeat(62))
    adRows.forEach(row => {
      const forecast = row.won + row.commit
      lines.push(`${pad(row.first, 14)}${pad(fmt(row.won), 12)}${pad(fmt(forecast), 12)}${pad(row.services > 0 ? fmt(row.services) : "—", 12)}${pad(row.initials > 0 ? fmt(row.initials) : "—", 12)}`)
    })
    lines.push("─".repeat(62))
    const teamServices = adRows.reduce((s, r) => s + r.services, 0)
    const teamInitials = adRows.reduce((s, r) => s + r.initials, 0)
    lines.push(`${pad("TEAM", 14)}${pad(fmt(curWonVal), 12)}${pad(fmt(curTotalCommit), 12)}${pad(teamServices > 0 ? fmt(teamServices) : "—", 12)}${pad(teamInitials > 0 ? fmt(teamInitials) : "—", 12)}`)
    lines.push("")

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

    lines.push("📈 NEXT 3 QUARTERS OUTLOOK")
    lines.push(sep)
    next3Qs.forEach((q, i) => {
      const cov = q.budget > 0 ? fp(q.coverage) : "N/A"
      const emoji = q.coverage >= 1 ? "✅" : q.coverage >= 0.7 ? "🟡" : "🔴"
      const label = i === 0 ? "Current" : i === 1 ? "Next" : "+2"
      lines.push(`${q.q} [${label}] (${q.months.join("-")}):`)
      lines.push(`  Won: ${fmt(q.won)}  |  Commit: ${fmt(q.commit)}  |  Pipeline: ${fmt(q.pipe)}`)
      lines.push(`  Budget: ${fmt(q.budget)}  |  Coverage: ${cov} ${emoji}`)
    })
    lines.push("")

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

    lines.push("📊 FY26 YTD SUMMARY")
    lines.push(sep)
    lines.push(`${pad("YTD Won:", 28)} ${fmt(ytdWonVal)} (${ytdWon.length} deals)`)
    lines.push(`${pad("Annual Budget:", 28)} ${fmt(ytdBudget)}`)
    lines.push(`${pad("YTD Attainment:", 28)} ${fp(ytdCoverage)} ${coverageEmoji(ytdCoverage)}`)
    lines.push(`${pad("Remaining to Budget:", 28)} ${ytdBudget > ytdWonVal ? fmt(ytdBudget - ytdWonVal) : "ACHIEVED ✅"}`)
    lines.push("")

    lines.push("💡 BUDGET vs COMMIT vs ACTUAL")
    lines.push(sep)
    const budgetGap = curBudget - curTotalCommit
    lines.push(`Our ${curMonth} budget is ${fmt(curBudget)}.`)
    if (curWonVal > 0) lines.push(`We have closed ${fmt(curWonVal)} (${fp(curBudget > 0 ? curWonVal / curBudget : 0)} actual).`)
    else lines.push(`No deals closed in ${curMonth} yet.`)
    lines.push(`Our total commit stands at ${fmt(curTotalCommit)}.`)
    if (budgetGap <= 0) lines.push(`✅ Commit exceeds budget — we are ${fmt(Math.abs(budgetGap))} above target.`)
    else lines.push(`⚠️ We need ${fmt(budgetGap)} more to cover budget — ${fp(curCoverage)} covered.`)
    if (curRisk.length > 0) {
      lines.push(`⚠️ ${curRisk.length} deals at risk worth ${fmt(curRisk.reduce((s, r) => s + (r._val || 0), 0))} — needs attention.`)
    }
    lines.push("")

    if (curRisk.length > 0) {
      lines.push(`⚠️ FORECAST RISKS (${curRisk.length} deals · ${fmt(curRisk.reduce((s, r) => s + (r._val || 0), 0))})`)
      lines.push(sep)
      curRisk.sort((a, b) => (b._val || 0) - (a._val || 0)).slice(0, 5).forEach(d => {
        const ad = (d.User || "").split(" ")[0]
        const name = (d["Opportunity Name"] || "").toString().substring(0, 40)
        lines.push(`• ${ad} — ${name} (${fk(d._val || 0)}, ${d._push} pushes)`)
      })
      lines.push("")
    }

    if (commentary.trim()) {
      lines.push("💬 EXECUTIVE COMMENTARY")
      lines.push(sep)
      lines.push(commentary.trim())
      lines.push("")
    }

    lines.push(thick)
    lines.push(`E.V.E — Elevate Value Add Engine | Week ${weekNum} | ${period} | ${dateStr}`)

    return lines.join("\n")
  }, [curMonth, curWon, curPipe, curCommitPipe, curWonVal, curCommitPipeVal, curTotalCommit,
      curBudget, curCoverage, curCommitToCompany, curRisk, keyDeals, adRows, next3Qs,
      next2MonthsData, ytdWonVal, ytdWon, ytdBudget, ytdCoverage, commentary, weekNum,
      prevCommit, period])

  // ── Save post ─────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    const post = generatePost()
    setGeneratedPost(post)
    const newSaved: SavedPost = {
      id: Date.now().toString(),
      weekLabel: `W${weekNum}`,
      month: curMonth,
      quarter: curQ,
      period,
      generatedAt: new Date().toISOString(),
      content: post,
      summary: { commit: curTotalCommit, won: curWonVal, coverage: curCoverage, budget: curBudget },
    }
    const updated = [...savedPosts, newSaved].slice(-50)
    setSavedPosts(updated)
    localStorage.setItem("eve_forecast_posts", JSON.stringify(updated))
    setSelectedHistoryId(null)
  }

  // ── Delete post ───────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    const updated = savedPosts.filter(x => x.id !== id)
    setSavedPosts(updated)
    localStorage.setItem("eve_forecast_posts", JSON.stringify(updated))
    if (selectedHistoryId === id) setSelectedHistoryId(null)
    setDeleteConfirmId(null)
  }

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = async (text: string, id?: string) => {
    const htmlLines = text.split("\n").map(line => {
      if (/^[📊💰👥📦🎯📈💡⚠️💬✅🏆🎖]/.test(line) && line.trim().length > 2) {
        return `<p style="font-weight:bold;font-size:13pt;color:#1a1a2e;margin:12px 0 4px">${line}</p>`
      }
      if (/^[═─]+$/.test(line.trim())) return `<hr style="border:1px solid #ddd;margin:4px 0"/>`
      if (line.includes(":") && !line.startsWith("•") && !line.startsWith("-")) {
        const parts = line.split(/\s{2,}/)
        if (parts.length >= 2) {
          return `<p style="margin:2px 0;font-family:Calibri,sans-serif;font-size:10pt"><span style="color:#555;min-width:180px;display:inline-block">${parts[0]}</span><strong>${parts.slice(1).join("  ")}</strong></p>`
        }
      }
      if (line.startsWith("•") || line.startsWith("-")) {
        return `<p style="margin:2px 8px;font-family:Calibri,sans-serif;font-size:10pt">${line}</p>`
      }
      if (!line.trim()) return `<p style="margin:4px 0"></p>`
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
      try { await navigator.clipboard.writeText(text) } catch {
        const el = document.createElement("textarea")
        el.value = text; document.body.appendChild(el); el.select()
        document.execCommand("copy"); document.body.removeChild(el)
      }
    }
    if (id) { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) }
    else { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const displayPost = selectedHistoryId
    ? savedPosts.find(p => p.id === selectedHistoryId)?.content || ""
    : generatedPost || ""

  // ── History table sort + filter ──────────────────────────────────────────
  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortCol(col); setSortDir("desc") }
  }

  const filteredPosts = [...savedPosts]
    .filter(p => {
      if (!historySearch) return true
      const q = historySearch.toLowerCase()
      return (
        p.weekLabel.toLowerCase().includes(q) ||
        p.month.toLowerCase().includes(q) ||
        (p.period || "").toLowerCase().includes(q) ||
        (p.quarter || "").toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0
      switch (sortCol) {
        case "week": av = parseInt(a.weekLabel.replace("W", "")) || 0; bv = parseInt(b.weekLabel.replace("W", "")) || 0; break
        case "period": av = PERIOD_ORDER.indexOf(a.period as ForecastPeriod); bv = PERIOD_ORDER.indexOf(b.period as ForecastPeriod); break
        case "month": av = MONTHS.indexOf(a.month); bv = MONTHS.indexOf(b.month); break
        case "date": av = new Date(a.generatedAt).getTime(); bv = new Date(b.generatedAt).getTime(); break
        case "commit": av = a.summary.commit; bv = b.summary.commit; break
        case "coverage": av = a.summary.coverage; bv = b.summary.coverage; break
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1
      if (av > bv) return sortDir === "asc" ? 1 : -1
      return 0
    })

  // ── Render ────────────────────────────────────────────────────────────────
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

      {/* Quarter overview strip — chronologically sorted */}
      <div className="grid grid-cols-4 gap-3">
        {next3Qs.map((q, i) => (
          <Card key={q.q} className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => openDealModal(`${q.q} — All Deals`,
              data.filter(r => q.months.includes(r._month || "") && userMatchesFilter(r.User, filters.user)))}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {i === 0 ? "Current" : i === 1 ? "Next" : "+2"} · {q.q}
                </span>
                <span className="text-lg">{coverageEmoji(q.coverage)}</span>
              </div>
              <div className="text-xl font-bold">{fmt(q.won + q.commit)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{fmt(q.won)} won · {fmt(q.commit)} commit</div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(q.coverage * 100, 100)}%` }} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{fmtPct(q.coverage)} of {fmt(q.budget)}</div>
            </CardContent>
          </Card>
        ))}
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
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(ytdCoverage * 100, 100)}%` }} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{fmtPct(ytdCoverage)} of {fmt(ytdBudget)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Next 2 months — sorted chronologically */}
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
                          {row.commit > 0 ? <span className="text-blue-600 font-semibold">{fmt(row.commit)}<span className="text-muted-foreground font-normal ml-1">({row.commitDeals})</span></span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="text-right px-2 py-1.5">
                          {row.upside > 0 ? <span className="text-purple-600 font-semibold">{fmt(row.upside)}<span className="text-muted-foreground font-normal ml-1">({row.upsideDeals})</span></span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="text-right px-2 py-1.5">
                          {row.bestCase > 0 ? <span className="text-emerald-600 font-semibold">{fmt(row.bestCase)}<span className="text-muted-foreground font-normal ml-1">({row.bestCaseDeals})</span></span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="text-right px-3 py-1.5 text-muted-foreground">{fmt(row.budget)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/40 font-bold border-t-2">
                      <td className="px-3 py-2">TEAM</td>
                      <td className="text-right px-2 py-2 text-blue-600">{m.commit > 0 ? `${fmt(m.commit)} (${m.commitDeals})` : "—"}</td>
                      <td className="text-right px-2 py-2 text-purple-600">{m.upside > 0 ? `${fmt(m.upside)} (${m.upsideDeals})` : "—"}</td>
                      <td className="text-right px-2 py-2 text-emerald-600">{fmt(m.bestCase)} ({m.bestCaseDeals})</td>
                      <td className="text-right px-3 py-2">{fmt(m.budget)}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="px-3 py-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Coverage (Won + Commit vs Budget)</span>
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

          {/* Post Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Post Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Week number — FY auto-calc */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground w-24 shrink-0">Week number</label>
                <input
                  type="number"
                  value={weekNum}
                  onChange={e => setWeekNum(Number(e.target.value))}
                  min={1} max={52}
                  className="w-20 text-center px-2 py-1 rounded border bg-background text-sm font-semibold focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground">FY26 week (1 Jul = W1)</span>
              </div>

              {/* Period — fixed hierarchy: Next → Q1 → H1 → FY26 */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground w-24 shrink-0">Forecast period</label>
                <div className="flex gap-1.5">
                  {PERIOD_ORDER.map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all border ${
                        period === p
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current period info */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground w-24 shrink-0">Current period</label>
                <span className="text-sm font-semibold">{curMonth} {now.getFullYear()} · {curQ}</span>
              </div>
            </CardContent>
          </Card>

          {/* AD Snapshot */}
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
                      onClick={() => openDealModal(`${row.first} — ${curMonth}`, curDeals.filter(r => r.User === row.name))}>
                      <td className="px-4 py-2"><ADCell name={row.name} /></td>
                      <td className="text-right px-3 py-2 text-emerald-600 dark:text-emerald-400 font-medium">{row.won > 0 ? fmt(row.won) : "—"}</td>
                      <td className="text-right px-3 py-2 text-amber-600 dark:text-amber-400 font-medium">{row.commit > 0 ? fmt(row.commit) : "—"}</td>
                      <td className="text-right px-3 py-2 text-muted-foreground">{fmt(row.budget)}</td>
                      <td className="text-right px-3 py-2">
                        <span className={`font-semibold ${row.coverage >= 1 ? "text-emerald-600 dark:text-emerald-400" : row.coverage >= 0.7 ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>
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
                      <span className={`font-bold ${curCoverage >= 1 ? "text-emerald-600 dark:text-emerald-400" : curCoverage >= 0.7 ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>
                        {fmtPct(curCoverage)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Executive Commentary with AI */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Executive Commentary
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                >
                  <Bot className={`w-3.5 h-3.5 ${isGeneratingAI ? "animate-pulse text-primary" : ""}`} />
                  {isGeneratingAI ? "Generating…" : "AI Generate"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={commentary}
                onChange={e => setCommentary(e.target.value)}
                placeholder={`Add your ${curMonth} executive summary here, or click "AI Generate" to auto-draft one from live data…`}
                className="w-full min-h-[140px] text-sm p-3 rounded-lg border bg-background resize-y focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                AI draft uses live pipeline data · editable before saving · appears in generated post
              </p>
            </CardContent>
          </Card>

          {/* Generate button */}
          <Button className="w-full gap-2" size="lg" onClick={handleGenerate}>
            <Sparkles className="w-4 h-4" />
            Generate &amp; Save Forecast Post
          </Button>

          {/* Trend strip */}
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
                      ? `Historical — ${savedPosts.find(p => p.id === selectedHistoryId)?.weekLabel} ${savedPosts.find(p => p.id === selectedHistoryId)?.month}`
                      : `W${weekNum} · ${curMonth} · ${period}`
                    }
                  </CardTitle>
                  <div className="flex gap-2">
                    {selectedHistoryId && (
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7"
                        onClick={() => setSelectedHistoryId(null)}>
                        Latest
                      </Button>
                    )}
                    <Button
                      variant={copied ? "default" : "outline"}
                      size="sm" className="gap-1.5 text-xs h-7"
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
              <p className="text-xs text-muted-foreground mt-1">Ready to paste directly into Microsoft Teams</p>
            </Card>
          )}
        </div>
      </div>

      {/* ── Post History — Table View ─────────────────────────────────────────── */}
      {savedPosts.length > 0 && (
        <Card>
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowHistory(v => !v)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Post History — {savedPosts.length} saved
              </CardTitle>
              <div className="flex items-center gap-2">
                {showHistory && (
                  <input
                    type="text"
                    placeholder="Search week, month, period…"
                    value={historySearch}
                    onChange={e => { e.stopPropagation(); setHistorySearch(e.target.value) }}
                    onClick={e => e.stopPropagation()}
                    className="text-xs px-2 py-1 rounded border bg-background focus:outline-none focus:border-primary w-44"
                  />
                )}
                {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>

          {showHistory && (
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {(
                        [
                          { col: "week" as SortCol, label: "Week" },
                          { col: "period" as SortCol, label: "Period" },
                          { col: "month" as SortCol, label: "Month" },
                          { col: "date" as SortCol, label: "Date Created" },
                          { col: "commit" as SortCol, label: "Commit" },
                          { col: "coverage" as SortCol, label: "Coverage" },
                        ]
                      ).map(({ col, label }) => (
                        <th
                          key={col}
                          className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                          onClick={() => toggleSort(col)}
                        >
                          <span className="flex items-center gap-1">
                            {label}
                            <ArrowUpDown className={`w-3 h-3 ${sortCol === col ? "text-primary" : "opacity-30"}`} />
                          </span>
                        </th>
                      ))}
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Commentary</th>
                      <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No posts match your search</td>
                      </tr>
                    )}
                    {filteredPosts.map(p => {
                      const isSelected = selectedHistoryId === p.id
                      const date = new Date(p.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })
                      const time = new Date(p.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                      const preview = p.content.split("\n").find(l => l.trim() && !l.startsWith("═") && !l.startsWith("─") && !l.startsWith("📊") && !l.startsWith("Generated"))?.trim().substring(0, 70) || ""
                      const isDeleting = deleteConfirmId === p.id

                      return (
                        <tr
                          key={p.id}
                          onClick={() => !isDeleting && setSelectedHistoryId(isSelected ? null : p.id)}
                          className={`border-b transition-colors cursor-pointer ${
                            isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/20"
                          }`}
                        >
                          <td className="px-3 py-2.5 font-semibold text-primary">{p.weekLabel}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-muted text-xs font-medium">{p.period || p.quarter}</span>
                          </td>
                          <td className="px-3 py-2.5 font-medium">{p.month}</td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{date} {time}</td>
                          <td className="px-3 py-2.5 font-semibold">{fmt(p.summary.commit)}</td>
                          <td className="px-3 py-2.5">
                            <span className={`font-bold ${
                              p.summary.coverage >= 1 ? "text-emerald-600 dark:text-emerald-400" :
                              p.summary.coverage >= 0.7 ? "text-amber-600 dark:text-amber-400" : "text-destructive"
                            }`}>
                              {fp(p.summary.coverage)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">{preview}…</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                              {isDeleting ? (
                                <>
                                  <span className="text-destructive text-[10px] flex items-center gap-1 mr-1">
                                    <AlertTriangle className="w-3 h-3" /> Confirm?
                                  </span>
                                  <button
                                    onClick={() => handleDelete(p.id)}
                                    className="px-2 py-0.5 rounded bg-destructive text-destructive-foreground text-[10px] font-semibold hover:opacity-90"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-0.5 rounded border text-[10px] hover:bg-muted"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleCopy(p.content, p.id)}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Copy to Teams"
                                  >
                                    {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(p.id)}
                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Delete post"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {filteredPosts.length > 0 && (
                <div className="px-3 py-2 border-t text-xs text-muted-foreground">
                  {filteredPosts.length} of {savedPosts.length} posts · Click any row to preview · Sort by column headers
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
