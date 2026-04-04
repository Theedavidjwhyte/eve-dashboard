const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
}

const JS_MONTH_TO_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/**
 * Robust date parser that handles every common Salesforce/Excel format.
 * Returns { date, monthAbbr } or null if unparseable.
 */
export function parseSalesforceDate(
  raw: string | number | undefined
): { date: Date; monthAbbr: string } | null {
  if (!raw && raw !== 0) return null
  const s = String(raw).trim()
  if (!s) return null

  let cd: Date | null = null

  // Excel serial date
  const serial = Number(s)
  if (!isNaN(serial) && serial > 30000 && serial < 60000) {
    cd = new Date((serial - 25569) * 86400000)
  }

  // "17-Jul-2025" / "17 Jul 2025" / "17/Jul/2025"
  if (!cd) {
    const m = s.match(/^(\d{1,2})[\s/\-]([a-zA-Z]+)[\s/\-](\d{4})/)
    if (m) {
      const mo = MONTH_MAP[m[2].toLowerCase()]
      if (mo !== undefined) cd = new Date(parseInt(m[3]), mo, parseInt(m[1]))
    }
  }

  // "Jul 17, 2025" / "July 17 2025"
  if (!cd) {
    const m = s.match(/^([a-zA-Z]+)[\s/\-](\d{1,2})[,\s]+(\d{4})/)
    if (m) {
      const mo = MONTH_MAP[m[1].toLowerCase()]
      if (mo !== undefined) cd = new Date(parseInt(m[3]), mo, parseInt(m[2]))
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  if (!cd) {
    const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
    if (m) cd = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
  }

  // DD/MM/YYYY or DD-MM-YYYY (UK default)
  if (!cd) {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
    if (m) {
      const a = parseInt(m[1]), b = parseInt(m[2]), y = parseInt(m[3])
      if (a > 12) cd = new Date(y, b - 1, a)
      else if (b > 12) cd = new Date(y, a - 1, b)
      else cd = new Date(y, b - 1, a) // default UK
    }
  }

  // DD/MM/YY
  if (!cd) {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/)
    if (m) cd = new Date(2000 + parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
  }

  // Last resort
  if (!cd) {
    const attempt = new Date(s)
    if (!isNaN(attempt.getTime())) cd = attempt
  }

  if (!cd || isNaN(cd.getTime())) return null
  if (cd.getFullYear() < 2020 || cd.getFullYear() > 2030) return null

  return { date: cd, monthAbbr: JS_MONTH_TO_ABBR[cd.getMonth()] }
}
