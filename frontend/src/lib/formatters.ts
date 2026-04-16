/** £1,234 */
export const fmt = (v: number): string =>
  "£" + Math.round(v).toLocaleString("en-GB")

/** £12k or £1.2m */
export const fmtKM = (v: number): string => {
  if (Math.abs(v) >= 1_000_000) return "£" + (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m"
  if (Math.abs(v) >= 1_000) return "£" + Math.round(v / 1_000) + "k"
  return "£" + Math.round(v).toLocaleString("en-GB")
}

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
