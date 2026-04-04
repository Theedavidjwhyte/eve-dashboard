import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KPI } from "@/components/ui/kpi"
import { PctBar } from "@/components/shared/PctBar"
import { useDashboardStore, getSelectedMonths } from "@/store/dashboardStore"
import { analyseQuery } from "@/lib/analysisEngine"
import { getADBudget, getTeamBudgetForMonths } from "@/lib/budgetHelpers"
import { fmt, fmtPct } from "@/lib/formatters"
import { USERS } from "@/config/users"
import { MONTHS } from "@/config/months"
import { ADAvatar, ADCell } from "@/components/shared/ADAvatar"
import type { Deal } from "@/types"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    return (
      <span key={i} style={{ whiteSpace: "pre-wrap" }}>
        {part}
      </span>
    )
  })
}

const SUGGESTIONS = [
  "Where is my biggest risk?",
  "Who needs coaching?",
  "Compare all ADs",
  "Budget gap analysis",
  "Win/loss analysis",
  "Services breakdown",
]

// ── Excluded deals analysis ──────────────────────────────────────────────────
interface ExclusionGroup {
  id: string
  label: string
  description: string
  severity: "high" | "medium" | "low" | "info"
  deals: Array<{ name: string; account: string; user: string; val: number; reason: string }>
  count: number
  value: number
}

