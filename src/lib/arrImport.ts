/**
 * ARR Import Pipeline
 *
 * Processes Salesforce reports — supports both:
 *   A. The original 13-column "Closed Won ARR" report  (parseARRReport)
 *   B. The new combined 26-column report that contains ALL stages
 *      including Closed Won — auto-splits into OI rows + ARR rows (parseCombinedReport)
 *
 * Business rules (confirmed):
 *  1. Opp IDs 006Tl00000FRWhV + 006Tl00000GmNCP → ARR exempt (GDK one-off)
 *  2. Wingstop + Heineken accounts → hard-coded 50/50 Chevonne/Dan split
 *  3. Not Elevate accounts → exempt from ARR, visible in exemption log
 *     BUT count as OI if one of the 5 ADs is the User
 */

import { USERS } from "@/config/users"
import { enrichRow } from "@/lib/enrichRow"
import type { Deal } from "@/types"

// ── Types ────────────────────────────────────────────────────────────────────

export interface ARRDeal {
  closeDate: string          // YYYY-MM-DD
  currency: string
  totalAbc: number           // Full Total ABC — the ARR value
  stage: string
  accountOwner: string
  parentAccountOwner: string
  accountTeam: string[]      // parsed from pipe-separated field
  opportunityId: string
  accountName: string
  user: string               // SF User field
  ultimateParent: string     // HTML-stripped
  opportunityName: string

  // Resolved fields
  assignedAD: string         // which of the 5 ADs owns this
  isExempt: boolean          // true → excluded from ARR targets
  exemptReason: string       // "ARR exempt (one-off)" | "Not Elevate" | ""
  isNotElevate: boolean
  isSplit: boolean           // true → this is one half of a 50/50 split row
  product: string
}

export interface ARRImportResult {
  deals: ARRDeal[]           // deduped + split rows ready for calculations
  duplicateLog: ARRDupLog[]  // raw dupe rows removed
  exemptLog: ARRDeal[]       // exempt + not-elevate rows
  parseErrors: string[]
}

