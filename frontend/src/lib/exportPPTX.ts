import PptxGenJS from "pptxgenjs"
import type { Deal, BudgetTargets } from "@/types"
import { fmt, fk, fmtPct } from "./formatters"
import { USERS } from "@/config/users"
import { MONTHS, QUARTERS } from "@/config/months"
import { getADBudget, getTeamBudgetForMonths } from "./budgetHelpers"

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       "0F1117",
  card:     "1A1D27",
  card2:    "242836",
  border:   "2E3345",
  white:    "E8E9ED",
  grey:     "9CA3B4",
  dim:      "6B7280",
  red:      "E63946",
  teal:     "2EC4B6",
  green:    "10B981",
  amber:    "F59E0B",
  blue:     "3B82F6",
  blue2:    "60A5FA",
  purple:   "8B5CF6",
}

export interface ExportPPTXOptions {
  data: Deal[]
  oiTargets: BudgetTargets
  monthlyBudget: Record<string, number>
  /** If set, scope everything to this AD */
  filterUser?: string
  /** If set, scope to this product */
  filterProduct?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bg(s: PptxGenJS.Slide) {
  s.background = { color: C.bg }
}

/** Top accent bar + bottom bar */
function chrome(s: PptxGenJS.Slide) {
  // top-right decorative circles
  s.addShape("ellipse" as any, { x: 8.6, y: -0.35, w: 1.8, h: 1.8, line: { color: C.red, width: 2 }, fill: { color: C.bg, transparency: 100 } })
  s.addShape("ellipse" as any, { x: 8.95, y: 0.0,  w: 1.1, h: 1.1, line: { color: C.teal, width: 1.5 }, fill: { color: C.bg, transparency: 100 } })
  s.addShape("ellipse" as any, { x: 9.2,  y: 0.25, w: 0.55, h: 0.55, fill: { color: C.red } })
  // bottom bar
  s.addShape("rect" as any, { x: 0, y: 5.3, w: 10, h: 0.22, fill: { color: C.red } })
}

/** Section heading + red underline */
function heading(s: PptxGenJS.Slide, title: string, y = 0.22) {
  s.addText(title, { x: 0.35, y, w: 8.5, h: 0.5, fontSize: 22, fontFace: "Calibri", color: C.white, bold: true })
  s.addShape("rect" as any, { x: 0.35, y: y + 0.48, w: 1.6, h: 0.035, fill: { color: C.red } })
}

/** Small sub-label above a value */
function kpiBox(
  s: PptxGenJS.Slide,
  label: string, value: string, sub: string,
  x: number, y: number, w: number, h: number,
  valueColor = C.white
) {
  s.addShape("rect" as any, { x, y, w, h, fill: { color: C.card }, line: { color: C.border, width: 0.5 } })
  s.addText(label, { x: x + 0.12, y: y + 0.08, w: w - 0.24, h: 0.2, fontSize: 7, fontFace: "Calibri", color: C.grey, bold: true })
  s.addText(value, { x: x + 0.12, y: y + 0.26, w: w - 0.24, h: 0.42, fontSize: 20, fontFace: "Calibri", color: valueColor, bold: true, align: "left" })
  s.addText(sub, { x: x + 0.12, y: y + 0.72, w: w - 0.24, h: 0.2, fontSize: 7.5, fontFace: "Calibri", color: C.grey })
}

/** Horizontal progress bar */
function progressBar(
  s: PptxGenJS.Slide,
  pct: number,
  x: number, y: number, w: number, h: number,
  color?: string
) {
  const col = color ?? (pct >= 1 ? C.green : pct >= 0.7 ? C.amber : C.red)
  s.addShape("rect" as any, { x, y, w, h, fill: { color: C.border } })
  if (pct > 0) {
    s.addShape("rect" as any, { x, y, w: Math.min(pct, 1) * w, h, fill: { color: col } })
  }
}

/** Bullet point row */
function bullet(s: PptxGenJS.Slide, text: string, x: number, y: number, w: number, color = C.grey, bold = false) {
  s.addText("•", { x, y, w: 0.18, h: 0.22, fontSize: 8, fontFace: "Calibri", color: C.blue })
  s.addText(text, { x: x + 0.18, y, w: w - 0.18, h: 0.22, fontSize: 8, fontFace: "Calibri", color, bold })
}

/** Status pill */
function statusPill(s: PptxGenJS.Slide, label: string, x: number, y: number) {
  const col = label === "ON TRACK" ? C.green : label === "AT RISK" ? C.amber : C.red
  s.addShape("rect" as any, { x, y, w: 1.1, h: 0.3, fill: { color: col }, rectRadius: 0.05 })
  s.addText(label, { x, y, w: 1.1, h: 0.3, fontSize: 7.5, fontFace: "Calibri", color: C.white, bold: true, align: "center", valign: "middle" })
}

// ─── Filter helpers ────────────────────────────────────────────────────────────

function filterData(data: Deal[], opts: ExportPPTXOptions) {
  return data.filter((r) => {
    if (opts.filterUser && opts.filterUser !== "All" && r.User !== opts.filterUser) return false
    if (opts.filterProduct && opts.filterProduct !== "All" && r._product !== opts.filterProduct) return false
    return true
  })
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function exportPPTX(opts: ExportPPTXOptions) {
  const { oiTargets, monthlyBudget } = opts
  const data = filterData(opts.data, opts)

  const adLabel = opts.filterUser && opts.filterUser !== "All" ? opts.filterUser : "Team"
  const isAD = opts.filterUser && opts.filterUser !== "All"
  const activeUsers = isAD ? [opts.filterUser!] : USERS

  const won   = data.filter((r) => r._stageSummary === "Won")
  const pipe  = data.filter((r) => r._stageSummary === "Pipe")
  const lost  = data.filter((r) => r._stageSummary === "Lost")

  const commits = pipe.filter((r) => r._commit === "Commit")
  const upside  = pipe.filter((r) => r._commit === "Upside")
  const risks   = pipe.filter((r) => r._risk === "Risk").sort((a, b) => (b._val ?? 0) - (a._val ?? 0))

  const totalWon    = won.reduce((s, r)  => s + (r._val ?? 0), 0)
  const totalPipe   = pipe.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalCommit = commits.reduce((s, r) => s + (r._val ?? 0), 0)
  const annualBudget = isAD
    ? getADBudget(opts.filterUser!, MONTHS, oiTargets)
    : Object.values(monthlyBudget).reduce((a, b) => a + b, 0)

  // Derive current month
  const mNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const curM = MONTHS.find((m) => m === mNames[new Date().getMonth()]) ?? MONTHS[MONTHS.length - 1]
  const curMIdx = MONTHS.indexOf(curM)
  const qMap: Record<string, string> = { Jul:"Q1",Aug:"Q1",Sep:"Q1",Oct:"Q2",Nov:"Q2",Dec:"Q2",Jan:"Q3",Feb:"Q3",Mar:"Q3",Apr:"Q4",May:"Q4",Jun:"Q4" }
  const curQ  = qMap[curM] ?? "Q1"
  const curQMonths = QUARTERS[curQ]
  const nextM = MONTHS[(curMIdx + 1) % 12]

  // Month data
  const mWon    = won.filter((r)  => r._month === curM)
  const mPipe   = pipe.filter((r) => r._month === curM)
  const mLost   = lost.filter((r) => r._month === curM)
  const mWonVal = mWon.reduce((s, r) => s + (r._val ?? 0), 0)
  const mBudget = isAD ? getADBudget(opts.filterUser!, [curM], oiTargets) : (monthlyBudget[curM] ?? 0)
  const mCommits    = mPipe.filter((r) => r._commit === "Commit")
  const mCommitVal  = mCommits.reduce((s, r) => s + (r._val ?? 0), 0)
  const mTotalCommit = mWonVal + mCommitVal
  const mPct = mBudget > 0 ? mTotalCommit / mBudget : 0
  const mWonPct = mBudget > 0 ? mWonVal / mBudget : 0
  const mRisks  = mPipe.filter((r) => r._risk === "Risk")
  const mGap    = mBudget - mTotalCommit
  const mWinRate = (mWon.length + mLost.length) > 0 ? mWon.length / (mWon.length + mLost.length) : 0

  // Quarter data
  const qWon   = won.filter((r)  => curQMonths.includes(r._month ?? ""))
  const qPipe  = pipe.filter((r) => curQMonths.includes(r._month ?? ""))
  const qWonVal    = qWon.reduce((s, r)  => s + (r._val ?? 0), 0)
  const qBudget    = isAD ? getADBudget(opts.filterUser!, curQMonths, oiTargets) : getTeamBudgetForMonths(curQMonths, oiTargets)
  const qCommitVal = qPipe.filter((r) => r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0)
  const qPct = qBudget > 0 ? qWonVal / qBudget : 0
  const completedQMonths = curQMonths.filter((m) => MONTHS.indexOf(m) <= MONTHS.indexOf(curM)).length
  const qRunRate = completedQMonths > 0 ? qWonVal / completedQMonths : 0
  const qProjected = qRunRate * 3

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  const pres = new PptxGenJS()
  pres.layout = "LAYOUT_16x9"
  pres.title  = `E.V.E Forecast — ${adLabel}`

  // ══════════════════════════════════════════════════════════════════════
  // SLIDE 1 — TITLE
  // ══════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide(); bg(s); chrome(s)
    // Left accent stripe
    s.addShape("rect" as any, { x: 0, y: 0, w: 0.08, h: 5.3, fill: { color: C.red } })
    s.addText("E.V.E", { x: 0.5, y: 0.8, w: 5, h: 0.8, fontSize: 52, fontFace: "Calibri", color: C.white, bold: true })
    s.addText("Elevate Value Add Engine", { x: 0.5, y: 1.55, w: 6, h: 0.35, fontSize: 16, fontFace: "Calibri", color: C.blue2 })
    s.addShape("rect" as any, { x: 0.5, y: 2.0, w: 3.5, h: 0.04, fill: { color: C.red } })
    s.addText("Forecast Report", { x: 0.5, y: 2.15, w: 5, h: 0.5, fontSize: 26, fontFace: "Calibri", color: C.white, bold: true })
    s.addText(adLabel, { x: 0.5, y: 2.65, w: 5, h: 0.35, fontSize: 14, fontFace: "Calibri", color: C.teal })
    s.addText(today, { x: 0.5, y: 3.1, w: 6, h: 0.28, fontSize: 11, fontFace: "Calibri", color: C.grey })
    s.addText("Confidential", { x: 0.5, y: 4.95, w: 4, h: 0.22, fontSize: 9, fontFace: "Calibri", color: C.dim })
  }

  // ══════════════════════════════════════════════════════════════════════
  // SLIDE 2 — THIS MONTH: KPIs + Status + Context
  // ══════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide(); bg(s); chrome(s)
    heading(s, `${curM} — Month to Date`)

    const status = mPct >= 1 ? "ON TRACK" : mPct >= 0.7 ? "AT RISK" : "OFF TRACK"
    statusPill(s, status, 8.4, 0.25)

    // 4 KPI boxes across the top
    const kpis: [string, string, string, string][] = [
      ["CLOSED WON",    fk(mWonVal),     `${mWon.length} deal${mWon.length !== 1 ? "s" : ""}`,       C.green],
      ["COMMIT PIPE",   fk(mCommitVal),  `${mCommits.length} deal${mCommits.length !== 1 ? "s" : ""}`, C.blue2],
      ["TOTAL COMMIT",  fk(mTotalCommit),`Won + Commit`,                                               C.teal],
      ["BUDGET",        fk(mBudget),     `${fmtPct(mWonPct)} achieved`,                               C.white],
    ]
    kpis.forEach(([lbl, val, sub, col], i) => kpiBox(s, lbl, val, sub, 0.35 + i * 2.3, 0.88, 2.1, 1.0, col))

    // Progress bar + gap label
    const barY = 2.05
    s.addText("Commit vs Budget", { x: 0.35, y: barY + 0.02, w: 3, h: 0.2, fontSize: 8, fontFace: "Calibri", color: C.grey })
    s.addText(mGap > 0 ? `GAP: ${fk(mGap)}` : "✓ Budget Covered", {
      x: 7.2, y: barY + 0.02, w: 2, h: 0.2, fontSize: 8, fontFace: "Calibri",
      color: mGap > 0 ? C.red : C.green, bold: true, align: "right",
    })
    progressBar(s, mPct, 0.35, barY + 0.24, 9.0, 0.16)
    s.addText(fmtPct(mWonPct) + " won", {
      x: 0.35, y: barY + 0.42, w: 2, h: 0.18, fontSize: 7, fontFace: "Calibri", color: C.green,
    })

    // AD mini table
    s.addShape("rect" as any, { x: 0.35, y: 2.56, w: 9.0, h: 0.26, fill: { color: C.card2 } })
    const colW = [1.6, 1.4, 1.4, 1.4, 1.2, 2.0]
    const colX = [0.35, 1.95, 3.35, 4.75, 6.15, 7.35]
    const hdrs = ["AD", "Won", "Commit", "Total", "Budget", "Attainment"]
    hdrs.forEach((h, i) => s.addText(h, {
      x: colX[i] + 0.06, y: 2.58, w: colW[i] - 0.06, h: 0.22,
      fontSize: 7, fontFace: "Calibri", color: C.grey, bold: true,
    }))

    let rowY = 2.82
    activeUsers.forEach((u, idx) => {
      const uW = mWon.filter((r) => r.User === u).reduce((s, r) => s + (r._val ?? 0), 0)
      const uC = mCommits.filter((r) => r.User === u).reduce((s, r) => s + (r._val ?? 0), 0)
      const uB = getADBudget(u, [curM], oiTargets)
      const uPct = uB > 0 ? (uW + uC) / uB : 0
      const rowFill = idx % 2 === 0 ? C.card : C.card2
      s.addShape("rect" as any, { x: 0.35, y: rowY, w: 9.0, h: 0.28, fill: { color: rowFill } })
      const vals = [
        u.split(" ")[0],
        fk(uW), fk(uC), fk(uW + uC), fk(uB),
        fmtPct(uPct),
      ]
      const vCols = [C.white, C.green, C.blue2, C.teal, C.grey, uPct >= 1 ? C.green : uPct >= 0.7 ? C.amber : C.red]
      vals.forEach((v, i) => s.addText(v, {
        x: colX[i] + 0.06, y: rowY + 0.04, w: colW[i] - 0.06, h: 0.2,
        fontSize: 8, fontFace: "Calibri", color: vCols[i], bold: i === 5,
      }))
      progressBar(s, uPct, colX[5] + 0.06, rowY + 0.18, colW[5] - 0.12, 0.06)
      rowY += 0.28
    })
  }

