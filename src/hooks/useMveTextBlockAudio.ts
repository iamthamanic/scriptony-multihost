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
  projectType?: string;
  lineId: string;
  characterId: string | undefined;
  sceneId: string | undefined;
  scenes: MveSceneOption[];
  text: string;
  timelineStartSec?: number;
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
  confirmSceneSelection: (pickedSceneId?: string) => void;
}

export function useMveTextBlockAudio({
  projectId,
  projectType,
  lineId,
  characterId,
  sceneId,
  scenes,
  text,
  timelineStartSec,
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
      projectType,
      lineId,
      characterId,
      effectiveSceneId,
      text,
      timelineStartSec,
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

  const runGenerate = useCallback(
    async (activeSceneId: string) => {
      setIsGenerating(true);
      try {
        await renderLine(lineId, 1);
        const clip = await createClipShell(activeSceneId);
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
    },
    [renderLine, lineId, createClipShell, cacheAndBind, syncClipIfProject],
  );

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
    await runGenerate(effectiveSceneId);
  }, [
    enabled,
    projectId,
    characterId,
    effectiveSceneId,
    runGenerate,
    sceneSelection,
  ]);

  const runRecord = useCallback(
    (activeSceneId: string) => {
      if (!activeSceneId) return;
      sceneSelection.setSelectedSceneId(activeSceneId);
      void startRecording(0, 0);
    },
    [startRecording, sceneSelection],
  );

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
    runRecord(effectiveSceneId);
  }, [enabled, projectId, effectiveSceneId, runRecord, sceneSelection]);

  const stopRecord = useCallback(() => {
    void stopRecording();
  }, [stopRecording]);

  const confirmSceneSelection = useCallback(
    (pickedSceneId?: string) => {
      if (!enabled) return;
      const action = sceneSelection.confirm();
      const resolvedSceneId = pickedSceneId ?? effectiveSceneId;
      if (!action || !resolvedSceneId) return;
      if (pickedSceneId) {
        sceneSelection.setSelectedSceneId(pickedSceneId);
      }
      if (action === "generate") {
        void runGenerate(resolvedSceneId);
      } else if (action === "record") {
        runRecord(resolvedSceneId);
      } else if (action === "upload") {
        const file = sceneSelection.queuedFile;
        sceneSelection.cancel();
        if (file) {
          sceneSelection.setSelectedSceneId(resolvedSceneId);
          void uploadFile(file, resolvedSceneId);
        }
      }
    },
    [
      enabled,
      effectiveSceneId,
      runGenerate,
      runRecord,
      uploadFile,
      sceneSelection,
    ],
  );

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
