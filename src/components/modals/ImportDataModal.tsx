import { useState, useRef } from "react"
import Papa from "papaparse"
import { Upload, X, FileText, TrendingUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useDashboardStore } from "@/store/dashboardStore"
import { enrichRow } from "@/lib/enrichRow"
import { parseARRReport, summariseARR } from "@/lib/arrImport"
import type { Deal } from "@/types"

interface ImportDataModalProps {
  open: boolean
  onClose: () => void
}

type ImportTab = "oi" | "arr"

export function ImportDataModal({ open, onClose }: ImportDataModalProps) {
  const { importData, importARRData } = useDashboardStore()

  const [activeTab, setActiveTab] = useState<ImportTab>("oi")

  // OI state
  const [oiRaw, setOiRaw] = useState("")
  const [oiError, setOiError] = useState("")
  const [oiWarnings, setOiWarnings] = useState<string[]>([])
  const [oiSuccess, setOiSuccess] = useState("")
  const oiFileRef = useRef<HTMLInputElement>(null)

  // ARR state
  const [arrRaw, setArrRaw] = useState("")
  const [arrError, setArrError] = useState("")
  const [arrSuccess, setArrSuccess] = useState("")
  const arrFileRef = useRef<HTMLInputElement>(null)

  // ── OI Import ──────────────────────────────────────────────────────────────

  function handleOIProcess() {
    if (!oiRaw.trim()) { setOiError("Please paste your data first."); return }

    const firstLine = oiRaw.split("\n")[0]
    const tabCount = (firstLine.match(/\t/g) ?? []).length
    const commaCount = (firstLine.match(/,/g) ?? []).length
    const delimiter = tabCount > commaCount ? "\t" : undefined

    const parsed = Papa.parse<Record<string, string>>(oiRaw, {
      header: true, skipEmptyLines: true, dynamicTyping: false, delimiter,
    })

    if (parsed.data.length === 0) {
      setOiError("No data parsed. Make sure you include the header row.")
      return
    }

    const headers = parsed.meta.fields ?? []
    const hasUser = headers.some((h) =>
      ["User", "user", "Opportunity Owner", "opportunity owner"].includes(h.trim())
    )
    if (!hasUser) {
      setOiError(`Missing "User" or "Opportunity Owner" column. Headers: ${headers.slice(0, 6).join(", ")}`)
      return
    }

    const rows: Deal[] = parsed.data
      .filter((r) => {
        const user = r["User"] ?? r["user"] ?? r["Opportunity Owner"] ?? r["opportunity owner"] ?? ""
        return user.trim().length > 0
      })
      .map((r) => {
        const n: Deal = {}
        for (const [k, v] of Object.entries(r)) n[k.trim()] = v
        if (!n["User"] && n["Opportunity Owner"]) n["User"] = n["Opportunity Owner"]
        return enrichRow(n)
      })

    if (rows.length === 0) {
      setOiError("Data was parsed but no rows matched known users. Check your User column.")
      return
    }

    const warns: string[] = []
    const noClose = rows.filter((r) => !r._month).length
    const noValue = rows.filter((r) => (r._val ?? 0) === 0).length
    if (noClose > 3) warns.push(`${noClose} deals have no close date`)
    if (noValue > rows.length * 0.3)
      warns.push(`${Math.round((noValue / rows.length) * 100)}% of deals have £0 value`)

    importData(oiRaw, rows)
    setOiWarnings(warns)
    setOiError("")
    setOiSuccess(`✓ ${rows.length.toLocaleString()} deals imported successfully`)

    if (warns.length === 0) setTimeout(handleClose, 1200)
  }

  function handleOIFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setOiRaw((ev.target?.result as string) ?? "")
    reader.readAsText(file)
    e.target.value = ""
  }

  // ── ARR Import ─────────────────────────────────────────────────────────────

  function handleARRProcess() {
    if (!arrRaw.trim()) { setArrError("Please paste your ARR report data first."); return }

    const result = parseARRReport(arrRaw)

    if (result.parseErrors.length > 0) {
      setArrError(result.parseErrors.join("; "))
      return
    }

    if (result.deals.length === 0) {
      setArrError("No deals found after processing. Check the report format.")
      return
    }

    importARRData(result.deals, result.duplicateLog, result.exemptLog)

    const summary = summariseARR(result)
    setArrError("")
    setArrSuccess(
      `✓ ${summary.totalDeals} ARR deals imported · £${Math.round(summary.totalValue).toLocaleString()} total · ` +
      `${summary.duplicateCount} duplicates removed · ${summary.exemptCount} ARR exempt · ${summary.notElevateCount} Not Elevate`
    )

    setTimeout(handleClose, 2000)
  }

  function handleARRFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setArrRaw((ev.target?.result as string) ?? "")
    reader.readAsText(file)
    e.target.value = ""
  }

  // ── Common ─────────────────────────────────────────────────────────────────

  function handleClose() {
    setOiRaw(""); setOiError(""); setOiWarnings([]); setOiSuccess("")
    setArrRaw(""); setArrError(""); setArrSuccess("")
    onClose()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Import your Salesforce pipeline report (OI) or the ARR closed-won report.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab("oi")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "oi"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            OI Pipeline Report
          </button>
          <button
            onClick={() => setActiveTab("arr")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "arr"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            ARR Closed Won Report
          </button>
        </div>

        {/* OI Tab */}
        {activeTab === "oi" && (
          <div className="flex flex-col gap-3 overflow-y-auto">
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="font-medium text-foreground">Salesforce Pipeline Report</p>
              <p>Copy columns A–U from your Salesforce report (including headers) and paste below. Tab-separated or CSV both work.</p>
              <p className="text-accent">Used for: Monthly/Quarterly/YTD forecasting, commit intelligence, pipeline analysis</p>
            </div>

            {oiError && (
              <Alert variant="destructive">
                <AlertDescription>{oiError}</AlertDescription>
              </Alert>
            )}
            {oiSuccess && (
              <Alert>
                <AlertDescription className="text-green-600">{oiSuccess}</AlertDescription>
              </Alert>
            )}
            {oiWarnings.length > 0 && (
              <Alert>
                <AlertDescription>
                  Data loaded with warnings: {oiWarnings.join("; ")}
                </AlertDescription>
              </Alert>
            )}

            <textarea
              value={oiRaw}
              onChange={(e) => { setOiRaw(e.target.value); setOiError(""); setOiSuccess("") }}
              placeholder="Paste your Salesforce pipeline data here (tab-separated or CSV, include header row)..."
              className="w-full h-48 resize-none rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="flex gap-2">
              <Button onClick={handleOIProcess} className="flex-1">
                Import Pipeline Data
              </Button>
              <Button variant="outline" onClick={() => oiFileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" />
                Upload File
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { setOiRaw(""); setOiError(""); setOiSuccess("") }}>
                <X className="w-4 h-4" />
              </Button>
              <input ref={oiFileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleOIFile} className="hidden" />
            </div>
          </div>
        )}

        {/* ARR Tab */}
        {activeTab === "arr" && (
          <div className="flex flex-col gap-3 overflow-y-auto">
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="font-medium text-foreground">ARR Closed Won Report — 13 columns</p>
              <p>Expected columns: Close Date · Total ABC Currency · Total ABC · Stage · Account Owner · Parent Account Owner Name · Account Team · Opportunity ID · Account Name · User · Close Date (2) · Ultimate Parent Account Name · Opportunity Name</p>
              <div className="pt-1 space-y-0.5">
                <p><span className="text-green-500 font-medium">✓ Auto-applied:</span> Deduplication by Opp ID · Wingstop/Heineken 50/50 split · GDK exemptions · Not Elevate flagging</p>
              </div>
            </div>

            {arrError && (
              <Alert variant="destructive">
                <AlertDescription>{arrError}</AlertDescription>
              </Alert>
            )}
            {arrSuccess && (
              <Alert>
                <AlertDescription className="text-green-600 text-xs">{arrSuccess}</AlertDescription>
              </Alert>
            )}

            <textarea
              value={arrRaw}
              onChange={(e) => { setArrRaw(e.target.value); setArrError(""); setArrSuccess("") }}
              placeholder="Paste your ARR Closed Won report here (tab-separated from Salesforce, include header row)..."
              className="w-full h-48 resize-none rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="flex gap-2">
              <Button onClick={handleARRProcess} className="flex-1">
                Import ARR Data
              </Button>
              <Button variant="outline" onClick={() => arrFileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" />
                Upload File
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { setArrRaw(""); setArrError(""); setArrSuccess("") }}>
                <X className="w-4 h-4" />
              </Button>
              <input ref={arrFileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleARRFile} className="hidden" />
            </div>

            <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="font-medium text-amber-500 mb-1">Business rules applied automatically</p>
              <ul className="space-y-0.5">
                <li>• <strong>GDK opp IDs</strong> 006Tl00000FRWhV + 006Tl00000GmNCP → ARR exempt (one-off deals)</li>
                <li>• <strong>Wingstop & Heineken</strong> → 50/50 split between Chevonne Souness & Dan Turner</li>
                <li>• <strong>Not Elevate accounts</strong> (JDW, Nando's, Peach Pubs etc.) → exempt from ARR targets, visible in exemption log</li>
                <li>• <strong>Duplicate opp IDs</strong> → deduplicated automatically (only one row per opp)</li>
                <li>• <strong>HTML in Ultimate Parent</strong> → stripped automatically</li>
              </ul>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
