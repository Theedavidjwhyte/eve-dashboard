// components/ui/info-pair.tsx
"use client";

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoPairProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  onCopy?: (value: string) => void;
  showCopy?: boolean;
  className?: string;
}

export const InfoPair: React.FC<InfoPairProps> = ({ 
  icon: Icon, 
  label, 
  value, 
  onCopy,
  showCopy = true,
  className 
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      onCopy?.(value);
      setTimeout(() => setIsCopied(false), 600);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div 
      className={cn(
        "flex items-start gap-1.5 group rounded py-1 mr-2 transition-colors",
        showCopy && "cursor-pointer",
        className
      )}
      onClick={showCopy ? handleCopy : undefined}
    >
      <Icon className="w-4 h-4 text-foreground flex-shrink-0 self-start" />
      <div className="flex gap-2 min-w-0 items-start">
        <span className="text-xs text-foreground items-start whitespace-nowrap">{label}:</span>
        <span className="text-xs font-semibold text-foreground items-start break-words max-w-[80vw] sm:max-w-[40ch] md:max-w-[60ch] lg:max-w-[80ch] xl:max-w-full"> 
          {value}
        </span>
      </div>
      {showCopy && (
        <div className="relative w-3 h-3">
          <Copy 
            className={`h-3 w-3 text-foreground-muted absolute inset-0 transition-all duration-200 ${
              isCopied ? 'opacity-0 scale-75' : 'opacity-0 group-hover:opacity-100 scale-100'
            }`} 
          />
          <Check 
            className={`h-3 w-3 text-primary absolute inset-0 transition-all duration-200 ${
              isCopied ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`} 
          />
        </div>
      )}
    </div>
  );
};