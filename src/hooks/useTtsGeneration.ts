/**
 * Hook für TTS-Generierung mit Job-Status-Polling.
 *
 * T31: TTS-Pipeline und Audio-Generierung.
 * - startTts: Erstellt TTS-Job
 * - useTtsJobStatus: Pollt Job-Status (2s Intervall via setTimeout-Chain)
 * - Automatisches Clip-Refresh nach Abschluss
 *
 * Security: setTimeout-Chain statt setInterval verhindert überlappende
 * Requests, wenn getTtsStatus länger als POLL_INTERVAL_MS dauert.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createTtsJob, getTtsStatus } from "../lib/api/audio-tts-api";
import { queryKeys } from "../lib/react-query";
import type { TtsJobPayload, TtsJobStatus } from "../lib/api/audio-tts-api";
import { isFeatureEnabled } from "../lib/feature-flags";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_TIME_MS = 300_000; // 5 Minuten Timeout

export interface UseTtsGenerationOptions {
  sceneId?: string;
  onSuccess?: () => void;
}

/** Invalidiert Audio-Queries für die gegebene sceneId. */
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
  // T31: Bei leerer sceneId alle Audio-Queries invalidieren,
  //   da ClipAudioTimeline mehrere Szenen abdeckt.
  if (!effectiveSceneId) {
    queryClient.invalidateQueries({
      queryKey: ["audio"],
    });
  }
}

export function useTtsGeneration({
  sceneId,
  onSuccess,
}: UseTtsGenerationOptions) {
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
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

  /**
   * Startet die TTS-Generierung.
   */
  const startTts = useCallback(
    async (payload: TtsJobPayload, sceneIdOverride?: string) => {
      if (!isFeatureEnabled("audioClipSystem")) {
        toast.info("TTS-Pipeline ist noch nicht aktiviert.");
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

        // Start setTimeout-Chain (kein setInterval — verhindert Überlappungen)
        const poll = async () => {
          // Guard: cancel oder anderes Job
          if (cancelledRef.current || jobIdRef.current !== response.jobId) {
            return;
          }

          // Timeout check
          if (Date.now() - startTimeRef.current > MAX_POLL_TIME_MS) {
            setJobStatus("failed");
            setActiveJobId(null);
            jobIdRef.current = null;
            setError("TTS-Generierung hat das Zeitlimit überschritten.");
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
              return; // Terminal — keine weitere Chain
            } else if (status.status === "failed") {
              setJobStatus("failed");
              setError(status.error || "TTS-Generierung fehlgeschlagen.");
              setActiveJobId(null);
              jobIdRef.current = null;
              toast.error(
                `TTS fehlgeschlagen: ${status.error || "Unbekannter Fehler"}`,
              );
              return; // Terminal
            } else if (status.status === "cancelled") {
              setJobStatus("failed");
              setError("TTS-Generierung wurde abgebrochen.");
              setActiveJobId(null);
              jobIdRef.current = null;
              toast.info("TTS-Generierung abgebrochen.");
              return; // Terminal
            } else if (status.status === "processing") {
              setJobStatus("processing");
            }
            // pending/queued: weiter pollen
          } catch (pollErr: unknown) {
            if (cancelledRef.current) return;
            const pollError = pollErr as {
              status?: number;
              message?: string;
            };
            console.warn("[useTtsGeneration] Poll failed:", pollErr);
            // 404/401 = terminal
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
              return; // Terminal
            }
            // Transient error: nächste Chain starten
          }

          // Nächster Tick — nur wenn nicht terminal oder abgebrochen
          if (!cancelledRef.current) {
            pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
          }
        };

        // Erster Tick nach kurzem Delay
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

  /**
   * Stoppt nur das Frontend-Polling; der Backend-Job laeuft weiter.
   * Kein echter Cancel — Backend-Cancel ist nicht implementiert (T31).
   */
  const stopPolling = useCallback(() => {
    cancelledRef.current = true;
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    setActiveJobId(null);
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
    jobStatus,
    progress,
    error,
    isGenerating: jobStatus === "queued" || jobStatus === "processing",
  };
}
