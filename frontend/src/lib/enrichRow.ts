import type { Deal } from "@/types"
import { PRODUCTS } from "@/config/products"
import { QUARTER_FOR_MONTH } from "@/config/months"
import { parseSalesforceDate } from "./dateParser"
import { parseMoney } from "./formatters"
import { ELV_ACCOUNTS } from "@/config/elvAccounts"

// Build a fast lookup map: normalised account name → ELV entry
const ELV_MAP = new Map<string, typeof ELV_ACCOUNTS[0]>()
for (const entry of ELV_ACCOUNTS) {
  ELV_MAP.set(entry.accountName.toLowerCase().trim(), entry)
}

function lookupElv(accountName: string): typeof ELV_ACCOUNTS[0] | undefined {
  const norm = accountName.toLowerCase().trim()
  // 1. Exact match
  if (ELV_MAP.has(norm)) return ELV_MAP.get(norm)
  // 2. Partial match — account name contains ELV entry or vice versa
  for (const [key, entry] of ELV_MAP) {
    if (norm.includes(key) || key.includes(norm)) return entry
  }
  return undefined
}

/**
 * Enriches a raw deal row with computed fields.
 * All computed fields are prefixed with _.
 */
export function enrichRow(r: Deal): Deal {
  // Stage summary
  const stageStr = r.Stage ? String(r.Stage).toLowerCase() : ""
  r._stageSummary = stageStr.includes("won")
    ? "Won"
    : stageStr.includes("lost")
    ? "Lost"
    : "Pipe"

  // Close date → month abbreviation
  const raw = r["Close Date"] || r["Close Date (2)"] || ""
  const parsed = parseSalesforceDate(raw as string)
  r._month = parsed?.monthAbbr ?? ""

  // Created Date — column T in SF export
  const MONTH_ABBRS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const rawCreated = r["Created Date"] as string | undefined
  if (rawCreated) {
    const cp = parseSalesforceDate(rawCreated)
    if (cp?.date) {
      r._createdDate = cp.date
      r._createdMonth = MONTH_ABBRS[cp.date.getMonth()]
    } else {
      r._createdDate = null
      r._createdMonth = ""
    }
  } else if (parsed?.date && r.Age) {
    // Fallback: reverse-engineer from close date − Age days
    const age = parseInt(String(r.Age)) || 0
    if (age > 0) {
      const cd = new Date(parsed.date)
      cd.setDate(cd.getDate() - age)
      r._createdDate = cd
      r._createdMonth = MONTH_ABBRS[cd.getMonth()]
    } else {
      r._createdDate = null
      r._createdMonth = ""
    }
  } else {
    r._createdDate = null
    r._createdMonth = ""
  }

  // Numeric values
  r._val = parseMoney(r["ABC Split Value"])
  r._abc = parseMoney(r["Total ABC"])
  r._initials = parseMoney(r["Total Initials"] ?? r["Initials"])
  r._services = parseMoney(r["Services Amount"])
  r._push = parseInt(String(r["Push Count"] ?? 0)) || 0
  r._stageDur = parseInt(String(r["Stage Duration"] ?? 0)) || 0

  // Risk flag
  r._risk = r._push > 2 || r._stageDur > 180 ? "Risk" : ""

  // Key deal flag
  r._keyDeal = r._abc > 30000 ? "Key Deal" : ""

  // Commit status
  r._commit = String(r["Commit Status"] ?? "")

  // Created by
  r._createdBy = String(r["Created By"] ?? r["created by"] ?? "")

  // Product matching
  const opp = String(r["Opportunity Name"] ?? "").toLowerCase()
  r._product = "No Match"
  for (const [tag, prod] of PRODUCTS) {
    if (opp.includes(tag.toLowerCase())) {
      r._product = prod
      break
    }
  }

  // Quarter / half
  r._quarter = r._month ? QUARTER_FOR_MONTH[r._month] ?? "" : ""
  r._half = ["Q1", "Q2"].includes(r._quarter ?? "") ? "H1" : "H2"

  // MEDDPICC score — fuzzy search ALL keys for anything containing "medd"
  // Also checks common exact names and partial matches
  const meddKey = Object.keys(r).find((k) => {
    const norm = k.toLowerCase().replace(/[\s_\-().%]/g, "")
    return norm.includes("medd") || norm.includes("medpicc") || norm.includes("meddpic")
  })
  if (meddKey) {
    const meddpiccRaw = r[meddKey]
    if (meddpiccRaw !== null && meddpiccRaw !== undefined && String(meddpiccRaw).trim() !== "") {
      const str = String(meddpiccRaw).replace(/[%,\s]/g, "")
      const val = parseFloat(str)
      // Store 0 explicitly — 0% is a valid assessed score, not "missing"
      r._meddpicc = isNaN(val) ? undefined : Math.min(100, Math.max(0, val))
    } else {
      r._meddpicc = 0 // Column exists but empty — assessed as 0
    }
  }
  // If meddKey not found at all, _meddpicc stays undefined = "not in report"

  // ELV ID lookup — match against Account Name or Ultimate Parent
  if (!r._elvId) {
    const accountName = String(r["Account Name"] ?? r["Ultimate Parent Account Name"] ?? "")
    const ultimateParent = String(r["Ultimate Parent Account Name"] ?? "")
    const match = lookupElv(accountName) || lookupElv(ultimateParent)
    if (match) {
      r._elvId = match.elvId
      r._elvParent = match.parentAccount
      r._elvAD = match.elvAD
    }
  }

  // Deal type — OI vs ARR
  const hasOI = (r._val ?? 0) > 0
  const hasARR = (r._abc ?? 0) > 0
  if (hasOI && hasARR) r._dealType = "OI and ARR"
  else if (hasOI) r._dealType = "OI Only"
  else if (hasARR) r._dealType = "ARR Only"

  return r
}
