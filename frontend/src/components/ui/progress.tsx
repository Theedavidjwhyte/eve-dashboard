
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

export interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  accent?: "teal" | "purple" | "info" | "success" | "warning" | "destructive";
  variant?: "default" | "mini";
}

function Progress({ className, value, accent, variant = "default", ...props }: ProgressProps) {
  const accentClass = accent ? `accent-${accent}` : "";

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative w-full overflow-hidden",
        variant === "mini" ? "h-1 min-h-[0.25rem] rounded" : "h-2 rounded-full",
        accent ? "bg-[var(--accent-bg-outline)]" : "bg-primary/20",
        accentClass,
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          variant === "mini" ? "h-1 min-h-[0.25rem]" : "h-2",
          "w-full flex-1 transition-all",
          accent ? "bg-[var(--accent-bg-solid)]" : "bg-primary",
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
