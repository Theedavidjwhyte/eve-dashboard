import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  return (
    <nav className={cn("flex items-center text-sm text-muted-foreground", className)} aria-label="Breadcrumb">
      {items.map((item, idx) => (
        <span key={item.href || item.label} className="flex items-center">
          {idx > 0 && <ChevronRight className="mx-2 h-4 w-4 text-gray-400" aria-hidden="true" />}
          {item.href ? (
            <a href={item.href} className="hover:underline text-primary flex items-center gap-1">
              {item.icon}
              {item.label}
            </a>
          ) : (
            <span className="font-medium flex items-center gap-1">
              {item.icon}
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumb;
