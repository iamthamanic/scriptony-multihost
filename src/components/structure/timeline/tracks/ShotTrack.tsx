/**
 * Shot lane for StructureTimelineEditor — label sidebar + scroll content (Epic T55f).
 * Location: src/components/structure/timeline/tracks/ShotTrack.tsx
 */
import type { RefObject } from "react";
import { Crosshair, Magnet } from "lucide-react";
import { cn } from "../../../ui/utils";
import {
  getTrimGrabHandleStyles,
  TRIM_END_CAP_WIDTH,
} from "../../../../hooks/useTrimGrabHandles";
import { TRIM_GRAB_PRESET_BASE_HEX } from "../../../../lib/trim-handle-colors";
import { TIMELINE_CLIP_SELECTED_CLASS } from "../../../../lib/timeline-selection/clip-selection-styles";
import { filmStructureClipStyle } from "../../../../lib/timeline-tree/projectBlocks";
import { getTimelineClipImageLayout } from "../../../../lib/timeline-clip-preview-url";
import { getTimelineTrackClipClasses } from "../../../../lib/timeline-track-tokens";
import { TimelineClipImageBody } from "../../../timeline/TimelineClipImageBody";
import { TimelineTrackAddButton } from "../../../timeline/TimelineTrackAddButton";
import { TimelineStructureAudioLinkChip } from "../../../timeline/TimelineStructureAudioLinkChip";
import { TimelineStructureClipTopBar } from "../../../timeline/TimelineStructureClipTopBar";
import { getTrackBlockText } from "./track-block-text";
import type { ShotTrackLabelProps, ShotTrackProps } from "./track-types";
import { createTimelineImageDropBindings } from "../../../../lib/timeline-image-drop-bindings";

const SHOT_TRIM_GRAB_STYLES = getTrimGrabHandleStyles({
  preset: "shot",
  baseColorHex: TRIM_GRAB_PRESET_BASE_HEX.shot,
});

/** Left sidebar row: Shot label, add button, autosnap/magnet toggles, resize handle. */
export function ShotTrackLabel({
  trackHeightPx,
  shotAddLabel,
  trackAutosnapShot,
  clipMagnetShot,
  resizingTrack,
  onToggleAutosnap,
  onToggleMagnet,
  onResizeStart,
  onAddShot,
  sidebarAudioLink,
  onSidebarAudioLinkClick,
}: ShotTrackLabelProps) {
  return (
    <div
      className="border-b border-border px-1.5 flex items-center justify-between gap-1 bg-card relative"
      style={{ height: `${trackHeightPx}px` }}
    >
      <span className="text-[9px] text-foreground font-medium truncate min-w-0 shrink">
        Shot
      </span>
      <div className="flex items-center gap-1 shrink-0 min-w-0">
        {sidebarAudioLink && onSidebarAudioLinkClick ? (
          <TimelineStructureAudioLinkChip
            shortLabel={sidebarAudioLink.short}
            fullLabel={sidebarAudioLink.full}
            variant="shot"
            size="sidebar"
            onClick={() => onSidebarAudioLinkClick(sidebarAudioLink.nodeId)}
          />
        ) : null}
        <TimelineTrackAddButton
          onClick={onAddShot}
          title={`${shotAddLabel} hinzufügen`}
        />
        <button
          type="button"
          onClick={onToggleAutosnap}
          className={cn(
            "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
            trackAutosnapShot
              ? "text-primary opacity-100"
              : "text-muted-foreground opacity-40",
          )}
          title={trackAutosnapShot ? "Shot: Autosnap an" : "Shot: Autosnap aus"}
        >
          <Crosshair className="size-3.5" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={onToggleMagnet}
          className={cn(
            "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
            clipMagnetShot
              ? "text-primary opacity-100"
              : "text-muted-foreground opacity-40",
          )}
          title={
            clipMagnetShot ? "Shot: Magnet (alle Kanten)" : "Shot: nur Playhead"
          }
        >
          <Magnet className="size-3.5" strokeWidth={2.25} />
        </button>
      </div>
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
          resizingTrack === "shot"
            ? "border-b-4 border-primary"
            : "hover:border-b-4 hover:border-primary",
        )}
        onMouseDown={onResizeStart}
      />
    </div>
  );
}

