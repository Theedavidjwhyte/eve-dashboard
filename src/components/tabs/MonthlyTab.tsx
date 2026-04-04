import { useState, useMemo, useCallback } from "react"
import type { Deal, AllNotes, TimestampedNote, BudgetTargets, WeekKey, WeekKey as WK } from "@/types"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import { ChevronDown, ChevronUp, Copy, Check, RefreshCw, ClipboardList } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { KPI } from "@/components/ui/kpi"
import { PctBar } from "@/components/shared/PctBar"
import { StatusBadge, CommitBadge, RiskBadge } from "@/components/shared/StatusBadge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { useDashboardStore, getSelectedMonths, userMatchesFilter, getSelectedUsers } from "@/store/dashboardStore"
import { getADBudget, getTeamBudgetForMonths } from "@/lib/budgetHelpers"
import { fmt, fmtPct, fmtPct1 } from "@/lib/formatters"
import { USERS } from "@/config/users"
import { MONTHS } from "@/config/months"
import { openDealModal } from "@/App"
import { generateCelebration, generateMultiMonthCelebration } from "@/lib/celebrationBuilder"
import { ADCell } from "@/components/shared/ADAvatar"
import { ADKPIIcon } from "@/components/shared/ADKPIIcon"
import { WeeklyCommitTracker } from "@/components/tabs/WeeklyCommitTracker"

// ── Collapsible section ──────────────────────────────────────────────────────
function Collapsible({
  title, badge, defaultOpen = false, children, actions,
}: {
  title: string
  badge?: string
  defaultOpen?: boolean
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <div
        className="flex items-center justify-between cursor-pointer select-none py-2"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge && <span className="text-xs text-muted-foreground">{badge}</span>}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      {open && <div className="pt-1">{children}</div>}
    </div>
  )
}

// ── Tooltip formatter ────────────────────────────────────────────────────────
function moneyTick(v: number) {
  return "£" + Math.round(v / 1000) + "k"
}

