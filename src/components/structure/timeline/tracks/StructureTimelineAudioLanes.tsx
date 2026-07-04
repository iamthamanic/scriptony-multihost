/**
 * Audio DAW rows inside StructureTimelineEditor (labels column + scroll content).
 * Location: src/components/structure/timeline/tracks/StructureTimelineAudioLanes.tsx
 */

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type RefObject,
} from "react";
import { useProjectClipLanes } from "../../../../hooks/useProjectClipLanes";
import { useTimelineAddAudio } from "../../../../hooks/useTimelineAddAudio";
import { useMveLines } from "../../../../hooks/useMveLines";
import { useMveLineRender } from "../../../../hooks/useMveLineRender";
import { useMveLaneLinks } from "../../../../hooks/useMveLaneLinks";
import { useMveVoiceProfiles } from "../../../../hooks/useMveVoiceProfiles";
import { useMetronomeSettings } from "../../../../hooks/useMetronomeSettings";
import type { LinkedLaneAudioContext } from "../../../../hooks/useTimelineAddAudio";
import type { TimelineSceneRef } from "../../../../lib/timeline-add-audio";
import type { MveLine } from "../../../../lib/multi-voice-engine/schema/line";
import { LANE_UI, laneIndexToTrackType } from "../../../../lib/audio-lane";
import { resolveMveTtsVoiceId } from "@/lib/mve/resolve-tts-voice-id";
import type { SceneTimeBlock } from "@/lib/mve/resolve-scene-at-timeline-sec";
import {
  buildStructurePickerTree,
  findSceneLabelInTree,
  isSceneInTree,
} from "@/lib/mve/structure-picker-tree";
import { cn } from "../../../../lib/utils";
import {
  StructureTimelineClipLaneContent,
  StructureTimelineClipLaneLabels,
} from "./StructureTimelineClipLanes";
import {
  StructureTimelineAudioSectionFooter,
  StructureTimelineAudioSectionHeader,
} from "./StructureTimelineAudioSectionChrome";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";

export interface StructureTimelineAudioLanesProps {
  projectId: string;
  projectType?: string;
  readingSpeedWpm?: number;
  pxPerSec: number;
  viewStartSec: number;
  totalWidthPx: number;
  currentTimeSec: number;
  linkedLaneAudio?: LinkedLaneAudioContext;
  sceneBlocksRef?: RefObject<SceneTimeBlock[]>;
}