  // ══════════════════════════════════════════════════════════════════════
  // SLIDE 3 — THIS MONTH: Insights + Actions
  // ══════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide(); bg(s); chrome(s)
    heading(s, `${curM} — Insights & Actions`)

    // Left column — Insights
    s.addShape("rect" as any, { x: 0.35, y: 0.88, w: 4.6, h: 0.28, fill: { color: C.card2 } })
    s.addText("INSIGHTS", { x: 0.45, y: 0.9, w: 4.5, h: 0.24, fontSize: 8, fontFace: "Calibri", color: C.blue2, bold: true })

    const insightLines: Array<{ text: string; col: string }> = []

    // Forecast position
    if (mTotalCommit >= mBudget) {
      insightLines.push({ text: `✅  Budget covered — ${fk(mTotalCommit)} commit vs ${fk(mBudget)} target.`, col: C.green })
    } else {
      insightLines.push({ text: `⚠  Commit ${fk(mTotalCommit)} covers ${fmtPct(mPct)} of ${fk(mBudget)} budget. Gap: ${fk(mGap)}.`, col: C.amber })
    }

    // Win rate this month
    if (mWinRate > 0) {
      insightLines.push({
        text: `Win rate ${fmtPct(mWinRate)} (${mWon.length}W / ${mLost.length}L this month).`,
        col: mWinRate >= 0.5 ? C.green : C.red,
      })
    }

