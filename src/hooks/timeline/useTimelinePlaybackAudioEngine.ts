/**
 * Audio clip playback synced to timeline playhead (Epic T55).
 */

import { useCallback, useRef } from "react";
import { resolveClipPlaybackUrl } from "@/lib/local-project-audio";
import type { AudioClip } from "@/lib/types";
import type {
  PlaybackContext,
  TimelinePlaybackStrategy,
} from "./timeline-playback-types";

function clipCoversTime(clip: AudioClip, t: number): boolean {
  return t >= clip.startSec && t < clip.endSec;
}

export function findActiveAudioClips(
  clips: AudioClip[],
  timeSec: number,
): AudioClip[] {
  return clips.filter((c) => clipCoversTime(c, timeSec));
}

export function clipLocalOffsetSec(clip: AudioClip, timeSec: number): number {
  return Math.max(0, timeSec - clip.startSec);
}

export function useTimelinePlaybackAudioEngine() {
  const playersRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const activeClipIdsRef = useRef<Set<string>>(new Set());

  const stopAll = useCallback(() => {
    for (const audio of playersRef.current.values()) {
      audio.pause();
    }
    activeClipIdsRef.current.clear();
  }, []);

  const syncClipsAtTime = useCallback(
    async (clips: AudioClip[], timeSec: number) => {
      const active = findActiveAudioClips(clips, timeSec);
      const activeIds = new Set(active.map((c) => c.id));

      for (const id of activeClipIdsRef.current) {
        if (!activeIds.has(id)) {
          playersRef.current.get(id)?.pause();
          activeClipIdsRef.current.delete(id);
        }
      }

      for (const clip of active) {
        if (!clip.audioFileId) continue;
        let audio = playersRef.current.get(clip.id);
        if (!audio) {
          const url = await resolveClipPlaybackUrl(clip.audioFileId);
          if (!url) continue;
          audio = new Audio(url);
          playersRef.current.set(clip.id, audio);
        }

        const offset = clipLocalOffsetSec(clip, timeSec);
        if (Math.abs(audio.currentTime - offset) > 0.15) {
          audio.currentTime = offset;
        }
        if (audio.paused) {
          void audio.play().catch(() => undefined);
        }
        activeClipIdsRef.current.add(clip.id);
      }
    },
    [],
  );

  const audioStrategy: TimelinePlaybackStrategy = {
    onPlay(ctx) {
      void syncClipsAtTime(ctx.audioClips, ctx.currentTimeSec);
      return true;
    },
    onPause() {
      stopAll();
    },
    onTick(ctx, displayTimeSec) {
      void syncClipsAtTime(ctx.audioClips, displayTimeSec);
    },
    onSeek(ctx, timeSec) {
      stopAll();
      if (timeSec <= 0) {
        return;
      }
      void syncClipsAtTime(ctx.audioClips, timeSec);
    },
  };

  return { audioStrategy, stopAll, syncClipsAtTime };
}
