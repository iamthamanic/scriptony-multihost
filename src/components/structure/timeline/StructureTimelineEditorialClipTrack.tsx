/**
 * Editorial clip lane under shots on the structure timeline (T73).
 * Location: src/components/structure/timeline/StructureTimelineFilmProductionTracks.tsx
 */
import type { PointerEvent } from "react";
import type { TimelineData } from "@/lib/timeline-data";
import { getTrackBlockText } from "./tracks/track-block-text";

export interface StructureTimelineEditorialClipTrackProps {
  height: number;
  clipBlocks: Array<{
    id: string;
    x: number;
    width: number;
    sceneId: string;
    shotId?: string;
    startSec: number;
    endSec: number;
  }>;
  timelineData: TimelineData | null | undefined;
  onNleClipPointerDown: (
    clip: {
      id: string;
      sceneId: string;
      shotId?: string;
      startSec: number;
      endSec: number;
    },
    edge: "left" | "right",
    event: PointerEvent<HTMLDivElement>,
  ) => void;
}

export function StructureTimelineEditorialClipTrack({
  height,
  clipBlocks,
  timelineData,
  onNleClipPointerDown,
}: StructureTimelineEditorialClipTrackProps) {
  return (
    <div
      data-testid="timeline-content-film-clip"
      className="relative border-b border-border bg-muted/20 ring-1 ring-inset ring-zinc-500/15 dark:ring-zinc-400/20"
      style={{ height: `${height}px` }}
    >
      {clipBlocks.map((c, idx) => (
        <div
          key={c.id}
          className="absolute top-0.5 bottom-0.5 rounded border-2 border-zinc-400/80 dark:border-zinc-500 bg-zinc-200/90 dark:bg-zinc-800/85 overflow-hidden flex items-stretch"
          style={{
            left: `${c.x}px`,
            width: `${Math.max(2, c.width)}px`,
          }}
          title="Editorial Clip (Trim)"
        >
          <div
            className="w-1 shrink-0 bg-zinc-500 hover:bg-zinc-400 cursor-ew-resize z-10"
            onPointerDown={(e) => onNleClipPointerDown(c, "left", e)}
          />
          <div className="flex-1 min-w-0 flex items-center justify-center px-1 pointer-events-none">
            <span className="text-[9px] text-zinc-800 dark:text-zinc-100 truncate font-medium">
              {getTrackBlockText("Clip", c.width, "shot", idx)}
            </span>
          </div>
          <div
            className="w-1 shrink-0 bg-zinc-500 hover:bg-zinc-400 cursor-ew-resize z-10"
            onPointerDown={(e) => onNleClipPointerDown(c, "right", e)}
          />
        </div>
      ))}
      {clipBlocks.length === 0 && (
        <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
          <span className="text-[9px] text-muted-foreground">
            {((timelineData as TimelineData)?.shots?.length ?? 0) === 0
              ? "Zuerst Shots anlegen (Struktur oder + Add Item); Clips folgen automatisch."
              : "Editorial Clips (erscheinen nach Migration oder Sync mit scriptony-clips)"}
          </span>
        </div>
      )}
    </div>
  );
}
