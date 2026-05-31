/**
 * TransportToggle — M/S/R (and similar) for playlist track header.
 */

import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

export interface TransportToggleProps {
  label?: string;
  icon?: ReactNode;
  active?: boolean;
  activeClassName?: string;
  className?: string;
  onClick: () => void;
  ariaLabel: string;
}

export function TransportToggle({
  label,
  icon,
  active,
  activeClassName,
  className,
  onClick,
  ariaLabel,
}: TransportToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-5 w-5 shrink-0 text-[9px] font-bold rounded border border-border/80",
        "inline-flex items-center justify-center transition-colors",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        active
          ? activeClassName
          : "bg-muted/60 hover:bg-muted text-muted-foreground",
        className,
      )}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      {icon ?? label}
    </button>
  );
}
