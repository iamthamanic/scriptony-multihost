/**
 * useProjectClipLanes — shared DAW lane data/handlers for ClipAudioTimeline and VET embed.
 * REFACTORED: extracted useRippleDerivation, useFxPersist, useLaneDelete (T26).
 */

import { toast } from "sonner";
import { useMemo, useCallback, useEffect, useRef } from "react";
import { useAudioTimeline } from "./useAudioTimeline";
import { useCharacterLaneMap } from "./useCharacterLaneMap";
import { useTtsGeneration } from "./useTtsGeneration";
import { useClipUpdate } from "./useClipUpdate";
import { useAudioLaneState } from "./useAudioLaneState";
import { useRippleDerivation } from "./useRippleDerivation";
import { useFxPersist } from "./useFxPersist";
import { useLaneDelete } from "./useLaneDelete";
import { useClipTrim } from "./useClipTrim";
import {
  mergeVisibleLaneIndices,
} from "../lib/audio-lane";
import { characterIdForLaneIndex, isCharacterDialogLane } from "../lib/character-lane-map";
import { migrateLegacyLaneIndex, needsLegacyLaneMigration } from "../lib/lane-index-migration";
import {
  fxSlotsFromMetadata,
  getFxSlotsFromLaneState,
} from "../lib/fx-chain";
import { updateAudioTrack } from "../lib/api/audio-story-api";
import type { AudioClip } from "../lib/types";

export function groupClipsByLane(
  clips: AudioClip[],
): Record<number, AudioClip[]> {
  const groups: Record<number, AudioClip[]> = {};
  for (const clip of clips) {
    const lane = clip.laneIndex ?? 0;
    if (!groups[lane]) groups[lane] = [];
    groups[lane].push(clip);
  }
  return groups;
}

export function sortedLaneIndicesFromGroups(
  groups: Record<number, AudioClip[]>,
): number[] {
  return Object.keys(groups)
    .map(Number)
    .sort((a, b) => a - b);
}

export interface UseProjectClipLanesOptions {
  enabled?: boolean;
}

