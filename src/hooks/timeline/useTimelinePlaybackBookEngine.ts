/**
 * Book timeline playback — word index driven by transport onTick (Epic T55 / T61).
 */

import { useCallback, useRef, useState, type RefObject } from "react";
import { extractWordsFromContent } from "./extractWordsFromContent";
import type {
  BookPlaybackState,
  TimelinePlaybackStrategy,
  TimelineSceneBlock,
} from "./timeline-playback-types";

export interface UseTimelinePlaybackBookEngineOptions {
  isBookProject: boolean;
  readingSpeedWpm: number;
  sceneBlocksRef: RefObject<TimelineSceneBlock[]>;
  positionSecRef: RefObject<number>;
  transportSeek: (timeSec: number) => void;
  transportStop: () => void;
  reanchorPlaybackClock: () => void;
}

function findSceneWithText(
  scenes: TimelineSceneBlock[],
  timeSec: number,
): { scene: TimelineSceneBlock; words: string[] } | null {
  let current = scenes.find(
    (s) => timeSec >= s.startSec && timeSec <= s.endSec,
  );
  if (!current) {
    current = scenes.find((s) => s.startSec >= timeSec);
  }
  if (!current && scenes.length > 0) {
    current = scenes[scenes.length - 1];
  }
  if (!current) return null;

  let scene: TimelineSceneBlock | undefined = current;
  const visited = new Set<string>();
  while (scene && !visited.has(scene.id)) {
    visited.add(scene.id);
    const words = extractWordsFromContent(scene.content);
    if (words.length > 0) {
      return { scene, words };
    }
    const idx = scenes.findIndex((s) => s.id === scene!.id);
    scene = idx >= 0 ? scenes[idx + 1] : undefined;
  }
  return null;
}

export function useTimelinePlaybackBookEngine(
  options: UseTimelinePlaybackBookEngineOptions,
) {
  const {
    isBookProject,
    readingSpeedWpm,
    sceneBlocksRef,
    positionSecRef,
    transportSeek,
    transportStop,
  } = options;

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [wordsArray, setWordsArray] = useState<string[]>([]);
  const playbackSceneStartTimeRef = useRef(0);
  const lastTickSceneIdRef = useRef<string | null>(null);

  const syncBookAtTime = useCallback(
    (timeSec: number) => {
      if (!isBookProject) return;
      const found = findSceneWithText(sceneBlocksRef.current ?? [], timeSec);
      if (!found) return;
      const { scene, words } = found;
      const secondsPerWord = 60 / readingSpeedWpm;
      const wordIndex = Math.floor((timeSec - scene.startSec) / secondsPerWord);
      setCurrentSceneId(scene.id);
      setWordsArray(words);
      setCurrentWordIndex(Math.min(Math.max(0, wordIndex), words.length - 1));
      playbackSceneStartTimeRef.current = scene.startSec;
      lastTickSceneIdRef.current = scene.id;
    },
    [isBookProject, readingSpeedWpm, sceneBlocksRef],
  );

  const startBookPlayback = useCallback(
    (currentTimeSec: number): boolean => {
      if (!isBookProject) return true;
      const found = findSceneWithText(
        sceneBlocksRef.current ?? [],
        currentTimeSec,
      );
      if (!found) return false;
      syncBookAtTime(currentTimeSec);
      return true;
    },
    [isBookProject, sceneBlocksRef, syncBookAtTime],
  );

  const handleBookTick = useCallback(
    (displayTimeSec: number) => {
      if (!isBookProject) return;
      const scenes = sceneBlocksRef.current ?? [];
      const found = findSceneWithText(scenes, displayTimeSec);
      if (!found) {
        transportStop();
        setCurrentWordIndex(0);
        setWordsArray([]);
        setCurrentSceneId(null);
        return;
      }

      const { scene, words } = found;
      const secondsPerWord = 60 / readingSpeedWpm;
      const timeIntoScene = displayTimeSec - scene.startSec;
      const wordsElapsed = Math.floor(timeIntoScene / secondsPerWord);

      if (displayTimeSec > scene.endSec + 0.05) {
        const next = scenes.find((s) => s.startSec >= scene.endSec - 0.001);
        if (next) {
          transportSeek(next.startSec);
          syncBookAtTime(next.startSec);
        } else {
          transportStop();
        }
        return;
      }

      if (lastTickSceneIdRef.current !== scene.id) {
        setCurrentSceneId(scene.id);
        setWordsArray(words);
        lastTickSceneIdRef.current = scene.id;
        playbackSceneStartTimeRef.current = scene.startSec;
      }

      if (wordsElapsed >= words.length) {
        const next = scenes.find((s) => s.startSec >= scene.endSec - 0.001);
        if (next) {
          transportSeek(next.startSec);
          syncBookAtTime(next.startSec);
        } else {
          transportStop();
        }
        return;
      }

      setCurrentWordIndex(Math.max(0, wordsElapsed));
    },
    [
      isBookProject,
      readingSpeedWpm,
      sceneBlocksRef,
      syncBookAtTime,
      transportSeek,
      transportStop,
    ],
  );

  const bookStrategy: TimelinePlaybackStrategy = {
    onPlay(ctx) {
      return startBookPlayback(ctx.currentTimeSec);
    },
    onPause() {},
    onTick(_ctx, displayTimeSec) {
      handleBookTick(displayTimeSec);
    },
    onSeek(_ctx, timeSec) {
      syncBookAtTime(timeSec);
    },
  };

  const bookState: BookPlaybackState = {
    currentWordIndex,
    currentSceneId,
    wordsArray,
  };

  return {
    bookStrategy,
    bookState,
    syncBookAtTime,
    startBookPlayback,
    playbackSceneStartTimeRef,
  };
}
