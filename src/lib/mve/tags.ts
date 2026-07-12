/**
 * Shared MVE line tag registry (T27).
 * Location: src/lib/mve/tags.ts
 *
 * Tags are written as `--<name>` inline in dialog text and control
 * voice-direction hints (mood, volume, articulation).
 */

export const MVE_TAGS = [
  "sad",
  "happy",
  "angry",
  "whisper",
  "loud",
  "slow",
  "fast",
  "emphasis",
  "pause",
  "breathy",
] as const;

export type MveTag = (typeof MVE_TAGS)[number];

/** German UI labels for inline MVE tags shown as chips in dialog clips. */
export const MVE_TAG_LABELS: Record<MveTag, string> = {
  sad: "Traurig",
  happy: "Fröhlich",
  angry: "Wütend",
  whisper: "Geflüstert",
  loud: "Laut",
  slow: "Langsam",
  fast: "Schnell",
  emphasis: "Betont",
  pause: "Pause",
  breathy: "Hauchig",
};

export function isMveTag(value: string): value is MveTag {
  return MVE_TAGS.includes(value as MveTag);
}

export function mveTagDisplayLabel(tag: MveTag): string {
  return MVE_TAG_LABELS[tag] ?? tag;
}

/** Unique tags in document order (first occurrence only). */
export function extractMveTagsFromText(text: string): MveTag[] {
  const seen = new Set<MveTag>();
  const result: MveTag[] = [];
  for (const match of text.matchAll(getMveTagPattern())) {
    const tag = parseMveTag(match[0]);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }
  return result;
}

/** Remove one `--tag` token from text (first match). */
export function removeMveTagFromText(text: string, tag: MveTag): string {
  const token = formatMveTag(tag);
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(\\s*)${escaped}(\\s*)`);
  const match = pattern.exec(text);
  if (!match) return text;
  const start = match.index;
  const end = start + match[0].length;
  const before = text.slice(0, start);
  const after = text.slice(end);
  const glue =
    before.length > 0 &&
    after.length > 0 &&
    !/\s$/.test(before) &&
    !/^\s/.test(after)
      ? " "
      : "";
  return `${before}${glue}${after}`.replace(/\s{2,}/g, " ").trim();
}

export function formatMveTag(tag: MveTag): string {
  return `--${tag}`;
}

export function parseMveTag(token: string): MveTag | null {
  const stripped = token.startsWith("--") ? token.slice(2) : token;
  return isMveTag(stripped) ? stripped : null;
}

/**
 * Returns a fresh RegExp that matches only known MVE tags in their `--name`
 * form. The regex has the global flag; callers should not reuse it across
 * `.exec()` calls, so we return a new instance each time.
 */
export function getMveTagPattern(): RegExp {
  // Use lookarounds so the tag is not embedded in a longer word. The leading
  // `--` itself is non-word, so a plain word-boundary before it does not work.
  return new RegExp(
    MVE_TAGS.map((tag) => `(?<!\\w)--${tag}(?!\\w)`).join("|"),
    "g",
  );
}

/** Remove inline `--tag` tokens before WPM / duration word counting. */
export function stripMveTagsFromTextForDuration(text: string): string {
  return text
    .replace(getMveTagPattern(), "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
