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

// ── Helper: convert a manual OI+ARR Deal → ARRDeal for ARR tab sync ──────────
function manualDealToARRDeal(deal: Deal): ARRDeal {
  return {
    closeDate: deal["Close Date"] ?? "",
    currency: "GBP",
    totalAbc: deal._abc ?? (deal["Total ABC"] as number) ?? 0,
    stage: deal.Stage ?? "Pipe",
    accountOwner: deal.User ?? "",
    parentAccountOwner: deal.User ?? "",
    accountTeam: [],
    opportunityId: deal._manualId ?? "",
    accountName: deal["Account Name"] ?? "",
    user: deal.User ?? "",
    ultimateParent: deal["Account Name"] ?? "",
    opportunityName: (deal["Opportunity Name"] ?? "").replace("NSF — ", ""),
    assignedAD: deal.User ?? "",
    isExempt: false,
    exemptReason: "",
    isNotElevate: false,
    isSplit: false,
    product: deal._product ?? "",
  }
}
import { enrichRow } from "@/lib/enrichRow"
import { DEFAULT_OI_TARGETS, DEFAULT_ARR_TARGETS } from "@/config/budgets"
import { DEFAULT_ACCOUNT_MATCH } from "@/lib/accountMatch"
import { DEFAULT_ARR_BASE_DATA } from "@/config/arrBaseData"
import { MONTHS } from "@/config/months"
import { USERS, BUDGET_AD_KEYS, BUDGET_AD_MAP } from "@/config/users"
import { deriveMonthlyBudget } from "@/lib/budgetHelpers"
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
  pushARRDeals,
  pushManualARRDeal as pushManualARRDealSync,
  deleteManualARRDeal as deleteManualARRDealSync,
} from "@/lib/syncService"

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

interface DashboardState {
  data: Deal[]
  rawCsv: string
  manualDeals: Deal[]
  nonSFDeals: Deal[]
  importDate: string | null
  filters: Filters
  currentTab: TabId
  closedView: ClosedView
  breakdownView: BreakdownView
  notes: AllNotes
  freeNotes: Record<string, string>
  commitNotesTS: Record<string, TimestampedNote[]>
  commitCompany: Record<string, number>
  lostReviews: Record<string, LostReview>
  svcRequired: Record<string, string>
  oiTargets: BudgetTargets
  arrTargets: BudgetTargets
  accountMatch: AccountMatch[]
  arrBaseData: ARRBaseRow[]
  arrDeals: ARRDeal[]
  arrDupLog: ARRDupLog[]
  arrExemptLog: ARRDeal[]
  arrImportDate: string | null
  manualArrDeals: ARRDeal[]
  monthlyBudget: Record<string, number>

  importData: (rawCsv: string, rows: Deal[]) => void
  importARRData: (deals: ARRDeal[], dupLog: ARRDupLog[], exemptLog: ARRDeal[]) => void
  clearARRData: () => void
  addManualARRDeal: (deal: ARRDeal) => void
  removeManualARRDeal: (oppId: string) => void
  clearData: () => void
  addManualDeal: (deal: Deal) => void
  updateManualDeal: (deal: Deal) => void
  removeManualDeal: (manualId: string) => void
  addNonSFDeal: (deal: Deal) => void
  updateNonSFDeal: (deal: Deal) => void
  removeNonSFDeal: (manualId: string) => void
  clearNonSFDeals: () => void
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
  setNotes: (notes: AllNotes) => void
  setFreeNotes: (freeNotes: Record<string, string>) => void
  setOiTargets: (targets: BudgetTargets) => void
  setArrTargets: (targets: BudgetTargets) => void
  setArrBaseData: (data: ARRBaseRow[]) => void
  setSvcRequired: (flags: Record<string, string>) => void
  addTeamMember: (name: string) => void
}