/** Scroll area: shot clips with trim handles and image preview. */
export function ShotTrack({
  containerRef,
  trackHeightPx,
  blocks,
  rowKey,
  useFilmTreeLayout,
  marqueeSelection,
  structureBodyDragMovedRef,
  onTrimClipMouseDown,
  onOpenShotEdit,
  shotPreviewUrl,
  onShotImageFileDrop,
  emptyLaneDropBindings,
  getAudioLinkLabel,
  onAudioLinkClick,
  onOpenShotEditDirect,
}: ShotTrackProps) {
  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      className="relative border-b border-border bg-muted/20"
      style={{ height: `${trackHeightPx}px` }}
      data-timeline-image-lane="shot"
      {...emptyLaneDropBindings}
    >
      {blocks.map((shot, index) => {
        const displayText = getTrackBlockText(
          shot.label || "",
          shot.width,
          "shot",
          index,
        );
        const shotTitle =
          shot.label?.trim() || displayText || `Shot ${index + 1}`;
        const imgUrl = shotPreviewUrl(shot) ?? "";
        const shotImageLayout = getTimelineClipImageLayout(shot.width, imgUrl);
        const clipImageDrop = onShotImageFileDrop
          ? createTimelineImageDropBindings((file) =>
              onShotImageFileDrop(shot.id, file),
            )
          : undefined;
        const audioLink = getAudioLinkLabel?.(shot.id);
        const openEdit = onOpenShotEditDirect ?? onOpenShotEdit;

        return (
          <div
            key={rowKey(shot.id)}
            data-shot-id={shot.id}
            {...clipImageDrop}
            className={cn(
              getTimelineTrackClipClasses("shot", {
                shotFullBleedImage: shotImageLayout.fullBleed,
              }),
              marqueeSelection.isSelected("shot", shot.id) &&
                TIMELINE_CLIP_SELECTED_CLASS,
            )}
            style={{
              ...filmStructureClipStyle(shot, useFilmTreeLayout),
              ["--trim-cap" as string]: TRIM_END_CAP_WIDTH,
              ...(SHOT_TRIM_GRAB_STYLES.clipBorderColor
                ? { borderColor: SHOT_TRIM_GRAB_STYLES.clipBorderColor }
                : {}),
              ...(shotImageLayout.fullBleed && imgUrl
                ? {
                    backgroundImage: `url(${imgUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {}),
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (marqueeSelection.handleClipShiftClick("shot", shot.id, e)) {
                return;
              }
              if (marqueeSelection.shouldSuppressClipClick()) {
                return;
              }
              if (structureBodyDragMovedRef.current) {
                structureBodyDragMovedRef.current = false;
                return;
              }
              onOpenShotEdit(shot.id);
            }}
          >
            <TimelineStructureClipTopBar
              title={shotTitle}
              variant="shot"
              clipWidthPx={shot.width}
              hasSceneImage={Boolean(imgUrl)}
              imageBackdrop={Boolean(imgUrl)}
              audioLink={audioLink}
              onEditTitle={() => openEdit(shot.id)}
              onEditAudioLink={
                audioLink && onAudioLinkClick
                  ? () => onAudioLinkClick(shot.id)
                  : undefined
              }
            />
            <div
              className={SHOT_TRIM_GRAB_STYLES.handleLeftClassName}
              style={SHOT_TRIM_GRAB_STYLES.leftStyle}
              onPointerDown={(e) =>
                onTrimClipMouseDown("shot", shot.id, "left", e)
              }
              onClick={(e) => e.stopPropagation()}
              title="Shot-Timing links (Ripple)"
            />
            <div
              className={SHOT_TRIM_GRAB_STYLES.handleRightClassName}
              style={SHOT_TRIM_GRAB_STYLES.rightStyle}
              onPointerDown={(e) =>
                onTrimClipMouseDown("shot", shot.id, "right", e)
              }
              onClick={(e) => e.stopPropagation()}
              title="Shot-Timing rechts (Ripple)"
            />
            <TimelineClipImageBody
              imgUrl={imgUrl}
              displayText={displayText}
              clipWidthPx={shot.width}
              fullBleedTextClassName="text-yellow-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
              inlineTextClassName="text-yellow-900 dark:text-yellow-100"
              placeholderClassName="border border-dashed border-yellow-600/45 bg-yellow-100/40 dark:bg-yellow-950/40"
              thumbBorderClassName="border border-yellow-700/40 bg-muted"
              hideLabel
            />
          </div>
        );
      })}
    </div>
  );
}
