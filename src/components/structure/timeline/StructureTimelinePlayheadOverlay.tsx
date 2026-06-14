/**
 * Single full-height playhead overlay for Structure timeline (T62c).
 * Line spans all tracks; scrub handle lives in the ruler band only.
 * Location: src/components/structure/timeline/StructureTimelinePlayheadOverlay.tsx
 */

import type { PointerEvent } from "react";
import { cn } from "../../ui/utils";

const RULER_HEIGHT_PX = 48;

export interface StructureTimelinePlayheadOverlayProps {
  onPlayheadPointerDown: (event: PointerEvent<HTMLElement>) => void;
  rulerHeightPx?: number;
}

export function StructureTimelinePlayheadOverlay({
  onPlayheadPointerDown,
  rulerHeightPx = RULER_HEIGHT_PX,
}: StructureTimelinePlayheadOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-40"
      aria-hidden
      data-testid="structure-timeline-playhead-overlay"
    >
      <div className="structure-timeline-playhead bg-red-500" />

      <div
        className={cn(
          "structure-timeline-playhead structure-timeline-playhead--scrub",
          "pointer-events-auto",
        )}
        style={{ top: 0, bottom: "auto", height: `${rulerHeightPx}px` }}
        onPointerDown={onPlayheadPointerDown}
      >
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full shadow-md cursor-grab active:cursor-grabbing touch-none"
          aria-hidden
        />
      </div>
    </div>
  );
}
