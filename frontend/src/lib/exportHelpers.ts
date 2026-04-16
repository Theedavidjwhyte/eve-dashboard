import type { Deal } from "@/types"

export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function dealsToCSV(deals: Deal[]): string {
  if (deals.length === 0) return ""
  const COLS = [
    "User", "Account Name", "Opportunity Name", "Stage",
    "ABC Split Value", "Total ABC", "Close Date", "Commit Status",
    "Push Count", "Age", "Next Step", "Stage Duration",
    "Total Initials", "Services Amount", "Created By",
  ]
  const COMPUTED = [
    "_stageSummary", "_month", "_val", "_abc", "_product",
    "_commit", "_push", "_stageDur", "_risk", "_services", "_keyDeal",
  ]
  const headers = [...COLS, ...COMPUTED]
  let csv = headers.map((h) => `"${h}"`).join(",") + "\n"
  deals.forEach((r) => {
    const row = headers.map((k) => {
      const v = (r as Record<string, unknown>)[k] ?? ""
      return `"${String(v).replace(/"/g, '""')}"`
    })
    csv += row.join(",") + "\n"
  })
  return csv
}
