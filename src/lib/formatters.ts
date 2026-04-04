/** £1,234 */
export const fmt = (v: number): string =>
  "£" + Math.round(v).toLocaleString("en-GB")

/** £12k */
export const fk = (v: number): string =>
  "£" + Math.round(v / 1000) + "k"

/** 83% */
export const fmtPct = (v: number): string =>
  Math.round(v * 100) + "%"

/** 83.4% */
export const fmtPct1 = (v: number): string =>
  (v * 100).toFixed(1) + "%"

/** Safe parse a monetary string to number */
export const parseMoney = (s: string | number | undefined): number => {
  if (typeof s === "number") return s
  if (!s) return 0
  return parseFloat(String(s).replace(/[£,\s]/g, "")) || 0
}
