/**
 * Per-deal insight generators — used in Closed Won, Closed Lost,
 * Key Deals, Services and Monthly tabs.
 */
import type { Deal } from "@/types"
import { fmt } from "./formatters"

export function getPipeInsight(r: Deal): string {
  const val = r._val ?? 0
  const push = r._push ?? 0
  const dur = r._stageDur ?? 0
  const stage = (r.Stage ?? "").toLowerCase()
  const commit = (r._commit ?? "").toLowerCase()
  const next = r["Next Step"] ?? ""

  if (push > 3 && dur > 200)
    return "Heavily pushed and stale — needs exec sponsor intervention or qualify out."
  if (push > 2)
    return `Pushed ${push} times. Challenge the close date directly with the buyer.`
  if (dur > 200)
    return `Over ${dur} days in stage. Likely stalled — request a candid status call.`
  if (dur > 150)
    return `Long stage duration (${dur} days). Identify the specific blocker.`
  if (stage === "discovery")
    return "Still in Discovery — confirm budget, timeline, and decision-maker access."
  if (stage === "evaluation" && commit === "commit")
    return "In Evaluation but marked Commit — validate this."
  if (stage === "evaluation")
    return "In Evaluation — push for a proposal review meeting."
  if (stage === "decision")
    return "At Decision stage — identify who signs and push for verbal commitment."
  if (stage === "negotiation")
    return "In Negotiation — focus on closing. Remove any commercial blockers."
  if (stage === "commitment")
    return "At Commitment — confirm DocuSign is sent and chase daily."
  if (!next || next.trim().length < 5)
    return "No next step recorded — update this immediately."
  if (next.toLowerCase().includes("awaiting") || next.toLowerCase().includes("waiting"))
    return "Waiting on prospect. Set a deadline for end of week."
  if (next.toLowerCase().includes("docusign") || next.toLowerCase().includes("signature"))
    return "Contract out for signature. Chase daily if unsigned after 5 days."
  if (commit === "pipeline")
    return "Marked as Pipeline — review if this can be upgraded to Commit."
  if (commit === "upside")
    return "Upside deal — identify what would convert this to Commit."
  return val > 50000
    ? "High-value deal — ensure this has senior attention and a clear path to close."
    : "Progress the next step and aim to advance the stage before next forecast call."
}

export function getWonInsight(r: Deal): string {
  const val = r._val ?? 0
  const push = r._push ?? 0
  const dur = r._stageDur ?? 0
  const product = r._product ?? ""
  const age = Number(r.Age ?? 999)

  if (push === 0 && age < 30)
    return "Fast close with no pushes — excellent execution. Replicate this approach."
  if (push === 0 && age < 60)
    return "Clean deal, no pushes. Good sales discipline throughout."
  if (age < 14)
    return "Closed in under 2 weeks — strong relationship or repeat buyer. Look for expansion."
  if (val > 50000 && push <= 1)
    return "Major deal closed with minimal friction. Document what made the buyer say yes quickly."
  if (val > 50000)
    return `Large deal despite ${push} pushes — persistence paid off.`
  if (push > 2)
    return `Won despite ${push} pushes — strong relationship management.`
  if (dur > 180)
    return `Long cycle (${dur} days) but got there. Review what caused the delay.`
  if (product === "Collins" || product === "QikServe")
    return "Front-of-house win. Check for cross-sell: Procure Wizard, Maintain, Acteol?"
  if (product === "Procure Wizard")
    return "Procurement win. Look for upsell into Menu Manager or supply chain modules."
  if (product === "EPOS")
    return "EPOS win — anchor product. Opens doors for Collins, QikServe, Wireless Social."
  if ((r._initials ?? 0) > 0 && (r._services ?? 0) > 0)
    return "Won with both initials and services — full-value deal. Good template."
  return "Solid close. Review the account for expansion potential."
}

export function getLostInsight(r: Deal): string {
  const val = r._val ?? 0
  const push = r._push ?? 0
  const dur = r._stageDur ?? 0
  const stage = (r.Stage ?? "").toLowerCase()
  const commit = (r._commit ?? "").toLowerCase()
  const age = Number(r.Age ?? 999)

  if (commit === "commit" && val > 30000)
    return "High-value Commit that was lost — critical post-mortem needed."
  if (commit === "commit")
    return "Was marked Commit before losing. Review qualification criteria."
  if (push > 3)
    return `Pushed ${push} times before losing. Earlier disqualification would have freed up time.`
  if (dur > 200)
    return `Spent ${dur} days in stage before losing. Earlier qualification needed.`
  if (val > 50000)
    return `Major loss at ${fmt(val)}. Conduct a formal loss review with the buyer.`
  if (stage.includes("negotiat") || stage.includes("decision"))
    return `Lost at ${r.Stage}. Something broke in the final stretch — price, competitor, or politics.`
  if (stage.includes("discov") || stage.includes("evaluat"))
    return "Lost early in the cycle — check if the buyer had real budget and authority."
  if (age < 14)
    return "Lost very quickly — likely never a real opportunity. Tighten qualification."
  return "Review the loss reason and check if the account could be revisited."
}
