import { useState } from "react"
import { Plus, Trash2, Pencil, X, Upload, Download, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CommitBadge } from "@/components/shared/StatusBadge"
import { useDashboardStore } from "@/store/dashboardStore"
import { USERS } from "@/config/users"
import { fmt } from "@/lib/formatters"
import { enrichRow } from "@/lib/enrichRow"
import type { Deal } from "@/types"

const BLANK_FORM = {
  user: USERS[0], oppName: "", accountName: "", val: "", abc: "",
  closeDate: "", stage: "Discovery", commit: "Pipeline",
  services: "", initials: "", nextStep: "", dealType: "OI and ARR",
}

export function NonSFDealsTab() {
  const { nonSFDeals, addNonSFDeal, updateNonSFDeal, removeNonSFDeal, clearNonSFDeals } = useDashboardStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [form, setForm] = useState({ ...BLANK_FORM })

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...BLANK_FORM })
  }

  function openEditForm(deal: Deal) {
    setForm({
      user: deal.User ?? USERS[0],
      oppName: (deal["Opportunity Name"] ?? "").replace("NSF — ", ""),
      accountName: deal["Account Name"] ?? "",
      val: String(deal._val ?? deal["ABC Split Value"] ?? ""),
      abc: String(deal._abc ?? deal["Total ABC"] ?? ""),
      closeDate: deal["Close Date"] ?? "",
      stage: deal.Stage ?? "Discovery",
      commit: deal["Commit Status"] ?? "Pipeline",
      services: String(deal._services ?? deal["Services Amount"] ?? ""),
      initials: String(deal._initials ?? deal["Total Initials"] ?? ""),
      nextStep: (deal["Next Step"] ?? "").replace(/^⚡ NSF \| ?/, ""),
      dealType: (deal._dealType ?? "OI and ARR") as string,
    })
    setEditingId(deal._manualId ?? null)
    setShowForm(true)
  }

  function handleSave() {
    if (!form.oppName || !form.accountName) return
    const isEdit = editingId !== null
    const existing = isEdit ? nonSFDeals.find((d) => d._manualId === editingId) : undefined
    const deal: Deal = {
      ...(existing ?? {}),
      User: form.user,
      "Opportunity Name": "NSF — " + form.oppName,
      "Account Name": form.accountName,
      "ABC Split Value": parseFloat(form.val.replace(/[£,]/g, "")) || 0,
      "Total ABC": parseFloat(form.abc.replace(/[£,]/g, "")) || 0,
      "Close Date": form.closeDate,
      Stage: form.stage,
      "Commit Status": form.commit,
      "Services Amount": parseFloat(form.services.replace(/[£,]/g, "")) || 0,
      "Total Initials": parseFloat(form.initials.replace(/[£,]/g, "")) || 0,
      "Next Step": "⚡ NSF | " + form.nextStep.replace(/^⚡ NSF \| ?/, ""),
      "Push Count": existing?.["Push Count"] ?? 0,
      "Stage Duration": existing?.["Stage Duration"] ?? 0,
      _isManual: true,
      _manualId: isEdit ? editingId! : "NSF_" + Date.now(),
      _dealType: form.dealType as "OI and ARR" | "OI Only" | "ARR Only" | "Churn" | "Downsell",
    }
    if (isEdit) { updateNonSFDeal(enrichRow(deal)) } else { addNonSFDeal(enrichRow(deal)) }
    closeForm()
  }

  function exportCSV() {
    const headers = ["Manual ID", "AD", "Opportunity Name", "Account Name", "Split ABC", "Total ABC", "Close Date", "Status", "Commit", "Services", "Initials", "Next Steps", "Deal Type"]
    const rows = nonSFDeals.map((d) => [
      d._manualId ?? "", d.User ?? "",
      (d["Opportunity Name"] ?? "").replace("NSF — ", ""),
      d["Account Name"] ?? "", d._val ?? 0, d._abc ?? 0,
      d["Close Date"] ?? "", d.Stage ?? "", d["Commit Status"] ?? "",
      d._services ?? 0, d._initials ?? 0,
      (d["Next Step"] ?? "").replace(/^⚡ NSF \| ?/, ""),
      d._dealType ?? "OI and ARR",
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "non_sf_deals.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const lines = text.trim().split(/\r?\n/)
        if (lines.length < 2) throw new Error("File is empty")
        const delim = lines[0].includes("\t") ? "\t" : ","
        const parseRow = (line: string) => {
          if (delim === ",") {
            const cells: string[] = []; let cur = "", inQ = false
            for (let i = 0; i < line.length; i++) {
              if (line[i] === '"') { inQ = !inQ }
              else if (line[i] === "," && !inQ) { cells.push(cur.trim()); cur = "" }
              else cur += line[i]
            }
            cells.push(cur.trim()); return cells
          }
          return line.split("\t").map((c) => c.replace(/"/g, "").trim())
        }
        const headers = parseRow(lines[0]).map((h) => h.toLowerCase().trim())
        const idx = (name: string) => {
          const exact = headers.findIndex((h) => h === name)
          if (exact >= 0) return exact
          return headers.findIndex((h) => h.includes(name))
        }
        let added = 0, updated = 0
        const current = useDashboardStore.getState().nonSFDeals
        for (let i = 1; i < lines.length; i++) {
          const cells = parseRow(lines[i])
          const oppName = cells[idx("opportunity name")] ?? cells[idx("opportunity")] ?? ""
          if (!oppName) continue
          const splitABC = parseFloat((cells[idx("split abc")] ?? cells[idx("value")] ?? "0").replace(/[£,]/g, "")) || 0
          const csvId = (cells[idx("manual id")] ?? "").trim()
          const existing = csvId ? current.find((d) => d._manualId === csvId) : undefined
          const rawNextStep = (cells[idx("next steps")] ?? cells[idx("next step")] ?? "").replace(/^⚡ NSF \| ?/, "")
          const closeRaw = cells[idx("close date")] ?? cells[idx("close")] ?? ""
          const deal: Deal = {
            ...(existing ?? {}),
            User: cells[idx("ad")] ?? USERS[0],
            "Opportunity Name": "NSF — " + oppName,
            "Account Name": cells[idx("account name")] ?? cells[idx("account")] ?? "",
            "ABC Split Value": splitABC,
            "Total ABC": parseFloat((cells[idx("total abc")] ?? String(splitABC)).replace(/[£,]/g, "")) || splitABC,
            "Close Date": closeRaw,
            Stage: cells[idx("status")] ?? cells[idx("stage")] ?? "Discovery",
            "Commit Status": cells[idx("commit")] ?? "Pipeline",
            "Services Amount": parseFloat((cells[idx("services")] ?? "0").replace(/[£,]/g, "")) || 0,
            "Total Initials": parseFloat((cells[idx("initials")] ?? "0").replace(/[£,]/g, "")) || 0,
            "Next Step": "⚡ NSF | " + rawNextStep,
            "Push Count": existing?.["Push Count"] ?? 0,
            "Stage Duration": existing?.["Stage Duration"] ?? 0,
            _isManual: true,
            _manualId: csvId || "NSF_" + Date.now() + "_" + i,
            _dealType: (cells[idx("deal type")] ?? cells[idx("type")] ?? "OI and ARR") as "OI and ARR" | "OI Only" | "ARR Only" | "Churn" | "Downsell",
          }
          if (existing) { updateNonSFDeal(enrichRow(deal)); updated++ }
          else { addNonSFDeal(enrichRow(deal)); added++ }
        }
        const parts = []
        if (added > 0) parts.push(`${added} added`)
        if (updated > 0) parts.push(`${updated} updated`)
        setCsvError(`✅ ${parts.join(", ")} — now showing in performance data`)
      } catch (err) {
        setCsvError(`❌ Error: ${err instanceof Error ? err.message : "Invalid file"}`)
      }
    }
    reader.readAsText(file); e.target.value = ""
  }

  const totalSplitABC = nonSFDeals.reduce((s, d) => s + (d._val ?? 0), 0)
  const totalTotalABC = nonSFDeals.reduce((s, d) => s + (d._abc ?? 0), 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button onClick={() => setCollapsed(v => !v)} className="flex items-center gap-2 text-base font-semibold hover:text-primary transition-colors">
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              Non SF Deals
              <span className="text-sm font-normal text-muted-foreground">{nonSFDeals.length} deal{nonSFDeals.length !== 1 ? "s" : ""}</span>
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="cursor-pointer">
                <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 pointer-events-none"><Upload className="w-3 h-3" />Import CSV</Button>
              </label>
              {nonSFDeals.length > 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={exportCSV}><Download className="w-3 h-3" />Export CSV</Button>
              )}
              {nonSFDeals.length > 0 && !confirmClear && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setConfirmClear(true)}><Trash2 className="w-3 h-3" />Clear All</Button>
              )}
              {confirmClear && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-destructive font-medium">Delete all?</span>
                  <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={() => { clearNonSFDeals(); setConfirmClear(false) }}>Yes</Button>
                  <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setConfirmClear(false)}>No</Button>
                </div>
              )}
              {!showForm ? (
                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { closeForm(); setShowForm(true) }}><Plus className="w-3 h-3" />Add Deal</Button>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={closeForm}><X className="w-3 h-3" />Cancel</Button>
              )}
            </div>
          </div>
          {csvError && <p className={`text-xs mt-1 ${csvError.startsWith("✅") ? "text-emerald-500" : "text-destructive"}`}>{csvError}</p>}
        </CardHeader>

        {!collapsed && (
          <CardContent className="pt-0 space-y-4">
            {/* ── Form ── */}
            {showForm && (
              <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {editingId ? "Edit Non SF Deal" : "Add Non SF Deal"}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">AD *</label>
                    <select value={form.user} onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs">
                      {USERS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Opportunity Name *</label>
                    <Input value={form.oppName} onChange={(e) => setForm((f) => ({ ...f, oppName: e.target.value }))} placeholder="e.g. Youngs - New Sites" className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Account Name *</label>
                    <Input value={form.accountName} onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))} placeholder="e.g. Youngs Brewery" className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Split ABC / OI (£) *</label>
                    <Input value={form.val} onChange={(e) => setForm((f) => ({ ...f, val: e.target.value }))} placeholder="12000" className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Total ABC / ARR (£)</label>
                    <Input value={form.abc} onChange={(e) => setForm((f) => ({ ...f, abc: e.target.value }))} placeholder="12000" className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Close Date</label>
                    <Input type="date" value={form.closeDate} onChange={(e) => setForm((f) => ({ ...f, closeDate: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Status</label>
                    <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs">
                      {["Discovery", "Qualify", "Proposal", "Negotiation", "Closed Won", "Closed Lost"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Commit</label>
                    <select value={form.commit} onChange={(e) => setForm((f) => ({ ...f, commit: e.target.value }))} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs">
                      {["Pipeline", "Upside", "Commit", "Won", "Lost"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Deal Type</label>
                    <select value={form.dealType} onChange={(e) => setForm((f) => ({ ...f, dealType: e.target.value }))} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs">
                      {["OI and ARR", "OI Only", "ARR Only", "Churn", "Downsell"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Services (£)</label>
                    <Input value={form.services} onChange={(e) => setForm((f) => ({ ...f, services: e.target.value }))} placeholder="0" className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Initials (£)</label>
                    <Input value={form.initials} onChange={(e) => setForm((f) => ({ ...f, initials: e.target.value }))} placeholder="0" className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Next Steps</label>
                    <Input value={form.nextStep} onChange={(e) => setForm((f) => ({ ...f, nextStep: e.target.value }))} placeholder="e.g. Proposal sent" className="h-8 text-xs" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="h-7 text-xs" onClick={handleSave}>{editingId ? "Save Changes" : "+ Add Deal"}</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={closeForm}>Cancel</Button>
                </div>
              </div>
            )}

            {/* ── Empty state ── */}
            {nonSFDeals.length === 0 && !showForm && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No Non SF deals yet. Click <strong>Add Deal</strong> or <strong>Import CSV</strong> to get started.
              </p>
            )}

            {/* ── Table ── */}
            {nonSFDeals.length > 0 && (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AD</TableHead>
                      <TableHead>Opportunity Name</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Split ABC</TableHead>
                      <TableHead className="text-right">Total ABC</TableHead>
                      <TableHead>Close Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Commit</TableHead>
                      <TableHead className="text-right">Services</TableHead>
                      <TableHead className="text-right">Initials</TableHead>
                      <TableHead>Next Steps</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonSFDeals.map((d) => (
                      <TableRow key={d._manualId} className="border-l-2 border-l-purple-500">
                        <TableCell className="text-xs font-medium">{(d.User ?? "").split(" ")[0]}</TableCell>
                        <TableCell className="text-xs max-w-[180px]">
                          <div className="flex items-center gap-1">
                            <span className="truncate">{(d["Opportunity Name"] ?? "").replace("NSF — ", "")}</span>
                            <Badge variant="outline" className="text-[9px] text-purple-400 border-purple-500/40 shrink-0">NSF</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs max-w-[140px] truncate">{d["Account Name"] ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs font-bold tabular-nums">{fmt(d._val ?? 0)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{(d._abc ?? 0) > 0 ? fmt(d._abc ?? 0) : "—"}</TableCell>
                        <TableCell className="text-xs">{
                          (() => {
                            const raw = d["Close Date"] ?? "—"
                            if (raw === "—") return "—"
                            // Format YYYY-MM-DD → DD/MM/YYYY
                            const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
                            if (m) return `${m[3]}/${m[2]}/${m[1]}`
                            return raw
                          })()
                        }</TableCell>
                        <TableCell className="text-xs">{d.Stage ?? "—"}</TableCell>
                        <TableCell><CommitBadge commit={d._commit ?? ""} /></TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{(d._services ?? 0) > 0 ? <span className="text-emerald-500 font-medium">{fmt(d._services ?? 0)}</span> : "—"}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{(d._initials ?? 0) > 0 ? <span className="text-blue-500 font-medium">{fmt(d._initials ?? 0)}</span> : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{(d["Next Step"] ?? "—").replace(/^⚡ NSF \| ?/, "")}</TableCell>
                        <TableCell className="text-xs">{d._dealType ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditForm(d)} className="text-muted-foreground hover:text-primary transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => d._manualId && removeNonSFDeal(d._manualId)} className="text-destructive hover:text-destructive/80 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/60 font-semibold">
                      <TableCell colSpan={3} className="text-xs">Total — {nonSFDeals.length} deal{nonSFDeals.length !== 1 ? "s" : ""}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmt(totalSplitABC)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{fmt(totalTotalABC)}</TableCell>
                      <TableCell colSpan={8} />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
