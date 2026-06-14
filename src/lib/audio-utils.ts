/**
 * Audio-Utilities: WPM-Schätzung, Duration-Berechnung.
 *
 * T27: Pure Functions, keine React-Abhängigkeit.
 */

import { WPM_DEFAULTS } from "./types";
export { WPM_DEFAULTS };

export interface EstimateOptions {
  type?: "dialog" | "narrator" | "sfx" | "music" | "atmo";
  emotion?: string;
  language?: "de" | "en" | "es";
  wpmOverride?: number;
}

/**
 * Schätzt die Sprechdauer eines Textes in Sekunden.
 *
 * KISS: Einfache Wort/Min-Formel. Keine NLP-Analyse.
 * DRY: Wird von Frontend (Preview) und Backend (Erstellung) geteilt.
 */
export function estimateDurationSec(
  text: string | undefined | null,
  options: EstimateOptions = {},
): number {
  const {
    type = "dialog",
    emotion = "sachlich",
    language = "de",
    wpmOverride,
  } = options;

  // SFX / Musik / Atmo haben keine Textbasis
  if (type === "sfx" || type === "music" || type === "atmo") {
    return type === "sfx" ? 3 : 60;
  }

  const normalized = (text || "").trim();
  const words =
    normalized.length === 0
      ? 0
      : normalized.split(/\s+/).filter((w) => w.length > 0).length;

  if (words === 0) return WPM_DEFAULTS.minDurationSec;

  const baseWpm =
    wpmOverride ??
    (WPM_DEFAULTS.typeDefaults as Record<string, number>)[type] ??
    WPM_DEFAULTS.base;

  const langModifier =
    (WPM_DEFAULTS.languageModifiers as Record<string, number>)[language] ?? 1.0;
  const emotionModifier =
    (WPM_DEFAULTS.emotionModifiers as Record<string, number>)[emotion] ?? 1.0;

  const effectiveWpm = baseWpm * langModifier * emotionModifier;
  const duration = (words / effectiveWpm) * 60;

  return Math.min(
    Math.max(duration, WPM_DEFAULTS.minDurationSec),
    WPM_DEFAULTS.maxDurationSec,
  );
}

/**
 * Formatiert Sekunden als mm:ss.
 */
export function formatDurationSec(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
