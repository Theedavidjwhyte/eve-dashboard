import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/dashboardStore"
import type { TabId } from "@/types"
import { getAvatar, AD_ORDER } from "@/config/avatars"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Lightbulb, List, BarChart2, Calendar, TrendingUp, Activity,
  CheckSquare, Wrench, Target, Building2, FileText, ChevronLeft,
  ChevronRight, Download, Zap, Network, GitBranch, Send, LineChart,
  AlertCircle, Users, BrainCircuit, TrendingDown, ClipboardList,
  Workflow, ChevronDown, Package, Database, BarChart, Route,
  ShieldAlert, Repeat, FileSearch,
} from "lucide-react"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

interface NavItem {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
  defaultOpen?: boolean
}

interface NavSection {
  label: string
  standalone?: NavItem   // for items like Insights that aren't in a group
  groups?: NavGroup[]
}

const NAV: NavSection[] = [
  {
    label: "Overview",
    standalone: { id: "insights", label: "Insights", icon: Lightbulb },
  },
  {
    label: "Sales",
    groups: [
      {
        label: "Pipeline",
        icon: BarChart2,
        items: [
          { id: "monthly",   label: "Monthly",      icon: Calendar   },
          { id: "quarterly", label: "Quarterly",    icon: BarChart2  },
          { id: "ytd",       label: "Year (YTD)",   icon: TrendingUp },
          { id: "services",  label: "Services",     icon: Wrench     },
        ],
      },
      {
        label: "Forecast",
        icon: Send,
        items: [
          { id: "forecast-post", label: "Forecast Post", icon: Send },
        ],
      },
    ],
  },
  {
    label: "Sales Analysis",
    groups: [
      {
        label: "Deals",
        icon: List,
        items: [
          { id: "deals",        label: "All Deals",    icon: List        },
          { id: "dealbreakdown",label: "Deal Review",  icon: Activity    },
          { id: "slipped-deals",label: "Slipped Deals",icon: TrendingDown},
          { id: "closed",       label: "Closed",       icon: CheckSquare },
        ],
      },
      {
        label: "Pipe Review",
        icon: Route,
        items: [
          { id: "route-to-numbers",  label: "Route to Numbers", icon: Target      },
          { id: "pipeline-creation", label: "Pipe Creation",    icon: GitBranch   },
          { id: "conversion",        label: "Conversion",       icon: TrendingUp  },
          { id: "deal-reviews",      label: "Deal Reviews",     icon: FileSearch  },
        ],
      },
    ],
  },
  {
    label: "Account",
    groups: [
      {
        label: "ARR",
        icon: LineChart,
        items: [
          { id: "arr",          label: "Performance",     icon: LineChart    },
          { id: "arr-insights", label: "ARR Insights",    icon: BrainCircuit },
          { id: "arr-monthly",  label: "Budget vs Actual",icon: Calendar     },
          { id: "non-sf-deals", label: "Non SF Deals",    icon: ClipboardList},
          { id: "arr-ad",       label: "AD Summary",      icon: Users        },
          { id: "arr-churn",    label: "Churn",           icon: ShieldAlert  },
          { id: "arr-dupes",    label: "Duplications",    icon: Repeat       },
          { id: "arr-exempt",   label: "Exemptions",      icon: AlertCircle  },
        ],
      },
    ],
  },
  {
    label: "Reporting",
    groups: [
      {
        label: "Reporting",
        icon: FileText,
        items: [
          { id: "reports",  label: "Reports & Exports", icon: FileText  },
        ],
      },
    ],
  },
  {
    label: "Structure",
    groups: [
      {
        label: "Structure",
        icon: Database,
        items: [
          { id: "raw-data",     label: "Raw Data",     icon: Database  },
          { id: "accounts",     label: "Accounts",     icon: Building2 },
          { id: "budget",       label: "Budget",       icon: Target    },
          { id: "products",     label: "Products",     icon: Package   },
          { id: "network",      label: "Network Map",  icon: Network   },
          { id: "data-lineage", label: "Data Lineage", icon: Workflow  },
        ],
      },
    ],
  },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { currentTab, setTab, data, importDate, filters, setFilters, arrDeals, arrImportDate } = useDashboardStore()

  // All groups collapsed by default
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  function isGroupOpen(key: string): boolean {
    return openGroups[key] === true
  }
  function toggleGroup(key: string) {
    setOpenGroups(s => ({ ...s, [key]: !s[key] }))
  }

  // Auto-expand group containing active tab
  function isActiveInGroup(items: NavItem[]): boolean {
    return items.some(i => i.id === currentTab)
  }

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
    const next = arr.includes(name) ? arr.filter(n => n !== name) : [...arr, name]
    if (next.length === 0) setFilters({ user: "All" })
    else if (next.length === 1) setFilters({ user: next[0] })
    else setFilters({ user: next })
  }

  const dataCount = data.length
  const arrLoaded = arrDeals.length > 0

  function renderNavItem(item: NavItem, indent = false) {
    const Icon = item.icon
    const active = currentTab === item.id
    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setTab(item.id)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all font-medium",
              indent && !collapsed ? "pl-4" : "",
              active
                ? "bg-primary/10 text-primary border-l-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-3.5 h-3.5")} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        </TooltipTrigger>
        {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
      </Tooltip>
    )
  }

  function renderGroup(group: NavGroup, sectionLabel: string) {
    const GroupIcon = group.icon
    const key = `${sectionLabel}::${group.label}`
    const hasActive = isActiveInGroup(group.items)
    const open = isGroupOpen(key) || hasActive

    return (
      <div key={key}>
        <button
          onClick={() => toggleGroup(key)}
          className={cn(
            "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold transition-all",
            hasActive ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <div className="flex items-center gap-2">
            <GroupIcon className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>{group.label}</span>}
          </div>
          {!collapsed && (
            <ChevronDown className={cn("w-3 h-3 transition-transform", open ? "rotate-180" : "")} />
          )}
        </button>
        {open && !collapsed && (
          <div className="ml-2 border-l pl-2 mt-0.5 space-y-0.5">
            {group.items.map(item => renderNavItem(item))}
          </div>
        )}
        {open && collapsed && (
          <div className="space-y-0.5 mt-0.5">
            {group.items.map(item => renderNavItem(item))}
          </div>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={100}>
      <aside className={cn(
        "flex flex-col h-screen border-r bg-card transition-all duration-200 shrink-0 relative",
        collapsed ? "w-[56px]" : "w-[220px]"
      )}>
        {/* Brand */}
        <div className={cn("flex items-center gap-3 border-b", collapsed ? "px-3 py-4 justify-center" : "px-5 py-4")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-black text-xs select-none cursor-default tracking-widest">
                EVE
              </div>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right" className="font-bold">E.V.E — Expected Value Engine</TooltipContent>}
          </Tooltip>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-black text-xl leading-none tracking-[0.2em] text-foreground uppercase">E.V.E</div>
              <div className="text-[9px] text-muted-foreground leading-tight mt-0.5 truncate uppercase tracking-widest font-medium">Expected Value Engine</div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button onClick={onToggle} className={cn(
          "absolute top-[52px] -right-3 z-50 w-6 h-6 rounded-full border bg-card shadow-md",
          "flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
        )} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* AD avatars — collapsed */}
        {dataCount > 0 && collapsed && (
          <div className="flex flex-col items-center gap-1.5 mx-2 mt-3">
            {AD_ORDER.map(name => {
              const av = getAvatar(name)
              const isSelected = isAdSelected(name)
              const isDimmed = isAdDimmed(name)
              return (
                <Tooltip key={name}>
                  <TooltipTrigger asChild>
                    <button onClick={() => toggleAd(name)}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                        isSelected ? "ring-2 ring-offset-1 ring-offset-background scale-110"
                          : isDimmed ? "opacity-30 hover:opacity-70"
                          : "opacity-80 hover:opacity-100 hover:scale-105"
                      )}
                      style={{ backgroundColor: `#${av.bg}`, color: `#${av.fg}` }}>
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

        {/* Data pill */}
        {(dataCount > 0 || arrLoaded) && !collapsed && (
          <div className="mx-3 mt-3 px-2 py-1.5 rounded-lg bg-muted/50 border text-[9px] text-muted-foreground space-y-1">
            {dataCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span><span className="font-semibold text-foreground">{dataCount}</span> OI deals
                  {importDate && <span className="ml-1 text-muted-foreground/60">{new Date(importDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                </span>
              </div>
            )}
            {arrLoaded && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <span><span className="font-semibold text-foreground">{arrDeals.length}</span> ARR deals
                  {arrImportDate && <span className="ml-1 text-muted-foreground/60">{new Date(arrImportDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
          {NAV.map(section => (
            <div key={section.label}>
              {/* Section label */}
              {!collapsed && (
                <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest px-2 pb-1">{section.label}</p>
              )}
              {/* Standalone item (e.g. Insights) */}
              {section.standalone && renderNavItem(section.standalone)}
              {/* Groups */}
              {section.groups?.map(group => renderGroup(group, section.label))}
            </div>
          ))}
        </nav>

        {/* AD filter strip */}
        {dataCount > 0 && !collapsed && (
          <div className="border-t px-3 py-2">
            <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1.5">Account Directors</p>
            <div className="flex flex-wrap gap-1">
              {AD_ORDER.map(name => {
                const av = getAvatar(name)
                const isSelected = isAdSelected(name)
                const isDimmed = isAdDimmed(name)
                return (
                  <Tooltip key={name}>
                    <TooltipTrigger asChild>
                      <button onClick={() => toggleAd(name)}
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-all",
                          isSelected ? "ring-2 ring-offset-1 ring-offset-background scale-110"
                            : isDimmed ? "opacity-25 hover:opacity-60"
                            : "opacity-75 hover:opacity-100 hover:scale-105"
                        )}
                        style={{ backgroundColor: `#${av.bg}`, color: `#${av.fg}` }}>
                        {av.initials}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs font-semibold">
                      {isSelected ? `${name} — click to deselect` : name}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}
