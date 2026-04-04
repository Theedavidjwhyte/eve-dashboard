import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  Deal,
  Filters,
  AllNotes,
  TimestampedNote,
  LostReview,
  AccountMatch,
  ARRBaseRow,
  BudgetTargets,
  TabId,
  ClosedView,
  BreakdownView,
  WeekKey,
} from "@/types"
import type { ARRDeal, ARRDupLog } from "@/lib/arrImport"
import { enrichRow } from "@/lib/enrichRow"
import { DEFAULT_OI_TARGETS, DEFAULT_ARR_TARGETS } from "@/config/budgets"
import { DEFAULT_ACCOUNT_MATCH } from "@/lib/accountMatch"
import { DEFAULT_ARR_BASE_DATA } from "@/config/arrBaseData"
import { MONTHS } from "@/config/months"
import { USERS, BUDGET_AD_KEYS, BUDGET_AD_MAP } from "@/config/users"
import { deriveMonthlyBudget } from "@/lib/budgetHelpers"
// Supabase sync — imported lazily so the app works without the package
import {
  pushImport,
  pushManualDeal,
  deleteManualDeal as supaDeleteManualDeal,
  upsertNote,
  upsertFreeNote,
  pushCommitNote,
  upsertCommitCompany,
  upsertLostReview,
  upsertSvcRequired,
  upsertBudgetTarget,
  pushAccountMatch,
  pushARRBase,
} from "@/lib/syncService"

// ── Initial notes structure ───────────────────────────────────────────────────
function buildEmptyNotes(): AllNotes {
  const notes: AllNotes = {}
  MONTHS.forEach((m) => {
    notes[m] = {}
    USERS.forEach((u) => {
      notes[m][u] = { W1: "", W2: "", W3: "", W4: "", W5: "" }
    })
  })
  return notes
}

// ── Store interface ───────────────────────────────────────────────────────────
interface DashboardState {
  // Data
  data: Deal[]
  rawCsv: string
  manualDeals: Deal[]
  importDate: string | null

  // Filters
  filters: Filters
  currentTab: TabId
  closedView: ClosedView
  breakdownView: BreakdownView

  // Notes
  notes: AllNotes
  freeNotes: Record<string, string>
  commitNotesTS: Record<string, TimestampedNote[]>
  commitCompany: Record<string, number>

  // Reviews / flags
  lostReviews: Record<string, LostReview>
  svcRequired: Record<string, string>

  // Budget (user-editable, persisted)
  oiTargets: BudgetTargets
  arrTargets: BudgetTargets

  // Reference data
  accountMatch: AccountMatch[]
  arrBaseData: ARRBaseRow[]

  // ARR imported deals
  arrDeals: ARRDeal[]
  arrDupLog: ARRDupLog[]
  arrExemptLog: ARRDeal[]
  arrImportDate: string | null

  // Derived (not persisted)
  monthlyBudget: Record<string, number>

  // ── Actions ────────────────────────────────────────────────────────────────
  importData: (rawCsv: string, rows: Deal[]) => void
  importARRData: (deals: ARRDeal[], dupLog: ARRDupLog[], exemptLog: ARRDeal[]) => void
  clearARRData: () => void
  clearData: () => void
  addManualDeal: (deal: Deal) => void
  removeManualDeal: (manualId: string) => void

  setTab: (tab: TabId) => void
  setFilters: (partial: Partial<Filters>) => void
  clearFilters: () => void
  setClosedView: (v: ClosedView) => void
  setBreakdownView: (v: BreakdownView) => void

  setNote: (month: string, user: string, week: WeekKey, value: string) => void
  setFreeNote: (month: string, value: string) => void
  addTimestampedNote: (month: string, text: string) => void
  setCommitCompany: (month: string, value: number) => void

  setLostReview: (oppName: string, review: LostReview) => void
  setSvcRequiredFlag: (oppName: string, value: string) => void

