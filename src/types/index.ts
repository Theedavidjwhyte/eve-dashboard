// ── Core Deal type ──────────────────────────────────────────────────────────
export interface Deal {
  // Raw Salesforce columns
  User?: string
  "Opportunity Name"?: string
  "Account Name"?: string
  Stage?: string
  "ABC Split Value"?: string | number
  "Total ABC"?: string | number
  "Close Date"?: string
  "Close Date (2)"?: string
  "Commit Status"?: string
  "Push Count"?: string | number
  "Stage Duration"?: string | number
  Age?: string | number
  "Next Step"?: string
  Initials?: string | number
  "Total Initials"?: string | number
  "Services Amount"?: string | number
  "Created By"?: string
  "Created Date"?: string
  "Opportunity Owner"?: string
  [key: string]: unknown

  // Computed fields (added by enrichRow)
  _stageSummary?: "Won" | "Lost" | "Pipe"
  _month?: string
  _createdDate?: Date | null   // parsed Created Date
  _createdMonth?: string       // e.g. "Jul", "Aug" — which FY26 month it was created in
  _val?: number
  _abc?: number
  _initials?: number
  _services?: number
  _push?: number
  _stageDur?: number
  _risk?: string
  _keyDeal?: string
  _commit?: string
  _createdBy?: string
  _product?: string
  _quarter?: string
  _half?: string
  _elvId?: string
  _isManual?: boolean
  _manualId?: string
  _dealType?: "OI and ARR" | "OI Only" | "ARR Only"
}

// ── Filters ─────────────────────────────────────────────────────────────────
export interface Filters {
  month: string | string[]
  user: string | string[]   // "All" | single name | array of names
  quarter: string
  product: string
  group: string
  keyDeals: boolean
}

// ── Notes ───────────────────────────────────────────────────────────────────
export type WeekKey = "W1" | "W2" | "W3" | "W4" | "W5"
export type UserNotes = Record<WeekKey, string>
export type MonthNotes = Record<string, UserNotes> // user → week → value
export type AllNotes = Record<string, MonthNotes>  // month → user → week → value

export interface TimestampedNote {
  text: string
  date: string
  dayLabel: string
}

// ── Lost Deal Reviews ────────────────────────────────────────────────────────
export interface LostReview {
  reason: string
  detail: string
  decision: string
  competitor: string
  nextSteps: string
  reviewDate: string
}

// ── Account Match Reference ──────────────────────────────────────────────────
export interface AccountMatch {
  c: string   // account code
  o: string   // owner (AD full name)
  a: string   // account name
  p: string   // parent account
  e: string   // ELV ID
  ea: string  // ELV AD
}

// ── ARR Base Data ────────────────────────────────────────────────────────────
export interface ARRBaseRow {
  ad: string
  p: string     // parent
  e: string     // ELV ID
  pa: string    // parent ACC
  a: string     // account name
  base: number
  uplift: number
}

// ── Budget maps ──────────────────────────────────────────────────────────────
export type AdKey = "CS" | "DT" | "DW" | "JR" | "SB" | "NM" | string
export type MonthBudgetMap = Record<string, number>          // adKey → value
export type BudgetTargets = Record<string, MonthBudgetMap>  // month → adKey → value

// ── Tab names ────────────────────────────────────────────────────────────────
export type TabId =
  | "insights"
  | "deals"
  | "dealbreakdown"
  | "monthly"
  | "quarterly"
  | "ytd"
  | "closed"
  | "services"
  | "budget"
  | "accounts"
  | "reports"
  | "network"
  | "pipeline-creation"
  | "forecast-post"
  | "arr"

// ── ARR Import ───────────────────────────────────────────────────────────────
export type { ARRDeal, ARRImportResult, ARRDupLog } from "@/lib/arrImport"

// ── Closed sub-view ──────────────────────────────────────────────────────────
export type ClosedView = "won" | "lost"

// ── Deal Breakdown sub-view ──────────────────────────────────────────────────
export type BreakdownView = "monthly" | "quarterly" | "ytd"

// ── Manual Deal form ─────────────────────────────────────────────────────────
export interface ManualDealForm {
  user: string
  oppName: string
  accountName: string
  val: string
  abc: string
  closeDate: string
  stage: string
  commit: string
  services: string
  initials: string
  nextStep: string
}
