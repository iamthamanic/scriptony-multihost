/**
 * Bottom drag handle — resizes Structure & Beats timeline panel height.
 * Location: src/components/structure/timeline/StructureTimelinePanelResizeHandle.tsx
 */

import { cn } from "../../ui/utils";
import type { StructureTimelinePanelResizeHandleProps } from "@/hooks/useStructureTimelinePanelHeight";

export function StructureTimelinePanelResizeHandle({
  onPointerDown,
  onDoubleClick,
  isResizing,
}: StructureTimelinePanelResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Timeline-Höhe anpassen"
      title="Ziehen für mehr Spuren. Doppelklick: Standardhöhe."
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      className={cn(
        "flex-shrink-0 h-2 cursor-ns-resize touch-none select-none",
        "border-t border-border bg-muted/40 hover:bg-primary/15 transition-colors",
        isResizing && "bg-primary/25",
      )}
    />
  );
}
