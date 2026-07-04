/**
 * One timeline row: sticky label column + scrollable content column (CapCut / FL Studio).
 * Location: src/components/structure/timeline/StructureTimelineRowShell.tsx
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StructureTimelineRowShellProps {
  labelWidthClass: string;
  contentWidthPx: number;
  label: ReactNode;
  children: ReactNode;
  labelTestId?: string;
  contentTestId?: string;
  heightPx?: number;
  className?: string;
  labelClassName?: string;
  contentClassName?: string;
}

export function StructureTimelineRowShell({
  labelWidthClass,
  contentWidthPx,
  label,
  children,
  labelTestId,
  contentTestId,
  heightPx,
  className,
  labelClassName,
  contentClassName,
}: StructureTimelineRowShellProps) {
  const rowStyle =
    heightPx != null ? { minHeight: `${heightPx}px` } : undefined;

  return (
    <div
      className={cn("flex w-max min-w-full shrink-0", className)}
      style={rowStyle}
    >
      <div
        className={cn(
          "sticky left-0 z-20 shrink-0 overflow-x-hidden border-r border-border bg-card",
          labelWidthClass,
          labelClassName,
        )}
        data-testid={labelTestId}
      >
        {label}
      </div>
      <div
        className={cn("relative shrink-0", contentClassName)}
        style={{ width: `${contentWidthPx}px` }}
        data-testid={contentTestId}
      >
        {children}
      </div>
    </div>
  );
}
