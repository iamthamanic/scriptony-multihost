/**
 * Inline play/pause, stop, and seek for voice design preview candidates.
 * Location: src/hooks/useVoiceDesignCandidatePlayback.ts
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { loadLocalAudioPeaks } from "@/lib/mve/load-local-audio-peaks";

export interface VoiceDesignCandidatePlaybackView {
  peaks: number[];
  durationSec: number;
  currentTimeSec: number;
  isPlaying: boolean;
  isLoading: boolean;
}

const EMPTY_VIEW: VoiceDesignCandidatePlaybackView = {
  peaks: [],
  durationSec: 0,
  currentTimeSec: 0,
  isPlaying: false,
  isLoading: false,
};

function formatView(
  partial: Partial<VoiceDesignCandidatePlaybackView>,
): VoiceDesignCandidatePlaybackView {
  return { ...EMPTY_VIEW, ...partial };
}

export function useVoiceDesignCandidatePlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const peaksCacheRef = useRef(
    new Map<
      string,
      { peaks: number[]; durationSec: number; playbackUrl: string }
    >(),
  );
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(
    null,
  );
  const [views, setViews] = useState<
    Record<string, VoiceDesignCandidatePlaybackView>
  >({});

  const patchView = useCallback(
    (
      candidateId: string,
      partial: Partial<VoiceDesignCandidatePlaybackView>,
    ) => {
      setViews((prev) => ({
        ...prev,
        [candidateId]: formatView({ ...prev[candidateId], ...partial }),
      }));
    },
    [],
  );

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    blobUrlRef.current = null;
    setActiveCandidateId(null);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeCandidateId) return;

    const onTimeUpdate = () => {
      patchView(activeCandidateId, { currentTimeSec: audio.currentTime });
    };
    const onEnded = () => {
      patchView(activeCandidateId, {
        isPlaying: false,
        currentTimeSec: audio.duration || 0,
      });
      releaseAudio();
    };
    const onPause = () => {
      patchView(activeCandidateId, {
        isPlaying: false,
        currentTimeSec: audio.currentTime,
      });
    };
    const onPlay = () => {
      patchView(activeCandidateId, { isPlaying: true });
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [activeCandidateId, patchView, releaseAudio]);

  useEffect(() => () => releaseAudio(), [releaseAudio]);

  const ensureLoaded = useCallback(
    async (candidateId: string, audioPath: string) => {
      const cached = peaksCacheRef.current.get(audioPath);
      if (cached) {
        patchView(candidateId, {
          peaks: cached.peaks,
          durationSec: cached.durationSec,
          isLoading: false,
        });
        return cached;
      }

      patchView(candidateId, { isLoading: true });
      const loaded = await loadLocalAudioPeaks(audioPath);
      peaksCacheRef.current.set(audioPath, loaded);
      patchView(candidateId, {
        peaks: loaded.peaks,
        durationSec: loaded.durationSec,
        isLoading: false,
      });
      return loaded;
    },
    [patchView],
  );

  const togglePlayback = useCallback(
    async (candidateId: string, audioPath: string) => {
      const trimmed = audioPath.trim();
      if (!trimmed) return;

      const currentView = views[candidateId];
      const isActive = activeCandidateId === candidateId;
      const audio = audioRef.current;

      if (isActive && currentView?.isPlaying && audio) {
        audio.pause();
        patchView(candidateId, {
          isPlaying: false,
          currentTimeSec: audio.currentTime,
        });
        return;
      }

      if (isActive && audio && !currentView?.isPlaying) {
        await audio.play();
        patchView(candidateId, { isPlaying: true });
        return;
      }

      releaseAudio();
      patchView(candidateId, { isLoading: true, currentTimeSec: 0 });

      try {
        const loaded = await ensureLoaded(candidateId, trimmed);
        const nextAudio = new Audio(loaded.playbackUrl);
        audioRef.current = nextAudio;
        blobUrlRef.current = loaded.playbackUrl;
        setActiveCandidateId(candidateId);
        patchView(candidateId, {
          durationSec: loaded.durationSec,
          peaks: loaded.peaks,
          isLoading: false,
          isPlaying: true,
          currentTimeSec: 0,
        });
        await nextAudio.play();
      } catch {
        patchView(candidateId, { isLoading: false, isPlaying: false });
        releaseAudio();
        throw new Error("Vorschau konnte nicht abgespielt werden.");
      }
    },
    [activeCandidateId, ensureLoaded, patchView, releaseAudio, views],
  );

  const seek = useCallback(
    async (candidateId: string, audioPath: string, ratio: number) => {
      const trimmed = audioPath.trim();
      if (!trimmed) return;

      const clamped = Math.max(0, Math.min(1, ratio));
      const audio = audioRef.current;
      const isActive = activeCandidateId === candidateId;

      if (!audio || !isActive) {
        try {
          const loaded = await ensureLoaded(candidateId, trimmed);
          if (activeCandidateId && activeCandidateId !== candidateId) {
            releaseAudio();
          }
          const nextAudio = new Audio(loaded.playbackUrl);
          audioRef.current = nextAudio;
          blobUrlRef.current = loaded.playbackUrl;
          setActiveCandidateId(candidateId);
          nextAudio.currentTime = clamped * loaded.durationSec;
          patchView(candidateId, {
            durationSec: loaded.durationSec,
            peaks: loaded.peaks,
            currentTimeSec: nextAudio.currentTime,
            isPlaying: false,
            isLoading: false,
          });
        } catch {
          patchView(candidateId, { isLoading: false });
        }
        return;
      }

      const duration = views[candidateId]?.durationSec || audio.duration || 0;
      if (!duration) return;
      audio.currentTime = clamped * duration;
      patchView(candidateId, {
        currentTimeSec: audio.currentTime,
      });
    },
    [activeCandidateId, ensureLoaded, patchView, releaseAudio, views],
  );

  const stop = useCallback(
    (candidateId?: string) => {
      if (candidateId && activeCandidateId !== candidateId) return;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      if (activeCandidateId) {
        patchView(activeCandidateId, {
          isPlaying: false,
          currentTimeSec: 0,
        });
      }
      releaseAudio();
    },
    [activeCandidateId, patchView, releaseAudio],
  );

  const getView = useCallback(
    (candidateId: string): VoiceDesignCandidatePlaybackView =>
      views[candidateId] ?? EMPTY_VIEW,
    [views],
  );

  return {
    activeCandidateId,
    getView,
    togglePlayback,
    seek,
    stop,
    ensureLoaded,
  };
}
