/**
 * Hook fuer TTS-Generierung — Cloud und Lokal.
 *
 * T31: TTS-Pipeline und Audio-Generierung.
 * - startTts: Erstellt TTS-Job (Cloud) oder ruft Voicebox (Lokal)
 * - startLocalTts: Direkte Voicebox-Synthese ohne Job-Queue
 * - useTtsJobStatus: Pollt Cloud-Job-Status (2s Intervall)
 *
 * Security: setTimeout-Chain statt setInterval verhindert ueberlappende
 * Requests, wenn getTtsStatus laenger als POLL_INTERVAL_MS dauert.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createTtsJob, getTtsStatus } from "../lib/api/audio-tts-api";
import {
  ensureVoiceboxAvailable,
  generateVoiceboxSpeech,
  isVoiceboxHealthy,
} from "../lib/api/voicebox-api";
import { queryKeys } from "../lib/react-query";
import type { TtsJobPayload, TtsJobStatus } from "../lib/api/audio-tts-api";
import type { LocalTtsPayload } from "../lib/api/voice-entry";
import { isFeatureEnabled } from "../lib/feature-flags";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { requireCapability } from "@/capabilities/registry";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_TIME_MS = 300_000; // 5 Minuten Timeout

export interface UseTtsGenerationOptions {
  projectDir?: string;
  sceneId?: string;
  onSuccess?: () => void;
}

/** Invalidiert Audio-Queries fuer die gegebene sceneId. */
function invalidateAudioQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  effectiveSceneId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.audio.clipsByScene(effectiveSceneId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.audio.tracksByScene(effectiveSceneId),
  });
  if (!effectiveSceneId) {
    queryClient.invalidateQueries({ queryKey: ["audio"] });
  }
}

