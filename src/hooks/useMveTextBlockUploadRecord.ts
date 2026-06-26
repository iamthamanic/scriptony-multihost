/**
 * React hook — upload and record flow for an MVE text block (T28).
 * Handles persisting the audio file and binding it to the MveLine.
 *
 * Location: src/hooks/useMveTextBlockUploadRecord.ts
 */

import { useCallback } from "react";
import { toast } from "sonner";
import { updateClip } from "@/lib/api-adapter/clips-adapter";
import { persistClipAudioFile } from "@/lib/local-project-audio";
import type { AudioClip } from "@/lib/types";
import type {
  MveAudioAction,
  MveSceneSelectionState,
} from "./useMveSceneSelection";

export interface UseMveTextBlockUploadRecordOptions {
  enabled: boolean;
  projectId: string | undefined;
  effectiveSceneId: string | null;
  createClipShell: () => Promise<AudioClip>;
  cacheAndBind: (clip: AudioClip) => Promise<void>;
  syncClipIfProject: () => Promise<void>;
  sceneSelection: Pick<
    MveSceneSelectionState,
    "queueFile" | "requestSceneForAction" | "queuedFile" | "cancel"
  >;
  setIsUploading: (value: boolean) => void;
}

export interface UseMveTextBlockUploadRecordResult {
  uploadFile: (file: File) => Promise<void>;
}

export function useMveTextBlockUploadRecord({
  enabled,
  projectId,
  effectiveSceneId,
  createClipShell,
  cacheAndBind,
  syncClipIfProject,
  sceneSelection,
  setIsUploading,
}: UseMveTextBlockUploadRecordOptions): UseMveTextBlockUploadRecordResult {
  const requestScene = useCallback(
    (action: MveAudioAction, file: File | null) => {
      if (file) sceneSelection.queueFile(file);
      sceneSelection.requestSceneForAction(action);
    },
    [sceneSelection],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!enabled) return;
      if (!projectId) {
        toast.info("Upload nur in geöffneten lokalen Projekten.");
        return;
      }
      if (!effectiveSceneId) {
        requestScene("upload", file);
        return;
      }
      setIsUploading(true);
      try {
        const clip = await createClipShell();
        const persisted = await persistClipAudioFile(file);
        const updated = await updateClip(clip.id, {
          audioFileId: persisted.storagePath,
          startSec: 0,
          endSec: persisted.durationSec,
        });
        await cacheAndBind(updated);
        await syncClipIfProject();
        toast.success("Audio hochgeladen und verknüpft.");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Upload fehlgeschlagen.";
        toast.error(msg);
      } finally {
        setIsUploading(false);
      }
    },
    [
      enabled,
      projectId,
      effectiveSceneId,
      createClipShell,
      cacheAndBind,
      syncClipIfProject,
      setIsUploading,
      requestScene,
    ],
  );

  return { uploadFile };
}
