
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const tabsListVariants = cva("inline-flex items-center justify-center gap-1", {
  variants: {
    variant: {
      default: "bg-muted text-muted-foreground h-9 w-fit rounded-lg p-[3px]",
      icon: "bg-transparent rounded-lg p-2 sm:p-3 w-full overflow-visible",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:ring-[3px] focus-visible:border-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground h-[calc(100%-1px)] flex-1 gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        icon: "relative flex gap-2 ps-4 pe-4 py-2 pb-3 rounded-lg text-sm font-medium text-muted-foreground data-[state=active]:text-accent-foreground data-[state=active]:bg-accent hover:bg-muted/50 data-[state=active]:hover:bg-accent [&_svg]:size-5 border border-transparent focus-visible:outline-1 focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:text-muted-foreground focus-visible:ring-[3px] transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-offset-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface TabsListProps extends React.ComponentProps<typeof TabsPrimitive.List>, VariantProps<typeof tabsListVariants> {
  showArrows?: boolean;
}

interface TabsTriggerProps
  extends React.ComponentProps<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {
  showUnderline?: boolean;
  badge?: string | number | boolean;
  badgeVariant?: "default" | "destructive" | "secondary" | "outline";
  isLoading?: boolean;
}

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />;
}

function TabsList({ className, variant, showArrows, children, ...props }: TabsListProps) {
  const [isOverflowing, setIsOverflowing] = React.useState(false);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [touchStart, setTouchStart] = React.useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const tabsListRef = React.useRef<HTMLDivElement>(null);

  // Check if tabs are overflowing
  React.useEffect(() => {
    if (!showArrows || variant !== "icon") return;

    const checkOverflow = () => {
      const container = scrollContainerRef.current;
      const list = tabsListRef.current;

      if (!container || !list) return;

      const containerWidth = container.clientWidth;
      const listWidth = list.scrollWidth;

      setIsOverflowing(listWidth > containerWidth);

      // Check scroll position
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft < listWidth - containerWidth - 1);
    };

    checkOverflow();

    // Create ResizeObserver to detect size changes
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }
    if (tabsListRef.current) {
      resizeObserver.observe(tabsListRef.current);
    }

    // Check on scroll
    const container = scrollContainerRef.current;
    container?.addEventListener("scroll", checkOverflow);

    return () => {
      resizeObserver.disconnect();
      container?.removeEventListener("scroll", checkOverflow);
    };
  }, [showArrows, variant, children]);

  // Focus management - ensure focused tab is visible
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.getAttribute("role") === "tab") {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    };

    container.addEventListener("focusin", handleFocus);
    return () => container.removeEventListener("focusin", handleFocus);
  }, []);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isRTL = document.dir === "rtl" || document.documentElement.dir === "rtl";
    const actualDirection = isRTL ? (direction === "left" ? "right" : "left") : direction;

    const scrollAmount = container.clientWidth * 0.8;
    const targetScroll =
      actualDirection === "left" ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    container.scrollTo({
      left: targetScroll,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      // Minimum swipe distance
      scroll(diff > 0 ? "right" : "left");
    }
  };

  if (variant === "icon" && showArrows) {
    return (
      <div className="relative flex items-center rounded-lg p-2">
        {isOverflowing && (
          <button
            className={cn(
              "absolute start-2 z-10 p-2 rounded-lg transition-colors bg-muted/90 backdrop-blur-sm text-muted-foreground",
              "motion-safe:transition-opacity",
              canScrollLeft ? "hover:bg-muted/50 opacity-100" : "opacity-0 pointer-events-none",
            )}
            aria-label="Previous tabs"
            type="button"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="size-5 rtl:rotate-180" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          className={cn(
            "flex-1 overflow-x-auto scrollbar-hide scroll-smooth",
            "motion-reduce:scroll-auto",
            isOverflowing && "mx-12",
          )}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <TabsPrimitive.List
            ref={tabsListRef}
            data-slot="tabs-list"
            className={cn("flex items-center gap-1 w-max", className)}
            {...props}
          >
            {children}
          </TabsPrimitive.List>
        </div>

        {isOverflowing && (
          <button
            className={cn(
              "absolute end-2 z-10 p-2 rounded-lg transition-colors bg-muted/90 backdrop-blur-sm text-muted-foreground",
              "motion-safe:transition-opacity",
              canScrollRight ? "hover:bg-muted/50 opacity-100" : "opacity-0 pointer-events-none",
            )}
            aria-label="Next tabs"
            type="button"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="size-5 rtl:rotate-180" />
          </button>
        )}
      </div>
    );
  }

  return (
    <TabsPrimitive.List data-slot="tabs-list" className={cn(tabsListVariants({ variant }), className)} {...props}>
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  variant,
  showUnderline,
  badge,
  badgeVariant = "destructive",
  isLoading,
  children,
  ...props
}: TabsTriggerProps) {
  const getBadgeStyles = () => {
    switch (badgeVariant) {
      case "destructive":
        return "bg-destructive text-destructive-foreground";
      case "secondary":
        return "bg-secondary text-secondary-foreground";
      case "outline":
        return "bg-background border border-input text-foreground";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  const renderBadge = () => {
    if (!badge) return null;

    const badgeContent = typeof badge === "boolean" ? "" : badge;
    const isEmptyBadge = typeof badge === "boolean" || badgeContent === "";
    const ariaLabel = isEmptyBadge ? "Has notification" : `${badgeContent} notifications`;

    return (
      <span
        role="status"
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-center rounded-full text-xs font-medium transition-colors",
          "motion-safe:transition-colors",
          isEmptyBadge ? "h-2 w-2 min-w-0" : "h-5 min-w-5 px-1.5",
          getBadgeStyles(),
        )}
      >
        {isEmptyBadge ? <span className="sr-only">Has notification</span> : badgeContent}
      </span>
    );
  };

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        tabsTriggerVariants({ variant }),
        variant === "icon" && showUnderline && "data-[state=active]:[&>span:last-child]:opacity-100",
        "motion-safe:transition-all",
        className,
      )}
      {...props}
    >
      <span className="flex items-center gap-2">
        {isLoading ? <Loader2 className="size-4 animate-spin" aria-label="Loading" /> : null}
        {children}
        {renderBadge()}
      </span>
      {variant === "icon" && showUnderline && (
        <span
          className={cn(
            "absolute bottom-0 start-1 end-1 h-1 bg-primary rounded-full opacity-0 transition-opacity pointer-events-none",
            "motion-safe:transition-opacity",
          )}
          aria-hidden="true"
        />
      )}
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none overflow-auto", "motion-safe:transition-opacity", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
