/**
 * Scene/section lane row for StructureTimelineEditor (Epic T55e).
 * Renders scene clips with rich content preview, trim handles, and audio thumbnails.
 * Location: src/components/structure/timeline/tracks/SceneTrack.tsx
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
} from "../../../../lib/timeline-track-tokens";
import { filmStructureClipStyle } from "../../../../lib/timeline-tree/projectBlocks";
import {
  getTimelineClipImageLayout,
  timelineClipPreviewUrl,
} from "../../../../lib/timeline-clip-preview-url";
import { getTrackBlockText } from "./track-block-text";
import { SceneTrackClipBody } from "./SceneTrackClipBody";
import type { SceneTrackProps } from "./track-types";
import { createTimelineImageDropBindings } from "../../../../lib/timeline-image-drop-bindings";

const SCENE_TRIM_GRAB_STYLES = getTrimGrabHandleStyles({
  preset: "scene",
  baseColorHex: TRIM_GRAB_PRESET_BASE_HEX.scene,
});

export function SceneTrack({
  containerRef,
  trackHeightPx,
  blocks,
  rowKey,
  useFilmTreeLayout,
  isAudioProject,
  marqueeSelection,
  structureBodyDragMovedRef,
  sceneTitleClickTimerRef,
  scenePreviewById,
  onStructureMoveMouseDown,
  onTrimClipMouseDown,
  onOpenSceneEdit,
  onOpenSceneContentModal,
  onPickAndUploadSceneImage,
  onSceneImageFileDrop,
  onFilmSceneClipImageDrop,
  emptyLaneDropBindings,
}: SceneTrackProps) {
  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      className="relative border-b border-border bg-muted/30"
      style={{ height: `${trackHeightPx}px` }}
      data-timeline-image-lane="scene"
      {...emptyLaneDropBindings}
    >
      {blocks.map((scene, index) => {
        const displayText = getTrackBlockText(
          scene.title || "",
          scene.width,
          "scene",
          index,
        );
        const sceneImgUrl = isAudioProject
          ? timelineClipPreviewUrl(
              scene as Parameters<typeof timelineClipPreviewUrl>[0],
            ) ||
            scenePreviewById.get(scene.id) ||
            ""
          : "";
        const sceneImageLayout = getTimelineClipImageLayout(
          scene.width,
          sceneImgUrl,
        );
        const clipImageDrop =
          isAudioProject && onSceneImageFileDrop
            ? createTimelineImageDropBindings((file) =>
                onSceneImageFileDrop(scene.id, file),
              )
            : onFilmSceneClipImageDrop
              ? createTimelineImageDropBindings((file, event) =>
                  onFilmSceneClipImageDrop(scene.id, file, event.clientX),
                )
              : undefined;

        return (
          <div
            key={rowKey(scene.id)}
            data-scene-id={scene.id}
            {...clipImageDrop}
            className={cn(
              getTimelineTrackClipClasses("scene"),
              useFilmTreeLayout && STRUCTURE_BODY_DRAG_GRAB_CLASS,
              marqueeSelection.isSelected("scene", scene.id) &&
                TIMELINE_CLIP_SELECTED_CLASS,
            )}
            style={{
              ...filmStructureClipStyle(scene, useFilmTreeLayout),
              ["--trim-cap" as string]: TRIM_END_CAP_WIDTH,
              ...(SCENE_TRIM_GRAB_STYLES.clipBorderColor
                ? { borderColor: SCENE_TRIM_GRAB_STYLES.clipBorderColor }
                : {}),
              ...(isAudioProject && sceneImageLayout.fullBleed && sceneImgUrl
                ? {}
                : {}),
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (marqueeSelection.handleClipShiftClick("scene", scene.id, e)) {
                return;
              }
              if (marqueeSelection.shouldSuppressClipClick()) return;
              if (structureBodyDragMovedRef.current) {
                structureBodyDragMovedRef.current = false;
                return;
              }
              if (sceneTitleClickTimerRef.current) {
                clearTimeout(sceneTitleClickTimerRef.current);
              }
              sceneTitleClickTimerRef.current = setTimeout(() => {
                sceneTitleClickTimerRef.current = null;
                if (structureBodyDragMovedRef.current) {
                  structureBodyDragMovedRef.current = false;
                  return;
                }
                onOpenSceneEdit(scene.id);
              }, 260);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (sceneTitleClickTimerRef.current) {
                clearTimeout(sceneTitleClickTimerRef.current);
                sceneTitleClickTimerRef.current = null;
              }
              console.log(
                "[VideoEditorTimeline] 🚀 Opening Content Modal for scene:",
                scene.id,
              );
              onOpenSceneContentModal(scene);
            }}
            onPointerDown={(e) => {
              if (!useFilmTreeLayout) return;
              onStructureMoveMouseDown("scene", scene.id, e);
            }}
          >
            <SceneTrackClipBody
              scene={scene}
              displayText={displayText}
              isAudioProject={isAudioProject}
              sceneImgUrl={sceneImgUrl}
              onPickAndUploadSceneImage={onPickAndUploadSceneImage}
            />
            <div
              data-structure-trim-handle
              className={SCENE_TRIM_GRAB_STYLES.handleLeftClassName}
              style={SCENE_TRIM_GRAB_STYLES.leftStyle}
              onPointerDown={(e) =>
                onTrimClipMouseDown("scene", scene.id, "left", e)
              }
              onClick={(e) => e.stopPropagation()}
              title="Linken Rand ziehen (Ripple)"
            />
            <div
              data-structure-trim-handle
              className={SCENE_TRIM_GRAB_STYLES.handleRightClassName}
              style={SCENE_TRIM_GRAB_STYLES.rightStyle}
              onPointerDown={(e) =>
                onTrimClipMouseDown("scene", scene.id, "right", e)
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
