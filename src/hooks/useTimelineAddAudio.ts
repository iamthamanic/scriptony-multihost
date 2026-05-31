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
import { queryKeys } from "../lib/react-query";
import { useTtsGeneration } from "./useTtsGeneration";
import { useAudioRecording } from "./useAudioRecording";
import * as ClipAPI from "../lib/api/audio-clip-api";
import { getAuthToken } from "../lib/auth/getAuthToken";
import { laneIndexToTrackType, findFreeLaneForType } from "../lib/audio-lane";
import { isAudioClipSystemEnabled } from "../lib/feature-flags";
import type { AudioClip } from "../lib/types";

export interface UseTimelineAddAudioOptions {
  projectId: string | undefined;
  projectType?: string | null;
  scenes: TimelineSceneRef[];
  sceneTiming?: TimelineSceneTiming[];
  currentTimeSec?: number;
  getCharacterIdForLane?: (laneIndex: number) => string | undefined;
  allClips?: AudioClip[];
}

export function useTimelineAddAudio({
  projectId,
  projectType,
  scenes,
  sceneTiming,
  currentTimeSec = 0,
  getCharacterIdForLane,
  allClips = [],
}: UseTimelineAddAudioOptions) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingLaneRef = useRef<{ laneIndex: number; startSec: number } | null>(
    null,
  );
  const [isBusy, setIsBusy] = useState(false);

  const { startTts } = useTtsGeneration({ sceneId: "" });

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

  const resolveScene = useCallback(() => {
    const sceneId = resolveSceneIdForTimeline(
      scenes,
      currentTimeSec,
      sceneTiming,
    );
    if (!sceneId) {
      toast.error("Keine Szene vorhanden — zuerst Struktur anlegen.");
      return undefined;
    }
    return sceneId;
  }, [scenes, currentTimeSec, sceneTiming]);

  const addFromFile = useCallback(
    async (file: File, laneIndex: number, startSec: number) => {
      if (!projectId) return;
      const sceneId = resolveScene();
      if (!sceneId) return;

      setIsBusy(true);
      try {
        const { clipId } = await createTimelineAudioOnLane({
          projectId,
          projectType,
          sceneId,
          laneIndex,
          startSec,
          content: file.name,
          trackType: laneIndexToTrackType(laneIndex),
          characterId: getCharacterIdForLane?.(laneIndex),
        });

        if (!clipId) {
          toast.success("Track angelegt");
          invalidateProject(sceneId);
          return;
        }

        const { storagePath, peaks, durationSec } =
          await persistClipAudioFile(file);
        await attachAudioBlobToClip(clipId, storagePath, peaks);
        if (durationSec > 0) {
          const token = await getAuthToken();
          await ClipAPI.updateClip(
            clipId,
            { endSec: startSec + durationSec },
            token ?? "",
          );
        }
        invalidateProject(sceneId);
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
      resolveScene,
      invalidateProject,
      getCharacterIdForLane,
    ],
  );

  const addGenerated = useCallback(
    async (laneIndex: number, startSec: number) => {
      if (!projectId) return;
      const sceneId = resolveScene();
      if (!sceneId) return;

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

      setIsBusy(true);
      try {
        const { trackId, clipId } = await createTimelineAudioOnLane({
          projectId,
          projectType,
          sceneId,
          laneIndex,
          startSec,
          content: text.trim(),
          trackType,
          characterId: getCharacterIdForLane?.(laneIndex),
        });
        invalidateProject(sceneId);
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
              voiceId: "",
            },
            sceneId,
          );
          toast.info(
            "TTS gestartet — Voice in den Einstellungen zuweisen falls nötig.",
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
      resolveScene,
      invalidateProject,
      startTts,
      getCharacterIdForLane,
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
    const sceneId = resolveScene();
    if (!sceneId) return;

    const laneIndex = findFreeLaneForType(allClips, "sfx");
    if (laneIndex === undefined) {
      toast.error("Keine freie SFX-Spur verfügbar.");
      return;
    }

    setIsBusy(true);
    try {
      await createTimelineAudioOnLane({
        projectId,
        projectType,
        sceneId,
        laneIndex,
        startSec: currentTimeSec,
        content: "SFX",
        trackType: "sfx",
      });
      invalidateProject(sceneId);
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
    resolveScene,
    invalidateProject,
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
  };
}
