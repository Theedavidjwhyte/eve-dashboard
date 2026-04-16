/**
 * QuickProductMatch — inline popover that lets you assign a product tag
 * to a "No Match" deal. Matches are persisted to localStorage so they
 * survive re-imports. A lock icon shows the match is saved.
 */
import { useState, useEffect } from "react"
import { PRODUCTS } from "@/config/products"
import { useDashboardStore } from "@/store/dashboardStore"
import type { Deal } from "@/types"
import { Lock, Unlock } from "lucide-react"

// All unique product names, sorted
const PRODUCT_NAMES = [...new Set(PRODUCTS.map(([, p]) => p))].sort()

// ── Persist helpers ───────────────────────────────────────────────────────────
const STORAGE_KEY = "eve_product_locks"

function getLockedMatches(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
  } catch {
    return {}
  }
}

function saveLock(oppName: string, product: string) {
  const locks = getLockedMatches()
  locks[oppName] = product
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locks))
}

function removeLock(oppName: string) {
  const locks = getLockedMatches()
  delete locks[oppName]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locks))
}

export function getProductLock(oppName: string): string | null {
  return getLockedMatches()[oppName] ?? null
}

// Apply all saved locks to freshly imported data
export function applyProductLocks(deals: Deal[]): Deal[] {
  const locks = getLockedMatches()
  if (Object.keys(locks).length === 0) return deals
  return deals.map((d) => {
    const name = String(d["Opportunity Name"] ?? "")
    const locked = locks[name]
    if (locked && (!d._product || d._product === "No Match")) {
      return { ...d, _product: locked }
    }
    return d
  })
}

interface Props {
  deal: Deal
}

export function QuickProductMatch({ deal }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const oppName = String(deal["Opportunity Name"] ?? "")
  const isLocked = !!getLockedMatches()[oppName]

  // On mount, apply lock if product is still unmatched
  useEffect(() => {
    const locked = getLockedMatches()[oppName]
    if (locked && (!deal._product || deal._product === "No Match")) {
      useDashboardStore.setState((s) => ({
        data: s.data.map((r) =>
          String(r["Opportunity Name"] ?? "") === oppName
            ? { ...r, _product: locked }
            : r
        ),
      }))
    }
  }, [oppName, deal._product])

  const matches = search.length > 0
    ? PRODUCT_NAMES.filter((p) => p.toLowerCase().includes(search.toLowerCase()))
    : PRODUCT_NAMES

  function applyMatch(product: string) {
    saveLock(oppName, product)
    useDashboardStore.setState((s) => ({
      data: s.data.map((r) =>
        String(r["Opportunity Name"] ?? "") === oppName
          ? { ...r, _product: product }
          : r
      ),
    }))
    setOpen(false)
    setSearch("")
  }

  function clearMatch() {
    removeLock(oppName)
    useDashboardStore.setState((s) => ({
      data: s.data.map((r) =>
        String(r["Opportunity Name"] ?? "") === oppName
          ? { ...r, _product: undefined }
          : r
      ),
    }))
  }

  // Show matched + locked state
  if (deal._product && deal._product !== "No Match") {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
          {deal._product}
        </span>
        {isLocked ? (
          <button
            onClick={clearMatch}
            title="Locked — click to unlock"
            className="text-emerald-500 hover:text-destructive transition-colors"
          >
            <Lock className="w-2.5 h-2.5" />
          </button>
        ) : (
          <button
            onClick={() => applyMatch(deal._product!)}
            title="Click to lock this match"
            className="text-muted-foreground hover:text-emerald-500 transition-colors"
          >
            <Unlock className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    )
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
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between group"
              >
                <span>{p}</span>
                <Lock className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50" />
              </button>
            ))}
            {matches.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">No products found</div>
            )}
          </div>
          <div className="border-t">
            {search.length > 0 && (
              <button
                onClick={() => {
                  const newProduct = search.trim()
                  if (newProduct) applyMatch(newProduct)
                }}
                className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-accent flex items-center gap-2 border-b"
              >
                <span className="text-primary font-bold">+</span>
                Add &quot;{search.trim()}&quot; as new product
              </button>
            )}
            <button
              onClick={() => { setOpen(false); setSearch("") }}
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-2"
            >
              Cancel (Esc)
            </button>
          </div>
        </div>
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
      title="Click to assign a product — will be remembered on next import"
      className="text-[10px] text-amber-500 font-medium hover:text-amber-600 underline decoration-dotted cursor-pointer whitespace-nowrap"
    >
      No Match ▾
    </button>
  )
}
