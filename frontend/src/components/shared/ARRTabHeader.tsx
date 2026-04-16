import React from "react"
import { LucideIcon } from "lucide-react"
import { LineChart } from "lucide-react"

interface ARRTabHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  breadcrumb?: string
  importDate?: string | null
  actions?: React.ReactNode
}

export function ARRTabHeader({
  title,
  description,
  icon: Icon = LineChart,
  breadcrumb = "ARR",
  importDate,
  actions,
}: ARRTabHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-teal-500/10 mt-0.5">
          <Icon className="h-5 w-5 text-teal-500" />
        </div>
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
            <span>{breadcrumb}</span>
            <span>›</span>
            <span>{title}</span>
          </div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
          {importDate && (
            <p className="text-xs text-muted-foreground mt-1">
              Imported {importDate}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