export interface ARRDupLog {
  opportunityId: string
  opportunityName: string
  accountName: string
  totalAbc: number
  rowCount: number           // how many raw rows had this opp ID
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Opp IDs excluded from ARR targets entirely */
const ARR_EXEMPT_OPP_IDS = new Set([
  "006Tl00000FRWhV",  // GDK Kiosk — one-off, ARR exempt
  "006Tl00000GmNCP",  // GDK QikServe Connect — one-off, ARR exempt
])

/** Ultimate Parent patterns that always get 50/50 Chevonne + Dan */
const SPLIT_50_50_PARENTS = [
  "WINGSTOP - PARENT ACCOUNT - ELEVATE",
  "HEINEKEN - PARENT ACCOUNT - ELEVATE",
]

/** The two ADs who always share the 50/50 split accounts */
const SPLIT_AD_A = "Chevonne Souness"
const SPLIT_AD_B = "Dan Turner"

/**
 * Accounts where the team may appear as User but the account
 * is not in the Elevate ARR portfolio.
 * These are excluded from ARR targets but visible in the exemption log.
 * They still count as OI if an AD is the User.
 */
const NOT_ELEVATE_ACCOUNTS = new Set([
  "J D Wetherspoon PLC",
  "Nando's Chickenland Ltd (UK)",
  "The Peach Pub Company Limited",
  "BLACK CROFT COFFEE (OBAN) LTD",
  "Anchos Restaurants Ltd T/A Cuan Mor",
  "RHC MANCHESTER LIMITED",
  "Restaurant Brands International",
  "Eastlands VenueServicesLtd",
])

// ── HTML stripper ────────────────────────────────────────────────────────────

function stripHtml(raw: string): string {
  if (!raw) return ""
  // Extract text from <a href="...">TEXT</a> pattern
  const match = raw.match(/>([^<]+)<\/a>/)
  if (match) return match[1].trim()
  // Strip any remaining tags
  return raw.replace(/<[^>]+>/g, "").trim()
}

// ── Product classifier (reuse EVE's keyword logic) ───────────────────────────

const PRODUCT_KEYWORDS: [string, string][] = [
  ["access people", "Access People"],
  ["guest pay", "EPOS"],
  ["menu manager", "EPOS"],
  ["call ai", "Collins"],
  ["collins", "Collins"],
  ["guest360", "Guest360"],
  ["wireless social", "Wireless Social"],
  ["order genie", "OrderGenie"],
  ["orderbee", "Orderbee"],
  ["procure wizard", "Procure Wizard"],
  ["rotaready", "Rotaready"],
  ["new site", "New Sites"],
  ["additional site", "New Sites"],
  ["qikserve", "QikServe"],
  ["kiosk", "QikServe"],
  ["acteol", "Acteol"],
  ["cpl", "CPL"],
  ["early", "EarlyPay"],
  ["epos", "EPOS"],
  ["evo", "EVO"],
  ["financial", "Financials"],
  ["flex", "Flexpoints"],
  ["guestline", "Guestline"],
  ["integration", "Integration"],
  ["lightyear", "Lightyear"],
  ["lms", "LMS"],
  ["maintain", "Maintain"],
  ["paycircle", "Paycircle"],
  ["pronett", "Maintain"],
  ["diary", "ResDiary"],
  ["shr", "SHR"],
  ["trail", "Trail"],
  ["wireless", "Wireless Social"],
  ["renewal", "Renewal"],
  ["uplift", "Uplift"],
  ["api", "API"],
  ["ade", "ADE"],
  ["ordergenie", "OrderGenie"],
]

function classifyProduct(oppName: string): string {
  const lower = (oppName ?? "").toLowerCase()
  for (const [kw, prod] of PRODUCT_KEYWORDS) {
    if (lower.includes(kw)) return prod
  }
  return "Other"
}

// ── Date parser ───────────────────────────────────────────────────────────────

function parseDate(raw: string): string {
  if (!raw) return ""
  // DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`
  // YYYY-MM-DD already
  if (raw.match(/^\d{4}-\d{2}-\d{2}$/)) return raw
  return ""
}

// ── Account Team parser ───────────────────────────────────────────────────────

function parseAccountTeam(raw: string): string[] {
  if (!raw) return []
  return raw.split("|").map((s) => s.trim()).filter(Boolean)
}

// ── Assign AD from Account Team ───────────────────────────────────────────────

function assignADFromTeam(accountTeam: string[]): string {
  for (const member of accountTeam) {
    if (USERS.includes(member)) return member
  }
  return ""
}

// ── Is Not Elevate ────────────────────────────────────────────────────────────

function checkNotElevate(accountName: string, ultimateParent: string): boolean {
  if (NOT_ELEVATE_ACCOUNTS.has(accountName)) return true
  if (NOT_ELEVATE_ACCOUNTS.has(ultimateParent)) return true
  // Partial match for common patterns
  const lower = accountName.toLowerCase()
  if (lower.includes("wetherspoon")) return true
  if (lower.includes("nando")) return true
  if (lower.includes("peach pub")) return true
  return false
}

// ── Main import function ──────────────────────────────────────────────────────

export function parseARRReport(rawText: string): ARRImportResult {
  const parseErrors: string[] = []

  // ── 1. Parse raw text ──
  const firstLine = rawText.split("\n")[0]
  const tabCount = (firstLine.match(/\t/g) ?? []).length
  const commaCount = (firstLine.match(/,/g) ?? []).length
  const delimiter = tabCount >= commaCount ? "\t" : ","

  const lines = rawText.trim().split("\n")
  if (lines.length < 2) {
    return { deals: [], duplicateLog: [], exemptLog: [], parseErrors: ["No data rows found"] }
  }

  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ""))

  // ── 2. Map header indices ──
  const idx = (names: string[]): number => {
    for (const name of names) {
      const i = headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()))
      if (i >= 0) return i
    }
    return -1
  }

  const cols = {
    closeDate:            idx(["Close Date"]),
    currency:             idx(["Total ABC Currency", "Currency"]),
    totalAbc:             idx(["Total ABC"]),
    stage:                idx(["Stage"]),
    accountOwner:         idx(["Account Owner"]),
    parentAccountOwner:   idx(["Parent Account Owner"]),
    accountTeam:          idx(["Account Team"]),
    opportunityId:        idx(["Opportunity ID"]),
    accountName:          idx(["Account Name"]),
    user:                 idx(["User"]),
    ultimateParent:       idx(["Ultimate Parent"]),
    opportunityName:      idx(["Opportunity Name"]),
  }

  if (cols.closeDate < 0 || cols.totalAbc < 0 || cols.opportunityId < 0) {
    parseErrors.push("Missing required columns: Close Date, Total ABC, Opportunity ID")
    return { deals: [], duplicateLog: [], exemptLog: [], parseErrors }
  }

  // ── 3. Parse all raw rows ──
  interface RawRow {
    closeDate: string
    currency: string
    totalAbc: number
    stage: string
    accountOwner: string
    parentAccountOwner: string
    accountTeam: string[]
    opportunityId: string
    accountName: string
    user: string
    ultimateParent: string
    opportunityName: string
  }

  const rawRows: RawRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // Split respecting quoted fields
    const cells: string[] = []
    let inQuote = false
    let cell = ""
    for (let c = 0; c < line.length; c++) {
      const ch = line[c]
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === delimiter && !inQuote) { cells.push(cell); cell = ""; continue }
      cell += ch
    }
    cells.push(cell)

    const get = (col: number) => (col >= 0 ? (cells[col] ?? "").trim() : "")

    const totalAbcRaw = get(cols.totalAbc).replace(/[£,\s]/g, "")
    const totalAbc = parseFloat(totalAbcRaw) || 0
    const opportunityId = get(cols.opportunityId)
    if (!opportunityId) continue

    rawRows.push({
      closeDate:           parseDate(get(cols.closeDate)),
      currency:            get(cols.currency),
      totalAbc,
      stage:               get(cols.stage),
      accountOwner:        get(cols.accountOwner),
      parentAccountOwner:  get(cols.parentAccountOwner),
      accountTeam:         parseAccountTeam(get(cols.accountTeam)),
      opportunityId,
      accountName:         get(cols.accountName),
      user:                get(cols.user),
      ultimateParent:      stripHtml(get(cols.ultimateParent)),
      opportunityName:     get(cols.opportunityName),
    })
  }

  // ── 4. Deduplicate by Opp ID ──
  const seen = new Map<string, RawRow[]>()
  for (const row of rawRows) {
    if (!seen.has(row.opportunityId)) seen.set(row.opportunityId, [])
    seen.get(row.opportunityId)!.push(row)
  }

  const duplicateLog: ARRDupLog[] = []
  const uniqueRows: RawRow[] = []

  for (const [oppId, rows] of seen.entries()) {
    if (rows.length > 1) {
      duplicateLog.push({
        opportunityId: oppId,
        opportunityName: rows[0].opportunityName,
        accountName: rows[0].accountName,
        totalAbc: rows[0].totalAbc,
        rowCount: rows.length,
      })
    }
    // Keep first row (they should all have same values — duplication is just
    // because multiple team members appear on the opp)
    uniqueRows.push(rows[0])
  }

  // ── 5. Apply business rules and build final deal rows ──
  const deals: ARRDeal[] = []
  const exemptLog: ARRDeal[] = []

  for (const row of uniqueRows) {
    const product = classifyProduct(row.opportunityName)
    const isNotElevate = checkNotElevate(row.accountName, row.ultimateParent)

    // ── Rule 1: Exempt opp IDs ──
    if (ARR_EXEMPT_OPP_IDS.has(row.opportunityId)) {
      exemptLog.push({
        ...row,
        assignedAD: row.accountOwner,
        isExempt: true,
        exemptReason: "ARR exempt — one-off deal",
        isNotElevate: false,
        isSplit: false,
        product,
      })
      continue
    }

    // ── Rule 3: Not Elevate ──
    if (isNotElevate) {
      exemptLog.push({
        ...row,
        assignedAD: "Not Elevate",
        isExempt: true,
        exemptReason: "Not Elevate — outside ARR scope",
        isNotElevate: true,
        isSplit: false,
        product,
      })
      continue
    }

    // ── Rule 2: 50/50 split accounts (Wingstop, Heineken) ──
    const isSplitAccount = SPLIT_50_50_PARENTS.some((p) =>
      row.ultimateParent.toUpperCase().includes(p.toUpperCase()) ||
      row.accountName.toUpperCase().includes("WINGSTOP") ||
      row.accountName.toUpperCase().includes("HEINEKEN")
    )

    if (isSplitAccount) {
      const halfValue = row.totalAbc / 2
      // Chevonne's half
      deals.push({
        ...row, totalAbc: halfValue,
        assignedAD: SPLIT_AD_A,
        isExempt: false, exemptReason: "",
        isNotElevate: false, isSplit: true, product,
      })
      // Dan's half
      deals.push({
        ...row, totalAbc: halfValue,
        assignedAD: SPLIT_AD_B,
        isExempt: false, exemptReason: "",
        isNotElevate: false, isSplit: true, product,
        opportunityId: row.opportunityId + "__DT", // make unique so both rows are tracked
      })
      continue
    }

    // ── Standard: assign from Account Team ──
    const assignedAD = assignADFromTeam(row.accountTeam) ||
      (USERS.includes(row.accountOwner) ? row.accountOwner : "") ||
      (USERS.includes(row.user) ? row.user : "Unknown")

    deals.push({
      ...row,
      assignedAD,
      isExempt: false,
      exemptReason: "",
      isNotElevate: false,
      isSplit: false,
      product,
    })
  }

  return { deals, duplicateLog, exemptLog, parseErrors }
}

