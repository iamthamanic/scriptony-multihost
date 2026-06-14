/**
 * Act lane row for StructureTimelineEditor (Epic T55e).
 * Renders act clips with VET structure trim handles and optional body-drag move.
 * Location: src/components/structure/timeline/tracks/ActTrack.tsx
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
import type { ActTrackProps } from "./track-types";

const ACT_TRIM_GRAB_STYLES = getTrimGrabHandleStyles({
  preset: "act",
  baseColorHex: TRIM_GRAB_PRESET_BASE_HEX.act,
});

export function ActTrack({
  containerRef,
  trackHeightPx,
  blocks,
  rowKey,
  useFilmTreeLayout,
  marqueeSelection,
  onClipTitleClick,
  onStructureMoveMouseDown,
  onTrimClipMouseDown,
}: ActTrackProps) {
  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      className="relative border-b border-border bg-muted/30"
      style={{ height: `${trackHeightPx}px` }}
    >
      {blocks.map((act, index) => {
        const displayText = getTrackBlockText(
          act.title || "",
          act.width,
          "act",
          index,
        );
        const filmClipStyle = filmStructureClipStyle(act, useFilmTreeLayout);

        return (
          <div
            key={rowKey(act.id)}
            data-act-id={act.id}
            className={cn(
              getTimelineTrackClipClasses("act"),
              useFilmTreeLayout && STRUCTURE_BODY_DRAG_GRAB_CLASS,
              marqueeSelection.isSelected("act", act.id) &&
                TIMELINE_CLIP_SELECTED_CLASS,
            )}
            style={{
              ...filmClipStyle,
              ["--trim-cap" as string]: TRIM_END_CAP_WIDTH,
              ...(ACT_TRIM_GRAB_STYLES.clipBorderColor
                ? { borderColor: ACT_TRIM_GRAB_STYLES.clipBorderColor }
                : {}),
            }}
            onClick={onClipTitleClick("act", act.id)}
            onPointerDown={(e) => {
              if (!useFilmTreeLayout) return;
              onStructureMoveMouseDown("act", act.id, e);
            }}
          >
            <div
              data-structure-trim-handle
              className={ACT_TRIM_GRAB_STYLES.handleLeftClassName}
              style={ACT_TRIM_GRAB_STYLES.leftStyle}
              onPointerDown={(e) =>
                onTrimClipMouseDown("act", act.id, "left", e)
              }
              onClick={(e) => e.stopPropagation()}
              title="Linken Rand ziehen (Ripple)"
            />
            <div className="pointer-events-none h-full flex items-center justify-center px-[var(--trim-cap)] overflow-hidden relative z-10">
              <span
                className={cn(
                  TIMELINE_TRACK_REGISTRY.act.textDefault,
                  "truncate pointer-events-auto",
                )}
              >
                {displayText}
              </span>
            </div>
            <div
              data-structure-trim-handle
              className={ACT_TRIM_GRAB_STYLES.handleRightClassName}
              style={ACT_TRIM_GRAB_STYLES.rightStyle}
              onPointerDown={(e) =>
                onTrimClipMouseDown("act", act.id, "right", e)
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