    // Risk count
    if (mRisks.length > 0) {
      insightLines.push({
        text: `${mRisks.length} risk deal${mRisks.length > 1 ? "s" : ""} worth ${fk(mRisks.reduce((s, r) => s + (r._val ?? 0), 0))} — pushed >2× or >180 days.`,
        col: C.red,
      })
    } else {
      insightLines.push({ text: "No risk deals flagged — clean pipeline.", col: C.green })
    }

    // Services attach
    const mWonSvc = mWon.filter((r) => (r._services ?? 0) > 0)
    const attachRate = mWon.length > 0 ? mWonSvc.length / mWon.length : 0
    insightLines.push({
      text: `Services attach ${fmtPct(attachRate)} (${mWonSvc.length} of ${mWon.length} won deals).`,
      col: attachRate >= 0.3 ? C.white : C.amber,
    })

    // Next month pipeline preview
    const nextPipe = pipe.filter((r) => r._month === nextM)
    const nextCommit = nextPipe.filter((r) => r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0)
    insightLines.push({
      text: `${nextM} pipeline: ${fk(nextPipe.reduce((s, r) => s + (r._val ?? 0), 0))} (${fk(nextCommit)} commit, ${nextPipe.length} deals).`,
      col: C.grey,
    })

    // AD performance highlights
    const topAD = [...activeUsers].sort((a, b) => {
      const aW = mWon.filter((r) => r.User === a).reduce((s, r) => s + (r._val ?? 0), 0)
      const bW = mWon.filter((r) => r.User === b).reduce((s, r) => s + (r._val ?? 0), 0)
      return bW - aW
    })[0]
    if (topAD && !isAD) {
      const tv = mWon.filter((r) => r.User === topAD).reduce((s, r) => s + (r._val ?? 0), 0)
      insightLines.push({ text: `🏆  ${topAD.split(" ")[0]} leads with ${fk(tv)} won this month.`, col: C.teal })
    }