export function useProjectClipLanes(
  projectId: string | undefined,
  projectType?: string | null,
  options?: UseProjectClipLanesOptions,
) {
  const enabled = options?.enabled ?? true;
  const isAudioProject = (projectType ?? "").toLowerCase() === "audio";
  const queryEnabled = enabled && isAudioProject && !!projectId;

  const { data, isLoading } = useAudioTimeline(
    queryEnabled ? projectId : undefined,
    projectType,
  );
  const laneState = useAudioLaneState();
  const characterLanes = useCharacterLaneMap({
    projectId,
    enabled: queryEnabled,
  });
  const migratedRef = useRef(false);

  const allClipsRaw = useMemo(() => {
    if (!data?.clipsByScene) return [];
    return Object.values(data.clipsByScene).flat();
  }, [data]);

  const allClips = useMemo(() => {
    return allClipsRaw.map((c) => {
      if (!needsLegacyLaneMigration(c.laneIndex)) return c;
      return { ...c, laneIndex: migrateLegacyLaneIndex(c.laneIndex) };
    });
  }, [allClipsRaw]);

  const laneGroups = useMemo(() => groupClipsByLane(allClips), [allClips]);

  const sortedLaneIndices = useMemo(
    () =>
      mergeVisibleLaneIndices(
        sortedLaneIndicesFromGroups(laneGroups),
        true,
        characterLanes.dialogLaneIndices,
      ),
    [laneGroups, characterLanes.dialogLaneIndices],
  );

  const durationSec = useMemo(() => {
    if (allClips.length === 0) return 120;
    const maxEnd = Math.max(...allClips.map((c) => c.endSec ?? 0));
    return maxEnd > 0 ? Math.ceil(maxEnd + 30) : 120;
  }, [allClips]);

  const { rippleScenes, rippleSequences, rippleActs } = useRippleDerivation(
    data,
    allClips,
  );

  const { handleTrimEnd } = useClipTrim(
    projectId,
    allClips,
    rippleScenes,
    rippleSequences,
    rippleActs,
  );

  const clipUpdate = useClipUpdate(projectId ?? "");

  const trackMap = useMemo(() => {
    const map = new Map<
      string,
      { ttsVoiceId?: string; content?: string }
    >();
    for (const sceneTracks of Object.values(data?.tracksByScene ?? {})) {
      for (const t of sceneTracks) {
        map.set(t.id, { ttsVoiceId: t.ttsVoiceId, content: t.content });
      }
    }
    return map;
  }, [data]);

  const { startTts } = useTtsGeneration({ sceneId: "" });

  const handleGenerateTts = useCallback(
    (clip: AudioClip) => {
      const track = trackMap.get(clip.trackId);
      const voiceId = track?.ttsVoiceId;
      const text = track?.content || clip.content || "";
      if (!voiceId) {
        toast.info("Keine Voice zugewiesen. Bitte Voice zuweisen.");
        return;
      }
      if (!text.trim()) {
        toast.info("Kein Text vorhanden zum Generieren.");
        return;
      }
      startTts(
        { trackId: clip.trackId, clipId: clip.id, text, voiceId },
        clip.sceneId,
      );
    },
    [trackMap, startTts],
  );

  const handleLaneChange = useCallback(
    (clipId: string, newLaneIndex: number) => {
      const clip = allClips.find((c) => c.id === clipId);
      const characterId = isCharacterDialogLane(newLaneIndex)
        ? characterIdForLaneIndex(newLaneIndex, characterLanes.dialogLaneOrder)
        : undefined;

      clipUpdate.mutate(
        {
          clipId,
          updates: {
            laneIndex: newLaneIndex,
            ...(characterId ? { characterId } : {}),
          },
        },
        {
          onSuccess: async () => {
            if (clip?.trackId && characterId) {
              try {
                await updateAudioTrack(clip.trackId, {
                  characterId,
                  type: "dialog",
                });
              } catch {
                /* track update best-effort */
              }
            }
          },
          onError: (err) => {
            toast.error(
              err instanceof Error
                ? err.message
                : "Spurwechsel konnte nicht gespeichert werden.",
            );
          },
        },
      );
    },
    [allClips, characterLanes.dialogLaneOrder, clipUpdate],
  );

  useEffect(() => {
    if (!queryEnabled || migratedRef.current || characterLanes.isLoading)
      return;
    if (allClips.length === 0 || characterLanes.dialogLaneOrder.length === 0) {
      return;
    }
    migratedRef.current = true;
    void characterLanes.migrateClipsIfNeeded(allClips);
  }, [
    queryEnabled,
    allClips,
    characterLanes.isLoading,
    characterLanes.dialogLaneOrder.length,
    characterLanes.migrateClipsIfNeeded,
  ]);

  useEffect(() => {
    if (!queryEnabled) return;
    for (const laneIndex of sortedLaneIndices) {
      const current = laneState.laneStates[laneIndex];
      const first = (laneGroups[laneIndex] ?? [])[0];
      if (!current?.fxSlots?.length && first) {
        const slots = first.fxSlots?.length
          ? first.fxSlots
          : fxSlotsFromMetadata(null, first.fxPresetId);
        laneState.setFxSlots(laneIndex, slots);
      }
      if (
        current?.fxChainEnabled === undefined &&
        first?.fxChainEnabled !== undefined
      ) {
        laneState.setFxChainEnabled(laneIndex, first.fxChainEnabled !== false);
      }
    }
  }, [
    allClips,
    laneGroups,
    sortedLaneIndices,
    queryEnabled,
    laneState.laneStates,
    laneState.setFxSlots,
    laneState.setFxChainEnabled,
  ]);

  const {
    handleFxSlotChange,
    handleFxChainEnabledChange,
  } = useFxPersist(projectId, allClips, laneState);

  const { isDeletingLane, handleDeleteLane } = useLaneDelete(projectId);

  return {
    isLoading:
      queryEnabled && (isLoading || characterLanes.isLoading || isDeletingLane),
    scenes: data?.scenes ?? [],
    allClips,
    laneGroups,
    sortedLaneIndices,
    laneState,
    characterLanes,
    handlers: {
      handleTrimEnd,
      handleLaneChange,
      handleDeleteLane: (laneIndex: number) => handleDeleteLane(laneIndex, allClips),
      handleFxSlotChange,
      handleFxChainEnabledChange,
      handleGenerateTts,
    },
    durationSec,
  };
}

export type ProjectClipLanesResult = ReturnType<typeof useProjectClipLanes>;
