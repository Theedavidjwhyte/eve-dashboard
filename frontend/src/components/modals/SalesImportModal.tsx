import { useState, useRef, useCallback } from "react"
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDashboardStore } from "@/store/dashboardStore"
import { parseCombinedReport } from "@/lib/arrImport"
import type { ARRImportResult } from "@/lib/arrImport"
import { fmtKM } from "@/lib/formatters"
import * as XLSX from "xlsx"

interface SalesImportModalProps {
  open: boolean
  onClose: () => void
}

interface ImportSummary {
  fileName: string
  oiCount: number
  arrCount: number
  totalOI: number
  totalARR: number
  dupes: number
  exempt: number
  wonCount: number
  pipeCount: number
  rawText: string
  oiDeals: ReturnType<typeof parseCombinedReport>["oiDeals"]
  arrResult: ARRImportResult
}

type Step = "upload" | "confirm" | "success"

export function SalesImportModal({ open, onClose }: SalesImportModalProps) {
  const { importData, importARRData } = useDashboardStore()
  const [step, setStep] = useState<Step>("upload")
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep("upload")
    setSummary(null)
    setError(null)
    setLoading(false)
    setDragging(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  // ── Convert XLSX binary to TSV with proper UK date formatting ──────────────
  function xlsxToTsv(arrayBuffer: ArrayBuffer): string {
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: false, raw: false })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1")
    const rows: string[][] = []

    for (let R = range.s.r; R <= range.e.r; R++) {
      const row: string[] = []
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C })
        const cell = sheet[addr]
        if (!cell) { row.push(""); continue }

        // Handle date cells — force UK format DD/MM/YYYY
        if (cell.t === "d" && cell.v instanceof Date) {
          const d = cell.v
          const day   = String(d.getDate()).padStart(2, "0")
          const month = String(d.getMonth() + 1).padStart(2, "0")
          const year  = d.getFullYear()
          row.push(`${day}/${month}/${year}`)
          continue
        }

        // Handle numeric cells that are formatted as dates (US format m/d/yy)
        if (cell.t === "n" && cell.w) {
          const usDate = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(cell.w)
          if (usDate) {
            const m  = usDate[1].padStart(2, "0")
            const d  = usDate[2].padStart(2, "0")
            const yr = usDate[3].length === 2 ? `20${usDate[3]}` : usDate[3]
            row.push(`${d}/${m}/${yr}`)
            continue
          }
          // Excel serial number with no formatted value — convert manually
          if (!cell.w && typeof cell.v === "number") {
            const date = new Date((cell.v - 25569) * 86400 * 1000)
            const day   = String(date.getDate()).padStart(2, "0")
            const month = String(date.getMonth() + 1).padStart(2, "0")
            const year  = date.getFullYear()
            row.push(`${day}/${month}/${year}`)
            continue
          }
        }

        row.push(cell.w ?? String(cell.v ?? ""))
      }
      rows.push(row)
    }

    return rows.map(r => r.join("\t")).join("\n")
  }

  // ── Process file ───────────────────────────────────────────────────────────
  async function processFile(file: File) {
    setLoading(true)
    setError(null)
    try {
      let rawText = ""

      if (file.name.endsWith(".csv") || file.name.endsWith(".tsv") || file.name.endsWith(".txt")) {
        rawText = await file.text()
      } else {
        // XLSX / XLS — read as binary
        const buffer = await file.arrayBuffer()
        rawText = xlsxToTsv(buffer)
      }

      const result = parseCombinedReport(rawText)

      if (result.parseErrors.length > 0 && result.oiDeals.length === 0) {
        setError(result.parseErrors.join("\n"))
        setLoading(false)
        return
      }

      const totalOI  = result.oiDeals.reduce((s, d) => s + (d._val ?? 0), 0)
      const totalARR = result.arrResult.deals.reduce((s, d) => s + (d.totalAbc ?? 0), 0)
      const wonCount = result.oiDeals.filter(d => d._stageSummary === "Won").length
      const pipeCount = result.oiDeals.filter(d => d._stageSummary === "Pipe").length

      setSummary({
        fileName:  file.name,
        oiCount:   result.oiDeals.length,
        arrCount:  result.arrResult.deals.length,
        totalOI,
        totalARR,
        dupes:     result.arrResult.duplicateLog.length,
        exempt:    result.arrResult.exemptLog.length,
        wonCount,
        pipeCount,
        rawText,
        oiDeals:   result.oiDeals,
        arrResult: result.arrResult,
      })

      setStep("confirm")
    } catch (e) {
      setError(`Failed to read file: ${e instanceof Error ? e.message : String(e)}`)
    }
    setLoading(false)
  }

  // ── Confirm import ─────────────────────────────────────────────────────────
  async function confirmImport() {
    if (!summary) return
    setLoading(true)
    try {
      // Clear localStorage before import to prevent quota errors
      try {
        const key = "fy26-dashboard"
        const stored = localStorage.getItem(key)
        if (stored) {
          const parsed = JSON.parse(stored)
          // Remove large arrays from stored state before import
          if (parsed?.state) {
            delete parsed.state.data
            delete parsed.state.rawCsv
            delete parsed.state.arrDeals
            delete parsed.state.manualDeals
            delete parsed.state.nonSFDeals
            delete parsed.state.droppedDeals
            localStorage.setItem(key, JSON.stringify(parsed))
          }
        }
      } catch { /* ignore localStorage errors */ }

      // Use already-parsed results — no second parse
      importData(summary.rawText, summary.oiDeals)
      importARRData(
        summary.arrResult.deals,
        summary.arrResult.duplicateLog,
        summary.arrResult.exemptLog
      )
      setStep("success")
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("quota") || msg.includes("setItem")) {
        setError("Storage full — please clear your browser cache and try again. Your data has been saved to the server.")
      } else {
        setError(`Import failed: ${msg}`)
      }
    }
    setLoading(false)
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <span className="font-semibold text-base">Import Sales Data</span>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/30">
          {(["upload", "confirm", "success"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? "bg-emerald-600 text-white" :
                (["upload","confirm","success"].indexOf(step) > i) ? "bg-emerald-600/40 text-emerald-400" :
                "bg-muted text-muted-foreground"
              }`}>{i + 1}</div>
              <span className={`text-xs capitalize ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s}
              </span>
              {i < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* ── Step 1: Upload ── */}
          {step === "upload" && (
            <>
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragging ? "border-emerald-500 bg-emerald-500/10" : "border-border hover:border-emerald-500/50 hover:bg-muted/40"
                }`}
              >
                <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Drop your Salesforce export here</p>
                <p className="text-xs text-muted-foreground mb-3">or click to browse</p>
                <p className="text-xs text-muted-foreground">Accepts .xlsx, .xls, .csv</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
                />
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  Reading file...
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400 whitespace-pre-wrap">{error}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Step 2: Confirm ── */}
          {step === "confirm" && summary && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span className="truncate font-medium text-foreground">{summary.fileName}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">OI Pipeline Deals</p>
                  <p className="text-2xl font-bold">{summary.oiCount}</p>
                  <p className="text-xs text-muted-foreground">{summary.wonCount} won · {summary.pipeCount} in pipe</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">ARR Closed Won</p>
                  <p className="text-2xl font-bold">{summary.arrCount}</p>
                  <p className="text-xs text-muted-foreground">{summary.dupes} dupes removed</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total OI Value</p>
                  <p className="text-2xl font-bold">{fmtKM(summary.totalOI)}</p>
                  <p className="text-xs text-muted-foreground">ABC Split Value</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total ARR Value</p>
                  <p className="text-2xl font-bold">{fmtKM(summary.totalARR)}</p>
                  <p className="text-xs text-muted-foreground">{summary.exempt} exempt</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                This will replace all existing OI pipeline data and update ARR records. Manual deals and Non-SF deals will be preserved.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Success ── */}
          {step === "success" && summary && (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold text-lg mb-1">Import Complete</p>
              <p className="text-sm text-muted-foreground mb-4">
                {summary.oiCount} OI deals and {summary.arrCount} ARR records have been imported successfully.
              </p>
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="bg-emerald-500/10 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">OI Pipeline</p>
                  <p className="font-bold text-emerald-500">{fmtKM(summary.totalOI)}</p>
                </div>
                <div className="bg-emerald-500/10 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">ARR</p>
                  <p className="font-bold text-emerald-500">{fmtKM(summary.totalARR)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          {step === "upload" && (
            <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
          )}
          {step === "confirm" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setStep("upload"); setError(null) }}>
                ← Back
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={confirmImport}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </span>
                ) : (
                  `Confirm Import — ${summary?.oiCount} deals`
                )}
              </Button>
            </>
          )}
          {step === "success" && (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
              onClick={handleClose}
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
