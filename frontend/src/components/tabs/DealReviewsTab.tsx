import { useState, useMemo } from "react"
import { useDashboardStore } from "@/store/dashboardStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fmtKM, fmt } from "@/lib/formatters"
import { openDealModal } from "@/lib/modalBus"
import { USERS } from "@/config/users"
import { MONTHS } from "@/config/months"
import {
  X, Clock, CheckCircle2, Brain, AlertTriangle,
  Copy, Save, ChevronDown, ChevronUp, Search, Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Deal } from "@/types"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Q {
  id: string
  section: string
  question: string
  type: "text" | "yn" | "yn-detail" | "yn-date"
  placeholder?: string
}

interface DealReview {
  answers: Record<string, string>
  majorRisk: boolean
  decisionMakers: string[]
  confidence: number
  aiSummary: string
  savedAt: string
}

// ── Questions ─────────────────────────────────────────────────────────────────
const QUESTIONS: Q[] = [
  // Pain & Problem
  { id: "pain_driver", section: "Pain & Problem", question: "What's the pain driver — pain, reason for looking for a solution?", type: "text", placeholder: "e.g. Current system failing, manual processes, compliance risk..." },
  { id: "why_now", section: "Pain & Problem", question: "Why now?", type: "text", placeholder: "e.g. Contract end date, new regulation, business event..." },
  { id: "impact_nothing", section: "Pain & Problem", question: "What would be the impact if they did nothing?", type: "text", placeholder: "e.g. Continued inefficiency, regulatory risk, lost revenue..." },

  // Stakeholders
  { id: "who_driving", section: "Stakeholders", question: "Who is driving it from their team?", type: "text", placeholder: "Name and role of internal champion..." },
  { id: "who_signs", section: "Stakeholders", question: "Who will sign it?", type: "text", placeholder: "Name and title of signatory..." },
  { id: "signatory_rights", section: "Stakeholders", question: "Does the main contact have signatory rights?", type: "yn", placeholder: "" },
  { id: "procurement", section: "Stakeholders", question: "Is procurement involved?", type: "yn", placeholder: "" },
  { id: "it_involved", section: "Stakeholders", question: "Has IT been involved?", type: "yn", placeholder: "" },
  { id: "internal_sponsors", section: "Stakeholders", question: "Do we have internal sponsors — commercial or product?", type: "text", placeholder: "Names of any internal sponsors..." },
  { id: "presales", section: "Stakeholders", question: "Who from Presales or enablement is involved?", type: "text", placeholder: "Names of presales/enablement team members..." },

  // Budget & Timeline
  { id: "budget_in_place", section: "Budget & Timeline", question: "Do they have a budget in place?", type: "yn-detail", placeholder: "Budget amount or details..." },
  { id: "live_date", section: "Budget & Timeline", question: "When do they need the system to be live?", type: "text", placeholder: "Target go-live date or timeframe..." },
  { id: "desired_live_date", section: "Budget & Timeline", question: "Do they have a desired live date?", type: "yn-date", placeholder: "" },

  // Technical
  { id: "functionality_gaps", section: "Technical", question: "Have you identified functionality gaps?", type: "text", placeholder: "Any gaps between our solution and their requirements..." },
  { id: "current_supplier", section: "Technical", question: "Who is the current supplier and what is the notice period?", type: "text", placeholder: "Current supplier name and contract notice period..." },

  // Commercial
  { id: "blockers", section: "Commercial", question: "Blockers — what will kill this deal?", type: "text", placeholder: "Key risks, objections, or deal-killers..." },
  { id: "tc_discussed", section: "Commercial", question: "Have T&Cs been discussed?", type: "yn", placeholder: "" },
  { id: "commercials_discussed", section: "Commercial", question: "Have commercials been discussed?", type: "yn", placeholder: "" },

  // Next Steps
  { id: "clear_next_steps", section: "Next Steps", question: "Do you have clear next steps?", type: "text", placeholder: "Describe the agreed next steps..." },
  { id: "mutual_close_plan", section: "Next Steps", question: "Has a mutual close plan been agreed?", type: "yn-date", placeholder: "Sign-off date..." },
]

const SECTIONS = [...new Set(QUESTIONS.map(q => q.section))]

const DECISION_MAKERS = ["CEO", "CFO", "CTO/IT", "Operations", "Procurement", "Champion"]