export function MonthlyTab() {
  const {
    data, filters, oiTargets, monthlyBudget,
    notes, freeNotes, commitNotesTS, commitCompany,
    setNote, setFreeNote, addTimestampedNote, setCommitCompany,
  } = useDashboardStore()

  const [celebVariation, setCelebVariation] = useState(0)
  const [copied, setCopied] = useState(false)
  const [copiedDealList, setCopiedDealList] = useState(false)
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({})

  const selectedMonths = getSelectedMonths(filters.month)
  const isAll = filters.month === "All"
  const isSingle = !isAll && selectedMonths.length === 1
  const singleMonth = isSingle ? selectedMonths[0] : null

  // Filter data
  const rows = useMemo(() => {
    return data.filter((r) => {
      if (r._stageSummary === "Lost") return false
      const months = selectedMonths
      if (!isAll && !months.includes(r._month ?? "")) return false
      if (!userMatchesFilter(r.User, filters.user)) return false
      if (filters.product !== "All" && r._product !== filters.product) return false
      if (filters.keyDeals && (r._abc ?? 0) <= 30000) return false
      return true
    })
  }, [data, filters, selectedMonths, isAll])

  const won = rows.filter((r) => r._stageSummary === "Won")
  const pipe = rows.filter((r) => r._stageSummary === "Pipe")
  const commitPipe = pipe.filter((r) => r._commit === "Commit")

  const totalWon = won.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalPipe = pipe.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalCommitPipe = commitPipe.reduce((s, r) => s + (r._val ?? 0), 0)
  const totalCommit = totalWon + totalCommitPipe

  const budgetTotal = selectedMonths.reduce((s, m) => s + (monthlyBudget[m] ?? 0), 0)
  const targetTotal =
    filters.user !== "All" || Array.isArray(filters.user)
      ? getADBudget(filters.user, selectedMonths, oiTargets)
      : getTeamBudgetForMonths(selectedMonths, oiTargets)

  const completedPct = targetTotal ? totalWon / targetTotal : 0
  const commitVsBudget = budgetTotal ? totalCommit / budgetTotal : 0
  const gapToBudget = budgetTotal - totalCommit

  // Chart data
  const chartData = MONTHS.map((m) => ({
    month: m,
    won: data.filter((r) => r._month === m && r._stageSummary === "Won" && userMatchesFilter(r.User, filters.user)).reduce((s, r) => s + (r._val ?? 0), 0),
    budget: monthlyBudget[m] ?? 0,
  }))

  // AD summary
  const userList = getSelectedUsers(filters.user)

  // Celebrate
  function buildCelebPost() {
    if (won.length === 0) return ""
    if (singleMonth) {
      return generateCelebration(won, singleMonth, {
        variation: celebVariation,
        oiTargets,
        monthlyBudget,
        allData: data,
      })
    }
    const celebMonths = selectedMonths.filter((m) => won.some((r) => r._month === m))
    const label = selectedMonths.join(", ")
    return generateMultiMonthCelebration(won, label, celebMonths, {
      variation: celebVariation,
      oiTargets,
      monthlyBudget,
      allData: data,
    })
  }

  async function copyPost() {
    const text = buildCelebPost()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Clari / paste-ready deal list — very simple format
  const buildDealListText = useCallback(() => {
    const fk = (v: number) => "£" + Math.round(v / 1000) + "k"
    const label = singleMonth ?? selectedMonths.join(", ")
    const commitDeals = [...pipe].filter((r) => r._commit === "Commit").sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
    const upsideDeals = [...pipe].filter((r) => r._commit === "Upside").sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
    const pipeDeals = [...pipe].filter((r) => r._commit !== "Commit" && r._commit !== "Upside").sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
    const wonTotal = won.reduce((s, r) => s + (r._val ?? 0), 0)
    const commitTotal = commitDeals.reduce((s, r) => s + (r._val ?? 0), 0)
    const upsideTotal = upsideDeals.reduce((s, r) => s + (r._val ?? 0), 0)

    const line = (r: Deal) => `- ${(r.User ?? "").split(" ")[0].padEnd(10)} ${(r["Account Name"] ?? "").substring(0, 32).padEnd(33)} ${fk(r._val ?? 0)}`

    const rows: string[] = [
      `${label} — Forecast Summary`,
      `Won: ${fk(wonTotal)} (${won.length})   Commit: ${fk(commitTotal)} (${commitDeals.length})   Upside: ${fk(upsideTotal)} (${upsideDeals.length})`,
      `Total Commit: ${fk(wonTotal + commitTotal)}`,
      ``,
      `WON (${won.length})`,
      ...(won.length > 0 ? won.slice().sort((a, b) => (b._val ?? 0) - (a._val ?? 0)).map(line) : ["(none)"]),
      ``,
      `COMMIT PIPE (${commitDeals.length})`,
      ...(commitDeals.length > 0 ? commitDeals.map(line) : ["(none)"]),
      ``,
      `UPSIDE (${upsideDeals.length})`,
      ...(upsideDeals.length > 0 ? upsideDeals.map(line) : ["(none)"]),
      ``,
      `PIPELINE (${pipeDeals.length})`,
      ...(pipeDeals.length > 0 ? pipeDeals.map(line) : ["(none)"]),
    ]
    return rows.join("\n")
  }, [pipe, won, singleMonth, selectedMonths])

  async function copyDealList() {
    await navigator.clipboard.writeText(buildDealListText())
    setCopiedDealList(true)
    setTimeout(() => setCopiedDealList(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cursor-pointer" onClick={() =>
          openDealModal("Commit Deals", [...won, ...commitPipe])}>
          <KPI label="Total Commit" value={fmt(totalCommit)}
            period="Won + Pipe Commit" accent="info"
            icon={<ADKPIIcon />} />
        </div>
        <div className="cursor-pointer" onClick={() => openDealModal("Won Deals", won)}>
          <KPI
            label="Completed"
            value={fmtPct(completedPct)}
            period={`${fmt(totalWon)} of ${fmt(targetTotal)} budget`}
            accent={completedPct >= 0.8 ? "sap" : completedPct >= 0.5 ? "warning" : "destructive"}
            icon={<ADKPIIcon />}
          />
        </div>
        <div className="cursor-pointer" onClick={() => openDealModal("Commit vs Budget", [...won, ...commitPipe])}>
          <KPI
            label="Commit vs Budget"
            value={fmtPct1(commitVsBudget)}
            period={`${fmt(totalCommit)} of ${fmt(budgetTotal)}`}
            accent={commitVsBudget >= 0.8 ? "sap" : commitVsBudget >= 0.5 ? "warning" : "destructive"}
            icon={<ADKPIIcon />}
          />
        </div>
        <div className="cursor-pointer" onClick={() => openDealModal("Pipeline Deals", pipe)}>
          <KPI label="Pipeline" value={fmt(totalPipe)}
            period={`${fmt(totalCommitPipe)} commit`} accent="teal"
            icon={<ADKPIIcon />} />
        </div>
      </div>

      {/* Commit Intelligence (single month only) */}
      {singleMonth && (
        <CommitIntelligenceCard
          month={singleMonth}
          won={won}
          pipe={pipe}
          commitPipe={commitPipe}
          totalWon={totalWon}
          totalCommitPipe={totalCommitPipe}
          totalCommit={totalCommit}
          totalPipe={totalPipe}
          gapToBudget={gapToBudget}
          budgetTotal={budgetTotal}
          oiTargets={oiTargets}
          userList={userList}
          notes={notes}
          commitNotesTS={commitNotesTS}
          commitCompany={commitCompany}
          setNote={setNote}
          setCommitCompany={setCommitCompany}
          addTimestampedNote={addTimestampedNote}
          newNoteText={newNoteText}
          setNewNoteText={setNewNoteText}
        />
      )}

      {/* AD Summary Table + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Account Director Summary</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>AD</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Commit Pipe</TableHead>
                    <TableHead className="text-right">Total Commit</TableHead>
                    <TableHead className="text-right">Upside</TableHead>
                    <TableHead className="text-right">Pipeline</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Gap</TableHead>
                    <TableHead className="min-w-[100px]">Achieved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userList.map((u) => {
                    const uWon = rows.filter((r) => r.User === u && r._stageSummary === "Won").reduce((s, r) => s + (r._val ?? 0), 0)
                    const uCP = rows.filter((r) => r.User === u && r._stageSummary === "Pipe" && r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0)
                    const uTC = uWon + uCP
                    const uUp = rows.filter((r) => r.User === u && r._stageSummary === "Pipe" && r._commit === "Upside").reduce((s, r) => s + (r._val ?? 0), 0)
                    const uPipe = rows.filter((r) => r.User === u && r._stageSummary === "Pipe").reduce((s, r) => s + (r._val ?? 0), 0)
                    const uTarget = getADBudget(u, selectedMonths, oiTargets)
                    const uPct = uTarget ? uWon / uTarget : 0
                    const esc = u.replace(/'/g, "\\'")

                    return (
                      <TableRow key={u}>
                        <TableCell><ADCell name={u} /></TableCell>
                        <TableCell
                          className="text-right text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer"
                          onClick={() => openDealModal(`${u.split(" ")[0]} Won`, data.filter((r) => r.User === u && r._stageSummary === "Won"))}
                        >
                          {fmt(uWon)}
                        </TableCell>
                        <TableCell className="text-right cursor-pointer"
                          onClick={() => openDealModal(`${u.split(" ")[0]} Commit Pipe`, data.filter((r) => r.User === u && r._stageSummary === "Pipe" && r._commit === "Commit"))}>
                          {fmt(uCP)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">{fmt(uTC)}</TableCell>
                        <TableCell className="text-right">{fmt(uUp)}</TableCell>
                        <TableCell className="text-right cursor-pointer"
                          onClick={() => openDealModal(`${u.split(" ")[0]} Pipeline`, data.filter((r) => r.User === u && r._stageSummary === "Pipe"))}>
                          {fmt(uPipe)}
                        </TableCell>
                        <TableCell className="text-right">{fmt(uTarget)}</TableCell>
                        <TableCell className="text-right">{fmt(uTarget - uWon)}</TableCell>
                        <TableCell><PctBar value={uPct} /></TableCell>
                      </TableRow>
                    )
                  })}

                  {/* Team totals */}
                  {userList.length > 1 && (() => {
                    const tW = userList.reduce((s, u) => s + rows.filter((r) => r.User === u && r._stageSummary === "Won").reduce((s2, r) => s2 + (r._val ?? 0), 0), 0)
                    const tCP = userList.reduce((s, u) => s + rows.filter((r) => r.User === u && r._stageSummary === "Pipe" && r._commit === "Commit").reduce((s2, r) => s2 + (r._val ?? 0), 0), 0)
                    const tT = getTeamBudgetForMonths(selectedMonths, oiTargets)
                    return (
                      <TableRow className="font-bold border-t-2 bg-muted/50">
                        <TableCell>Team</TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{fmt(tW)}</TableCell>
                        <TableCell className="text-right">{fmt(tCP)}</TableCell>
                        <TableCell className="text-right text-primary">{fmt(tW + tCP)}</TableCell>
                        <TableCell />
                        <TableCell className="text-right">{fmt(pipe.reduce((s, r) => s + (r._val ?? 0), 0))}</TableCell>
                        <TableCell className="text-right">{fmt(tT)}</TableCell>
                        <TableCell className="text-right">{fmt(tT - tW)}</TableCell>
                        <TableCell><PctBar value={tT ? tW / tT : 0} /></TableCell>
                      </TableRow>
                    )
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Won by AD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userList.map((u) => ({
                  name: u.split(" ")[0],
                  won: rows.filter((r) => r.User === u && r._stageSummary === "Won").reduce((s, r) => s + (r._val ?? 0), 0),
                  budget: getADBudget(u, selectedMonths, oiTargets),
                }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={moneyTick} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={((v: number) => fmt(v)) as any} />
                  <Bar dataKey="won" name="Won" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Weekly Commit Tracker ── */}
      {singleMonth && (
        <WeeklyCommitTracker
          month={singleMonth}
          notes={notes}
          userList={userList}
          oiTargets={oiTargets}
          currentWon={Object.fromEntries(
            userList.map((u) => [
              u,
              rows.filter((r) => r.User === u && r._stageSummary === "Won").reduce((s, r) => s + (r._val ?? 0), 0),
            ])
          )}
          currentCommit={Object.fromEntries(
            userList.map((u) => [
              u,
              rows.filter((r) => r.User === u && r._stageSummary === "Pipe" && r._commit === "Commit").reduce((s, r) => s + (r._val ?? 0), 0),
            ])
          )}
          setNote={setNote}
        />
      )}

      {/* Month summary note removed — notes now live on each weekly commit cell */}

      {/* ── Deal List (copy & paste into Teams/Email) ── */}
      {singleMonth && pipe.length > 0 && (
        <Card className="opacity-90">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm">
                  Forecast Paste — {singleMonth}
                  <span className="font-normal text-muted-foreground ml-2 text-xs">
                    Ready to paste into Clari, Teams or email
                  </span>
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={copyDealList}
              >
                {copiedDealList
                  ? <><Check className="w-3 h-3" /> Copied!</>
                  : <><Copy className="w-3 h-3" /> Copy All</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-xs leading-relaxed bg-muted rounded-xl p-4 whitespace-pre-wrap font-mono select-all max-h-64 overflow-y-auto text-foreground/80">
              {buildDealListText()}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Celebrate Wins */}
      {won.length > 0 && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Celebrate Wins — {singleMonth ?? selectedMonths.join(", ")}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setCelebVariation((v) => v + 1)}
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={copyPost}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy Post"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Leaderboard bars */}
            <div className="mb-4 space-y-2">
              {[...userList]
                .map((u) => ({
                  user: u,
                  val: won.filter((r) => r.User === u).reduce((s, r) => s + (r._val ?? 0), 0),
                  deals: won.filter((r) => r.User === u).length,
                }))
                .filter((u) => u.deals > 0)
                .sort((a, b) => b.val - a.val)
                .map((u, i) => {
                  const maxVal = won.reduce((s, r) => s + (r._val ?? 0), 0)
                  const pct = maxVal ? u.val / won.filter((r) => r.User === u.user).reduce((s, r) => s + (r._val ?? 0), 0) || u.val / maxVal : 0
                  const medals = ["🥇", "🥈", "🥉"]
                  return (
                    <div key={u.user} className="flex items-center gap-3">
                      <span className="text-lg w-7">{medals[i] ?? "⭐"}</span>
                      <span className="font-medium text-sm w-20">{u.user.split(" ")[0]}</span>
                      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.max(4, Math.round(u.val / maxVal * 100))}%` }}
                        />
                      </div>
                      <span className="font-bold text-sm w-20 text-right">{fmt(u.val)}</span>
                      <span className="text-xs text-muted-foreground w-14">{u.deals} deal{u.deals > 1 ? "s" : ""}</span>
                    </div>
                  )
                })}
            </div>
            {/* Post text */}
            <pre className="text-xs leading-relaxed bg-muted rounded-xl p-4 whitespace-pre-wrap font-sans select-all max-h-80 overflow-y-auto">
              {buildCelebPost()}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Commit Intelligence Card ─────────────────────────────────────────────────
interface CICardProps {
  month: string
  won: Deal[]
  pipe: Deal[]
  commitPipe: Deal[]
  totalWon: number
  totalCommitPipe: number
  totalCommit: number
  totalPipe: number
  gapToBudget: number
  budgetTotal: number
  oiTargets: BudgetTargets
  userList: string[]
  notes: AllNotes
  commitNotesTS: Record<string, TimestampedNote[]>
  commitCompany: Record<string, number>
  setNote: (month: string, user: string, week: WK, value: string) => void
  setCommitCompany: (month: string, value: number) => void
  addTimestampedNote: (month: string, text: string) => void
  newNoteText: Record<string, string>
  setNewNoteText: React.Dispatch<React.SetStateAction<Record<string, string>>>
}

function CommitIntelligenceCard({
  month, won, pipe, commitPipe,
  totalWon, totalCommitPipe, totalCommit, totalPipe,
  gapToBudget, budgetTotal, oiTargets, userList,
  notes, commitNotesTS, commitCompany,
  setNote, setCommitCompany, addTimestampedNote,
  newNoteText, setNewNoteText,
}: CICardProps) {
  const [open, setOpen] = useState(true)
  const [copiedCI, setCopiedCI] = useState(false)

  const riskDeals = pipe.filter((r: any) => r._risk === "Risk")
  const commitToCompany = commitCompany[month] ?? 0
  const commitGap = (commitToCompany > 0 ? commitToCompany : totalCommit) - totalWon
  const sfCommitGap = gapToBudget

  // AD breakdown
  const adRows = userList.map((u: string) => {
    const uWon = won.filter((r: any) => r.User === u).reduce((s: number, r: any) => s + (r._val ?? 0), 0)
    const uCP = commitPipe.filter((r: any) => r.User === u).reduce((s: number, r: any) => s + (r._val ?? 0), 0)
    // W1 note parsing
    const w1Note = notes[month]?.[u]?.W1 ?? ""
    const w1Match = w1Note.match(/[\u00A3\xA3]?\s*([\d,.]+)\s*[km]?/i)
    let w1Val = 0
    if (w1Match) {
      w1Val = parseFloat(w1Match[1].replace(/,/g, ""))
      if (w1Note.toLowerCase().includes("k")) w1Val *= 1000
      if (w1Note.toLowerCase().includes("m")) w1Val *= 1000000
    }
    const movement = w1Val > 0 ? (uWon + uCP) - w1Val : null
    return { user: u, first: u.split(" ")[0], won: uWon, commit: uCP, w1Val, movement }
  })

  async function copyCI() {
    const lines = [
      `📊 Commit Intelligence — ${month}`,
      "━".repeat(30),
      "",
      `💰 Current Commit`,
      commitToCompany > 0 ? `   Commit to Company:  ${fmt(commitToCompany)}` : "",
      `   Salesforce Commit:  ${fmt(totalCommit)}`,
      `   ✅ Won:             ${fmt(totalWon)} (${won.length} ops)`,
      `   🟡 Commit Pipe:     ${fmt(totalCommitPipe)} (${commitPipe.length} ops)`,
      `   Commit GAP:         ${fmt(commitGap)}`,
      `   Budget:             ${fmt(budgetTotal)}`,
      `   GAP to Budget:      ${gapToBudget > 0 ? fmt(gapToBudget) + " short" : "✅ Covered"}`,
      "",
      `👥 AD Breakdown`,
      ...adRows.map((r: any) => `   ${r.first.padEnd(12)} Won: ${fmt(r.won).padStart(8)}  Commit: ${fmt(r.commit).padStart(8)}  Total: ${fmt(r.won + r.commit).padStart(8)}`),
      "",
      riskDeals.length > 0 ? `⚠️ Risks (${riskDeals.length})` : "",
      ...riskDeals.slice(0, 5).map((r: any) => `   ${(r.User ?? "").split(" ")[0].padEnd(12)} ${(r["Opportunity Name"] ?? "").substring(0, 30).padEnd(32)} ${fmt(r._val ?? 0)}`),
    ].filter((l) => l !== undefined && l !== null)

    await navigator.clipboard.writeText(lines.join("\n"))
    setCopiedCI(true)
    setTimeout(() => setCopiedCI(false), 2000)
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <CardTitle className="text-sm">Commit Intelligence — {month}</CardTitle>
            <div className="flex gap-3 text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(totalWon)} won</span>
              <span className="text-primary font-semibold">{fmt(totalCommit)} commit</span>
              <span className={`font-semibold ${gapToBudget > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                {gapToBudget > 0 ? `${fmt(gapToBudget)} gap` : "Budget covered"}
              </span>
              <span className="text-muted-foreground">{fmt(totalPipe)} pipe</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={copyCI}>
              {copiedCI ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              Copy
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen((v) => !v)}>
              {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          {/* Two-column: commit metrics + 4 mini cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Commit metrics */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2 border">
              <p className="text-xs font-semibold mb-1">Current Commit</p>
              <div className="flex justify-between text-xs border-b pb-1">
                <span className="text-muted-foreground">Commit to company</span>
                <input
                  type="text"
                  defaultValue={commitToCompany > 0 ? Math.round(commitToCompany).toLocaleString("en-GB") : ""}
                  placeholder="Enter £..."
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value.replace(/[£,\s]/g, ""))
                    if (!isNaN(val)) setCommitCompany(month, val)
                  }}
                  className="text-right w-28 bg-transparent border rounded px-1 py-0.5 font-semibold focus:outline-none focus:border-primary text-xs"
                />
              </div>
              {[
                ["Salesforce Commit", fmt(totalCommit), "text-primary"],
                [`  Won (${won.length} ops)`, fmt(totalWon), "text-emerald-600 dark:text-emerald-400"],
                [`  Commit Pipe (${commitPipe.length} ops)`, fmt(totalCommitPipe), "text-amber-600 dark:text-amber-400"],
                ["Commit GAP", fmt(commitGap), "text-amber-600 dark:text-amber-400 font-semibold"],
                ["Budget", fmt(budgetTotal), ""],
              ].map(([label, value, cls]) => (
                <div key={label} className="flex justify-between text-xs border-b pb-1 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-semibold ${cls}`}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-0.5">
                <span className={`font-bold text-xs ${gapToBudget > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                  GAP to Budget
                </span>
                <span className={`font-bold ${gapToBudget > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {gapToBudget > 0 ? fmt(gapToBudget) : "Covered"}
                </span>
              </div>
            </div>

            {/* 4 mini stat cards */}
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Outstanding Pipe",
                  value: fmt(totalPipe - totalCommitPipe),
                  sub: `${pipe.length - commitPipe.length} ops (non-commit)`,
                  col: "",
                },
                {
                  label: "Risk Deals",
                  value: String(riskDeals.length),
                  sub: "Stale next steps",
                  col: riskDeals.length > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: "Budget Coverage",
                  value: budgetTotal > 0 ? fmtPct(totalCommit / budgetTotal) : "—",
                  sub: `${pipe.length} deals in pipe`,
                  col:
                    budgetTotal > 0 && totalCommit >= budgetTotal
                      ? "text-emerald-600 dark:text-emerald-400"
                      : budgetTotal > 0 && totalCommit >= budgetTotal * 0.8
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-destructive",
                },
                {
                  label: "Won this month",
                  value: String(won.length),
                  sub: fmt(totalWon),
                  col: "text-emerald-600 dark:text-emerald-400",
                },
              ].map(({ label, value, sub, col }) => (
                <div key={label} className="bg-muted/50 rounded-lg p-3 border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                  <p className={`text-lg font-bold ${col}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AD breakdown table */}
          <Collapsible title="AD Commit Breakdown" defaultOpen>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AD</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Commit Pipe</TableHead>
                  <TableHead className="text-right">Total</TableHead>

                </TableRow>
              </TableHeader>
              <TableBody>
                {adRows.map((row: any) => (
                  <TableRow key={row.user}>
                    <TableCell className="font-medium text-xs">{row.first}</TableCell>
                    <TableCell className="text-right text-xs">{fmt(row.won)}</TableCell>
                    <TableCell className="text-right text-xs">{fmt(row.commit)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{fmt(row.won + row.commit)}</TableCell>

                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{fmt(adRows.reduce((s: number, r: any) => s + r.won, 0))}</TableCell>
                  <TableCell className="text-right">{fmt(adRows.reduce((s: number, r: any) => s + r.commit, 0))}</TableCell>
                  <TableCell className="text-right font-bold">{fmt(adRows.reduce((s: number, r: any) => s + r.won + r.commit, 0))}</TableCell>

                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </Collapsible>

          {/* Risk deals */}
          {riskDeals.length > 0 && (
            <Collapsible title={`Forecast Risks (${riskDeals.length})`} badge={fmt(riskDeals.reduce((s: number, r: any) => s + (r._val ?? 0), 0))}>
              <div className="overflow-auto max-h-48">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AD</TableHead>
                      <TableHead>Opportunity</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Pushes</TableHead>
                      <TableHead>Next Step</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...riskDeals].sort((a: any, b: any) => (b._val ?? 0) - (a._val ?? 0)).slice(0, 8).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{(r.User ?? "").split(" ")[0]}</TableCell>
                        <TableCell className="font-medium text-xs">{r["Opportunity Name"] ?? ""}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{fmt(r._val ?? 0)}</TableCell>
                        <TableCell className="text-xs">{r.Stage ?? ""}</TableCell>
                        <TableCell className="text-right text-xs text-destructive font-semibold">{r._push ?? 0}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{(r["Next Step"] ?? "").substring(0, 40)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Collapsible>
          )}

          {/* Weekly commentary */}
          <Collapsible title="Weekly Commentary">
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNoteText[month] ?? ""}
                  onChange={(e) => setNewNoteText((s: Record<string, string>) => ({ ...s, [month]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (newNoteText[month] ?? "").trim()) {
                      addTimestampedNote(month, newNoteText[month])
                      setNewNoteText((s: Record<string, string>) => ({ ...s, [month]: "" }))
                    }
                  }}
                  placeholder="Add this week's commit commentary..."
                  className="flex-1 px-3 py-1.5 rounded-lg border bg-muted text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    if ((newNoteText[month] ?? "").trim()) {
                      addTimestampedNote(month, newNoteText[month])
                      setNewNoteText((s: Record<string, string>) => ({ ...s, [month]: "" }))
                    }
                  }}
                >
                  + Add
                </Button>
              </div>
              {(commitNotesTS[month] ?? []).map((n: any, i: number) => (
                <div key={i} className="bg-muted rounded-lg px-3 py-2 text-xs">
                  <div className="flex justify-between mb-0.5">
                    <span className="font-semibold text-primary">{n.dayLabel}</span>
                    <span className="text-muted-foreground">{n.date}</span>
                  </div>
                  <p>{n.text}</p>
                </div>
              ))}
            </div>
          </Collapsible>

          {/* Weekly notes now live in the WeeklyCommitTracker above the deal list */}
        </CardContent>
      )}
    </Card>
  )
}
