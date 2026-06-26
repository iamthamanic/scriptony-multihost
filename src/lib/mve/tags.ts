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

export function isMveTag(value: string): value is MveTag {
  return MVE_TAGS.includes(value as MveTag);
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
