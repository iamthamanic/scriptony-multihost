/**
 * Per-shot SFX lane on the structure timeline (T73).
 * Location: src/components/structure/timeline/StructureTimelineFilmProductionTracks.tsx
 */
import { cn } from "../../ui/utils";
import type { TimelineData } from "@/lib/timeline-data";
import { filmStructureClipStyle } from "@/lib/timeline-tree/projectBlocks";
import { layoutShotAudioSegments } from "./structure-timeline-editor-helpers";

export interface StructureTimelineShotSfxTrackProps {
  height: number;
  shotBlocks: Array<{ id: string; x: number; width: number }>;
  timelineData: TimelineData | null | undefined;
  useFilmTreeLayout: boolean;
  canOpenShot: boolean;
  blockUnderlyingLanePointerEvents: boolean;
  onOpenShot: (shotId: string) => void;
}

export function StructureTimelineShotSfxTrack({
  height,
  shotBlocks,
  timelineData,
  useFilmTreeLayout,
  canOpenShot,
  blockUnderlyingLanePointerEvents,
  onOpenShot,
}: StructureTimelineShotSfxTrackProps) {
  return (
    <div
      className="relative border-b border-border bg-muted/15"
      style={{ height: `${height}px` }}
    >
      {shotBlocks.map((shot) => {
        const full = (timelineData as TimelineData)?.shots?.find(
          (sh) => sh.id === shot.id,
        );
        const files = (full?.audioFiles || []).filter((a) => a.type === "sfx");
        const segments = layoutShotAudioSegments(files);
        const w = Math.max(2, shot.width);
        const isInteractive = canOpenShot && !blockUnderlyingLanePointerEvents;
        return (
          <div
            key={`sfx-${shot.id}`}
            role={isInteractive ? "button" : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            aria-label={
              isInteractive ? `SFX-Track für Shot ${shot.id} öffnen` : undefined
            }
            className={cn(
              "absolute top-0.5 bottom-0.5 rounded border border-orange-400/80 dark:border-orange-600/55 bg-orange-50/85 dark:bg-orange-950/30 overflow-hidden flex",
              isInteractive &&
                "cursor-pointer hover:ring-1 hover:ring-orange-500/50",
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
                ? `${files.length} SFX — Klick: Shot im Strukturbaum`
                : "Keine SFX — Klick: Shot im Strukturbaum"
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
                  className="h-full min-w-0 bg-orange-500/80 dark:bg-orange-500/45 border-r border-orange-900/25 last:border-r-0"
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
