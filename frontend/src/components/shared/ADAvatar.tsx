import { cn } from "@/lib/utils"
import { getAvatar, AD_AVATARS, AD_ORDER } from "@/config/avatars"
import type { ADAvatar as ADAvatarType } from "@/config/avatars"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ── Single Avatar ─────────────────────────────────────────────────────────────
interface AvatarProps {
  name: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  showName?: boolean
  showRole?: boolean
  namePosition?: "right" | "below"
  selected?: boolean
  onClick?: () => void
  pulse?: boolean           // animated ring — used to show "active filter"
  dimmed?: boolean          // greyed out — used when another AD is selected
  className?: string
}

const SIZE_MAP = {
  xs: { circle: "w-6 h-6", text: "text-[9px]", font: "font-bold" },
  sm: { circle: "w-8 h-8", text: "text-[11px]", font: "font-bold" },
  md: { circle: "w-10 h-10", text: "text-sm", font: "font-bold" },
  lg: { circle: "w-14 h-14", text: "text-lg", font: "font-black" },
  xl: { circle: "w-20 h-20", text: "text-2xl", font: "font-black" },
}

export function ADAvatar({
  name,
  size = "md",
  showName = false,
  showRole = false,
  namePosition = "right",
  selected = false,
  onClick,
  pulse = false,
  dimmed = false,
  className,
}: AvatarProps) {
  const av = getAvatar(name)
  const sz = SIZE_MAP[size]

  const circle = (
    <div className="relative shrink-0">
      {/* Outer ring — shown when selected/active */}
      {(selected || pulse) && (
        <div
          className={cn(
            "absolute inset-0 rounded-full ring-2 ring-offset-1 ring-offset-background",
            av.ring,
            pulse && "animate-pulse"
          )}
          style={{ margin: "-3px" }}
        />
      )}
      {/* Avatar circle */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                sz.circle,
                sz.text,
                sz.font,
                "rounded-full flex items-center justify-center shrink-0 select-none transition-all duration-200",
                dimmed ? "opacity-30 grayscale" : "opacity-100",
                onClick && "cursor-pointer hover:scale-105 active:scale-95"
              )}
              style={{ backgroundColor: `#${av.bg}`, color: `#${av.fg}` }}
              onClick={onClick}
            >
              {av.initials}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-semibold">
            {name}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )

  if (!showName) return <div className={cn("inline-flex", className)}>{circle}</div>

  if (namePosition === "below") {
    return (
      <div className={cn("flex flex-col items-center gap-1", className)}>
        {circle}
        <div className="text-center">
          <div className={cn("font-semibold leading-tight", size === "xl" ? "text-sm" : "text-xs")}>
            {av.short}
          </div>
          {showRole && (
            <div className="text-[10px] text-muted-foreground">{av.role}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {circle}
      <div>
        <div className={cn("font-semibold leading-tight", size === "lg" || size === "xl" ? "text-sm" : "text-xs")}>
          {name}
        </div>
        {showRole && (
          <div className="text-[10px] text-muted-foreground">{av.role}</div>
        )}
      </div>
    </div>
  )
}

// ── Avatar Group — shows all ADs stacked, or just one if filtered ─────────────
interface AvatarGroupProps {
  selectedUser: string       // "All" or a specific user name
  onSelect?: (name: string | "All") => void
  size?: "xs" | "sm" | "md"
  className?: string
  showLabels?: boolean
}

export function ADavatarGroup({
  selectedUser,
  onSelect,
  size = "sm",
  className,
  showLabels = false,
}: AvatarGroupProps) {
  const isFiltered = selectedUser !== "All"
  const sz = SIZE_MAP[size]

  // When a single AD is selected — show just their avatar prominently
  if (isFiltered) {
    const av = getAvatar(selectedUser)
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative">
          <div
            className={cn(
              sz.circle,
              sz.text,
              sz.font,
              "rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-background",
              av.ring,
              onSelect && "cursor-pointer hover:scale-105 transition-transform"
            )}
            style={{ backgroundColor: `#${av.bg}`, color: `#${av.fg}` }}
            onClick={() => onSelect?.("All")}
            title={`${selectedUser} — click to show all`}
          >
            {av.initials}
          </div>
        </div>
        {showLabels && (
          <div>
            <div className="text-xs font-semibold">{av.short}</div>
            <div className="text-[10px] text-muted-foreground">Click to show all</div>
          </div>
        )}
      </div>
    )
  }

  // Show all ADs in a stacked group
  const overlap = size === "xs" ? "-ml-1.5" : size === "sm" ? "-ml-2" : "-ml-3"

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex items-center">
        {AD_ORDER.map((name, i) => {
          const av = getAvatar(name)
          return (
            <div
              key={name}
              className={cn(
                sz.circle,
                sz.text,
                sz.font,
                "rounded-full flex items-center justify-center ring-2 ring-background relative transition-all duration-150",
                i > 0 && overlap,
                onSelect && "cursor-pointer hover:scale-110 hover:z-10"
              )}
              style={{
                backgroundColor: `#${av.bg}`,
                color: `#${av.fg}`,
                zIndex: AD_ORDER.length - i,
              }}
              title={name}
              onClick={() => onSelect?.(name)}
            >
              {av.initials}
            </div>
          )
        })}
      </div>
      {showLabels && (
        <span className="ml-2 text-xs text-muted-foreground">
          {AD_ORDER.length} ADs
        </span>
      )}
    </div>
  )
}

