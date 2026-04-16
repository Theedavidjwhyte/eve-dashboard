import type { Deal, Filters, BudgetTargets } from "@/types"
import { USERS } from "@/config/users"
import { MONTHS, QUARTERS } from "@/config/months"
import { fmt, fk, fmtPct } from "./formatters"
import { getADBudget, getTeamBudgetForMonths } from "./budgetHelpers"
import { getSelectedMonths, monthMatchesFilter } from "@/store/dashboardStore"

interface AnalysisContext {
  data: Deal[]
  filters: Filters
  oiTargets: BudgetTargets
  monthlyBudget: Record<string, number>
}

function getFiltered(ctx: AnalysisContext, includeLost = false): Deal[] {
  return ctx.data.filter((r) => {
    if (!includeLost && r._stageSummary === "Lost") return false
    if (ctx.filters.user !== "All" && r.User !== ctx.filters.user) return false
    if (
      ctx.filters.month !== "All" &&
      !monthMatchesFilter(r._month ?? "", ctx.filters.month)
    )
      return false
    if (ctx.filters.product !== "All" && r._product !== ctx.filters.product)
      return false
    if (ctx.filters.keyDeals && (r._abc ?? 0) <= 30000) return false
    return true
  })
}

interface ADProfile {
  user: string
  won: Deal[]
  pipe: Deal[]
  lost: Deal[]
  wonVal: number
  pipeVal: number
  lostVal: number
  target: number
  pct: number
  risks: Deal[]
  commits: Deal[]
  winRate: number
  svcAttach: number
  avgDeal: number
  cleanWins: number
  topProds: [string, number][]
}

function buildADProfile(
  user: string,
  allData: Deal[],
  oiTargets: BudgetTargets
): ADProfile {
  const won = allData.filter((r) => r._stageSummary === "Won" && r.User === user)
  const pipe = allData.filter((r) => r._stageSummary === "Pipe" && r.User === user)
  const lost = allData.filter((r) => r._stageSummary === "Lost" && r.User === user)
  const wonVal = won.reduce((s, r) => s + (r._val ?? 0), 0)
  const pipeVal = pipe.reduce((s, r) => s + (r._val ?? 0), 0)
  const lostVal = lost.reduce((s, r) => s + (r._val ?? 0), 0)
  const target = getADBudget(user, MONTHS, oiTargets)
  const risks = pipe.filter((r) => r._risk === "Risk")
  const commits = pipe.filter((r) => r._commit === "Commit")
  const winRate = won.length + lost.length > 0 ? won.length / (won.length + lost.length) : 0
  const svcAttach = won.length > 0 ? won.filter((r) => (r._services ?? 0) > 0).length / won.length : 0
  const avgDeal = won.length > 0 ? wonVal / won.length : 0
  const cleanWins = won.filter((r) => r._push === 0).length
  const prodMap: Record<string, number> = {}
  won.forEach((r) => {
    const p = r._product ?? "Other"
    prodMap[p] = (prodMap[p] ?? 0) + (r._val ?? 0)
  })
  const topProds = Object.entries(prodMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3) as [string, number][]

  return { user, won, pipe, lost, wonVal, pipeVal, lostVal, target, pct: target ? wonVal / target : 0, risks, commits, winRate, svcAttach, avgDeal, cleanWins, topProds }
}

