/**
 * Audio-Utilities: WPM-Schätzung, Duration-Berechnung.
 *
 * T29: Backend-Kopie der Frontend-Utility. SRP: Nur Schätzung.
 * DRY: Identische Logik wie src/lib/audio-utils.ts, aber ohne
 * Frontend-Import-Abhängigkeiten (React, Browser-APIs).
 */

export const WPM_DEFAULTS = {
	base: 150,
	languageModifiers: { de: 1.0, en: 1.07, es: 1.03 },
	emotionModifiers: {
		sachlich: 1.0,
		amüsiert: 1.1,
		aufgeregt: 1.2,
		wütend: 1.25,
		traurig: 0.85,
		ängstlich: 1.15,
		nachdenklich: 0.9,
		begeistert: 1.15,
	},
	typeDefaults: {
		dialog: 150,
		narrator: 140,
		sfx: 0,
		music: 0,
		atmo: 0,
	},
	minDurationSec: 1,
	maxDurationSec: 600,
} as const;

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
 * DRY: Identische Logik wie Frontend src/lib/audio-utils.ts.
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
