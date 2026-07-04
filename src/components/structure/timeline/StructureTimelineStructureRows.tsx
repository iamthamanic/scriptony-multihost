/**
 * Structure timeline rows (Zeit → Scene) as label+content pairs (#49 RowShell).
 * Location: src/components/structure/timeline/StructureTimelineStructureRows.tsx
 */

import type { ReactNode, RefObject, MutableRefObject } from "react";
import { StructureTimelineRowShell } from "./StructureTimelineRowShell";
import { StructureTimelineRuler } from "./StructureTimelineRuler";
import { TimelineStructureSelectionStack } from "../../timeline/TimelineStructureSelectionStack";
import {
  ActTrack,
  BeatTrack,
  SceneTrack,
  SequenceTrack,
  ShotTrack,
  type StructureTimelineBlock,
} from "./tracks";
import type { TimelineInteractionMode } from "@/lib/timeline-selection/types";
import type { TimelineMarqueeSelectionApi } from "@/hooks/useTimelineMarqueeSelection";

export interface StructureTimelineStructureRowsProps {
  labelWidthClass: string;
  labelColumnPx: number;
  contentWidthPx: number;
  /** Pre-built label slots from StructureTimelineEditor (handlers stay in parent). */
  zeitLabel: ReactNode;
  beatLabel: ReactNode;
  actLabel: ReactNode;
  sequenceLabel: ReactNode;
  sceneLabel: ReactNode;
  shotLabel: ReactNode | null;
  showFilmProductionTracks: boolean;
  ruler: {
    ticks: Parameters<typeof StructureTimelineRuler>[0]["ticks"];
    minorTicks: Parameters<typeof StructureTimelineRuler>[0]["minorTicks"];
    pageMarkers: Parameters<typeof StructureTimelineRuler>[0]["pageMarkers"];
    isBookProject: boolean;
    onRulerClick: Parameters<typeof StructureTimelineRuler>[0]["onRulerClick"];
  };
  beat: {
    stackRef: RefObject<HTMLElement | null>;
    containerRef: RefObject<HTMLElement | null>;
    trackHeightPx: number;
    pxPerSec: number;
    viewStartSec: number;
    blocks: Parameters<typeof BeatTrack>[0]["blocks"];
    beatLayoutEpoch: number;
    interactionMode: TimelineInteractionMode;
    marqueeSelection: TimelineMarqueeSelectionApi;
    structureBodyDragMovedRef: MutableRefObject<boolean>;
    onBeatMoveMouseDown: Parameters<typeof BeatTrack>[0]["onBeatMoveMouseDown"];
    onTrimStart: Parameters<typeof BeatTrack>[0]["onTrimStart"];
    onOpenBeatEdit: Parameters<typeof BeatTrack>[0]["onOpenBeatEdit"];
  };
  structure: {
    stackRef: RefObject<HTMLElement | null>;
    interactionMode: TimelineInteractionMode;
    marqueeSelection: TimelineMarqueeSelectionApi;
    act: {
      containerRef: RefObject<HTMLElement | null>;
      trackHeightPx: number;
      pxPerSec: number;
      viewStartSec: number;
      blocks: Parameters<typeof ActTrack>[0]["blocks"];
      rowKey: Parameters<typeof ActTrack>[0]["rowKey"];
      useFilmTreeLayout: boolean;
      onClipTitleClick: Parameters<typeof ActTrack>[0]["onClipTitleClick"];
      onStructureMoveMouseDown: Parameters<
        typeof ActTrack
      >[0]["onStructureMoveMouseDown"];
      onTrimClipMouseDown: Parameters<
        typeof ActTrack
      >[0]["onTrimClipMouseDown"];
    };
    sequence: {
      containerRef: RefObject<HTMLElement | null>;
      trackHeightPx: number;
      pxPerSec: number;
      viewStartSec: number;
      blocks: Parameters<typeof SequenceTrack>[0]["blocks"];
      rowKey: Parameters<typeof SequenceTrack>[0]["rowKey"];
      useFilmTreeLayout: boolean;
      onClipTitleClick: Parameters<typeof SequenceTrack>[0]["onClipTitleClick"];
      onStructureMoveMouseDown: Parameters<
        typeof SequenceTrack
      >[0]["onStructureMoveMouseDown"];
      onTrimClipMouseDown: Parameters<
        typeof SequenceTrack
      >[0]["onTrimClipMouseDown"];
    };
    scene: {
      containerRef: RefObject<HTMLElement | null>;
      trackHeightPx: number;
      pxPerSec: number;
      viewStartSec: number;
      blocks: Parameters<typeof SceneTrack>[0]["blocks"];
      rowKey: Parameters<typeof SceneTrack>[0]["rowKey"];
      useFilmTreeLayout: boolean;
      isAudioProject: boolean;
      structureBodyDragMovedRef: MutableRefObject<boolean>;
      sceneTitleClickTimerRef: MutableRefObject<ReturnType<
        typeof setTimeout
      > | null>;
      scenePreviewById: Map<string, string>;
      onStructureMoveMouseDown: Parameters<
        typeof SceneTrack
      >[0]["onStructureMoveMouseDown"];
      onTrimClipMouseDown: Parameters<
        typeof SceneTrack
      >[0]["onTrimClipMouseDown"];
      onOpenSceneEdit: Parameters<typeof SceneTrack>[0]["onOpenSceneEdit"];
      onOpenSceneContentModal: Parameters<
        typeof SceneTrack
      >[0]["onOpenSceneContentModal"];
      onPickAndUploadSceneImage: Parameters<
        typeof SceneTrack
      >[0]["onPickAndUploadSceneImage"];
      onSceneImageFileDrop: Parameters<
        typeof SceneTrack
      >[0]["onSceneImageFileDrop"];
      onFilmSceneClipImageDrop: Parameters<
        typeof SceneTrack
      >[0]["onFilmSceneClipImageDrop"];
      emptyLaneDropBindings: Parameters<
        typeof SceneTrack
      >[0]["emptyLaneDropBindings"];
      getAudioLinkLabel: Parameters<typeof SceneTrack>[0]["getAudioLinkLabel"];
      onAudioLinkClick: Parameters<typeof SceneTrack>[0]["onAudioLinkClick"];
      onOpenSceneEditDirect: Parameters<
        typeof SceneTrack
      >[0]["onOpenSceneEditDirect"];
    };
    shot: {
      containerRef: RefObject<HTMLElement | null>;
      trackHeightPx: number;
      pxPerSec: number;
      viewStartSec: number;
      blocks: StructureTimelineBlock[];
      rowKey: Parameters<typeof ShotTrack>[0]["rowKey"];
      useFilmTreeLayout: boolean;
      structureBodyDragMovedRef: MutableRefObject<boolean>;
      onTrimClipMouseDown: Parameters<
        typeof ShotTrack
      >[0]["onTrimClipMouseDown"];
      onOpenShotEdit: Parameters<typeof ShotTrack>[0]["onOpenShotEdit"];
      shotPreviewUrl: Parameters<typeof ShotTrack>[0]["shotPreviewUrl"];
      onShotImageFileDrop: Parameters<
        typeof ShotTrack
      >[0]["onShotImageFileDrop"];
      emptyLaneDropBindings: Parameters<
        typeof ShotTrack
      >[0]["emptyLaneDropBindings"];
      getAudioLinkLabel: Parameters<typeof ShotTrack>[0]["getAudioLinkLabel"];
      onAudioLinkClick: Parameters<typeof ShotTrack>[0]["onAudioLinkClick"];
      onOpenShotEditDirect: Parameters<
        typeof ShotTrack
      >[0]["onOpenShotEditDirect"];
    };
  };
}

