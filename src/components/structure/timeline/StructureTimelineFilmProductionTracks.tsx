/**
 * Film production lanes under shots: editorial clips, music, SFX (T73).
 * Location: src/components/structure/timeline/StructureTimelineFilmProductionTracks.tsx
 */
import type { StructureTimelineEditorialClipTrackProps } from "./StructureTimelineEditorialClipTrack";
import { StructureTimelineEditorialClipTrack } from "./StructureTimelineEditorialClipTrack";
import type { StructureTimelineShotMusicTrackProps } from "./StructureTimelineShotMusicTrack";
import { StructureTimelineShotMusicTrack } from "./StructureTimelineShotMusicTrack";
import { StructureTimelineShotSfxTrack } from "./StructureTimelineShotSfxTrack";

type ShotLaneProps = Pick<
  StructureTimelineShotMusicTrackProps,
  | "shotBlocks"
  | "timelineData"
  | "useFilmTreeLayout"
  | "canOpenShot"
  | "blockUnderlyingLanePointerEvents"
  | "onOpenShot"
>;

export type StructureTimelineFilmProductionTracksProps = {
  showEditorialClipTrack: boolean;
  trackHeights: { editorialClip: number; music: number; sfx: number };
} & Pick<
  StructureTimelineEditorialClipTrackProps,
  "clipBlocks" | "timelineData" | "onNleClipPointerDown"
> &
  ShotLaneProps;

export function StructureTimelineFilmProductionTracks({
  showEditorialClipTrack,
  trackHeights,
  clipBlocks,
  onNleClipPointerDown,
  ...shotLaneProps
}: StructureTimelineFilmProductionTracksProps) {
  return (
    <>
      {showEditorialClipTrack && (
        <StructureTimelineEditorialClipTrack
          height={trackHeights.editorialClip}
          clipBlocks={clipBlocks}
          timelineData={shotLaneProps.timelineData}
          onNleClipPointerDown={onNleClipPointerDown}
        />
      )}
      <StructureTimelineShotMusicTrack
        height={trackHeights.music}
        {...shotLaneProps}
      />
      <StructureTimelineShotSfxTrack
        height={trackHeights.sfx}
        {...shotLaneProps}
      />
    </>
  );
}
