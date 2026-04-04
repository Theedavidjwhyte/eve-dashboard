/**
 * QuickProductMatch — inline popover that lets you assign a product tag
 * to a "No Match" deal by typing a keyword. Updates the deal in the store
 * by re-enriching it with the new product tag prepended to the opp name.
 */
import { useState } from "react"
import { PRODUCTS } from "@/config/products"
import { useDashboardStore } from "@/store/dashboardStore"
import type { Deal } from "@/types"

// All unique product names, sorted
const PRODUCT_NAMES = [...new Set(PRODUCTS.map(([, p]) => p))].sort()

interface Props {
  deal: Deal
}

export function QuickProductMatch({ deal }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { data, rawCsv, importDate } = useDashboardStore()

  const matches = search.length > 0
    ? PRODUCT_NAMES.filter((p) => p.toLowerCase().includes(search.toLowerCase()))
    : PRODUCT_NAMES

  function applyMatch(product: string) {
    // Find the tag for this product so enrichRow can pick it up
    const tag = PRODUCTS.find(([, p]) => p === product)?.[0] ?? product
    // Mutate the deal directly in the store's data array
    useDashboardStore.setState((s) => ({
      data: s.data.map((r) => {
        if (r === deal || r["Opportunity Name"] === deal["Opportunity Name"]) {
          return { ...r, _product: product }
        }
        return r
      }),
    }))
    setOpen(false)
    setSearch("")
  }

  if (open) {
    return (
      <div className="relative inline-block">
        <div className="absolute z-50 top-full left-0 mt-1 bg-popover border rounded-xl shadow-xl w-52 overflow-hidden">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product..."
              className="w-full text-xs px-2 py-1.5 rounded-lg bg-muted border-0 outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === "Escape") { setOpen(false); setSearch("") }
                if (e.key === "Enter" && matches.length > 0) applyMatch(matches[0])
              }}
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {matches.slice(0, 20).map((p) => (
              <button
                key={p}
                onClick={() => applyMatch(p)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {p}
              </button>
            ))}
            {matches.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">No products found</div>
            )}
          </div>
          <div className="border-t p-2">
            <button
              onClick={() => { setOpen(false); setSearch("") }}
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
            >
              Cancel (Esc)
            </button>
          </div>
        </div>
        {/* Click outside to close */}
        <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch("") }} />
        <span className="text-[10px] text-amber-500 font-medium cursor-pointer underline decoration-dotted">
          No Match
        </span>
      </div>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      title="Click to assign a product"
      className="text-[10px] text-amber-500 font-medium hover:text-amber-600 underline decoration-dotted cursor-pointer whitespace-nowrap"
    >
      No Match ▾
    </button>
  )
}
