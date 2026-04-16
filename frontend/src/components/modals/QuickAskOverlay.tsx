import { useEffect, useRef, useState } from "react"
import { MessageSquare, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboardStore } from "@/store/dashboardStore"
import { analyseQuery } from "@/lib/analysisEngine"
import { USERS } from "@/config/users"

interface QuickAskOverlayProps {
  open: boolean
  onClose: () => void
}

function renderMarkdown(text: string) {
  // Simple markdown: **bold**, newlines
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>
  })
}

export function QuickAskOverlay({ open, onClose }: QuickAskOverlayProps) {
  const { data, filters, oiTargets, monthlyBudget } = useDashboardStore()
  const [query, setQuery] = useState("")
  const [result, setResult] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const isAD = filters.user !== "All" && !Array.isArray(filters.user)
  const singleUser = !Array.isArray(filters.user) ? filters.user : (filters.user.length === 1 ? filters.user[0] : "")
  const firstName = isAD && singleUser ? singleUser.split(" ")[0] : ""

  const suggestions = isAD
    ? [
        `What are ${firstName}'s strengths?`,
        `Where does ${firstName} need support?`,
        `Coaching plan for ${firstName}`,
        `${firstName}'s pipeline quality`,
      ]
    : [
        "Where is my biggest risk?",
        "Who needs coaching?",
        "Compare all ADs",
        "Services analysis",
        "What should I focus on?",
        "Budget gap analysis",
      ]

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery("")
      setResult("")
    }
  }, [open])

  function handleSubmit() {
    if (!query.trim() || data.length === 0) return
    const answer = analyseQuery(query, { data, filters, oiTargets, monthlyBudget })
    setResult(answer)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card border rounded-2xl w-full max-w-xl mx-4 p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Ask about your pipeline</span>
          <button
            onClick={onClose}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
            if (e.key === "Escape") onClose()
          }}
          placeholder="Ask about your pipeline, team, risks, targets..."
          className="w-full px-4 py-3 rounded-xl border bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-ring mb-3"
        />

        <div className="flex flex-wrap gap-1.5 mb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuery(s)
                setTimeout(handleSubmit, 0)
              }}
              className="text-xs px-3 py-1.5 rounded-full border bg-muted hover:border-primary hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {result && (
          <div className="bg-muted rounded-xl p-4 text-sm leading-relaxed max-h-80 overflow-y-auto">
            {renderMarkdown(result)}
          </div>
        )}

        {data.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Load data first to use Ask
          </p>
        )}
      </div>
    </div>
  )
}

export function QuickAskButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Ask about your data (Ctrl+K)"
      className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40"
    >
      <MessageSquare className="w-5 h-5" />
    </button>
  )
}
