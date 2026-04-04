// ── useSync — manages Supabase sync state ────────────────────────────────────
// Runs on mount: pulls remote state and merges into local store.
// Exposes syncStatus so the UI can show a connection indicator.

import { useEffect, useState, useCallback, useRef } from "react"
import { useDashboardStore } from "@/store/dashboardStore"
import { supabaseConfigured } from "@/lib/supabase"
import { fetchAllRemoteState } from "@/lib/syncService"
import type { SyncStatus } from "@/lib/supabase"
// re-export so App.tsx can import from here too
export type { SyncStatus }
import { deriveMonthlyBudget } from "@/lib/budgetHelpers"

export function useSync() {
  const [status, setStatus] = useState<SyncStatus>(
    supabaseConfigured ? "syncing" : "offline"
  )
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const hasSynced = useRef(false)

  const store = useDashboardStore()

  const syncFromRemote = useCallback(async () => {
    if (!supabaseConfigured) {
      setStatus("offline")
      return
    }

    setStatus("syncing")

    try {
      const remote = await fetchAllRemoteState()

      // Merge remote state into store — remote wins on everything except
      // local-only UI state (currentTab, filters, closedView, breakdownView)
      const updates: Partial<typeof store> = {}

      if (remote.deals && remote.deals.length > 0) {
        updates.data = remote.deals
        updates.rawCsv = remote.rawCsv ?? ""
        updates.importDate = remote.importDate ?? null
      }
      if (remote.manualDeals && remote.manualDeals.length > 0) {
        updates.manualDeals = remote.manualDeals
      }
      if (remote.notes) updates.notes = remote.notes
      if (remote.freeNotes) updates.freeNotes = remote.freeNotes
      if (remote.commitNotesTS) updates.commitNotesTS = remote.commitNotesTS
      if (remote.commitCompany) updates.commitCompany = remote.commitCompany
      if (remote.lostReviews) updates.lostReviews = remote.lostReviews
      if (remote.svcRequired) updates.svcRequired = remote.svcRequired
      if (remote.oiTargets) {
        updates.oiTargets = remote.oiTargets
        updates.monthlyBudget = deriveMonthlyBudget(remote.oiTargets)
      }
      if (remote.arrTargets) updates.arrTargets = remote.arrTargets
      if (remote.accountMatch && remote.accountMatch.length > 0) {
        updates.accountMatch = remote.accountMatch
      }
      if (remote.arrBaseData && remote.arrBaseData.length > 0) {
        updates.arrBaseData = remote.arrBaseData
      }

      // Apply all updates at once
      if (Object.keys(updates).length > 0) {
        useDashboardStore.setState(updates as Partial<ReturnType<typeof useDashboardStore.getState>>)
      }

      setStatus("synced")
      setLastSynced(new Date())
      hasSynced.current = true
    } catch (err) {
      console.error("[sync] fetchAllRemoteState failed", err)
      setStatus("error")
    }
  }, [store])

  // Initial sync on mount
  useEffect(() => {
    if (!hasSynced.current) {
      syncFromRemote()
    }
  }, [syncFromRemote])

  // Refresh every 5 minutes (keeps multiple tabs in sync)
  useEffect(() => {
    if (!supabaseConfigured) return
    const interval = setInterval(() => {
      syncFromRemote()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [syncFromRemote])

  return { status, lastSynced, refresh: syncFromRemote }
}
