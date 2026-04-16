import { useState, useEffect, useRef } from "react"
import { PasswordGate } from "@/components/layout/PasswordGate"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { FiltersBar } from "@/components/layout/FiltersBar"
import { EmptyState } from "@/components/shared/EmptyState"

import { DealDetailModal } from "@/components/modals/DealDetailModal"
import { DroppedDealsModal } from "@/components/modals/DroppedDealsModal"
import { QuickAskOverlay, QuickAskButton } from "@/components/modals/QuickAskOverlay"
import { ADCardModal } from "@/components/modals/ADCardModal"

import { useDashboardStore } from "@/store/dashboardStore"
import { useSync } from "@/hooks/useSync"
import type { Deal } from "@/types"

// ── Tab imports ───────────────────────────────────────────────────────────────
import { InsightsTab } from "@/components/tabs/InsightsTab"
import { MonthlyTab } from "@/components/tabs/MonthlyTab"
import { AllDealsTab } from "@/components/tabs/AllDealsTab"
import { DealBreakdownTab } from "@/components/tabs/DealBreakdownTab"
import { QuarterlyTab } from "@/components/tabs/QuarterlyTab"
import { YTDTab } from "@/components/tabs/YTDTab"
import { ClosedTab } from "@/components/tabs/ClosedTab"
import { ServicesTab } from "@/components/tabs/ServicesTab"
import { BudgetTab } from "@/components/tabs/BudgetTab"
import { AccountsTab } from "@/components/tabs/AccountsTab"
import { ReportsTab } from "@/components/tabs/ReportsTab"
import { ForecastPostTab } from "@/components/tabs/ForecastPostTab"
import { NetworkTab } from "@/components/tabs/NetworkTab"
import { PipeCreationTab } from "@/components/tabs/PipeCreationTab"
import { ARRTab } from "@/components/tabs/ARRTab"
import { ARRMonthlyTab } from "@/components/tabs/ARRMonthlyTab"
import { ARRExemptTab } from "@/components/tabs/ARRExemptTab"
import { ARRDupesTab } from "@/components/tabs/ARRDupesTab"
import { ARRADTab } from "@/components/tabs/ARRADTab"
import { ARRInsightsTab } from "@/components/tabs/ARRInsightsTab"
import { SlippedDealsTab } from "@/components/tabs/SlippedDealsTab"
import { DataLineageTab } from "@/components/tabs/DataLineageTab"
import { NonSFDealsTab } from "@/components/tabs/NonSFDealsTab"
import { RawDataTab } from "@/components/tabs/RawDataTab"
import { ProductsTab } from "@/components/tabs/ProductsTab"
import { ChurnTab } from "@/components/tabs/ChurnTab"
import { ConversionTab } from "@/components/tabs/ConversionTab"
import { RouteToNumbersTab } from "@/components/tabs/RouteToNumbersTab"
import { DealReviewsTab } from "@/components/tabs/DealReviewsTab"

interface DealModalState {
  open: boolean
  title: string
  deals: Deal[]
}

