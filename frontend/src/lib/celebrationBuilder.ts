import type { Deal } from "@/types"
import { USERS } from "@/config/users"
import { MONTHS, QUARTERS } from "@/config/months"
import { fk, fmt } from "./formatters"
import { getADBudget, getTeamBudgetForMonths } from "./budgetHelpers"
import type { BudgetTargets } from "@/types"

interface CelebOptions {
  variation?: number
  oiTargets: BudgetTargets
  monthlyBudget: Record<string, number>
  allData: Deal[]
}

function pick<T>(arr: T[], v: number, total: number): T {
  return arr[(v + total) % arr.length]
}

export function generateCelebration(
  wonDeals: Deal[],
  month: string,
  opts: CelebOptions
): string {
  const { variation = 0, oiTargets, monthlyBudget, allData } = opts
  const v = variation
  const totalVal = wonDeals.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalDeals = wonDeals.length
  if (totalDeals === 0) return ""

  // Group wins by AD
  const byAD: Record<string, Deal[]> = {}
  wonDeals.forEach((r) => {
    const ad = r.User ?? "Unknown"
    if (!byAD[ad]) byAD[ad] = []
    byAD[ad].push(r)
  })

  const intros = [
    `What a month! Let's talk about ${month} wins`,
    `${month} has been HUGE for the team`,
    `Stop what you're doing — ${month} results are in`,
    `The ${month} scoreboard is looking incredible`,
    `Another strong month in the books — ${month} delivered`,
    `${month} wrap-up — the team showed up big time`,
  ]

  let post = `🏆 ${pick(intros, v, totalDeals)}! 🏆\n\n`
  post += `💰 ${totalDeals} deals closed for ${fk(totalVal)} 💰\n\n`

  const adEntries = Object.entries(byAD).sort(
    (a, b) =>
      b[1].reduce((s, r) => s + (r._val ?? 0), 0) -
      a[1].reduce((s, r) => s + (r._val ?? 0), 0)
  )

  post += `📊 ${month} LEADERBOARD 📊\n\n`
  const topAdVal = adEntries.length > 0
    ? adEntries[0][1].reduce((s, r) => s + (r._val ?? 0), 0)
    : 1

  adEntries.forEach(([ad, deals], i) => {
    const adVal = deals.reduce((s, r) => s + (r._val ?? 0), 0)
    const firstName = ad.split(" ")[0]
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐"
    const barLen = Math.max(1, Math.round((adVal / topAdVal) * 12))
    const bar = "▓".repeat(barLen)
    post += `${medal} ${bar} ${firstName} ${fk(adVal)} (${deals.length})\n`
  })
  post += "\n"

  adEntries.forEach(([ad, deals], i) => {
    const adVal = deals.reduce((s, r) => s + (r._val ?? 0), 0)
    const firstName = ad.split(" ")[0]
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐"
    post += `${medal} ${firstName} — ${fk(adVal)} (${deals.length} deal${deals.length > 1 ? "s" : ""})\n`
    deals.forEach((r) => {
      const bigDeal = (r._val ?? 0) > 30000 ? " 🔥" : ""
      post += `   ✅ ${r["Account Name"] ?? ""} — ${r._product ?? ""} ${fk(r._val ?? 0)}${bigDeal}\n`
    })
    post += "\n"
  })

  // Top deal callout
  const topDeal = wonDeals[0]
  if (topDeal && (topDeal._val ?? 0) > 20000) {
    post += `🌟 Deal of the month: ${topDeal["Account Name"] ?? ""} (${fk(topDeal._val ?? 0)}) by ${(topDeal.User ?? "").split(" ")[0]} — what a result! 🌟\n\n`
  }

  // Services shoutout
  const svcDeals = wonDeals.filter((r) => (r._services ?? 0) > 0)
  if (svcDeals.length > 0) {
    const svcTotal = svcDeals.reduce((s, r) => s + (r._services ?? 0), 0)
    post += `🛠️ ${fk(svcTotal)} in services across ${svcDeals.length} deals — great attach rate!\n\n`
  }

  // Next steps
  const curIdx = MONTHS.indexOf(month)
  const nextMonth = MONTHS[(curIdx + 1) % 12]
  const pipe = allData.filter((r) => r._stageSummary === "Pipe")
  const nextPipe = pipe.filter((r) => r._month === nextMonth)
  const nextCommits = nextPipe.filter((r) => r._commit === "Commit")
  const nextCommitVal = nextCommits.reduce((s, r) => s + (r._val ?? 0), 0)
  const nextBudget = monthlyBudget[nextMonth] ?? 0
  const risks = pipe.filter((r) => r._risk === "Risk").sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
  const allWon = allData.filter((r) => r._stageSummary === "Won")
  const annualTarget = getTeamBudgetForMonths(MONTHS, oiTargets)
  const ytdWon = allWon.reduce((s, r) => s + (r._val ?? 0), 0)
  const ytdPct = annualTarget ? ytdWon / annualTarget : 0

  post += `📋 WHAT'S NEXT 📋\n\n`
  post += `👉 ${nextMonth} pipeline: ${fk(nextPipe.reduce((s, r) => s + (r._val ?? 0), 0))} across ${nextPipe.length} deals`
  if (nextCommits.length > 0) post += ` (${fk(nextCommitVal)} committed)`
  post += "\n"

  const focuses: string[] = []
  if (risks.length > 0) {
    focuses.push(`⚠️ ${risks.length} risk deal${risks.length > 1 ? "s" : ""} need attention (${fk(risks.reduce((s, r) => s + (r._val ?? 0), 0))}). Top: ${risks[0]["Opportunity Name"]} — let's get this resolved`)
  }
  if (nextCommitVal > 0) {
    focuses.push(`🎯 ${fk(nextCommitVal)} in commit for ${nextMonth} — let's convert these early and build momentum`)
  }
  if (nextBudget > 0 && nextCommitVal < nextBudget) {
    focuses.push(`📊 ${nextMonth} budget is ${fk(nextBudget)} — commit covers ${Math.round((nextCommitVal / nextBudget) * 100)}%. Need to push upside deals over the line`)
  }
  focuses.push(`📈 YTD: ${fk(ytdWon)} (${Math.round(ytdPct * 100)}% of annual target) — ${ytdPct >= 0.5 ? "tracking well, keep it up!" : "need to accelerate to hit target"}`)

  focuses.forEach((f) => (post += `${f}\n`))
  post += "\n"

  const closings = [
    `Keep this energy going team — let's make ${nextMonth} even bigger! 🚀`,
    `Massive effort from everyone — onwards and upwards into ${nextMonth}! 💪`,
    `This is what happens when the team fires on all cylinders! Let's carry it into ${nextMonth} 🔥`,
    `Incredible work all round — ${nextMonth}, we're coming for you! 📈`,
    `What a team! ${nextMonth} — let's go again! 💥`,
  ]
  post += pick(closings, v, totalDeals)

  return post
}

