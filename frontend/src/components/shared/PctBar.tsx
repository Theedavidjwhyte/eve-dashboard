import { fmtPct } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface PctBarProps {
  value: number          // 0–1
  color?: string         // optional override class
  height?: string        // e.g. "h-1.5" (default)
  showLabel?: boolean
  className?: string
}

export function PctBar({
  value,
  color,
  height = "h-1.5",
  showLabel = true,
  className,
}: PctBarProps) {
  const pct = Math.min(Math.max(value, 0), 1)
  const autoColor =
    pct >= 0.8 ? "bg-emerald-500" : pct >= 0.5 ? "bg-amber-500" : "bg-red-500"
  const fillColor = color ?? autoColor

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex-1 bg-muted rounded-full overflow-hidden", height)}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", fillColor)}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs min-w-[38px] text-right text-muted-foreground font-medium">
          {fmtPct(pct)}
        </span>
      )}
    </div>
  )
}
