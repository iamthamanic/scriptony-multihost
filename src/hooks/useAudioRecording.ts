/**
 * useAudioRecording — handles audio recording from browser microphone.
 * Extracted from useTimelineAddAudio.ts to respect the 300-line file limit (KISS/SOLID).
 */

import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import type { MetronomeConfig } from "@/lib/audio/metronome-config";
import { playMetronomeCountIn } from "@/lib/audio/metronome-count-in";

export interface UseAudioRecordingOptions {
  onRecordComplete: (file: File, laneIndex: number, startSec: number) => void;
  metronomeConfig?: MetronomeConfig | null;
}

export function useAudioRecording({
  onRecordComplete,
  metronomeConfig,
}: UseAudioRecordingOptions) {
  const [recordingLane, setRecordingLane] = useState<number | null>(null);
  const [countInLane, setCountInLane] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const countInAbortRef = useRef<AbortController | null>(null);

  const cancelCountIn = useCallback(() => {
    countInAbortRef.current?.abort();
    countInAbortRef.current = null;
    setCountInLane(null);
  }, []);

  const stopRecording = useCallback(async () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;
    rec.stop();
    setRecordingLane(null);
  }, []);

  const beginMediaRecorder = useCallback(
    async (laneIndex: number, startSec: number) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Mikrofon wird in diesem Browser nicht unterstützt.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const rec = new MediaRecorder(stream);
        recordChunksRef.current = [];
        mediaRecorderRef.current = rec;
        setRecordingLane(laneIndex);

        rec.ondataavailable = (ev) => {
          if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
        };

        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(recordChunksRef.current, {
            type: rec.mimeType || "audio/webm",
          });
          const file = new File([blob], `aufnahme-${Date.now()}.webm`, {
            type: blob.type,
          });
          onRecordComplete(file, laneIndex, startSec);
        };

        rec.start();
        toast.info("Aufnahme läuft — erneut R klicken zum Stoppen.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Mikrofon-Zugriff verweigert",
        );
      }
    },
    [onRecordComplete],
  );

  const startRecording = useCallback(
    async (laneIndex: number, startSec: number) => {
      if (recordingLane !== null) {
        await stopRecording();
        return;
      }
      if (countInLane !== null) return;

      if (metronomeConfig?.enabled) {
        const controller = new AbortController();
        countInAbortRef.current = controller;
        setCountInLane(laneIndex);
        toast.info("Count-in — erneut R zum Abbrechen.");
        try {
          await playMetronomeCountIn(metronomeConfig, controller.signal);
        } catch {
          cancelCountIn();
          toast.message("Count-in abgebrochen.");
          return;
        } finally {
          countInAbortRef.current = null;
          setCountInLane(null);
        }
      }

      await beginMediaRecorder(laneIndex, startSec);
    },
    [
      recordingLane,
      countInLane,
      metronomeConfig,
      stopRecording,
      beginMediaRecorder,
      cancelCountIn,
    ],
  );

  const toggleRecord = useCallback(
    (laneIndex: number, startSec: number) => {
      if (countInLane === laneIndex) {
        cancelCountIn();
        toast.message("Count-in abgebrochen.");
        return;
      }
      if (countInLane !== null) return;
      if (recordingLane === laneIndex) {
        void stopRecording();
      } else {
        void startRecording(laneIndex, startSec);
      }
    },
    [recordingLane, countInLane, startRecording, stopRecording, cancelCountIn],
  );

  return {
    recordingLane,
    countInLane,
    startRecording,
    stopRecording,
    toggleRecord,
    cancelCountIn,
  };
}
