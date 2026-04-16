import { useState, useRef, useMemo, useCallback } from "react"
import Papa from "papaparse"
import { Pencil, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPI } from "@/components/ui/kpi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { useDashboardStore } from "@/store/dashboardStore"
import { getAccountMatch, isNonElevate } from "@/lib/accountMatch"
import { ELV_ACCOUNTS, UNIQUE_ELV_PARENTS } from "@/config/elvAccounts"
import { fmt } from "@/lib/formatters"
import { USERS } from "@/config/users"
import { openDealModal } from "@/lib/modalBus"
import { downloadCSV } from "@/lib/exportHelpers"
import type { AccountMatch } from "@/types"

// ── Searchable ELV ID Dropdown ────────────────────────────────────────────────
function ELVDropdown({
  value,
  onChange,
  placeholder = "Search ELV ID or account...",
  className = "",
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!query.trim()) return UNIQUE_ELV_PARENTS.slice(0, 30)
    const q = query.toLowerCase()
    return UNIQUE_ELV_PARENTS.filter(
      (e) =>
        e.elvId.toLowerCase().includes(q) ||
        e.parentAccount.toLowerCase().includes(q) ||
        e.elvAD.toLowerCase().includes(q)
    ).slice(0, 30)
  }, [query])

  return (
    <div className={`relative ${className}`}>
      <Input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="h-7 text-xs"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((e) => (
            <button
              key={e.elvId}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2"
              onMouseDown={() => {
                onChange(e.elvId)
                setQuery(e.elvId)
                setOpen(false)
              }}
            >
              <span className="font-mono text-primary font-semibold w-16 shrink-0">{e.elvId}</span>
              <span className="font-medium truncate">{e.parentAccount}</span>
              <span className="text-muted-foreground text-[10px] shrink-0">{e.elvAD.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AccountsTab() {
  const { data, accountMatch, setAccountMatch, addAccountMatch } = useDashboardStore()
  const [search, setSearch] = useState("")
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [qaForm, setQaForm] = useState({ code: "", account: "", parent: "", owner: USERS[0], elv: "" })
  const [matchingAccount, setMatchingAccount] = useState<string | null>(null)
  const [matchForm, setMatchForm] = useState({ elv: "", parent: "", code: "", owner: USERS[0] })
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<AccountMatch | null>(null)
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

  const handleInlineMatch = useCallback((accountName: string) => {
    setMatchingAccount(accountName)
    setMatchForm({ elv: "", parent: "", code: "", owner: USERS[0] })
  }, [])

  function handleSaveMatch() {
    if (!matchingAccount || !matchForm.elv.trim()) return
    const elvMatch = ELV_ACCOUNTS.find(
      (e) => e.elvId.toLowerCase() === matchForm.elv.trim().toLowerCase()
    )
    const entry: AccountMatch = {
      c: elvMatch?.accountCode || "QA_" + Date.now().toString(36).toUpperCase(),
      o: elvMatch?.elvAD || matchForm.owner,
      a: matchingAccount,
      p: elvMatch?.parentAccount || matchingAccount,
      e: matchForm.elv.trim(),
      ea: elvMatch?.elvAD || matchForm.owner,
    }
    addAccountMatch(entry)
    setMatchingAccount(null)
    setMatchForm({ elv: "", parent: "", code: "", owner: USERS[0] })
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

  function startEdit(i: number) {
    setEditingRow(i)
    setEditForm({ ...filtered[i] })
  }

  function saveEdit() {
    if (!editForm || editingRow === null) return
    const updated = accountMatch.map((r, i) => {
      const fi = filtered[editingRow]
      return r.c === fi.c && r.a === fi.a ? editForm : r
    })
    setAccountMatch(updated)
    setEditingRow(null)
    setEditForm(null)
  }

  function cancelEdit() {
    setEditingRow(null)
    setEditForm(null)
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
        <div className="cursor-pointer" onClick={() => openDealModal("Match Required", unmatchedDeals.filter((d) => !isNonElevate(d["Account Name"] ?? "")))}>
          <KPI label="Match Required" value={String(needsMatching.length)} period="Accounts without ELV ID" accent="warning" />
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
                  <ELVDropdown
                    value={qaForm.elv}
                    onChange={(val) => setQaForm((s) => ({ ...s, elv: val }))}
                    placeholder="Search ELV ID..."
                    className="mt-0.5"
                  />
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
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Parent Account</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>ELV ID</TableHead>
                  <TableHead>ELV AD</TableHead>
                  <TableHead className="w-16">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={i} className={editingRow === i ? "bg-primary/5 border-primary/20" : ""}>
                    {editingRow === i && editForm ? (
                      <>
                        <TableCell><Input value={editForm.c} onChange={(e) => setEditForm((f) => f ? { ...f, c: e.target.value } : f)} className="h-6 text-xs w-24" /></TableCell>
                        <TableCell><Input value={editForm.a} onChange={(e) => setEditForm((f) => f ? { ...f, a: e.target.value } : f)} className="h-6 text-xs w-40" /></TableCell>
                        <TableCell><Input value={editForm.p} onChange={(e) => setEditForm((f) => f ? { ...f, p: e.target.value } : f)} className="h-6 text-xs w-32" /></TableCell>
                        <TableCell>
                          <select value={editForm.o} onChange={(e) => setEditForm((f) => f ? { ...f, o: e.target.value } : f)}
                            className="h-6 text-xs rounded border bg-card px-1 w-28">
                            {USERS.map((u) => <option key={u}>{u}</option>)}
                          </select>
                        </TableCell>
                        <TableCell>
                          <ELVDropdown
                            value={editForm.e}
                            onChange={(val) => {
                              const match = ELV_ACCOUNTS.find(a => a.elvId === val)
                              setEditForm((f) => f ? { ...f, e: val, ea: match?.elvAD || f.ea, p: match?.parentAccount || f.p } : f)
                            }}
                            className="w-36"
                          />
                        </TableCell>
                        <TableCell><Input value={editForm.ea} onChange={(e) => setEditForm((f) => f ? { ...f, ea: e.target.value } : f)} className="h-6 text-xs w-28" /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <button onClick={saveEdit} className="text-emerald-500 hover:text-emerald-400"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={cancelEdit} className="text-destructive hover:text-destructive/80"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-mono text-xs font-semibold">{r.c}</TableCell>
                        <TableCell className="font-medium text-xs">{r.a}</TableCell>
                        <TableCell className="text-xs">{r.p}</TableCell>
                        <TableCell className="text-xs">{r.o.split(" ")[0]}</TableCell>
                        <TableCell className="font-mono text-xs text-primary">{r.e}</TableCell>
                        <TableCell className="text-xs">{r.ea.split(" ")[0]}</TableCell>
                        <TableCell>
                          <button onClick={() => startEdit(i)} className="text-muted-foreground hover:text-primary transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Match Required */}
      {needsMatching.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-amber-600 dark:text-amber-400">
                Match Required ({needsMatching.length} accounts)
              </CardTitle>
              <span className="text-xs text-muted-foreground">Click "Match" to assign ELV ID inline</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Deals</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>AD</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needsMatching.map((name) => {
                    const deals = unmatchedDeals.filter((d) => d["Account Name"] === name)
                    const val = deals.reduce((s, d) => s + (d._val ?? 0), 0)
                    const ad = deals[0]?.User ?? ""
                    const isMatching = matchingAccount === name
                    return (
                      <>
                        <TableRow key={name} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium text-xs text-amber-600 dark:text-amber-400" onClick={() => openDealModal(name, deals)}>{name}</TableCell>
                          <TableCell className="text-right text-xs" onClick={() => openDealModal(name, deals)}>{deals.length}</TableCell>
                          <TableCell className="text-right text-xs" onClick={() => openDealModal(name, deals)}>{fmt(val)}</TableCell>
                          <TableCell className="text-xs" onClick={() => openDealModal(name, deals)}>{ad.split(" ")[0]}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant={isMatching ? "default" : "outline"} className="h-6 text-xs px-2"
                              onClick={(e) => { e.stopPropagation(); isMatching ? setMatchingAccount(null) : handleInlineMatch(name) }}>
                              {isMatching ? "Cancel" : "Match"}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isMatching && (
                          <TableRow key={name + "-form"} className="bg-primary/5 border-primary/20">
                            <TableCell colSpan={5} className="py-3 px-4">
                              <div className="flex items-end gap-3 flex-wrap">
                                <div>
                                  <label className="text-[10px] text-muted-foreground block mb-0.5">ELV ID</label>
                                  <ELVDropdown
                                    value={matchForm.elv}
                                    onChange={(val) => setMatchForm((s) => ({ ...s, elv: val }))}
                                    placeholder="Search ELV ID or account..."
                                    className="w-64"
                                  />
                                </div>
                                {(() => {
                                  const preview = ELV_ACCOUNTS.find(
                                    (e) => e.elvId.toLowerCase() === matchForm.elv.trim().toLowerCase()
                                  )
                                  return preview ? (
                                    <div className="flex gap-3 text-[11px] bg-card border rounded px-3 py-1.5">
                                      <span className="text-muted-foreground">Parent:</span>
                                      <span className="font-medium">{preview.parentAccount}</span>
                                      <span className="text-muted-foreground ml-2">AD:</span>
                                      <span className="font-medium">{preview.elvAD}</span>
                                      <span className="text-muted-foreground ml-2">Sites:</span>
                                      <span className="font-medium">{preview.numberOfSites ?? "—"}</span>
                                    </div>
                                  ) : matchForm.elv.trim() ? (
                                    <p className="text-[11px] text-muted-foreground self-center">ELV ID not found — will save with account name as parent</p>
                                  ) : null
                                })()}
                                <Button size="sm" className="h-7 text-xs bg-primary" onClick={handleSaveMatch} disabled={!matchForm.elv.trim()}>✓ Save</Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setMatchingAccount(null)}>Cancel</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
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
