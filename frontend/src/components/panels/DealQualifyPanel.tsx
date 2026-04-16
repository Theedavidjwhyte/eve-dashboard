import { useState, useEffect } from "react"
import { X, Brain, Save, ChevronDown, ChevronUp, Target } from "lucide-react"
import { upsertQualification } from "@/lib/syncService"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fmt } from "@/lib/formatters"
import type { Deal } from "@/types"

// ── Types ─────────────────────────────────────────────────────────────────────
export interface QualifyReview {
  opportunityId: string
  oppName: string
  answers: Record<number, string>
  confidence: "red" | "amber" | "green"
  score: number
  aiSummary: string
  reviewedAt: string
  reviewedBy?: string
}

// ── MEDDPICC questions — plain English, no jargon ────────────────────────────
const QUESTIONS = [
  {
    id: 1,
    label: "Economic Buyer",
    q: "Who has the final say on budget? Have we spoken to them directly?",
    placeholder: "e.g. CFO engaged, meeting booked 15 Mar...",
    weight: 20,
  },
  {
    id: 2,
    label: "Pain & Value",
    q: "What problem are we solving? Can we quantify the value to them?",
    placeholder: "e.g. Losing 12% margin on manual stocktake, ROI = £40k/yr...",
    weight: 20,
  },
  {
    id: 3,
    label: "Decision Process",
    q: "How do they make decisions? Who else is involved? What's the timeline?",
    placeholder: "e.g. Board approval needed, IT sign-off, 6 week procurement...",
    weight: 15,
  },
  {
    id: 4,
    label: "Champion",
    q: "Who is fighting for us internally? Are they credible with the buyer?",
    placeholder: "e.g. Ops Director strongly advocating, has budget influence...",
    weight: 20,
  },
  {
    id: 5,
    label: "Competition",
    q: "Who else are they talking to? Why are we better?",
    placeholder: "e.g. Vs. Zonal — we win on integration, price comparable...",
    weight: 10,
  },
  {
    id: 6,
    label: "Next Steps",
    q: "What needs to happen to close this? What's blocking it right now?",
    placeholder: "e.g. Demo to CEO w/c 20 Mar, then legal review — 2 weeks...",
    weight: 15,
  },
]

// ── Score engine ─────────────────────────────────────────────────────────────
function calcScore(
  answers: Record<number, string>,
  confidence: "red" | "amber" | "green"
): number {
  let score = 0
  QUESTIONS.forEach((q) => {
    const ans = (answers[q.id] ?? "").trim()
    if (ans.length > 80) score += q.weight
    else if (ans.length > 30) score += Math.round(q.weight * 0.6)
    else if (ans.length > 5) score += Math.round(q.weight * 0.25)
  })
  const confBonus = confidence === "green" ? 0 : confidence === "amber" ? -5 : -15
  return Math.max(0, Math.min(100, score + confBonus))
}

function scoreColour(score: number) {
  if (score >= 70) return "text-green-400"
  if (score >= 40) return "text-yellow-400"
  return "text-red-400"
}

function scoreBg(score: number) {
  if (score >= 70) return "bg-green-500/10 border-green-500/30"
  if (score >= 40) return "bg-yellow-500/10 border-yellow-500/30"
  return "bg-red-500/10 border-red-500/30"
}

function scoreLabel(score: number) {
  if (score >= 90) return "🔒 Lock — move to commit"
  if (score >= 70) return "🟢 Strong — commit candidate"
  if (score >= 40) return "🟡 Progressing — needs work"
  return "🔴 At risk — major gaps"
}

// ── AI benchmark engine ───────────────────────────────────────────────────────
function generateAIBenchmark(
  deal: Deal,
  answers: Record<number, string>,
  score: number,
  confidence: "red" | "amber" | "green"
): string {
  const opp = deal["Opportunity Name"] ?? "this deal"
  const val = fmt(deal._val ?? 0)
  const buyer = (answers[1] ?? "").trim()
  const pain = (answers[2] ?? "").trim()
  const process = (answers[3] ?? "").trim()
  const champion = (answers[4] ?? "").trim()
  const comp = (answers[5] ?? "").trim()
  const next = (answers[6] ?? "").trim()

  const gaps: string[] = []
  if (!buyer || buyer.length < 10) gaps.push("no confirmed economic buyer")
  if (!pain || pain.length < 10) gaps.push("value proposition not quantified")
  if (!process || process.length < 10) gaps.push("decision process unclear")
  if (!champion || champion.length < 10) gaps.push("no internal champion identified")
  if (!next || next.length < 10) gaps.push("next steps undefined")

  const strengths: string[] = []
  if (buyer && buyer.length > 30) strengths.push("economic buyer engaged")
  if (pain && pain.length > 30) strengths.push("clear value case")
  if (champion && champion.length > 30) strengths.push("strong champion")
  if (comp && comp.length > 10) strengths.push("competition understood")

  let summary = `**${opp}** (${val}) — Score: ${score}/100. `

  if (strengths.length > 0) {
    summary += `Strengths: ${strengths.join(", ")}. `
  }

  if (gaps.length > 0) {
    summary += `Gaps to close: ${gaps.join(", ")}. `
  }

  if (score >= 70) {
    summary += `Recommendation: Strong pipeline — ${next ? `focus on ${next.substring(0, 60)}` : "push for formal commit this week"}.`
  } else if (score >= 40) {
    const topGap = gaps[0] ?? "key qualification criteria"
    summary += `Recommendation: Address ${topGap} before committing. ${process ? `Timeline: ${process.substring(0, 50)}` : "Confirm timeline with AD"}.`
  } else {
    summary += `Recommendation: Do not commit. Requires coaching session — too many open questions. ${confidence === "red" ? "AD confidence low — review priority." : ""}`
  }

  return summary
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_KEY = "eve_qualify_reviews"

function loadReviews(): Record<string, QualifyReview> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}")
  } catch {
    return {}
  }
}

