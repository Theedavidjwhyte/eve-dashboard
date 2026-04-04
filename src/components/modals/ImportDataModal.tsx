import { useState, useRef } from "react"
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useDashboardStore } from "@/store/dashboardStore"
import { parseCombinedReport } from "@/lib/arrImport"

interface ImportDataModalProps {
  open: boolean
  onClose: () => void
}

export function ImportDataModal({ open, onClose }: ImportDataModalProps) {
  const { importData, importARRData } = useDashboardStore()

  const [raw, setRaw]           = useState("")
  const [error, setError]       = useState("")
  const [processing, setProcessing] = useState(false)
  const [result, setResult]     = useState<{
    oiCount: number
    arrCount: number
    dupCount: number
    exemptCount: number
  } | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  // ── Process ───────────────────────────────────────────────────────────────

  function handleProcess() {
    if (!raw.trim()) { setError("Please paste your Salesforce report data first."); return }

    setProcessing(true)
    setError("")
    setResult(null)

    // Small timeout so the UI can update before the parse runs
    setTimeout(() => {
      try {
        const parsed = parseCombinedReport(raw)

        if (parsed.parseErrors.length > 0) {
          setError(parsed.parseErrors.join("; "))
          setProcessing(false)
          return
        }

        if (parsed.oiCount === 0 && parsed.arrCount === 0) {
          setError("No deals found after processing. Check the report format and ensure the header row is included.")
          setProcessing(false)
          return
        }

        // Push OI data to store
        if (parsed.oiCount > 0) {
          importData(raw, parsed.oiDeals)
        }

        // Push ARR data to store
        if (parsed.arrCount > 0 || parsed.arrResult.exemptLog.length > 0) {
          importARRData(
            parsed.arrResult.deals,
            parsed.arrResult.duplicateLog,
            parsed.arrResult.exemptLog,
          )
        }

        setResult({
          oiCount:    parsed.oiCount,
          arrCount:   parsed.arrCount,
          dupCount:   parsed.arrResult.duplicateLog.reduce((s, d) => s + d.rowCount - 1, 0),
          exemptCount: parsed.arrResult.exemptLog.length,
        })

        setProcessing(false)
        setTimeout(handleClose, 2200)
      } catch (e) {
        setError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`)
        setProcessing(false)
      }
    }, 50)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setRaw((ev.target?.result as string) ?? "")
      setError("")
      setResult(null)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  function handleClose() {
    setRaw("")
    setError("")
    setResult(null)
    setProcessing(false)
    onClose()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Import Salesforce Report
          </DialogTitle>
          <DialogDescription>
            Paste your combined Salesforce report below. Pipeline deals and Closed Won (ARR) are automatically separated and imported together.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 overflow-y-auto">

          {/* Column guide */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Combined SF Report — 26 columns</p>
                <p className="text-[11px] leading-relaxed">
                  Close Date · Total ABC Currency · Total ABC · Stage · Account Owner · Parent Account Owner Name ·
                  Account Team · Opportunity ID · Account Name · User · Push Count · Age · Next Step ·
                  ABC Split Value Currency · ABC Split Value · Total Initials Currency · Total Initials ·
                  Services Amount Currency · Services Amount · Stage Duration · Opportunity Owner ·
                  Created By · Created Date · Close Date (2) · Ultimate Parent Account Name · Opportunity Name
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30 bg-blue-500/5">
                Pipeline stages → OI Dashboard
              </Badge>
              <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30 bg-green-500/5">
                Closed Won → ARR Performance
              </Badge>
              <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/5">
                Auto: dedup · splits · exemptions
              </Badge>
            </div>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {result && (
            <Alert className="border-green-500/30 bg-green-500/5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                <span className="font-semibold">Import successful!</span>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
                  <span>
                    <span className="font-bold text-blue-500">{result.oiCount}</span> OI pipeline deals
                  </span>
                  <span>
                    <span className="font-bold text-green-500">{result.arrCount}</span> ARR closed-won
                  </span>
                  <span>
                    <span className="font-bold text-amber-500">{result.dupCount}</span> duplicates removed
                  </span>
                  <span>
                    <span className="font-bold text-muted-foreground">{result.exemptCount}</span> exempt/not-elevate
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Paste area */}
          <textarea
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setError(""); setResult(null) }}
            placeholder="Paste your Salesforce report here (tab-separated or CSV, include the header row)..."
            className="w-full h-52 resize-none rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={processing}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleProcess}
              className="flex-1"
              disabled={processing || !raw.trim()}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing…
                </>
              ) : (
                "Import Report"
              )}
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={processing}>
              <Upload className="w-4 h-4 mr-1" />
              Upload File
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setRaw(""); setError(""); setResult(null) }}
              disabled={processing}
            >
              <X className="w-4 h-4" />
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleFile} className="hidden" />
          </div>

          {/* Business rules reminder */}
          <div className="text-xs text-muted-foreground bg-muted/30 border border-border/50 rounded-lg p-3">
            <p className="font-medium text-foreground mb-1.5">ARR business rules applied automatically</p>
            <ul className="space-y-0.5 text-[11px]">
              <li>• <strong>GDK opp IDs</strong> 006Tl00000FRWhV + 006Tl00000GmNCP → ARR exempt (one-off deals)</li>
              <li>• <strong>Wingstop & Heineken</strong> → 50/50 split between Chevonne Souness & Dan Turner</li>
              <li>• <strong>Not Elevate accounts</strong> (JDW, Nando's, Peach Pubs etc.) → excluded from ARR targets</li>
              <li>• <strong>Duplicate opp IDs</strong> → deduplicated (multiple team member rows → kept as one)</li>
            </ul>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
