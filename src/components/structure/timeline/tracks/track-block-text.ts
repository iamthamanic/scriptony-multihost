/**
 * Adaptive clip label text for structure timeline tracks (Epic T55e).
 * Chooses full, abbreviated, or minimal display based on block width in pixels.
 */

export type TrackBlockTextKind = "beat" | "act" | "chapter" | "scene" | "shot";

const THRESHOLDS: Record<
  TrackBlockTextKind,
  { full: number; abbreviated: number }
> = {
  beat: { full: 60, abbreviated: 30 },
  act: { full: 80, abbreviated: 40 },
  chapter: { full: 100, abbreviated: 50 },
  scene: { full: 120, abbreviated: 60 },
  shot: { full: 80, abbreviated: 40 },
};

const MINIMAL_PREFIX: Record<TrackBlockTextKind, string> = {
  beat: "B",
  act: "A",
  chapter: "K",
  scene: "S",
  shot: "SH",
};

export function getTrackBlockText(
  fullText: string,
  widthPx: number,
  type: TrackBlockTextKind,
  index: number,
): string {
  if (!Number.isFinite(widthPx) || widthPx < 18) return "";

  const { full, abbreviated } = THRESHOLDS[type];

  if (widthPx >= full) return fullText;
  if (widthPx >= abbreviated) {
    const maxChars = Math.floor(widthPx / 7);
    if (fullText.length <= maxChars) return fullText;
    return `${fullText.substring(0, maxChars - 3)}...`;
  }

  return `${MINIMAL_PREFIX[type]}${index + 1}`;
}
