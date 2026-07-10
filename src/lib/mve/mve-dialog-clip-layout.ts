/**
 * Width tiers and labels for inline MVE dialog clips on the timeline.
 * Location: src/lib/mve/mve-dialog-clip-layout.ts
 */

import { MVE_TEXT_BLOCK_MIN_WIDTH_PX } from "@/lib/audio-lane";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import {
  hasNonEmptyTextInLines,
  resolveMveLineSpan,
  sortLinesInScene,
} from "@/lib/mve/resolve-mve-line-span";
import type { SceneTimeBlock } from "@/lib/mve/resolve-scene-at-timeline-sec";
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

/** Min pixel width for stacked layout (shell grows to fit — do not cap to parent). */
export function resolveMveLineStackWidthPx(
  startSec: number,
  endSec: number,
  pxPerSec: number,
): number {
  const durationPx = Math.max(endSec - startSec, 0.1) * pxPerSec;
  return Math.max(durationPx, MVE_TEXT_BLOCK_MIN_WIDTH_PX);
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
    // No overlap with scene shell — keep clip visible at its stored timing (orphan until sync).
    if (cappedEnd <= cappedStart) {
      cappedStart = startSec;
      cappedEnd = endSec;
    }
  }
  const widthSec = Math.max(cappedEnd - cappedStart, 0.1);
  const sceneWidthPx = sceneBlock
    ? Math.max((sceneBlock.endSec - sceneBlock.startSec) * pxPerSec, 4)
    : widthSec * pxPerSec;
  const durationPx = widthSec * pxPerSec;
  const minPx = Math.min(MVE_TEXT_BLOCK_MIN_WIDTH_PX, sceneWidthPx);
  return Math.min(Math.max(durationPx, minPx), sceneWidthPx);
}

export interface MveLineVisualSpan {
  startSec: number;
  endSec: number;
}

export interface ResolveMveLineVisualSpanMapOptions {
  /** When false, stacked spans may exceed scene end (content-driven resize sizing). */
  capToSceneEnd?: boolean;
}

/** Stack lines left-to-right using rendered width (min-width px), not logical WPM seconds. */
export function resolveMveLineVisualSpanMap(
  lines: MveLine[],
  sceneBlocks: SceneTimeBlock[],
  pxPerSec: number,
  readingSpeedWpm?: number,
  options?: ResolveMveLineVisualSpanMapOptions,
): Map<string, MveLineVisualSpan> {
  const capToSceneEnd = options?.capToSceneEnd !== false;
  const byScene = new Map<string, MveLine[]>();
  for (const line of lines) {
    if (line.audioClipId) continue;
    const list = byScene.get(line.sceneId) ?? [];
    list.push(line);
    byScene.set(line.sceneId, list);
  }

  const result = new Map<string, MveLineVisualSpan>();
  for (const sceneLines of byScene.values()) {
    const sceneBlock = sceneBlocks.find((b) => b.id === sceneLines[0]?.sceneId);
    if (!sceneBlock) continue;
    const ordered = sortLinesInScene(sceneLines);
    let visualCursorSec = sceneBlock.startSec;

    for (const line of ordered) {
      const logical = resolveMveLineSpan({
        line,
        sceneBlock,
        linesInScene: ordered,
        readingSpeedWpm,
      });
      const sceneEndSec = sceneBlock.endSec;
      if (capToSceneEnd && visualCursorSec >= sceneEndSec - 1e-6) {
        break;
      }
      const startSec = Math.max(logical.startSec, visualCursorSec);
      const widthPx = resolveMveLineStackWidthPx(
        logical.startSec,
        logical.endSec,
        pxPerSec,
      );
      let endSec = startSec + widthPx / pxPerSec;
      if (capToSceneEnd) {
        endSec = Math.min(endSec, sceneEndSec);
      }
      if (endSec <= startSec + 1e-6) {
        break;
      }
      result.set(line.id, { startSec, endSec });
      visualCursorSec = endSec;
    }
  }

  return result;
}

/** Max timeline end among visually stacked text blocks (content-driven scene resize). */
export function maxVisualContentEndSecInScene(
  sceneBlock: SceneTimeBlock,
  linesInScene: MveLine[],
  pxPerSec: number,
  readingSpeedWpm?: number,
): number {
  if (linesInScene.length === 0) return sceneBlock.endSec;

  const visual = resolveMveLineVisualSpanMap(
    linesInScene,
    [sceneBlock],
    pxPerSec,
    readingSpeedWpm,
    { capToSceneEnd: false },
  );
  let maxEnd = sceneBlock.startSec;
  for (const line of linesInScene) {
    const span = visual.get(line.id);
    if (span) maxEnd = Math.max(maxEnd, span.endSec);
  }

  if (!hasNonEmptyTextInLines(linesInScene)) {
    return maxEnd;
  }

  return maxEnd;
}
