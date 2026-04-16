import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-[var(--accent-border)] bg-[var(--accent-bg-outline)] text-[var(--accent-text-on-outline)] hover:bg-[var(--accent-bg-outline)]/80",
        outline: "text-foreground border-border hover:bg-accent hover:text-accent-foreground",
        success:
          "border-[var(--accent-border)] bg-[var(--accent-bg-outline)] text-[var(--accent-text-on-outline)] hover:bg-[var(--accent-bg-outline)]/80",
        warning:
          "border-[var(--accent-border)] bg-[var(--accent-bg-outline)] text-[var(--accent-text-on-outline)] hover:bg-[var(--accent-bg-outline)]/80",
        info: "border-[var(--accent-border)] bg-[var(--accent-bg-outline)] text-[var(--accent-text-on-outline)] hover:bg-[var(--accent-bg-outline)]/80",
        accent:
          "border-[var(--accent-border)] bg-[var(--accent-bg-outline)] text-[var(--accent-text-on-outline)] hover:bg-[var(--accent-bg-outline)]/80",
        solid:
          "border-[var(--accent-border)] bg-[var(--accent-bg-solid)] text-[var(--accent-text-on-solid)] hover:bg-[var(--accent-bg-solid)]/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
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
  onClose?: () => void;
}

function Badge({ className, variant, accent, onClose, children, ...props }: BadgeProps) {
  // Always apply the correct accent class for status variants if accent is not provided
  let accentClass = "";
  if (accent) {
    accentClass = `accent-${accent}`;
  } else if (variant === "success" || variant === "warning" || variant === "info" || variant === "destructive") {
    accentClass = `accent-${variant}`;
  }

  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), accentClass, onClose && "pr-1.5", className)}
      {...props}
    >
      {children}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Remove badge"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

export { Badge, badgeVariants };
