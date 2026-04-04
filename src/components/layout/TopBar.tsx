import { useState, useRef, useEffect } from "react"
import { Search, ExternalLink, MessageSquare, LogOut } from "lucide-react"
import { useSignOut } from "@/components/layout/PasswordGate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { SyncIndicator } from "@/components/layout/SyncIndicator"
import { useDashboardStore } from "@/store/dashboardStore"
import type { TabId } from "@/types"
import type { SyncStatus } from "@/lib/supabase"

interface TopBarProps {
  onImport: () => void
  onAsk: () => void
  syncStatus: SyncStatus
  lastSynced: Date | null
  onSyncRefresh: () => void
}

const SEARCH_ITEMS = [
  { label: "Insights", desc: "Dashboard overview & KPIs", tab: "insights" as TabId },
  { label: "Monthly", desc: "Commit intelligence & AD summary", tab: "monthly" as TabId },
  { label: "All Deals", desc: "Full deal list with manual entry", tab: "deals" as TabId },
  { label: "Deal Breakdown", desc: "Monthly, quarterly, YTD breakdown", tab: "dealbreakdown" as TabId },
  { label: "Quarterly", desc: "Quarter performance & attainment", tab: "quarterly" as TabId },
  { label: "YTD", desc: "Year-to-date cumulative performance", tab: "ytd" as TabId },
  { label: "Closed", desc: "Won/Lost analysis, win rate", tab: "closed" as TabId },
  { label: "Services", desc: "Services tracking & insights", tab: "services" as TabId },
  { label: "Budget", desc: "OI & ARR targets, team management", tab: "budget" as TabId },
  { label: "Accounts", desc: "Account reference, ELV IDs", tab: "accounts" as TabId },
  { label: "Reports & Exports", desc: "Exports, product reports", tab: "reports" as TabId },
  { label: "Network Map", desc: "Workflow relationship nodes", tab: "network" as TabId },
]

export function TopBar({ onAsk, syncStatus, lastSynced, onSyncRefresh }: TopBarProps) {
  const { currentTab, setTab } = useDashboardStore()
  const signOut = useSignOut()
  const [search, setSearch] = useState("")
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const activeTab = SEARCH_ITEMS.find((i) => i.tab === currentTab)

  const filtered = search.trim()
    ? SEARCH_ITEMS.filter(
        (i) =>
          i.label.toLowerCase().includes(search.toLowerCase()) ||
          i.desc.toLowerCase().includes(search.toLowerCase())
      )
    : SEARCH_ITEMS.slice(0, 6)

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
    <header className="flex items-center justify-between h-14 px-6 border-b bg-card shrink-0 gap-4">
      {/* Page title */}
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground truncate">
          {activeTab?.label ?? "Dashboard"}
        </h2>
        {activeTab?.desc && (
          <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
            {activeTab.desc}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Sync status */}
        <SyncIndicator
          status={syncStatus}
          lastSynced={lastSynced}
          onRefresh={onSyncRefresh}
        />

        {/* Search */}
        <div ref={searchRef} className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8 w-44 h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setShowResults(true)}
          />
          {showResults && (
            <div className="absolute top-full right-0 mt-1 bg-popover border rounded-lg shadow-xl z-50 overflow-hidden w-72">
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                  No results
                </div>
              )}
              {filtered.map((item) => (
                <button
                  key={item.label}
                  className="w-full text-left px-3 py-2.5 hover:bg-accent flex items-start gap-2 border-b last:border-0"
                  onMouseDown={() => {
                    setTab(item.tab)
                    setSearch("")
                    setShowResults(false)
                  }}
                >
                  <div>
                    <div className="font-medium text-xs text-foreground">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ask (Ctrl+K) */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs hidden sm:flex"
          onClick={onAsk}
          title="Ask about your data (Ctrl+K)"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Ask
          <kbd className="ml-1 text-[9px] font-mono bg-muted px-1 py-0.5 rounded hidden lg:inline">
            ⌘K
          </kbd>
        </Button>

        <ThemeToggle />

        {/* Sign out */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={signOut}
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </Button>

        {/* Salesforce link */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs hidden lg:flex"
          onClick={() =>
            window.open(
              "https://accessgroup.lightning.force.com/lightning/r/Report/00OTl00000EdSIwMAN/view",
              "_blank"
            )
          }
        >
          <ExternalLink className="w-3 h-3" />
          Salesforce
        </Button>
      </div>
    </header>
  )
}