export function useStructureTimelineAudioLanes(
  props: StructureTimelineAudioLanesProps,
) {
  const [expandedLane, setExpandedLane] = useState<number | null>(null);
  const lanes = useProjectClipLanes(props.projectId, props.projectType);
  const mve = useMveLines(props.projectId, {
    projectType: props.projectType,
    readingSpeedWpm: props.readingSpeedWpm,
    getSceneBlocks: () => props.sceneBlocksRef?.current ?? [],
  });
  const mveRender = useMveLineRender(props.projectId);
  const mveLaneLinks = useMveLaneLinks(props.projectId);
  const mveVoices = useMveVoiceProfiles(props.projectId);
  const metronome = useMetronomeSettings(props.projectId);
  const backfilledClipIds = useRef(new Set<string>());

  useEffect(() => {
    if (!mve.enabled || mve.isLoading) return;
    void (async () => {
      for (const clip of lanes.allClips) {
        if (backfilledClipIds.current.has(clip.id)) continue;
        const trackType = clip.trackType ?? "dialog";
        if (trackType !== "dialog" && trackType !== "narrator") continue;
        if (mve.lineByClipId.has(clip.id)) {
          backfilledClipIds.current.add(clip.id);
          continue;
        }
        backfilledClipIds.current.add(clip.id);
        try {
          await mve.ensureForClip(
            clip,
            clip.content,
            lanes.characterLanes.characterIdForLane(clip.laneIndex),
          );
        } catch (err) {
          backfilledClipIds.current.delete(clip.id);
          console.warn("[MVE] Clip line backfill failed:", clip.id, err);
        }
      }
    })();
  }, [
    lanes.allClips,
    mve.enabled,
    mve.isLoading,
    mve.lineByClipId,
    mve.ensureForClip,
    lanes.characterLanes,
  ]);

  const getMveRenderBlockReason = useCallback(
    (line: MveLine) => {
      if (!line.text?.trim()) {
        return "Bitte zuerst Dialogtext eingeben.";
      }
      if (!mveVoices.enabled) return undefined;
      if (!line.characterId) {
        return "Kein Charakter zugeordnet.";
      }
      const profile = mveVoices.profileByCharacterId.get(line.characterId);
      if (!resolveMveTtsVoiceId(profile)) {
        return "Charakter hat keine Stimme — im Characters-Panel zuweisen.";
      }
      return undefined;
    },
    [mveVoices],
  );

  const linesByCharacterId = useMemo(() => {
    if (!mve.enabled) return undefined;
    const map = new Map<string, MveLine[]>();
    for (const line of mve.lines) {
      if (!line.characterId || line.audioClipId) continue;
      const list = map.get(line.characterId) ?? [];
      list.push(line);
      map.set(line.characterId, list);
    }
    return map;
  }, [mve.enabled, mve.lines]);

  const linkedSceneIdForLane = useCallback(
    (laneIndex: number) => {
      if (!mveLaneLinks.enabled) return undefined;
      const characterId = lanes.characterLanes.characterIdForLane(laneIndex);
      if (!characterId) return undefined;
      return mveLaneLinks.links.find(
        (link) => link.characterId === characterId && link.enabled,
      )?.targetContainerId;
    },
    [mveLaneLinks, lanes.characterLanes],
  );

  const sceneBlocks = props.sceneBlocksRef?.current ?? [];

  const handleMoveLineToScene = useCallback(
    async (lineId: string, targetSceneId: string) => {
      if (!mve.enabled || sceneBlocks.length === 0) return;
      await mve.moveLineToScene(lineId, targetSceneId, sceneBlocks);
    },
    [mve, sceneBlocks],
  );

  const structurePickerTree = useMemo(
    () => buildStructurePickerTree(lanes.acts, lanes.sequences, lanes.scenes),
    [lanes.acts, lanes.sequences, lanes.scenes],
  );

  const getMveLaneLinkForLane = useCallback(
    (laneIndex: number) => {
      if (!mveLaneLinks.enabled) return undefined;
      const characterId = lanes.characterLanes.characterIdForLane(laneIndex);
      if (!characterId) return undefined;

      const existing = mveLaneLinks.links.find(
        (link) => link.characterId === characterId,
      );
      const linkedSceneId = existing?.enabled
        ? existing.targetContainerId
        : undefined;
      const laneLinkLabel = linkedSceneId
        ? (findSceneLabelInTree(structurePickerTree, linkedSceneId) ??
          "Szene nicht gefunden")
        : undefined;
      const laneLinkOrphan = linkedSceneId
        ? !isSceneInTree(structurePickerTree, linkedSceneId)
        : false;

      return {
        linkedSceneId,
        laneLinkLabel,
        laneLinkOrphan,
        onSaveLink: async (sceneId: string) => {
          if (existing) {
            await mveLaneLinks.updateLink(existing.id, {
              targetContainerId: sceneId,
              targetContainerType: "scene",
              enabled: true,
            });
          } else {
            await mveLaneLinks.createLink({
              characterId,
              targetContainerId: sceneId,
              targetContainerType: "scene",
            });
          }
        },
        onRemoveLink: existing
          ? async () => {
              await mveLaneLinks.deleteLink(existing.id);
            }
          : undefined,
      };
    },
    [mveLaneLinks, lanes.characterLanes, structurePickerTree],
  );

  const mveLaneLinkBase = useMemo(
    () =>
      mveLaneLinks.enabled
        ? {
            enabled: true as const,
            acts: lanes.acts,
            sequences: lanes.sequences,
            structureScenes: lanes.scenes,
            isMutating: mveLaneLinks.isMutating,
          }
        : undefined,
    [
      mveLaneLinks.enabled,
      mveLaneLinks.isMutating,
      lanes.acts,
      lanes.sequences,
      lanes.scenes,
    ],
  );

  const structurePicker = useMemo(
    () =>
      mve.enabled
        ? {
            acts: lanes.acts,
            sequences: lanes.sequences,
            scenes: lanes.scenes,
          }
        : undefined,
    [mve.enabled, lanes.acts, lanes.sequences, lanes.scenes],
  );

  const getSceneLabel = useCallback(
    (sceneId: string) => findSceneLabelInTree(structurePickerTree, sceneId),
    [structurePickerTree],
  );

  const handleDeleteLine = useCallback(
    async (lineId: string) => {
      if (!mve.enabled) return;
      await mve.deleteLine(lineId);
    },
    [mve],
  );

  const mveLines = useMemo(
    () =>
      mve.enabled && props.projectId
        ? {
            projectId: props.projectId,
            projectType: props.projectType,
            lineByClipId: mve.lineByClipId,
            linesByCharacterId,
            structurePicker,
            onSaveText: mve.saveLineText,
            onSaveDirection: mve.saveLineDirection,
            onBindAudioClip: mve.bindAudioClip,
            onMoveLineToScene: handleMoveLineToScene,
            linkedSceneIdForLane,
            getRenderBlockReason: getMveRenderBlockReason,
            onRenderLine: mveRender.renderLine,
            isRenderingLineId: mveRender.renderingLineId,
            getSceneLabel,
            onDeleteLine: handleDeleteLine,
          }
        : undefined,
    [
      mve.enabled,
      mve.lineByClipId,
      mve.saveLineText,
      mve.saveLineDirection,
      mve.bindAudioClip,
      handleMoveLineToScene,
      handleDeleteLine,
      linesByCharacterId,
      props.projectId,
      props.projectType,
      mveRender.renderLine,
      mveRender.renderingLineId,
      getMveRenderBlockReason,
      linkedSceneIdForLane,
      structurePicker,
      getSceneLabel,
    ],
  );

  const getVoiceIdForLane = useCallback(
    (laneIndex: number) => {
      if (!mveVoices.enabled) return undefined;
      const characterId = lanes.characterLanes.characterIdForLane(laneIndex);
      if (!characterId) return undefined;
      return resolveMveTtsVoiceId(
        mveVoices.profileByCharacterId.get(characterId),
      );
    },
    [lanes.characterLanes, mveVoices],
  );

  const getGenerateBlockReason = useCallback(
    (laneIndex: number) => {
      if (!mveVoices.enabled) return undefined;
      const trackType = laneIndexToTrackType(laneIndex);
      if (trackType !== "dialog" && trackType !== "narrator") {
        return undefined;
      }
      const characterId = lanes.characterLanes.characterIdForLane(laneIndex);
      if (!characterId) {
        return "Kein Charakter für diese Dialog-Spur.";
      }
      const profile = mveVoices.profileByCharacterId.get(characterId);
      if (!resolveMveTtsVoiceId(profile)) {
        return "Charakter hat keine Stimme — im Characters-Panel zuweisen.";
      }
      return undefined;
    },
    [lanes.characterLanes, mveVoices],
  );

  const addAudio = useTimelineAddAudio({
    projectId: props.projectId,
    projectType: props.projectType,
    scenes: lanes.scenes,
    currentTimeSec: props.currentTimeSec,
    getCharacterIdForLane: lanes.characterLanes.characterIdForLane,
    getVoiceIdForLane: mveVoices.enabled ? getVoiceIdForLane : undefined,
    getGenerateBlockReason: mveVoices.enabled
      ? getGenerateBlockReason
      : undefined,
    allClips: lanes.allClips,
    linkedLaneAudio: props.linkedLaneAudio,
    onClipCommittedMve: mve.enabled ? mve.ensureForClip : undefined,
    metronomeConfig: isLocalProfile() ? metronome.config : null,
  });

  const handleAddMveTextBlock = useCallback(
    async (payload: {
      laneIndex: number;
      characterId: string;
      sceneId: string;
      startSec: number;
    }) => {
      if (!mve.enabled) return;
      const orderIndex = lanes.scenes.findIndex(
        (s: TimelineSceneRef) => s.id === payload.sceneId,
      );
      await mve.createLine({
        sceneId: payload.sceneId,
        characterId: payload.characterId,
        text: "",
        orderIndex: Math.max(orderIndex, 0),
      });
    },
    [mve, lanes.scenes],
  );

  const laneProps = {
    pxPerSec: props.pxPerSec,
    viewStartSec: props.viewStartSec,
    totalWidthPx: props.totalWidthPx,
    scenes: lanes.scenes,
    structurePicker,
    sceneBlocks,
    laneGroups: lanes.laneGroups,
    sortedLaneIndices: lanes.sortedLaneIndices,
    allClips: lanes.allClips,
    laneState: lanes.laneState,
    handlers: lanes.handlers,
    currentTimeSec: props.currentTimeSec,
    expandedLane,
    onExpandedLaneChange: setExpandedLane,
    addAudio: {
      isBusy: addAudio.isBusy,
      recordingLane: addAudio.recordingLane,
      countInLane: addAudio.countInLane,
      addGenerated: addAudio.addGenerated,
      triggerUpload: addAudio.triggerUpload,
      toggleRecord: addAudio.toggleRecord,
      addSfxLane: addAudio.addSfxLane,
      generateBlockReasonForLane: addAudio.generateBlockReasonForLane,
    },
    characterLanes: {
      getCharacterForLane: lanes.characterLanes.getCharacterForLane,
      characterIdForLane: lanes.characterLanes.characterIdForLane,
      dialogLaneOrder: lanes.characterLanes.dialogLaneOrder,
      reorderCharacters: lanes.characterLanes.reorderCharacters,
      isReordering: lanes.characterLanes.isReordering,
      allClips: lanes.allClips,
    },
    mveLines,
    onAddMveTextBlock: mve.enabled ? handleAddMveTextBlock : undefined,
    readingSpeedWpm: props.readingSpeedWpm,
    linkedSceneIdForLane,
    getMveLaneLinkForLane,
    mveLaneLinkBase,
  };

  return { lanes, addAudio, laneProps, metronome };
}