function saveReview(review: QualifyReview) {
  const all = loadReviews()
  all[review.opportunityId] = review
  localStorage.setItem(LS_KEY, JSON.stringify(all))
  // Sync to Supabase for cross-device access
  upsertQualification(review.opportunityId, review.oppName, review as unknown as Record<string, unknown>).catch(console.warn)
}

export function getQualifyReview(oppId: string): QualifyReview | null {
  return loadReviews()[oppId] ?? null
}

export function getQualifyScore(oppId: string): number | null {
  return loadReviews()[oppId]?.score ?? null
}

// ── Verticals & Stakeholders ──────────────────────────────────────────────────
const VERTICALS = [
  "Hospitality", "Retail", "Leisure", "Contract Catering",
  "Hotels", "Quick Service", "Fine Dining", "Pubs & Bars",
  "Stadium & Venues", "Healthcare", "Education", "IT / Tech",
]

const STAKEHOLDERS = [
  { id: "ceo", label: "CEO", icon: "👑" },
  { id: "cfo", label: "CFO", icon: "💰" },
  { id: "cto", label: "CTO", icon: "⚙️" },
  { id: "marketing", label: "Marketing", icon: "📣" },
  { id: "ops", label: "Operations", icon: "🔧" },
  { id: "it", label: "IT", icon: "💻" },
  { id: "procurement", label: "Procurement", icon: "📋" },
  { id: "chefs", label: "Chefs / F&B", icon: "🍽️" },
]

// ── Main Panel ────────────────────────────────────────────────────────────────
interface Props {
  deal: Deal
  onClose: () => void
}

