/**
 * Shared playback types for Structure Timeline (Epic T55).
 */

import type { AudioClip } from "@/lib/types";

export interface TimelineSceneBlock {
  id: string;
  title?: string;
  startSec: number;
  endSec: number;
  content?: unknown;
}

export interface PlaybackContext {
  currentTimeSec: number;
  durationSec: number;
  sceneBlocks: TimelineSceneBlock[];
  audioClips: AudioClip[];
  readingSpeedWpm: number;
}

export interface TimelinePlaybackStrategy {
  onPlay(ctx: PlaybackContext): boolean;
  onPause(ctx: PlaybackContext): void;
  onTick?(ctx: PlaybackContext, displayTimeSec: number): void;
  onSeek?(ctx: PlaybackContext, timeSec: number): void;
}

export interface BookPlaybackState {
  currentWordIndex: number;
  currentSceneId: string | null;
  wordsArray: string[];
}
