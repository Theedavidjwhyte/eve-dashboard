import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full flex gap-3", {
  variants: {
    variant: {
      default: "bg-background/50 border-gray-200 text-foreground",
      destructive:
        "accent-destructive bg-[var(--accent-bg-outline)] border-[var(--accent-border)] text-[var(--accent-text-on-outline)]",
      success:
        "accent-success bg-[var(--accent-bg-outline)] border-[var(--accent-border)] text-[var(--accent-text-on-outline)]",
      warning:
        "accent-warning bg-[var(--accent-bg-outline)] border-[var(--accent-border)] text-[var(--accent-text-on-outline)]",
      info: "accent-info bg-[var(--accent-bg-outline)] border-[var(--accent-border)] text-[var(--accent-text-on-outline)]",
    },
    size: {
      default: "rounded-xl border p-4 min-h-[60px] items-start",
      compact: "rounded-lg border px-3 py-2 items-center",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export const variantIcons = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

type AlertVariant = keyof typeof variantIcons;

function Alert({
  className,
  variant,
  size,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return (
    <div data-slot="alert" role="alert" className={cn(alertVariants({ variant, size }), className)} {...props}>
      {children}
    </div>
  );
}

function AlertIcon({ variant = "default", className }: { variant?: AlertVariant; className?: string }) {
  const IconComponent = variantIcons[variant];
  const colorClass = variant === "default" ? "text-gray-500" : "text-[var(--accent-border)]";

  return <IconComponent className={cn("h-5 w-5 shrink-0", colorClass, className)} data-slot="alert-icon" />;
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      data-slot="alert-title"
      className={cn("text-sm font-semibold leading-none tracking-tight mb-1", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div data-slot="alert-description" className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />;
}

function AlertClose({ className, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      data-slot="alert-close"
      className={cn(
        "absolute top-3 right-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  );
}

export { Alert, AlertIcon, AlertTitle, AlertDescription, AlertClose };
export type AlertProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>;