function useExcludedDeals(data: Deal[]) {
  return useMemo(() => {
    const groups: ExclusionGroup[] = []

    // 1. No close date — can't be placed in any month
    const noDate = data.filter((r) => !r._month || r._month === "")
    if (noDate.length > 0) {
      groups.push({
        id: "no-date",
        label: "No Close Date",
        description:
          "These deals have no parseable close date so they don't appear in Monthly or Quarterly views. They're still counted in YTD totals.",
        severity: "high",
        count: noDate.length,
        value: noDate.reduce((s, r) => s + (r._val ?? 0), 0),
        deals: noDate.slice(0, 20).map((r) => ({
          name: r["Opportunity Name"] ?? "—",
          account: r["Account Name"] ?? "—",
          user: r.User ?? "—",
          val: r._val ?? 0,
          reason: `Raw date: "${r["Close Date"] || r["Close Date (2)"] || "(empty)"}"`,
        })),
      })
    }

    // 2. £0 split value — skew commit totals
    const zeroVal = data.filter(
      (r) => (r._val ?? 0) === 0 && r._stageSummary !== "Lost"
    )
    if (zeroVal.length > 0) {
      groups.push({
        id: "zero-value",
        label: "Zero Split Value",
        description:
          'These deals have £0 ABC Split Value. They appear in deal counts but contribute nothing to revenue totals. Check the "ABC Split Value" column in Salesforce.',
        severity: "high",
        count: zeroVal.length,
        value: 0,
        deals: zeroVal.slice(0, 20).map((r) => ({
          name: r["Opportunity Name"] ?? "—",
          account: r["Account Name"] ?? "—",
          user: r.User ?? "—",
          val: r._abc ?? 0,
          reason: `Total ABC: £${Math.round(r._abc ?? 0).toLocaleString()} — ABC Split may not be filled`,
        })),
      })
    }

    // 3. No product match — opportunity name didn't match any keyword
    const noProduct = data.filter(
      (r) => r._product === "No Match" && r._stageSummary !== "Lost"
    )
    if (noProduct.length > 0) {
      groups.push({
        id: "no-product",
        label: "No Product Match",
        description:
          "The opportunity name didn't match any product keyword. These deals still appear in all views but show as \"No Match\" in product breakdowns and reports.",
        severity: "medium",
        count: noProduct.length,
        value: noProduct.reduce((s, r) => s + (r._val ?? 0), 0),
        deals: noProduct.slice(0, 20).map((r) => ({
          name: r["Opportunity Name"] ?? "—",
          account: r["Account Name"] ?? "—",
          user: r.User ?? "—",
          val: r._val ?? 0,
          reason: "No keyword in opportunity name matched the product list",
        })),
      })
    }

    // 4. Future close dates (outside FY26 window Jul–Jun)
    const validMonths = new Set(MONTHS)
    const outsideWindow = data.filter(
      (r) => r._month && !validMonths.has(r._month)
    )
    if (outsideWindow.length > 0) {
      groups.push({
        id: "outside-window",
        label: "Outside FY26 Window",
        description:
          "Close date falls outside Jul–Jun FY26. These deals are excluded from all budget and target calculations.",
        severity: "medium",
        count: outsideWindow.length,
        value: outsideWindow.reduce((s, r) => s + (r._val ?? 0), 0),
        deals: outsideWindow.slice(0, 20).map((r) => ({
          name: r["Opportunity Name"] ?? "—",
          account: r["Account Name"] ?? "—",
          user: r.User ?? "—",
          val: r._val ?? 0,
          reason: `Month resolved to: "${r._month}"`,
        })),
      })
    }

    // 5. Unrecognised user — row has a User value but it's not in the USERS list
    const knownUsers = new Set(USERS)
    const unknownUser = data.filter(
      (r) => r.User && !knownUsers.has(r.User)
    )
    if (unknownUser.length > 0) {
      const uniqueUsers = [...new Set(unknownUser.map((r) => r.User ?? ""))]
      groups.push({
        id: "unknown-user",
        label: "Unrecognised Account Director",
        description:
          "These deals have a User that is not in the configured team list. They appear in All Deals but are excluded from AD summaries, budget tracking, and attainment calculations.",
        severity: "high",
        count: unknownUser.length,
        value: unknownUser.reduce((s, r) => s + (r._val ?? 0), 0),
        deals: unknownUser.slice(0, 20).map((r) => ({
          name: r["Opportunity Name"] ?? "—",
          account: r["Account Name"] ?? "—",
          user: r.User ?? "—",
          val: r._val ?? 0,
          reason: `User "${r.User}" not in team config. Recognised: ${USERS.map((u) => u.split(" ")[0]).join(", ")}`,
        })),
      })
      // Show which unknown users exist as a summary
      groups[groups.length - 1].description +=
        ` Unknown users found: ${uniqueUsers.slice(0, 5).join(", ")}${uniqueUsers.length > 5 ? ` (+${uniqueUsers.length - 5} more)` : ""}.`
    }

    // 6. Won deals with no close date month — won but invisible in monthly won charts
    const wonNoMonth = data.filter(
      (r) => r._stageSummary === "Won" && (!r._month || r._month === "")
    )
    if (wonNoMonth.length > 0) {
      groups.push({
        id: "won-no-month",
        label: "Won — Missing from Monthly Charts",
        description:
          "These deals are Closed Won but have no close date, so they don't appear in any monthly won chart or budget attainment calculation. They ARE included in YTD totals.",
        severity: "high",
        count: wonNoMonth.length,
        value: wonNoMonth.reduce((s, r) => s + (r._val ?? 0), 0),
        deals: wonNoMonth.slice(0, 20).map((r) => ({
          name: r["Opportunity Name"] ?? "—",
          account: r["Account Name"] ?? "—",
          user: r.User ?? "—",
          val: r._val ?? 0,
          reason: `Stage: ${r.Stage ?? "?"} — no parseable close date`,
        })),
      })
    }

    // 7. Deals where ABC Split Value != Total ABC (fractional splits)
    const splitMismatch = data.filter(
      (r) =>
        (r._abc ?? 0) > 0 &&
        (r._val ?? 0) > 0 &&
        Math.abs((r._val ?? 0) - (r._abc ?? 0)) > 100 &&
        r._stageSummary !== "Lost"
    )
    if (splitMismatch.length > 0) {
      const totalAbc = splitMismatch.reduce((s, r) => s + (r._abc ?? 0), 0)
      const totalSplit = splitMismatch.reduce((s, r) => s + (r._val ?? 0), 0)
      groups.push({
        id: "split-mismatch",
        label: "ABC Split vs Total ABC Difference",
        description:
          "These deals have a significant difference between ABC Split Value and Total ABC — likely due to partner splits, territory splits, or partial revenue recognition. The dashboard uses ABC Split Value for all calculations.",
        severity: "low",
        count: splitMismatch.length,
        value: totalAbc - totalSplit,
        deals: splitMismatch.slice(0, 20).map((r) => ({
          name: r["Opportunity Name"] ?? "—",
          account: r["Account Name"] ?? "—",
          user: r.User ?? "—",
          val: r._val ?? 0,
          reason: `Total ABC: ${fmt(r._abc ?? 0)} → Split: ${fmt(r._val ?? 0)} (diff: ${fmt(Math.abs((r._val ?? 0) - (r._abc ?? 0)))})`,
        })),
      })
    }

    return groups
  }, [data])
}

const SEVERITY_CONFIG = {
  high: {
    badge: "destructive" as const,
    icon: AlertTriangle,
    iconClass: "text-destructive",
    borderClass: "border-l-destructive",
  },
  medium: {
    badge: "secondary" as const,
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    borderClass: "border-l-amber-500",
  },
  low: {
    badge: "outline" as const,
    icon: Info,
    iconClass: "text-blue-500",
    borderClass: "border-l-blue-500",
  },
  info: {
    badge: "outline" as const,
    icon: Info,
    iconClass: "text-muted-foreground",
    borderClass: "border-l-muted-foreground",
  },
}

