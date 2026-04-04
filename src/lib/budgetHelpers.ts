import type { BudgetTargets } from "@/types"
import { BUDGET_AD_KEYS, BUDGET_AD_MAP } from "@/config/users"
import { MONTHS } from "@/config/months"

/** Monthly team budget total from OI targets */
export function deriveMonthlyBudget(
  oiTargets: BudgetTargets
): Record<string, number> {
  const budget: Record<string, number> = {}
  MONTHS.forEach((m) => {
    budget[m] = BUDGET_AD_KEYS.reduce(
      (s, k) => s + (oiTargets[m]?.[k] ?? 0),
      0
    )
  })
  return budget
}

/** Annual OI budget for a specific AD (or multiple ADs) across specific months */
export function getADBudget(
  user: string | string[],
  months: string[],
  oiTargets: BudgetTargets
): number {
  // Multi-user: sum each AD's budget
  if (Array.isArray(user)) {
    return user.reduce((total, u) => total + getADBudget(u, months, oiTargets), 0)
  }
  const key = BUDGET_AD_KEYS.find((k) => BUDGET_AD_MAP[k] === user)
  if (!key) return 0
  return months.reduce((s, m) => s + (oiTargets[m]?.[key] ?? 0), 0)
}

/** Team budget total for specific months */
export function getTeamBudgetForMonths(
  months: string[],
  oiTargets: BudgetTargets
): number {
  return months.reduce(
    (s, m) =>
      s + BUDGET_AD_KEYS.reduce((s2, k) => s2 + (oiTargets[m]?.[k] ?? 0), 0),
    0
  )
}
