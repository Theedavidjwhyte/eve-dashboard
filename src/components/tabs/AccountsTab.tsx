import { useState, useRef, useMemo } from "react"
import Papa from "papaparse"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/ui/kpi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { useDashboardStore } from "@/store/dashboardStore"
import { getAccountMatch, isNonElevate } from "@/lib/accountMatch"
import { fmt } from "@/lib/formatters"
import { USERS } from "@/config/users"
import { openDealModal } from "@/App"
import { downloadCSV } from "@/lib/exportHelpers"
import type { AccountMatch } from "@/types"

export function AccountsTab() {
  const { data, accountMatch, setAccountMatch, addAccountMatch } = useDashboardStore()
  const [search, setSearch] = useState("")
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [qaForm, setQaForm] = useState({ code: "", account: "", parent: "", owner: USERS[0], elv: "" })
  const fileRef = useRef<HTMLInputElement>(null)

  // Match stats
  const matchedDeals = useMemo(
    () => data.filter((d) => d["Account Name"] && getAccountMatch(d["Account Name"], accountMatch)),
    [data, accountMatch]
  )
  const unmatchedDeals = useMemo(
    () => data.filter((d) => d["Account Name"] && !getAccountMatch(d["Account Name"], accountMatch)),
    [data, accountMatch]
  )
  const matchRate = data.length > 0 ? matchedDeals.length / data.length : 0
  const uniqueUnmatched = [...new Set(unmatchedDeals.map((d) => d["Account Name"]))]
    .filter(Boolean) as string[]
  const nonElvAccounts = uniqueUnmatched.filter((name) => isNonElevate(name))
  const needsMatching = uniqueUnmatched.filter((name) => !isNonElevate(name))

  // Filtered reference table
  const filtered = useMemo(() => {
    if (!search.trim()) return accountMatch
    const s = search.toLowerCase()
    return accountMatch.filter(
      (r) =>
        r.c.toLowerCase().includes(s) ||
        r.a.toLowerCase().includes(s) ||
        r.p.toLowerCase().includes(s) ||
        r.o.toLowerCase().includes(s) ||
        r.e.toLowerCase().includes(s)
    )
  }, [accountMatch, search])

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = Papa.parse<Record<string, string>>(ev.target?.result as string, { header: true, skipEmptyLines: true })
        const rows: AccountMatch[] = parsed.data.map((row) => ({
          c: (row["Account Code"] ?? row["code"] ?? "").trim(),
          o: (row["Owner"] ?? row["owner"] ?? "").trim(),
          a: (row["Account Name"] ?? row["account"] ?? "").trim(),
          p: (row["Parent Account"] ?? row["parent"] ?? "").trim(),
          e: (row["ELV ID"] ?? row["elvId"] ?? "").trim(),
          ea: (row["ELV AD"] ?? row["elvAD"] ?? "").trim(),
        })).filter((r) => r.a)
        setAccountMatch(rows)
      } catch {}
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  function handleExport() {
    let csv = `"Account Code","Account Name","Parent Account","Owner","ELV ID","ELV AD"\n`
    accountMatch.forEach((r) => {
      csv += `"${r.c}","${r.a.replace(/"/g, '""')}","${r.p.replace(/"/g, '""')}","${r.o}","${r.e}","${r.ea}"\n`
    })
    downloadCSV(`Account_Match_${new Date().toISOString().split("T")[0]}.csv`, csv)
  }

  function handleQuickAdd() {
    if (!qaForm.account.trim()) return
    const entry: AccountMatch = {
      c: qaForm.code || "QA_" + Date.now().toString(36).toUpperCase(),
      o: qaForm.owner,
      a: qaForm.account.trim(),
      p: qaForm.parent || qaForm.account.trim(),
      e: qaForm.elv,
      ea: qaForm.owner,
    }
    addAccountMatch(entry)
    setQaForm({ code: "", account: "", parent: "", owner: USERS[0], elv: "" })
    setShowQuickAdd(false)
  }

  const uniqueElv = [...new Set(accountMatch.map((r) => r.e).filter(Boolean))].length

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Reference Accounts" value={String(accountMatch.length)} period={`${uniqueElv} ELV IDs`} accent="info" />
        <div className="cursor-pointer" onClick={() => openDealModal("Matched Deals", matchedDeals)}>
          <KPI label="Match Rate" value={Math.round(matchRate * 100) + "%"} period={`${matchedDeals.length} of ${data.length} deals`}
            accent={matchRate >= 0.7 ? "sap" : matchRate >= 0.4 ? "warning" : "destructive"} />
        </div>
        <div className="cursor-pointer" onClick={() => openDealModal("Needs Matching", unmatchedDeals.filter((d) => !isNonElevate(d["Account Name"] ?? "")))}>
          <KPI label="Needs Matching" value={String(needsMatching.length)} period="Accounts without ELV ID" accent="warning" />
        </div>
        <div className="cursor-pointer" onClick={() => openDealModal("Not Elevate", unmatchedDeals.filter((d) => isNonElevate(d["Account Name"] ?? "")))}>
          <KPI label="Not Elevate" value={String(nonElvAccounts.length)} period="No ELV ID required" accent="teal" />
        </div>
      </div>

      {/* Reference table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Account Reference Table</CardTitle>
            <div className="flex gap-2 items-center flex-wrap">
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-7 w-40 text-xs" />
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowQuickAdd((v) => !v)}>+ Quick Add</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExport}>Export</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fileRef.current?.click()}>Import</Button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showQuickAdd && (
            <div className="bg-muted rounded-lg p-4 mb-4 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-3">Quick Add Account</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                <div>
                  <label className="text-[10px] text-muted-foreground">Account Name *</label>
                  <Input value={qaForm.account} onChange={(e) => setQaForm((s) => ({ ...s, account: e.target.value }))} placeholder="Company name..." className="h-7 text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Parent Account</label>
                  <Input value={qaForm.parent} onChange={(e) => setQaForm((s) => ({ ...s, parent: e.target.value }))} placeholder="Group name..." className="h-7 text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">ELV ID</label>
                  <Input value={qaForm.elv} onChange={(e) => setQaForm((s) => ({ ...s, elv: e.target.value }))} placeholder="ELV200..." className="h-7 text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Account Code</label>
                  <Input value={qaForm.code} onChange={(e) => setQaForm((s) => ({ ...s, code: e.target.value }))} placeholder="ABC001..." className="h-7 text-xs mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Owner (AD)</label>
                  <select value={qaForm.owner} onChange={(e) => setQaForm((s) => ({ ...s, owner: e.target.value }))}
                    className="w-full h-7 text-xs rounded border bg-card px-1.5 mt-0.5">
                    {USERS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={handleQuickAdd} disabled={!qaForm.account.trim()}>Add Account</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
              </div>
            </div>
          )}
          <div className="overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Parent Account</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>ELV ID</TableHead>
                  <TableHead>ELV AD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs font-semibold">{r.c}</TableCell>
                    <TableCell className="font-medium text-xs">{r.a}</TableCell>
                    <TableCell className="text-xs">{r.p}</TableCell>
                    <TableCell className="text-xs">{r.o.split(" ")[0]}</TableCell>
                    <TableCell className="font-mono text-xs text-primary">{r.e}</TableCell>
                    <TableCell className="text-xs">{r.ea.split(" ")[0]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Needs matching */}
      {needsMatching.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-amber-600 dark:text-amber-400">Needs Matching ({needsMatching.length} accounts)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Accounts with deals but no ELV ID. Click a row to see their deals.</p>
            <div className="overflow-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Deals</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>AD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needsMatching.map((name) => {
                    const deals = unmatchedDeals.filter((d) => d["Account Name"] === name)
                    const val = deals.reduce((s, d) => s + (d._val ?? 0), 0)
                    const ad = deals[0]?.User ?? ""
                    return (
                      <TableRow key={name} className="cursor-pointer" onClick={() => openDealModal(name, deals)}>
                        <TableCell className="font-medium text-xs text-amber-600 dark:text-amber-400">{name}</TableCell>
                        <TableCell className="text-right text-xs">{deals.length}</TableCell>
                        <TableCell className="text-right text-xs">{fmt(val)}</TableCell>
                        <TableCell className="text-xs">{ad.split(" ")[0]}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