// ── Summary helpers ───────────────────────────────────────────────────────────

export interface ARRSummary {
  totalDeals: number
  totalValue: number
  byAD: Record<string, { deals: number; value: number }>
  duplicateCount: number
  duplicateValue: number
  exemptCount: number
  exemptValue: number
  notElevateCount: number
  notElevateValue: number
}

export function summariseARR(result: ARRImportResult): ARRSummary {
  const byAD: Record<string, { deals: number; value: number }> = {}

  for (const deal of result.deals) {
    if (!byAD[deal.assignedAD]) byAD[deal.assignedAD] = { deals: 0, value: 0 }
    byAD[deal.assignedAD].deals++
    byAD[deal.assignedAD].value += deal.totalAbc
  }

  const notElevateDeals = result.exemptLog.filter((d) => d.isNotElevate)
  const trueExempt = result.exemptLog.filter((d) => !d.isNotElevate)

  return {
    totalDeals: result.deals.length,
    totalValue: result.deals.reduce((s, d) => s + d.totalAbc, 0),
    byAD,
    duplicateCount: result.duplicateLog.reduce((s, d) => s + d.rowCount - 1, 0),
    duplicateValue: result.duplicateLog.reduce((s, d) => s + d.totalAbc * (d.rowCount - 1), 0),
    exemptCount: trueExempt.length,
    exemptValue: trueExempt.reduce((s, d) => s + d.totalAbc, 0),
    notElevateCount: notElevateDeals.length,
    notElevateValue: notElevateDeals.reduce((s, d) => s + d.totalAbc, 0),
  }
}

