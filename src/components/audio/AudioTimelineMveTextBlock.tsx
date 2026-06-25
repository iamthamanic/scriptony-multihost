/**
 * AudioTimelineMveTextBlock — visual placeholder for an MVE line without audio.
 *
 * Renders as a scene-like colored block inside the audio dialog lane. It shows
 * the line text (or a placeholder) and can later be extended with inline editing,
 * tag highlighting, and an audio-generation menu (Issue T27).
 *
 * Location: src/components/audio/AudioTimelineMveTextBlock.tsx
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";

export interface AudioTimelineMveTextBlockProps {
  line: MveLine;
  pxPerSec: number;
  viewStartSec: number;
  sceneStartSec: number;
  sceneEndSec: number;
  onClick?: (lineId: string) => void;
}

export function AudioTimelineMveTextBlock({
  line,
  pxPerSec,
  viewStartSec,
  sceneStartSec,
  sceneEndSec,
  onClick,
}: AudioTimelineMveTextBlockProps) {
  const widthSec = Math.max(sceneEndSec - sceneStartSec, 1);

  const style = useMemo(
    () => ({
      left: `${(sceneStartSec - viewStartSec) * pxPerSec}px`,
      width: `${widthSec * pxPerSec}px`,
    }),
    [sceneStartSec, viewStartSec, pxPerSec, widthSec],
  );

  const displayText = line.text?.trim() || "Text hinzufügen…";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Textblock: ${displayText}`}
      className={cn(
        "absolute top-0.5 bottom-0.5 rounded border border-primary/40",
        "bg-primary/20 hover:bg-primary/30 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "flex items-center px-1 overflow-hidden cursor-pointer",
        line.status === "dirty" && "ring-1 ring-warning/50",
      )}
      style={style}
      onClick={() => onClick?.(line.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(line.id);
        }
      }}
    >
      <span
        className={cn(
          "truncate text-[10px] font-medium text-foreground",
          !line.text?.trim() && "italic opacity-70",
        )}
        title={displayText}
      >
        {displayText}
      </span>
    </div>
  );
}
