
import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

function Accordion({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex flex-col gap-2", className)}
      {...props}
      data-oid="yagd-mn"
    />
  );
}

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        "border-border focus-within:ring-ring/50 focus-within:border-ring rounded-lg border focus-within:ring-[3px] focus-within:outline-none",
        className,
      )}
      {...props}
      data-oid="8wxnuga"
    />
  );
}

function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header data-slot="accordion-header" className="flex" data-oid="9.wr638">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 items-center justify-between gap-2 rounded-md px-4 py-3 font-medium transition-all hover:bg-accent/50 outline-none [&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
        data-oid="jq8_flm"
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" data-oid=":m1-gb9" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn(
        "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
        className,
      )}
      {...props}
      data-oid="e2:9yti"
    >
      <div className="px-4 pb-4 pt-0" data-oid="a:7f4bu">
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
