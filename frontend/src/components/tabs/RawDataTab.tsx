import { useState, useMemo } from "react"
import { useDashboardStore } from "@/store/dashboardStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { fmt, fmtKM } from "@/lib/formatters"
import { MONTHS } from "@/config/months"
import { Download, Database, Search, Upload } from "lucide-react"
import { SalesImportModal } from "@/components/modals/SalesImportModal"

export function RawDataTab() {
  const { data, rawCsv, importDate } = useDashboardStore()
  const [view, setView] = useState<"table" | "csv">("table")
  const [search, setSearch] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [sortCol, setSortCol] = useState<string>("Close Date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter(d =>
      !q ||
      (d["Opportunity Name"] ?? "").toLowerCase().includes(q) ||
      (d["Account Name"] ?? "").toLowerCase().includes(q) ||
      (d.User ?? "").toLowerCase().includes(q) ||
      (d.Stage ?? "").toLowerCase().includes(q)
    )
  }, [data, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = String(a[sortCol] ?? "")
      const bv = String(b[sortCol] ?? "")
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [filtered, sortCol, sortDir])

  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)

  const COLS = [
    "User", "Opportunity Name", "Account Name", "Stage", "Commit Status",
    "ABC Split Value", "Total ABC", "Total Initials", "Services Amount",
    "Close Date", "Created Date", "Push Count", "Age",
  ]

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortCol(col); setSortDir("asc") }
    setPage(0)
  }

  function exportCSV() {
    if (rawCsv) {
      const blob = new Blob([rawCsv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "eve-raw-data.csv"
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (data.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
          <Database className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No data imported yet</p>
          <p className="text-sm">Import a Salesforce report to get started</p>
          <Button
            className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => setShowImport(true)}
          >
            <Upload className="w-4 h-4" /> Import Sales
          </Button>
        </div>
        <SalesImportModal open={showImport} onClose={() => setShowImport(false)} />
      </>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Raw Data</h2>
          <p className="text-sm text-muted-foreground">
            {data.length.toLocaleString()} deals · {importDate ? `Imported ${new Date(importDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            size="sm"
            onClick={() => setShowImport(true)}
          >
            <Upload className="w-4 h-4" /> Import Sales
          </Button>
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>Table</Button>
          <Button variant={view === "csv" ? "default" : "outline"} size="sm" onClick={() => setView("csv")}>Raw CSV</Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rawCsv}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </div>
      </div>
      <SalesImportModal open={showImport} onClose={() => setShowImport(false)} />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Deals", value: data.length.toLocaleString() },
          { label: "Total OI", value: fmtKM(data.reduce((s, d) => s + (d._val ?? 0), 0)) },
          { label: "Total ARR", value: fmtKM(data.reduce((s, d) => s + (d._abc ?? 0), 0)) },
          { label: "Months", value: [...new Set(data.map(d => d._month).filter(Boolean))].length.toString() },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {view === "table" ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-md bg-background"
                  placeholder="Search deals..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0) }}
                />
              </div>
              <span className="text-sm text-muted-foreground">{filtered.length} results</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {COLS.map(col => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left font-semibold text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap"
                        onClick={() => toggleSort(col)}
                      >
                        {col} {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((d, i) => (
                    <tr key={i} className="border-b hover:bg-muted/20">
                      {COLS.map(col => (
                        <td key={col} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate">
                          {String(d[col] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages} · {sorted.length} total
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Raw CSV Data</CardTitle>
          </CardHeader>
          <CardContent>
            {rawCsv ? (
              <pre className="text-xs bg-muted/30 p-4 rounded-lg overflow-auto max-h-[600px] font-mono whitespace-pre">
                {rawCsv.slice(0, 50000)}{rawCsv.length > 50000 ? "\n\n... (truncated)" : ""}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">Raw CSV not available</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
