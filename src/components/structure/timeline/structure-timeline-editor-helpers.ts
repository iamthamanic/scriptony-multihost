/**
 * Pure helpers for StructureTimelineEditor — page markers, word count, shot audio layout (T73).
 * Location: src/components/structure/timeline/structure-timeline-editor-helpers.ts
 */
import { MIN_LABEL_SPACING_PX } from "@/lib/timeline-ruler-scale";
import { timelineClipPreviewUrl } from "@/lib/timeline-clip-preview-url";
import type { ShotAudio } from "@/lib/types";

export const PAGE_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500] as const;

export function shotBlockPreviewUrl(
  shot: Parameters<typeof timelineClipPreviewUrl>[0],
): string | undefined {
  return timelineClipPreviewUrl(shot);
}

export function shotAudioPlayDurationSec(a: ShotAudio): number {
  const s = a.startTime;
  const e = a.endTime;
  if (typeof s === "number" && typeof e === "number" && e > s) return e - s;
  if (typeof a.duration === "number" && a.duration > 0) return a.duration;
  return 1;
}

export function layoutShotAudioSegments(
  files: ShotAudio[],
): { id: string; widthFrac: number; title: string }[] {
  if (files.length === 0) return [];
  const durs = files.map(shotAudioPlayDurationSec);
  const sum = durs.reduce((x, y) => x + y, 0) || 1;
  return files.map((f, i) => ({
    id: f.id,
    widthFrac: durs[i]! / sum,
    title: (f.label || f.fileName || "Audio").slice(0, 48),
  }));
}

export function getPageMarkerInterval(
  pxPerSec: number,
  wordsPerPage: number,
  readingSpeedWpm: number,
): number {
  const secondsPerPage = (wordsPerPage / readingSpeedWpm) * 60;
  const pxPerPage = pxPerSec * secondsPerPage;
  const minPagesBetweenTicks = MIN_LABEL_SPACING_PX / pxPerPage;
  return (
    PAGE_STEPS.find((step) => step >= minPagesBetweenTicks) ??
    PAGE_STEPS[PAGE_STEPS.length - 1]!
  );
}