export function useTtsGeneration({
  projectDir,
  sceneId,
  onSuccess,
}: UseTtsGenerationOptions) {
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [localAudioPath, setLocalAudioPath] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<TtsJobStatus>("idle");
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const jobIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (pollRef.current) {
        clearTimeout(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  // ── Lokale TTS via Voicebox (Kokoro nur intern in Voicebox) ─────────────

  const startLocalTts = useCallback(
    async (payload: LocalTtsPayload, sceneIdOverride?: string) => {
      if (!isFeatureEnabled("audioClipSystem")) {
        toast.info("TTS-Pipeline ist noch nicht aktiviert.");
        return;
      }

      const effectiveSceneId = sceneIdOverride || sceneId || "";
      if (!projectDir) {
        toast.error("Projektverzeichnis erforderlich fuer lokale TTS.");
        return;
      }

      setError(null);
      setJobStatus("processing");
      setProgress(0);
      setLocalAudioPath(null);
      cancelledRef.current = false;

      try {
        await ensureVoiceboxAvailable();
        const healthy = await isVoiceboxHealthy();
        if (!healthy) {
          throw new Error(
            "Lokaler TTS-Dienst ist nicht erreichbar. Scriptony startet ihn automatisch im Hintergrund.",
          );
        }

        toast.info("TTS wird lokal generiert…");
        const vb = await generateVoiceboxSpeech({
          text: payload.text,
          profileId: payload.voice,
          projectDir,
        });
        if (cancelledRef.current) return;
        const result = {
          audioPath: vb.audioPath,
          duration: vb.durationMs != null ? vb.durationMs / 1000 : undefined,
        };

        setLocalAudioPath(result.audioPath);
        setProgress(100);
        setJobStatus("completed");
        invalidateAudioQueries(queryClient, effectiveSceneId);
        toast.success("TTS erfolgreich generiert!");
        onSuccess?.();
      } catch (err) {
        if (cancelledRef.current) return;
        console.error("[useTtsGeneration] Local TTS failed:", err);
        const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
        setError(msg);
        setJobStatus("failed");
        toast.error(`Lokale TTS fehlgeschlagen: ${msg}`);
      }
    },
    [projectDir, sceneId, onSuccess, queryClient],
  );

  // ── Cloud TTS via Appwrite Functions (bestehender Code) ────────────────

  const startCloudTts = useCallback(
    async (payload: TtsJobPayload, sceneIdOverride?: string) => {
      if (!isFeatureEnabled("audioClipSystem")) {
        toast.info("TTS-Pipeline ist noch nicht aktiviert.");
        return;
      }
      try {
        await requireCapability("hybrid.tts");
      } catch (capErr) {
        const msg =
          capErr instanceof Error
            ? capErr.message
            : "TTS benötigt Cloud-Anmeldung (Kopfleiste → Cloud-Login).";
        toast.info(msg);
        return;
      }

      const effectiveSceneId = sceneIdOverride || sceneId || "";

      // Cleanup existing poll
      cancelledRef.current = true;
      if (pollRef.current) {
        clearTimeout(pollRef.current);
        pollRef.current = null;
      }

      setError(null);
      setJobStatus("queued");
      setProgress(0);
      setLocalAudioPath(null);
      startTimeRef.current = Date.now();
      jobIdRef.current = null;
      cancelledRef.current = false;

      try {
        const response = await createTtsJob(payload);
        setActiveJobId(response.jobId);
        jobIdRef.current = response.jobId;
        toast.info("TTS wird generiert…");

        // Sofortiger Erst-Check, dann setTimeout-Chain
        try {
          const initialStatus = await getTtsStatus(response.jobId);
          if (cancelledRef.current) return;
          if (initialStatus.status === "completed") {
            setJobStatus("completed");
            setActiveJobId(null);
            jobIdRef.current = null;
            invalidateAudioQueries(queryClient, effectiveSceneId);
            toast.success("TTS erfolgreich generiert!");
            onSuccess?.();
            return;
          } else if (initialStatus.status === "failed") {
            setJobStatus("failed");
            setError(initialStatus.error || "TTS-Generierung fehlgeschlagen.");
            setActiveJobId(null);
            jobIdRef.current = null;
            toast.error(
              `TTS fehlgeschlagen: ${initialStatus.error || "Unbekannter Fehler"}`,
            );
            return;
          }
        } catch (initialErr: unknown) {
          console.warn(
            "[useTtsGeneration] Initial status check failed:",
            initialErr,
          );
        }

        // setTimeout-Chain Polling
        const poll = async () => {
          if (cancelledRef.current || jobIdRef.current !== response.jobId) {
            return;
          }

          if (Date.now() - startTimeRef.current > MAX_POLL_TIME_MS) {
            setJobStatus("failed");
            setActiveJobId(null);
            jobIdRef.current = null;
            setError("TTS-Generierung hat das Zeitlimit ueberschritten.");
            toast.error("TTS-Generierung ist abgelaufen.");
            return;
          }

          try {
            const status = await getTtsStatus(response.jobId);
            if (cancelledRef.current) return;
            setProgress(status.progress);

            if (status.status === "completed") {
              setJobStatus("completed");
              setActiveJobId(null);
              jobIdRef.current = null;
              invalidateAudioQueries(queryClient, effectiveSceneId);
              toast.success("TTS erfolgreich generiert!");
              onSuccess?.();
              return;
            } else if (status.status === "failed") {
              setJobStatus("failed");
              setError(status.error || "TTS-Generierung fehlgeschlagen.");
              setActiveJobId(null);
              jobIdRef.current = null;
              toast.error(
                `TTS fehlgeschlagen: ${status.error || "Unbekannter Fehler"}`,
              );
              return;
            } else if (status.status === "cancelled") {
              setJobStatus("failed");
              setError("TTS-Generierung wurde abgebrochen.");
              setActiveJobId(null);
              jobIdRef.current = null;
              toast.info("TTS-Generierung abgebrochen.");
              return;
            } else if (status.status === "processing") {
              setJobStatus("processing");
            }
          } catch (pollErr: unknown) {
            if (cancelledRef.current) return;
            const pollError = pollErr as {
              status?: number;
              message?: string;
            };
            console.warn("[useTtsGeneration] Poll failed:", pollErr);
            if (pollError.status === 404 || pollError.status === 401) {
              setJobStatus("failed");
              setError(
                pollError.status === 404
                  ? "TTS-Job nicht gefunden."
                  : "TTS-Job Zugriff verweigert.",
              );
              setActiveJobId(null);
              jobIdRef.current = null;
              toast.error(
                pollError.status === 404
                  ? "TTS-Job nicht gefunden."
                  : "TTS-Job Zugriff verweigert.",
              );
              return;
            }
          }

          if (!cancelledRef.current) {
            pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
          }
        };

        pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        console.error("[useTtsGeneration] Start failed:", err);
        setJobStatus("failed");
        const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
        setError(msg);
        setActiveJobId(null);
        jobIdRef.current = null;
        toast.error(`TTS-Job konnte nicht gestartet werden: ${msg}`);
      }
    },
    [sceneId, onSuccess, queryClient],
  );

  // Unified entry point: route to local or cloud
  const startTts = useCallback(
    async (payload: TtsJobPayload, sceneIdOverride?: string) => {
      if (isLocalProfile()) {
        // Local mode: Voicebox (Kokoro presets run inside Voicebox)
        await startLocalTts(
          {
            text: payload.text,
            voice: payload.voiceId,
            speed: payload.speed ?? 1.0,
            format: "wav",
          },
          sceneIdOverride,
        );
      } else {
        // Cloud mode: use Appwrite Functions
        await startCloudTts(payload, sceneIdOverride);
      }
    },
    [startLocalTts, startCloudTts],
  );

  /**
   * Stoppt das Frontend-Polling / setzt State zurueck.
   */
  const stopPolling = useCallback(() => {
    cancelledRef.current = true;
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    setActiveJobId(null);
    setLocalAudioPath(null);
    jobIdRef.current = null;
    setJobStatus("idle");
    setProgress(undefined);
    setError(null);
  }, []);

  /**
   * Retry eines fehlgeschlagenen Jobs.
   */
  const retryTts = useCallback(
    async (payload: TtsJobPayload) => {
      stopPolling();
      await startTts(payload);
    },
    [startTts, stopPolling],
  );

  return {
    startTts,
    stopPolling,
    retryTts,
    activeJobId,
    localAudioPath,
    jobStatus,
    progress,
    error,
    isGenerating: jobStatus === "queued" || jobStatus === "processing",
  };
}
