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
import { openDealModal } from "@/App"
import { getLostInsight, getWonInsight } from "@/lib/insights"
import type { Deal, LostReview } from "@/types"
import { Copy, Check, RefreshCw, Link2 } from "lucide-react"
import { generateCelebration, generateMultiMonthCelebration } from "@/lib/celebrationBuilder"
import { lookupELVAccount } from "@/config/elvAccounts"

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
                      <TableRow key={i}>
                        <TableCell>{(r.User ?? "").split(" ")[0]}</TableCell>
                        <TableCell className="font-medium text-xs max-w-[160px] truncate">{r["Opportunity Name"] ?? ""}</TableCell>
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
                        <TableCell className="font-medium text-xs max-w-[160px] truncate">{r["Opportunity Name"] ?? ""}</TableCell>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Lost Deal Review</DialogTitle>
          </DialogHeader>
          {reviewDeal && (
            <div className="space-y-3 text-sm">
              <div className="bg-muted rounded-lg p-3 space-y-1 text-xs">
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Opportunity:</span>
                  <span className="font-medium">{reviewDeal["Opportunity Name"]}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Account:</span>
                  <span>{reviewDeal["Account Name"]}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-bold text-destructive">{fmt(reviewDeal._val ?? 0)}</span>
                </div>
              </div>
              {[
                { key: "reason", label: "Main Reason for Loss", placeholder: "e.g. Price, Functionality, Relationship, Timing..." },
                { key: "detail", label: "Detail", placeholder: "What specifically happened?" },
                { key: "decision", label: "What did they decide to do?", placeholder: "e.g. Went with competitor, deferred..." },
                { key: "competitor", label: "Who were we competing with?", placeholder: "Competitor name or 'None'" },
                { key: "nextSteps", label: "Next Steps", placeholder: "e.g. Re-engage in 6 months, nurture..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDeal(null)}>Cancel</Button>
            <Button onClick={saveReview}>Save Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