  updateOITarget: (month: string, adKey: string, value: number) => void
  updateARRTarget: (month: string, adKey: string, value: number) => void
  importOITargets: (targets: BudgetTargets) => void
  importARRTargets: (targets: BudgetTargets) => void

  setAccountMatch: (data: AccountMatch[]) => void
  addAccountMatch: (entry: AccountMatch) => void
  setARRBaseData: (data: ARRBaseRow[]) => void

  // Bulk import setters (for Reports tab restore)
  setNotes: (notes: AllNotes) => void
  setFreeNotes: (freeNotes: Record<string, string>) => void
  setOiTargets: (targets: BudgetTargets) => void
  setArrTargets: (targets: BudgetTargets) => void
  setArrBaseData: (data: ARRBaseRow[]) => void
  setSvcRequired: (flags: Record<string, string>) => void

  addTeamMember: (name: string) => void
}

// ── Default filters ───────────────────────────────────────────────────────────
const DEFAULT_FILTERS: Filters = {
  month: "All",
  user: "All",
  quarter: "All",
  product: "All",
  group: "All",
  keyDeals: false,
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      // Initial state
      data: [],
      rawCsv: "",
      manualDeals: [],
      importDate: null,
      filters: { ...DEFAULT_FILTERS },
      currentTab: "insights",
      closedView: "won",
      breakdownView: "monthly",
      notes: buildEmptyNotes(),
      freeNotes: {},
      commitNotesTS: {},
      commitCompany: {},
      lostReviews: {},
      svcRequired: {},
      oiTargets: DEFAULT_OI_TARGETS,
      arrTargets: DEFAULT_ARR_TARGETS,
      accountMatch: DEFAULT_ACCOUNT_MATCH,
      arrBaseData: DEFAULT_ARR_BASE_DATA,

      // ARR
      arrDeals: [],
      arrDupLog: [],
      arrExemptLog: [],
      arrImportDate: null,

      monthlyBudget: deriveMonthlyBudget(DEFAULT_OI_TARGETS),

      // ── Data actions ───────────────────────────────────────────────────────
      importARRData: (deals, dupLog, exemptLog) => {
        set({
          arrDeals: deals,
          arrDupLog: dupLog,
          arrExemptLog: exemptLog,
          arrImportDate: new Date().toISOString(),
        })
      },

      clearARRData: () => set({ arrDeals: [], arrDupLog: [], arrExemptLog: [], arrImportDate: null }),

      importData: (rawCsv, rows) => {
        const { manualDeals } = get()
        const enriched = rows.map((r) => enrichRow({ ...r }))
        const withManual = [
          ...enriched.filter((r) => !r._isManual),
          ...manualDeals.map((d) => enrichRow({ ...d })),
        ]
        set({
          data: withManual,
          rawCsv,
          importDate: new Date().toISOString(),
        })
        // Push to Supabase in background — don't block the UI
        pushImport(rawCsv, enriched).catch(console.warn)
      },

      clearData: () =>
        set({
          data: [],
          rawCsv: "",
          importDate: null,
          manualDeals: [],
        }),

      addManualDeal: (deal) => {
        const enriched = enrichRow({ ...deal, _isManual: true })
        set((s) => ({
          manualDeals: [...s.manualDeals, deal],
          data: [...s.data.filter((d) => !d._isManual), ...s.manualDeals.map((d) => enrichRow({ ...d })), enriched],
        }))
        pushManualDeal(enriched).catch(console.warn)
      },

      removeManualDeal: (manualId) => {
        set((s) => {
          const manualDeals = s.manualDeals.filter((d) => d._manualId !== manualId)
          return {
            manualDeals,
            data: [
              ...s.data.filter((d) => !d._isManual),
              ...manualDeals.map((d) => enrichRow({ ...d })),
            ],
          }
        })
        supaDeleteManualDeal(manualId).catch(console.warn)
      },

      // ── Navigation ────────────────────────────────────────────────────────
      setTab: (tab) => set({ currentTab: tab }),
      setFilters: (partial) =>
        set((s) => ({ filters: { ...s.filters, ...partial } })),
      clearFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
      setClosedView: (v) => set({ closedView: v }),
      setBreakdownView: (v) => set({ breakdownView: v }),

      // ── Notes ─────────────────────────────────────────────────────────────
      setNote: (month, user, week, value) => {
        set((s) => ({
          notes: {
            ...s.notes,
            [month]: {
              ...s.notes[month],
              [user]: {
                ...(s.notes[month]?.[user] ?? { W1: "", W2: "", W3: "", W4: "", W5: "" }),
                [week]: value,
              },
            },
          },
        }))
        upsertNote(month, user, week, value).catch(console.warn)
      },

      setFreeNote: (month, value) => {
        set((s) => ({ freeNotes: { ...s.freeNotes, [month]: value } }))
        upsertFreeNote(month, value).catch(console.warn)
      },

      addTimestampedNote: (month, text) => {
        const now = new Date()
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        const dayLabel =
          days[now.getDay()] +
          "-" +
          now.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        const entry: TimestampedNote = {
          text,
          date: now.toISOString().split("T")[0],
          dayLabel,
        }
        set((s) => ({
          commitNotesTS: {
            ...s.commitNotesTS,
            [month]: [entry, ...(s.commitNotesTS[month] ?? [])],
          },
        }))
        pushCommitNote(month, entry).catch(console.warn)
      },

      setCommitCompany: (month, value) => {
        set((s) => ({
          commitCompany: { ...s.commitCompany, [month]: value },
        }))
        upsertCommitCompany(month, value).catch(console.warn)
      },

      // ── Reviews / flags ───────────────────────────────────────────────────
      setLostReview: (oppName, review) => {
        set((s) => ({
          lostReviews: { ...s.lostReviews, [oppName]: review },
        }))
        upsertLostReview(oppName, review).catch(console.warn)
      },

      setSvcRequiredFlag: (oppName, value) => {
        set((s) => ({
          svcRequired: { ...s.svcRequired, [oppName]: value },
        }))
        upsertSvcRequired(oppName, value).catch(console.warn)
      },

      // ── Budget ────────────────────────────────────────────────────────────
      updateOITarget: (month, adKey, value) => {
        set((s) => {
          const oiTargets = {
            ...s.oiTargets,
            [month]: { ...(s.oiTargets[month] ?? {}), [adKey]: value },
          }
          return { oiTargets, monthlyBudget: deriveMonthlyBudget(oiTargets) }
        })
        upsertBudgetTarget("oi", month, adKey, value).catch(console.warn)
      },

      updateARRTarget: (month, adKey, value) => {
        set((s) => ({
          arrTargets: {
            ...s.arrTargets,
            [month]: { ...(s.arrTargets[month] ?? {}), [adKey]: value },
          },
        }))
        upsertBudgetTarget("arr", month, adKey, value).catch(console.warn)
      },

      importOITargets: (targets) =>
        set({ oiTargets: targets, monthlyBudget: deriveMonthlyBudget(targets) }),

      importARRTargets: (targets) => set({ arrTargets: targets }),

      // ── Reference data ────────────────────────────────────────────────────
      setAccountMatch: (data) => {
        set({ accountMatch: data })
        pushAccountMatch(data).catch(console.warn)
      },
      addAccountMatch: (entry) => {
        set((s) => ({ accountMatch: [...s.accountMatch, entry] }))
        pushAccountMatch([entry]).catch(console.warn)
      },
      setARRBaseData: (data) => {
        set({ arrBaseData: data })
        pushARRBase(data).catch(console.warn)
      },

      // ── Bulk import setters ───────────────────────────────────────────────
      setNotes: (notes) => set({ notes }),
      setFreeNotes: (freeNotes) => set({ freeNotes }),
      setOiTargets: (targets) => set({ oiTargets: targets, monthlyBudget: deriveMonthlyBudget(targets) }),
      setArrTargets: (targets) => set({ arrTargets: targets }),
      setArrBaseData: (data) => set({ arrBaseData: data }),
      setSvcRequired: (flags) => set({ svcRequired: flags }),

      // ── Team management ───────────────────────────────────────────────────
      addTeamMember: (name) => {
        if (USERS.includes(name)) return
        USERS.push(name)
        const initials = name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
        let key = initials
        let i = 1
        while (BUDGET_AD_KEYS.includes(key)) {
          key = initials + i++
        }
        BUDGET_AD_KEYS.push(key)
        BUDGET_AD_MAP[key] = name
        set((s) => {
          const oiTargets = { ...s.oiTargets }
          const arrTargets = { ...s.arrTargets }
          MONTHS.forEach((m) => {
            oiTargets[m] = { ...(oiTargets[m] ?? {}), [key]: 0 }
            arrTargets[m] = { ...(arrTargets[m] ?? {}), [key]: 0 }
          })
          return {
            oiTargets,
            arrTargets,
            monthlyBudget: deriveMonthlyBudget(oiTargets),
          }
        })
      },
    }),
    {
      name: "fy26-dashboard",
      storage: createJSONStorage(() => localStorage),
      // Don't persist derived monthlyBudget — always recalculate from oiTargets
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { monthlyBudget: _, ...rest } = state
        return rest
      },
      onRehydrateStorage: () => (state) => {
        // Rehydrate derived fields after loading from localStorage
        if (state) {
          state.monthlyBudget = deriveMonthlyBudget(state.oiTargets)
          // Re-enrich data in case enrichRow logic changed
          if (state.data.length > 0) {
            state.data = state.data.map((r) => enrichRow({ ...r }))
          }
        }
      },
    }
  )
)

