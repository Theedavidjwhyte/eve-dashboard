import { useState, useEffect } from "react"
import { PasswordGate, useSignOut } from "@/components/layout/PasswordGate"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { FiltersBar } from "@/components/layout/FiltersBar"
import { EmptyState } from "@/components/shared/EmptyState"
import { ImportDataModal } from "@/components/modals/ImportDataModal"
import { DealDetailModal } from "@/components/modals/DealDetailModal"
import { QuickAskOverlay, QuickAskButton } from "@/components/modals/QuickAskOverlay"
import { useDashboardStore } from "@/store/dashboardStore"
import { useSync } from "@/hooks/useSync"
import type { Deal } from "@/types"

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

// ── Deal modal event bus ──────────────────────────────────────────────────────
export interface DealModalState {
  open: boolean
  title: string
  deals: Deal[]
}

export function openDealModal(title: string, deals: Deal[]) {
  window.dispatchEvent(
    new CustomEvent("open-deal-modal", { detail: { title, deals } })
  )
}

export default function App() {
  const { data, currentTab } = useDashboardStore()
  const [importOpen, setImportOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("eve_sidebar_collapsed") === "1" } catch { return false }
  })

  // Persist collapse state
  function toggleSidebar() {
    setSidebarCollapsed((v) => {
      const next = !v
      try { localStorage.setItem("eve_sidebar_collapsed", next ? "1" : "0") } catch {}
      return next
    })
  }
  const [dealModal, setDealModal] = useState<DealModalState>({
    open: false,
    title: "",
    deals: [],
  })

  // ── Supabase sync ──────────────────────────────────────────────────────────
  const { status: syncStatus, lastSynced, refresh: syncRefresh } = useSync()

  // ── Deal modal listener ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { title, deals } = (e as CustomEvent).detail
      setDealModal({ open: true, title, deals })
    }
    window.addEventListener("open-deal-modal", handler)
    return () => window.removeEventListener("open-deal-modal", handler)
  }, [])

  // ── Keyboard shortcut Ctrl/Cmd+K ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setAskOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  function renderTab() {
    // ARR tabs — all work without OI data
    if (currentTab === "arr")         return <ARRTab scrollTo={null} />
    if (currentTab === "arr-monthly") return <ARRMonthlyTab />
    if (currentTab === "arr-exempt")  return <ARRExemptTab />
    if (currentTab === "arr-dupes")   return <ARRDupesTab />
    if (currentTab === "network") return <NetworkTab />

    if (data.length === 0) {
      return <EmptyState onImport={() => setImportOpen(true)} />
    }
    switch (currentTab) {
      case "insights":          return <InsightsTab />
      case "deals":             return <AllDealsTab />
      case "dealbreakdown":     return <DealBreakdownTab />
      case "monthly":           return <MonthlyTab />
      case "quarterly":         return <QuarterlyTab />
      case "ytd":               return <YTDTab />
      case "closed":            return <ClosedTab />
      case "services":          return <ServicesTab />
      case "budget":            return <BudgetTab />
      case "accounts":          return <AccountsTab />
      case "reports":           return <ReportsTab />
      case "forecast-post":     return <ForecastPostTab />
      case "pipeline-creation": return <PipeCreationTab />
      default:                  return <InsightsTab />
    }
  }

  return (
    <PasswordGate>
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Left Sidebar ── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        onImport={() => setImportOpen(true)}
      />

      {/* ── Main content area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <TopBar
          onImport={() => setImportOpen(true)}
          onAsk={() => setAskOpen(true)}
          syncStatus={syncStatus}
          lastSynced={lastSynced}
          onSyncRefresh={syncRefresh}
        />

        {/* Filters strip — only when data loaded */}
        {data.length > 0 && (
          <div className="border-b bg-card px-6 py-2">
            <FiltersBar />
          </div>
        )}

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto px-6 py-5">
          {renderTab()}
        </main>
      </div>

      {/* ── Modals ── */}
      <ImportDataModal open={importOpen} onClose={() => setImportOpen(false)} />
      <DealDetailModal
        open={dealModal.open}
        onClose={() => setDealModal((s) => ({ ...s, open: false }))}
        title={dealModal.title}
        deals={dealModal.deals}
      />
      <QuickAskOverlay open={askOpen} onClose={() => setAskOpen(false)} />
      {data.length > 0 && <QuickAskButton onClick={() => setAskOpen(true)} />}
    </div>
    </PasswordGate>
  )
}
// Fri Apr  3 11:52:20 UTC 2026