// ── Combined report parser ────────────────────────────────────────────────────
/**
 * parseCombinedReport
 *
 * Accepts the new 26-column Salesforce report that contains ALL pipeline stages
 * plus Closed Won in a single export. Automatically:
 *   - Routes "Closed Won" rows through the ARR processing pipeline
 *   - Routes all other stages through enrichRow as OI deals
 *   - Returns both datasets ready for store import
 *
 * Expected columns (26):
 *   Close Date, Total ABC Currency, Total ABC, Stage, Account Owner,
 *   Parent Account Owner Name, Account Team, Opportunity ID, Account Name,
 *   User, Push Count, Age, Next Step, ABC Split Value Currency, ABC Split Value,
 *   Total Initials Currency, Total Initials, Services Amount Currency,
 *   Services Amount, Stage Duration, Opportunity Owner, Created By,
 *   Created Date, Close Date (2), Ultimate Parent Account Name, Opportunity Name
 */
export interface CombinedReportResult {
  oiDeals: Deal[]
  arrResult: ARRImportResult
  parseErrors: string[]
  oiCount: number
  arrCount: number
}

export function parseCombinedReport(rawText: string): CombinedReportResult {
  const parseErrors: string[] = []

  if (!rawText.trim()) {
    return { oiDeals: [], arrResult: { deals: [], duplicateLog: [], exemptLog: [], parseErrors: [] }, parseErrors: ["No data provided"], oiCount: 0, arrCount: 0 }
  }

  // ── Detect delimiter ──
  const firstLine = rawText.split("\n")[0]
  const tabCount = (firstLine.match(/\t/g) ?? []).length
  const commaCount = (firstLine.match(/,/g) ?? []).length
  const delimiter = tabCount >= commaCount ? "\t" : ","

  const lines = rawText.trim().split("\n")
  if (lines.length < 2) {
    return { oiDeals: [], arrResult: { deals: [], duplicateLog: [], exemptLog: [], parseErrors: [] }, parseErrors: ["No data rows found — include the header row"], oiCount: 0, arrCount: 0 }
  }

  // ── Parse headers ──
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ""))

  const idx = (names: string[]): number => {
    for (const name of names) {
      const i = headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()))
      if (i >= 0) return i
    }
    return -1
  }

  const stageCol = idx(["Stage"])
  const userCol  = idx(["User"])
  const oppIdCol = idx(["Opportunity ID"])

  if (stageCol < 0 || oppIdCol < 0) {
    parseErrors.push("Missing required columns: Stage and Opportunity ID must be present")
    return { oiDeals: [], arrResult: { deals: [], duplicateLog: [], exemptLog: [], parseErrors }, parseErrors, oiCount: 0, arrCount: 0 }
  }

  // ── Cell splitter (handles quoted fields) ──
  function splitLine(line: string): string[] {
    const cells: string[] = []
    let inQuote = false
    let cell = ""
    for (let c = 0; c < line.length; c++) {
      const ch = line[c]
      if (ch === '"') { inQuote = !inQuote; continue }
      if (ch === delimiter && !inQuote) { cells.push(cell); cell = ""; continue }
      cell += ch
    }
    cells.push(cell)
    return cells
  }

  // ── Separate raw lines into OI vs ARR ──
  const oiLines: string[] = [lines[0]]   // start with header
  const arrLines: string[] = [lines[0]]  // same header for ARR parser

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const cells = splitLine(line)
    const stage = (cells[stageCol] ?? "").trim().toLowerCase()
    if (stage === "closed won") {
      arrLines.push(line)
    } else {
      // Only include rows with a valid user for OI
      const user = userCol >= 0 ? (cells[userCol] ?? "").trim() : ""
      if (user) oiLines.push(line)
    }
  }

  // ── Process OI rows via Papa + enrichRow ──
  const oiDeals: Deal[] = []
  if (oiLines.length > 1) {
    const oiText = oiLines.join("\n")
    // Build Deal objects from raw rows
    const oiHeaders = oiLines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ""))
    for (let i = 1; i < oiLines.length; i++) {
      const cells = splitLine(oiLines[i])
      const raw: Deal = {}
      oiHeaders.forEach((h, j) => { raw[h] = (cells[j] ?? "").trim() })
      // Normalise User field
      if (!raw["User"] && raw["Opportunity Owner"]) raw["User"] = raw["Opportunity Owner"] as string
      oiDeals.push(enrichRow(raw))
    }
  }

  // ── Process ARR rows via existing parseARRReport ──
  const arrResult = arrLines.length > 1
    ? parseARRReport(arrLines.join("\n"))
    : { deals: [], duplicateLog: [], exemptLog: [], parseErrors: [] }

  return {
    oiDeals,
    arrResult,
    parseErrors,
    oiCount: oiDeals.length,
    arrCount: arrResult.deals.length,
  }
}
