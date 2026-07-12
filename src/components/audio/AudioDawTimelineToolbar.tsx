/**
 * Zoom toolbar for audio DAW timeline.
 * Location: src/components/audio/AudioDawTimelineToolbar.tsx
 */

import { ZoomIn, ZoomOut } from "lucide-react";

const MIN_PX_PER_SEC = 2;
const MAX_PX_PER_SEC = 200;

export interface AudioDawTimelineToolbarProps {
  pxPerSec: number;
  onPxPerSecChange: (value: number) => void;
}

export function AudioDawTimelineToolbar({
  pxPerSec,
  onPxPerSecChange,
}: AudioDawTimelineToolbarProps) {
  const zoomOut = () =>
    onPxPerSecChange(Math.max(pxPerSec / 1.25, MIN_PX_PER_SEC));
  const zoomIn = () =>
    onPxPerSecChange(Math.min(pxPerSec * 1.25, MAX_PX_PER_SEC));

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 shrink-0">
      <span className="text-xs font-medium text-muted-foreground">
        Audio-Timeline
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={zoomOut}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Herauszoomen"
          aria-label="Timeline herauszoomen"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
          {Math.round(pxPerSec)}px/s
        </span>
        <button
          type="button"
          onClick={zoomIn}
          className="p-1.5 rounded hover:bg-muted transition-colors"
          title="Hineinzoomen"
          aria-label="Timeline hineinzoomen"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
