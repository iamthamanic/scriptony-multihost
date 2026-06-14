/**
 * useAudioRecording — handles audio recording from browser microphone.
 * Extracted from useTimelineAddAudio.ts to respect the 300-line file limit (KISS/SOLID).
 */

import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";

export interface UseAudioRecordingOptions {
  onRecordComplete: (file: File, laneIndex: number, startSec: number) => void;
}

export function useAudioRecording({
  onRecordComplete,
}: UseAudioRecordingOptions) {
  const [recordingLane, setRecordingLane] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(async () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;
    rec.stop();
    setRecordingLane(null);
  }, []);

  const startRecording = useCallback(
    async (laneIndex: number, startSec: number) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Mikrofon wird in diesem Browser nicht unterstützt.");
        return;
      }
      if (recordingLane !== null) {
        await stopRecording();
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
    [recordingLane, stopRecording, onRecordComplete],
  );

  const toggleRecord = useCallback(
    (laneIndex: number, startSec: number) => {
      if (recordingLane === laneIndex) {
        void stopRecording();
      } else {
        void startRecording(laneIndex, startSec);
      }
    },
    [recordingLane, startRecording, stopRecording],
  );

  return { recordingLane, startRecording, stopRecording, toggleRecord };
}
