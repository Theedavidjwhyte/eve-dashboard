import * as React from "react";
import { User } from "lucide-react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm", className)}
      {...props}
      data-oid="e:mgr6h"
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 mt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
      data-oid="qjdidc1"
    />
  );
}

function CardIconHeader({
  icon,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { icon?: React.ReactNode }) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex items-center gap-3 px-3 py-0 pb-2 pt-2 border-b border-gray-200", className)}
      {...props}
      data-oid="ueqb-kw"
    >
      <div className="rounded-full bg-teal-100/50 p-2.5 flex items-center justify-center" data-oid="k3uyo23">
        {icon ?? <User size={22} className="text-teal-700" data-oid="i0vkx9a" />}
      </div>
      <div className="text-m font-semibold" data-oid="q7cr8t.">
        {children}
      </div>
    </div>
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-title" className={cn("leading-none font-semibold", className)} {...props} data-oid="l4b-nqn" />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
      data-oid="uj:gjlh"
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
      data-oid="5136q95"
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6 py-6", className)} {...props} data-oid="9.lro.x" />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 mb-6 [.border-t]:pt-6", className)}
      {...props}
      data-oid="l-k-xim"
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent, CardIconHeader };
