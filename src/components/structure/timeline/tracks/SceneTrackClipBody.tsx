/**
 * Scene clip inner body (title, TipTap preview, audio thumbnail) for SceneTrack.
 * Location: src/components/structure/timeline/tracks/SceneTrackClipBody.tsx
 */
import { ReadonlyTiptapView } from "../../../shared/ReadonlyTiptapView";
import { TimelineClipImageBody } from "../../../timeline/TimelineClipImageBody";
import type { StructureTimelineBlock } from "./track-types";

export type SceneTrackClipBodyProps = {
  scene: StructureTimelineBlock;
  displayText: string;
  isAudioProject: boolean;
  sceneImgUrl: string;
  onPickAndUploadSceneImage: (sceneId: string) => void | Promise<void>;
};

export function SceneTrackClipBody({
  scene,
  displayText,
  isAudioProject,
  sceneImgUrl,
  onPickAndUploadSceneImage,
}: SceneTrackClipBodyProps) {
  const showFullContent = !isAudioProject && scene.width >= 120;
  const showAbbreviatedTitle =
    !isAudioProject && scene.width >= 60 && scene.width < 120;
  const showMinimal = !isAudioProject && scene.width < 60;

  if (isAudioProject) {
    return (
      <TimelineClipImageBody
        imgUrl={sceneImgUrl}
        displayText={displayText}
        clipWidthPx={scene.width}
        fullBleedTextClassName="text-pink-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
        inlineTextClassName="text-pink-900 dark:text-pink-100"
        placeholderClassName="border border-dashed border-pink-400/45 bg-pink-100/40 dark:bg-pink-950/40"
        thumbBorderClassName="border border-pink-700/40 bg-muted"
        onPlaceholderClick={() => void onPickAndUploadSceneImage(scene.id)}
      />
    );
  }

  if (showFullContent) {
    return (
      <div
        className="pointer-events-none h-full flex flex-col py-1 min-h-0 overflow-hidden rounded-[inherit] relative z-0"
        style={{
          paddingLeft: "max(0.5rem, var(--trim-cap))",
          paddingRight: "max(0.5rem, var(--trim-cap))",
        }}
      >
        <div className="flex items-center gap-1 mb-0.5 pointer-events-auto">
          <span className="text-[9px] font-medium truncate text-[rgb(230,0,118)] dark:text-pink-300 pointer-events-auto">
            {scene.title}
          </span>
        </div>
        <div className="flex-1 overflow-hidden text-[8px] text-pink-800 dark:text-pink-200/90 pointer-events-auto">
          {scene.content && typeof scene.content === "object" ? (
            <ReadonlyTiptapView content={scene.content} />
          ) : (
            <em className="text-muted-foreground/50">Leer...</em>
          )}
        </div>
      </div>
    );
  }

  if (showAbbreviatedTitle) {
    return (
      <div className="pointer-events-none h-full flex items-center justify-center px-[max(0.25rem,var(--trim-cap))] overflow-hidden relative z-0">
        <span className="text-[9px] font-medium truncate text-[rgb(230,0,118)] dark:text-pink-300 pointer-events-auto">
          {displayText}
        </span>
      </div>
    );
  }

  if (showMinimal) {
    return (
      <div className="pointer-events-none h-full flex items-center justify-center px-[max(0.15rem,var(--trim-cap))] overflow-hidden relative z-0">
        <span className="text-[9px] font-bold text-[rgb(230,0,118)] dark:text-pink-300 pointer-events-auto">
          {displayText}
        </span>
      </div>
    );
  }

  return null;
}
