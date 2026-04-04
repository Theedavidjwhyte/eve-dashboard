import { useState, useMemo, useRef, useEffect } from "react"
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  Lightbulb, StickyNote, X, Check, Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ADCell } from "@/components/shared/ADAvatar"
import { fmt } from "@/lib/formatters"
import { USERS } from "@/config/users"
import type { BudgetTargets } from "@/types"
import { getADBudget, getTeamBudgetForMonths } from "@/lib/budgetHelpers"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────
type WK = "W1" | "W2" | "W3" | "W4" | "W5"
const WEEKS: WK[] = ["W1", "W2", "W3", "W4", "W5"]

// Cell note: attached to each W1-W5 entry per AD per month
type CellNote = {
  text: string
  savedAt: string // ISO date string
}

interface Props {
  month: string
  notes: Record<string, Record<string, Record<WK, string>>>
  userList: string[]
  oiTargets: BudgetTargets
  currentWon: Record<string, number>
  currentCommit: Record<string, number>
  setNote: (month: string, user: string, week: WK, value: string) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseNoteValue(note: string): number {
  if (!note || !note.trim()) return 0
  const clean = note.replace(/[£,\s]/g, "")
  const match = clean.match(/([\d.]+)\s*([km]?)/i)
  if (!match) return 0
  let val = parseFloat(match[1])
  if (isNaN(val)) return 0
  const suffix = match[2].toLowerCase()
  if (suffix === "k") val *= 1000
  if (suffix === "m") val *= 1000000
  return val
}

// ── Arrow delta indicator ─────────────────────────────────────────────────────
function Delta({ prev, curr }: { prev: number; curr: number }) {
  if (prev === 0 || curr === 0) return <span className="text-muted-foreground text-[10px]">—</span>
  const diff = curr - prev
  const pct = Math.round(Math.abs(diff) / prev * 100)
  if (Math.abs(diff) < 500) return <Minus className="w-3 h-3 text-muted-foreground inline" />
  if (diff > 0) return (
    <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
      <TrendingUp className="w-3 h-3" />+{pct}%
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-destructive text-[10px] font-semibold">
      <TrendingDown className="w-3 h-3" />-{pct}%
    </span>
  )
}

// ── Cell note popup ───────────────────────────────────────────────────────────
function CellNotePopup({
  adName, week, month, value,
  savedNote, onSave, onClose,
}: {
  adName: string; week: WK; month: string; value: number
  savedNote: CellNote | null
  onSave: (text: string) => void
  onClose: () => void
}) {
  const [text, setText] = useState(savedNote?.text ?? "")
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  function handleSave() {
    onSave(text.trim())
    onClose()
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 w-72 rounded-xl border border-border bg-card shadow-xl p-4 top-full mt-2 left-1/2 -translate-x-1/2"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-foreground">
          {adName.split(" ")[0]} · {week} · {month}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {value > 0 && (
        <div className="text-xs text-muted-foreground mb-2">
          Committed value: <span className="font-semibold text-foreground">{fmt(value)}</span>
        </div>
      )}
      <textarea
        className="w-full text-xs rounded-md border border-border bg-muted/40 px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
        rows={3}
        placeholder="Add context for this figure... (e.g. expecting Dan/Gails to sign by Fri)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave()
          if (e.key === "Escape") onClose()
        }}
      />
      {savedNote && (
        <div className="text-[10px] text-muted-foreground mt-1 mb-2">
          Last saved: {new Date(savedNote.savedAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
        </div>
      )}
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onClose} className="text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground">
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground flex items-center gap-1 hover:opacity-90"
        >
          <Check className="w-3 h-3" /> Save note
        </button>
      </div>
    </div>
  )
}