export function DealQualifyPanel({ deal, onClose }: Props) {
  const oppId = (deal._manualId ?? deal["Opportunity ID"] ?? deal["Opportunity Name"] ?? "unknown") as string
  const existing = getQualifyReview(oppId)

  const [answers, setAnswers] = useState<Record<number, string>>(existing?.answers ?? {})
  const [confidence, setConfidence] = useState<"red" | "amber" | "green">(existing?.confidence ?? "amber")
  const [aiSummary, setAiSummary] = useState(existing?.aiSummary ?? "")
  const [generating, setGenerating] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(1)
  const [goLiveDate, setGoLiveDate] = useState((existing as QualifyReview & { goLiveDate?: string })?.goLiveDate ?? "")
  const [signDate, setSignDate] = useState((existing as QualifyReview & { signDate?: string })?.signDate ?? "")
  const [vertical, setVertical] = useState((existing as QualifyReview & { vertical?: string })?.vertical ?? "")
  const [stakeholders, setStakeholders] = useState<string[]>((existing as QualifyReview & { stakeholders?: string[] })?.stakeholders ?? [])

  function toggleStakeholder(id: string) {
    setStakeholders(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const score = calcScore(answers, confidence)
  const answeredCount = QUESTIONS.filter((q) => (answers[q.id] ?? "").trim().length > 5).length

  function handleGenerate() {
    setGenerating(true)
    setTimeout(() => {
      const summary = generateAIBenchmark(deal, answers, score, confidence)
      setAiSummary(summary)
      setGenerating(false)
    }, 800)
  }

  function handleSave() {
    const review = {
      opportunityId: oppId,
      oppName: (deal["Opportunity Name"] ?? "") as string,
      answers,
      confidence,
      score,
      aiSummary,
      reviewedAt: new Date().toISOString(),
      goLiveDate,
      signDate,
      vertical,
      stakeholders,
    }
    saveReview(review as QualifyReview)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const confidentLabel = {
    red: "🔴 Low — major concerns",
    amber: "🟡 Medium — progressing",
    green: "🟢 High — on track to close",
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-background border-l border-border shadow-2xl flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-card shrink-0">
          <div className="space-y-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deal Qualification</span>
            </div>
            <h2 className="font-semibold text-sm leading-snug line-clamp-2">
              {deal["Opportunity Name"] ?? "Unnamed Deal"}
            </h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge variant="outline" className="text-[10px] h-5">{deal.User}</Badge>
              <Badge variant="outline" className="text-[10px] h-5 text-primary border-primary/40">
                {fmt(deal._val ?? 0)}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5">{deal._month}</Badge>
              {deal._product && (
                <Badge variant="outline" className="text-[10px] h-5">{deal._product}</Badge>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score bar */}
        <div className={`px-5 py-3 border-b border-border ${scoreBg(score)} shrink-0`}>
          <div className="flex items-center justify-between">
            <div>
              <span className={`text-2xl font-bold ${scoreColour(score)}`}>{score}</span>
              <span className="text-muted-foreground text-sm">/100</span>
              <span className="ml-3 text-xs text-muted-foreground">{scoreLabel(score)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {answeredCount}/{QUESTIONS.length} answered
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500"
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            {QUESTIONS.map((q) => {
              const isOpen = expanded === q.id
              const answered = (answers[q.id] ?? "").trim().length > 5
              return (
                <div
                  key={q.id}
                  className={`border rounded-lg overflow-hidden transition-colors ${
                    answered ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    onClick={() => setExpanded(isOpen ? null : q.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        answered ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {q.id}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{q.label}</div>
                        {!isOpen && answered && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[280px]">
                            {answers[q.id]}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] text-muted-foreground">{q.weight}pts</span>
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2">
                      <p className="text-xs text-muted-foreground italic">{q.q}</p>
                      <textarea
                        rows={3}
                        value={answers[q.id] ?? ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        placeholder={q.placeholder}
                        className="w-full text-xs bg-background border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Timeline */}
            <div className="border border-border rounded-lg bg-card p-4 space-y-3">
              <div className="text-xs font-semibold">Deal Timeline</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">When do they want to go live?</label>
                  <input
                    type="date"
                    value={goLiveDate}
                    onChange={e => setGoLiveDate(e.target.value)}
                    className="w-full h-7 text-xs bg-background border border-border rounded px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">When will they sign?</label>
                  <input
                    type="date"
                    value={signDate}
                    onChange={e => setSignDate(e.target.value)}
                    className="w-full h-7 text-xs bg-background border border-border rounded px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Vertical */}
            <div className="border border-border rounded-lg bg-card p-4 space-y-2">
              <div className="text-xs font-semibold">Vertical / Sector</div>
              <div className="flex flex-wrap gap-1.5">
                {VERTICALS.map(v => (
                  <button
                    key={v}
                    onClick={() => setVertical(prev => prev === v ? "" : v)}
                    className={`px-2.5 py-1 rounded-full text-[10px] border transition-colors ${
                      vertical === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary"
                    }`}
                  >{v}</button>
                ))}
              </div>
            </div>

            {/* Stakeholders */}
            <div className="border border-border rounded-lg bg-card p-4 space-y-2">
              <div className="text-xs font-semibold">Decision Makers Engaged</div>
              <div className="flex flex-wrap gap-2">
                {STAKEHOLDERS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleStakeholder(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      stakeholders.includes(s.id)
                        ? "bg-primary/10 border-primary text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence */}
            <div className="border border-border rounded-lg bg-card p-4 space-y-2">
              <div className="text-xs font-semibold">AD Confidence Level</div>
              <div className="flex gap-2">
                {(["red", "amber", "green"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setConfidence(c)}
                    className={`flex-1 py-2 px-3 rounded-md text-xs border transition-all ${
                      confidence === c
                        ? c === "green"
                          ? "bg-green-500/20 border-green-500/60 text-green-400"
                          : c === "amber"
                          ? "bg-yellow-500/20 border-yellow-500/60 text-yellow-400"
                          : "bg-red-500/20 border-red-500/60 text-red-400"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {c === "green" ? "🟢 High" : c === "amber" ? "🟡 Medium" : "🔴 Low"}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Summary */}
            <div className="border border-border rounded-lg bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-primary" />
                  AI Benchmark
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 gap-1"
                  onClick={handleGenerate}
                  disabled={generating || answeredCount < 2}
                >
                  {generating ? (
                    <span className="animate-pulse">Analysing...</span>
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
              {aiSummary ? (
                <div className="text-xs text-muted-foreground leading-relaxed bg-muted/40 rounded-md p-3 whitespace-pre-wrap">
                  {aiSummary.replace(/\*\*/g, "")}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground/50 italic">
                  {answeredCount < 2
                    ? "Answer at least 2 questions to generate AI benchmark"
                    : "Click Generate to get an AI assessment of this deal"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card shrink-0 flex gap-2">
          <Button
            className="flex-1 gap-2 text-xs h-9"
            onClick={handleSave}
            disabled={answeredCount === 0}
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? "✓ Saved!" : "Save Review"}
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
