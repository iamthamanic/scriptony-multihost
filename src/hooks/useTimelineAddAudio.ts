/**
 * useTimelineAddAudio — Record / Upload / Generate from DAW timeline lanes.
 * REFACTORED: extracted useAudioRecording (T26).
 */

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  attachAudioBlobToClip,
  createTimelineAudioOnLane,
  resolveSceneIdForTimeline,
  type TimelineSceneRef,
  type TimelineSceneTiming,
} from "../lib/timeline-add-audio";
import { persistClipAudioFile } from "../lib/local-project-audio";
import { addClipToAudioTimelineCache } from "../lib/audio-timeline-cache";
import { queryKeys } from "../lib/react-query";
import { useTtsGeneration } from "./useTtsGeneration";
import { useAudioRecording } from "./useAudioRecording";
import * as ClipAPI from "../lib/api/audio-clip-api";
import { getAuthToken } from "../lib/auth/getAuthToken";
import { laneIndexToTrackType, findFreeLaneForType } from "../lib/audio-lane";
import { isAudioClipSystemEnabled } from "../lib/feature-flags";
import {
  getLinkForLane,
  resolveLinkedAudioStartSec,
  type SceneAudioLaneLinkMap,
  type StructureTimeBlock,
} from "../lib/scene-audio-lane-link";
import type { AudioClip } from "../lib/types";
import { useLocalProjectOptional } from "./useLocalProject";

export interface LinkedLaneAudioContext {
  links: SceneAudioLaneLinkMap;
  getBlockForNode: (nodeId: string) => StructureTimeBlock | undefined;
  resolveSceneIdForNode: (nodeId: string) => string | undefined;
  seekPlayhead: (sec: number) => void;
  onClipCommitted?: (clip: {
    sceneId: string;
    startSec: number;
    endSec: number;
    linkedNodeId: string;
  }) => Promise<void>;
}

export interface LaneAudioPlacement {
  sceneId: string;
  startSec: number;
  blockEndSec: number;
  linkedNodeId: string;
}

export interface UseTimelineAddAudioOptions {
  projectId: string | undefined;
  projectType?: string | null;
  scenes: TimelineSceneRef[];
  sceneTiming?: TimelineSceneTiming[];
  currentTimeSec?: number;
  getCharacterIdForLane?: (laneIndex: number) => string | undefined;
  allClips?: AudioClip[];
  linkedLaneAudio?: LinkedLaneAudioContext;
  /** Create MVE line when a dialog clip is committed (local desktop). */
  onClipCommittedMve?: (
    clip: AudioClip,
    characterId?: string,
  ) => Promise<unknown>;
  /** MVE: Kokoro/cloud voice id for dialog lane TTS. */
  getVoiceIdForLane?: (laneIndex: number) => string | undefined;
  /** MVE: reason Generate is blocked (dialog lanes without voice). */
  getGenerateBlockReason?: (laneIndex: number) => string | undefined;
}

