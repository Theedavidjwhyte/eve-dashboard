import { useState } from "react"
import { useDashboardStore } from "@/store/dashboardStore"
import { fmt } from "@/lib/formatters"
import { AlertTriangle, RotateCcw, Trash2, X, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
}

export function DroppedDealsModal({ open, onClose }: Props) {
  const { droppedDeals, reinstateDropped, confirmDrop, confirmAllDrops, reinstateAllDropped } = useDashboardStore()
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!open) return null

  const totalValue = droppedDeals.reduce((s, d) => s + (d._val ?? 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-zinc-900 border border-amber-500/40 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dropped Deals Detected</h2>
              <p className="text-sm text-zinc-400 mt-0.5">
                {droppedDeals.length} open {droppedDeals.length === 1 ? "deal" : "deals"} missing from this import
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-5 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-200">
          These deals were in your pipeline but are missing from the latest import. They may have been deleted, 
          renamed, or moved in Salesforce. Review each one and either <strong>reinstate</strong> (keeps it active) 
          or <strong>confirm deletion</strong> (removes permanently).
        </div>

        {/* Deal list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {droppedDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
              <p className="text-white font-semibold">All deals reviewed!</p>
              <p className="text-zinc-400 text-sm mt-1">No more dropped deals to action.</p>
            </div>
          ) : (
            droppedDeals.map((deal) => {
              const oppName = String(deal["Opportunity Name"] ?? "Unknown")
              const isExpanded = expanded === oppName
              return (
                <div
                  key={oppName}
                  className="bg-zinc-800/60 border border-zinc-700 rounded-xl overflow-hidden"
                >
                  {/* Row */}
                  <div className="flex items-center gap-3 p-3">
                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : oppName)}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {/* Deal info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{oppName}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-zinc-400">{String(deal["Account Name"] ?? "")}</span>
                        {deal._month && (
                          <span className="text-xs text-zinc-500">· Close: {deal._month}</span>
                        )}
                        {deal.User && (
                          <span className="text-xs text-zinc-500">· {deal.User}</span>
                        )}
                      </div>
                    </div>

                    {/* Value */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-amber-400">{fmt(deal._val ?? 0)}</div>
                      <div className="text-xs text-zinc-500">{deal._stageSummary ?? "Pipe"}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => reinstateDropped(oppName)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs font-medium"
                        title="Reinstate — keep in pipeline"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reinstate
                      </button>
                      <button
                        onClick={() => confirmDrop(oppName)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-medium"
                        title="Confirm deletion — remove permanently"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-zinc-700/50 pt-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {[
                          { label: "Stage", value: deal.Stage ?? "—" },
                          { label: "OI Value", value: fmt(deal._val ?? 0) },
                          { label: "ARR Value", value: fmt(deal._abc ?? 0) },
                          { label: "Product", value: deal._product ?? "—" },
                          { label: "Quarter", value: deal._quarter ?? "—" },
                          { label: "Commit", value: deal._commit ?? "—" },
                          { label: "Next Step", value: deal["Next Step"] ? String(deal["Next Step"]).slice(0, 60) + "..." : "—" },
                          { label: "Push Count", value: String(deal._push ?? 0) },
                        ].map((row) => (
                          <div key={row.label}>
                            <div className="text-zinc-500 mb-0.5">{row.label}</div>
                            <div className="text-zinc-200">{row.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {droppedDeals.length > 0 && (
          <div className="p-5 border-t border-zinc-800 flex items-center justify-between gap-3">
            <div className="text-sm text-zinc-400">
              Total value at risk:{" "}
              <span className="text-amber-400 font-semibold">{fmt(totalValue)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Review Later
              </button>
              <button
                onClick={() => { reinstateAllDropped(); onClose() }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Reinstate All
              </button>
              <button
                onClick={() => { confirmAllDrops(); onClose() }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
