/**
 * Width tiers and labels for inline MVE dialog clips on the timeline.
 * Location: src/lib/mve/mve-dialog-clip-layout.ts
 */

import { MVE_TEXT_BLOCK_MIN_WIDTH_PX } from "@/lib/audio-lane";
import type { MveEmotion } from "@/lib/multi-voice-engine/schema/enums";

export type MveDialogClipLayoutTier = "compact" | "medium" | "full";

export interface MveDialogClipSceneBounds {
  startSec: number;
  endSec: number;
}

const EMOTION_LABELS: Partial<Record<MveEmotion, string>> = {
  neutral: "neutral",
  warm: "warm",
  friendly: "freundlich",
  confident: "selbstbewusst",
  calm: "ruhig",
  serious: "sachlich",
  tense: "angespannt",
  excited: "begeistert",
  dramatic: "dramatisch",
  whispered: "geflüstert",
};

export function mveDialogClipLayoutTier(
  widthPx: number,
): MveDialogClipLayoutTier {
  if (widthPx < 120) return "compact";
  if (widthPx < 280) return "medium";
  return "full";
}

export function mveEmotionDisplayLabel(emotion?: MveEmotion): string | null {
  if (!emotion) return null;
  return EMOTION_LABELS[emotion] ?? emotion;
}

/** Pixel width capped to assigned scene bounds (WPM/default must not exceed parent scene). */
export function resolveMveDialogClipWidthPx(
  startSec: number,
  endSec: number,
  pxPerSec: number,
  sceneBlock?: MveDialogClipSceneBounds | null,
): number {
  let cappedStart = startSec;
  let cappedEnd = endSec;
  if (sceneBlock) {
    cappedStart = Math.max(startSec, sceneBlock.startSec);
    cappedEnd = Math.min(endSec, sceneBlock.endSec);
  }
  const widthSec = Math.max(cappedEnd - cappedStart, 0.1);
  const sceneWidthPx = sceneBlock
    ? Math.max((sceneBlock.endSec - sceneBlock.startSec) * pxPerSec, 4)
    : widthSec * pxPerSec;
  const durationPx = widthSec * pxPerSec;
  const minPx = Math.min(MVE_TEXT_BLOCK_MIN_WIDTH_PX, sceneWidthPx);
  return Math.min(Math.max(durationPx, minPx), sceneWidthPx);
}