// ── Storage ───────────────────────────────────────────────────────────────────
function getReviewKey(dealId: string) { return `eve_deal_review::${dealId}` }
function getDealId(d: Deal) { return d._elvId || d["Opportunity Name"] || "unknown" }
function loadReview(dealId: string): DealReview {
  try { return JSON.parse(localStorage.getItem(getReviewKey(dealId)) ?? "null") ?? emptyReview() }
  catch { return emptyReview() }
}
function saveReview(dealId: string, r: DealReview) {
  localStorage.setItem(getReviewKey(dealId), JSON.stringify({ ...r, savedAt: new Date().toISOString() }))
}
function emptyReview(): DealReview {
  return { answers: {}, majorRisk: false, decisionMakers: [], confidence: 50, aiSummary: "", savedAt: "" }
}

// ── Q status icon ─────────────────────────────────────────────────────────────
function QStatus({ answer }: { answer: string | undefined }) {
  if (!answer || answer.trim() === "") return <X className="w-3.5 h-3.5 text-muted-foreground/40" />
  if (answer === "No" || answer === "N") return <Clock className="w-3.5 h-3.5 text-amber-500" />
  return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
}

// ── AI Summary Generator ──────────────────────────────────────────────────────
function generateAISummary(deal: Deal, review: DealReview): string {
  const name = deal["Opportunity Name"] ?? "This deal"
  const account = deal["Account Name"] ?? "the account"
  const val = fmtKM(deal._val ?? 0)
  const stage = deal.Stage ?? "Unknown"
  const meddpicc = deal._meddpicc ?? 0
  const push = deal._push ?? 0
  const a = review.answers

  const risks: string[] = []
  const strengths: string[] = []

  if (!a.who_signs) risks.push("signatory not identified")
  if (a.procurement === "Yes") risks.push("procurement involved — expect delays")
  if (!a.budget_in_place || a.budget_in_place.startsWith("No")) risks.push("no confirmed budget")
  if (!a.blockers) risks.push("blockers not documented")
  if (!a.mutual_close_plan || a.mutual_close_plan.startsWith("No")) risks.push("no mutual close plan")
  if (push > 2) risks.push(`pushed ${push}x — momentum concern`)
  if (meddpicc < 40) risks.push(`low MEDDPICC score (${meddpicc}%)`)

  if (a.who_driving) strengths.push(`strong internal champion (${a.who_driving})`)
  if (a.tc_discussed === "Yes") strengths.push("T&Cs discussed")
  if (a.commercials_discussed === "Yes") strengths.push("commercials aligned")
  if (a.budget_in_place && a.budget_in_place.startsWith("Yes")) strengths.push("budget confirmed")
  if (a.clear_next_steps) strengths.push("clear next steps agreed")
  if (meddpicc >= 70) strengths.push(`strong MEDDPICC score (${meddpicc}%)`)

  const riskLevel = review.majorRisk ? "⚠️ MAJOR RISK FLAGGED" : risks.length >= 3 ? "HIGH RISK" : risks.length >= 1 ? "MEDIUM RISK" : "LOW RISK"

  return `**${name} — ${account} | ${val} | ${stage}**\n\n` +
    `**Risk Level:** ${riskLevel}\n\n` +
    (a.pain_driver ? `**Pain:** ${a.pain_driver}\n\n` : "") +
    (a.why_now ? `**Why Now:** ${a.why_now}\n\n` : "") +
    (strengths.length > 0 ? `**Strengths:** ${strengths.join(", ")}\n\n` : "") +
    (risks.length > 0 ? `**Risks:** ${risks.join(", ")}\n\n` : "") +
    (a.blockers ? `**Blockers:** ${a.blockers}\n\n` : "") +
    (a.clear_next_steps ? `**Next Steps:** ${a.clear_next_steps}` : "Next steps not defined.")
}

// ── Copy to SF formatter ──────────────────────────────────────────────────────
function formatForSF(deal: Deal, review: DealReview): string {
  const a = review.answers
  const lines = [
    `DEAL REVIEW — ${deal["Opportunity Name"] ?? ""} | ${deal["Account Name"] ?? ""} | ${fmtKM(deal._val ?? 0)}`,
    `Stage: ${deal.Stage ?? ""} | Confidence: ${review.confidence}%${review.majorRisk ? " | ⚠ MAJOR RISK" : ""}`,
    "",
  ]
  QUESTIONS.forEach(q => {
    const ans = a[q.id]
    if (ans) lines.push(`${q.question}\n→ ${ans}`)
  })
  if (review.decisionMakers.length > 0) lines.push(`\nDecision Makers: ${review.decisionMakers.join(", ")}`)
  if (review.aiSummary) lines.push(`\nAI Summary:\n${review.aiSummary.replace(/\*\*/g, "")}`)
  return lines.join("\n")
}

