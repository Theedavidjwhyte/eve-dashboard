import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/dashboardStore"
import type { TabId } from "@/types"
import { getAvatar, AD_ORDER } from "@/config/avatars"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Lightbulb,
  List,
  BarChart2,
  Calendar,
  TrendingUp,
  Activity,
  CheckSquare,
  Wrench,
  Target,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  Zap,
  Network,
  GitBranch,
  Send,
  LineChart,
} from "lucide-react"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onImport: () => void
}

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { id: "insights" as TabId, label: "Insights", icon: Lightbulb },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { id: "monthly"       as TabId, label: "Monthly",       icon: Calendar   },
      { id: "quarterly"     as TabId, label: "Quarterly",     icon: BarChart2  },
      { id: "ytd"           as TabId, label: "YTD",           icon: TrendingUp },
      { id: "forecast-post" as TabId, label: "Forecast Post", icon: Send       },
    ],
  },
  {
    label: "Deals",
    items: [
      { id: "deals"             as TabId, label: "All Deals",      icon: List        },
      { id: "dealbreakdown"     as TabId, label: "Deal Breakdown",  icon: Activity    },
      { id: "pipeline-creation" as TabId, label: "Pipe Creation",   icon: GitBranch   },
      { id: "closed"            as TabId, label: "Closed",          icon: CheckSquare },
      { id: "services"          as TabId, label: "Services",        icon: Wrench      },
    ],
  },
  {
    label: "ARR",
    items: [
      { id: "arr" as TabId, label: "ARR Performance", icon: LineChart },
    ],
  },
  {
    label: "Management",
    items: [
      { id: "budget"   as TabId, label: "Budget",            icon: Target    },
      { id: "accounts" as TabId, label: "Accounts",          icon: Building2 },
      { id: "network"  as TabId, label: "Network Map",       icon: Network   },
      { id: "reports"  as TabId, label: "Reports & Exports", icon: FileText  },
    ],
  },
]

export function Sidebar({ collapsed, onToggle, onImport }: SidebarProps) {
  const {
    currentTab, setTab, data, importDate, filters, setFilters,
    arrDeals, arrImportDate,
  } = useDashboardStore()

  const dataCount   = data.length
  const elvCount    = data.filter((d) => d._elvId).length
  const arrLoaded   = arrDeals.length > 0

  function isAdSelected(name: string): boolean {
    if (filters.user === "All") return false
    if (Array.isArray(filters.user)) return filters.user.includes(name)
    return filters.user === name
  }
  function isAdDimmed(name: string): boolean {
    if (filters.user === "All") return false
    return !isAdSelected(name)
  }
  function toggleAd(name: string) {
    const current = filters.user
    if (current === "All") { setFilters({ user: name }); return }
    const arr = Array.isArray(current) ? current : [current]
    const next = arr.includes(name) ? arr.filter((n) => n !== name) : [...arr, name]
    if (next.length === 0) setFilters({ user: "All" })
    else if (next.length === 1) setFilters({ user: next[0] })
    else setFilters({ user: next })
  }

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "flex flex-col h-screen border-r bg-card transition-all duration-200 shrink-0 relative",
          collapsed ? "w-[56px]" : "w-[220px]"
        )}
      >
        {/* ── Brand ── */}
        <div
          className={cn(
            "flex items-center gap-3 border-b",
            collapsed ? "px-3 py-4 justify-center" : "px-5 py-4"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-black text-sm select-none cursor-default"
              >
                <Zap className="w-4 h-4" />
              </div>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="font-bold">
                E.V.E — Elevate Value Add Engine
              </TooltipContent>
            )}
          </Tooltip>

          {!collapsed && (
            <div className="min-w-0">
              <div className="font-black text-lg leading-none tracking-tight text-foreground">
                E.V.E
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                Elevate Value Add Engine
              </div>
            </div>
          )}
        </div>

        {/* ── Collapse toggle — positioned on the right edge ── */}
        <button
          onClick={onToggle}
          className={cn(
            "absolute top-[52px] -right-3 z-50",
            "w-6 h-6 rounded-full border bg-card shadow-md",
            "flex items-center justify-center",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            "transition-all duration-150"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft  className="w-3 h-3" />
          }
        </button>

        {/* ── AD avatars — collapsed mode ── */}
        {dataCount > 0 && collapsed && (
          <div className="flex flex-col items-center gap-1.5 mx-2 mt-3">
            {AD_ORDER.map((name) => {
              const av         = getAvatar(name)
              const isSelected = isAdSelected(name)
              const isDimmed   = isAdDimmed(name)
              return (
                <Tooltip key={name}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => toggleAd(name)}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                        isSelected
                          ? "ring-2 ring-offset-1 ring-offset-background scale-110"
                          : isDimmed
                          ? "opacity-30 hover:opacity-70"
                          : "opacity-80 hover:opacity-100 hover:scale-105"
                      )}
                      style={{
                        backgroundColor: `#${av.bg}`,
                        color: `#${av.fg}`,
                      }}
                    >
                      {av.initials}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs font-semibold">
                    {isSelected ? `${name} — click to deselect` : name}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        )}

        {/* ── Data pill — expanded only ── */}
        {(dataCount > 0 || arrLoaded) && !collapsed && (
          <div className="mx-3 mt-3 px-2 py-1.5 rounded-lg bg-muted/50 border text-[9px] text-muted-foreground space-y-1">
            {dataCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span>
                  <span className="font-semibold text-foreground">{dataCount}</span> OI deals
                  {importDate && (
                    <span className="ml-1 text-muted-foreground/60">
                      {new Date(importDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </span>
              </div>
            )}
            {arrLoaded && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <span>
                  <span className="font-semibold text-foreground">{arrDeals.length}</span> ARR deals
                  {arrImportDate && (
                    <span className="ml-1 text-muted-foreground/60">
                      {new Date(arrImportDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </span>
              </div>
            )}
            {!arrLoaded && dataCount > 0 && (
              <div className="flex items-center gap-1 text-amber-500/70">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 shrink-0" />
                <span>No ARR data</span>
              </div>
            )}
          </div>
        )}

        {/* ── Nav sections ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {section.label}
                </div>
              )}
              {/* Divider between sections in collapsed mode */}
              {collapsed && (
                <div className="mx-2 mb-1 border-t border-border/40" />
              )}
              <div className="space-y-0.5">
                {section.items.map(({ id, label, icon: Icon }) => {
                  const active = currentTab === id
                  return (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setTab(id)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
                            collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="shrink-0 w-4 h-4" />
                          {!collapsed && (
                            <span className="truncate text-[13px]">{label}</span>
                          )}
                        </button>
                      </TooltipTrigger>
                      {collapsed && (
                        <TooltipContent side="right" className="text-xs font-medium">
                          {label}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Import button ── */}
        <div className={cn("border-t p-2", collapsed && "flex justify-center")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onImport}
                className={cn(
                  "flex items-center gap-2 rounded-md text-xs font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90",
                  collapsed ? "w-9 h-9 justify-center" : "w-full px-3 py-2"
                )}
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                {!collapsed && "Import Data"}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="text-xs font-medium">
                Import Salesforce Data
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