const DEFAULT_FILTERS: Filters = {
  month: "All",
  user: "All",
  quarter: "All",
  product: "All",
  group: "All",
  keyDeals: false,
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      data: [],
      rawCsv: "",
      manualDeals: [],
      nonSFDeals: [],
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
      arrDeals: [],
      arrDupLog: [],
      arrExemptLog: [],
      arrImportDate: null,
      manualArrDeals: [],
      monthlyBudget: deriveMonthlyBudget(DEFAULT_OI_TARGETS),

      importARRData: (deals, dupLog, exemptLog) => {
        const { manualArrDeals } = get()
        const importDate = new Date().toISOString()
        set({ arrDeals: [...deals, ...manualArrDeals], arrDupLog: dupLog, arrExemptLog: exemptLog, arrImportDate: importDate })
        pushARRDeals(deals, dupLog, exemptLog, importDate).catch(console.warn)
      },

      clearARRData: () => set({ arrDeals: [], arrDupLog: [], arrExemptLog: [], arrImportDate: null, manualArrDeals: [] }),

      addManualARRDeal: (deal) => {
        set((s) => ({ manualArrDeals: [...s.manualArrDeals, deal], arrDeals: [...s.arrDeals, deal] }))
        pushManualARRDealSync(deal as unknown as Record<string, unknown>).catch(console.warn)
      },

      removeManualARRDeal: (oppId) => {
        set((s) => ({
          manualArrDeals: s.manualArrDeals.filter((d) => d.opportunityId !== oppId),
          arrDeals: s.arrDeals.filter((d) => d.opportunityId !== oppId),
        }))
        deleteManualARRDealSync(oppId).catch(console.warn)
      },

      importData: (rawCsv, rows) => {
        const { nonSFDeals } = get()
        const enriched = rows.map((r) => enrichRow({ ...r }))
        const locks: Record<string, string> = (() => {
          try { return JSON.parse(localStorage.getItem("eve_product_locks") ?? "{}") } catch { return {} }
        })()
        const withLocks = enriched.map((r) => {
          const opp = String(r["Opportunity Name"] ?? "")
          const locked = locks[opp]
          if (locked && (!r._product || r._product === "No Match")) return { ...r, _product: locked }
          return r
        })
        const withNSF = [
          ...withLocks.filter((r) => !r._isManual),
          ...nonSFDeals.map((d) => enrichRow({ ...d })),
        ]
        set({ data: withNSF, rawCsv, importDate: new Date().toISOString() })
        pushImport(rawCsv, enriched).catch(console.warn)
      },

      clearData: () => set({ data: [], rawCsv: "", importDate: null, manualDeals: [] }),

      addManualDeal: (deal) => {
        const enriched = enrichRow({ ...deal, _isManual: true })
        const isARR = enriched._dealType === "OI and ARR" || enriched._dealType === "ARR Only"
        set((s) => {
          const arrEntry = isARR ? manualDealToARRDeal(enriched) : null
          return {
            manualDeals: [...s.manualDeals, enriched],
            data: [...s.data.filter((d) => !d._isManual), ...s.manualDeals.map((d) => enrichRow({ ...d })), enriched],
            arrDeals: arrEntry ? [...s.arrDeals.filter((a) => a.opportunityId !== enriched._manualId), arrEntry] : s.arrDeals,
          }
        })
        pushManualDeal(enriched).catch(console.warn)
      },

      updateManualDeal: (deal) => {
        const enriched = enrichRow({ ...deal, _isManual: true })
        const isARR = enriched._dealType === "OI and ARR" || enriched._dealType === "ARR Only"
        set((s) => {
          const manualDeals = s.manualDeals.map((d) => d._manualId === deal._manualId ? enriched : d)
          const arrEntry = isARR ? manualDealToARRDeal(enriched) : null
          return {
            manualDeals,
            data: [...s.data.filter((d) => !d._isManual), ...manualDeals.map((d) => enrichRow({ ...d }))],
            arrDeals: arrEntry
              ? [...s.arrDeals.filter((a) => a.opportunityId !== enriched._manualId), arrEntry]
              : s.arrDeals.filter((a) => a.opportunityId !== enriched._manualId),
          }
        })
        pushManualDeal(enriched).catch(console.warn)
      },

      removeManualDeal: (manualId) => {
        set((s) => {
          const manualDeals = s.manualDeals.filter((d) => d._manualId !== manualId)
          return {
            manualDeals,
            data: [...s.data.filter((d) => !d._isManual), ...manualDeals.map((d) => enrichRow({ ...d }))],
            arrDeals: s.arrDeals.filter((a) => a.opportunityId !== manualId),
          }
        })
        supaDeleteManualDeal(manualId).catch(console.warn)
      },

      addNonSFDeal: (deal) => {
        const enriched = enrichRow({ ...deal, _isManual: true })
        const isARR = enriched._dealType === "OI and ARR" || enriched._dealType === "ARR Only"
        set((s) => {
          const arrEntry = isARR ? manualDealToARRDeal(enriched) : null
          return {
            nonSFDeals: [...s.nonSFDeals, enriched],
            data: [...s.data.filter((d) => !d._isManual), ...s.nonSFDeals.map((d) => enrichRow({ ...d })), enriched],
            arrDeals: arrEntry ? [...s.arrDeals.filter((a) => a.opportunityId !== enriched._manualId), arrEntry] : s.arrDeals,
          }
        })
        pushManualDeal(enriched).catch(console.warn)
      },

      updateNonSFDeal: (deal) => {
        const enriched = enrichRow({ ...deal, _isManual: true })
        const isARR = enriched._dealType === "OI and ARR" || enriched._dealType === "ARR Only"
        set((s) => {
          const nonSFDeals = s.nonSFDeals.map((d) => d._manualId === deal._manualId ? enriched : d)
          const arrEntry = isARR ? manualDealToARRDeal(enriched) : null
          return {
            nonSFDeals,
            data: [...s.data.filter((d) => !d._isManual), ...nonSFDeals.map((d) => enrichRow({ ...d }))],
            arrDeals: arrEntry
              ? [...s.arrDeals.filter((a) => a.opportunityId !== enriched._manualId), arrEntry]
              : s.arrDeals.filter((a) => a.opportunityId !== enriched._manualId),
          }
        })
        pushManualDeal(enriched).catch(console.warn)
      },

      removeNonSFDeal: (manualId) => {
        set((s) => {
          const nonSFDeals = s.nonSFDeals.filter((d) => d._manualId !== manualId)
          return {
            nonSFDeals,
            data: [...s.data.filter((d) => !d._isManual), ...nonSFDeals.map((d) => enrichRow({ ...d }))],
            arrDeals: s.arrDeals.filter((a) => a.opportunityId !== manualId),
          }
        })
        supaDeleteManualDeal(manualId).catch(console.warn)
      },

      clearNonSFDeals: () => {
        const { nonSFDeals } = get()
        nonSFDeals.forEach((d) => { if (d._manualId) supaDeleteManualDeal(d._manualId).catch(console.warn) })
        set((s) => ({
          nonSFDeals: [],
          data: s.data.filter((d) => !d._isManual),
          arrDeals: s.arrDeals.filter((a) => !nonSFDeals.some((d) => d._manualId === a.opportunityId)),
        }))
      },

      setTab: (tab) => set({ currentTab: tab }),
      setFilters: (partial) => set((s) => ({ filters: { ...s.filters, ...partial } })),
      clearFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
      setClosedView: (v) => set({ closedView: v }),
      setBreakdownView: (v) => set({ breakdownView: v }),

      setNote: (month, user, week, value) => {
        set((s) => ({
          notes: {
            ...s.notes,
            [month]: {
              ...s.notes[month],
              [user]: { ...(s.notes[month]?.[user] ?? { W1: "", W2: "", W3: "", W4: "", W5: "" }), [week]: value },
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
        const dayLabel = days[now.getDay()] + "-" + now.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        const entry: TimestampedNote = { text, date: now.toISOString().split("T")[0], dayLabel }
        set((s) => ({ commitNotesTS: { ...s.commitNotesTS, [month]: [entry, ...(s.commitNotesTS[month] ?? [])] } }))
        pushCommitNote(month, entry).catch(console.warn)
      },

      setCommitCompany: (month, value) => {
        set((s) => ({ commitCompany: { ...s.commitCompany, [month]: value } }))
        upsertCommitCompany(month, value).catch(console.warn)
      },

      setLostReview: (oppName, review) => {
        set((s) => ({ lostReviews: { ...s.lostReviews, [oppName]: review } }))
        upsertLostReview(oppName, review).catch(console.warn)
      },

      setSvcRequiredFlag: (oppName, value) => {
        set((s) => ({ svcRequired: { ...s.svcRequired, [oppName]: value } }))
        upsertSvcRequired(oppName, value).catch(console.warn)
      },

      updateOITarget: (month, adKey, value) => {
        set((s) => {
          const oiTargets = { ...s.oiTargets, [month]: { ...(s.oiTargets[month] ?? {}), [adKey]: value } }
          return { oiTargets, monthlyBudget: deriveMonthlyBudget(oiTargets) }
        })
        upsertBudgetTarget("oi", month, adKey, value).catch(console.warn)
      },

      updateARRTarget: (month, adKey, value) => {
        set((s) => ({ arrTargets: { ...s.arrTargets, [month]: { ...(s.arrTargets[month] ?? {}), [adKey]: value } } }))
        upsertBudgetTarget("arr", month, adKey, value).catch(console.warn)
      },

      importOITargets: (targets) => set({ oiTargets: targets, monthlyBudget: deriveMonthlyBudget(targets) }),
      importARRTargets: (targets) => set({ arrTargets: targets }),

      setAccountMatch: (data) => { set({ accountMatch: data }); pushAccountMatch(data).catch(console.warn) },
      addAccountMatch: (entry) => { set((s) => ({ accountMatch: [...s.accountMatch, entry] })); pushAccountMatch([entry]).catch(console.warn) },
      setARRBaseData: (data) => { set({ arrBaseData: data }); pushARRBase(data).catch(console.warn) },

      setNotes: (notes) => set({ notes }),
      setFreeNotes: (freeNotes) => set({ freeNotes }),
      setOiTargets: (targets) => set({ oiTargets: targets, monthlyBudget: deriveMonthlyBudget(targets) }),
      setArrTargets: (targets) => set({ arrTargets: targets }),
      setArrBaseData: (data) => set({ arrBaseData: data }),
      setSvcRequired: (flags) => set({ svcRequired: flags }),

      addTeamMember: (name) => {
        if (USERS.includes(name)) return
        USERS.push(name)
        const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase()
        let key = initials
        let i = 1
        while (BUDGET_AD_KEYS.includes(key)) { key = initials + i++ }
        BUDGET_AD_KEYS.push(key)
        BUDGET_AD_MAP[key] = name
        set((s) => {
          const oiTargets = { ...s.oiTargets }
          const arrTargets = { ...s.arrTargets }
          MONTHS.forEach((m) => {
            oiTargets[m] = { ...(oiTargets[m] ?? {}), [key]: 0 }
            arrTargets[m] = { ...(arrTargets[m] ?? {}), [key]: 0 }
          })
          return { oiTargets, arrTargets, monthlyBudget: deriveMonthlyBudget(oiTargets) }
        })
      },
    }),
    {
      name: "fy26-dashboard",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { monthlyBudget: _, ...rest } = state
        return rest
      },
      migrate: (persistedState: unknown, version: number) => {
        const state = (persistedState ?? {}) as Record<string, unknown>
        if (version < 2) { if (!state.manualArrDeals) state.manualArrDeals = [] }
        if (version < 3) { if (!state.nonSFDeals) state.nonSFDeals = [] }
        return state as unknown as DashboardState
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.monthlyBudget = deriveMonthlyBudget(state.oiTargets)
          if (state.data.length > 0) { state.data = state.data.map((r) => enrichRow({ ...r })) }
          if (!state.manualArrDeals) state.manualArrDeals = []
          if (!state.arrDeals) state.arrDeals = []
          if (!state.arrDupLog) state.arrDupLog = []
          if (!state.arrExemptLog) state.arrExemptLog = []
          if (!state.nonSFDeals) state.nonSFDeals = []
          if (state.nonSFDeals.length > 0) {
            const sfOnly = state.data.filter((d) => !d._isManual)
            const enrichedNSF = state.nonSFDeals.map((d) => enrichRow({ ...d, _isManual: true }))
            state.data = [...sfOnly, ...enrichedNSF]
            state.nonSFDeals = enrichedNSF
          }
        }
      },
    }
  )
)

export function monthMatchesFilter(month: string, filterMonth: string | string[]): boolean {
  if (filterMonth === "All") return true
  if (Array.isArray(filterMonth)) return filterMonth.includes(month)
  return filterMonth === month
}

export function getSelectedMonths(filterMonth: string | string[]): string[] {
  if (filterMonth === "All") return MONTHS
  if (Array.isArray(filterMonth)) return filterMonth
  return [filterMonth]
}

export function userMatchesFilter(user: string | undefined, filterUser: string | string[]): boolean {
  if (filterUser === "All") return true
  if (Array.isArray(filterUser)) return filterUser.includes(user ?? "")
  return user === filterUser
}

export function getSelectedUsers(filterUser: string | string[]): string[] {
  if (filterUser === "All") return USERS
  if (Array.isArray(filterUser)) return filterUser
  return [filterUser]
}

export function isUserFiltered(filterUser: string | string[]): boolean {
  if (filterUser === "All") return false
  if (Array.isArray(filterUser)) return filterUser.length > 0 && filterUser.length < USERS.length
  return true
}
