// ── E.V.E Sync Service ────────────────────────────────────────────────────────
// All Supabase reads/writes go through here.
// Every function is safe to call even when Supabase is not configured —
// it simply returns null / does nothing.
import { getSupabase as getClient } from "./supabase"
import type {
  Deal,
  AllNotes,
  TimestampedNote,
  LostReview,
  AccountMatch,
  ARRBaseRow,
  BudgetTargets,
} from "@/types"

// ── Deals / Imports ───────────────────────────────────────────────────────────

export async function pushImport(
  rawCsv: string,
  deals: Deal[],
  importedBy = "team"
): Promise<string | null> {
  const db = await getClient()
  if (!db) return null

  // Create import record
  const { data: imp, error: impErr } = await db
    .from("eve_imports")
    .insert({ raw_csv: rawCsv, row_count: deals.length, imported_by: importedBy })
    .select("id")
    .single()

  if (impErr || !imp) {
    console.error("[sync] pushImport error", impErr)
    return null
  }

  // Upsert all deal rows in batches of 200
  const batch = 200
  for (let i = 0; i < deals.length; i += batch) {
    const chunk = deals.slice(i, i + batch).map((d) => ({
      import_id: imp.id,
      is_manual: !!d._isManual,
      manual_id: d._manualId ?? null,
      data: d,
    }))
    const { error } = await db.from("eve_deals").insert(chunk)
    if (error) console.error("[sync] pushImport deals batch error", error)
  }

  return imp.id
}

export async function fetchLatestImport(): Promise<{
  rawCsv: string
  deals: Deal[]
  importedAt: string
} | null> {
  const db = await getClient()
  if (!db) return null

  // Get latest non-manual import
  const { data: imp } = await db
    .from("eve_imports")
    .select("id, raw_csv, imported_at")
    .order("imported_at", { ascending: false })
    .limit(1)
    .single()

  if (!imp) return null

  // Fetch all deals for this import
  const { data: rows } = await db
    .from("eve_deals")
    .select("data")
    .eq("import_id", imp.id)
    .eq("is_manual", false)

  const deals: Deal[] = (rows ?? []).map((r: { data: Deal }) => r.data)

  return { rawCsv: imp.raw_csv, deals, importedAt: imp.imported_at }
}

export async function fetchManualDeals(): Promise<Deal[]> {
  const db = await getClient()
  if (!db) return []

  const { data } = await db
    .from("eve_deals")
    .select("data")
    .eq("is_manual", true)

  return (data ?? []).map((r: { data: Deal }) => r.data)
}

export async function pushManualDeal(deal: Deal): Promise<void> {
  const db = await getClient()
  if (!db) return

  await db.from("eve_deals").upsert({
    is_manual: true,
    manual_id: deal._manualId ?? null,
    data: deal,
    import_id: null,
  })
}

