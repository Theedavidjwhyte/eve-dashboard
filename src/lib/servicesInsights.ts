import type { Deal } from "@/types"
import { fmt } from "./formatters"

export function getServicesPipeInsight(r: Deal): string {
  const svc = r._services ?? 0
  const val = r._val ?? 0
  const push = r._push ?? 0
  const dur = r._stageDur ?? 0
  const stage = (r.Stage ?? "").toLowerCase()
  const commit = (r._commit ?? "").toLowerCase()

  if (svc === 0 && val > 20000)
    return "No services on a large deal — explore if implementation or consultancy should be scoped."
  if (svc === 0)
    return "No services. Check if onboarding or configuration should be included."
  if (push > 2)
    return `Pushed ${push} times. Confirm the services scope hasn't changed.`
  if (dur > 180)
    return "Long cycle — ensure the services quote is still valid."
  if (stage === "negotiation" || stage === "commitment")
    return "Near close — confirm services SOW is included in the contract."
  if (commit === "commit" && svc > 5000)
    return `Committed services worth ${fmt(svc)}. Ensure delivery capacity is booked.`
  if (svc > 10000)
    return "High-value services component. Flag to delivery early."
  return "Services included — ensure scope is clearly defined in the proposal."
}

export function getServicesWonInsight(r: Deal): string {
  const svc = r._services ?? 0
  const val = r._val ?? 0
  const init = r._initials ?? 0

  if (svc > 20000)
    return "Major services win. Prioritise delivery kickoff immediately."
  if (svc > 10000)
    return "Strong services revenue. Share the project plan with the client within the first week."
  if (init > 0 && svc > 0)
    return "Full deal with initials and services — great attach rate. Use as a template."
  if (svc === 0 && val > 15000)
    return "No services on a sizeable deal. Follow up post-sale — potential upsell for rollout support."
  return "Services delivered alongside the product. Track delivery milestones to protect the renewal."
}
