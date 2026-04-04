import { useState, useMemo } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge, CommitBadge, RiskBadge, KeyDealBadge } from "@/components/shared/StatusBadge"
import { QuickProductMatch } from "@/components/shared/QuickProductMatch"
import { Badge } from "@/components/ui/badge"
import { useDashboardStore } from "@/store/dashboardStore"
import { USERS } from "@/config/users"
import { PRODUCT_GROUPS } from "@/config/products"
import { fmt } from "@/lib/formatters"
import { enrichRow } from "@/lib/enrichRow"
import { openDealModal } from "@/App"
import type { Deal } from "@/types"

type SortCol = keyof Deal | "_val" | "_abc" | "_services" | "_initials" | "_push"
type SortDir = "asc" | "desc"

function Pill({
  active, children, onClick,
}: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-muted-foreground hover:border-primary"
      }`}
    >
      {children}
    </button>
  )
}

export function AllDealsTab() {
  const { data, filters, addManualDeal, removeManualDeal } = useDashboardStore()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [commitFilter, setCommitFilter] = useState("All")
  const [servicesFilter, setServicesFilter] = useState("All")
  const [productMatchFilter, setProductMatchFilter] = useState("All") // All | NoMatch | Matched
  const [sortCol, setSortCol] = useState<SortCol>("_val")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({
    user: USERS[0], oppName: "", accountName: "", val: "",
    abc: "", closeDate: "", stage: "Discovery", commit: "Pipeline",
    services: "", initials: "", nextStep: "",
    dealType: "OI and ARR", // OI and ARR | OI Only | ARR Only
  })

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortCol(col); setSortDir("desc") }
  }

  const filtered = useMemo(() => {
    let rows = [...data]

    // Global filters
    if (filters.user !== "All") rows = rows.filter((r) => r.User === filters.user)
    if (filters.product !== "All") rows = rows.filter((r) => r._product === filters.product)
    if (filters.group !== "All" && PRODUCT_GROUPS[filters.group]) {
      rows = rows.filter((r) => PRODUCT_GROUPS[filters.group].includes(r._product ?? ""))
    }
    if (filters.month !== "All") {
      const months = Array.isArray(filters.month) ? filters.month : [filters.month]
      rows = rows.filter((r) => months.includes(r._month ?? ""))
    }

    // Local filters
    if (statusFilter !== "All") rows = rows.filter((r) => r._stageSummary === statusFilter)
    if (commitFilter !== "All") rows = rows.filter((r) => r._commit === commitFilter)
    if (servicesFilter === "With") rows = rows.filter((r) => (r._services ?? 0) > 0)
    if (servicesFilter === "Without") rows = rows.filter((r) => !(r._services) || r._services === 0)
    if (productMatchFilter === "NoMatch") rows = rows.filter((r) => !r._product || r._product === "No Match")
    if (productMatchFilter === "Matched") rows = rows.filter((r) => r._product && r._product !== "No Match")

    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          (r.User ?? "").toLowerCase().includes(s) ||
          (r["Opportunity Name"] ?? "").toLowerCase().includes(s) ||
          (r["Account Name"] ?? "").toLowerCase().includes(s) ||
          (r.Stage ?? "").toLowerCase().includes(s) ||
          (r._product ?? "").toLowerCase().includes(s) ||
          (r["Next Step"] ?? "").toLowerCase().includes(s)
      )
    }

    // Sort
    rows.sort((a, b) => {
      const va = (a as Record<string, unknown>)[sortCol as string]
      const vb = (b as Record<string, unknown>)[sortCol as string]
      if (typeof va === "number" && typeof vb === "number")
        return sortDir === "asc" ? va - vb : vb - va
      const sa = String(va ?? "").toLowerCase()
      const sb = String(vb ?? "").toLowerCase()
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa)
    })

    return rows
  }, [data, filters, search, statusFilter, commitFilter, servicesFilter, sortCol, sortDir])

  function handleAddDeal() {
    if (!form.oppName) return
    const deal: Deal = {
      User: form.user,
      "Opportunity Name": "Manual Entry — " + form.oppName,
      "Account Name": form.accountName,
      "ABC Split Value": parseFloat(form.val.replace(/[£,]/g, "")) || 0,
      "Total ABC": parseFloat(form.abc.replace(/[£,]/g, "")) || 0,
      "Close Date": form.closeDate,
      Stage: form.stage,
      "Commit Status": form.commit,
      "Services Amount": parseFloat(form.services.replace(/[£,]/g, "")) || 0,
      "Total Initials": parseFloat(form.initials.replace(/[£,]/g, "")) || 0,
      "Next Step": form.nextStep,
      "Push Count": 0,
      "Stage Duration": 0,
      _isManual: true,
      _manualId: "MD_" + Date.now(),
      _dealType: form.dealType as "OI and ARR" | "OI Only" | "ARR Only",
    }
    addManualDeal(enrichRow(deal))
    setForm({
      user: USERS[0], oppName: "", accountName: "", val: "",
      abc: "", closeDate: "", stage: "Discovery", commit: "Pipeline",
      services: "", initials: "", nextStep: "",
      dealType: "OI and ARR",
    })
    setShowAddForm(false)
  }

  function SortHdr({ col, label, right }: { col: SortCol; label: string; right?: boolean }) {
    const active = sortCol === col
    return (
      <TableHead
        className={`cursor-pointer select-none hover:text-foreground ${right ? "text-right" : ""}`}
        onClick={() => toggleSort(col)}
      >
        {label}
        {active ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
      </TableHead>
    )
  }

  const totalVal = filtered.reduce((s, r) => s + (r._val ?? 0), 0)
  const wonCount = filtered.filter((r) => r._stageSummary === "Won").length
  const pipeCount = filtered.filter((r) => r._stageSummary === "Pipe").length
  const lostCount = filtered.filter((r) => r._stageSummary === "Lost").length

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">
              All Deals
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {filtered.length} deals · {fmt(totalVal)}
              </span>
            </CardTitle>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => setShowAddForm((v) => !v)}
              >
                <Plus className="w-3 h-3" />
                Add Deal
              </Button>
              <Input
                placeholder="Search deals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 w-52 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Filters strip */}
          <div className="flex flex-wrap gap-4 mb-3 pb-3 border-b">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</span>
              <div className="flex gap-1">
                {["All", "Pipe", "Won", "Lost"].map((v) => (
                  <Pill key={v} active={statusFilter === v} onClick={() => setStatusFilter(v)}>
                    {v}{v === "Pipe" ? ` (${pipeCount})` : v === "Won" ? ` (${wonCount})` : v === "Lost" ? ` (${lostCount})` : ""}
                  </Pill>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Commit</span>
              <div className="flex gap-1">
                {["All", "Commit", "Pipeline", "Upside"].map((v) => (
                  <Pill key={v} active={commitFilter === v} onClick={() => setCommitFilter(v)}>{v}</Pill>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Services</span>
              <div className="flex gap-1">
                {["All", "With", "Without"].map((v) => (
                  <Pill key={v} active={servicesFilter === v} onClick={() => setServicesFilter(v)}>{v}</Pill>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Product</span>
              <div className="flex gap-1">
                <Pill active={productMatchFilter === "All"} onClick={() => setProductMatchFilter("All")}>All</Pill>
                <Pill active={productMatchFilter === "NoMatch"} onClick={() => setProductMatchFilter("NoMatch")}>
                  <span className="text-amber-500">No Match</span>
                </Pill>
                <Pill active={productMatchFilter === "Matched"} onClick={() => setProductMatchFilter("Matched")}>Matched</Pill>
              </div>
            </div>
          </div>

          {/* Add deal form */}
          {showAddForm && (
            <div className="bg-muted rounded-lg p-4 mb-4 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-3">Add Manual Deal</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">AD</label>
                  <select value={form.user} onChange={(e) => setForm((s) => ({ ...s, user: e.target.value }))}
                    className="w-full h-7 text-xs rounded border bg-card px-1.5 mt-0.5">
                    {USERS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground">Opportunity Name *</label>
                  <Input value={form.oppName} onChange={(e) => setForm((s) => ({ ...s, oppName: e.target.value }))}
                    placeholder="Deal name..." className="h-7 text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Account Name</label>
                  <Input value={form.accountName} onChange={(e) => setForm((s) => ({ ...s, accountName: e.target.value }))}
                    placeholder="Company..." className="h-7 text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">ABC Split Value (£)</label>
                  <Input value={form.val} onChange={(e) => setForm((s) => ({ ...s, val: e.target.value }))}
                    placeholder="0" className="h-7 text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Close Date</label>
                  <Input type="date" value={form.closeDate} onChange={(e) => setForm((s) => ({ ...s, closeDate: e.target.value }))}
                    className="h-7 text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Stage</label>
                  <select value={form.stage} onChange={(e) => setForm((s) => ({ ...s, stage: e.target.value }))}
                    className="w-full h-7 text-xs rounded border bg-card px-1.5 mt-0.5">
                    {["Discovery","Evaluation","Negotiation","Decision","Commitment","Closed Won"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Commit Status</label>
                  <select value={form.commit} onChange={(e) => setForm((s) => ({ ...s, commit: e.target.value }))}
                    className="w-full h-7 text-xs rounded border bg-card px-1.5 mt-0.5">
                    {["Pipeline","Commit","Upside"].map((v) => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Services (£)</label>
                  <Input value={form.services} onChange={(e) => setForm((s) => ({ ...s, services: e.target.value }))}
                    placeholder="0" className="h-7 text-xs mt-0.5" />
                </div>
              </div>
              {/* Deal Type */}
              <div className="mt-2 flex items-center gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-0.5">Deal Type</label>
                  <div className="flex gap-1">
                    {(["OI and ARR", "OI Only", "ARR Only"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setForm((s) => ({ ...s, dealType: v }))}
                        className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                          form.dealType === v
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    {form.dealType === "OI Only" && "Counts toward OI targets only — not included in ARR"}
                    {form.dealType === "ARR Only" && "Counts toward ARR only — not in OI pipeline view"}
                    {form.dealType === "OI and ARR" && "Counts toward both OI pipeline and ARR tracking"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="h-7 text-xs" onClick={handleAddDeal} disabled={!form.oppName}>Add Deal</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHdr col="User" label="AD" />
                  <SortHdr col="_elvId" label="ELV" />
                  <SortHdr col="Account Name" label="Account" />
                  <SortHdr col="Opportunity Name" label="Opportunity" />
                  <SortHdr col="_val" label="OI Value" right />
                  <SortHdr col="_abc" label="Total ABC" right />
                  <SortHdr col="_initials" label="Initials" right />
                  <SortHdr col="_services" label="Services" right />
                  <SortHdr col="Close Date" label="Close Date" />
                  <SortHdr col="_stageSummary" label="Status" />
                  <SortHdr col="_commit" label="Commit" />
                  <SortHdr col="_month" label="Month" />
                  <SortHdr col="_push" label="Pushes" right />
                  <SortHdr col="_product" label="Product" />
                  <TableHead>Flags</TableHead>
                  <TableHead className="min-w-[160px]">Next Steps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 500).map((r, i) => {
                  const isManual = r._isManual
                  return (
                    <TableRow key={i} className={isManual ? "border-l-2 border-l-purple-500" : ""}>
                      <TableCell className="font-medium">{(r.User ?? "").split(" ")[0]}</TableCell>
                      <TableCell className="font-mono text-xs text-primary">{r._elvId ?? ""}</TableCell>
                      <TableCell className="max-w-[140px] truncate text-xs">{r["Account Name"] ?? ""}</TableCell>
                      <TableCell className="font-medium max-w-[180px] truncate text-xs">
                        {r["Opportunity Name"] ?? ""}
                        {isManual && (
                          <button onClick={() => r._manualId && removeManualDeal(r._manualId)}
                            className="ml-1.5 text-destructive hover:text-destructive/80">
                            <Trash2 className="w-3 h-3 inline" />
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs tabular-nums">{fmt(r._val ?? 0)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {(r._abc ?? 0) > 0 ? fmt(r._abc ?? 0) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {(r._initials ?? 0) > 0
                          ? <span className="text-blue-500 font-medium">{fmt(r._initials ?? 0)}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {(r._services ?? 0) > 0
                          ? <span className="text-emerald-500 font-medium">{fmt(r._services ?? 0)}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">{r["Close Date"] ?? r["Close Date (2)"] ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={r._stageSummary ?? "Pipe"} /></TableCell>
                      <TableCell><CommitBadge commit={r._commit ?? ""} /></TableCell>
                      <TableCell className="text-xs">{r._month ?? ""}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {(r._push ?? 0) > 0
                          ? <span className={(r._push ?? 0) > 2 ? "text-destructive font-semibold" : "text-muted-foreground"}>{r._push}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {(!r._product || r._product === "No Match")
                          ? <QuickProductMatch deal={r} />
                          : r._product}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <RiskBadge risk={r._risk} />
                          <KeyDealBadge keyDeal={r._keyDeal} />
                          {isManual && <Badge variant="solid" accent="purple" className="text-[10px]">Manual</Badge>}
                          {isManual && r._dealType && r._dealType !== "OI and ARR" && (
                            <Badge variant="outline" className={`text-[9px] ${r._dealType === "ARR Only" ? "text-green-600 border-green-500/40" : "text-blue-500 border-blue-500/40"}`}>
                              {r._dealType}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                        {(r["Next Step"] ?? "—").substring(0, 80)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/60 font-semibold">
                  <TableCell colSpan={4} className="text-xs">
                    Totals — {filtered.length} deal{filtered.length !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {fmt(filtered.reduce((s, r) => s + (r._val ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                    {fmt(filtered.reduce((s, r) => s + (r._abc ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-blue-500">
                    {(() => {
                      const t = filtered.reduce((s, r) => s + (r._initials ?? 0), 0)
                      return t > 0 ? fmt(t) : "—"
                    })()}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-emerald-500">
                    {(() => {
                      const t = filtered.reduce((s, r) => s + (r._services ?? 0), 0)
                      return t > 0 ? fmt(t) : "—"
                    })()}
                  </TableCell>
                  <TableCell colSpan={8} />
                </TableRow>
              </TableFooter>
            </Table>
            {filtered.length > 500 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Showing 500 of {filtered.length} deals. Use filters to narrow down.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