/** Left column: mixer headers (below Scene label row). */
export function StructureTimelineAudioLaneLabels({
  laneProps,
  addAudio,
  metronome,
  isLoading,
}: {
  laneProps: ReturnType<typeof useStructureTimelineAudioLanes>["laneProps"];
  addAudio: ReturnType<typeof useStructureTimelineAudioLanes>["addAudio"];
  metronome?: ReturnType<typeof useStructureTimelineAudioLanes>["metronome"];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="border-t-2 border-primary/30 px-2 py-2 text-[9px] text-muted-foreground">
        Audio…
      </div>
    );
  }

  return (
    <div className="border-t-2 border-primary/30 bg-muted/15 shrink-0">
      <input
        ref={addAudio.fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={addAudio.onFileInputChange}
      />
      <StructureTimelineAudioSectionHeader
        side="labels"
        metronome={metronome}
      />
      <StructureTimelineClipLaneLabels {...laneProps} fullWidthSidebar />
      <StructureTimelineAudioSectionFooter
        side="labels"
        addAudio={{
          isBusy: addAudio.isBusy,
          addSfxLane: addAudio.addSfxLane,
        }}
      />
    </div>
  );
}

/** Scroll area: clip lanes aligned with structure timeline width. */
export function StructureTimelineAudioLaneScrollRows({
  laneProps,
  metronome,
  isLoading,
}: {
  laneProps: ReturnType<typeof useStructureTimelineAudioLanes>["laneProps"];
  metronome?: ReturnType<typeof useStructureTimelineAudioLanes>["metronome"];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div
        className="border-t-2 border-primary/30 flex items-center px-3 text-xs text-muted-foreground"
        style={{ height: LANE_UI.heightCompact }}
      >
        Audio-Spuren werden geladen…
      </div>
    );
  }

  return (
    <div className="relative border-t-2 border-primary/30 shrink-0">
      <StructureTimelineAudioSectionHeader
        side="scroll"
        metronome={metronome}
      />
      <StructureTimelineClipLaneContent {...laneProps} />
      <StructureTimelineAudioSectionFooter side="scroll" />
    </div>
  );
}

