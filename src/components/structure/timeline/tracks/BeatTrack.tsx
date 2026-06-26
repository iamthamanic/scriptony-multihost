/**
 * Beat lane row for StructureTimelineEditor (Epic T55e).
 * Renders beat clips with trim handles, marquee selection, and body-drag move.
 * Location: src/components/structure/timeline/tracks/BeatTrack.tsx
 */
import type { RefObject } from "react";
import { cn } from "../../../ui/utils";
import {
  getTrimGrabHandleStyles,
  TRIM_END_CAP_WIDTH,
} from "../../../../hooks/useTrimGrabHandles";
import { TIMELINE_CLIP_SELECTED_CLASS } from "../../../../lib/timeline-selection/clip-selection-styles";
import {
  getTimelineTrackClipClasses,
  STRUCTURE_BODY_DRAG_GRAB_CLASS,
  TIMELINE_TRACK_REGISTRY,
} from "../../../../lib/timeline-track-tokens";
import { getTrackBlockText } from "./track-block-text";
import type { BeatTrackProps } from "./track-types";

export function BeatTrack({
  containerRef,
  trackHeightPx,
  blocks,
  beatLayoutEpoch,
  interactionMode,
  marqueeSelection,
  structureBodyDragMovedRef,
  onBeatMoveMouseDown,
  onTrimStart,
  onOpenBeatEdit,
}: BeatTrackProps) {
  const beatVisual = TIMELINE_TRACK_REGISTRY.beat;

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      className="relative border-b border-border bg-muted/30"
      style={{ height: `${trackHeightPx}px` }}
    >
      {blocks
        .filter((beat) => beat.visible)
        .map((beat, index) => {
          const displayText = getTrackBlockText(
            beat.label || "",
            beat.width,
            "beat",
            index,
          );
          const hasBeatColor = Boolean(beat.color);
          const trimGrab = getTrimGrabHandleStyles({
            preset: "beat",
            baseColorHex: hasBeatColor ? beat.color : undefined,
          });

          return (
            <div
              key={`${beat.id}-${beatLayoutEpoch}`}
              data-beat-id={beat.id}
              className={cn(
                getTimelineTrackClipClasses("beat", {
                  beatSkipFill: hasBeatColor,
                }),
                STRUCTURE_BODY_DRAG_GRAB_CLASS,
                marqueeSelection.isSelected("beat", beat.id) &&
                  TIMELINE_CLIP_SELECTED_CLASS,
              )}
              style={{
                left: `${beat.x}px`,
                width: `${beat.width}px`,
                backgroundColor: hasBeatColor ? beat.color : undefined,
                ["--trim-cap" as string]: TRIM_END_CAP_WIDTH,
                ...(trimGrab.clipBorderColor
                  ? { borderColor: trimGrab.clipBorderColor }
                  : {}),
              }}
              onPointerDown={(e) => onBeatMoveMouseDown(beat.id, e)}
              onClick={(e) => {
                e.stopPropagation();
                if (marqueeSelection.handleClipShiftClick("beat", beat.id, e)) {
                  return;
                }
                if (marqueeSelection.shouldSuppressClipClick()) return;
                if (structureBodyDragMovedRef.current) {
                  structureBodyDragMovedRef.current = false;
                  return;
                }
                onOpenBeatEdit(beat.id);
              }}
              title={
                interactionMode === "select"
                  ? "Auswahlmodus: Ziehen = Marquee · Shift+Klick = Toggle"
                  : "Verschieben: Ziehen = Move · Shift/Alt+Ziehen = Marquee"
              }
            >
              <div
                data-beat-trim-handle="left"
                className={trimGrab.handleLeftClassName}
                style={trimGrab.leftStyle}
                onPointerDown={(e) => onTrimStart(beat.id, "left", e)}
                onClick={(e) => e.stopPropagation()}
                title="Linken Rand ziehen"
              />

              <div className="pointer-events-none h-full flex items-center justify-center px-[var(--trim-cap)] overflow-hidden gap-0.5 relative z-10">
                <span
                  className={cn(
                    "text-[10px] truncate pointer-events-auto",
                    hasBeatColor
                      ? beatVisual.textWithCustomColor
                      : beatVisual.textDefault,
                  )}
                >
                  {displayText}
                </span>
              </div>

              <div
                data-beat-trim-handle="right"
                className={trimGrab.handleRightClassName}
                style={trimGrab.rightStyle}
                onPointerDown={(e) => onTrimStart(beat.id, "right", e)}
                onClick={(e) => e.stopPropagation()}
                title="Rechten Rand ziehen"
              />
            </div>
          );
        })}
    </div>
  );
}
