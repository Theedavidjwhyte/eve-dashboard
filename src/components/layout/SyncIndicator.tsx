import React from "react"
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SyncStatus } from "@/lib/supabase"
import { supabaseConfigured } from "@/lib/supabase"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SyncIndicatorProps {
  status: SyncStatus
  lastSynced: Date | null
  onRefresh: () => void
}

export function SyncIndicator({ status, lastSynced, onRefresh }: SyncIndicatorProps) {
  if (!supabaseConfigured) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40 text-muted-foreground text-[11px] cursor-default select-none">
              <WifiOff className="w-3 h-3" />
              <span className="hidden sm:inline">Local only</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[240px] text-xs">
            <p className="font-semibold mb-1">Running in local mode</p>
            <p>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment to enable team sync.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const configMap: Record<string, {
    icon: React.ReactNode
    label: string
    dot: string
    text: string
  }> = {
    syncing: {
      icon: <RefreshCw className="w-3 h-3 animate-spin" />,
      label: "Syncing…",
      dot: "bg-amber-400",
      text: "text-amber-400",
    },
    synced: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: lastSynced
        ? `Synced ${lastSynced.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
        : "Synced",
      dot: "bg-emerald-400",
      text: "text-emerald-400",
    },
    error: {
      icon: <AlertCircle className="w-3 h-3" />,
      label: "Sync error",
      dot: "bg-red-400",
      text: "text-red-400",
    },
    idle: {
      icon: <Wifi className="w-3 h-3" />,
      label: "Connected",
      dot: "bg-emerald-400",
      text: "text-emerald-400",
    },
    offline: {
      icon: <WifiOff className="w-3 h-3" />,
      label: "Offline",
      dot: "bg-muted-foreground",
      text: "text-muted-foreground",
    },
    local: {
      icon: <WifiOff className="w-3 h-3" />,
      label: "Local only",
      dot: "bg-muted-foreground",
      text: "text-muted-foreground",
    },
  }
  const config = configMap[status] ?? configMap.offline

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onRefresh}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-colors",
              "bg-muted/40 hover:bg-muted/70",
              config.text
            )}
          >
            {/* Live dot */}
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                config.dot,
                status === "synced" && "animate-pulse"
              )}
            />
            <span className="hidden sm:inline">{config.label}</span>
            {config.icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {status === "synced" && (
            <p>Team data is live. Click to refresh now.</p>
          )}
          {status === "syncing" && <p>Fetching latest data from Supabase…</p>}
          {status === "error" && (
            <p>Could not reach Supabase. Click to retry.</p>
          )}
          {status === "offline" && (
            <p>No Supabase connection. Data is local only.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