export function StructureTimelineStructureRows({
  labelWidthClass,
  labelColumnPx,
  contentWidthPx,
  zeitLabel,
  beatLabel,
  actLabel,
  sequenceLabel,
  sceneLabel,
  shotLabel,
  showFilmProductionTracks,
  ruler,
  beat,
  structure,
}: StructureTimelineStructureRowsProps) {
  const stackWidthPx = labelColumnPx + contentWidthPx;

  return (
    <>
      <StructureTimelineRowShell
        labelWidthClass={labelWidthClass}
        contentWidthPx={contentWidthPx}
        label={zeitLabel}
        heightPx={48}
      >
        <StructureTimelineRuler {...ruler} />
      </StructureTimelineRowShell>

      <StructureTimelineRowShell
        labelWidthClass={labelWidthClass}
        contentWidthPx={contentWidthPx}
        label={beatLabel}
        labelTestId="timeline-label-beat"
        heightPx={beat.trackHeightPx}
      >
        <TimelineStructureSelectionStack
          stackRef={beat.stackRef}
          widthPx={contentWidthPx}
          interactionMode={beat.interactionMode}
          selectionApi={beat.marqueeSelection}
        >
          <BeatTrack
            containerRef={beat.containerRef}
            trackHeightPx={beat.trackHeightPx}
            pxPerSec={beat.pxPerSec}
            viewStartSec={beat.viewStartSec}
            blocks={beat.blocks}
            beatLayoutEpoch={beat.beatLayoutEpoch}
            interactionMode={beat.interactionMode}
            marqueeSelection={beat.marqueeSelection}
            structureBodyDragMovedRef={beat.structureBodyDragMovedRef}
            onBeatMoveMouseDown={beat.onBeatMoveMouseDown}
            onTrimStart={beat.onTrimStart}
            onOpenBeatEdit={beat.onOpenBeatEdit}
          />
        </TimelineStructureSelectionStack>
      </StructureTimelineRowShell>

      <TimelineStructureSelectionStack
        stackRef={structure.stackRef}
        widthPx={stackWidthPx}
        interactionMode={structure.interactionMode}
        selectionApi={structure.marqueeSelection}
      >
        <StructureTimelineRowShell
          labelWidthClass={labelWidthClass}
          contentWidthPx={contentWidthPx}
          label={actLabel}
          labelTestId="timeline-label-act"
          heightPx={structure.act.trackHeightPx}
        >
          <ActTrack
            containerRef={structure.act.containerRef}
            trackHeightPx={structure.act.trackHeightPx}
            pxPerSec={structure.act.pxPerSec}
            viewStartSec={structure.act.viewStartSec}
            blocks={structure.act.blocks}
            rowKey={structure.act.rowKey}
            useFilmTreeLayout={structure.act.useFilmTreeLayout}
            marqueeSelection={structure.marqueeSelection}
            onClipTitleClick={structure.act.onClipTitleClick}
            onStructureMoveMouseDown={structure.act.onStructureMoveMouseDown}
            onTrimClipMouseDown={structure.act.onTrimClipMouseDown}
          />
        </StructureTimelineRowShell>

        <StructureTimelineRowShell
          labelWidthClass={labelWidthClass}
          contentWidthPx={contentWidthPx}
          label={sequenceLabel}
          heightPx={structure.sequence.trackHeightPx}
        >
          <SequenceTrack
            containerRef={structure.sequence.containerRef}
            trackHeightPx={structure.sequence.trackHeightPx}
            pxPerSec={structure.sequence.pxPerSec}
            viewStartSec={structure.sequence.viewStartSec}
            blocks={structure.sequence.blocks}
            rowKey={structure.sequence.rowKey}
            useFilmTreeLayout={structure.sequence.useFilmTreeLayout}
            marqueeSelection={structure.marqueeSelection}
            onClipTitleClick={structure.sequence.onClipTitleClick}
            onStructureMoveMouseDown={
              structure.sequence.onStructureMoveMouseDown
            }
            onTrimClipMouseDown={structure.sequence.onTrimClipMouseDown}
          />
        </StructureTimelineRowShell>

        <StructureTimelineRowShell
          labelWidthClass={labelWidthClass}
          contentWidthPx={contentWidthPx}
          label={sceneLabel}
          heightPx={structure.scene.trackHeightPx}
        >
          <SceneTrack
            containerRef={structure.scene.containerRef}
            trackHeightPx={structure.scene.trackHeightPx}
            pxPerSec={structure.scene.pxPerSec}
            viewStartSec={structure.scene.viewStartSec}
            blocks={structure.scene.blocks}
            rowKey={structure.scene.rowKey}
            useFilmTreeLayout={structure.scene.useFilmTreeLayout}
            isAudioProject={structure.scene.isAudioProject}
            marqueeSelection={structure.marqueeSelection}
            structureBodyDragMovedRef={
              structure.scene.structureBodyDragMovedRef
            }
            sceneTitleClickTimerRef={structure.scene.sceneTitleClickTimerRef}
            scenePreviewById={structure.scene.scenePreviewById}
            onStructureMoveMouseDown={structure.scene.onStructureMoveMouseDown}
            onTrimClipMouseDown={structure.scene.onTrimClipMouseDown}
            onOpenSceneEdit={structure.scene.onOpenSceneEdit}
            onOpenSceneContentModal={structure.scene.onOpenSceneContentModal}
            onPickAndUploadSceneImage={
              structure.scene.onPickAndUploadSceneImage
            }
            onSceneImageFileDrop={structure.scene.onSceneImageFileDrop}
            onFilmSceneClipImageDrop={structure.scene.onFilmSceneClipImageDrop}
            emptyLaneDropBindings={structure.scene.emptyLaneDropBindings}
            getAudioLinkLabel={structure.scene.getAudioLinkLabel}
            onAudioLinkClick={structure.scene.onAudioLinkClick}
            onOpenSceneEditDirect={structure.scene.onOpenSceneEditDirect}
          />
        </StructureTimelineRowShell>

        {showFilmProductionTracks && shotLabel ? (
          <StructureTimelineRowShell
            labelWidthClass={labelWidthClass}
            contentWidthPx={contentWidthPx}
            label={shotLabel}
            heightPx={structure.shot.trackHeightPx}
          >
            <ShotTrack
              containerRef={structure.shot.containerRef}
              trackHeightPx={structure.shot.trackHeightPx}
              pxPerSec={structure.shot.pxPerSec}
              viewStartSec={structure.shot.viewStartSec}
              blocks={structure.shot.blocks}
              rowKey={structure.shot.rowKey}
              useFilmTreeLayout={structure.shot.useFilmTreeLayout}
              marqueeSelection={structure.marqueeSelection}
              structureBodyDragMovedRef={
                structure.shot.structureBodyDragMovedRef
              }
              onTrimClipMouseDown={structure.shot.onTrimClipMouseDown}
              onOpenShotEdit={structure.shot.onOpenShotEdit}
              shotPreviewUrl={structure.shot.shotPreviewUrl}
              onShotImageFileDrop={structure.shot.onShotImageFileDrop}
              emptyLaneDropBindings={structure.shot.emptyLaneDropBindings}
              getAudioLinkLabel={structure.shot.getAudioLinkLabel}
              onAudioLinkClick={structure.shot.onAudioLinkClick}
              onOpenShotEditDirect={structure.shot.onOpenShotEditDirect}
            />
          </StructureTimelineRowShell>
        ) : null}
      </TimelineStructureSelectionStack>
    </>
  );
}