// ── AD Card — used in leaderboards and summaries ──────────────────────────────
interface ADCardProps {
  name: string
  rank?: number
  wonVal: number
  pct: number
  pipeVal?: number
  target?: number
  dealCount?: number
  riskCount?: number
  isSelected?: boolean
  onClick?: () => void
  compact?: boolean
  fmt: (v: number) => string
  fmtPct: (v: number) => string
}

const RANK_LABELS = ["1st", "2nd", "3rd", "4th", "5th"]
const RANK_COLOURS = [
  "text-amber-500",    // gold
  "text-slate-400",    // silver
  "text-orange-400",   // bronze
  "text-muted-foreground",
  "text-muted-foreground",
]

export function ADCard({
  name,
  rank,
  wonVal,
  pct,
  pipeVal,
  target,
  dealCount,
  riskCount,
  isSelected,
  onClick,
  compact = false,
  fmt,
  fmtPct,
}: ADCardProps) {
  const av = getAvatar(name)
  const barColour =
    pct >= 1 ? "bg-emerald-500" : pct >= 0.7 ? "bg-amber-500" : pct >= 0.4 ? "bg-orange-500" : "bg-red-500"
  const valColour =
    pct >= 1 ? "text-emerald-500" : pct >= 0.7 ? "text-amber-500" : pct >= 0.4 ? "text-orange-500" : "text-red-500"

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer",
          isSelected
            ? "bg-accent ring-1 ring-primary"
            : "hover:bg-accent/50"
        )}
        onClick={onClick}
      >
        {rank !== undefined && (
          <span className={cn("text-xs font-black w-6 text-center shrink-0 tabular-nums", RANK_COLOURS[rank] ?? "text-muted-foreground")}>
            {RANK_LABELS[rank] ?? `${rank + 1}`}
          </span>
        )}
        <ADAvatar name={name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold truncate">{av.short}</span>
            <span className={cn("text-xs font-bold tabular-nums shrink-0", valColour)}>
              {fmtPct(pct)}
            </span>
          </div>
          <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", barColour)}
              style={{ width: `${Math.min(pct * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-semibold tabular-nums">{fmt(wonVal)}</div>
          {pipeVal !== undefined && (
            <div className="text-[10px] text-muted-foreground">{fmt(pipeVal)} pipe</div>
          )}
        </div>
      </div>
    )
  }

  // Full card
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        isSelected ? "border-primary bg-accent/30 shadow-md" : "border-border bg-card hover:border-primary/50",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <div className={cn("text-sm font-black w-8 shrink-0 pt-1 tabular-nums", RANK_COLOURS[rank] ?? "text-muted-foreground")}>
            {RANK_LABELS[rank] ?? `${rank + 1}`}
          </div>
        )}
        <ADAvatar name={name} size="lg" showName showRole namePosition="right" />
        <div className="ml-auto text-right">
          <div className={cn("text-xl font-black tabular-nums", valColour)}>
            {fmtPct(pct)}
          </div>
          <div className="text-xs text-muted-foreground">of target</div>
        </div>
      </div>

      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColour)}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-semibold tabular-nums">{fmt(wonVal)}</span>
        {target !== undefined && (
          <span className="text-muted-foreground">of {fmt(target)}</span>
        )}
      </div>

      {(pipeVal !== undefined || dealCount !== undefined || riskCount !== undefined) && (
        <div className="mt-2 pt-2 border-t flex items-center gap-3 text-[11px] text-muted-foreground">
          {pipeVal !== undefined && <span>{fmt(pipeVal)} pipe</span>}
          {dealCount !== undefined && <span>{dealCount} deals</span>}
          {riskCount !== undefined && riskCount > 0 && (
            <span className="text-red-500 font-semibold">{riskCount} at risk</span>
          )}
        </div>
      )}
    </div>
  )
}

// ── AD Row — for tables (avatar + name in a cell) ─────────────────────────────
export function ADCell({ name }: { name: string }) {
  const av = getAvatar(name)
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
        style={{ backgroundColor: `#${av.bg}`, color: `#${av.fg}` }}
      >
        {av.initials}
      </div>
      <span className="text-xs font-medium">{av.short}</span>
    </div>
  )
}

// ── Mini avatar dot — just the coloured circle, no text ───────────────────────
export function ADDot({ name, size = 8 }: { name: string; size?: number }) {
  const av = getAvatar(name)
  return (
    <div
      className="rounded-full shrink-0"
      style={{
        backgroundColor: `#${av.bg}`,
        width: size,
        height: size,
      }}
      title={name}
    />
  )
}