export function analyseQuery(query: string, ctx: AnalysisContext): string {
  const ql = query.toLowerCase()
  const allFiltered = getFiltered(ctx, true)
  const won = allFiltered.filter((r) => r._stageSummary === "Won")
  const pipe = allFiltered.filter((r) => r._stageSummary === "Pipe")
  const lost = allFiltered.filter((r) => r._stageSummary === "Lost")
  const risks = pipe.filter((r) => r._risk === "Risk").sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
  const commits = pipe.filter((r) => r._commit === "Commit")
  const annualBudget = Object.values(ctx.monthlyBudget).reduce((a, b) => a + b, 0)
  const totalWon = won.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalPipe = pipe.reduce((s, r) => s + (r._val ?? 0), 0)

  // Detect AD from question or filter — always resolve to a single string or null
  let targetAD: string | null = null
  if (ctx.filters.user !== "All") {
    const u = ctx.filters.user
    if (typeof u === "string") targetAD = u
    else if (Array.isArray(u) && u.length === 1) targetAD = u[0]
    // multiple ADs selected — no single targetAD, use team analysis
  }
  if (!targetAD) {
    targetAD =
      USERS.find(
        (u) =>
          ql.includes(u.toLowerCase()) ||
          ql.includes(u.split(" ")[0].toLowerCase())
      ) ?? null
  }

  // ── STRENGTHS ──────────────────────────────────────────────────────────────
  if (ql.includes("strength") || ql.includes("good at") || ql.includes("doing well")) {
    if (targetAD) {
      const u = buildADProfile(targetAD, ctx.data, ctx.oiTargets)
      let r = `**${u.user} — Strengths**\n\n`
      const s: string[] = []
      if (u.winRate > 0.6) s.push(`**High win rate (${fmtPct(u.winRate)})** — qualifying deals well and converting effectively.`)
      if (u.cleanWins > u.won.length * 0.5) s.push(`**Clean closer** — ${u.cleanWins} of ${u.won.length} deals closed with zero pushes.`)
      if (u.avgDeal > 20000) s.push(`**Big deal hunter** — average deal size ${fmt(u.avgDeal)}.`)
      if (u.svcAttach > 0.4) s.push(`**Services champion** — ${fmtPct(u.svcAttach)} services attach rate.`)
      if (u.pct > 0.5) s.push(`**On track** — at ${fmtPct(u.pct)} of annual target with ${fmt(u.pipeVal)} in pipeline.`)
      if (u.topProds.length > 0) s.push(`**Product knowledge** — strongest in ${u.topProds.map(([p, v]) => `${p} (${fmt(v)})`).join(", ")}.`)
      if (u.risks.length === 0 && u.pipe.length > 0) s.push(`**Clean pipeline** — no risk deals.`)
      if (s.length === 0) s.push("Limited data to assess strengths — needs more closed deals for a clear picture.")
      r += s.map((x, i) => `${i + 1}. ${x}`).join("\n")
      return r
    }
  }

  // ── WEAKNESSES / SUPPORT ──────────────────────────────────────────────────
  if (ql.includes("weakness") || ql.includes("improve") || ql.includes("struggle") || ql.includes("need support") || ql.includes("help")) {
    if (targetAD) {
      const u = buildADProfile(targetAD, ctx.data, ctx.oiTargets)
      let r = `**${u.user} — Areas for Development**\n\n`
      const issues: string[] = []
      if (u.winRate < 0.4 && u.won.length + u.lost.length > 2) issues.push(`**Low win rate (${fmtPct(u.winRate)})** — losing more than winning. Review qualification criteria.`)
      if (u.pct < 0.4) issues.push(`**Behind target** — at ${fmtPct(u.pct)} with ${fmt(u.target - u.wonVal)} gap.`)
      if (u.risks.length > 0) issues.push(`**${u.risks.length} risk deals** worth ${fmt(u.risks.reduce((s, r) => s + (r._val ?? 0), 0))} need attention.`)
      if (u.svcAttach < 0.2 && u.won.length > 2) issues.push(`**Low services attach (${fmtPct(u.svcAttach)})** — missing revenue opportunity.`)
      const lostCommits = u.lost.filter((r) => r._commit === "Commit")
      if (lostCommits.length > 0) issues.push(`**Forecast accuracy** — ${lostCommits.length} Commit deal${lostCommits.length > 1 ? "s" : ""} lost. Tighten commit criteria.`)
      if (issues.length === 0) issues.push(`No major red flags — ${u.user} is performing well. Focus on maintaining momentum.`)
      r += issues.map((x, i) => `${i + 1}. ${x}`).join("\n")
      return r
    }
  }

  // ── COACHING ──────────────────────────────────────────────────────────────
  if (ql.includes("coach") || ql.includes("how can i help") || ql.includes("develop") || ql.includes("mentor")) {
    if (targetAD) {
      const u = buildADProfile(targetAD, ctx.data, ctx.oiTargets)
      let r = `**Coaching Plan — ${u.user}**\n\n`
      const actions: string[] = []
      if (u.pct < 0.5) actions.push(`**Pipeline review:** Identify 3 deals that can be accelerated this month. Gap is ${fmt(u.target - u.wonVal)}.`)
      if (u.risks.length > 0) actions.push(`**Risk deal intervention:** Join ${u.user.split(" ")[0]} on calls for ${u.risks.slice(0, 2).map((r) => r["Opportunity Name"]).join(" and ")}. Help unblock or qualify out.`)
      if (u.winRate < 0.5 && u.lost.length > 1) actions.push(`**Loss review:** Go through ${u.lost.length} lost deals together. Identify patterns.`)
      if (u.svcAttach < 0.3) actions.push(`**Services coaching:** Target services on every deal over £15k.`)
      if (u.commits.length > 0) actions.push(`**Commit conversion:** ${u.commits.length} deals in commit (${fmt(u.commits.reduce((s, r) => s + (r._val ?? 0), 0))}). What's the specific next step to close this week?`)
      // MEDDPICC coaching
      const meddpiccDeals = u.pipe.filter((r) => r._meddpicc !== undefined)
      if (meddpiccDeals.length > 0) {
        const weakMeddpicc = meddpiccDeals.filter((r) => (r._meddpicc ?? 0) < 40)
        const avgScore = Math.round(meddpiccDeals.reduce((s, r) => s + (r._meddpicc ?? 0), 0) / meddpiccDeals.length)
        if (weakMeddpicc.length > 0) actions.push(`**MEDDPICC alert:** ${weakMeddpicc.length} deal${weakMeddpicc.length > 1 ? "s" : ""} scoring below 40% — ${weakMeddpicc.slice(0, 2).map(r => String(r["Opportunity Name"] ?? "")).join(", ")}. Review qualification urgently.`)
        else actions.push(`**MEDDPICC health:** Average score ${avgScore}% across ${meddpiccDeals.length} scored deals. ${avgScore >= 70 ? "Strong qualification discipline." : "Room to improve — focus on economic buyer and champion identification."}`)
      }
      if (actions.length === 0) actions.push(`${u.user} is performing well. Focus on maintaining pipeline and sharing approach with the team.`)
      r += actions.map((x, i) => `${i + 1}. ${x}`).join("\n\n")
      return r
    }
  }

  // ── COMPARE ADs ───────────────────────────────────────────────────────────
  if (ql.includes("compare") || ql.includes(" vs ") || ql.includes("all ads") || ql.includes("leaderboard")) {
    const profiles = USERS.map((u) => buildADProfile(u, ctx.data, ctx.oiTargets)).sort((a, b) => b.pct - a.pct)
    let r = `**AD Comparison**\n\n`
    r += `| AD | Won | % Target | Win Rate | Avg Deal | Svc Attach | Risks |\n`
    r += `|---|---|---|---|---|---|---|\n`
    profiles.forEach((u) => {
      r += `| ${u.user.split(" ")[0]} | ${fmt(u.wonVal)} | ${fmtPct(u.pct)} | ${fmtPct(u.winRate)} | ${fmt(u.avgDeal)} | ${fmtPct(u.svcAttach)} | ${u.risks.length} |\n`
    })
    const best = profiles[0], worst = profiles[profiles.length - 1]
    r += `\n**Top performer:** ${best.user} at ${fmtPct(best.pct)} with ${fmtPct(best.winRate)} win rate.\n`
    r += `**Needs support:** ${worst.user} at ${fmtPct(worst.pct)}. Focus coaching here.`
    return r
  }

  // ── FORECAST CALL PREP ────────────────────────────────────────────────────
  if (ql.includes("forecast call") || ql.includes("present") || ql.includes("leadership update")) {
    const gap = annualBudget - totalWon
    const commitVal = commits.reduce((s, r) => s + (r._val ?? 0), 0)
    let r = `**Forecast Call Talking Points**\n\n`
    r += `**1. Headlines:** YTD ${fmt(totalWon)} (${fmtPct(annualBudget ? totalWon / annualBudget : 0)} of budget). Gap: ${fmt(gap)}. Commit pipeline: ${fmt(commitVal)}.\n\n`
    r += `**2. Key risks:** ${risks.length > 0 ? `${risks.length} deals worth ${fmt(risks.reduce((s, r) => s + (r._val ?? 0), 0))}. Top: ${risks.slice(0, 2).map((d) => `${d["Opportunity Name"]} (${fmt(d._val ?? 0)})`).join(", ")}.` : "No risk deals — clean pipeline."}\n\n`
    r += `**3. Wins to celebrate:** ${won.slice(0, 3).map((r) => `${(r.User ?? "").split(" ")[0]} — ${r["Account Name"]} ${fmt(r._val ?? 0)}`).join(", ")}\n\n`
    r += `**4. Ask:** ${risks.length > 0 ? `Support de-risking ${risks[0]["Opportunity Name"]}.` : "Pipeline generation — need more coverage for upcoming months."}`
    return r
  }

  // ── RISK ─────────────────────────────────────────────────────────────────
  if (ql.includes("risk") || ql.includes("danger") || ql.includes("concern")) {
    const meddpiccRisks = pipe.filter((r) => r._meddpicc !== undefined && r._meddpicc < 40)
      .sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
    if (risks.length === 0 && meddpiccRisks.length === 0) return "Good news — no deals are flagged as at risk right now."
    const top = risks.slice(0, 5)
    let r = `**${risks.length} deals at risk** worth **${fmt(risks.reduce((s, r) => s + (r._val ?? 0), 0))}**. The biggest:\n\n`
    top.forEach((d) => {
      r += `• **${d["Opportunity Name"]}** (${(d.User ?? "").split(" ")[0]}) — ${fmt(d._val ?? 0)}, ${d._push} pushes, ${d._stageDur} days in ${d.Stage}`
      if (d._meddpicc !== undefined) r += `, MEDDPICC: ${d._meddpicc}%`
      r += `\n`
    })
    if (meddpiccRisks.length > 0) {
      r += `\n**⚠️ Low MEDDPICC scores (under 40%):**\n`
      meddpiccRisks.slice(0, 3).forEach((d) => {
        r += `• **${d["Opportunity Name"]}** (${(d.User ?? "").split(" ")[0]}) — ${fmt(d._val ?? 0)}, score: ${d._meddpicc}%\n`
      })
    }
    if (top.length > 0) r += `\nFocus on ${top[0]["Opportunity Name"]} first — highest value risk at ${fmt(top[0]._val ?? 0)}.`
    return r
  }

  // ── WIN/LOSS ──────────────────────────────────────────────────────────────
  if ((ql.includes("win") && ql.includes("loss")) || ql.includes("win rate") || ql.includes("losing")) {
    const winRate = won.length + lost.length > 0 ? won.length / (won.length + lost.length) : 0
    const lostCommits = lost.filter((r) => r._commit === "Commit")
    let r = `**Win/Loss Analysis**\n\n`
    r += `Team win rate: **${fmtPct(winRate)}** (${won.length}W / ${lost.length}L)\n`
    r += `Won: ${fmt(totalWon)} | Lost: ${fmt(lost.reduce((s, r) => s + (r._val ?? 0), 0))}\n\n`
    if (lostCommits.length > 0) r += `**⚠️ Forecast concern:** ${lostCommits.length} deal${lostCommits.length > 1 ? "s were" : " was"} Commit then lost.\n\n`
    r += `**By AD:**\n`
    USERS.forEach((u) => {
      const uW = won.filter((r) => r.User === u).length
      const uL = lost.filter((r) => r.User === u).length
      if (uW + uL > 0) r += `${u.split(" ")[0]}: ${fmtPct(uW / (uW + uL))} (${uW}W/${uL}L)\n`
    })
    return r
  }

  // ── SERVICES ──────────────────────────────────────────────────────────────
  if (ql.includes("service")) {
    const wonSvc = won.filter((r) => (r._services ?? 0) > 0)
    const pipeSvc = pipe.filter((r) => (r._services ?? 0) > 0)
    const pipeNoSvc = pipe.filter((r) => !(r._services) && (r._val ?? 0) > 15000)
    const totalSvc = wonSvc.reduce((s, r) => s + (r._services ?? 0), 0)
    const attachRate = won.length > 0 ? wonSvc.length / won.length : 0
    let r = `**Services Analysis**\n\n`
    r += `Won services: ${fmt(totalSvc)} across ${wonSvc.length} deals (${fmtPct(attachRate)} attach rate)\n`
    r += `Pipeline services: ${fmt(pipeSvc.reduce((s, r) => s + (r._services ?? 0), 0))} across ${pipeSvc.length} deals\n`
    r += `Missing services: ${pipeNoSvc.length} pipeline deals >£15k with no services\n\n`
    if (pipeNoSvc.length > 0)
      r += `**Action:** ${pipeNoSvc.slice(0, 3).map((d) => `${(d.User ?? "").split(" ")[0]} — ${d["Opportunity Name"]} (${fmt(d._val ?? 0)})`).join(", ")} — scope services before close.`
    return r
  }

  // ── BUDGET / GAP ──────────────────────────────────────────────────────────
  if (ql.includes("budget") || ql.includes("gap") || ql.includes("target")) {
    const gap = annualBudget - totalWon
    const commitVal = commits.reduce((s, r) => s + (r._val ?? 0), 0)
    let r = `**Budget Gap Analysis**\n\n`
    r += `Annual budget: ${fmt(annualBudget)}\nYTD won: ${fmt(totalWon)} (${fmtPct(annualBudget ? totalWon / annualBudget : 0)})\nGap: **${fmt(gap)}**\nCommit pipeline: ${fmt(commitVal)} (covers ${fmtPct(gap > 0 ? commitVal / gap : 1)} of gap)\n\n`
    if (gap > commitVal)
      r += `**⚠️ Commit pipeline doesn't cover the gap.** Need ${fmt(gap - commitVal)} more in commit.`
    else
      r += `**✅ Commit pipeline covers the gap.** Focus on converting to closed won.`
    return r
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  if (ql.includes("summary") || ql.includes("overview") || ql.includes("status") || ql.includes("where are") || ql.includes("how are")) {
    const pct = annualBudget ? totalWon / annualBudget : 0
    return `**FY26 Overview**\nYTD Closed Won: ${fmt(totalWon)} (${fmtPct(pct)} of ${fmt(annualBudget)} budget)\nOpen Pipeline: ${fmt(totalPipe)} (${pipe.length} deals)\nCommit Pipeline: ${fmt(commits.reduce((s, r) => s + (r._val ?? 0), 0))}\nAt Risk: ${fmt(risks.reduce((s, r) => s + (r._val ?? 0), 0))} (${risks.length} deals)\nGap to budget: ${fmt(annualBudget - totalWon)}`
  }

  // ── SPECIFIC AD (fallback) ────────────────────────────────────────────────
  if (targetAD) {
    const u = buildADProfile(targetAD, ctx.data, ctx.oiTargets)
    let r = `**${u.user}**\n\n`
    r += `**Performance:** ${fmt(u.wonVal)} won (${fmtPct(u.pct)} of ${fmt(u.target)} target) · ${u.won.length} deals · Avg ${fmt(u.avgDeal)}\n`
    r += `**Win rate:** ${fmtPct(u.winRate)} (${u.won.length}W / ${u.lost.length}L)\n`
    r += `**Pipeline:** ${fmt(u.pipeVal)} across ${u.pipe.length} deals · ${u.commits.length} commits (${fmt(u.commits.reduce((s, r) => s + (r._val ?? 0), 0))})\n`
    r += `**Services:** ${fmtPct(u.svcAttach)} attach rate\n`
    r += `**Risk:** ${u.risks.length > 0 ? `${u.risks.length} deals worth ${fmt(u.risks.reduce((s, r) => s + (r._val ?? 0), 0))}` : "Clean — no risk deals"}\n`
    if (u.topProds.length > 0) r += `**Top products:** ${u.topProds.map(([p, v]) => `${p} (${fmt(v)})`).join(", ")}`
    return r
  }

  // ── FALLBACK ──────────────────────────────────────────────────────────────
  return `Here's what I can analyse:\n\n**People** — "What are Chevonne's strengths?" · "Where does Dan need support?"\n**Coaching** — "Coaching plan for Sam" · "Compare all ADs"\n**Forecast** — "What should I present at the forecast call?" · "How do I close the budget gap?"\n**Pipeline** — "Show me commit pipeline" · "Which deals should I escalate?"\n**Analysis** — "Win/loss analysis" · "Services breakdown"\n**Status** — "How is Q3?" · "Where's my biggest risk?"`
}