export function generateMultiMonthCelebration(
  wonDeals: Deal[],
  label: string,
  monthsList: string[],
  opts: CelebOptions
): string {
  const { allData, oiTargets } = opts
  const totalVal = wonDeals.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalDeals = wonDeals.length
  if (totalDeals === 0) return ""

  const intros = [
    `${label} has been outstanding`,
    `Let's celebrate an incredible ${label}`,
    `The numbers are in for ${label} — wow`,
  ]
  let post = `🏆 ${intros[Math.floor(Math.random() * intros.length)]}! 🏆\n\n`
  post += `💰 ${totalDeals} deals closed for ${fk(totalVal)} across ${monthsList.join(", ")} 💰\n\n`

  post += `📅 MONTH BY MONTH 📅\n`
  monthsList.forEach((m) => {
    const mDeals = wonDeals.filter((r) => r._month === m)
    const mVal = mDeals.reduce((s, r) => s + (r._val ?? 0), 0)
    if (mDeals.length > 0) {
      post += `${m}: ${fk(mVal)} (${mDeals.length} deal${mDeals.length > 1 ? "s" : ""})\n`
    }
  })
  post += "\n"

  const byAD: Record<string, Deal[]> = {}
  wonDeals.forEach((r) => {
    const ad = r.User ?? "Unknown"
    if (!byAD[ad]) byAD[ad] = []
    byAD[ad].push(r)
  })
  const adEntries = Object.entries(byAD).sort(
    (a, b) =>
      b[1].reduce((s, r) => s + (r._val ?? 0), 0) -
      a[1].reduce((s, r) => s + (r._val ?? 0), 0)
  )
  const topAdVal = adEntries.length > 0
    ? adEntries[0][1].reduce((s, r) => s + (r._val ?? 0), 0)
    : 1

  post += `📊 ${label} LEADERBOARD 📊\n\n`
  adEntries.forEach(([ad, deals], i) => {
    const adVal = deals.reduce((s, r) => s + (r._val ?? 0), 0)
    const firstName = ad.split(" ")[0]
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐"
    const barLen = Math.max(1, Math.round((adVal / topAdVal) * 12))
    post += `${medal} ${"▓".repeat(barLen)} ${firstName} ${fk(adVal)} (${deals.length})\n`
  })
  post += "\n"

  adEntries.forEach(([ad, deals], i) => {
    const adVal = deals.reduce((s, r) => s + (r._val ?? 0), 0)
    const firstName = ad.split(" ")[0]
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐"
    post += `${medal} ${firstName} — ${fk(adVal)} (${deals.length} deal${deals.length > 1 ? "s" : ""})\n`
    deals
      .sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
      .slice(0, 5)
      .forEach((r) => {
        const bigDeal = (r._val ?? 0) > 30000 ? " 🔥" : ""
        post += `   ✅ ${r["Account Name"] ?? ""} — ${r._product ?? ""} ${fk(r._val ?? 0)}${bigDeal}\n`
      })
    if (deals.length > 5) post += `   ... and ${deals.length - 5} more\n`
    post += "\n"
  })

  const topDeal = wonDeals.sort((a, b) => (b._val ?? 0) - (a._val ?? 0))[0]
  if (topDeal && (topDeal._val ?? 0) > 20000) {
    post += `🌟 Deal of ${label}: ${topDeal["Account Name"] ?? ""} (${fk(topDeal._val ?? 0)}) by ${(topDeal.User ?? "").split(" ")[0]} 🌟\n\n`
  }

  const svcDeals = wonDeals.filter((r) => (r._services ?? 0) > 0)
  if (svcDeals.length > 0) {
    post += `🛠️ ${fk(svcDeals.reduce((s, r) => s + (r._services ?? 0), 0))} in services across ${svcDeals.length} deals\n\n`
  }

  const pipe = allData.filter((r) => r._stageSummary === "Pipe")
  const risks = pipe.filter((r) => r._risk === "Risk").sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
  const allWon = allData.filter((r) => r._stageSummary === "Won")
  const annualTarget = getTeamBudgetForMonths(MONTHS, oiTargets)
  const ytdWon = allWon.reduce((s, r) => s + (r._val ?? 0), 0)
  const ytdPct = annualTarget ? ytdWon / annualTarget : 0
  const commitPipe = pipe.filter((r) => r._commit === "Commit")

  post += `📋 LOOKING AHEAD 📋\n\n`
  post += `📈 YTD: ${fk(ytdWon)} (${Math.round(ytdPct * 100)}% of annual target)\n`
  if (risks.length > 0)
    post += `⚠️ ${risks.length} risk deal${risks.length > 1 ? "s" : ""} to resolve (${fk(risks.reduce((s, r) => s + (r._val ?? 0), 0))})\n`
  if (commitPipe.length > 0)
    post += `🎯 ${fk(commitPipe.reduce((s, r) => s + (r._val ?? 0), 0))} in commit pipeline — keep converting!\n`
  post += "\n"

  const closings = [
    `What a ${label}! Let's keep building on this momentum 🚀`,
    `Massive team effort across ${label} — the best is yet to come 💪`,
    `${label} done and dusted — onwards to even bigger things! 🔥`,
  ]
  post += closings[Math.floor(Math.random() * closings.length)]
  return post
}
