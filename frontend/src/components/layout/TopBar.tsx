import { useState, useRef, useEffect } from "react"
import { Search, ExternalLink, MessageSquare, LogOut, HelpCircle, X, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { useSignOut } from "@/components/layout/PasswordGate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { SyncIndicator } from "@/components/layout/SyncIndicator"
import { useDashboardStore } from "@/store/dashboardStore"
import type { TabId } from "@/types"
import type { SyncStatus } from "@/lib/supabase"

interface TopBarProps {
  onAsk: () => void
  syncStatus: SyncStatus
  lastSynced: Date | null
  onSyncRefresh: () => void
  droppedCount?: number
  onDroppedDeals?: () => void
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
  { label: "ARR Performance", desc: "Annual recurring revenue overview", tab: "arr" as TabId },
  { label: "AD Summary", desc: "Per-director ARR breakdown & attainment", tab: "arr-ad" as TabId },
  { label: "AI Insights", desc: "AI-generated ARR performance insights", tab: "arr-insights" as TabId },
  { label: "Budget vs Actual", desc: "Monthly ARR actuals vs budget by director", tab: "arr-monthly" as TabId },
  { label: "Exemptions", desc: "Exempt deals & not-Elevate accounts", tab: "arr-exempt" as TabId },
  { label: "Duplications", desc: "Deduplicated rows removed during import", tab: "arr-dupes" as TabId },
  { label: "Forecast Post", desc: "Generate & share forecast updates", tab: "forecast" as TabId },
  { label: "Pipe Creation", desc: "Pipeline creation analysis by month & AD", tab: "pipecreation" as TabId },
]

export function TopBar({ onAsk, syncStatus, lastSynced, onSyncRefresh, droppedCount = 0, onDroppedDeals }: TopBarProps) {
  const { currentTab, setTab } = useDashboardStore()
  const signOut = useSignOut()
  const [search, setSearch] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
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
        {/* Dropped deals warning badge */}
        {droppedCount > 0 && (
          <button
            onClick={onDroppedDeals}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition-colors text-xs font-medium animate-pulse"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {droppedCount} Dropped
          </button>
        )}

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

        {/* Info / ? button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => setShowInfo(true)}
          title="About E.V.E"
        >
          <HelpCircle className="w-4 h-4" />
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

      {/* ── Info / About Modal ── */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">E.V.E — Expected Value Engine</h2>
                <p className="text-xs text-muted-foreground">Turning Sales Intelligence into Competitive Advantage</p>
              </div>
              <button onClick={() => setShowInfo(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">

              {/* Before */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" /> What we had before
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Salesforce", items: ["Limited reporting & bad hygiene", "Difficult to track account parents", "No editing on closed deals"] },
                    { label: "Forecasting (Clari)", items: ["Poor UI, no AI awareness", "No customisation or deep dives", "Manual updates, export restricted"] },
                    { label: "Pipeline Creation", items: ["Limited reporting", "No AI automation"] },
                    { label: "ARR", items: ["Inaccurate C&B data", "Split/full ABC confusion", "No automation or insights"] },
                    { label: "Budget", items: ["No live updates", "Swapping team members impossible", "Reporting is poor"] },
                  ].map((cat) => (
                    <div key={cat.label} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <div className="text-xs font-semibold text-red-400 mb-1.5">{cat.label}</div>
                      {cat.items.map((item) => (
                        <div key={item} className="text-xs text-muted-foreground flex gap-1.5 mb-1">
                          <span className="text-red-400 mt-0.5">✕</span> {item}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* After */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-500" /> What E.V.E delivers
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Salesforce — Fixed", items: ["Paste-and-go import in seconds", "ELV ID hierarchy mapping", "Data quality engine with flags"] },
                    { label: "Forecasting — Replaced", items: ["Monthly/Quarterly/YTD intelligence", "AI insights — risk, coaching, gaps", "MEDDPICC deal scoring", "Forecast Post with AI commentary"] },
                    { label: "Pipeline — Automated", items: ["Creation analysis by AD & month", "AI trend detection", "Drill-down on every data point"] },
                    { label: "ARR — Transformed", items: ["Auto-split ABC vs full ABC", "Dedup + exempt engine", "Per-AD budget vs actual", "AI insights & cross-validation"] },
                    { label: "Budget — Live", items: ["Real-time actuals vs budget", "Add/remove team members instantly", "Full FY target tracking"] },
                  ].map((cat) => (
                    <div key={cat.label} className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-3">
                      <div className="text-xs font-semibold text-teal-400 mb-1.5">{cat.label}</div>
                      {cat.items.map((item) => (
                        <div key={item} className="text-xs text-muted-foreground flex gap-1.5 mb-1">
                          <span className="text-teal-400 mt-0.5">✓</span> {item}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Before vs After */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Before vs After</h3>
                <div className="border rounded-lg overflow-hidden text-xs">
                  {[
                    ["3+ tools (SF, Clari, Excel)", "1 unified engine"],
                    ["Manual weekly updates", "Auto-import in seconds"],
                    ["No AI", "Contextual AI on your pipeline"],
                    ["Data siloed to one person", "Cross-device Supabase sync"],
                    ["Export what SF allows", "Export anything, any format"],
                    ["No deal qualification", "MEDDPICC scoring on every deal"],
                    ["ARR in spreadsheets", "Live ARR engine with dedup"],
                  ].map(([before, after], i) => (
                    <div key={i} className={`grid grid-cols-2 ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                      <div className="px-3 py-2 text-red-400 border-r">{before}</div>
                      <div className="px-3 py-2 text-teal-400">{after}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* One line */}
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg px-4 py-3 text-center">
                <p className="text-sm font-medium text-teal-300 italic">
                  "E.V.E replaces three tools, eliminates manual reporting, and gives every Account Director
                  and Sales Leader AI-powered intelligence on their pipeline — in real time."
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </header>
  )
}