// ── Single deal review card ───────────────────────────────────────────────────
export function DealReviewCard({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const dealId = getDealId(deal)
  const [review, setReview] = useState<DealReview>(() => loadReview(dealId))
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({ [SECTIONS[0]]: true })
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  function update(field: keyof DealReview, val: unknown) {
    setReview(r => ({ ...r, [field]: val }))
  }
  function updateAnswer(id: string, val: string) {
    setReview(r => ({ ...r, answers: { ...r.answers, [id]: val } }))
  }
  function toggleDM(dm: string) {
    setReview(r => ({
      ...r,
      decisionMakers: r.decisionMakers.includes(dm)
        ? r.decisionMakers.filter(d => d !== dm)
        : [...r.decisionMakers, dm],
    }))
  }
  function generateAI() {
    const summary = generateAISummary(deal, review)
    update("aiSummary", summary)
  }
  function handleSave() {
    saveReview(dealId, review)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  function handleCopy() {
    navigator.clipboard.writeText(formatForSF(deal, review))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const completedCount = QUESTIONS.filter(q => review.answers[q.id]?.trim()).length
  const pct = Math.round((completedCount / QUESTIONS.length) * 100)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl border shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg truncate">{deal["Opportunity Name"] ?? "Deal Review"}</h3>
              {review.majorRisk && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/30">
                  <AlertTriangle className="w-3 h-3" /> MAJOR RISK
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {deal["Account Name"]} · {fmtKM(deal._val ?? 0)} · {deal.Stage} · {deal._month}
            </p>
            {/* Progress bar */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{completedCount}/{QUESTIONS.length} answered</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <Button size="sm" variant={review.majorRisk ? "destructive" : "outline"}
              onClick={() => update("majorRisk", !review.majorRisk)}
              className="text-xs h-7">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {review.majorRisk ? "Risk Flagged" : "Flag Risk"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopy} className="text-xs h-7">
              <Copy className="w-3 h-3 mr-1" />{copied ? "Copied!" : "Copy to SF"}
            </Button>
            <Button size="sm" onClick={handleSave} className="text-xs h-7">
              <Save className="w-3 h-3 mr-1" />{saved ? "Saved!" : "Save"}
            </Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className="w-56 border-r p-3 space-y-4 overflow-y-auto shrink-0">
            {/* Confidence */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Confidence</p>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={100} value={review.confidence}
                  onChange={e => update("confidence", parseInt(e.target.value))}
                  className="flex-1 h-1.5 accent-primary" />
                <span className={cn("text-xs font-bold w-8", review.confidence >= 70 ? "text-green-500" : review.confidence >= 40 ? "text-amber-500" : "text-red-500")}>
                  {review.confidence}%
                </span>
              </div>
            </div>

            {/* Decision Makers */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Decision Makers</p>
              <div className="space-y-1">
                {DECISION_MAKERS.map(dm => (
                  <label key={dm} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={review.decisionMakers.includes(dm)}
                      onChange={() => toggleDM(dm)} className="w-3 h-3 accent-primary" />
                    <span className="text-xs">{dm}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Section nav */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Sections</p>
              <div className="space-y-0.5">
                {SECTIONS.map(s => {
                  const qs = QUESTIONS.filter(q => q.section === s)
                  const done = qs.filter(q => review.answers[q.id]?.trim()).length
                  return (
                    <button key={s} onClick={() => setExpandedSection(prev => ({ ...prev, [s]: true }))}
                      className="w-full flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-muted/50">
                      <span className="truncate">{s}</span>
                      <span className={cn("text-[10px] font-bold", done === qs.length ? "text-green-500" : done > 0 ? "text-amber-500" : "text-muted-foreground/40")}>
                        {done}/{qs.length}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* AI Summary */}
            <div>
              <Button size="sm" variant="outline" className="w-full text-xs h-7 border-purple-500/30 text-purple-500 hover:bg-purple-500/10" onClick={generateAI}>
                <Brain className="w-3 h-3 mr-1" />Generate AI Summary
              </Button>
            </div>
          </div>

          {/* Main Q&A panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* AI Summary */}
            {review.aiSummary && (
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                    <Brain className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-purple-400">AI Summary</span>
                  <Button size="sm" variant="ghost" className="h-5 text-[10px] ml-auto" onClick={generateAI}>Refresh</Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {review.aiSummary.split("\n").map((line, i) => {
                    if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold text-foreground">{line.slice(2,-2)}</p>
                    const parts = line.split(/(\*\*[^*]+\*\*)/)
                    return <p key={i}>{parts.map((p, j) => p.startsWith("**") ? <strong key={j}>{p.slice(2,-2)}</strong> : p)}</p>
                  })}
                </div>
              </div>
            )}

            {/* Sections */}
            {SECTIONS.map(section => {
              const qs = QUESTIONS.filter(q => q.section === section)
              const done = qs.filter(q => review.answers[q.id]?.trim()).length
              const isOpen = expandedSection[section] !== false
              return (
                <div key={section} className="rounded-lg border bg-card">
                  <button className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold hover:bg-muted/20"
                    onClick={() => setExpandedSection(p => ({ ...p, [section]: !p[section] }))}>
                    <span>{section}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-bold", done === qs.length ? "text-green-500" : done > 0 ? "text-amber-500" : "text-muted-foreground/40")}>
                        {done}/{qs.length}
                      </span>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-4 border-t">
                      {qs.map(q => {
                        const ans = review.answers[q.id] ?? ""
                        return (
                          <div key={q.id} className="space-y-1.5 pt-3">
                            <div className="flex items-start gap-2">
                              <QStatus answer={ans} />
                              <label className="text-sm font-medium leading-tight flex-1">{q.question}</label>
                            </div>
                            {q.type === "text" && (
                              <textarea
                                className="w-full text-sm bg-muted/20 border rounded-lg p-2.5 min-h-[60px] resize-none focus:ring-1 ring-primary"
                                placeholder={q.placeholder}
                                value={ans}
                                onChange={e => updateAnswer(q.id, e.target.value)}
                              />
                            )}
                            {q.type === "yn" && (
                              <div className="flex gap-2">
                                {["Yes", "No"].map(v => (
                                  <button key={v} onClick={() => updateAnswer(q.id, v)}
                                    className={cn("px-4 py-1.5 rounded-lg text-sm font-medium border transition-all",
                                      ans === v ? (v === "Yes" ? "bg-green-500/20 border-green-500 text-green-400" : "bg-red-500/20 border-red-500 text-red-400") : "hover:bg-muted border-border")}>
                                    {v}
                                  </button>
                                ))}
                              </div>
                            )}
                            {q.type === "yn-detail" && (
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  {["Yes", "No"].map(v => (
                                    <button key={v} onClick={() => updateAnswer(q.id, v)}
                                      className={cn("px-4 py-1.5 rounded-lg text-sm font-medium border transition-all",
                                        ans?.startsWith(v) ? (v === "Yes" ? "bg-green-500/20 border-green-500 text-green-400" : "bg-red-500/20 border-red-500 text-red-400") : "hover:bg-muted border-border")}>
                                      {v}
                                    </button>
                                  ))}
                                </div>
                                {ans?.startsWith("Yes") && (
                                  <input className="w-full text-sm bg-muted/20 border rounded-lg p-2 focus:ring-1 ring-primary"
                                    placeholder={q.placeholder} value={ans.replace("Yes — ", "").replace("Yes", "")}
                                    onChange={e => updateAnswer(q.id, `Yes — ${e.target.value}`)} />
                                )}
                              </div>
                            )}
                            {q.type === "yn-date" && (
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  {["Yes", "No"].map(v => (
                                    <button key={v} onClick={() => updateAnswer(q.id, v)}
                                      className={cn("px-4 py-1.5 rounded-lg text-sm font-medium border transition-all",
                                        ans?.startsWith(v) ? (v === "Yes" ? "bg-green-500/20 border-green-500 text-green-400" : "bg-red-500/20 border-red-500 text-red-400") : "hover:bg-muted border-border")}>
                                      {v}
                                    </button>
                                  ))}
                                </div>
                                {ans?.startsWith("Yes") && (
                                  <input type="date" className="text-sm bg-muted/20 border rounded-lg p-2 focus:ring-1 ring-primary"
                                    value={ans.replace("Yes — ", "").replace("Yes", "")}
                                    onChange={e => updateAnswer(q.id, `Yes — ${e.target.value}`)} />
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export function DealReviewsTab() {
  const { data } = useDashboardStore()
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [search, setSearch] = useState("")
  const [localUser, setLocalUser] = useState("All")
  const [filterReviewed, setFilterReviewed] = useState<"all" | "reviewed" | "pending">("all")

  const deals = useMemo(() => {
    return data.filter(d => d._stageSummary === "Pipe" || d._stageSummary === "Won")
  }, [data])

  const reviewed = deals.filter(d => {
    try { return !!localStorage.getItem(getReviewKey(getDealId(d))) } catch { return false }
  })

  const majorRisks = deals.filter(d => {
    try {
      const r = JSON.parse(localStorage.getItem(getReviewKey(getDealId(d))) ?? "null") as DealReview | null
      return r?.majorRisk === true
    } catch { return false }
  })

  const filtered = useMemo(() => {
    return deals.filter(d => {
      if (localUser !== "All" && d.User !== localUser) return false
      const q = search.toLowerCase()
      if (q && !(d["Opportunity Name"] ?? "").toLowerCase().includes(q) && !(d["Account Name"] ?? "").toLowerCase().includes(q)) return false
      if (filterReviewed === "reviewed") {
        try { return !!localStorage.getItem(getReviewKey(getDealId(d))) } catch { return false }
      }
      if (filterReviewed === "pending") {
        try { return !localStorage.getItem(getReviewKey(getDealId(d))) } catch { return true }
      }
      return true
    })
  }, [deals, localUser, search, filterReviewed])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Deal Reviews</h2>
        <p className="text-sm text-muted-foreground">Conversational deal qualification across 20 key questions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Deals", value: deals.length, color: "" },
          { label: "Reviewed", value: reviewed.length, color: "text-green-500" },
          { label: "Pending", value: deals.length - reviewed.length, color: "text-amber-500" },
          { label: "Major Risk", value: majorRisks.length, color: "text-red-500" },
        ].map(s => (
          <Card key={s.label} className="cursor-pointer hover:bg-muted/20" onClick={() => setFilterReviewed(s.label === "Reviewed" ? "reviewed" : s.label === "Pending" ? "pending" : "all")}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="pl-9 pr-3 py-1.5 text-sm border rounded-md bg-background w-56"
            placeholder="Search deals..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="text-sm border rounded-md px-3 py-1.5 bg-background" value={localUser} onChange={e => setLocalUser(e.target.value)}>
          <option value="All">All ADs</option>
          {USERS.map(u => <option key={u} value={u}>{u.split(" ")[0]}</option>)}
        </select>
        <div className="flex rounded-lg border overflow-hidden text-xs">
          {(["all", "reviewed", "pending"] as const).map(v => (
            <button key={v} onClick={() => setFilterReviewed(v)}
              className={cn("px-3 py-1.5 capitalize font-medium", filterReviewed === v ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Deal list */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Deal</th>
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Account</th>
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">AD</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Value</th>
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Stage</th>
                <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Risk</th>
                <th className="px-4 py-2 text-center font-semibold text-muted-foreground">Progress</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const dealId = getDealId(d)
                let review: DealReview | null = null
                try { review = JSON.parse(localStorage.getItem(getReviewKey(dealId)) ?? "null") } catch {}
                const completedCount = review ? QUESTIONS.filter(q => review!.answers[q.id]?.trim()).length : 0
                const pct = Math.round((completedCount / QUESTIONS.length) * 100)
                return (
                  <tr key={i} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedDeal(d)}>
                    <td className="px-4 py-2 max-w-[200px]">
                      <p className="truncate font-medium">{d["Opportunity Name"] ?? "—"}</p>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground max-w-[150px] truncate">{d["Account Name"] ?? "—"}</td>
                    <td className="px-4 py-2">{(d.User ?? "—").split(" ")[0]}</td>
                    <td className="px-4 py-2 text-right font-medium">{fmtKM(d._val ?? 0)}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{d.Stage ?? "—"}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {review ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {review?.majorRisk && <AlertTriangle className="w-4 h-4 text-red-500 mx-auto" />}
                    </td>
                    <td className="px-4 py-2">
                      {review && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button size="sm" variant="outline" className="h-6 text-xs">Review</Button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No deals match your filters</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Deal review modal */}
      {selectedDeal && <DealReviewCard deal={selectedDeal} onClose={() => setSelectedDeal(null)} />}
    </div>
  )
}
