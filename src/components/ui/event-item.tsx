import React, { useEffect, useRef, useState } from "react";
import { MapPin, Monitor, Building, Users, Calendar, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// Define color variants for the EventItem using your accent color system
const eventItemVariants = {
  teal: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  purple: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  info: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  success: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  warning: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  destructive: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  nile: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  cerulean: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  lagoon: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  eagle: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  sap: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  orange: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  brick: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  red: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  violet: "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
  "blue-violet": "border-l-[var(--accent-border)] bg-[var(--accent-bg-outline)]",
} as const;

type EventItemVariant = keyof typeof eventItemVariants;

// Define the event type
export interface EventData {
  id: string;
  title: string;
  appointmentType: string;
  location: string;
  category: string;
  time?: string;
  date?: Date;
  categoryIcon?: React.ReactNode;
}

// Define the props interface
export interface EventItemProps {
  event: EventData;
  onClick?: (event: EventData) => void;
  className?: string;
  variant?: EventItemVariant;
  categoryIconMap?: Record<string, React.ReactNode>;
}

// Default category icon mapping
const defaultCategoryIconMap: Record<string, React.ReactNode> = {
  Clinic: <Building className="w-3 h-3" />,
  Community: <Users className="w-3 h-3" />,
  Outlook: <Calendar className="w-3 h-3" />,
  Home: <Home className="w-3 h-3" />,
};

// Main EventItem component for export
export const EventItem: React.FC<EventItemProps> = ({
  event,
  onClick,
  className,
  variant = "teal",
  categoryIconMap = defaultCategoryIconMap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Get the appropriate icon for the category
  const getCategoryIcon = () => {
    if (event.categoryIcon) {
      return event.categoryIcon;
    }
    return categoryIconMap[event.category] || null;
  };

  const categoryIcon = getCategoryIcon();
  const isWide = dimensions.width >= 350;
  const canShow2Lines = dimensions.height >= 45;
  const canShow3Lines = dimensions.height >= 60;
  const canShow4Lines = dimensions.height >= 75;

  // Adjust minimum height based on available space
  const isVerySmall = dimensions.height < 40;
  const minHeightClass = "min-h-[24px]";

  const baseClasses = `w-full h-full ${minHeightClass} rounded cursor-pointer hover:opacity-90 text-sm transition-all border-l-4`;
  const variantClasses = eventItemVariants[variant];
  const accentClass = `accent-${variant}`;
  const combinedClasses = cn(baseClasses, variantClasses, accentClass, className);

  return (
    <div ref={containerRef} className={combinedClasses} onClick={() => onClick?.(event)}>
      {/* Container with responsive layout */}
      <div className={`h-full ${isVerySmall ? "p-1" : "p-1.5"} min-h-0`}>
        {isWide ? (
          /* Wide layout (≥350px): Two columns */
          <div className="flex justify-between items-start gap-2 h-full">
            {/* Left column: Name + Type */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="font-semibold truncate leading-tight text-xs">{event.title}</div>
              {canShow2Lines && !isVerySmall && (
                <div className="text-xs opacity-70 truncate">{event.appointmentType}</div>
              )}
            </div>

            {/* Right column: Location + Category */}
            <div className="shrink-0 text-right text-xs flex flex-col justify-center">
              {event.location && canShow2Lines && !isVerySmall && (
                <div className="opacity-60 truncate flex items-center justify-end gap-1">
                  {event.location === "Remote" ? <Monitor className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                  <span>{event.location}</span>
                </div>
              )}
              {event.category && canShow3Lines && !isVerySmall && (
                <div className="opacity-60 mt-0.5 flex items-center justify-end gap-1">
                  {categoryIcon}
                  <span>{event.category}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Narrow layout (<350px): Vertical stack */
          <div className="flex flex-col justify-center h-full gap-0.5">
            {/* Line 1: Always show name */}
            <div className="font-semibold truncate leading-tight text-xs">{event.title}</div>

            {/* Line 2: Show if height allows (>= ~45px) */}
            {canShow2Lines && !isVerySmall && (
              <div className="text-xs opacity-70 truncate">{event.appointmentType}</div>
            )}

            {/* Line 3: Show if height allows (>= ~60px) */}
            {event.location && canShow3Lines && !isVerySmall && (
              <div className="text-xs opacity-60 truncate flex items-center gap-1">
                {event.location === "Remote" ? <Monitor className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                <span>{event.location}</span>
              </div>
            )}

            {/* Line 4: Show if height allows (>= ~75px) */}
            {event.category && canShow4Lines && !isVerySmall && (
              <div className="text-xs opacity-60 truncate flex items-center gap-1">
                {categoryIcon}
                <span>{event.category}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
