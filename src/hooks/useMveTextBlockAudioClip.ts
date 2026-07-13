/**
 * React hook — builds, persists and binds an AudioClip for an MVE text block
 * (T28). Shared between Generate, Upload and Record flows.
 *
 * Location: src/hooks/useMveTextBlockAudioClip.ts
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRuntime } from "@/runtime";
import { createAudioTrack } from "@/lib/api-adapter/audio-story-adapter";
import { updateClip } from "@/lib/api-adapter/clips-adapter";
import { persistClipAudioFile } from "@/lib/local-project-audio";
import { upsertClipInAudioTimelineCache } from "@/lib/audio-timeline-cache";
import { queryKeys } from "@/lib/react-query";
import { estimateDurationSec } from "@/lib/audio-utils";
import { requireLocalBackend } from "@/lib/api-adapter/runtime-dispatch";
import { syncClipWithSelectedTake } from "@/lib/mve/sync-clip-with-selected-take";
import { SCENE_CONTENT_DURATION_EPS_SEC } from "@/lib/mve/sync-scene-duration-for-mve-content";
import { resizeSceneForContent } from "@/lib/structure/resize-scene-for-content";
import { isContentDrivenSceneDuration } from "@/lib/mve/scene-duration-policy";
import type { AudioClip } from "@/lib/types";

export interface UseMveTextBlockAudioClipOptions {
  enabled: boolean;
  projectId: string | undefined;
  projectType?: string;
  lineId: string;
  characterId: string | undefined;
  effectiveSceneId: string | null;
  text: string;
  timelineStartSec?: number;
  onBindAudioClip?: (lineId: string, clipId: string | null) => Promise<void>;
}

export interface UseMveTextBlockAudioClipResult {
  createClipShell: (sceneIdOverride?: string) => Promise<AudioClip>;
  cacheAndBind: (clip: AudioClip) => Promise<void>;
  syncClipIfProject: () => Promise<void>;
  uploadAudioBlob: (blob: Blob) => Promise<void>;
}

export function useMveTextBlockAudioClip({
  enabled,
  projectId,
  projectType,
  lineId,
  characterId,
  effectiveSceneId,
  text,
  timelineStartSec,
  onBindAudioClip,
}: UseMveTextBlockAudioClipOptions): UseMveTextBlockAudioClipResult {
  const queryClient = useQueryClient();
  const runtime = useRuntime();

  const ensureBackend = useCallback(() => {
    if (!projectId) {
      throw new Error("Kein Projekt geöffnet.");
    }
    return requireLocalBackend(projectId);
  }, [projectId]);

  const createClipShell = useCallback(
    async (sceneIdOverride?: string): Promise<AudioClip> => {
      if (!enabled) throw new Error("Audio-Bindung nicht aktiviert.");
      const backend = ensureBackend();
      const activeSceneId = sceneIdOverride ?? effectiveSceneId;
      if (!activeSceneId) {
        throw new Error("Keine Szene für den Audio-Clip ausgewählt.");
      }
      const clipStartSec = Math.max(0, timelineStartSec ?? 0);
      const { clip } = await createAudioTrack(
        activeSceneId,
        backend.localProject.projectId,
        {
          type: "dialog",
          content: text,
          characterId,
          startTime: clipStartSec,
          duration: estimateDurationSec(text, { type: "dialog" }),
          laneIndex: 0,
        },
      );
      if (!clip?.id) {
        throw new Error("Audiospur konnte nicht angelegt werden.");
      }
      return clip;
    },
    [
      enabled,
      characterId,
      ensureBackend,
      effectiveSceneId,
      text,
      timelineStartSec,
    ],
  );

  const syncSceneAfterClip = useCallback(
    async (clip: AudioClip) => {
      if (runtime.profile !== "local") return;
      if (!projectId || !effectiveSceneId || !clip.id) return;

      try {
        if (isContentDrivenSceneDuration(projectType)) {
          const result = await resizeSceneForContent({
            projectId,
            sceneId: effectiveSceneId,
            requiredEndSec: clip.endSec,
            clipId: clip.id,
          });
          const needsGrow =
            result.sceneEndSec != null &&
            clip.endSec > result.sceneEndSec + SCENE_CONTENT_DURATION_EPS_SEC;
          if (result.resized) {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.timeline.byProject(projectId),
            });
            void queryClient.invalidateQueries({
              queryKey: queryKeys.timeline.audioByProject(projectId),
            });
          } else if (needsGrow) {
            console.warn(
              "[MVE] Szene konnte nicht verlängert werden:",
              effectiveSceneId,
              {
                requiredEndSec: clip.endSec,
                sceneEndSec: result.sceneEndSec,
                blockReason: result.blockReason,
              },
            );
            toast.warning("Szene konnte nicht verlängert werden");
          }
        } else {
          const result = await resizeSceneForContent({
            projectId,
            sceneId: effectiveSceneId,
            requiredEndSec: clip.endSec,
            clipId: clip.id,
          });
          const needsGrow =
            result.sceneEndSec != null &&
            clip.endSec > result.sceneEndSec + SCENE_CONTENT_DURATION_EPS_SEC;
          if (result.resized && result.deltaSec > 0) {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.timeline.byProject(projectId),
            });
            void queryClient.invalidateQueries({
              queryKey: queryKeys.timeline.audioByProject(projectId),
            });
          } else if (needsGrow) {
            toast.warning("Szene konnte nicht verlängert werden");
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[MVE] Szene-Verlängerung fehlgeschlagen:", err);
        toast.warning(`Szene konnte nicht angepasst werden: ${msg}`);
      }
    },
    [runtime.profile, projectId, projectType, effectiveSceneId, queryClient],
  );

  const cacheAndBind = useCallback(
    async (clip: AudioClip) => {
      if (!enabled) throw new Error("Audio-Bindung nicht aktiviert.");
      if (!projectId || !clip.id) {
        throw new Error("Clip konnte nicht erstellt werden.");
      }
      upsertClipInAudioTimelineCache(queryClient, projectId, clip);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.audioByProject(projectId),
      });
      if (!onBindAudioClip) {
        throw new Error("Audio-Bindung nicht aktiviert.");
      }
      await onBindAudioClip(lineId, clip.id);
      try {
        await syncSceneAfterClip(clip);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[MVE] Szene-Verlängerung fehlgeschlagen:", err);
        toast.warning(`Szene konnte nicht verlängert werden: ${msg}`);
      }
    },
    [
      enabled,
      lineId,
      projectId,
      queryClient,
      onBindAudioClip,
      syncSceneAfterClip,
    ],
  );

  const syncClipIfProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const result = await syncClipWithSelectedTake(projectId, lineId);
      if (result?.clipId) {
        await syncSceneAfterClip({
          id: result.clipId,
          endSec: result.endSec,
        } as AudioClip);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[MVE] Take-Clip-Sync fehlgeschlagen:", err);
      toast.warning(`Take-Clip-Sync fehlgeschlagen: ${msg}`);
    }
  }, [projectId, lineId, syncSceneAfterClip]);

  const uploadAudioBlob = useCallback(
    async (blob: Blob) => {
      const clip = await createClipShell();
      const persisted = await persistClipAudioFile(
        new File([blob], `record-${Date.now()}.webm`, { type: blob.type }),
      );
      const updated = await updateClip(clip.id, {
        audioFileId: persisted.storagePath,
        startSec: clip.startSec,
        endSec: clip.startSec + persisted.durationSec,
        waveformData: persisted.peaks.length > 0 ? persisted.peaks : undefined,
      });
      await cacheAndBind(updated);
      await syncClipIfProject();
    },
    [createClipShell, cacheAndBind, syncClipIfProject],
  );

  return {
    createClipShell,
    cacheAndBind,
    syncClipIfProject,
    uploadAudioBlob,
  };
}
