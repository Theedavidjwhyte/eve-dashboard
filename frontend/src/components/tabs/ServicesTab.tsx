import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { KPI } from "@/components/ui/kpi"
import { PctBar } from "@/components/shared/PctBar"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useDashboardStore, getSelectedMonths } from "@/store/dashboardStore"
import type { Deal } from "@/types"
import { fmt, fmtPct } from "@/lib/formatters"
import { USERS } from "@/config/users"
import { openDealModal } from "@/lib/modalBus"
import { getServicesPipeInsight, getServicesWonInsight } from "@/lib/servicesInsights"
import { ADCardModal } from "@/components/modals/ADCardModal"

function Pill({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded-full text-xs border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
      {children}
    </button>
  )
}

type SvcReqValue = "yes" | "no" | "included" | ""

export function ServicesTab() {
  const { data, filters, svcRequired, setSvcRequiredFlag } = useDashboardStore()
  const [statusFilter, setStatusFilter] = useState("All")
  const [commitFilter, setCommitFilter] = useState("All")
  const [svcFilter, setSvcFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [adCard, setAdCard] = useState<string | null>(null)
  const [dealCard, setDealCard] = useState<Deal | null>(null)

  const selectedMonths = getSelectedMonths(filters.month)

  const allDeals = useMemo(() => {
    return data.filter(
      (r) =>
        r._stageSummary !== "Lost" &&
        (filters.month === "All" || selectedMonths.includes(r._month ?? "")) &&
        (filters.user === "All" || r.User === filters.user) &&
        (filters.product === "All" || r._product === filters.product)
    )
  }, [data, filters, selectedMonths])

  const pipeDeals = allDeals.filter((r) => r._stageSummary === "Pipe")
  const wonDeals = allDeals.filter((r) => r._stageSummary === "Won")
  const pipeWithSvc = pipeDeals.filter((r) => (r._services ?? 0) > 0)
  const wonWithSvc = wonDeals.filter((r) => (r._services ?? 0) > 0)
  const pipeNoSvc = pipeDeals.filter((r) => !(r._services) && (r._val ?? 0) > 15000)
  const wonNoSvc = wonDeals.filter((r) => !(r._services) && (r._val ?? 0) > 15000)
  const totalPipeSvc = pipeWithSvc.reduce((s, r) => s + (r._services ?? 0), 0)
  const totalWonSvc = wonWithSvc.reduce((s, r) => s + (r._services ?? 0), 0)
  const attachRate = wonDeals.length > 0 ? wonWithSvc.length / wonDeals.length : 0

  // Breakdown by commit
  const commitDeals = pipeDeals.filter((r) => r._commit === "Commit")
  const upsideDeals = pipeDeals.filter((r) => r._commit === "Upside")
  const commitSvc = commitDeals.reduce((s, r) => s + (r._services ?? 0), 0)
  const upsideSvc = upsideDeals.reduce((s, r) => s + (r._services ?? 0), 0)

  function toggleSvcRequired(oppName: string) {
    const cycle: Record<SvcReqValue, SvcReqValue> = { "": "yes", yes: "no", no: "included", included: "" }
    const current = (svcRequired[oppName] ?? "") as SvcReqValue
    setSvcRequiredFlag(oppName, cycle[current])
  }

  function svcReqBadge(oppName: string) {
    const val = svcRequired[oppName] ?? ""
    if (val === "yes") return <Badge variant="solid" accent="sap" className="cursor-pointer text-[10px]" onClick={() => toggleSvcRequired(oppName)}>Yes</Badge>
    if (val === "no") return <Badge variant="destructive" className="cursor-pointer text-[10px]" onClick={() => toggleSvcRequired(oppName)}>No</Badge>
    if (val === "included") return <Badge variant="solid" accent="warning" className="cursor-pointer text-[10px]" onClick={() => toggleSvcRequired(oppName)}>Included</Badge>
    return <span className="text-xs text-muted-foreground cursor-pointer hover:text-primary" onClick={() => toggleSvcRequired(oppName)}>Set</span>
  }

  // Filtered table rows
  const filtered = useMemo(() => {
    let rows = [...allDeals]
    if (statusFilter === "Pipe") rows = rows.filter((r) => r._stageSummary === "Pipe")
    else if (statusFilter === "Won") rows = rows.filter((r) => r._stageSummary === "Won")
    if (commitFilter !== "All") rows = rows.filter((r) => r._commit === commitFilter)
    if (svcFilter === "With") rows = rows.filter((r) => (r._services ?? 0) > 0)
    else if (svcFilter === "Without") rows = rows.filter((r) => !(r._services) || r._services === 0)
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          (r.User ?? "").toLowerCase().includes(s) ||
          (r["Opportunity Name"] ?? "").toLowerCase().includes(s) ||
          (r["Account Name"] ?? "").toLowerCase().includes(s)
      )
    }
    return rows.sort((a, b) => (b._services ?? 0) - (a._services ?? 0) || (b._val ?? 0) - (a._val ?? 0))
  }, [allDeals, statusFilter, commitFilter, svcFilter, search])

  // Insights
  const insights: { text: string; col: string }[] = []
  const bigNoSvc = pipeNoSvc.filter((r) => (r._val ?? 0) >= 30000)
  const nearCloseNoSvc = pipeNoSvc.filter((r) => ["Negotiation", "Decision", "Commitment"].includes(r.Stage ?? ""))
  if (bigNoSvc.length > 0) insights.push({ col: "text-destructive", text: `${bigNoSvc.length} large deals (>£30k) missing services worth ${fmt(bigNoSvc.reduce((s, r) => s + (r._val ?? 0), 0))} — scope before close` })
  if (nearCloseNoSvc.length > 0) insights.push({ col: "text-amber-600 dark:text-amber-400", text: `${nearCloseNoSvc.length} near-close deals in Negotiation/Decision/Commitment missing services — last chance to add` })
  if (wonNoSvc.length > 0) insights.push({ col: "text-amber-600 dark:text-amber-400", text: `${wonNoSvc.length} won deals >£15k without services — upsell opportunity worth ${fmt(wonNoSvc.reduce((s, r) => s + (r._val ?? 0), 0))}` })
  if (insights.length === 0) insights.push({ col: "text-emerald-600 dark:text-emerald-400", text: "Services coverage looks healthy. Keep scoping services on every deal >£15k." })

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cursor-pointer" onClick={() => openDealModal("Pipeline Services", pipeWithSvc)}>
          <KPI label="Pipeline Services" value={fmt(totalPipeSvc)} period={`${pipeWithSvc.length} deals with services`} accent="info" />
        </div>
        <div className="cursor-pointer" onClick={() => openDealModal("Won Services", wonWithSvc)}>
          <KPI label="Won Services" value={fmt(totalWonSvc)} period={`${wonWithSvc.length} deals · ${fmtPct(attachRate)} attach rate`} accent="sap" />
        </div>
        <div className="cursor-pointer" onClick={() => openDealModal("Missing Services", [...pipeNoSvc, ...wonNoSvc])}>
          <KPI label="Missing Services" value={String(pipeNoSvc.length + wonNoSvc.length)} period="Deals >£15k with no services" accent="destructive" />
        </div>
        <KPI label="Total Services" value={fmt(totalPipeSvc + totalWonSvc)} period="Pipe + Won combined" accent="teal" />
      </div>

      {/* Commit breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Commit Services", val: commitSvc, deals: commitDeals.filter((r) => r._services).length, total: commitDeals.length, accent: "info" as const },
          { label: "Upside Services", val: upsideSvc, deals: upsideDeals.filter((r) => r._services).length, total: upsideDeals.length, accent: "purple" as const },
        ].map(({ label, val, deals, total, accent }) => (
          <Card key={label} className="border-l-4 border-l-primary">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-xl font-bold">{fmt(val)}</p>
              <p className="text-xs text-muted-foreground">{deals} of {total} deals · {total > 0 ? fmtPct(deals / total) : "0%"} attach</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Insights */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Services Insights</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${ins.col.includes("destructive") ? "bg-red-500" : ins.col.includes("amber") ? "bg-amber-500" : "bg-emerald-500"}`} />
              <span className={`leading-relaxed ${ins.col}`}>{ins.text}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Deal table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm">
              All Deals
              <span className="text-xs font-normal text-muted-foreground ml-2">
                {filtered.length} deals · {fmt(filtered.reduce((s, r) => s + (r._val ?? 0), 0))} value · {fmt(filtered.reduce((s, r) => s + (r._services ?? 0), 0))} services
              </span>
            </CardTitle>
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-7 w-48 text-xs" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-4 mb-3 pb-3 border-b">
            {[
              { label: "Status", options: ["All", "Pipe", "Won"], value: statusFilter, set: setStatusFilter },
              { label: "Commit", options: ["All", "Commit", "Pipeline", "Upside"], value: commitFilter, set: setCommitFilter },
              { label: "Services", options: ["All", "With", "Without"], value: svcFilter, set: setSvcFilter },
            ].map(({ label, options, value, set }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
                <div className="flex gap-1">
                  {options.map((o) => <Pill key={o} active={value === o} onClick={() => set(o)}>{o}</Pill>)}
                </div>
              </div>
            ))}
          </div>
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AD</TableHead>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Services</TableHead>
                  <TableHead>Svc Req</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commit</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => {
                  const hasSvc = (r._services ?? 0) > 0
                  const missingBig = !hasSvc && (r._val ?? 0) > 15000
                  return (
                    <TableRow key={i}>
                      <TableCell
                        className="font-medium text-xs cursor-pointer text-primary hover:underline"
                        onClick={() => setAdCard(r.User ?? null)}
                      >{(r.User ?? "").split(" ")[0]}</TableCell>
                      <TableCell
                        className="text-xs font-medium max-w-[160px] truncate cursor-pointer hover:text-primary"
                        onClick={() => setDealCard(r)}
                      >{r["Opportunity Name"] ?? ""}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{r["Account Name"] ?? ""}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{fmt(r._val ?? 0)}</TableCell>
                      <TableCell className="text-right text-xs">
                        {hasSvc ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(r._services ?? 0)}</span>
                        ) : missingBig ? (
                          <span className="font-bold text-destructive">None</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{svcReqBadge(r["Opportunity Name"] ?? "")}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${r._stageSummary === "Won" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                          {r._stageSummary ?? ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{r._commit ?? ""}</TableCell>
                      <TableCell className="text-xs">{r._month ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.Stage ?? ""}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* AD Card Modal */}
      <ADCardModal name={adCard} onClose={() => setAdCard(null)} />

      {/* Deal Card Modal */}
      {dealCard && (
        <Dialog open onOpenChange={() => setDealCard(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold truncate">{dealCard["Opportunity Name"]}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {[
                ["Account", dealCard["Account Name"]],
                ["AD", dealCard.User],
                ["Stage", dealCard.Stage],
                ["Value", fmt(dealCard._val ?? 0)],
                ["Services", fmt(dealCard._services ?? 0)],
                ["Commit", dealCard._commit],
                ["Product", dealCard._product],
                ["Close Date", dealCard["Close Date"]],
                ["Month", dealCard._month],
                ["Next Step", dealCard["Next Step"]],
              ].map(([label, value]) => value ? (
                <div key={label} className="flex justify-between gap-4 border-b pb-2 last:border-0">
                  <span className="text-muted-foreground text-xs">{label}</span>
                  <span className="text-xs font-medium text-right max-w-[60%]">{String(value)}</span>
                </div>
              ) : null)}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
