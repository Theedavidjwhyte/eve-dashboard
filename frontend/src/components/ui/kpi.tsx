import * as React from "react";
import { Info, User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./card";
import { cn } from "@/lib/utils";

export interface KPIProps {
  label: string;
  value: number | string;
  period?: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: "default" | "mini";
  accent?:
    | "teal"
    | "purple"
    | "info"
    | "success"
    | "warning"
    | "destructive"
    | "nile"
    | "cerulean"
    | "lagoon"
    | "eagle"
    | "sap"
    | "orange"
    | "brick"
    | "red"
    | "violet"
    | "blue-violet";
  className?: string;
}

function KPI({ label, value, period, description, icon, variant = "default", accent = "teal", className }: KPIProps) {
  const accentClass = `accent-${accent}`;

  if (variant === "mini") {
    return (
      <div className={cn("min-w-[130px] h-full flex flex-col items-left text-center", accentClass, className)}>
        <div className="flex items-center gap-3">
          <div className="rounded-full p-2 bg-[var(--accent-bg-outline)] flex items-left justify-left">
            <div style={{ color: "var(--accent-text-on-outline)" }}>{icon ?? <User className="w-4 h-4" />}</div>
          </div>
          <div className="flex flex-col items-start">
            <div className="text-sm text-card-foreground mb-0.5">{label}</div>
            <div className="text-2xl font-semibold" style={{ color: "var(--accent-text-on-light)" }}>
              {value}
            </div>
          </div>
        </div>
        {period && <div className="text-xs text-muted-foreground mt-1">{period}</div>}
        {description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</div>}
      </div>
    );
  }

  return (
    <Card className={cn("h-full shadow-md", accentClass, className)}>
      <CardHeader className="flex flex-row items-start justify-between pb-0">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="text-lg font-semibold">{label}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <span className="rounded-full p-1 text-muted-foreground">
          <Info className="w-5 h-5" />
        </span>
      </CardHeader>
      <CardContent className="flex items-center gap-4 pt-2">
        <div className="rounded-full p-3" style={{ backgroundColor: "var(--accent-bg-outline)" }}>
          <div style={{ color: "var(--accent-text-on-outline)" }}>{icon ?? <User className="w-7 h-7" />}</div>
        </div>
        <div>
          <div className="text-4xl font-semibold" style={{ color: "var(--accent-text-on-light)" }}>
            {value}
          </div>
          <div className="text-muted-foreground text-base">{period}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export { KPI };
