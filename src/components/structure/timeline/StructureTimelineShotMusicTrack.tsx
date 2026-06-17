/**
 * Per-shot music lane on the structure timeline (T73).
 * Location: src/components/structure/timeline/StructureTimelineFilmProductionTracks.tsx
 */
import { cn } from "../../ui/utils";
import type { TimelineData } from "@/lib/timeline-data";
import { filmStructureClipStyle } from "@/lib/timeline-tree/projectBlocks";
import { layoutShotAudioSegments } from "./structure-timeline-editor-helpers";

export interface StructureTimelineShotMusicTrackProps {
  height: number;
  shotBlocks: Array<{ id: string; x: number; width: number }>;
  timelineData: TimelineData | null | undefined;
  useFilmTreeLayout: boolean;
  canOpenShot: boolean;
  blockUnderlyingLanePointerEvents: boolean;
  onOpenShot: (shotId: string) => void;
}

export function StructureTimelineShotMusicTrack({
  height,
  shotBlocks,
  timelineData,
  useFilmTreeLayout,
  canOpenShot,
  blockUnderlyingLanePointerEvents,
  onOpenShot,
}: StructureTimelineShotMusicTrackProps) {
  return (
    <div
      className="relative border-b border-border bg-muted/15"
      style={{ height: `${height}px` }}
    >
      {shotBlocks.map((shot) => {
        const full = (timelineData as TimelineData)?.shots?.find(
          (sh) => sh.id === shot.id,
        );
        const files = (full?.audioFiles || []).filter(
          (a) => a.type === "music",
        );
        const segments = layoutShotAudioSegments(files);
        const w = Math.max(2, shot.width);
        const isInteractive = canOpenShot && !blockUnderlyingLanePointerEvents;
        return (
          <div
            key={`music-${shot.id}`}
            role={isInteractive ? "button" : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            aria-label={
              isInteractive
                ? `Musik-Track für Shot ${shot.id} öffnen`
                : undefined
            }
            className={cn(
              "absolute top-0.5 bottom-0.5 rounded border border-violet-400/70 dark:border-violet-600/60 bg-violet-50/80 dark:bg-violet-950/35 overflow-hidden flex",
              isInteractive &&
                "cursor-pointer hover:ring-1 hover:ring-violet-500/50",
              blockUnderlyingLanePointerEvents && "pointer-events-none",
            )}
            style={{
              ...filmStructureClipStyle(
                { x: shot.x, width: w },
                useFilmTreeLayout,
              ),
            }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenShot(shot.id);
            }}
            onKeyDown={(e) => {
              if (!canOpenShot) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenShot(shot.id);
              }
            }}
            title={
              files.length
                ? `${files.length} Musik-Clip(s) — Klick: Shot im Strukturbaum`
                : "Keine Musik — Klick: Shot im Strukturbaum"
            }
          >
            {files.length === 0 ? (
              <div className="flex-1 flex items-center justify-center min-w-0">
                <span className="text-[8px] text-muted-foreground truncate px-0.5">
                  —
                </span>
              </div>
            ) : (
              segments.map((seg) => (
                <div
                  key={seg.id}
                  className="h-full min-w-0 bg-violet-500/75 dark:bg-violet-500/50 border-r border-violet-900/20 last:border-r-0"
                  style={{ width: `${seg.widthFrac * 100}%` }}
                  title={seg.title}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
