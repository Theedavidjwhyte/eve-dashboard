// components/ui/sticky-wrapper.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StickyWrapperProps {
  /**
   * Content to show when not scrolled
   */
  children: React.ReactNode;

  /**
   * Content to show when scrolled (compact mode)
   */
  compactContent?: React.ReactNode;

  /**
   * The scroll position at which to transition to compact mode
   * @default 200
   */
  threshold?: number;

  /**
   * Height of the layout header in pixels (e.g., 64 for h-16)
   * @default 0
   */
  headerOffset?: number;

  /**
   * Custom scroll container selector. If not provided, uses window
   * @default null
   */
  scrollContainer?: string;

  /**
   * Whether to hide on scroll down (mobile behavior)
   * @default false
   */
  hideOnScrollDown?: boolean;

  /**
   * Z-index for the sticky element
   * @default 40
   */
  zIndex?: number;

  /**
   * Additional class for the wrapper
   */
  className?: string;

  /**
   * Background color/class for the sticky wrapper
   * @default 'bg-background'
   */
  background?: string;

  /**
   * Callback when transitioning between states
   */
  onTransition?: (isCompact: boolean) => void;
}

export const StickyWrapper = React.forwardRef<HTMLDivElement, StickyWrapperProps>(
  (
    {
      children,
      compactContent,
      threshold = 200,
      headerOffset = 0,
      scrollContainer,
      hideOnScrollDown = false,
      zIndex = 40,
      className,
      background = "bg-background",
      onTransition,
    },
    ref,
  ) => {
    const [isCompact, setIsCompact] = React.useState(false);
    const [isVisible, setIsVisible] = React.useState(true);
    const lastScrollY = React.useRef(0);

    React.useEffect(() => {
      // Calculate thresholds based on header height
      const COMPACT_ENTER = threshold - headerOffset;
      const COMPACT_EXIT = COMPACT_ENTER - 40;

      // Find scroll container
      const getScrollElement = () => {
        if (scrollContainer) {
          return document.querySelector(scrollContainer) as HTMLElement | null;
        }
        return null;
      };

      const scrollElement = getScrollElement() || window;

      const getCurrentScroll = () => {
        if (scrollElement === window) {
          return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        }
        return (scrollElement as HTMLElement).scrollTop;
      };

      const update = () => {
        const currentScrollY = getCurrentScroll();
        const scrollingDown = currentScrollY > lastScrollY.current;

        // Update compact state if compact content is provided
        if (compactContent) {
          setIsCompact((prev) => {
            const newState =
              !prev && currentScrollY > COMPACT_ENTER ? true : prev && currentScrollY < COMPACT_EXIT ? false : prev;

            if (newState !== prev) {
              onTransition?.(newState);
            }

            return newState;
          });
        }

        // Hide on scroll down behavior (for mobile)
        if (hideOnScrollDown && window.innerWidth < 768) {
          if (scrollingDown && currentScrollY > 100) {
            setIsVisible(false);
          } else {
            setIsVisible(true);
          }
        }

        lastScrollY.current = currentScrollY;
      };

      let ticking = false;
      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            update();
            ticking = false;
          });
          ticking = true;
        }
      };

      // Initial check
      update();

      // Add scroll listener
      if (scrollElement === window) {
        window.addEventListener("scroll", handleScroll, { passive: true });
      } else {
        (scrollElement as HTMLElement).addEventListener("scroll", handleScroll, { passive: true });
      }

      return () => {
        if (scrollElement === window) {
          window.removeEventListener("scroll", handleScroll);
        } else {
          (scrollElement as HTMLElement)?.removeEventListener("scroll", handleScroll);
        }
      };
    }, [threshold, headerOffset, scrollContainer, hideOnScrollDown, compactContent, onTransition]);

    // If no compact content provided, just render children sticky
    if (!compactContent) {
      return (
        <div
          ref={ref}
          className={cn(
            "sticky bg-background transition-all duration-300",
            background,
            !isVisible && "-translate-y-full",
            className,
          )}
          style={{
            top: `${headerOffset}px`,
            zIndex,
          }}
        >
          {children}
        </div>
      );
    }

    // Render with transitions between full and compact
    return (
      <div
        ref={ref}
        className={cn(
          "sticky bg-background transition-all duration-300",
          background,
          !isVisible && "-translate-y-full",
          className,
        )}
        style={{
          top: `${headerOffset}px`,
          zIndex,
        }}
      >
        <div className="relative">
          {/* Full content - visible when not scrolled */}
          <div
            className={cn(
              "transition-all duration-300",
              isCompact ? "opacity-0 pointer-events-none h-0 overflow-hidden" : "opacity-100",
            )}
          >
            {children}
          </div>

          {/* Compact content - visible when scrolled */}
          <div
            className={cn(
              "transition-all duration-300",
              !isCompact ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100",
            )}
          >
            {compactContent}
          </div>
        </div>
      </div>
    );
  },
);

StickyWrapper.displayName = "StickyWrapper";
