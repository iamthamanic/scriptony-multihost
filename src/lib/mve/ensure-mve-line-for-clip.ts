/**
 * Ensure an MVE Line exists for a dialog/narrator timeline clip (local only).
 * Location: src/lib/mve/ensure-mve-line-for-clip.ts
 */

import {
  createMveLine,
  getMveLineByAudioClipId,
} from "@/lib/api-adapter/mve-adapter";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { AudioClip } from "@/lib/types";

function isMveDialogClip(clip: AudioClip): boolean {
  const trackType = clip.trackType ?? "dialog";
  return trackType === "dialog" || trackType === "narrator";
}

export interface EnsureMveLineForClipParams {
  projectId: string;
  clip: AudioClip;
  text?: string;
  characterId?: string;
}

/** Create or return existing MVE line bound to an audio clip. */
export async function ensureMveLineForClip(
  params: EnsureMveLineForClipParams,
): Promise<MveLine | null> {
  if (!isLocalProfile() || !isMveDialogClip(params.clip)) {
    return null;
  }

  const existing = await getMveLineByAudioClipId(params.clip.id);
  if (existing) return existing;

  const trackType = params.clip.trackType ?? "dialog";
  return createMveLine(params.projectId, {
    sceneId: params.clip.sceneId,
    audioClipId: params.clip.id,
    characterId: params.characterId ?? params.clip.characterId,
    text: params.text ?? params.clip.content ?? "",
    orderIndex: params.clip.orderIndex ?? 0,
    type: trackType === "narrator" ? "narration" : "dialogue",
  });
}