// ── AI insight generator ──────────────────────────────────────────────────────
function generateInsights(
  adData: { user: string; first: string; values: number[]; target: number; currentWon: number; currentCommit: number }[],
  cellNotes: Record<string, CellNote | null>,
  teamTarget: number,
  month: string,
): string[] {
  const insights: string[] = []
  const fk = (v: number) => "£" + Math.round(v / 1000) + "k"

  const activeWeeks = WEEKS.filter((_, i) => adData.some((ad) => ad.values[i] > 0)).length
  const latestTeamTotal = adData.reduce((s, ad) => {
    const latest = [...ad.values].reverse().find((v) => v > 0) ?? 0
    return s + latest
  }, 0)
  const w1TeamTotal = adData.reduce((s, ad) => s + (ad.values[0] ?? 0), 0)

  if (activeWeeks === 0) {
    insights.push(`No weekly commit data entered yet for ${month}. Add W1 values to start tracking movement.`)
    return insights
  }

  // 1. Trajectory
  if (w1TeamTotal > 0 && latestTeamTotal > 0) {
    const diff = latestTeamTotal - w1TeamTotal
    const pct = Math.round(Math.abs(diff) / w1TeamTotal * 100)
    if (diff > 5000) insights.push(`📈 Commit grown ${pct}% since W1 — ${fk(w1TeamTotal)} → ${fk(latestTeamTotal)}. Strong momentum.`)
    else if (diff < -5000) insights.push(`📉 Commit dropped ${pct}% since W1 — ${fk(Math.abs(diff))} has slipped. Investigate what moved out.`)
    else insights.push(`➡️ Commit holding steady at ${fk(latestTeamTotal)} — minimal movement since W1 (${fk(w1TeamTotal)}).`)
  }

  // 2. Budget coverage
  if (teamTarget > 0 && latestTeamTotal > 0) {
    const won = adData.reduce((s, ad) => s + ad.currentWon, 0)
    const total = won + latestTeamTotal
    if (total >= teamTarget) {
      insights.push(`✅ Budget covered — ${fk(won)} won + ${fk(latestTeamTotal)} commit = ${fk(total)} vs ${fk(teamTarget)} target.`)
    } else {
      const gap = teamTarget - total
      insights.push(`⚠️ ${fk(gap)} still needed. Current commit covers ${Math.round(latestTeamTotal/teamTarget*100)}% of target.`)
    }
  }

  // 3. Week-on-week AD movements
  const drops: string[] = []
  const gains: string[] = []
  adData.forEach((ad) => {
    const vals = ad.values.filter((v) => v > 0)
    if (vals.length < 2) return
    const last = vals[vals.length - 1]
    const prev = vals[vals.length - 2]
    const diff = last - prev
    if (diff < -10000) drops.push(`${ad.first} (${fk(diff)})`)
    if (diff > 10000) gains.push(`${ad.first} (+${fk(diff)})`)
  })
  if (gains.length > 0) insights.push(`🟢 Positive movement: ${gains.join(", ")} — week-on-week increase.`)
  if (drops.length > 0) insights.push(`🔴 Slippage: ${drops.join(", ")} — commit fell week-on-week.`)

  // 4. Extract themes from cell notes
  const noteTexts = Object.values(cellNotes)
    .filter(Boolean)
    .map((n) => n!.text)
    .filter((t) => t.length > 5)

  if (noteTexts.length > 0) {
    const pending = noteTexts.filter(t =>
      /sign|decision|final|close|by (fri|mon|tue|wed|thu)/i.test(t)
    )
    const risks = noteTexts.filter(t =>
      /risk|slip|delay|push|concern|stall|waiting/i.test(t)
    )
    if (pending.length > 0) insights.push(`📋 ${pending.length} note${pending.length > 1 ? "s" : ""} mention pending decisions or expected signatures — follow up before end of week.`)
    if (risks.length > 0) insights.push(`⚠️ ${risks.length} note${risks.length > 1 ? "s" : ""} flag potential risks or delays — review before the forecast call.`)
  }

  // 5. Who is stale
  const stale = adData.filter((ad) => ad.values.filter((v) => v > 0).length === 1 && activeWeeks >= 3)
  if (stale.length > 0) {
    insights.push(`📋 ${stale.map((a) => a.first).join(", ")} ${stale.length === 1 ? "has" : "have"} only entered W1 — remind to update weekly figures.`)
  }

  return insights.slice(0, 5)
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function WeeklyCommitTracker({
  month, notes, userList, oiTargets, currentWon, currentCommit, setNote,
}: Props) {
  const [showInsights, setShowInsights] = useState(true)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [notePopup, setNotePopup] = useState<string | null>(null) // "user-week"

  // Cell notes stored in component state (persisted to localStorage)
  const CELL_NOTES_KEY = `eve_cellnotes_${month}`
  const [cellNotes, setCellNotes] = useState<Record<string, CellNote | null>>(() => {
    try {
      const raw = localStorage.getItem(CELL_NOTES_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  })

  function saveCellNote(user: string, week: WK, text: string) {
    const key = `${user}-${week}`
    const updated = {
      ...cellNotes,
      [key]: text ? { text, savedAt: new Date().toISOString() } : null,
    }
    setCellNotes(updated)
    try { localStorage.setItem(CELL_NOTES_KEY, JSON.stringify(updated)) } catch { /* quota */ }
  }

  // Parse note values
  const adData = useMemo(() =>
    userList.map((u) => {
      const values = WEEKS.map((w) => parseNoteValue(notes[month]?.[u]?.[w] ?? ""))
      const target = getADBudget(u, [month], oiTargets)
      return {
        user: u, first: u.split(" ")[0], values, target,
        currentWon: currentWon[u] ?? 0,
        currentCommit: currentCommit[u] ?? 0,
      }
    })
  , [userList, notes, month, oiTargets, currentWon, currentCommit])

  const teamTarget = getTeamBudgetForMonths([month], oiTargets)
  const teamWeekTotals = WEEKS.map((_, i) => adData.reduce((s, ad) => s + ad.values[i], 0))

  const insights = useMemo(
    () => generateInsights(adData, cellNotes, teamTarget, month),
    [adData, cellNotes, teamTarget, month]
  )

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">Weekly Commit Tracker — {month}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter each AD's committed forecast at the start of each week to track movement.
              Click <StickyNote className="w-3 h-3 inline mx-0.5" /> to add context notes to any value.
            </p>
          </div>
          <button
            onClick={() => setShowInsights((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Insights
            {showInsights ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs w-32">
                  Account Director
                </th>
                {WEEKS.map((w, i) => (
                  <th key={w} className="text-center py-2 px-2 font-medium text-muted-foreground text-xs min-w-[110px]">
                    <div>{w}</div>
                    {/* Team variance arrow in header */}
                    {i > 0 && (
                      <div className="mt-0.5">
                        <Delta prev={teamWeekTotals[i - 1]} curr={teamWeekTotals[i]} />
                      </div>
                    )}
                  </th>
                ))}
                <th className="text-right py-2 px-2 font-medium text-muted-foreground text-xs min-w-[80px]">
                  Live Won
                </th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground text-xs min-w-[80px]">
                  vs Budget
                </th>
              </tr>
            </thead>

            <tbody>
              {adData.map((ad) => {
                const latestCommit = [...ad.values].reverse().find((v) => v > 0) ?? 0
                const totalWithWon = ad.currentWon + latestCommit
                const budgetPct = ad.target > 0 ? totalWithWon / ad.target : 0
                const budgetCol =
                  budgetPct >= 1 ? "text-emerald-600 dark:text-emerald-400"
                  : budgetPct >= 0.7 ? "text-amber-600 dark:text-amber-400"
                  : "text-destructive"

                return (
                  <tr key={ad.user} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pr-4">
                      <ADCell name={ad.user} />
                    </td>

                    {WEEKS.map((w, i) => {
                      const cellKey = `${ad.user}-${w}`
                      const isEditing = editingCell === cellKey
                      const isNoteOpen = notePopup === cellKey
                      const val = ad.values[i]
                      const prevVal = i > 0 ? ad.values[i - 1] : 0
                      const hasNote = !!(cellNotes[cellKey]?.text)

                      return (
                        <td key={w} className="py-2 px-2 text-center">
                          <div className="relative flex flex-col items-center gap-0.5">
                            {/* Input cell */}
                            {isEditing ? (
                              <input
                                type="text"
                                defaultValue={notes[month]?.[ad.user]?.[w] ?? ""}
                                className="w-[80px] text-center text-xs px-2 py-1.5 rounded-md border border-primary bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="e.g. £45k"
                                autoFocus
                                onBlur={(e) => {
                                  setNote(month, ad.user, w, e.target.value)
                                  setEditingCell(null)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    setNote(month, ad.user, w, e.currentTarget.value)
                                    setEditingCell(null)
                                  }
                                  if (e.key === "Escape") setEditingCell(null)
                                }}
                              />
                            ) : (
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => setEditingCell(cellKey)}
                                  className={cn(
                                    "text-center text-xs px-2 py-1.5 rounded-md border transition-all",
                                    val > 0
                                      ? "border-border bg-muted/40 font-semibold text-foreground hover:border-primary hover:bg-muted w-[80px]"
                                      : "border-dashed border-border/50 text-muted-foreground hover:border-primary hover:text-foreground bg-transparent w-[80px]"
                                  )}
                                >
                                  {val > 0 ? fmt(val) : <span className="opacity-40">+ add</span>}
                                </button>

                                {/* Note icon — only show if value exists or already has a note */}
                                {(val > 0 || hasNote) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setNotePopup(isNoteOpen ? null : cellKey)
                                    }}
                                    className={cn(
                                      "p-0.5 rounded transition-colors",
                                      hasNote
                                        ? "text-amber-500 hover:text-amber-600"
                                        : "text-muted-foreground/40 hover:text-muted-foreground"
                                    )}
                                    title={hasNote ? "View/edit note" : "Add note"}
                                  >
                                    <StickyNote className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Week-on-week delta per AD */}
                            {val > 0 && prevVal > 0 && (
                              <Delta prev={prevVal} curr={val} />
                            )}

                            {/* Note popup */}
                            {isNoteOpen && (
                              <CellNotePopup
                                adName={ad.user}
                                week={w}
                                month={month}
                                value={val}
                                savedNote={cellNotes[cellKey] ?? null}
                                onSave={(text) => saveCellNote(ad.user, w, text)}
                                onClose={() => setNotePopup(null)}
                              />
                            )}
                          </div>
                        </td>
                      )
                    })}

                    {/* Live Won */}
                    <td className="py-2 px-2 text-right">
                      {ad.currentWon > 0 ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {fmt(ad.currentWon)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* vs Budget — using latest commit + won */}
                    <td className="py-2 px-2 text-right">
                      {ad.target > 0 ? (
                        <span className={cn("text-xs font-semibold", budgetCol)}>
                          {Math.round(budgetPct * 100)}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* Team totals row */}
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="py-2.5 pr-4 text-xs text-muted-foreground">Team</td>
                {WEEKS.map((_, i) => {
                  const total = teamWeekTotals[i]
                  const prev = i > 0 ? teamWeekTotals[i - 1] : 0
                  return (
                    <td key={i} className="py-2 px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={cn("text-xs font-bold",
                          total > 0 ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {total > 0 ? fmt(total) : "—"}
                        </span>
                        {i > 0 && total > 0 && prev > 0 && (
                          <Delta prev={prev} curr={total} />
                        )}
                      </div>
                    </td>
                  )
                })}
                <td className="py-2 px-2 text-right">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {fmt(adData.reduce((s, ad) => s + ad.currentWon, 0))}
                  </span>
                </td>
                <td className="py-2 px-2 text-right">
                  {teamTarget > 0 ? (
                    <span className={cn("text-xs font-bold", (() => {
                      const won = adData.reduce((s, ad) => s + ad.currentWon, 0)
                      const latest = adData.reduce((s, ad) => s + ([...ad.values].reverse().find((v) => v > 0) ?? 0), 0)
                      const pct = (won + latest) / teamTarget
                      return pct >= 1 ? "text-emerald-600 dark:text-emerald-400"
                        : pct >= 0.7 ? "text-amber-600 dark:text-amber-400"
                        : "text-destructive"
                    })())}>
                      {(() => {
                        const won = adData.reduce((s, ad) => s + ad.currentWon, 0)
                        const latest = adData.reduce((s, ad) => s + ([...ad.values].reverse().find((v) => v > 0) ?? 0), 0)
                        return Math.round((won + latest) / teamTarget * 100) + "%"
                      })()}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Notes summary strip ── */}
        {Object.values(cellNotes).some((n) => n?.text) && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <StickyNote className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Commit Notes</span>
            </div>
            <div className="space-y-1">
              {Object.entries(cellNotes)
                .filter(([, n]) => n?.text)
                .map(([key, note]) => {
                  const [user, week] = key.split("-")
                  const first = user.split(" ")[0]
                  return (
                    <div key={key} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                      <span className="font-semibold shrink-0">{first} · {week}:</span>
                      <span className="text-amber-700 dark:text-amber-400">{note!.text}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* ── AI Insights ── */}
        {showInsights && insights.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">AI Insights</span>
            </div>
            {insights.map((insight, i) => (
              <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                {insight}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
