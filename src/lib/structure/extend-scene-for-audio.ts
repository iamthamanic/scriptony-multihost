/**
 * Extend a scene (and parents / following scenes) when audio exceeds scene length (T29).
 * Uses hierarchical structure ripple + clip ripple for local desktop projects.
 *
 * Location: src/lib/structure/extend-scene-for-audio.ts
 */

import { resizeSceneForContent } from "./resize-scene-for-content";

export interface ExtendSceneForAudioInput {
  projectId: string;
  sceneId: string;
  clipId: string;
  clipEndSec: number;
}

export interface ExtendSceneForAudioResult {
  deltaSec: number;
  extended: boolean;
}

/** Pure: seconds the scene must grow to fit requiredEndSec (0 if already fits). */
export function computeSceneExtendDelta(
  currentSceneEndSec: number,
  requiredEndSec: number,
): number {
  return Math.max(0, requiredEndSec - currentSceneEndSec);
}

export async function extendSceneForAudio(
  input: ExtendSceneForAudioInput,
): Promise<ExtendSceneForAudioResult> {
  const { projectId, sceneId, clipId, clipEndSec } = input;

  const { deltaSec, resized } = await resizeSceneForContent({
    projectId,
    sceneId,
    requiredEndSec: clipEndSec,
    clipId,
  });

  return {
    deltaSec: Math.max(0, deltaSec),
    extended: resized && deltaSec > 0,
  };
}
