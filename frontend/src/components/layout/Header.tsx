import { useState, useRef, useEffect } from "react"
import { Camera, Moon, Sun, ExternalLink, Search, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useDashboardStore } from "@/store/dashboardStore"
import type { TabId } from "@/types"

interface HeaderProps {
  onImport: () => void
  onSnapshot: () => void
}

const SEARCH_ITEMS = [
  { label: "Insights", desc: "Dashboard overview & KPIs", tab: "insights" as TabId },
  { label: "All Deals", desc: "Full deal list with manual entry", tab: "deals" as TabId },
  { label: "Deal Breakdown", desc: "Monthly, Quarterly, YTD breakdown", tab: "dealbreakdown" as TabId },
  { label: "Monthly", desc: "Commit intelligence & AD summary", tab: "monthly" as TabId },
  { label: "Quarterly", desc: "Quarter performance & attainment", tab: "quarterly" as TabId },
  { label: "YTD", desc: "Year-to-date cumulative performance", tab: "ytd" as TabId },
  { label: "Closed Won", desc: "Won deals, win rate, insights", tab: "closed" as TabId },
  { label: "Closed Lost", desc: "Lost deals, reviews, loss reasons", tab: "closed" as TabId },
  { label: "Services", desc: "Services tracking & insights", tab: "services" as TabId },
  { label: "Budget", desc: "OI & ARR targets, team management", tab: "budget" as TabId },
  { label: "Accounts", desc: "Account reference, ELV IDs", tab: "accounts" as TabId },
  { label: "Reports & Exports", desc: "Exports, product reports", tab: "reports" as TabId },
]

export function Header({ onImport, onSnapshot }: HeaderProps) {
  const { data, importDate, setTab } = useDashboardStore()
  const [search, setSearch] = useState("")
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const dataCount = data.length
  const manualCount = data.filter((d) => d._isManual).length
  const importLabel = importDate
    ? " · imported " + new Date(importDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : ""

  const filtered = search.trim()
    ? SEARCH_ITEMS.filter(
        (i) =>
          i.label.toLowerCase().includes(search.toLowerCase()) ||
          i.desc.toLowerCase().includes(search.toLowerCase())
      )
    : SEARCH_ITEMS.slice(0, 6)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <header className="flex items-center justify-between py-4 border-b mb-5 gap-4 flex-wrap">
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          FY26 Forecast{" "}
          <span className="text-primary font-light">Dashboard</span>
        </h1>
        {dataCount > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {dataCount} deals{manualCount > 0 ? ` (${manualCount} manual)` : ""}
            {importLabel}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Dashboard search */}
        <div ref={searchRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search dashboard..."
              className="pl-8 w-48 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setShowResults(true)}
            />
          </div>
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden min-w-[260px]">
              {filtered.map((item) => (
                <button
                  key={item.label}
                  className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-3 text-sm border-b last:border-0"
                  onMouseDown={() => {
                    setTab(item.tab)
                    setSearch("")
                    setShowResults(false)
                  }}
                >
                  <div>
                    <div className="font-medium text-xs">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onSnapshot}
          title="Download snapshot"
        >
          <Camera className="w-4 h-4" />
        </Button>

        <ThemeToggle />

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() =>
            window.open(
              "https://accessgroup.lightning.force.com/lightning/r/Report/00OTl00000EdSIwMAN/view",
              "_blank"
            )
          }
        >
          <ExternalLink className="w-3 h-3" />
          SF Report
        </Button>

        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={onImport}>
          <Download className="w-3.5 h-3.5" />
          Import Data
        </Button>
      </div>
    </header>
  )
}
