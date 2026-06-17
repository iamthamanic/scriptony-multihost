/**
 * Optimistic React Query updates for timeline.audioByProject (DAW lane visibility).
 * Location: src/lib/audio-timeline-cache.ts
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./react-query";
import type { AudioTimelineData } from "./types/audio-timeline";
import type { AudioClip } from "./types";

function sortSceneClips(clips: AudioClip[]): AudioClip[] {
  return [...clips].sort(
    (a, b) =>
      (a.laneIndex ?? 0) - (b.laneIndex ?? 0) ||
      (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );
}

/** Insert a new clip so lanes appear immediately after create. */
export function addClipToAudioTimelineCache(
  queryClient: QueryClient,
  projectId: string,
  clip: AudioClip,
): void {
  queryClient.setQueryData<AudioTimelineData>(
    queryKeys.timeline.audioByProject(projectId),
    (old) => {
      const sceneId = clip.sceneId;
      if (!old) {
        return {
          acts: [],
          sequences: [],
          scenes: [],
          tracksByScene: {},
          clipsByScene: { [sceneId]: [clip] },
          voiceAssignments: {},
        };
      }
      const existing = old.clipsByScene[sceneId] ?? [];
      if (existing.some((c) => c.id === clip.id)) return old;
      return {
        ...old,
        clipsByScene: {
          ...old.clipsByScene,
          [sceneId]: sortSceneClips([...existing, clip]),
        },
      };
    },
  );
}

/** Drop deleted clips so empty lanes vanish immediately. */
export function removeClipsFromAudioTimelineCache(
  queryClient: QueryClient,
  projectId: string,
  clipIds: ReadonlySet<string>,
): void {
  if (clipIds.size === 0) return;
  queryClient.setQueryData<AudioTimelineData>(
    queryKeys.timeline.audioByProject(projectId),
    (old) => {
      if (!old?.clipsByScene) return old;
      const clipsByScene: Record<string, AudioClip[]> = {};
      let changed = false;
      for (const [sceneId, clips] of Object.entries(old.clipsByScene)) {
        const next = clips.filter((clip) => !clipIds.has(clip.id));
        if (next.length !== clips.length) changed = true;
        if (next.length > 0) clipsByScene[sceneId] = next;
      }
      if (!changed) return old;
      return { ...old, clipsByScene };
    },
  );
}
