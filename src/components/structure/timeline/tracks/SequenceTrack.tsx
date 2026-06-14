/**
 * Sequence/chapter lane row for StructureTimelineEditor (Epic T55e).
 * Renders sequence clips with VET structure trim handles and optional body-drag move.
 * Location: src/components/structure/timeline/tracks/SequenceTrack.tsx
 */
import type { RefObject } from "react";
import { cn } from "../../../ui/utils";
import {
  getTrimGrabHandleStyles,
  TRIM_END_CAP_WIDTH,
} from "../../../../hooks/useTrimGrabHandles";
import { TRIM_GRAB_PRESET_BASE_HEX } from "../../../../lib/trim-handle-colors";
import { TIMELINE_CLIP_SELECTED_CLASS } from "../../../../lib/timeline-selection/clip-selection-styles";
import {
  getTimelineTrackClipClasses,
  STRUCTURE_BODY_DRAG_GRAB_CLASS,
  TIMELINE_TRACK_REGISTRY,
} from "../../../../lib/timeline-track-tokens";
import { filmStructureClipStyle } from "../../../../lib/timeline-tree/projectBlocks";
import { getTrackBlockText } from "./track-block-text";
import type { SequenceTrackProps } from "./track-types";

const SEQUENCE_TRIM_GRAB_STYLES = getTrimGrabHandleStyles({
  preset: "sequence",
  baseColorHex: TRIM_GRAB_PRESET_BASE_HEX.sequence,
});

export function SequenceTrack({
  containerRef,
  trackHeightPx,
  blocks,
  rowKey,
  useFilmTreeLayout,
  marqueeSelection,
  onClipTitleClick,
  onStructureMoveMouseDown,
  onTrimClipMouseDown,
}: SequenceTrackProps) {
  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      className="relative border-b border-border bg-muted/30"
      style={{ height: `${trackHeightPx}px` }}
    >
      {blocks.map((seq, index) => {
        const displayText = getTrackBlockText(
          seq.title || "",
          seq.width,
          "chapter",
          index,
        );

        return (
          <div
            key={rowKey(seq.id)}
            data-sequence-id={seq.id}
            className={cn(
              getTimelineTrackClipClasses("sequence"),
              useFilmTreeLayout && STRUCTURE_BODY_DRAG_GRAB_CLASS,
              marqueeSelection.isSelected("sequence", seq.id) &&
                TIMELINE_CLIP_SELECTED_CLASS,
            )}
            style={{
              ...filmStructureClipStyle(seq, useFilmTreeLayout),
              ["--trim-cap" as string]: TRIM_END_CAP_WIDTH,
              ...(SEQUENCE_TRIM_GRAB_STYLES.clipBorderColor
                ? { borderColor: SEQUENCE_TRIM_GRAB_STYLES.clipBorderColor }
                : {}),
            }}
            onClick={onClipTitleClick("sequence", seq.id)}
            onPointerDown={(e) => {
              if (!useFilmTreeLayout) return;
              onStructureMoveMouseDown("sequence", seq.id, e);
            }}
          >
            <div
              data-structure-trim-handle
              className={SEQUENCE_TRIM_GRAB_STYLES.handleLeftClassName}
              style={SEQUENCE_TRIM_GRAB_STYLES.leftStyle}
              onPointerDown={(e) =>
                onTrimClipMouseDown("sequence", seq.id, "left", e)
              }
              onClick={(e) => e.stopPropagation()}
              title="Linken Rand ziehen (Ripple)"
            />
            <div className="pointer-events-none h-full flex items-center justify-center px-[var(--trim-cap)] overflow-hidden relative z-10">
              <span
                className={cn(
                  TIMELINE_TRACK_REGISTRY.sequence.textDefault,
                  "truncate pointer-events-auto",
                )}
              >
                {displayText}
              </span>
            </div>
            <div
              data-structure-trim-handle
              className={SEQUENCE_TRIM_GRAB_STYLES.handleRightClassName}
              style={SEQUENCE_TRIM_GRAB_STYLES.rightStyle}
              onPointerDown={(e) =>
                onTrimClipMouseDown("sequence", seq.id, "right", e)
              }
              onClick={(e) => e.stopPropagation()}
              title="Rechten Rand ziehen (Ripple)"
            />
          </div>
        );
      })}

    </div>
  );
}
