/**
 * Metronome count-in settings for audio lane recording (T31).
 * Location: src/lib/audio/metronome-config.ts
 */

import { z } from "zod";

export const MetronomeConfigSchema = z.object({
  bpm: z.number().min(0).max(300).default(120),
  beatsPerBar: z.union([
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(6),
  ]),
  countInBeats: z.number().int().min(1).max(8).default(3),
  enabled: z.boolean().default(true),
});

export type MetronomeConfig = z.output<typeof MetronomeConfigSchema>;

export const DEFAULT_METRONOME_CONFIG: MetronomeConfig = {
  bpm: 120,
  beatsPerBar: 4,
  countInBeats: 3,
  enabled: true,
};

const STORAGE_KEY = (projectId: string) => `scriptony:metronome:${projectId}`;

export function readMetronomeConfig(projectId: string): MetronomeConfig {
  if (typeof window === "undefined") return DEFAULT_METRONOME_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(projectId));
    if (!raw) return DEFAULT_METRONOME_CONFIG;
    const parsed = MetronomeConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_METRONOME_CONFIG;
  } catch {
    return DEFAULT_METRONOME_CONFIG;
  }
}

export function writeMetronomeConfig(
  projectId: string,
  config: MetronomeConfig,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY(projectId), JSON.stringify(config));
}
