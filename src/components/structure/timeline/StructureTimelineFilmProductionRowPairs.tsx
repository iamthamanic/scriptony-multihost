/**
 * Film production lanes as per-track row pairs [sticky label | content] (#51).
 * Location: src/components/structure/timeline/StructureTimelineFilmProductionRowPairs.tsx
 */

import type { MouseEvent } from "react";
import { Clapperboard, Crosshair, Magnet } from "lucide-react";
import { cn } from "@/lib/utils";
import { StructureTimelineEditorialClipTrack } from "./StructureTimelineEditorialClipTrack";
import { StructureTimelineShotMusicTrack } from "./StructureTimelineShotMusicTrack";
import { StructureTimelineShotSfxTrack } from "./StructureTimelineShotSfxTrack";
import type { StructureTimelineFilmProductionTracksProps } from "./StructureTimelineFilmProductionTracks";

export type StructureTimelineFilmProductionRowPairsProps =
  StructureTimelineFilmProductionTracksProps & {
    labelCellClassName: string;
    labelColumnWidthPx: number;
    totalWidthPx: number;
    trackAutosnap: { editorialClip: boolean };
    clipMagnets: { editorialClip: boolean };
    resizingTrack: string | null;
    onToggleClipAutosnap: () => void;
    onToggleClipMagnet: () => void;
    onResizeStart: (
      track: "editorialClip" | "music" | "sfx",
      event: MouseEvent<HTMLDivElement>,
    ) => void;
  };

export function StructureTimelineFilmProductionRowPairs({
  labelCellClassName,
  labelColumnWidthPx,
  totalWidthPx,
  showEditorialClipTrack,
  trackHeights,
  trackAutosnap,
  clipMagnets,
  resizingTrack,
  onToggleClipAutosnap,
  onToggleClipMagnet,
  onResizeStart,
  clipBlocks,
  onNleClipPointerDown,
  shotBlocks,
  timelineData,
  useFilmTreeLayout,
  canOpenShot,
  blockUnderlyingLanePointerEvents,
  onOpenShot,
}: StructureTimelineFilmProductionRowPairsProps) {
  const contentWidthStyle = { width: `${totalWidthPx}px` };
  const labelWidthStyle = { width: `${labelColumnWidthPx}px` };

  return (
    <>
      {showEditorialClipTrack && (
        <div className="flex">
          <div className={labelCellClassName} style={labelWidthStyle}>
            <div
              data-testid="timeline-label-film-clip"
              className="border-b border-border px-1 flex items-center justify-between gap-0.5 bg-muted/20 relative"
              style={{ height: `${trackHeights.editorialClip}px` }}
              title="Editorial-Clips (NLE): gleiche Spur wie Shot/Musik — nur im Tab „Timeline“"
            >
              <div className="flex items-center gap-1 min-w-0">
                <Clapperboard
                  className="size-3 shrink-0 text-zinc-600 dark:text-zinc-300"
                  aria-hidden
                />
                <span className="text-[9px] text-foreground font-semibold leading-tight truncate">
                  Clip
                </span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={onToggleClipAutosnap}
                  className={cn(
                    "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
                    trackAutosnap.editorialClip
                      ? "text-primary opacity-100"
                      : "text-muted-foreground opacity-40",
                  )}
                  title={
                    trackAutosnap.editorialClip
                      ? "Clip: Autosnap an"
                      : "Clip: Autosnap aus"
                  }
                >
                  <Crosshair className="size-3.5" strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={onToggleClipMagnet}
                  className={cn(
                    "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
                    clipMagnets.editorialClip
                      ? "text-primary opacity-100"
                      : "text-muted-foreground opacity-40",
                  )}
                  title={
                    clipMagnets.editorialClip
                      ? "Clip: Magnet (alle Kanten)"
                      : "Clip: nur Playhead"
                  }
                >
                  <Magnet className="size-3.5" strokeWidth={2.25} />
                </button>
              </div>
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                  resizingTrack === "editorialClip"
                    ? "border-b-4 border-primary"
                    : "hover:border-b-4 hover:border-primary",
                )}
                onMouseDown={(e) => onResizeStart("editorialClip", e)}
              />
            </div>
          </div>
          <div className="shrink-0" style={contentWidthStyle}>
            <StructureTimelineEditorialClipTrack
              height={trackHeights.editorialClip}
              clipBlocks={clipBlocks}
              timelineData={timelineData}
              onNleClipPointerDown={onNleClipPointerDown}
            />
          </div>
        </div>
      )}

      <div className="flex">
        <div className={labelCellClassName} style={labelWidthStyle}>
          <div
            data-testid="timeline-label-film-music"
            className="border-b border-border px-2 flex items-center bg-card relative"
            style={{ height: `${trackHeights.music}px` }}
          >
            <span className="text-[9px] text-foreground font-medium leading-tight">
              Musik
            </span>
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                resizingTrack === "music"
                  ? "border-b-4 border-primary"
                  : "hover:border-b-4 hover:border-primary",
              )}
              onMouseDown={(e) => onResizeStart("music", e)}
            />
          </div>
        </div>
        <div className="shrink-0" style={contentWidthStyle}>
          <StructureTimelineShotMusicTrack
            height={trackHeights.music}
            shotBlocks={shotBlocks}
            timelineData={timelineData}
            useFilmTreeLayout={useFilmTreeLayout}
            canOpenShot={canOpenShot}
            blockUnderlyingLanePointerEvents={blockUnderlyingLanePointerEvents}
            onOpenShot={onOpenShot}
          />
        </div>
      </div>

      <div className="flex">
        <div className={labelCellClassName} style={labelWidthStyle}>
          <div
            data-testid="timeline-label-film-sfx"
            className="border-b border-border px-2 flex items-center bg-card relative"
            style={{ height: `${trackHeights.sfx}px` }}
          >
            <span className="text-[9px] text-foreground font-medium leading-tight">
              SFX
            </span>
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                resizingTrack === "sfx"
                  ? "border-b-4 border-primary"
                  : "hover:border-b-4 hover:border-primary",
              )}
              onMouseDown={(e) => onResizeStart("sfx", e)}
            />
          </div>
        </div>
        <div className="shrink-0" style={contentWidthStyle}>
          <StructureTimelineShotSfxTrack
            height={trackHeights.sfx}
            shotBlocks={shotBlocks}
            timelineData={timelineData}
            useFilmTreeLayout={useFilmTreeLayout}
            canOpenShot={canOpenShot}
            blockUnderlyingLanePointerEvents={blockUnderlyingLanePointerEvents}
            onOpenShot={onOpenShot}
          />
        </div>
      </div>
    </>
  );
}
