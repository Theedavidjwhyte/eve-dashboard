import { useDashboardStore } from "@/store/dashboardStore"
import { MONTHS } from "@/config/months"
import { USERS } from "@/config/users"
import { PRODUCT_GROUPS } from "@/config/products"
import { AD_ORDER, getAvatar } from "@/config/avatars"
import { cn } from "@/lib/utils"
import type { TabId } from "@/types"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ── Normalise user filter to array of names ([] = All) ───────────────────────
function toUserArray(user: string | string[]): string[] {
  if (user === "All") return []
  if (Array.isArray(user)) return user
  return [user]
}

const TABS_WITH_MONTH: TabId[] = ["monthly", "deals", "dealbreakdown", "services", "closed"]
const TABS_WITH_QUARTER: TabId[] = ["quarterly"]
const TABS_WITH_KEYDEALS: TabId[] = ["monthly", "quarterly", "ytd", "dealbreakdown"]

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
      {children}
    </span>
  )
}

function PillBtn({
  active, onClick, children, small,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded border transition-colors",
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border text-muted-foreground hover:border-primary hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div className="flex flex-col">
      <FilterLabel>{label}</FilterLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 text-xs rounded border bg-card px-2 text-foreground border-border focus:outline-none focus:border-primary min-w-[110px]"
      >
        <option value="All">All</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ── AD Avatar Picker — multi-select ──────────────────────────────────────────
function ADPicker({
  value,
  onChange,
}: {
  value: string | string[]
  onChange: (v: string | string[]) => void
}) {
  const selected = toUserArray(value)        // [] means "All"
  const isFiltered = selected.length > 0
  const isMulti = selected.length > 1

  function toggle(name: string) {
    if (!isFiltered) {
      // Currently "All" → select just this one
      onChange(name)
      return
    }
    const next = selected.includes(name)
      ? selected.filter((n) => n !== name)   // deselect
      : [...selected, name]                  // add to selection

    if (next.length === 0) onChange("All")
    else if (next.length === 1) onChange(next[0])
    else onChange(next)
  }

  return (
    <div className="flex flex-col">
      <FilterLabel>
        Account Director
        {isMulti && (
          <span className="ml-1 text-primary normal-case">({selected.length} selected)</span>
        )}
      </FilterLabel>
      <div className="flex items-center gap-1.5">
        {/* "All" pill */}
        <button
          onClick={() => onChange("All")}
          className={cn(
            "w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all",
            !isFiltered
              ? "border-primary bg-primary text-primary-foreground scale-105 shadow-md"
              : "border-border bg-muted text-muted-foreground hover:border-primary/60 hover:scale-105"
          )}
          title="Show all ADs"
        >
          All
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-0.5" />

        {/* Individual AD avatars — click to toggle */}
        <TooltipProvider delayDuration={150}>
          {AD_ORDER.map((name) => {
            const av = getAvatar(name)
            const isSelected = isFiltered && selected.includes(name)
            const isDimmed  = isFiltered && !isSelected

            return (
              <Tooltip key={name}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => toggle(name)}
                    className={cn(
                      "relative w-8 h-8 rounded-full flex items-center justify-center",
                      "text-[10px] font-bold transition-all duration-200 select-none",
                      isSelected
                        ? "ring-2 ring-offset-2 ring-offset-background scale-110 shadow-lg z-10"
                        : isDimmed
                        ? "opacity-30 hover:opacity-70 hover:scale-105"
                        : "opacity-90 hover:opacity-100 hover:scale-105"
                    )}
                    style={{
                      backgroundColor: `#${av.bg}`,
                      color: `#${av.fg}`,
                      // @ts-ignore
                      "--tw-ring-color": `#${av.bg}`,
                    }}
                  >
                    {av.initials}
                    {isSelected && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-1 ring-background" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-semibold">
                  {isSelected ? `${name} — click to deselect` : name}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </TooltipProvider>

        {/* Selected names label — single selection only */}
        {selected.length === 1 && (
          <span className="ml-1 text-xs font-semibold text-foreground">
            {getAvatar(selected[0]).short}
          </span>
        )}
      </div>
    </div>
  )
}

export function FiltersBar() {
  const { currentTab, filters, setFilters, data } = useDashboardStore()

  const products = [...new Set(data.map((r) => r._product).filter(Boolean))].sort() as string[]
  const filteredProducts =
    filters.group !== "All" && PRODUCT_GROUPS[filters.group]
      ? products.filter((p) => PRODUCT_GROUPS[filters.group].includes(p))
      : products

  const selectedMonths = Array.isArray(filters.month)
    ? filters.month
    : filters.month === "All"
    ? []
    : [filters.month]

  function toggleMonth(m: string) {
    const sel = [...selectedMonths]
    const idx = sel.indexOf(m)
    if (idx >= 0) sel.splice(idx, 1)
    else sel.push(m)
    setFilters({ month: sel.length === 0 ? "All" : sel.length === 1 ? sel[0] : sel })
  }

  const showMonth = TABS_WITH_MONTH.includes(currentTab)
  const showQuarter = TABS_WITH_QUARTER.includes(currentTab)
  const showKeyDeals = TABS_WITH_KEYDEALS.includes(currentTab)

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
      {/* ── PERMANENT — always left ── */}

      {/* AD Picker — multi-select avatars */}
      <ADPicker
        value={filters.user}
        onChange={(v) => setFilters({ user: v })}
      />

      <FilterSelect
        label="Group"
        value={filters.group}
        onChange={(group) =>
          setFilters({
            group,
            product:
              group !== "All" && filters.product !== "All"
                ? PRODUCT_GROUPS[group]?.includes(filters.product)
                  ? filters.product
                  : "All"
                : filters.product,
          })
        }
        options={Object.keys(PRODUCT_GROUPS)}
      />

      <FilterSelect
        label="Product"
        value={filters.product}
        onChange={(v) => setFilters({ product: v })}
        options={filteredProducts}
      />

      {showKeyDeals && (
        <div className="flex flex-col">
          <FilterLabel>Key Deals</FilterLabel>
          <div className="flex gap-1">
            <PillBtn active={!filters.keyDeals} onClick={() => setFilters({ keyDeals: false })}>
              All
            </PillBtn>
            <PillBtn active={!!filters.keyDeals} onClick={() => setFilters({ keyDeals: true })}>
              &gt;£30k
            </PillBtn>
          </div>
        </div>
      )}

      {/* ── DIVIDER ── */}
      {(showMonth || showQuarter) && (
        <div className="w-px self-stretch bg-border mx-1" />
      )}

      {/* ── TAB-SPECIFIC — always right ── */}
      {showMonth && (
        <div className="flex flex-col">
          <FilterLabel>Month</FilterLabel>
          <div className="flex flex-wrap gap-1">
            <PillBtn small active={selectedMonths.length === 0} onClick={() => setFilters({ month: "All" })}>
              All
            </PillBtn>
            {MONTHS.map((m) => (
              <PillBtn key={m} small active={selectedMonths.includes(m)} onClick={() => toggleMonth(m)}>
                {m}
              </PillBtn>
            ))}
          </div>
        </div>
      )}

      {showQuarter && (
        <div className="flex flex-col">
          <FilterLabel>Quarter</FilterLabel>
          <div className="flex gap-1">
            {["All", "Q1", "Q2", "Q3", "Q4"].map((q) => (
              <PillBtn key={q} active={filters.quarter === q} onClick={() => setFilters({ quarter: q })}>
                {q}
              </PillBtn>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
