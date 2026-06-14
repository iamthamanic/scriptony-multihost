/**
 * Visual marquee rectangle — CapCut-style (semi-transparent + white border).
 * Location: src/components/timeline/TimelineMarqueeOverlay.tsx
 */

import type { MarqueeRect } from "../../lib/timeline-selection/types";

interface TimelineMarqueeOverlayProps {
  rect: MarqueeRect | null;
}

export function TimelineMarqueeOverlay({ rect }: TimelineMarqueeOverlayProps) {
  if (!rect || rect.width < 1 || rect.height < 1) return null;

  return (
    <div
      className="pointer-events-none absolute z-[60] border-2 border-white/90 bg-white/20 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
      aria-hidden
    />
  );
}