// ── Selectors (for use in components) ────────────────────────────────────────
export const selectFilteredDeals = (
  data: Deal[],
  filters: Filters,
  currentTab: TabId
): Deal[] => {
  return data.filter((r) => {
    // Month filter applies to relevant tabs only
    const tabsWithMonthFilter = [
      "monthly", "deals", "dealbreakdown", "services", "closed",
    ]
    if (tabsWithMonthFilter.includes(currentTab)) {
      if (!monthMatchesFilter(r._month ?? "", filters.month)) return false
    }

    if (filters.user !== "All" && r.User !== filters.user) return false

    if (currentTab === "quarterly") {
      if (filters.quarter !== "All" && r._quarter !== filters.quarter)
        return false
    }

    if (filters.product !== "All" && r._product !== filters.product)
      return false

    if (filters.group !== "All") {
      // Group filter handled in component since we need PRODUCT_GROUPS
    }

    if (filters.keyDeals && (r._abc ?? 0) <= 30000) return false

    return true
  })
}

export function monthMatchesFilter(
  month: string,
  filterMonth: string | string[]
): boolean {
  if (filterMonth === "All") return true
  if (Array.isArray(filterMonth)) return filterMonth.includes(month)
  return filterMonth === month
}

export function getSelectedMonths(filterMonth: string | string[]): string[] {
  if (filterMonth === "All") return MONTHS
  if (Array.isArray(filterMonth)) return filterMonth
  return [filterMonth]
}

/** Returns true when a deal's User matches the current user filter (single or multi) */
export function userMatchesFilter(user: string | undefined, filterUser: string | string[]): boolean {
  if (filterUser === "All") return true
  if (Array.isArray(filterUser)) return filterUser.includes(user ?? "")
  return user === filterUser
}

/** Returns the list of active AD names (or all ADs when filter is "All") */
export function getSelectedUsers(filterUser: string | string[]): string[] {
  if (filterUser === "All") return USERS
  if (Array.isArray(filterUser)) return filterUser
  return [filterUser]
}

/** True when any AD filter is active */
export function isUserFiltered(filterUser: string | string[]): boolean {
  if (filterUser === "All") return false
  if (Array.isArray(filterUser)) return filterUser.length > 0 && filterUser.length < USERS.length
  return true
}
