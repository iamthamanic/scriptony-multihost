/**
 * Whether timeline transport can start playback (TheStuu-style guard).
 * Location: src/hooks/timeline/resolveTimelineTransportGuard.ts
 */

import { isAudioProjectType } from "@/lib/project-type-audio";
import type { AudioClip } from "@/lib/types";
import { extractWordsFromContent } from "./extractWordsFromContent";
import type { TimelineSceneBlock } from "./timeline-playback-types";

export interface TimelineTransportGuardInput {
  projectType: string;
  sceneBlocks: TimelineSceneBlock[];
  audioClips: AudioClip[];
}

export interface TimelineTransportGuardResult {
  canPlay: boolean;
  reason: string | null;
}

export function resolveTimelineTransportGuard(
  input: TimelineTransportGuardInput,
): TimelineTransportGuardResult {
  const type = (input.projectType ?? "").toLowerCase();

  if (type === "book") {
    const hasText = input.sceneBlocks.some(
      (scene) => extractWordsFromContent(scene.content).length > 0,
    );
    if (!hasText) {
      return {
        canPlay: false,
        reason:
          "Kein abspielbarer Szenentext — bitte Szenen mit Text befüllen.",
      };
    }
    return { canPlay: true, reason: null };
  }

  if (isAudioProjectType(input.projectType)) {
    const hasAudio = input.audioClips.some((clip) => Boolean(clip.audioFileId));
    if (!hasAudio) {
      return {
        canPlay: true,
        reason:
          "Keine Audio-Clips — Wiedergabe startet nur den Playhead (Vorschau).",
      };
    }
    return { canPlay: true, reason: null };
  }

  return { canPlay: true, reason: null };
}
