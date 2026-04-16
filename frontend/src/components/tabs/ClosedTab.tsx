import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/ui/kpi"
import { PctBar } from "@/components/shared/PctBar"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { useDashboardStore, getSelectedMonths, getSelectedUsers } from "@/store/dashboardStore"
import { fmt, fmtPct } from "@/lib/formatters"
import { USERS } from "@/config/users"
import { openDealModal } from "@/lib/modalBus"
import { getLostInsight, getWonInsight } from "@/lib/insights"
import type { Deal, LostReview } from "@/types"
import { Copy, Check, RefreshCw, Link2, ExternalLink } from "lucide-react"
import { generateCelebration, generateMultiMonthCelebration } from "@/lib/celebrationBuilder"
import { lookupELVAccount } from "@/config/elvAccounts"
import { StatusBadge, CommitBadge, RiskBadge, KeyDealBadge } from "@/components/shared/StatusBadge"
import { getQualifyScore } from "@/components/panels/DealQualifyPanel"

type ClosedView = "won" | "lost"

function Pill({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
      {children}
    </button>
  )
}

export function ClosedTab() {
  const { data, filters, oiTargets, monthlyBudget, lostReviews, setLostReview } = useDashboardStore()
  const [view, setView] = useState<ClosedView>("won")
  const [reviewDeal, setReviewDeal] = useState<Deal | null>(null)
  const [reviewForm, setReviewForm] = useState<Partial<LostReview>>({})
  const [celebVar, setCelebVar] = useState(0)
  const [copied, setCopied] = useState(false)
  const [dealCard, setDealCard] = useState<Deal | null>(null)

  const selectedMonths = getSelectedMonths(filters.month)

  const getBase = (stage: "Won" | "Lost") =>
    data.filter(
      (r) =>
        r._stageSummary === stage &&
        (filters.month === "All" || selectedMonths.includes(r._month ?? "")) &&
        (filters.user === "All" || r.User === filters.user) &&
        (filters.product === "All" || r._product === filters.product)
    )

  const won = getBase("Won")
  const lost = getBase("Lost")
  const wonVal = won.reduce((s, r) => s + (r._val ?? 0), 0)
  const lostVal = lost.reduce((s, r) => s + (r._val ?? 0), 0)
  const winRateCount = (won.length + lost.length) > 0 ? won.length / (won.length + lost.length) : 0
  const winRateVal = (wonVal + lostVal) > 0 ? wonVal / (wonVal + lostVal) : 0

  // AD tables helper
  const userList = getSelectedUsers(filters.user)

  function openReview(deal: Deal) {
    setReviewDeal(deal)
    const existing = lostReviews[deal["Opportunity Name"] ?? ""] ?? {}
    setReviewForm(existing)
  }

  function saveReview() {
    if (!reviewDeal) return
    setLostReview(reviewDeal["Opportunity Name"] ?? "", reviewForm as LostReview)
    setReviewDeal(null)
  }

  // Celebrate won
  const celebWon = [...won].sort((a, b) => (b._val ?? 0) - (a._val ?? 0))
  const celebMonths = selectedMonths.filter((m) => won.some((r) => r._month === m))
  const isSingle = !Array.isArray(filters.month) && filters.month !== "All"
  const celebLabel = isSingle ? (filters.month as string) : selectedMonths.join(", ") || "FY26"

  async function copyPost() {
    let text = ""
    if (isSingle && typeof filters.month === "string") {
      text = generateCelebration(celebWon, filters.month, { variation: celebVar, oiTargets, monthlyBudget, allData: data })
    } else {
      text = generateMultiMonthCelebration(celebWon, celebLabel, celebMonths, { variation: celebVar, oiTargets, monthlyBudget, allData: data })
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* View toggle */}
      <div className="flex gap-1 bg-card border rounded-lg p-1 w-fit">
        {(["won", "lost"] as ClosedView[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            Closed {v === "won" ? "Won" : "Lost"}
            <span className="ml-1.5 text-[10px] opacity-70">
              ({v === "won" ? `${won.length} · ${fmt(wonVal)}` : `${lost.length} · ${fmt(lostVal)}`})
            </span>
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Closed Won" value={fmt(wonVal)} period={`${won.length} deals`} accent="sap" />
        <KPI label="Closed Lost" value={fmt(lostVal)} period={`${lost.length} deals`} accent="destructive" />
        <KPI label="Win Rate (count)" value={fmtPct(winRateCount)} period={`${won.length}W / ${lost.length}L`}
          accent={winRateCount >= 0.5 ? "sap" : "destructive"} />
        <KPI label="Win Rate (value)" value={fmtPct(winRateVal)} period={`${fmt(wonVal)} / ${fmt(wonVal + lostVal)}`}
          accent={winRateVal >= 0.5 ? "sap" : "destructive"} />
      </div>

      {/* AD tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Win/Loss by Count</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AD</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Lost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="min-w-[100px]">Win Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userList.map((u) => {
                  const uw = won.filter((r) => r.User === u).length
                  const ul = lost.filter((r) => r.User === u).length
                  const rate = (uw + ul) > 0 ? uw / (uw + ul) : 0
                  return (
                    <TableRow key={u}>
                      <TableCell className="font-medium">{u.split(" ")[0]}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{uw}</TableCell>
                      <TableCell className="text-right text-destructive">{ul}</TableCell>
                      <TableCell className="text-right">{uw + ul}</TableCell>
                      <TableCell><PctBar value={rate} /></TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="font-bold border-t-2 bg-muted/50">
                  <TableCell>Team</TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{won.length}</TableCell>
                  <TableCell className="text-right text-destructive">{lost.length}</TableCell>
                  <TableCell className="text-right">{won.length + lost.length}</TableCell>
                  <TableCell><PctBar value={winRateCount} /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Win/Loss by Value</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AD</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Lost</TableHead>
                  <TableHead className="min-w-[100px]">Win Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userList.map((u) => {
                  const uw = won.filter((r) => r.User === u).reduce((s, r) => s + (r._val ?? 0), 0)
                  const ul = lost.filter((r) => r.User === u).reduce((s, r) => s + (r._val ?? 0), 0)
                  const rate = (uw + ul) > 0 ? uw / (uw + ul) : 0
                  return (
                    <TableRow key={u}>
                      <TableCell className="font-medium">{u.split(" ")[0]}</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(uw)}</TableCell>
                      <TableCell className="text-right text-destructive">{fmt(ul)}</TableCell>
                      <TableCell><PctBar value={rate} /></TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="font-bold border-t-2 bg-muted/50">
                  <TableCell>Team</TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{fmt(wonVal)}</TableCell>
                  <TableCell className="text-right text-destructive">{fmt(lostVal)}</TableCell>
                  <TableCell><PctBar value={winRateVal} /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Deal table */}
      {view === "won" ? (
        <>
          <Card>
            <CardHeader><CardTitle className="text-sm">Closed Won Deals</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AD</TableHead>
                      <TableHead>Opportunity</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">ABC</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Initials</TableHead>
                      <TableHead className="text-right">Services</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="min-w-[200px]">Insight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...won].sort((a, b) => (b._val ?? 0) - (a._val ?? 0)).map((r, i) => (
                      <TableRow key={i} className="hover:bg-muted/40 cursor-pointer" onClick={() => setDealCard(r)}>
                        <TableCell>{(r.User ?? "").split(" ")[0]}</TableCell>
                        <TableCell className="font-medium text-xs max-w-[160px]">
                          <div className="flex items-center gap-1 group">
                            <span className="truncate">{r["Opportunity Name"] ?? ""}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity text-primary" />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{r["Account Name"] ?? ""}</TableCell>
                        <TableCell className="text-right text-xs">{fmt(r._abc ?? 0)}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs">{fmt(r._val ?? 0)}</TableCell>
                        <TableCell className="text-right text-xs">{r._initials ? fmt(r._initials) : "—"}</TableCell>
                        <TableCell className="text-right text-xs">{r._services ? fmt(r._services) : "—"}</TableCell>
                        <TableCell className="text-xs">{r._month ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r._product ?? ""}</TableCell>
                        <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 italic min-w-[180px]">{getWonInsight(r)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Celebrate */}
          {won.length > 0 && (
            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Celebrate Wins — {celebLabel}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setCelebVar((v) => v + 1)}>
                      <RefreshCw className="w-3 h-3" />Refresh
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={copyPost}>
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy Post"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-xs leading-relaxed bg-muted rounded-xl p-4 whitespace-pre-wrap font-sans select-all max-h-72 overflow-y-auto">
                  {isSingle && typeof filters.month === "string"
                    ? generateCelebration(celebWon, filters.month, { variation: celebVar, oiTargets, monthlyBudget, allData: data })
                    : generateMultiMonthCelebration(celebWon, celebLabel, celebMonths, { variation: celebVar, oiTargets, monthlyBudget, allData: data })}
                </pre>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Closed Lost Deals</CardTitle>
              <p className="text-xs text-muted-foreground">Click 📝 to add a review</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">Review</TableHead>
                    <TableHead>AD</TableHead>
                    <TableHead>Opportunity</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>ELV Match</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Pushes</TableHead>
                    <TableHead>Commit</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="min-w-[200px]">Insight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...lost].sort((a, b) => (b._val ?? 0) - (a._val ?? 0)).map((r, i) => {
                    const hasReview = !!lostReviews[r["Opportunity Name"] ?? ""]?.reason
                    const elvMatch = lookupELVAccount(String(r["Account Name"] ?? ""))
                    return (
                      <TableRow key={i} className={elvMatch ? "" : "opacity-90"}>
                        <TableCell>
                          <button
                            onClick={() => openReview(r)}
                            className={`text-sm hover:scale-110 transition-transform ${hasReview ? "text-emerald-600" : (r._val ?? 0) >= 30000 ? "text-destructive" : "text-muted-foreground"}`}
                            title={hasReview ? "Review completed" : "Add review"}
                          >
                            {hasReview ? "✓" : "📝"}
                          </button>
                        </TableCell>
                        <TableCell>{(r.User ?? "").split(" ")[0]}</TableCell>
                        <TableCell className="font-medium text-xs max-w-[160px]">
                          <button onClick={(e) => { e.stopPropagation(); setDealCard(r) }} className="flex items-center gap-1 group text-left hover:text-primary transition-colors">
                            <span className="truncate">{r["Opportunity Name"] ?? ""}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </button>
                        </TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{r["Account Name"] ?? ""}</TableCell>
                        <TableCell className="text-xs">
                          {elvMatch ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-primary text-[10px] font-bold">{elvMatch.elvId}</span>
                              <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                                <Link2 className="w-2.5 h-2.5" />
                                {elvMatch.parentAccount}
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-500 text-[10px]">No match</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-destructive text-xs">{fmt(r._val ?? 0)}</TableCell>
                        <TableCell className="text-xs">{r._month ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs">{r._push ?? 0}</TableCell>
                        <TableCell className="text-xs">{r._commit ?? ""}</TableCell>
                        <TableCell className="text-xs">{r.Stage ?? ""}</TableCell>
                        <TableCell className="text-xs text-destructive italic min-w-[180px]">{getLostInsight(r)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loss Review Dialog */}
      <Dialog open={!!reviewDeal} onOpenChange={(o) => !o && setReviewDeal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <span>📋</span> Lost Deal Review
            </DialogTitle>
          </DialogHeader>
          {reviewDeal && (
            <div className="space-y-4 text-sm">
              {/* Deal header — key facts at a glance */}
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="font-bold text-base mb-3">{reviewDeal["Opportunity Name"]}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Account</p>
                    <p className="font-medium">{reviewDeal["Account Name"] ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Value</p>
                    <p className="font-bold text-destructive">{fmt(reviewDeal._val ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Close Date</p>
                    <p className="font-medium">{reviewDeal["Close Date"] ?? reviewDeal._month ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Push Count</p>
                    <p className="font-medium">{reviewDeal._push ?? 0} pushes</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Stage</p>
                    <p className="font-medium">{reviewDeal.Stage ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">AD</p>
                    <p className="font-medium">{reviewDeal.User ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Commit Status</p>
                    <p className="font-medium">{reviewDeal._commit ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Split</p>
                    <p className="font-medium">{reviewDeal._abc !== reviewDeal._val && reviewDeal._abc ? fmt(reviewDeal._abc) : "—"}</p>
                  </div>
                </div>
              </div>

              {/* Quick Q&A */}
              <div className="space-y-3">
                {[
                  { key: "reason", label: "1. Main reason for loss", placeholder: "Price, functionality, relationship, timing, no decision..." },
                  { key: "competitor", label: "2. Who were we competing with?", placeholder: "Competitor name or 'No competition'" },
                  { key: "decision", label: "3. What did they decide to do instead?", placeholder: "Went with competitor, deferred, internal build..." },
                  { key: "detail", label: "4. What specifically happened?", placeholder: "Key moments that led to the loss..." },
                  { key: "killer", label: "5. 🔴 Who killed the deal?", placeholder: "Was it internal (pricing, delay, product gap) or external (champion left, budget cut, competitor)?" },
                  { key: "nextSteps", label: "6. Next steps", placeholder: "Re-engage in 6 months, nurture, mark as lost permanently..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold block mb-1">{label}</label>
                    <Textarea
                      rows={2}
                      placeholder={placeholder}
                      value={(reviewForm as Record<string, string>)[key] ?? ""}
                      onChange={(e) => setReviewForm((s) => ({ ...s, [key]: e.target.value }))}
                    className="text-xs"
                  />
                </div>
              ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDeal(null)}>Cancel</Button>
            <Button onClick={saveReview}>Save Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deal Card Modal ─────────────────────────────────────────────── */}
      <Dialog open={!!dealCard} onOpenChange={(o) => !o && setDealCard(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base leading-snug pr-6">
              {dealCard?.["Opportunity Name"] ?? "Deal Details"}
            </DialogTitle>
          </DialogHeader>
          {dealCard && (
            <div className="space-y-4 text-sm">
              {/* Key metrics */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">OI Value</div>
                  <div className="text-lg font-bold text-primary">{fmt(dealCard._val ?? 0)}</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Total ABC</div>
                  <div className="text-lg font-bold">{fmt(dealCard._abc ?? 0)}</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Services</div>
                  <div className="text-lg font-bold text-emerald-500">{dealCard._services ? fmt(dealCard._services) : "—"}</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Stage</div>
                  <div className="flex justify-center mt-1"><StatusBadge status={dealCard._stageSummary ?? "Pipe"} /></div>
                </div>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 border rounded-lg p-4">
                {([
                  ["ELV ID", dealCard._elvId ?? "—"],
                  ["Account Director", dealCard.User ?? "—"],
                  ["Account Name", String(dealCard["Account Name"] ?? "—")],
                  ["Ultimate Parent", String(dealCard["Ultimate Parent Account Name"] ?? "—")],
                  ["Close Date", String(dealCard["Close Date"] ?? dealCard["Close Date (2)"] ?? "—")],
                  ["Month", dealCard._month ?? "—"],
                  ["Commit Status", dealCard._commit ?? "—"],
                  ["Product", dealCard._product ?? "—"],
                  ["Push Count", String(dealCard._push ?? 0)],
                  ["Stage Duration", dealCard._stageDur ? `${dealCard._stageDur} days` : "—"],
                  ["Services", dealCard._services ? fmt(dealCard._services) : "—"],
                  ["Opportunity ID", String(dealCard["Opportunity ID"] ?? "—")],
                  ["Created By", String(dealCard._createdBy ?? dealCard["Created By"] ?? "—")],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="text-muted-foreground text-xs w-32 shrink-0">{label}</span>
                    <span className="font-medium text-xs break-words">{value}</span>
                  </div>
                ))}
              </div>

              {/* Next Step — prominent */}
              {dealCard["Next Step"] && (
                <div className="border-l-4 border-primary bg-primary/5 rounded-r-lg p-4">
                  <div className="text-xs text-primary mb-1.5 font-semibold uppercase tracking-wider">📌 Next Step</div>
                  <p className="text-sm leading-relaxed">{String(dealCard["Next Step"])}</p>
                </div>
              )}

              {/* Lost review summary — if completed */}
              {dealCard._stageSummary === "Lost" && (() => {
                const review = lostReviews[dealCard["Opportunity Name"] ?? ""]
                if (!review?.reason) return null
                return (
                  <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-destructive">📋 Loss Review</div>
                    {([
                      ["Reason", review.reason],
                      ["Competitor", review.competitor],
                      ["Decision", review.decision],
                      ["Detail", review.detail],
                      ["Next Steps", review.nextSteps],
                    ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="text-xs">
                        <span className="text-muted-foreground">{label}: </span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Qualification score if reviewed */}
              {(() => {
                const oppId = (dealCard["Opportunity ID"] ?? dealCard["Opportunity Name"] ?? "") as string
                const qs = getQualifyScore(oppId)
                if (qs === null) return null
                return (
                  <div className="border rounded-lg p-3 flex items-center justify-between">
                    <div className="text-xs font-semibold">🎯 Qualification Score</div>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${qs >= 70 ? "bg-green-500/15 text-green-500" : qs >= 40 ? "bg-yellow-500/15 text-yellow-500" : "bg-red-500/15 text-red-500"}`}>
                      {qs}/100
                    </span>
                  </div>
                )
              })()}

              {/* Flags */}
              {(dealCard._risk || dealCard._keyDeal) && (
                <div className="flex gap-2">
                  <RiskBadge risk={dealCard._risk} />
                  <KeyDealBadge keyDeal={dealCard._keyDeal} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
