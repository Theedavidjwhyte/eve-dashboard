/**
 * ADKPIIcon — renders stacked AD avatar bubbles for use as the icon in a KPI card.
 *
 * When the user filter is:
 *   • "All"            → all 5 ADs stacked (overlap style)
 *   • single AD        → one large bubble centred
 *   • multi-select     → selected ADs stacked
 */
import { getAvatar, AD_ORDER } from "@/config/avatars"
import { useDashboardStore } from "@/store/dashboardStore"
import { cn } from "@/lib/utils"

interface Props {
  /** Override which ADs to show — defaults to respecting the current filter */
  users?: string[]
  size?: "sm" | "md" | "lg"
}

export function ADKPIIcon({ users, size = "md" }: Props) {
  const { filters } = useDashboardStore()

  // Determine which ADs to show
  let adList: string[]
  if (users) {
    adList = users
  } else if (filters.user === "All") {
    adList = AD_ORDER
  } else if (Array.isArray(filters.user)) {
    adList = filters.user
  } else {
    adList = [filters.user]
  }

  const isSingle = adList.length === 1

  // Sizes
  const dim = size === "lg" ? 40 : size === "sm" ? 24 : 32
  const fontSize = size === "lg" ? "11px" : size === "sm" ? "8px" : "9px"
  const overlap = Math.round(dim * 0.35)

  if (isSingle) {
    const av = getAvatar(adList[0])
    return (
      <div
        className="rounded-full flex items-center justify-center font-bold ring-2 ring-background"
        style={{
          width: dim,
          height: dim,
          backgroundColor: `#${av.bg}`,
          color: `#${av.fg}`,
          fontSize,
        }}
      >
        {av.initials}
      </div>
    )
  }

  // Show up to 5 stacked with overlap
  const visible = adList.slice(0, 5)
  const totalWidth = dim + (visible.length - 1) * (dim - overlap)

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: totalWidth, height: dim }}
    >
      {visible.map((name, i) => {
        const av = getAvatar(name)
        return (
          <div
            key={name}
            title={name}
            className={cn(
              "absolute rounded-full flex items-center justify-center font-bold",
              "ring-2 ring-background",
            )}
            style={{
              width: dim,
              height: dim,
              left: i * (dim - overlap),
              zIndex: visible.length - i,
              backgroundColor: `#${av.bg}`,
              color: `#${av.fg}`,
              fontSize,
            }}
          >
            {av.initials}
          </div>
        )
      })}
    </div>
  )
}
