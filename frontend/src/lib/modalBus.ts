import type { Deal } from "@/types"

/** Open the deal detail modal from anywhere in the app */
export function openDealModal(title: string, deals: Deal[]) {
  window.dispatchEvent(
    new CustomEvent("open-deal-modal", { detail: { title, deals } })
  )
}

/** Open the AD card modal from anywhere in the app */
export function openADModal(name: string) {
  window.dispatchEvent(
    new CustomEvent("open-ad-modal", { detail: { name } })
  )
}
