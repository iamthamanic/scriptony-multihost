/**
 * Dedup helpers — avoid duplicate MveDialogClipCard when text-only line + orphan clip coexist.
 * Location: src/lib/mve/mve-dialog-clip-dedup.ts
 */

import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { AudioClip } from "@/lib/types";

/** First unbound text-only line in scene for the clip's character (lowest orderIndex). */
export function findBindableTextOnlyLine(
  lines: MveLine[],
  clip: Pick<AudioClip, "sceneId" | "characterId">,
): MveLine | undefined {
  const characterId = clip.characterId;
  if (!characterId || !clip.sceneId) return undefined;

  const candidates = lines.filter(
    (line) =>
      line.sceneId === clip.sceneId &&
      line.characterId === characterId &&
      !line.audioClipId,
  );
  if (candidates.length === 0) return undefined;

  return [...candidates].sort((a, b) => a.orderIndex - b.orderIndex)[0];
}

/**
 * Skip audio-bound MVE dialog segment when an unbound text-only sibling exists
 * for the same character+scene (legacy duplicate data or race before bind).
 */
export function shouldSkipMveDialogClipSegment(
  clip: AudioClip,
  boundLine: MveLine | undefined,
  textOnlyLines: MveLine[],
): boolean {
  if (!boundLine) return false;

  const characterId = clip.characterId ?? boundLine.characterId;
  if (!characterId) return false;

  return textOnlyLines.some(
    (line) =>
      line.sceneId === boundLine.sceneId &&
      line.characterId === characterId &&
      line.id !== boundLine.id,
  );
}
