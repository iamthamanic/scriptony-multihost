/**
 * React hook — audio derivation actions for an MVE text block (T28).
 * Coordinates Generate (MVE render + first-take selection), Upload,
 * and Record, then binds the resulting AudioClip to the MveLine.
 *
 * Location: src/hooks/useMveTextBlockAudio.ts
 */

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMveLineRender } from "./useMveLineRender";
import { useAudioRecording } from "./useAudioRecording";
import { useMetronomeSettings } from "./useMetronomeSettings";
import {
  useMveSceneSelection,
  type MveAudioAction,
} from "./useMveSceneSelection";
import { useMveTextBlockAudioClip } from "./useMveTextBlockAudioClip";
import { useMveTextBlockUploadRecord } from "./useMveTextBlockUploadRecord";

export interface MveSceneOption {
  id: string;
  name: string;
}

export interface UseMveTextBlockAudioOptions {
  projectId: string | undefined;
  lineId: string;
  characterId: string | undefined;
  sceneId: string | undefined;
  scenes: MveSceneOption[];
  text: string;
  onBindAudioClip?: (lineId: string, clipId: string | null) => Promise<void>;
}

export interface MveTextBlockAudioState {
  isGenerating: boolean;
  isRecording: boolean;
  isUploading: boolean;
  pendingAction: MveAudioAction | null;
  selectedSceneId: string | null;
  queuedFile: File | null;
  generate: () => Promise<void>;
  startRecord: () => void;
  stopRecord: () => void;
  uploadFile: (file: File) => Promise<void>;
  requestSceneForAction: (action: MveAudioAction) => void;
  setSelectedSceneId: (id: string | null) => void;
  cancelSceneSelection: () => void;
  confirmSceneSelection: () => void;
}

export function useMveTextBlockAudio({
  projectId,
  lineId,
  characterId,
  sceneId,
  scenes,
  text,
  onBindAudioClip,
}: UseMveTextBlockAudioOptions): MveTextBlockAudioState {
  const enabled = Boolean(onBindAudioClip);
  const { renderLine } = useMveLineRender(enabled ? projectId : undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const sceneSelection = useMveSceneSelection({ initialSceneId: sceneId });
  const effectiveSceneId = sceneSelection.selectedSceneId ?? sceneId ?? null;
  const metronome = useMetronomeSettings(projectId);

  const { createClipShell, cacheAndBind, syncClipIfProject, uploadAudioBlob } =
    useMveTextBlockAudioClip({
      enabled,
      projectId,
      lineId,
      characterId,
      effectiveSceneId,
      text,
      onBindAudioClip,
    });

  const { recordingLane, countInLane, startRecording, stopRecording } =
    useAudioRecording({
      metronomeConfig: metronome.config,
      onRecordComplete: async (file) => {
        try {
          await uploadAudioBlob(file);
          toast.success("Aufnahme gespeichert und verknüpft.");
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Aufnahme fehlgeschlagen.";
          toast.error(msg);
        }
      },
    });

  const { uploadFile } = useMveTextBlockUploadRecord({
    enabled,
    projectId,
    effectiveSceneId,
    createClipShell,
    cacheAndBind,
    syncClipIfProject,
    sceneSelection,
    setIsUploading,
  });

  const generate = useCallback(async () => {
    if (!enabled) return;
    if (!projectId) {
      toast.info("Audio-Generierung nur in geöffneten lokalen Projekten.");
      return;
    }
    if (!characterId) {
      toast.error("Kein Charakter für diese Lane gefunden.");
      return;
    }
    if (!effectiveSceneId) {
      sceneSelection.requestSceneForAction("generate");
      return;
    }
    setIsGenerating(true);
    try {
      await renderLine(lineId, 1);
      const clip = await createClipShell();
      await cacheAndBind(clip);
      await syncClipIfProject();
      toast.success("Audio generiert und verknüpft.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Generierung fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [
    enabled,
    projectId,
    characterId,
    effectiveSceneId,
    renderLine,
    lineId,
    createClipShell,
    cacheAndBind,
    syncClipIfProject,
    sceneSelection,
  ]);

  const startRecord = useCallback(() => {
    if (!enabled) return;
    if (!projectId) {
      toast.info("Aufnahme nur in geöffneten lokalen Projekten.");
      return;
    }
    if (!effectiveSceneId) {
      sceneSelection.requestSceneForAction("record");
      return;
    }
    void startRecording(0, 0);
  }, [enabled, projectId, effectiveSceneId, startRecording, sceneSelection]);

  const stopRecord = useCallback(() => {
    void stopRecording();
  }, [stopRecording]);

  const confirmSceneSelection = useCallback(() => {
    if (!enabled) return;
    const action = sceneSelection.confirm();
    if (!action || !effectiveSceneId) return;
    if (action === "generate") {
      void generate();
    } else if (action === "record") {
      void startRecord();
    } else if (action === "upload") {
      const file = sceneSelection.queuedFile;
      sceneSelection.cancel();
      if (file) void uploadFile(file);
    }
  }, [
    enabled,
    effectiveSceneId,
    generate,
    startRecord,
    uploadFile,
    sceneSelection,
  ]);

  return {
    isGenerating,
    isRecording: recordingLane !== null || countInLane !== null,
    isUploading,
    pendingAction: sceneSelection.pendingAction,
    selectedSceneId: sceneSelection.selectedSceneId,
    queuedFile: sceneSelection.queuedFile,
    generate,
    startRecord,
    stopRecord,
    uploadFile,
    requestSceneForAction: sceneSelection.requestSceneForAction,
    setSelectedSceneId: sceneSelection.setSelectedSceneId,
    cancelSceneSelection: sceneSelection.cancel,
    confirmSceneSelection,
  };
}
