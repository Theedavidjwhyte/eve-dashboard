import { useState, useMemo } from "react"
import { ExternalLink, Download, Award, AlertTriangle, X } from "lucide-react"
import { MONTHS } from "@/config/months"
import { USERS } from "@/config/users"
import { ADCardModal } from "@/components/modals/ADCardModal"
import { AccountCardModal } from "@/components/modals/AccountCardModal"
import { OpportunityCardModal } from "@/components/modals/OpportunityCardModal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge, CommitBadge, RiskBadge, KeyDealBadge } from "@/components/shared/StatusBadge"
import { QuickProductMatch } from "@/components/shared/QuickProductMatch"
import { useDashboardStore } from "@/store/dashboardStore"
import { DealReviewCard } from "@/components/tabs/DealReviewsTab"
import { PRODUCT_GROUPS } from "@/config/products"
import { fmt } from "@/lib/formatters"
import { getAvatar } from "@/config/avatars"
import type { Deal } from "@/types"

type SortCol = keyof Deal | "_val" | "_abc" | "_services" | "_initials" | "_push" | "_meddpicc"
type SortDir = "asc" | "desc"

function adBorderClass(user?: string): string {
  if (!user) return ""
  const av = getAvatar(user)
  const map: Record<string, string> = {
    "7c3aed": "border-l-violet-500",
    "0ea5e9": "border-l-sky-500",
    "10b981": "border-l-emerald-500",
    "f59e0b": "border-l-amber-500",
    "6366f1": "border-l-indigo-500",
  }
  return map[av.bg] ?? "border-l-slate-400"
}