export function useTimelineAddAudio({
  projectId,
  projectType,
  scenes,
  sceneTiming,
  currentTimeSec = 0,
  getCharacterIdForLane,
  allClips = [],
  linkedLaneAudio,
  onClipCommittedMve,
  getVoiceIdForLane,
  getGenerateBlockReason,
}: UseTimelineAddAudioOptions) {
  const queryClient = useQueryClient();
  const localProject = useLocalProjectOptional();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingLaneRef = useRef<{ laneIndex: number; startSec: number } | null>(
    null,
  );
  const [isBusy, setIsBusy] = useState(false);

  const { startTts } = useTtsGeneration({
    sceneId: "",
    projectDir: localProject?.project?.dirPath,
  });

  const applyClipToCache = useCallback(
    (clip: AudioClip | undefined, sceneId: string) => {
      if (!projectId || !clip?.id) return;
      addClipToAudioTimelineCache(queryClient, projectId, clip);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.audioByProject(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.audio.clipsByScene(sceneId),
      });
    },
    [projectId, queryClient],
  );

  const invalidateProject = useCallback(
    (sceneId: string) => {
      if (!projectId) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.audioByProject(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.audio.clipsByScene(sceneId),
      });
    },
    [queryClient, projectId],
  );

  const resolveLanePlacement = useCallback(
    (
      laneIndex: number,
      requestedStartSec: number,
    ): LaneAudioPlacement | null => {
      const linked = linkedLaneAudio
        ? getLinkForLane(linkedLaneAudio.links, laneIndex)
        : undefined;
      if (linked && linkedLaneAudio) {
        const block = linkedLaneAudio.getBlockForNode(linked.nodeId);
        const sceneId = linkedLaneAudio.resolveSceneIdForNode(linked.nodeId);
        if (!block || !sceneId) {
          toast.error("Verlinkte Szene nicht gefunden.");
          return null;
        }
        const startSec = resolveLinkedAudioStartSec({
          currentTimeSec: requestedStartSec,
          block,
          seekPlayhead: linkedLaneAudio.seekPlayhead,
        });
        return {
          sceneId,
          startSec,
          blockEndSec: block.endSec,
          linkedNodeId: linked.nodeId,
        };
      }
      const sceneId = resolveSceneIdForTimeline(
        scenes,
        requestedStartSec,
        sceneTiming,
      );
      if (!sceneId) {
        toast.error("Keine Szene vorhanden — zuerst Struktur anlegen.");
        return null;
      }
      return {
        sceneId,
        startSec: requestedStartSec,
        blockEndSec: Number.POSITIVE_INFINITY,
        linkedNodeId: sceneId,
      };
    },
    [linkedLaneAudio, scenes, sceneTiming],
  );

  const finalizeClipCommit = useCallback(
    async (
      clip: AudioClip | undefined,
      placement: LaneAudioPlacement,
      endSecOverride?: number,
    ) => {
      if (!clip?.id) return;
      const endSec = endSecOverride ?? clip.endSec;
      applyClipToCache({ ...clip, endSec }, placement.sceneId);
      if (onClipCommittedMve) {
        await onClipCommittedMve(
          { ...clip, endSec },
          getCharacterIdForLane?.(clip.laneIndex),
        );
      }
      if (
        linkedLaneAudio?.onClipCommitted &&
        Number.isFinite(placement.blockEndSec) &&
        endSec > placement.blockEndSec + 1e-4
      ) {
        await linkedLaneAudio.onClipCommitted({
          sceneId: placement.sceneId,
          startSec: placement.startSec,
          endSec,
          linkedNodeId: placement.linkedNodeId,
        });
      }
    },
    [
      applyClipToCache,
      linkedLaneAudio,
      onClipCommittedMve,
      getCharacterIdForLane,
    ],
  );

  const addFromFile = useCallback(
    async (file: File, laneIndex: number, startSec: number) => {
      if (!projectId) return;
      const placement = resolveLanePlacement(laneIndex, startSec);
      if (!placement) return;

      setIsBusy(true);
      try {
        const { clipId, clip } = await createTimelineAudioOnLane({
          projectId,
          projectType,
          sceneId: placement.sceneId,
          laneIndex,
          startSec: placement.startSec,
          content: file.name,
          trackType: laneIndexToTrackType(laneIndex),
          characterId: getCharacterIdForLane?.(laneIndex),
        });

        if (!clipId) {
          toast.success("Track angelegt");
          if (clip) await finalizeClipCommit(clip, placement);
          else invalidateProject(placement.sceneId);
          return;
        }

        const { storagePath, peaks, durationSec } =
          await persistClipAudioFile(file);
        await attachAudioBlobToClip(clipId, storagePath, peaks);
        const endSec =
          placement.startSec +
          (durationSec > 0
            ? durationSec
            : (clip?.endSec ?? 0) - placement.startSec);
        if (durationSec > 0) {
          const token = await getAuthToken();
          await ClipAPI.updateClip(clipId, { endSec }, token ?? "");
        }
        await finalizeClipCommit(
          clip ? { ...clip, endSec } : undefined,
          placement,
          endSec,
        );
        toast.success("Audio hochgeladen");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Upload fehlgeschlagen",
        );
      } finally {
        setIsBusy(false);
      }
    },
    [
      projectId,
      projectType,
      resolveLanePlacement,
      invalidateProject,
      finalizeClipCommit,
      getCharacterIdForLane,
    ],
  );

  const addGenerated = useCallback(
    async (laneIndex: number, startSec: number) => {
      if (!projectId) return;

      const blockReason = getGenerateBlockReason?.(laneIndex);
      if (blockReason) {
        toast.info(blockReason);
        return;
      }

      const placement = resolveLanePlacement(laneIndex, startSec);
      if (!placement) return;

      const trackType = laneIndexToTrackType(laneIndex);
      const defaultText =
        trackType === "dialog" || trackType === "narrator"
          ? "Neuer Dialogtext…"
          : "";

      const text =
        typeof window !== "undefined"
          ? (window.prompt("Text für Audio-Generierung:", defaultText) ??
            defaultText)
          : defaultText;

      if (!text?.trim()) {
        toast.info("Abgebrochen — kein Text eingegeben.");
        return;
      }

      const voiceId = getVoiceIdForLane?.(laneIndex) ?? "";
      if (
        getVoiceIdForLane &&
        (trackType === "dialog" || trackType === "narrator") &&
        !voiceId.trim()
      ) {
        toast.info(
          "Charakter hat keine Stimme — bitte im Characters-Panel zuweisen.",
        );
        return;
      }

      setIsBusy(true);
      try {
        const { trackId, clipId, clip } = await createTimelineAudioOnLane({
          projectId,
          projectType,
          sceneId: placement.sceneId,
          laneIndex,
          startSec: placement.startSec,
          content: text.trim(),
          trackType,
          characterId: getCharacterIdForLane?.(laneIndex),
        });
        await finalizeClipCommit(clip, placement);
        toast.success("Audio-Clip angelegt");

        if (
          clipId &&
          (trackType === "dialog" || trackType === "narrator") &&
          isAudioClipSystemEnabled(projectType)
        ) {
          startTts(
            {
              trackId,
              clipId,
              text: text.trim(),
              voiceId: getVoiceIdForLane ? voiceId : "",
            },
            placement.sceneId,
          );
          toast.info(
            getVoiceIdForLane
              ? "TTS gestartet mit Charakter-Stimme."
              : "TTS gestartet — Voice in den Einstellungen zuweisen falls nötig.",
          );
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Generieren fehlgeschlagen",
        );
      } finally {
        setIsBusy(false);
      }
    },
    [
      projectId,
      projectType,
      resolveLanePlacement,
      finalizeClipCommit,
      startTts,
      getCharacterIdForLane,
      getVoiceIdForLane,
      getGenerateBlockReason,
    ],
  );

  const triggerUpload = useCallback((laneIndex: number, startSec: number) => {
    pendingLaneRef.current = { laneIndex, startSec };
    fileInputRef.current?.click();
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      const pending = pendingLaneRef.current;
      if (!file || !pending) return;
      void addFromFile(file, pending.laneIndex, pending.startSec);
      pendingLaneRef.current = null;
    },
    [addFromFile],
  );

  const { recordingLane, toggleRecord } = useAudioRecording({
    onRecordComplete: (file, laneIndex, startSec) =>
      void addFromFile(file, laneIndex, startSec),
  });

  const addSfxLane = useCallback(async () => {
    if (!projectId) return;
    const laneIndex = findFreeLaneForType(allClips, "sfx");
    if (laneIndex === undefined) {
      toast.error("Keine freie SFX-Spur verfügbar.");
      return;
    }
    const placement = resolveLanePlacement(laneIndex, currentTimeSec);
    if (!placement) return;

    setIsBusy(true);
    try {
      const { clip } = await createTimelineAudioOnLane({
        projectId,
        projectType,
        sceneId: placement.sceneId,
        laneIndex,
        startSec: placement.startSec,
        content: "SFX",
        trackType: "sfx",
      });
      await finalizeClipCommit(clip, placement);
      toast.success(`SFX-Spur angelegt`);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "SFX-Spur konnte nicht angelegt werden.",
      );
    } finally {
      setIsBusy(false);
    }
  }, [
    projectId,
    projectType,
    resolveLanePlacement,
    finalizeClipCommit,
    allClips,
    currentTimeSec,
  ]);

  return {
    isBusy,
    recordingLane,
    fileInputRef,
    onFileInputChange,
    addGenerated,
    triggerUpload,
    toggleRecord,
    addSfxLane,
    generateBlockReasonForLane: getGenerateBlockReason,
  };
}
