/**
 * React hook — builds, persists and binds an AudioClip for an MVE text block
 * (T28). Shared between Generate, Upload and Record flows.
 *
 * Location: src/hooks/useMveTextBlockAudioClip.ts
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createAudioTrack } from "@/lib/api-adapter/audio-story-adapter";
import { updateClip } from "@/lib/api-adapter/clips-adapter";
import { persistClipAudioFile } from "@/lib/local-project-audio";
import { addClipToAudioTimelineCache } from "@/lib/audio-timeline-cache";
import { queryKeys } from "@/lib/react-query";
import { estimateDurationSec } from "@/lib/audio-utils";
import { requireLocalBackend } from "@/lib/api-adapter/runtime-dispatch";
import { syncClipWithSelectedTake } from "@/lib/mve/sync-clip-with-selected-take";
import type { AudioClip } from "@/lib/types";

export interface UseMveTextBlockAudioClipOptions {
  enabled: boolean;
  projectId: string | undefined;
  lineId: string;
  characterId: string | undefined;
  effectiveSceneId: string | null;
  text: string;
  onBindAudioClip?: (lineId: string, clipId: string | null) => Promise<void>;
}

export interface UseMveTextBlockAudioClipResult {
  createClipShell: () => Promise<AudioClip>;
  cacheAndBind: (clip: AudioClip) => Promise<void>;
  syncClipIfProject: () => Promise<void>;
  uploadAudioBlob: (blob: Blob) => Promise<void>;
}

export function useMveTextBlockAudioClip({
  enabled,
  projectId,
  lineId,
  characterId,
  effectiveSceneId,
  text,
  onBindAudioClip,
}: UseMveTextBlockAudioClipOptions): UseMveTextBlockAudioClipResult {
  const queryClient = useQueryClient();

  const ensureBackend = useCallback(() => {
    if (!projectId) {
      throw new Error("Kein Projekt geöffnet.");
    }
    return requireLocalBackend(projectId);
  }, [projectId]);

  const createClipShell = useCallback(async (): Promise<AudioClip> => {
    if (!enabled) throw new Error("Audio-Bindung nicht aktiviert.");
    const backend = ensureBackend();
    const activeSceneId = effectiveSceneId;
    if (!activeSceneId) {
      throw new Error("Keine Szene für den Audio-Clip ausgewählt.");
    }
    const { clip } = await createAudioTrack(
      activeSceneId,
      backend.localProject.projectId,
      {
        type: "dialog",
        content: text,
        characterId,
        startTime: 0,
        duration: estimateDurationSec(text, { type: "dialog" }),
        laneIndex: 0,
      },
    );
    if (!clip?.id) {
      throw new Error("Audiospur konnte nicht angelegt werden.");
    }
    return clip;
  }, [enabled, characterId, ensureBackend, effectiveSceneId, text]);

  const cacheAndBind = useCallback(
    async (clip: AudioClip) => {
      if (!enabled) throw new Error("Audio-Bindung nicht aktiviert.");
      if (!projectId || !clip.id) {
        throw new Error("Clip konnte nicht erstellt werden.");
      }
      addClipToAudioTimelineCache(queryClient, projectId, clip);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.audioByProject(projectId),
      });
      if (!onBindAudioClip) {
        throw new Error("Audio-Bindung nicht aktiviert.");
      }
      await onBindAudioClip(lineId, clip.id);
    },
    [enabled, lineId, projectId, queryClient, onBindAudioClip],
  );

  const syncClipIfProject = useCallback(async () => {
    if (!projectId) return;
    try {
      await syncClipWithSelectedTake(projectId, lineId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[MVE] Take-Clip-Sync fehlgeschlagen:", err);
      toast.warning(`Take-Clip-Sync fehlgeschlagen: ${msg}`);
    }
  }, [projectId, lineId]);

  const uploadAudioBlob = useCallback(
    async (blob: Blob) => {
      const clip = await createClipShell();
      const persisted = await persistClipAudioFile(
        new File([blob], `record-${Date.now()}.webm`, { type: blob.type }),
      );
      const updated = await updateClip(clip.id, {
        audioFileId: persisted.storagePath,
        startSec: 0,
        endSec: persisted.durationSec,
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
