import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboardStore } from "@/store/dashboardStore"
import type { TabId } from "@/types"
import { cn } from "@/lib/utils"

const TABS: { id: TabId; label: string }[] = [
  { id: "insights", label: "Insights" },
  { id: "deals", label: "All Deals" },
  { id: "dealbreakdown", label: "Deal Breakdown" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "ytd", label: "YTD" },
  { id: "closed", label: "Closed" },
  { id: "services", label: "Services" },
  { id: "budget", label: "Budget" },
  { id: "accounts", label: "Accounts" },
  { id: "reports", label: "Reports & Exports" },
]

export function TabBar() {
  const { currentTab, setTab, filters, clearFilters } = useDashboardStore()

  const hasActiveFilters =
    filters.month !== "All" ||
    filters.user !== "All" ||
    filters.product !== "All" ||
    filters.group !== "All" ||
    filters.quarter !== "All" ||
    filters.keyDeals

  return (
    <div className="flex items-center gap-1 bg-card border rounded-lg p-1 mb-5 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setTab(tab.id)}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all outline-none",
            currentTab === tab.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}

      {hasActiveFilters && (
        <Button
          variant="destructive"
          size="sm"
          className="ml-auto h-6 text-xs px-2 gap-1 shrink-0"
          onClick={clearFilters}
        >
          <X className="w-3 h-3" />
          Clear Filters
        </Button>
      )}
    </div>
  )
}