export default function App() {
  const { data, currentTab, droppedDeals } = useDashboardStore()

  const [askOpen, setAskOpen] = useState(false)
  const [droppedOpen, setDroppedOpen] = useState(false)
  const [adCardName, setAdCardName] = useState<string | null>(null)
  const [dealModal, setDealModal] = useState<DealModalState>({ open: false, title: "", deals: [] })

  const prevDroppedCount = useRef(0)
  useEffect(() => {
    if (droppedDeals.length > 0 && droppedDeals.length !== prevDroppedCount.current) setDroppedOpen(true)
    prevDroppedCount.current = droppedDeals.length
  }, [droppedDeals.length])

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("eve_sidebar_collapsed") === "1" } catch { return false }
  })
  function toggleSidebar() {
    setSidebarCollapsed(v => {
      const next = !v
      try { localStorage.setItem("eve_sidebar_collapsed", next ? "1" : "0") } catch {}
      return next
    })
  }

  const { status: syncStatus, lastSynced, refresh: syncRefresh } = useSync()

  // ── Deal modal event listener ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { title, deals } = (e as CustomEvent).detail
      setDealModal({ open: true, title, deals })
    }
    window.addEventListener("open-deal-modal", handler)
    return () => window.removeEventListener("open-deal-modal", handler)
  }, [])

  // ── AD modal event listener ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { name } = (e as CustomEvent).detail
      setAdCardName(name)
    }
    window.addEventListener("open-ad-modal", handler)
    return () => window.removeEventListener("open-ad-modal", handler)
  }, [])

  // ── Keyboard shortcut Ctrl/Cmd+K ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setAskOpen(v => !v) }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  function renderTab() {
    // ── Tabs that work WITHOUT OI data ─────────────────────────────────────
    if (currentTab === "arr")            return <ARRTab scrollTo={null} />
    if (currentTab === "arr-monthly")    return <ARRMonthlyTab />
    if (currentTab === "arr-exempt")     return <ARRExemptTab />
    if (currentTab === "arr-dupes")      return <ARRDupesTab />
    if (currentTab === "arr-ad")         return <ARRADTab />
    if (currentTab === "arr-insights")   return <ARRInsightsTab />
    if (currentTab === "arr-churn")      return <ChurnTab />
    if (currentTab === "network")        return <NetworkTab />
    if (currentTab === "data-lineage")   return <DataLineageTab />
    if (currentTab === "raw-data")       return <RawDataTab />
    if (currentTab === "reports")        return <ReportsTab />
    if (currentTab === "non-sf-deals")   return <NonSFDealsTab />
    if (currentTab === "deal-reviews")   return <DealReviewsTab />
    if (currentTab === "accounts")       return <AccountsTab />
    if (currentTab === "budget")         return <BudgetTab />
    if (currentTab === "products")       return <ProductsTab />

    // ── OI data required ───────────────────────────────────────────────────
    if (data.length === 0) return <EmptyState />

    switch (currentTab) {
      case "insights":           return <InsightsTab />
      case "deals":              return <AllDealsTab />
      case "dealbreakdown":      return <DealBreakdownTab />
      case "monthly":            return <MonthlyTab />
      case "quarterly":          return <QuarterlyTab />
      case "ytd":                return <YTDTab />
      case "closed":             return <ClosedTab />
      case "services":           return <ServicesTab />
      case "forecast-post":      return <ForecastPostTab />
      case "pipeline-creation":  return <PipeCreationTab />
      case "slipped-deals":      return <SlippedDealsTab />
      case "route-to-numbers":   return <RouteToNumbersTab />
      case "conversion":         return <ConversionTab />
      default:                   return <InsightsTab />
    }
  }

  return (
    <PasswordGate>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar
            onAsk={() => setAskOpen(true)}
            syncStatus={syncStatus}
            lastSynced={lastSynced}
            onSyncRefresh={syncRefresh}
            droppedCount={droppedDeals.length}
            onDroppedDeals={() => setDroppedOpen(true)}
          />

          {data.length > 0 && (
            <div className="border-b bg-card px-6 py-2">
              <FiltersBar />
            </div>
          )}

          <main className="flex-1 overflow-y-auto px-6 py-5">
            {renderTab()}
          </main>
        </div>

        {/* Modals */}
        <DealDetailModal
          open={dealModal.open}
          onClose={() => setDealModal(s => ({ ...s, open: false }))}
          title={dealModal.title}
          deals={dealModal.deals}
        />
        <QuickAskOverlay open={askOpen} onClose={() => setAskOpen(false)} />
        <DroppedDealsModal open={droppedOpen} onClose={() => setDroppedOpen(false)} />
        {adCardName && (
          <ADCardModal
            name={adCardName}
            open={!!adCardName}
            onClose={() => setAdCardName(null)}
          />
        )}
        {data.length > 0 && <QuickAskButton onClick={() => setAskOpen(true)} />}
      </div>
    </PasswordGate>
  )
}
