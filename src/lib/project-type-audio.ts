/**
 * Audio / Hörspiel project type helpers (DRY).
 * Location: src/lib/project-type-audio.ts
 */

export const AUDIO_PROJECT_TYPES = [
  "audio",
  "hörspiel",
  "audiobook",
  "audio_book",
] as const;

export type AudioProjectType = (typeof AUDIO_PROJECT_TYPES)[number];

export function isAudioProjectType(type?: string | null): boolean {
  const normalized = (type ?? "").toLowerCase();
  return (AUDIO_PROJECT_TYPES as readonly string[]).includes(normalized);
}