    insightLines.forEach((ins, i) => {
      const iy = 1.22 + i * 0.42
      s.addShape("rect" as any, { x: 0.35, y: iy, w: 4.6, h: 0.36, fill: { color: C.card }, line: { color: C.border, width: 0.3 } })
      s.addShape("rect" as any, { x: 0.35, y: iy, w: 0.06, h: 0.36, fill: { color: ins.col } })
      s.addText(ins.text, { x: 0.5, y: iy + 0.07, w: 4.35, h: 0.24, fontSize: 8.5, fontFace: "Calibri", color: ins.col })
    })

    // Right column — Actions
    s.addShape("rect" as any, { x: 5.3, y: 0.88, w: 4.05, h: 0.28, fill: { color: C.card2 } })
    s.addText("NEXT STEPS & ACTIONS", { x: 5.4, y: 0.9, w: 3.9, h: 0.24, fontSize: 8, fontFace: "Calibri", color: C.red, bold: true })

    const actions: Array<{ num: string; title: string; body: string; col: string }> = []

    if (mGap > 0 && mCommits.length > 0) {
      const top2 = [...mCommits].sort((a, b) => (b._val ?? 0) - (a._val ?? 0)).slice(0, 2)
      actions.push({
        num: "01", col: C.green,
        title: `Convert ${mCommits.length} commit deal${mCommits.length > 1 ? "s" : ""} — ${fk(mCommitVal)}`,
        body: top2.map((r) => `${r["Account Name"]} (${fk(r._val ?? 0)})`).join(" · "),
      })
    }

    if (mRisks.length > 0) {
      actions.push({
        num: "02", col: C.red,
        title: `De-risk ${mRisks.length} stale deal${mRisks.length > 1 ? "s" : ""} — ${fk(mRisks.reduce((s, r) => s + (r._val ?? 0), 0))}`,
        body: mRisks.slice(0, 2).map((r) => `${(r.User ?? "").split(" ")[0]}: ${r["Opportunity Name"]} (${r._push ?? 0} pushes)`).join(" · "),
      })
    }

    if (mGap > 0) {
      const upsideM = upside.filter((r) => r._month === curM)
      actions.push({
        num: actions.length === 0 ? "01" : `0${actions.length + 1}`, col: C.amber,
        title: `Close budget gap — ${fk(mGap)} remaining`,
        body: upsideM.length > 0
          ? `${fk(upsideM.reduce((s, r) => s + (r._val ?? 0), 0))} in upside can cover — push ${upsideM.slice(0, 2).map((r) => r["Account Name"]).join(", ")} to commit.`
          : "Review pipeline for deals that can be accelerated into this month.",
      })
    }

    const pipeNoSvc = mPipe.filter((r) => (r._services ?? 0) === 0 && (r._val ?? 0) > 15000)
    if (pipeNoSvc.length > 0) {
      actions.push({
        num: `0${actions.length + 1}`, col: C.purple,
        title: `Scope services on ${pipeNoSvc.length} deal${pipeNoSvc.length > 1 ? "s" : ""}`,
        body: pipeNoSvc.slice(0, 2).map((r) => `${r["Account Name"]} (${fk(r._val ?? 0)})`).join(" · "),
      })
    }

    actions.push({
      num: `0${actions.length + 1}`, col: C.blue,
      title: `Prepare ${nextM} pipeline — ${fk(nextCommit)} in commit`,
      body: `${nextPipe.length} deals totalling ${fk(nextPipe.reduce((s, r) => s + (r._val ?? 0), 0))} — start close plans now.`,
    })

