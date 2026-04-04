import { Button } from "@/components/ui/button"
import { BarChart3, Zap } from "lucide-react"

interface EmptyStateProps {
  onImport: () => void
}

export function EmptyState({ onImport }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[70vh] px-6 text-center">
      {/* E.V.E brand mark */}
      <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg">
        <Zap className="w-10 h-10 text-primary-foreground" />
      </div>

      <h1 className="text-3xl font-black tracking-tight mb-1">E.V.E</h1>
      <p className="text-sm text-muted-foreground mb-6">Elevate Value Add Engine</p>

      <div className="w-px h-8 bg-border mb-6" />

      <h2 className="text-lg font-semibold mb-2">No data loaded yet</h2>
      <p className="text-muted-foreground max-w-sm mb-8 text-sm leading-relaxed">
        Import your Salesforce pipeline export to unlock commit intelligence, win rate analysis, budget tracking, and the full E.V.E suite.
      </p>

      <Button size="lg" onClick={onImport} className="gap-2 px-8">
        <BarChart3 className="w-4 h-4" />
        Import Salesforce Data
      </Button>

      <div className="flex gap-6 mt-8 text-xs text-muted-foreground">
        <span>Tab-separated ✓</span>
        <span>CSV ✓</span>
        <span>Auto-saves locally ✓</span>
      </div>
    </div>
  )
}
