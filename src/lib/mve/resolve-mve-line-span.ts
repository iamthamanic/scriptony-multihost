/**
 * Resolve timeline span (start/end/duration) for an MVE line without bound clip UI.
 * Uses WPM estimate when text exists; empty lines use scene shell or default shell.
 *
 * Location: src/lib/mve/resolve-mve-line-span.ts
 */

import { estimateDurationSec } from "@/lib/audio-utils";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { SceneTimeBlock } from "./resolve-scene-at-timeline-sec";

/** Visible default for additional empty text blocks (not the first in scene). */
export const DEFAULT_EMPTY_LINE_SHELL_SEC = 5;

export type MveLineSpanSource = "audio" | "wpm" | "shell" | "min";

export interface MveLineSpan {
  startSec: number;
  endSec: number;
  durationSec: number;
  source: MveLineSpanSource;
}

export interface ResolveMveLineSpanInput {
  line: MveLine;
  sceneBlock: SceneTimeBlock;
  linesInScene: MveLine[];
  readingSpeedWpm?: number;
  clip?: { startSec: number; endSec: number } | null;
}

export function isLineTextEmpty(line: MveLine): boolean {
  return (line.text ?? "").trim().length === 0;
}

/** First text-only line in scene by orderIndex. */
export function isFirstTextLineInScene(
  line: MveLine,
  linesInScene: MveLine[],
): boolean {
  const ordered = sortLinesInScene(linesInScene);
  return ordered.length > 0 && ordered[0]?.id === line.id;
}

function sceneDurationSec(sceneBlock: SceneTimeBlock): number {
  return Math.max(sceneBlock.endSec - sceneBlock.startSec, 0.1);
}

function emptyLineDurationSec(
  line: MveLine,
  sceneBlock: SceneTimeBlock,
  linesInScene: MveLine[],
): { durationSec: number; source: MveLineSpanSource } {
  const ordered = sortLinesInScene(
    linesInScene.filter((l) => l.sceneId === line.sceneId),
  );
  const soleLineInScene = ordered.length <= 1;
  if (soleLineInScene && isFirstTextLineInScene(line, linesInScene)) {
    return { durationSec: sceneDurationSec(sceneBlock), source: "shell" };
  }
  return {
    durationSec: DEFAULT_EMPTY_LINE_SHELL_SEC,
    source: "shell",
  };
}

function lineDurationSec(
  line: MveLine,
  sceneBlock: SceneTimeBlock,
  linesInScene: MveLine[],
  readingSpeedWpm?: number,
  clip?: { startSec: number; endSec: number } | null,
): { durationSec: number; source: MveLineSpanSource } {
  if (clip) {
    const durationSec = Math.max(0, clip.endSec - clip.startSec);
    return { durationSec: Math.max(durationSec, 0.001), source: "audio" };
  }

  if (isLineTextEmpty(line)) {
    return emptyLineDurationSec(line, sceneBlock, linesInScene);
  }

  const estimated = estimateDurationSec(line.text ?? "", {
    type: "dialog",
    wpmOverride: readingSpeedWpm,
  });
  return { durationSec: estimated, source: "wpm" };
}

/** Lines in scene sorted for sequential placement. */
export function sortLinesInScene(lines: MveLine[]): MveLine[] {
  return [...lines].sort((a, b) => {
    const orderDelta = (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
    if (orderDelta !== 0) return orderDelta;
    const createdDelta = (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    if (createdDelta !== 0) return createdDelta;
    return a.id.localeCompare(b.id);
  });
}

export function resolveMveLineSpan(
  input: ResolveMveLineSpanInput,
): MveLineSpan {
  const { line, sceneBlock, linesInScene, readingSpeedWpm, clip } = input;
  const siblings = sortLinesInScene(
    linesInScene.filter((l) => l.sceneId === line.sceneId),
  );
  const ordered = siblings.length > 0 ? siblings : [line];
  let cursor = sceneBlock.startSec;

  for (const sibling of ordered) {
    const { durationSec } = lineDurationSec(
      sibling,
      sceneBlock,
      ordered,
      readingSpeedWpm,
      null,
    );
    if (sibling.id === line.id) {
      const startSec = cursor;
      const endSec = startSec + durationSec;
      const { source } = lineDurationSec(
        line,
        sceneBlock,
        ordered,
        readingSpeedWpm,
        clip,
      );
      return { startSec, endSec, durationSec, source };
    }
    cursor += durationSec;
  }

  const { durationSec, source } = lineDurationSec(
    line,
    sceneBlock,
    ordered,
    readingSpeedWpm,
    clip,
  );
  return {
    startSec: sceneBlock.startSec,
    endSec: sceneBlock.startSec + durationSec,
    durationSec,
    source,
  };
}

/** Whether any line in the set has non-empty text. */
export function hasNonEmptyTextInLines(lines: MveLine[]): boolean {
  return lines.some((l) => !isLineTextEmpty(l));
}

/** Max endSec among text-only lines in a scene (content-driven scene resize). */
export function maxContentEndSecInScene(
  sceneBlock: SceneTimeBlock,
  linesInScene: MveLine[],
  readingSpeedWpm?: number,
): number {
  if (linesInScene.length === 0) return sceneBlock.endSec;

  let maxEnd = sceneBlock.startSec;
  for (const line of sortLinesInScene(linesInScene)) {
    const span = resolveMveLineSpan({
      line,
      sceneBlock,
      linesInScene,
      readingSpeedWpm,
    });
    maxEnd = Math.max(maxEnd, span.endSec);
  }

  if (!hasNonEmptyTextInLines(linesInScene)) {
    return Math.max(maxEnd, sceneBlock.endSec);
  }

  return maxEnd;
}