function Select({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 px-2 rounded border border-border bg-background text-xs text-foreground focus:outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export function AllDealsTab() {
  const { data, filters } = useDashboardStore()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [commitFilter, setCommitFilter] = useState("All")
  const [servicesFilter, setServicesFilter] = useState("All")
  const [productMatchFilter, setProductMatchFilter] = useState("All")
  const [meddpiccFilter, setMeddpiccFilter] = useState("All")
  const [dealTypeFilter, setDealTypeFilter] = useState("All")
  const [flagsFilter, setFlagsFilter] = useState("All")
  const [sortCol, setSortCol] = useState<SortCol>("_val")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [reviewDeal, setReviewDeal] = useState<Deal | null>(null)
  const [adCard, setAdCard] = useState<string | null>(null)
  const [accountCard, setAccountCard] = useState<string | null>(null)
  const [oppCard, setOppCard] = useState<Deal | null>(null)
  const [showDownloadWarning, setShowDownloadWarning] = useState(false)
  const [showCommissionExport, setShowCommissionExport] = useState(false)
  const [commissionPeriod, setCommissionPeriod] = useState("ytd")
  const [commissionAD, setCommissionAD] = useState("All")
  const [commissionStage, setCommissionStage] = useState("won")
  const [commissionMonth, setCommissionMonth] = useState("All")
  const [commissionQuarter, setCommissionQuarter] = useState("All")

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortCol(col); setSortDir("desc") }
  }

  const filtered = useMemo(() => {
    let rows = [...data]
    if (filters.user !== "All") {
      if (Array.isArray(filters.user)) rows = rows.filter((r) => (filters.user as string[]).includes(r.User ?? ""))
      else rows = rows.filter((r) => r.User === filters.user)
    }
    if (filters.product !== "All") rows = rows.filter((r) => r._product === filters.product)
    if (filters.group !== "All" && PRODUCT_GROUPS[filters.group]) {
      rows = rows.filter((r) => PRODUCT_GROUPS[filters.group].includes(r._product ?? ""))
    }
    if (filters.month !== "All") {
      const months = Array.isArray(filters.month) ? filters.month : [filters.month]
      rows = rows.filter((r) => months.includes(r._month ?? ""))
    }
    if (filters.quarter && filters.quarter !== "All") rows = rows.filter((r) => r._quarter === filters.quarter)
    if (statusFilter !== "All") rows = rows.filter((r) => r._stageSummary === statusFilter)
    if (commitFilter !== "All") rows = rows.filter((r) => r._commit === commitFilter)
    if (servicesFilter === "With") rows = rows.filter((r) => (r._services ?? 0) > 0)
    if (servicesFilter === "Without") rows = rows.filter((r) => !(r._services) || r._services === 0)
    if (productMatchFilter === "NoMatch") rows = rows.filter((r) => !r._product || r._product === "No Match")
    if (productMatchFilter === "Matched") rows = rows.filter((r) => r._product && r._product !== "No Match")
    if (meddpiccFilter === "Missing") rows = rows.filter((r) => r._meddpicc === undefined)
    if (dealTypeFilter === "OI") rows = rows.filter((r) => (r._val ?? 0) > 0)
    if (dealTypeFilter === "ARR") rows = rows.filter((r) => (r._abc ?? 0) > 0)
    if (dealTypeFilter === "Both") rows = rows.filter((r) => (r._val ?? 0) > 0 && (r._abc ?? 0) > 0)
    if (flagsFilter === "Split") rows = rows.filter((r) => r._isSplit)
    if (flagsFilter === "Exempt") rows = rows.filter((r) => r._isExempt)
    if (flagsFilter === "NonElevate") rows = rows.filter((r) => r._isNotElevate)
    if (flagsFilter === "NSF") rows = rows.filter((r) => r._isManual)
    if (flagsFilter === "Commission") rows = rows.filter((r) => !r._isExempt && !r._isNotElevate && (r._val ?? 0) > 0 && USERS.includes(r.User ?? ""))
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter((r) =>
        (r.User ?? "").toLowerCase().includes(s) ||
        (r["Opportunity Name"] ?? "").toLowerCase().includes(s) ||
        (r["Account Name"] ?? "").toLowerCase().includes(s) ||
        (r.Stage ?? "").toLowerCase().includes(s) ||
        (r._product ?? "").toLowerCase().includes(s) ||
        (r["Next Step"] ?? "").toLowerCase().includes(s) ||
        (r._elvId ?? "").toLowerCase().includes(s)
      )
    }
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
  }, [data, filters, search, statusFilter, commitFilter, servicesFilter, productMatchFilter, meddpiccFilter, dealTypeFilter, flagsFilter, sortCol, sortDir])

  function SortHdr({ col, label, right }: { col: SortCol; label: string; right?: boolean }) {
    const active = sortCol === col
    return (
      <TableHead
        className={`cursor-pointer select-none hover:text-foreground whitespace-nowrap ${right ? "text-right" : ""}`}
        onClick={() => toggleSort(col)}
      >
        {label}{active ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
      </TableHead>
    )
  }

  const totalVal = filtered.reduce((s, r) => s + (r._val ?? 0), 0)
  const wonCount = filtered.filter((r) => r._stageSummary === "Won").length
  const pipeCount = filtered.filter((r) => r._stageSummary === "Pipe").length
  const lostCount = filtered.filter((r) => r._stageSummary === "Lost").length
  const unmatchedCount = data.filter((r) => !r._elvId && !r._isManual).length

  const hasFilters = statusFilter !== "All" || commitFilter !== "All" || servicesFilter !== "All" ||
    productMatchFilter !== "All" || meddpiccFilter !== "All" || dealTypeFilter !== "All" || flagsFilter !== "All"

  function clearFilters() {
    setStatusFilter("All"); setCommitFilter("All"); setServicesFilter("All")
    setProductMatchFilter("All"); setMeddpiccFilter("All"); setDealTypeFilter("All"); setFlagsFilter("All")
    setSearch("")
  }

  function handleDownload() {
    if (unmatchedCount > 0) { setShowDownloadWarning(true); return }
    doDownload(filtered)
  }

  function doDownload(rows: Deal[]) {
    const headers = ["ELV ID","ELV AD","User","Account Name","Opportunity Name","OI (Split ABC)","ARR (Total ABC)","Services","Initials","Close Date","Stage","Commit","Month","Quarter","Product","MEDDPICC","Push Count","Deal Type","Split","Exempt","Not Elevate","NSF"]
    const csvRows = rows.map((r) => [
      r._elvId ?? "", r._elvAD ?? "", r.User ?? "",
      r["Account Name"] ?? "", r["Opportunity Name"] ?? "",
      r._val ?? 0, r._abc ?? 0, r._services ?? 0, r._initials ?? 0,
      r["Close Date"] ?? "", r.Stage ?? "", r._commit ?? "", r._month ?? "", r._quarter ?? "",
      r._product ?? "", r._meddpicc ?? "", r._push ?? "", r._dealType ?? "",
      r._isSplit ? "Yes" : "No", r._isExempt ? "Yes" : "No",
      r._isNotElevate ? "Yes" : "No", r._isManual ? "Yes" : "No",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    const csv = [headers.join(","), ...csvRows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `EVE-AllDeals-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    setShowDownloadWarning(false)
  }

  function doCommissionExport() {
    let rows = [...data].filter((r) => !r._isExempt && !r._isNotElevate && (r._val ?? 0) > 0 && USERS.includes(r.User ?? ""))
    if (commissionAD !== "All") rows = rows.filter((r) => r.User === commissionAD)
    if (commissionStage === "won") rows = rows.filter((r) => r._stageSummary === "Won")
    if (commissionStage === "won_commit") rows = rows.filter((r) => r._stageSummary === "Won" || (r._stageSummary === "Pipe" && r._commit === "Commit"))
    if (commissionPeriod === "month" && commissionMonth !== "All") rows = rows.filter((r) => r._month === commissionMonth)
    if (commissionPeriod === "quarter" && commissionQuarter !== "All") rows = rows.filter((r) => r._quarter === commissionQuarter)
    const headers = ["User","ELV ID","ELV AD","Account Name","Opportunity Name","OI (Split ABC)","ARR (Total ABC)","Services","Close Date","Stage","Commit","Month","Quarter","Product","Deal Type","Split","NSF"]
    const csvRows = rows.map((r) => [
      r.User ?? "", r._elvId ?? "", r._elvAD ?? "", r["Account Name"] ?? "", r["Opportunity Name"] ?? "",
      r._val ?? 0, r._abc ?? 0, r._services ?? 0, r["Close Date"] ?? "",
      r.Stage ?? "", r._commit ?? "", r._month ?? "", r._quarter ?? "",
      r._product ?? "", r._dealType ?? "", r._isSplit ? "Yes" : "No", r._isManual ? "Yes" : "No",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    const csv = [headers.join(","), ...csvRows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `EVE-Commission-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
    setShowCommissionExport(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">
                All Deals
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {filtered.length} deals · {fmt(totalVal)}
                </span>
              </CardTitle>
              {data.length > 0 && filtered.length < data.length && (
                <p className="text-xs text-amber-400 mt-0.5">
                  {data.length} total — filtered by active filters
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search deals, ELV ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 w-52 text-xs"
              />
              <button
                onClick={() => setShowCommissionExport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <Award className="w-3 h-3" />
                Commission
              </button>
              <button
                onClick={handleDownload}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${unmatchedCount > 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}
              >
                {unmatchedCount > 0 && <AlertTriangle className="w-3 h-3" />}
                <Download className="w-3 h-3" />
                Download
              </button>
            </div>
          </div>

          {/* Clean dropdown filters */}
          <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-border mt-3">
            <Select
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "All", label: "All Status" },
                { value: "Pipe", label: `Pipe (${pipeCount})` },
                { value: "Won", label: `Won (${wonCount})` },
                { value: "Lost", label: `Lost (${lostCount})` },
              ]}
            />
            <Select
              label="Commit"
              value={commitFilter}
              onChange={setCommitFilter}
              options={[
                { value: "All", label: "All Commit" },
                { value: "Commit", label: "Commit" },
                { value: "Pipeline", label: "Pipeline" },
                { value: "Upside", label: "Upside" },
              ]}
            />
            <Select
              label="Type"
              value={dealTypeFilter}
              onChange={setDealTypeFilter}
              options={[
                { value: "All", label: "All Types" },
                { value: "OI", label: "OI Only" },
                { value: "ARR", label: "ARR Only" },
                { value: "Both", label: "OI + ARR" },
              ]}
            />
            <Select
              label="Services"
              value={servicesFilter}
              onChange={setServicesFilter}
              options={[
                { value: "All", label: "All" },
                { value: "With", label: "With Services" },
                { value: "Without", label: "Without" },
              ]}
            />
            <Select
              label="Product Match"
              value={productMatchFilter}
              onChange={setProductMatchFilter}
              options={[
                { value: "All", label: "All" },
                { value: "NoMatch", label: "⚠ No Match" },
                { value: "Matched", label: "✓ Matched" },
              ]}
            />
            <Select
              label="MEDDPICC"
              value={meddpiccFilter}
              onChange={setMeddpiccFilter}
              options={[
                { value: "All", label: "All" },
                { value: "Missing", label: "✗ Missing" },
              ]}
            />
            <Select
              label="Flags"
              value={flagsFilter}
              onChange={setFlagsFilter}
              options={[
                { value: "All", label: "All Deals" },
                { value: "Split", label: "⇌ Split" },
                { value: "Exempt", label: "⊘ Exempt" },
                { value: "NonElevate", label: "✕ Non-ELV" },
                { value: "NSF", label: "◈ NSF" },
                { value: "Commission", label: "★ Commission" },
              ]}
            />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors self-end"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
            <span className="ml-auto text-xs text-muted-foreground self-end">{filtered.length} of {data.length} deals</span>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">DR</TableHead>
                  <SortHdr col="_elvId" label="ELV ID" />
                  <SortHdr col="_elvAD" label="ELV AD" />
                  <SortHdr col="User" label="User" />
                  <SortHdr col="Account Name" label="Account" />
                  <SortHdr col="Opportunity Name" label="Opportunity" />
                  <SortHdr col="_val" label="OI (Split)" right />
                  <SortHdr col="_abc" label="ARR (Total)" right />
                  <SortHdr col="_initials" label="Initials" right />
                  <SortHdr col="_services" label="Services" right />
                  <SortHdr col="Close Date" label="Close" />
                  <SortHdr col="_stageSummary" label="Status" />
                  <SortHdr col="_commit" label="Commit" />
                  <SortHdr col="_month" label="Month" />
                  <SortHdr col="_push" label="Pushes" right />
                  <SortHdr col="_product" label="Product" />
                  <SortHdr col="_meddpicc" label="MEDDPICC" right />
                  <TableHead>Flags</TableHead>
                  <TableHead className="min-w-[160px]">Next Steps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 500).map((r, i) => {
                  const isNSF = r._isManual
                  const av = r.User ? getAvatar(r.User) : null
                  const borderClass = adBorderClass(r.User)
                  const oppId = (r._manualId ?? r["Opportunity ID"] ?? r["Opportunity Name"] ?? "") as string
                  return (
                    <TableRow key={i} className={`border-l-2 ${borderClass} ${isNSF ? "opacity-90" : ""}`}>
                      {/* Deal Review button */}
                      <TableCell>
                        {r._stageSummary !== "Won" && r._stageSummary !== "Lost" ? (
                          <button
                            onClick={() => setReviewDeal(r)}
                            className="flex items-center justify-center w-7 h-7 rounded transition-colors hover:border-primary border border-border text-muted-foreground hover:text-primary"
                            title="Deal Review"
                          >
                            <span className="text-[9px] font-bold">DR</span>
                          </button>
                        ) : <span className="text-muted-foreground/30 text-[10px]">—</span>}
                      </TableCell>

                      {/* ELV ID */}
                      <TableCell className="text-xs font-mono">
                        {r._elvId ? (
                          <span className="bg-muted/60 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-foreground">
                            {r._elvId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-[10px]">—</span>
                        )}
                      </TableCell>

                      {/* ELV AD */}
                      <TableCell className="text-xs">
                        {r._elvAD ? (
                          (() => {
                            const elvAv = getAvatar(r._elvAD)
                            return (
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-black shrink-0"
                                  style={{ backgroundColor: `#${elvAv.bg}` }}
                                >
                                  {elvAv.initials}
                                </div>
                                <span className="text-xs text-muted-foreground">{r._elvAD.split(" ")[0]}</span>
                              </div>
                            )
                          })()
                        ) : (
                          <span className="text-muted-foreground/40 text-[10px]">—</span>
                        )}
                      </TableCell>

                      {/* User */}
                      <TableCell className="font-medium">
                        <button
                          onClick={() => r.User && setAdCard(r.User)}
                          className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group"
                          title={`View ${r.User} summary`}
                        >
                          {av && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0"
                              style={{ backgroundColor: `#${av.bg}` }}
                            >
                              {av.initials}
                            </div>
                          )}
                          <span className="text-xs group-hover:underline">{(r.User ?? "").split(" ")[0]}</span>
                        </button>
                      </TableCell>

                      {/* Account */}
                      <TableCell className="max-w-[130px]">
                        <button
                          onClick={() => r["Account Name"] && setAccountCard(r["Account Name"] as string)}
                          className="text-xs text-left truncate hover:text-primary hover:underline transition-colors w-full block"
                          title={r["Account Name"] as string}
                        >
                          {r["Account Name"] ?? ""}
                        </button>
                      </TableCell>

                      {/* Opportunity */}
                      <TableCell className="font-medium max-w-[200px] text-xs">
                        <button
                          onClick={() => setOppCard(r)}
                          className="truncate text-left hover:text-primary hover:underline transition-colors flex items-center gap-1 group w-full"
                          title="Click to view opportunity details"
                        >
                          <span className="truncate">{r["Opportunity Name"] ?? ""}</span>
                          <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                        </button>
                      </TableCell>

                      <TableCell className="text-right font-bold text-xs tabular-nums">{fmt(r._val ?? 0)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{(r._abc ?? 0) > 0 ? fmt(r._abc ?? 0) : "—"}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{(r._initials ?? 0) > 0 ? <span className="text-blue-500 font-medium">{fmt(r._initials ?? 0)}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{(r._services ?? 0) > 0 ? <span className="text-emerald-500 font-medium">{fmt(r._services ?? 0)}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
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
                      <TableCell className="text-right text-xs tabular-nums">
                        {r._meddpicc !== undefined
                          ? <span className={`font-semibold ${r._meddpicc >= 70 ? "text-emerald-400" : r._meddpicc >= 40 ? "text-yellow-400" : "text-red-400"}`}>{r._meddpicc}%</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <RiskBadge risk={r._risk} />
                          <KeyDealBadge keyDeal={r._keyDeal} />
                          {r._isSplit && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">⇌ SPLIT</span>}
                          {r._isExempt && !r._isNotElevate && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">⊘ EXEMPT</span>}
                          {r._isNotElevate && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">✕ NON-ELV</span>}
                          {isNSF && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">◈ NSF</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                        {(r["Next Step"] ?? "—").replace(/^⚡ NSF \| ?/, "").substring(0, 80)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/60 font-semibold">
                  <TableCell colSpan={6} className="text-xs">
                    Totals — {filtered.length} deal{filtered.length !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmt(filtered.reduce((s, r) => s + (r._val ?? 0), 0))}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{fmt(filtered.reduce((s, r) => s + (r._abc ?? 0), 0))}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-blue-500">{(() => { const t = filtered.reduce((s, r) => s + (r._initials ?? 0), 0); return t > 0 ? fmt(t) : "—" })()}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-emerald-500">{(() => { const t = filtered.reduce((s, r) => s + (r._services ?? 0), 0); return t > 0 ? fmt(t) : "—" })()}</TableCell>
                  <TableCell colSpan={9} />
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

      {/* Deal Review Panel */}
      {reviewDeal && <DealReviewCard deal={reviewDeal} onClose={() => setReviewDeal(null)} />}

      {/* Modals */}
      <ADCardModal name={adCard} onClose={() => setAdCard(null)} />
      <AccountCardModal accountName={accountCard} onClose={() => setAccountCard(null)} />
      <OpportunityCardModal deal={oppCard} onClose={() => setOppCard(null)} />

      {/* Download Warning */}
      {showDownloadWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDownloadWarning(false)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Unmatched ELV IDs</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="text-amber-400 font-bold">{unmatchedCount} deals</span> are not yet matched to an ELV ID.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDownloadWarning(false)} className="px-4 py-2 rounded text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={() => doDownload(filtered)} className="px-4 py-2 rounded text-sm bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Download Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commission Export */}
      {showCommissionExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCommissionExport(false)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-foreground">Commission Export</h3>
              </div>
              <button onClick={() => setShowCommissionExport(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Account Director</label>
                <div className="flex flex-wrap gap-1">
                  {["All", ...USERS].map((u) => (
                    <button key={u} onClick={() => setCommissionAD(u)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${commissionAD === u ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                      {u === "All" ? "All ADs" : u.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Include</label>
                <div className="flex gap-1">
                  {[["won","Won Only"],["won_commit","Won + Commit"]].map(([v,l]) => (
                    <button key={v} onClick={() => setCommissionStage(v)}
                      className={`px-2.5 py-1 rounded text-xs border transition-colors ${commissionStage === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Period</label>
                <div className="flex gap-1 mb-2">
                  {[["ytd","Full Year"],["month","By Month"],["quarter","By Quarter"]].map(([v,l]) => (
                    <button key={v} onClick={() => setCommissionPeriod(v)}
                      className={`px-2.5 py-1 rounded text-xs border transition-colors ${commissionPeriod === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {commissionPeriod === "month" && (
                  <div className="flex flex-wrap gap-1">
                    {["All",...MONTHS].map((m) => (
                      <button key={m} onClick={() => setCommissionMonth(m)}
                        className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${commissionMonth === m ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                {commissionPeriod === "quarter" && (
                  <div className="flex gap-1">
                    {["All","Q1","Q2","Q3","Q4"].map((q) => (
                      <button key={q} onClick={() => setCommissionQuarter(q)}
                        className={`px-2.5 py-1 rounded text-xs border transition-colors ${commissionQuarter === q ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowCommissionExport(false)} className="px-4 py-2 rounded text-sm border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={doCommissionExport} className="px-4 py-2 rounded text-sm bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