function ExclusionCard({ group }: { group: ExclusionGroup }) {
  const [open, setOpen] = useState(false)
  const cfg = SEVERITY_CONFIG[group.severity]
  const Icon = cfg.icon

  return (
    <div className={cn("border-l-4 rounded-lg border bg-card overflow-hidden", cfg.borderClass)}>
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-accent/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", cfg.iconClass)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{group.label}</span>
            <Badge variant={cfg.badge} className="text-[10px] h-4 px-1.5">
              {group.count} deal{group.count !== 1 ? "s" : ""}
            </Badge>
            {group.value > 0 && (
              <span className="text-xs text-muted-foreground">
                {fmt(group.value)} affected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {group.description}
          </p>
        </div>
        <div className="shrink-0 mt-0.5 text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && group.deals.length > 0 && (
        <div className="border-t">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Opportunity
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Account
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    AD
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                    Split Value
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.deals.map((d, i) => (
                  <tr
                    key={i}
                    className="border-t hover:bg-accent/20 transition-colors"
                  >
                    <td className="px-4 py-2 font-medium max-w-[200px] truncate">
                      {d.name}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground max-w-[160px] truncate">
                      {d.account}
                    </td>
                    <td className="px-4 py-2">
                      <ADCell name={d.user} />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {d.val > 0 ? fmt(d.val) : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground italic max-w-[280px]">
                      {d.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {group.count > 20 && (
              <p className="text-xs text-muted-foreground px-4 py-2 border-t">
                Showing 20 of {group.count} deals — export All Deals CSV to see the full list
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main tab ─────────────────────────────────────────────────────────────────
export function InsightsTab() {
  const { data, filters, oiTargets, monthlyBudget } = useDashboardStore()
  const [query, setQuery] = useState("")
  const [answer, setAnswer] = useState("")
  const [exclusionsOpen, setExclusionsOpen] = useState(true)

  const exclusionGroups = useExcludedDeals(data)
  const totalExcluded = exclusionGroups.reduce((s, g) => s + g.count, 0)
  const totalExcludedVal = exclusionGroups
    .filter((g) => g.id !== "split-mismatch")
    .reduce((s, g) => s + g.value, 0)
  const highSeverityCount = exclusionGroups.filter((g) => g.severity === "high").length

  const allData = data.filter((r) => r._stageSummary !== "Lost")
  const won = allData.filter((r) => r._stageSummary === "Won")
  const pipe = allData.filter((r) => r._stageSummary === "Pipe")
  const lost = data.filter((r) => r._stageSummary === "Lost")
  const risks = pipe.filter((r) => r._risk === "Risk")
  const commits = pipe.filter((r) => r._commit === "Commit")

  const totalWon = won.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalPipe = pipe.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalCommit = commits.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalRisk = risks.reduce((s, r) => s + (r._val ?? 0), 0)
  const annualBudget = Object.values(monthlyBudget).reduce((a, b) => a + b, 0)
  const winRate =
    won.length + lost.length > 0
      ? won.length / (won.length + lost.length)
      : 0

  function handleAsk() {
    if (!query.trim()) return
    const result = analyseQuery(query, { data, filters, oiTargets, monthlyBudget })
    setAnswer(result)
  }

  // Build static insights
  const insights: { num: number; title: string; body: string }[] = []
  const pct = annualBudget ? totalWon / annualBudget : 0
  const gap = annualBudget - totalWon

  insights.push({
    num: 1,
    title: "Overall forecast status",
    body: `YTD Closed Won: ${fmt(totalWon)} (${fmtPct(pct)} of ${fmt(annualBudget)} budget). Gap to budget: ${fmt(gap)}. Commit pipeline: ${fmt(totalCommit)} across ${commits.length} deals. ${gap > 0 && totalCommit < gap ? "Commit pipeline does not cover the gap — need more pipeline or higher conversion." : gap > 0 ? `Commit pipeline covers ${fmtPct(totalCommit / gap)} of the gap.` : "Budget achieved."}`,
  })

  if (risks.length > 0) {
    const topRisk = [...risks]
      .sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
      .slice(0, 3)
    insights.push({
      num: 2,
      title: `Pipeline risk — ${risks.length} deals at risk`,
      body: `${fmt(totalRisk)} in pipeline is at risk (pushed >2x or >180 days stale). Top deals: ${topRisk.map((r) => `${r["Opportunity Name"]} (${(r.User ?? "").split(" ")[0]}, ${fmt(r._val ?? 0)})`).join("; ")}. Review and challenge commit status this week.`,
    })
  }

  const underperformers = USERS.map((u) => {
    const uWon = won
      .filter((r) => r.User === u)
      .reduce((s, r) => s + (r._val ?? 0), 0)
    const uTarget = getADBudget(u, MONTHS, oiTargets)
    return { user: u, pct: uTarget ? uWon / uTarget : 0, gap: uTarget - uWon }
  })
    .filter((u) => u.pct < 0.5 && u.gap > 0)
    .sort((a, b) => a.pct - b.pct)

  if (underperformers.length > 0) {
    insights.push({
      num: insights.length + 1,
      title: "ADs behind target",
      body: `${underperformers.map((u) => `${u.user} at ${fmtPct(u.pct)} (${fmt(u.gap)} gap)`).join(". ")}. Review their pipeline for deals that can be accelerated.`,
    })
  }

  if (won.length + lost.length > 2) {
    const lostCommits = lost.filter((r) => r._commit === "Commit")
    insights.push({
      num: insights.length + 1,
      title: `Win rate: ${fmtPct(winRate)}`,
      body: `${won.length} won vs ${lost.length} lost (${fmt(lost.reduce((s, r) => s + (r._val ?? 0), 0))} lost value). ${lostCommits.length > 0 ? `${lostCommits.length} lost deal${lostCommits.length > 1 ? "s were" : " was"} marked as Commit — review forecast discipline. ` : ""}${winRate < 0.5 ? "Below 50% — review qualification and deal progression." : "Healthy win rate."}`,
    })
  }

  const pipeNoSvc = pipe.filter((r) => !r._services && (r._val ?? 0) > 15000)
  if (pipeNoSvc.length > 0) {
    insights.push({
      num: insights.length + 1,
      title: `${pipeNoSvc.length} deals missing services`,
      body: `${pipeNoSvc.length} pipeline deals over £15k have no services (${fmt(pipeNoSvc.reduce((s, r) => s + (r._val ?? 0), 0))} total). Scope services before close to protect implementation quality.`,
    })
  }

  return (
    <div className="space-y-5">
      {/* Ask bar */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm text-muted-foreground mb-3">
            Ask anything about the team's pipeline
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="Ask about your pipeline..."
              className="flex-1 px-3 py-2 rounded-lg border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={handleAsk}>Ask</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s)
                  setTimeout(handleAsk, 0)
                }}
                className="text-xs px-3 py-1.5 rounded-full border bg-muted hover:border-primary hover:text-primary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
          {answer && (
            <div className="mt-4 bg-muted rounded-xl p-4 text-sm leading-relaxed">
              {renderMarkdown(answer)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="YTD Won" value={fmt(totalWon)} period={`${won.length} deals`} accent="sap" />
        <KPI label="Open Pipeline" value={fmt(totalPipe)} period={`${pipe.length} deals`} accent="info" />
        <KPI label="Commit Pipe" value={fmt(totalCommit)} period={`${commits.length} deals`} accent="teal" />
        <KPI label="At Risk" value={fmt(totalRisk)} period={`${risks.length} deals`} accent="destructive" />
      </div>

      {/* ── Excluded Deals Diagnostic ── */}
      <Card>
        <button
          className="w-full text-left"
          onClick={() => setExclusionsOpen((v) => !v)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm">Data Quality — Excluded &amp; Affected Deals</CardTitle>
                {exclusionGroups.length === 0 ? (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-emerald-500 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    All clean
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {highSeverityCount > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                        {highSeverityCount} high priority
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {totalExcluded} deal{totalExcluded !== 1 ? "s" : ""} affected
                    </Badge>
                    {totalExcludedVal > 0 && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {fmt(totalExcludedVal)} at risk
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              {exclusionsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
            {!exclusionsOpen && exclusionGroups.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Click to see which deals are being excluded from views and why
              </p>
            )}
          </CardHeader>
        </button>

        {exclusionsOpen && (
          <CardContent className="pt-0 space-y-3">
            {exclusionGroups.length === 0 ? (
              <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">No data quality issues found</p>
                  <p>All {data.length} deals have valid close dates, split values, and recognised users.</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground pb-1">
                  These are deals that exist in your import but are silently excluded from one or more
                  views. Click any row to expand and see the specific deals affected.
                </p>
                {exclusionGroups.map((group) => (
                  <ExclusionCard key={group.id} group={group} />
                ))}
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Pipeline Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pipeline Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.map((ins) => (
            <div key={ins.num} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                  {ins.num}
                </span>
                <h4 className="text-sm font-semibold">{ins.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{ins.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