export async function deleteManualDeal(manualId: string): Promise<void> {
  const db = await getClient()
  if (!db) return

  await db.from("eve_deals").delete().eq("manual_id", manualId)
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function fetchAllNotes(): Promise<AllNotes | null> {
  const db = await getClient()
  if (!db) return null

  const { data } = await db.from("eve_notes").select("month, user_name, week_key, content")
  if (!data) return null

  const notes: AllNotes = {}
  for (const row of data) {
    if (!notes[row.month]) notes[row.month] = {}
    if (!notes[row.month][row.user_name])
      notes[row.month][row.user_name] = { W1: "", W2: "", W3: "", W4: "", W5: "" }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(notes[row.month][row.user_name] as any)[row.week_key] = row.content
  }
  return notes
}

export async function upsertNote(
  month: string,
  userName: string,
  weekKey: string,
  content: string
): Promise<void> {
  const db = await getClient()
  if (!db) return

  await db.from("eve_notes").upsert(
    { month, user_name: userName, week_key: weekKey, content, updated_at: new Date().toISOString() },
    { onConflict: "month,user_name,week_key" }
  )
}

export async function fetchFreeNotes(): Promise<Record<string, string> | null> {
  const db = await getClient()
  if (!db) return null

  const { data } = await db.from("eve_free_notes").select("month, content")
  if (!data) return null

  const notes: Record<string, string> = {}
  for (const row of data) notes[row.month] = row.content
  return notes
}

export async function upsertFreeNote(month: string, content: string): Promise<void> {
  const db = await getClient()
  if (!db) return

  await db.from("eve_free_notes").upsert(
    { month, content, updated_at: new Date().toISOString() },
    { onConflict: "month" }
  )
}

// ── Commit intelligence ───────────────────────────────────────────────────────

export async function fetchCommitNotes(): Promise<Record<string, TimestampedNote[]> | null> {
  const db = await getClient()
  if (!db) return null

  const { data } = await db
    .from("eve_commit_notes")
    .select("month, text, day_label, note_date, created_at")
    .order("created_at", { ascending: false })

  if (!data) return null

  const result: Record<string, TimestampedNote[]> = {}
  for (const row of data) {
    if (!result[row.month]) result[row.month] = []
    result[row.month].push({ text: row.text, date: row.note_date, dayLabel: row.day_label })
  }
  return result
}

export async function pushCommitNote(
  month: string,
  note: TimestampedNote
): Promise<void> {
  const db = await getClient()
  if (!db) return

  await db.from("eve_commit_notes").insert({
    month,
    text: note.text,
    day_label: note.dayLabel,
    note_date: note.date,
  })
}

export async function fetchCommitCompany(): Promise<Record<string, number> | null> {
  const db = await getClient()
  if (!db) return null

  const { data } = await db.from("eve_commit_company").select("month, value")
  if (!data) return null

  const result: Record<string, number> = {}
  for (const row of data) result[row.month] = Number(row.value)
  return result
}

export async function upsertCommitCompany(month: string, value: number): Promise<void> {
  const db = await getClient()
  if (!db) return

  await db.from("eve_commit_company").upsert(
    { month, value, updated_at: new Date().toISOString() },
    { onConflict: "month" }
  )
}

// ── Lost reviews ──────────────────────────────────────────────────────────────

export async function fetchLostReviews(): Promise<Record<string, LostReview> | null> {
  const db = await getClient()
  if (!db) return null

  const { data } = await db.from("eve_lost_reviews").select("*")
  if (!data) return null

  const result: Record<string, LostReview> = {}
  for (const row of data) {
    result[row.opp_name] = {
      reason: row.reason,
      detail: row.detail,
      decision: row.decision,
      competitor: row.competitor,
      nextSteps: row.next_steps,
      reviewDate: row.review_date,
    }
  }
  return result
}

export async function upsertLostReview(oppName: string, review: LostReview): Promise<void> {
  const db = await getClient()
  if (!db) return

  await db.from("eve_lost_reviews").upsert(
    {
      opp_name: oppName,
      reason: review.reason,
      detail: review.detail,
      decision: review.decision,
      competitor: review.competitor,
      next_steps: review.nextSteps,
      review_date: review.reviewDate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "opp_name" }
  )
}

// ── Services required ─────────────────────────────────────────────────────────

export async function fetchSvcRequired(): Promise<Record<string, string> | null> {
  const db = await getClient()
  if (!db) return null

  const { data } = await db.from("eve_svc_required").select("opp_name, flag_value")
  if (!data) return null

  const result: Record<string, string> = {}
  for (const row of data) result[row.opp_name] = row.flag_value
  return result
}

export async function upsertSvcRequired(oppName: string, value: string): Promise<void> {
  const db = await getClient()
  if (!db) return

  await db.from("eve_svc_required").upsert(
    { opp_name: oppName, flag_value: value, updated_at: new Date().toISOString() },
    { onConflict: "opp_name" }
  )
}

// ── Budget targets ────────────────────────────────────────────────────────────

export async function fetchBudgetTargets(): Promise<{
  oi: BudgetTargets
  arr: BudgetTargets
} | null> {
  const db = await getClient()
  if (!db) return null

  const { data } = await db.from("eve_budget_targets").select("*")
  if (!data) return null

  const oi: BudgetTargets = {}
  const arr: BudgetTargets = {}

  for (const row of data) {
    const target = row.target_type === "oi" ? oi : arr
    if (!target[row.month]) target[row.month] = {}
    target[row.month][row.ad_key] = Number(row.value)
  }

  return { oi, arr }
}

export async function upsertBudgetTarget(
  type: "oi" | "arr",
  month: string,
  adKey: string,
  value: number
): Promise<void> {
  const db = await getClient()
  if (!db) return

  await db.from("eve_budget_targets").upsert(
    {
      target_type: type,
      month,
      ad_key: adKey,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "target_type,month,ad_key" }
  )
}

export async function pushAllBudgets(oi: BudgetTargets, arr: BudgetTargets): Promise<void> {
  const db = await getClient()
  if (!db) return

  const rows: object[] = []
  const now = new Date().toISOString()

  for (const [month, adMap] of Object.entries(oi)) {
    for (const [adKey, value] of Object.entries(adMap)) {
      rows.push({ target_type: "oi", month, ad_key: adKey, value, updated_at: now })
    }
  }
  for (const [month, adMap] of Object.entries(arr)) {
    for (const [adKey, value] of Object.entries(adMap)) {
      rows.push({ target_type: "arr", month, ad_key: adKey, value, updated_at: now })
    }
  }

  // Upsert in batches
  const batch = 100
  for (let i = 0; i < rows.length; i += batch) {
    await db
      .from("eve_budget_targets")
      .upsert(rows.slice(i, i + batch), { onConflict: "target_type,month,ad_key" })
  }
}

// ── Account match ─────────────────────────────────────────────────────────────

export async function fetchAccountMatch(): Promise<AccountMatch[] | null> {
  const db = await getClient()
  if (!db) return null

  const { data } = await db.from("eve_account_match").select("*")
  if (!data) return null

  return data.map((r: Record<string, string>) => ({
    c: r.account_code,
    o: r.owner,
    a: r.account_name,
    p: r.parent,
    e: r.elv_id,
    ea: r.elv_ad,
  }))
}

export async function pushAccountMatch(entries: AccountMatch[]): Promise<void> {
  const db = await getClient()
  if (!db) return

  const rows = entries.map((e) => ({
    account_code: e.c,
    owner: e.o,
    account_name: e.a,
    parent: e.p,
    elv_id: e.e,
    elv_ad: e.ea,
    updated_at: new Date().toISOString(),
  }))

  const batch = 100
  for (let i = 0; i < rows.length; i += batch) {
    await db
      .from("eve_account_match")
      .upsert(rows.slice(i, i + batch), { onConflict: "account_name" })
  }
}

// ── ARR base data ─────────────────────────────────────────────────────────────

export async function fetchARRBase(): Promise<ARRBaseRow[] | null> {
  const db = await getClient()
  if (!db) return null

  const { data } = await db.from("eve_arr_base").select("*")
  if (!data) return null

  return data.map((r: Record<string, unknown>) => ({
    ad: r.ad as string,
    p: r.parent as string,
    e: r.elv_id as string,
    pa: r.parent_acc as string,
    a: r.account_name as string,
    base: Number(r.base_arr),
    uplift: Number(r.uplift_pct),
  }))
}

export async function pushARRBase(rows: ARRBaseRow[]): Promise<void> {
  const db = await getClient()
  if (!db) return

  const mapped = rows.map((r) => ({
    ad: r.ad,
    parent: r.p,
    elv_id: r.e,
    parent_acc: r.pa,
    account_name: r.a,
    base_arr: r.base,
    uplift_pct: r.uplift,
    updated_at: new Date().toISOString(),
  }))

  const batch = 100
  for (let i = 0; i < mapped.length; i += batch) {
    await db
      .from("eve_arr_base")
      .upsert(mapped.slice(i, i + batch), { onConflict: "account_name" })
  }
}

// ── Full sync on app load ─────────────────────────────────────────────────────
// Pulls everything from Supabase and returns a partial store state

export interface RemoteState {
  rawCsv?: string
  deals?: Deal[]
  importDate?: string
  notes?: AllNotes
  freeNotes?: Record<string, string>
  commitNotesTS?: Record<string, TimestampedNote[]>
  commitCompany?: Record<string, number>
  lostReviews?: Record<string, LostReview>
  svcRequired?: Record<string, string>
  oiTargets?: BudgetTargets
  arrTargets?: BudgetTargets
  accountMatch?: AccountMatch[]
  arrBaseData?: ARRBaseRow[]
  manualDeals?: Deal[]
}

export async function fetchAllRemoteState(): Promise<RemoteState> {
  const db = await getClient()
  if (!db) return {}

  const [
    importResult,
    notes,
    freeNotes,
    commitNotesTS,
    commitCompany,
    lostReviews,
    svcRequired,
    budgets,
    accountMatch,
    arrBaseData,
    manualDeals,
  ] = await Promise.allSettled([
    fetchLatestImport(),
    fetchAllNotes(),
    fetchFreeNotes(),
    fetchCommitNotes(),
    fetchCommitCompany(),
    fetchLostReviews(),
    fetchSvcRequired(),
    fetchBudgetTargets(),
    fetchAccountMatch(),
    fetchARRBase(),
    fetchManualDeals(),
  ])

  const result: RemoteState = {}

  if (importResult.status === "fulfilled" && importResult.value) {
    result.rawCsv = importResult.value.rawCsv
    result.deals = importResult.value.deals
    result.importDate = importResult.value.importedAt
  }
  if (notes.status === "fulfilled" && notes.value) result.notes = notes.value
  if (freeNotes.status === "fulfilled" && freeNotes.value) result.freeNotes = freeNotes.value
  if (commitNotesTS.status === "fulfilled" && commitNotesTS.value) result.commitNotesTS = commitNotesTS.value
  if (commitCompany.status === "fulfilled" && commitCompany.value) result.commitCompany = commitCompany.value
  if (lostReviews.status === "fulfilled" && lostReviews.value) result.lostReviews = lostReviews.value
  if (svcRequired.status === "fulfilled" && svcRequired.value) result.svcRequired = svcRequired.value
  if (budgets.status === "fulfilled" && budgets.value) {
    if (Object.keys(budgets.value.oi).length > 0) result.oiTargets = budgets.value.oi
    if (Object.keys(budgets.value.arr).length > 0) result.arrTargets = budgets.value.arr
  }
  if (accountMatch.status === "fulfilled" && accountMatch.value) result.accountMatch = accountMatch.value
  if (arrBaseData.status === "fulfilled" && arrBaseData.value) result.arrBaseData = arrBaseData.value
  if (manualDeals.status === "fulfilled") result.manualDeals = manualDeals.value

  return result
}
