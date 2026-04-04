export const MONTHS = [
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
]

export const MONTH_NUM: Record<string, number> = {
  Jul: 1, Aug: 2, Sep: 3, Oct: 4, Nov: 5, Dec: 6,
  Jan: 7, Feb: 8, Mar: 9, Apr: 10, May: 11, Jun: 12,
}

export const QUARTERS: Record<string, string[]> = {
  Q1: ["Jul", "Aug", "Sep"],
  Q2: ["Oct", "Nov", "Dec"],
  Q3: ["Jan", "Feb", "Mar"],
  Q4: ["Apr", "May", "Jun"],
}

export const QUARTER_FOR_MONTH: Record<string, string> = {
  Jul: "Q1", Aug: "Q1", Sep: "Q1",
  Oct: "Q2", Nov: "Q2", Dec: "Q2",
  Jan: "Q3", Feb: "Q3", Mar: "Q3",
  Apr: "Q4", May: "Q4", Jun: "Q4",
}

export const HALVES: Record<string, string[]> = {
  H1: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  H2: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
}

/** FY month keys in order — alias for MONTHS, exported for ARR tab */
export const FY_MONTH_KEYS = MONTHS