/** Standalone stack (ClipAudioTimeline) — not used in Structure tab. */
export function StructureTimelineAudioLanesStack(
  props: StructureTimelineAudioLanesProps,
) {
  const { lanes, addAudio, laneProps, metronome } =
    useStructureTimelineAudioLanes(props);

  return (
    <div className={cn("flex shrink-0", LANE_UI.mixerWidthClass)}>
      <div className="flex flex-col w-[248px] shrink-0 border-r border-border">
        <StructureTimelineAudioLaneLabels
          laneProps={laneProps}
          addAudio={addAudio}
          metronome={metronome}
          isLoading={lanes.isLoading}
        />
      </div>
      <div
        className="flex-1 min-w-0 overflow-x-auto"
        style={{ width: props.totalWidthPx }}
      >
        <StructureTimelineAudioLaneScrollRows
          laneProps={laneProps}
          metronome={metronome}
          isLoading={lanes.isLoading}
        />
      </div>
    </div>
  );
}

/** @deprecated Use useStructureTimelineAudioLanes */
export const useVideoEditorTimelineAudioLanes = useStructureTimelineAudioLanes;

/** @deprecated Use StructureTimelineAudioLaneLabels */
export const VideoEditorTimelineAudioLaneLabels =
  StructureTimelineAudioLaneLabels;

/** @deprecated Use StructureTimelineAudioLaneScrollRows */
export const VideoEditorTimelineAudioLaneScrollRows =
  StructureTimelineAudioLaneScrollRows;

/** @deprecated Use StructureTimelineAudioLanesStack */
export const VideoEditorTimelineAudioLanesStack =
  StructureTimelineAudioLanesStack;

/** @deprecated Use StructureTimelineAudioLanesProps */
export type VideoEditorTimelineAudioLanesProps =
  StructureTimelineAudioLanesProps;
