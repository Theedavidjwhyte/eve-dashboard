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
    opportunityName: (deal["Opportunity Name"] ?? "").replace("Manual Entry — ", ""),
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
  pushARRDeals,
  pushManualARRDeal as pushManualARRDealSync,
  deleteManualARRDeal as deleteManualARRDealSync,
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
  manualArrDeals: ARRDeal[]

  // Derived (not persisted)
  monthlyBudget: Record<string, number>

  // Dropped deals — detected on import when existing deals disappear
  droppedDeals: Deal[]
  confirmedDrops: string[]  // opportunity names confirmed deleted
  reinstateDropped: (oppName: string) => void
  confirmDrop: (oppName: string) => void
  confirmAllDrops: () => void
  reinstateAllDropped: () => void
  clearDroppedDeals: () => void

  // ── Actions ────────────────────────────────────────────────────────────────
  importData: (rawCsv: string, rows: Deal[]) => void
  importARRData: (deals: ARRDeal[], dupLog: ARRDupLog[], exemptLog: ARRDeal[]) => void
  clearARRData: () => void
  addManualARRDeal: (deal: ARRDeal) => void
  removeManualARRDeal: (oppId: string) => void
  clearData: () => void
  addManualDeal: (deal: Deal) => void
  updateManualDeal: (deal: Deal) => void
  removeManualDeal: (manualId: string) => void

  // Non-SF Deals
  nonSFDeals: Deal[]
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

      // ARR
      arrDeals: [],
      arrDupLog: [],
      arrExemptLog: [],
      arrImportDate: null,
      manualArrDeals: [],

      // Dropped deals
      droppedDeals: [],
      confirmedDrops: [],

      monthlyBudget: deriveMonthlyBudget(DEFAULT_OI_TARGETS),

      // ── Data actions ───────────────────────────────────────────────────────
      importARRData: (deals, dupLog, exemptLog) => {
        const { manualArrDeals } = get()
        const importDate = new Date().toISOString()
        set({
          arrDeals: [...deals, ...manualArrDeals],
          arrDupLog: dupLog,
          arrExemptLog: exemptLog,
          arrImportDate: importDate,
        })
        // Push ARR data to Supabase in background for cross-device sync
        pushARRDeals(deals, dupLog, exemptLog, importDate).catch(console.warn)
      },

      clearARRData: () => set({ arrDeals: [], arrDupLog: [], arrExemptLog: [], arrImportDate: null, manualArrDeals: [] }),

      addManualARRDeal: (deal) => {
        set((s) => ({
          manualArrDeals: [...s.manualArrDeals, deal],
          arrDeals: [...s.arrDeals, deal],
        }))
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
        const { manualDeals, arrExemptLog, arrDeals } = get()
        // Build lookup sets from ARR data for flag propagation
        const exemptOppIds = new Set(arrExemptLog.map((d) => d.opportunityId))
        const notElevateOppIds = new Set(arrExemptLog.filter((d) => d.isNotElevate).map((d) => d.opportunityId))
        const splitOppIds = new Set(arrDeals.filter((d) => d.isSplit).map((d) => d.opportunityId.replace("__DT", "")))
        const enriched = rows.map((r) => {
          const e = enrichRow({ ...r })
          const oppId = String(r["Opportunity ID"] ?? "")
          if (exemptOppIds.has(oppId)) e._isExempt = true
          if (notElevateOppIds.has(oppId)) e._isNotElevate = true
          if (splitOppIds.has(oppId)) e._isSplit = true
          return e
        })
        // Apply any saved product locks so matches survive re-import
        const locks: Record<string, string> = (() => {
          try { return JSON.parse(localStorage.getItem("eve_product_locks") ?? "{}") } catch { return {} }
        })()
        const withLocks = enriched.map((r) => {
          const opp = String(r["Opportunity Name"] ?? "")
          const locked = locks[opp]
          if (locked && (!r._product || r._product === "No Match")) return { ...r, _product: locked }
          return r
        })
        const { nonSFDeals: currentNonSFDeals } = get()
        const withManual = [
          ...withLocks.filter((r) => !r._isManual),
          ...manualDeals.map((d) => enrichRow({ ...d })),
          ...currentNonSFDeals.map((d) => enrichRow({ ...d, _isManual: true })),
        ]

        // ── Detect dropped deals ───────────────────────────────────────────
        const { data: prevData, confirmedDrops } = get()
        const newOppNames = new Set(withLocks.map((r) => String(r["Opportunity Name"] ?? "")))
        const dropped = prevData.filter((d) => {
          if (d._isManual) return false // manual deals can't be "dropped" by SF import
          const oppName = String(d["Opportunity Name"] ?? "")
          if (confirmedDrops.includes(oppName)) return false // already confirmed
          if (d._stageSummary === "Won" || d._stageSummary === "Lost") return false // closed deals are fine
          return !newOppNames.has(oppName)
        })

        set({
          data: withManual,
          rawCsv,
          importDate: new Date().toISOString(),
          droppedDeals: dropped.length > 0 ? dropped : [],
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
        const isARR = enriched._dealType === "OI and ARR" || enriched._dealType === "ARR Only"
        set((s) => {
          const arrEntry = isARR ? manualDealToARRDeal(enriched) : null
          const newManual = [...s.manualDeals, enriched]
          return {
            manualDeals: newManual,
            data: [
              ...s.data.filter((d) => !d._isManual),
              ...newManual.map((d) => enrichRow({ ...d })),
              ...s.nonSFDeals.map((d) => enrichRow({ ...d, _isManual: true })),
            ],
            // Bridge into arrDeals so ARR tabs pick up _abc immediately
            arrDeals: arrEntry
              ? [...s.arrDeals.filter((a) => a.opportunityId !== enriched._manualId), arrEntry]
              : s.arrDeals,
          }
        })
        pushManualDeal(enriched).catch(console.warn)
      },

      updateManualDeal: (deal) => {
        const enriched = enrichRow({ ...deal, _isManual: true })
        const isARR = enriched._dealType === "OI and ARR" || enriched._dealType === "ARR Only"
        set((s) => {
          const manualDeals = s.manualDeals.map((d) =>
            d._manualId === deal._manualId ? enriched : d
          )
          const arrEntry = isARR ? manualDealToARRDeal(enriched) : null
          return {
            manualDeals,
            data: [
              ...s.data.filter((d) => !d._isManual),
              ...manualDeals.map((d) => enrichRow({ ...d })),
              ...s.nonSFDeals.map((d) => enrichRow({ ...d, _isManual: true })),
            ],
            // Update arrDeals — remove old entry (if any) and add updated one
            arrDeals: arrEntry
              ? [...s.arrDeals.filter((a) => a.opportunityId !== enriched._manualId), arrEntry]
              : s.arrDeals.filter((a) => a.opportunityId !== enriched._manualId),
          }
        })
        // Upsert to Supabase — pushManualDeal already does an upsert on manual_id
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
              ...s.nonSFDeals.map((d) => enrichRow({ ...d, _isManual: true })),
            ],
            // Remove from arrDeals bridge too
            arrDeals: s.arrDeals.filter((a) => a.opportunityId !== manualId),
          }
        })
        supaDeleteManualDeal(manualId).catch(console.warn)
      },

      // ── Non-SF Deals ──────────────────────────────────────────────────────
      addNonSFDeal: (deal) => {
        const enriched = enrichRow({ ...deal, _isManual: true })
        const isARR = enriched._dealType === "OI and ARR" || enriched._dealType === "ARR Only"
        set((s) => {
          const arrEntry = isARR ? manualDealToARRDeal(enriched) : null
          const newNonSF = [...s.nonSFDeals, enriched]
          return {
            nonSFDeals: newNonSF,
            data: [
              ...s.data.filter((d) => !d._isManual),
              ...s.manualDeals.map((d) => enrichRow({ ...d })),
              ...newNonSF.map((d) => enrichRow({ ...d, _isManual: true })),
            ],
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
            data: [
              ...s.data.filter((d) => !d._isManual),
              ...s.manualDeals.map((d) => enrichRow({ ...d })),
              ...nonSFDeals.map((d) => enrichRow({ ...d, _isManual: true })),
            ],
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
            data: [
              ...s.data.filter((d) => !d._isManual),
              ...s.manualDeals.map((d) => enrichRow({ ...d })),
              ...nonSFDeals.map((d) => enrichRow({ ...d, _isManual: true })),
            ],
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
      // ── Dropped deals actions ─────────────────────────────────────────────
      reinstateDropped: (oppName) => {
        const { droppedDeals, manualDeals } = get()
        const deal = droppedDeals.find((d) => String(d["Opportunity Name"] ?? "") === oppName)
        if (!deal) return
        const reinstated = enrichRow({ ...deal, _isManual: true, _manualId: `reinstated-${Date.now()}` })
        set((s) => ({
          droppedDeals: s.droppedDeals.filter((d) => String(d["Opportunity Name"] ?? "") !== oppName),
          manualDeals: [...s.manualDeals, reinstated],
          data: [...s.data, reinstated],
        }))
        pushManualDeal(reinstated).catch(console.warn)
      },

      confirmDrop: (oppName) => {
        set((s) => ({
          droppedDeals: s.droppedDeals.filter((d) => String(d["Opportunity Name"] ?? "") !== oppName),
          confirmedDrops: [...s.confirmedDrops, oppName],
        }))
      },

      confirmAllDrops: () => {
        set((s) => ({
          confirmedDrops: [...s.confirmedDrops, ...s.droppedDeals.map((d) => String(d["Opportunity Name"] ?? ""))],
          droppedDeals: [],
        }))
      },

      reinstateAllDropped: () => {
        const { droppedDeals } = get()
        const reinstated = droppedDeals.map((d) =>
          enrichRow({ ...d, _isManual: true, _manualId: `reinstated-${Date.now()}-${Math.random()}` })
        )
        set((s) => ({
          droppedDeals: [],
          manualDeals: [...s.manualDeals, ...reinstated],
          data: [...s.data, ...reinstated],
        }))
        reinstated.forEach((d) => pushManualDeal(d).catch(console.warn))
      },

      clearDroppedDeals: () => set({ droppedDeals: [] }),

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
      version: 5, // v5: exclude large arrays from localStorage to prevent quota errors
      storage: createJSONStorage(() => localStorage),
      // Don't persist derived monthlyBudget — always recalculate from oiTargets
      partialize: (state) => {
        // Exclude large transient arrays from localStorage to prevent quota errors
        // These are re-populated on every import or fetched from Supabase on sync
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {
          monthlyBudget: _mb,
          data: _data,
          rawCsv: _rawCsv,
          arrDeals: _arrDeals,
          arrDupLog: _arrDupLog,
          arrExemptLog: _arrExemptLog,
          droppedDeals: _droppedDeals,
          manualDeals: _manualDeals,
          nonSFDeals: _nonSFDeals,
          lastImportSummary: _lis,
          ...rest
        } = state as unknown as DashboardState & { lastImportSummary: unknown }
        return rest
      },
      migrate: (persistedState: unknown, version: number) => {
        // Carry forward all existing data on version bump — never wipe
        const state = (persistedState ?? {}) as Record<string, unknown>
        if (version < 2) {
          // v1 → v2: manualArrDeals added
          if (!state.manualArrDeals) state.manualArrDeals = []
        }
        if (version < 3) {
          // v2 → v3: no breaking changes — just carry forward
        }
        if (version < 4) {
          // v3 → v4: add droppedDeals + confirmedDrops
          if (!state.droppedDeals) state.droppedDeals = []
          if (!state.confirmedDrops) state.confirmedDrops = []
          if (!state.nonSFDeals) state.nonSFDeals = []
        }
        if (version < 5) {
          // v4 → v5: large arrays removed from localStorage
          // Clear them so they don't bloat storage — loaded from Supabase on sync
          state.data = []
          state.rawCsv = ""
          state.arrDeals = []
          state.manualDeals = []
          state.nonSFDeals = []
          state.droppedDeals = []
        }
        return state as unknown as DashboardState
      },
      onRehydrateStorage: () => (state) => {
        // Rehydrate derived fields after loading from localStorage
        if (state) {
          state.monthlyBudget = deriveMonthlyBudget(state.oiTargets)
          // Re-enrich data in case enrichRow logic changed
          if (state.data.length > 0) {
            state.data = state.data.map((r) => enrichRow({ ...r }))
          }
          // Ensure new fields have defaults if missing (safe migration)
          if (!state.manualArrDeals) state.manualArrDeals = []
          if (!state.arrDeals) state.arrDeals = []
          if (!state.arrDupLog) state.arrDupLog = []
          if (!state.arrExemptLog) state.arrExemptLog = []
          if (!state.nonSFDeals) state.nonSFDeals = []
          if (!state.droppedDeals) state.droppedDeals = []
          if (!state.confirmedDrops) state.confirmedDrops = []
          // Re-merge nonSFDeals into data on every rehydration
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