    actions.slice(0, 5).forEach((a, i) => {
      const ay = 1.22 + i * 0.73
      s.addShape("rect" as any, { x: 5.3, y: ay, w: 4.05, h: 0.66, fill: { color: C.card }, line: { color: C.border, width: 0.3 } })
      s.addShape("rect" as any, { x: 5.3, y: ay, w: 0.06, h: 0.66, fill: { color: a.col } })
      s.addShape("rect" as any, { x: 5.4, y: ay + 0.1, w: 0.3, h: 0.3, fill: { color: a.col }, rectRadius: 0.04 })
      s.addText(a.num, { x: 5.41, y: ay + 0.12, w: 0.28, h: 0.26, fontSize: 8, fontFace: "Calibri", color: C.white, bold: true, align: "center", valign: "middle" })
      s.addText(a.title, { x: 5.82, y: ay + 0.07, w: 3.45, h: 0.22, fontSize: 8.5, fontFace: "Calibri", color: C.white, bold: true })
      s.addText(a.body, { x: 5.82, y: ay + 0.32, w: 3.45, h: 0.28, fontSize: 7.5, fontFace: "Calibri", color: C.grey })
    })
  }

  // ══════════════════════════════════════════════════════════════════════
  // SLIDE 4 — BI DASHBOARD: Monthly performance grid
  // ══════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide(); bg(s); chrome(s)
    heading(s, "Pipeline Intelligence — Monthly View")

    // Monthly grid: each month = one column
    const colW = 0.72
    const startX = 0.35
    const gridY = 0.94

    // Header row
    s.addShape("rect" as any, { x: startX, y: gridY, w: 9.0, h: 0.26, fill: { color: C.card2 } })
    MONTHS.forEach((m, i) => {
      const isCurCol = m === curM
      s.addText(m, {
        x: startX + i * colW, y: gridY + 0.03, w: colW, h: 0.2,
        fontSize: 8, fontFace: "Calibri", color: isCurCol ? C.blue2 : C.grey,
        align: "center", bold: isCurCol,
      })
    })

    // Data rows
    type RowDef = { label: string; fn: (m: string) => string; color: (m: string) => string; bg: string }
    const rows: RowDef[] = [
      {
        label: "Won",
        fn: (m) => fk(won.filter((r) => r._month === m).reduce((s, r) => s + (r._val ?? 0), 0)),
        color: (m) => {
          const v = won.filter((r) => r._month === m).reduce((s, r) => s + (r._val ?? 0), 0)
          return v > 0 ? C.green : C.dim
        },
        bg: C.card,
      },
      {
        label: "Budget",
        fn: (m) => fk(isAD ? getADBudget(opts.filterUser!, [m], oiTargets) : (monthlyBudget[m] ?? 0)),
        color: () => C.grey,
        bg: C.card2,
      },
      {
        label: "% Budget",
        fn: (m) => {
          const v = won.filter((r) => r._month === m).reduce((s, r) => s + (r._val ?? 0), 0)
          const b = isAD ? getADBudget(opts.filterUser!, [m], oiTargets) : (monthlyBudget[m] ?? 0)
          return b > 0 ? fmtPct(v / b) : "—"
        },
        color: (m) => {
          const v = won.filter((r) => r._month === m).reduce((s, r) => s + (r._val ?? 0), 0)
          const b = isAD ? getADBudget(opts.filterUser!, [m], oiTargets) : (monthlyBudget[m] ?? 0)
          const p = b > 0 ? v / b : 0
          return p >= 1 ? C.green : p >= 0.7 ? C.amber : p > 0 ? C.red : C.dim
        },
        bg: C.card,
      },
      {
        label: "Commit",
        fn: (m) => {
          const mp = pipe.filter((r) => r._month === m && r._commit === "Commit")
          const mv = won.filter((r) => r._month === m).reduce((s, r) => s + (r._val ?? 0), 0)
          const cv = mp.reduce((s, r) => s + (r._val ?? 0), 0)
          return fk(mv + cv)
        },
        color: () => C.teal,
        bg: C.card2,
      },
      {
        label: "Pipeline",
        fn: (m) => fk(pipe.filter((r) => r._month === m).reduce((s, r) => s + (r._val ?? 0), 0)),
        color: () => C.grey,
        bg: C.card,
      },
      {
        label: "Risk",
        fn: (m) => {
          const n = pipe.filter((r) => r._month === m && r._risk === "Risk").length
          return n > 0 ? String(n) : "—"
        },
        color: (m) => {
          const n = pipe.filter((r) => r._month === m && r._risk === "Risk").length
          return n > 0 ? C.red : C.dim
        },
        bg: C.card2,
      },
    ]

    rows.forEach((row, ri) => {
      const ry = gridY + 0.26 + ri * 0.33
      s.addShape("rect" as any, { x: startX, y: ry, w: 9.0, h: 0.33, fill: { color: row.bg } })
      s.addText(row.label, { x: startX + 0.04, y: ry + 0.07, w: 0.65, h: 0.2, fontSize: 7, fontFace: "Calibri", color: C.grey })
      MONTHS.forEach((m, mi) => {
        const isCur = m === curM
        const cellX = startX + mi * colW
        if (isCur) {
          s.addShape("rect" as any, { x: cellX, y: ry, w: colW, h: 0.33, fill: { color: "1e3a5f" }, line: { color: C.blue, width: 0.5 } })
        }
        s.addText(row.fn(m), {
          x: cellX, y: ry + 0.07, w: colW, h: 0.2,
          fontSize: 8, fontFace: "Calibri", color: row.color(m), align: "center", bold: isCur,
        })
      })
    })

    // Bottom mini progress bars for each month
    const barsY = gridY + 0.26 + rows.length * 0.33 + 0.08
    s.addText("Budget coverage", { x: startX, y: barsY, w: 9, h: 0.18, fontSize: 7, fontFace: "Calibri", color: C.grey })
    MONTHS.forEach((m, mi) => {
      const v = won.filter((r) => r._month === m).reduce((s, r) => s + (r._val ?? 0), 0)
      const b = isAD ? getADBudget(opts.filterUser!, [m], oiTargets) : (monthlyBudget[m] ?? 0)
      progressBar(s, b > 0 ? v / b : 0, startX + mi * colW + 0.05, barsY + 0.2, colW - 0.1, 0.1)
    })
  }

  // ══════════════════════════════════════════════════════════════════════
  // SLIDE 5 — QUARTERLY SUMMARY: Targets vs Actuals
  // ══════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide(); bg(s); chrome(s)
    heading(s, `Quarterly Summary — ${curQ} Focus`)

    // Quarter KPIs row
    const qKpis: [string, string, string, string][] = [
      [curQ + " WON",      fk(qWonVal),     `${qWon.length} deals`,           C.green],
      [curQ + " BUDGET",   fk(qBudget),     curQMonths.join(" · "),            C.white],
      [curQ + " COMMIT",   fk(qCommitVal),  `Pipe commit remaining`,            C.teal],
      ["PROJECTED",        fk(qProjected),  `At current run rate`,              qProjected >= qBudget ? C.green : C.amber],
    ]
    qKpis.forEach(([lbl, val, sub, col], i) =>
      kpiBox(s, lbl, val, sub, 0.35 + i * 2.3, 0.88, 2.15, 1.0, col)
    )
    progressBar(s, qPct, 0.35, 1.98, 9.0, 0.18)
    s.addText(`${fmtPct(qPct)} of ${curQ} budget achieved`, {
      x: 0.35, y: 2.18, w: 5, h: 0.2, fontSize: 8, fontFace: "Calibri", color: C.grey,
    })

    // All 4 quarters — targets vs actuals
    s.addShape("rect" as any, { x: 0.35, y: 2.5, w: 9.0, h: 0.26, fill: { color: C.card2 } })
    s.addText("QUARTER", { x: 0.45, y: 2.52, w: 1.0, h: 0.22, fontSize: 7, fontFace: "Calibri", color: C.grey, bold: true })
    ;["Budget", "Won", "Gap", "Commit Pipe", "Pipeline", "Win Rate"].forEach((h, i) => {
      s.addText(h, {
        x: 1.55 + i * 1.35, y: 2.52, w: 1.3, h: 0.22,
        fontSize: 7, fontFace: "Calibri", color: C.grey, bold: true, align: "center",
      })
    })

    const allQs = ["Q1", "Q2", "Q3", "Q4"]
    allQs.forEach((q, qi) => {
      const qms = QUARTERS[q]
      const qw  = won.filter((r) => qms.includes(r._month ?? "")).reduce((s, r) => s + (r._val ?? 0), 0)
      const qb  = isAD ? getADBudget(opts.filterUser!, qms, oiTargets) : getTeamBudgetForMonths(qms, oiTargets)
      const qgap = qb - qw
      const qcp = pipe.filter((r) => qms.includes(r._month ?? "") && r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0)
      const qp  = pipe.filter((r) => qms.includes(r._month ?? "")).reduce((s, r) => s + (r._val ?? 0), 0)
      const qwl = won.filter((r) => qms.includes(r._month ?? "")).length
      const qll = lost.filter((r) => qms.includes(r._month ?? "")).length
      const qwr = (qwl + qll) > 0 ? qwl / (qwl + qll) : 0
      const isCurQ = q === curQ
      const rowBg = isCurQ ? C.border : qi % 2 === 0 ? C.card : C.card2
      const rowY = 2.76 + qi * 0.36

      s.addShape("rect" as any, { x: 0.35, y: rowY, w: 9.0, h: 0.36, fill: { color: rowBg } })
      if (isCurQ) s.addShape("rect" as any, { x: 0.35, y: rowY, w: 0.06, h: 0.36, fill: { color: C.blue } })

      s.addText(q, { x: 0.45, y: rowY + 0.08, w: 1.0, h: 0.22, fontSize: 9, fontFace: "Calibri", color: isCurQ ? C.blue2 : C.white, bold: true })
      const vals = [fk(qb), fk(qw), qgap > 0 ? fk(qgap) : "✓", fk(qcp), fk(qp), fmtPct(qwr)]
      const vcols = [C.grey, C.green, qgap > 0 ? C.red : C.green, C.teal, C.grey, qwr >= 0.5 ? C.green : C.red]
      vals.forEach((v, i) => s.addText(v, {
        x: 1.55 + i * 1.35, y: rowY + 0.08, w: 1.3, h: 0.22,
        fontSize: 9, fontFace: "Calibri", color: vcols[i], align: "center", bold: i === 2 || i === 1,
      }))
    })

    // Quarter insight bullets
    const insY = 4.26
    s.addText("Quarter Insights", { x: 0.35, y: insY, w: 4, h: 0.2, fontSize: 8, fontFace: "Calibri", color: C.grey, bold: true })
    const qIns: Array<{ text: string; col: string }> = []
    if (qPct >= 1) qIns.push({ text: `${curQ} budget achieved — ${fmtPct(qPct)} vs target.`, col: C.green })
    else qIns.push({ text: `${curQ} at ${fmtPct(qPct)} — ${fk(qBudget - qWonVal)} gap. Commit covers ${fmtPct(qBudget > 0 ? (qWonVal + qCommitVal) / qBudget : 0)}.`, col: C.amber })
    if (qProjected >= qBudget) qIns.push({ text: `Run rate of ${fk(qRunRate)}/mo projects to ${fk(qProjected)} — on track.`, col: C.green })
    else qIns.push({ text: `Run rate projects ${fk(qProjected)} vs ${fk(qBudget)} target — acceleration needed.`, col: C.red })
    qIns.slice(0, 3).forEach((ins, i) => bullet(s, ins.text, 0.35, insY + 0.24 + i * 0.22, 4.5, ins.col))

    // Next Q preview
    const nextQIdx = allQs.indexOf(curQ) + 1
    if (nextQIdx < 4) {
      const nextQ = allQs[nextQIdx]
      const nextQMs = QUARTERS[nextQ]
      const nextQPipe = pipe.filter((r) => nextQMs.includes(r._month ?? ""))
      s.addText(`${nextQ} Preview`, { x: 5.1, y: insY, w: 4, h: 0.2, fontSize: 8, fontFace: "Calibri", color: C.grey, bold: true })
      bullet(s, `${fk(nextQPipe.reduce((s, r) => s + (r._val ?? 0), 0))} pipeline, ${nextQPipe.length} deals.`, 5.1, insY + 0.24, 4.2, C.grey)
      const nqCommit = nextQPipe.filter((r) => r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0)
      bullet(s, `${fk(nqCommit)} in commit — ${fmtPct(qBudget > 0 ? nqCommit / qBudget : 0)} of ${nextQ} budget if same.`, 5.1, insY + 0.46, 4.2, C.teal)
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // SLIDE 6 — ANNUAL SUMMARY: FY26 Targets vs Actuals + Benchmarks
  // ══════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide(); bg(s); chrome(s)
    heading(s, "FY26 Annual Summary")

    const pctB = annualBudget > 0 ? totalWon / annualBudget : 0
    const ytdGap = annualBudget - totalWon
    const fyRunMonths = MONTHS.filter((m) => won.some((r) => r._month === m)).length
    const fyRunRate = fyRunMonths > 0 ? totalWon / fyRunMonths : 0
    const fyProjected = fyRunRate * 12
    const winRate = (won.length + lost.length) > 0 ? won.length / (won.length + lost.length) : 0

    // Top KPIs
    const aKpis: [string, string, string, string][] = [
      ["FY26 WON",      fk(totalWon),    `${won.length} deals · ${fmtPct(pctB)} of budget`, C.green],
      ["FY26 BUDGET",   fk(annualBudget), isAD ? adLabel : "Annual OI target",               C.white],
      ["PROJECTED",     fk(fyProjected), `At ${fk(fyRunRate)}/mo run rate`,                  fyProjected >= annualBudget ? C.green : C.amber],
      ["TOTAL COMMIT",  fk(totalWon + totalCommit), "Won + pipeline commit",                 C.teal],
    ]
    aKpis.forEach(([lbl, val, sub, col], i) =>
      kpiBox(s, lbl, val, sub, 0.35 + i * 2.3, 0.88, 2.15, 1.0, col)
    )
    progressBar(s, pctB, 0.35, 1.98, 9.0, 0.18)
    s.addText(`${fmtPct(pctB)} achieved — ${ytdGap > 0 ? fk(ytdGap) + " to go" : "Budget exceeded ✓"}`, {
      x: 0.35, y: 2.18, w: 9, h: 0.2, fontSize: 8, fontFace: "Calibri",
      color: ytdGap > 0 ? C.amber : C.green,
    })

    // AD leaderboard with benchmarks
    s.addShape("rect" as any, { x: 0.35, y: 2.46, w: 5.4, h: 0.26, fill: { color: C.card2 } })
    ;["AD", "Won", "Target", "Attainment", "Benchmark"].forEach((h, i) => {
      const xs = [0.45, 1.35, 2.25, 3.15, 4.35]
      const ws = [0.85, 0.85, 0.85, 1.15, 0.85]
      s.addText(h, { x: xs[i], y: 2.48, w: ws[i], h: 0.22, fontSize: 7, fontFace: "Calibri", color: C.grey, bold: true })
    })

    const sortedADs = [...activeUsers].map((u) => {
      const uW = won.filter((r) => r.User === u).reduce((s, r) => s + (r._val ?? 0), 0)
      const uT = getADBudget(u, MONTHS, oiTargets)
      return { user: u, won: uW, target: uT, pct: uT > 0 ? uW / uT : 0 }
    }).sort((a, b) => b.pct - a.pct)

    const medals = ["🥇", "🥈", "🥉", "  ", "  "]
    sortedADs.forEach((u, i) => {
      const ry = 2.72 + i * 0.36
      const rowBg = i === 0 ? C.border : i % 2 === 0 ? C.card : C.card2
      s.addShape("rect" as any, { x: 0.35, y: ry, w: 5.4, h: 0.36, fill: { color: rowBg } })
      s.addText(medals[i] + " " + u.user.split(" ")[0], { x: 0.45, y: ry + 0.07, w: 0.85, h: 0.24, fontSize: 8.5, fontFace: "Calibri", color: i === 0 ? C.white : C.grey, bold: i === 0 })
      s.addText(fk(u.won),    { x: 1.35, y: ry + 0.07, w: 0.85, h: 0.24, fontSize: 8.5, fontFace: "Calibri", color: C.green, align: "center" })
      s.addText(fk(u.target), { x: 2.25, y: ry + 0.07, w: 0.85, h: 0.24, fontSize: 8.5, fontFace: "Calibri", color: C.grey,  align: "center" })
      // Attainment bar
      progressBar(s, u.pct, 3.15, ry + 0.1, 1.1, 0.16)
      s.addText(fmtPct(u.pct), { x: 3.15, y: ry + 0.14, w: 1.1, h: 0.14, fontSize: 7, fontFace: "Calibri", color: C.white, align: "center", bold: true })
      // Benchmark: green/amber/red dot
      const bCol = u.pct >= 1 ? C.green : u.pct >= 0.7 ? C.amber : C.red
      s.addShape("ellipse" as any, { x: 4.65, y: ry + 0.1, w: 0.18, h: 0.18, fill: { color: bCol } })
      const bLabel = u.pct >= 1 ? "At/Above" : u.pct >= 0.7 ? "On Track" : "Below"
      s.addText(bLabel, { x: 4.85, y: ry + 0.1, w: 0.8, h: 0.18, fontSize: 7.5, fontFace: "Calibri", color: bCol })
    })

    // Right side: Annual benchmarks + next steps
    s.addShape("rect" as any, { x: 6.1, y: 2.46, w: 3.25, h: 0.26, fill: { color: C.card2 } })
    s.addText("BENCHMARKS & NEXT STEPS", { x: 6.2, y: 2.48, w: 3.1, h: 0.22, fontSize: 7, fontFace: "Calibri", color: C.blue2, bold: true })

    const benchmarks = [
      { label: "Win rate",      value: fmtPct(winRate),       col: winRate >= 0.5 ? C.green : C.red },
      { label: "Avg deal size", value: fmt(won.length > 0 ? totalWon / won.length : 0), col: C.white },
      { label: "Services attach",value: fmtPct(won.length > 0 ? won.filter((r) => (r._services ?? 0) > 0).length / won.length : 0), col: C.white },
      { label: "Pipeline cover", value: fmtPct(totalWon > 0 ? totalPipe / annualBudget : 0), col: totalPipe / annualBudget >= 0.5 ? C.green : C.amber },
      { label: "Risk deals",     value: String(risks.length),  col: risks.length > 5 ? C.red : C.green },
    ]
    benchmarks.forEach((b, i) => {
      const by = 2.76 + i * 0.36
      s.addShape("rect" as any, { x: 6.1, y: by, w: 3.25, h: 0.36, fill: { color: i % 2 === 0 ? C.card : C.card2 } })
      s.addText(b.label, { x: 6.2, y: by + 0.09, w: 1.8, h: 0.2, fontSize: 8, fontFace: "Calibri", color: C.grey })
      s.addText(b.value, { x: 8.0, y: by + 0.09, w: 1.25, h: 0.2, fontSize: 9, fontFace: "Calibri", color: b.col, bold: true, align: "right" })
    })

    // FY next steps
    const nsY = 4.2
    s.addText("FY Next Steps", { x: 6.1, y: nsY, w: 3.25, h: 0.2, fontSize: 8, fontFace: "Calibri", color: C.grey, bold: true })
    const fyNextSteps = [
      ytdGap > 0 ? `${fk(ytdGap)} gap — target ${MONTHS.slice(curMIdx + 1, curMIdx + 3).join(", ")} heavily.` : "Budget exceeded — protect remaining months.",
      `Commit coverage: ${fmtPct(annualBudget > 0 ? (totalWon + totalCommit) / annualBudget : 0)} of FY budget.`,
      risks.length > 0 ? `${risks.length} risk deals need resolution — ${fk(risks.reduce((s, r) => s + (r._val ?? 0), 0))}.` : "Pipeline is clean.",
    ]
    fyNextSteps.forEach((t, i) => bullet(s, t, 6.1, nsY + 0.24 + i * 0.22, 3.25, C.grey))
  }

  // ══════════════════════════════════════════════════════════════════════
  // SLIDE 7 — CELEBRATE WINS: Month, Quarter, YTD
  // ══════════════════════════════════════════════════════════════════════
  {
    const s = pres.addSlide(); bg(s)
    // Festive gradient effect via overlapping shapes
    s.addShape("rect" as any, { x: 0, y: 0, w: 10, h: 5.62, fill: { color: C.bg } })
    s.addShape("ellipse" as any, { x: -1, y: -1, w: 5, h: 5, fill: { color: "1a0a0a", transparency: 40 } })
    s.addShape("ellipse" as any, { x: 7,  y: 2,  w: 4, h: 4, fill: { color: "0a1a1a", transparency: 40 } })
    s.addShape("rect" as any, { x: 0, y: 5.3, w: 10, h: 0.22, fill: { color: C.red } })

    s.addText("🏆  Celebrate Wins", { x: 0.35, y: 0.15, w: 9, h: 0.6, fontSize: 28, fontFace: "Calibri", color: C.white, bold: true })
    s.addShape("rect" as any, { x: 0.35, y: 0.7, w: 1.8, h: 0.04, fill: { color: C.red } })

    // Three columns: Month / Quarter / YTD
    const cols = [
      {
        label: curM,
        x: 0.35,
        deals: won.filter((r) => r._month === curM),
        budget: mBudget,
      },
      {
        label: curQ,
        x: 3.45,
        deals: won.filter((r) => curQMonths.includes(r._month ?? "")),
        budget: qBudget,
      },
      {
        label: "FY26 YTD",
        x: 6.55,
        deals: won,
        budget: annualBudget,
      },
    ]

    cols.forEach((col) => {
      const colW2 = 2.9
      const cWon = col.deals
      const cVal = cWon.reduce((s, r) => s + (r._val ?? 0), 0)
      const pct = col.budget > 0 ? cVal / col.budget : 0

      // Column header
      s.addShape("rect" as any, { x: col.x, y: 0.88, w: colW2, h: 0.36, fill: { color: C.card2 }, line: { color: C.border, width: 0.3 } })
      s.addText(col.label, { x: col.x + 0.1, y: 0.9, w: colW2 - 0.2, h: 0.2, fontSize: 10, fontFace: "Calibri", color: C.teal, bold: true })
      s.addText(`${fk(cVal)}  ·  ${cWon.length} deals`, { x: col.x + 0.1, y: 1.1, w: colW2 - 0.2, h: 0.16, fontSize: 7.5, fontFace: "Calibri", color: C.grey })

      // Progress bar
      progressBar(s, pct, col.x, 1.24, colW2, 0.1, C.teal)
      s.addText(fmtPct(pct) + " of budget", { x: col.x, y: 1.36, w: colW2, h: 0.16, fontSize: 7, fontFace: "Calibri", color: C.grey, align: "center" })

      // Top deals leaderboard
      const byAD = activeUsers.map((u) => {
        const uD = cWon.filter((r) => r.User === u)
        return { name: u.split(" ")[0], val: uD.reduce((s, r) => s + (r._val ?? 0), 0), deals: uD.length }
      }).filter((u) => u.deals > 0).sort((a, b) => b.val - a.val)

      const topVal = byAD[0]?.val ?? 1
      const medals2 = ["🥇", "🥈", "🥉"]

      byAD.slice(0, 4).forEach((u, i) => {
        const ry2 = 1.58 + i * 0.6
        const barW = (u.val / topVal) * (colW2 - 0.24)
        s.addShape("rect" as any, { x: col.x, y: ry2, w: colW2, h: 0.56, fill: { color: C.card } })
        s.addText(medals2[i] ?? "⭐", { x: col.x + 0.05, y: ry2 + 0.07, w: 0.3, h: 0.3, fontSize: 14, fontFace: "Calibri", color: C.white })
        s.addText(u.name, { x: col.x + 0.38, y: ry2 + 0.06, w: 1.5, h: 0.22, fontSize: 9, fontFace: "Calibri", color: C.white, bold: i === 0 })
        s.addText(`${fk(u.val)} · ${u.deals}`, { x: col.x + 0.38, y: ry2 + 0.28, w: 1.5, h: 0.18, fontSize: 7.5, fontFace: "Calibri", color: C.grey })
        // Mini bar
        s.addShape("rect" as any, { x: col.x + 0.04, y: ry2 + 0.48, w: colW2 - 0.08, h: 0.06, fill: { color: C.border } })
        if (barW > 0) s.addShape("rect" as any, { x: col.x + 0.04, y: ry2 + 0.48, w: barW, h: 0.06, fill: { color: [C.red, C.teal, C.green, C.amber][i] ?? C.grey } })
      })

      // Top deal callout
      const topDeal = [...cWon].sort((a, b) => (b._val ?? 0) - (a._val ?? 0))[0]
      if (topDeal && (topDeal._val ?? 0) > 20000) {
        const tdY = 1.58 + Math.min(byAD.length, 4) * 0.6 + 0.08
        s.addShape("rect" as any, { x: col.x, y: tdY, w: colW2, h: 0.36, fill: { color: C.card2 }, line: { color: C.red, width: 0.5 } })
        s.addText("🌟 Deal of " + col.label, { x: col.x + 0.08, y: tdY + 0.04, w: colW2 - 0.1, h: 0.16, fontSize: 7, fontFace: "Calibri", color: C.red, bold: true })
        s.addText(`${topDeal["Account Name"] ?? ""} — ${fk(topDeal._val ?? 0)}`, {
          x: col.x + 0.08, y: tdY + 0.18, w: colW2 - 0.1, h: 0.16, fontSize: 8, fontFace: "Calibri", color: C.white,
        })
      }
    })
  }

  pres.writeFile({ fileName: `EVE_Forecast_${adLabel.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pptx` })
}
