import * as React from "react";
import * as RadixHoverCard from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";

const HoverCard = RadixHoverCard.Root;
const HoverCardTrigger = RadixHoverCard.Trigger;
const HoverCardPortal = RadixHoverCard.Portal;
const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof RadixHoverCard.Content>,
  React.ComponentPropsWithoutRef<typeof RadixHoverCard.Content>
>(({ className, ...props }, ref) => (
  <RadixHoverCard.Portal>
    <RadixHoverCard.Content
      ref={ref}
      className={cn(
        "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95",
        className,
      )}
      {...props}
    />
  </RadixHoverCard.Portal>
));
HoverCardContent.displayName = RadixHoverCard.Content.displayName;

const HoverCardArrow = RadixHoverCard.Arrow;

export { HoverCard, HoverCardTrigger, HoverCardContent, HoverCardArrow, HoverCardPortal };
