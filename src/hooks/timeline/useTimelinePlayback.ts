/**
 * Unified play/pause/stop for Structure Timeline by project type (Epic T55 / T61).
 */

import { useCallback, useMemo, type MutableRefObject } from "react";
import { toast } from "sonner";
import { isAudioProjectType } from "@/lib/project-type-audio";
import type { AudioClip } from "@/lib/types";
import type {
  PlaybackContext,
  TimelinePlaybackStrategy,
  TimelineSceneBlock,
} from "./timeline-playback-types";
import { useTimelinePlaybackAudioEngine } from "./useTimelinePlaybackAudioEngine";
import {
  useTimelinePlaybackBookEngine,
  type UseTimelinePlaybackBookEngineOptions,
} from "./useTimelinePlaybackBookEngine";

const filmStrategy: TimelinePlaybackStrategy = {
  onPlay: () => true,
  onPause: () => {},
  onTick: () => {},
  onSeek: () => {},
};

export interface UseTimelinePlaybackOptions extends Omit<
  UseTimelinePlaybackBookEngineOptions,
  "isPlaying" | "setIsPlaying" | "setCurrentTime"
> {
  projectType: string;
  playing: boolean;
  positionSec: number;
  durationSec: number;
  audioClips: AudioClip[];
  sceneBlocks: TimelineSceneBlock[];
  canPlay: boolean;
  canPlayReason: string | null;
  play: () => void;
  pause: () => void;
  transportStop: () => void;
  transportSeek: (timeSec: number) => void;
  reanchorPlaybackClock: () => void;
  playingRef: MutableRefObject<boolean>;
  positionSecRef: MutableRefObject<number>;
}

export function useTimelinePlayback(options: UseTimelinePlaybackOptions) {
  const {
    projectType,
    playing,
    positionSec,
    durationSec,
    audioClips,
    sceneBlocks,
    canPlay,
    canPlayReason,
    play,
    pause,
    transportStop,
    transportSeek,
    reanchorPlaybackClock,
    playingRef,
    positionSecRef,
    ...bookOptions
  } = options;

  const isBookProject = (projectType ?? "").toLowerCase() === "book";
  const isAudioProject = isAudioProjectType(projectType);

  const { audioStrategy } = useTimelinePlaybackAudioEngine();
  const { bookStrategy, bookState, syncBookAtTime, startBookPlayback } =
    useTimelinePlaybackBookEngine({
      ...bookOptions,
      isBookProject,
      positionSecRef,
      transportSeek,
      transportStop,
      reanchorPlaybackClock,
    });

  const strategy = useMemo((): TimelinePlaybackStrategy => {
    if (isBookProject) return bookStrategy;
    if (isAudioProject) return audioStrategy;
    return filmStrategy;
  }, [audioStrategy, bookStrategy, isAudioProject, isBookProject]);

  const buildContext = useCallback(
    (timeSec: number): PlaybackContext => ({
      currentTimeSec: timeSec,
      durationSec,
      sceneBlocks,
      audioClips,
      readingSpeedWpm: bookOptions.readingSpeedWpm,
    }),
    [audioClips, bookOptions.readingSpeedWpm, durationSec, sceneBlocks],
  );

  const toggle = useCallback(() => {
    const transportActive = playingRef.current || playing;
    if (transportActive) {
      strategy.onPause(buildContext(positionSecRef.current));
      pause();
      return;
    }

    if (!canPlay) {
      toast.error(
        canPlayReason ??
          "Wiedergabe nicht möglich — bitte Timeline-Inhalt prüfen.",
      );
      return;
    }

    const ctx = buildContext(positionSecRef.current);
    if (isBookProject) {
      if (!startBookPlayback(positionSecRef.current)) {
        toast.error(
          "Kein abspielbarer Szenentext — bitte Szenen mit Text befüllen.",
        );
        return;
      }
    } else if (!strategy.onPlay(ctx)) {
      toast.error("Wiedergabe konnte nicht gestartet werden.");
      return;
    }

    play();
  }, [
    buildContext,
    canPlay,
    canPlayReason,
    isBookProject,
    pause,
    play,
    playing,
    playingRef,
    positionSecRef,
    startBookPlayback,
    strategy,
  ]);

  const stop = useCallback(() => {
    const ctx = buildContext(positionSecRef.current);
    strategy.onPause(ctx);
    strategy.onSeek?.(ctx, 0);
    transportStop();
    if (isBookProject) {
      syncBookAtTime(0);
    }
  }, [
    buildContext,
    isBookProject,
    positionSecRef,
    strategy,
    syncBookAtTime,
    transportStop,
  ]);

  const onPlayheadTick = useCallback(
    (displayTimeSec: number) => {
      strategy.onTick?.(buildContext(displayTimeSec), displayTimeSec);
    },
    [buildContext, strategy],
  );

  const seek = useCallback(
    (timeSec: number) => {
      strategy.onSeek?.(buildContext(timeSec), timeSec);
      if (isBookProject) {
        syncBookAtTime(timeSec);
      }
    },
    [buildContext, isBookProject, strategy, syncBookAtTime],
  );

  return {
    toggle,
    stop,
    onPlayheadTick,
    seek,
    bookState,
    isBookProject,
    isAudioProject,
  };
}
