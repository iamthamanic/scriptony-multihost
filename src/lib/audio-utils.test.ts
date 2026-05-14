/**
 * Unit Tests für WPM-Schätzung (estimateDurationSec).
 *
 * T29: Pure Functions, keine React-Abhängigkeit.
 * Security: Keine externen Calls, keine Secrets.
 */

import { describe, it, expect } from "vitest";
import { estimateDurationSec, WPM_DEFAULTS } from "./audio-utils";

describe("estimateDurationSec", () => {
	it("gibt minDurationSec bei leerem Text zurück", () => {
		expect(estimateDurationSec("")).toBe(WPM_DEFAULTS.minDurationSec);
		expect(estimateDurationSec(null)).toBe(WPM_DEFAULTS.minDurationSec);
		expect(estimateDurationSec(undefined)).toBe(WPM_DEFAULTS.minDurationSec);
		expect(estimateDurationSec("   ")).toBe(WPM_DEFAULTS.minDurationSec);
	});

	it("schätzt Dialog mit Standard-WPM (150) korrekt", () => {
		// 10 Wörter / 150 WPM * 60 = 4s
		const text = "Dies ist ein kurzer Satz mit genau fünfzehn Wörtern total.";
		expect(estimateDurationSec(text, { type: "dialog" })).toBeCloseTo(4, 0);
	});

	it("wendet Emotion-Modifier an", () => {
		const text = "Dies ist ein kurzer Satz mit genau fünfzehn Wörtern total.";
		const sachlich = estimateDurationSec(text, {
			type: "dialog",
			emotion: "sachlich",
		});
		const amüsiert = estimateDurationSec(text, {
			type: "dialog",
			emotion: "amüsiert",
		});
		const traurig = estimateDurationSec(text, {
			type: "dialog",
			emotion: "traurig",
		});

		// Amüsiert = schneller (1.1 Modifier), traurig = langsamer (0.85 Modifier)
		expect(amüsiert).toBeLessThan(sachlich);
		expect(traurig).toBeGreaterThan(sachlich);
	});

	it("wendet Sprach-Modifier an", () => {
		const text = "Dies ist ein kurzer Satz mit genau fünfzehn Wörtern total.";
		const de = estimateDurationSec(text, { type: "dialog", language: "de" });
		const en = estimateDurationSec(text, { type: "dialog", language: "en" });

		// Englisch ist schneller (1.07 Modifier)
		expect(en).toBeLessThan(de);
	});

	it("erlaubt WPM-Override", () => {
		const text = "Dies ist ein kurzer Satz mit genau fünfzehn Wörtern total.";
		const standard = estimateDurationSec(text, { type: "dialog" });
		const schneller = estimateDurationSec(text, {
			type: "dialog",
			wpmOverride: 200,
		});

		expect(schneller).toBeLessThan(standard);
	});

	it("gibt feste Defaults für SFX / Musik / Atmo", () => {
		expect(estimateDurationSec("Explosion", { type: "sfx" })).toBe(3);
		expect(estimateDurationSec("Hintergrundmusik", { type: "music" })).toBe(60);
		expect(estimateDurationSec("Windgeräusch", { type: "atmo" })).toBe(60);
	});

	it("respektiert minDurationSec", () => {
		const text = "Hi.";
		const result = estimateDurationSec(text, { type: "dialog" });
		expect(result).toBeGreaterThanOrEqual(WPM_DEFAULTS.minDurationSec);
	});

	it("respektiert maxDurationSec", () => {
		// 5000 Wörter bei 150 WPM = 2000s > max (600s)
		const text = Array(5000).fill("Wort").join(" ");
		const result = estimateDurationSec(text, { type: "dialog" });
		expect(result).toBeLessThanOrEqual(WPM_DEFAULTS.maxDurationSec);
	});

	it("berechnet Erzähler langsamer als Dialog", () => {
		const text = "Dies ist ein kurzer Satz mit genau fünfzehn Wörtern total.";
		const dialog = estimateDurationSec(text, { type: "dialog" });
		const narrator = estimateDurationSec(text, { type: "narrator" });

		// Erzähler-Default ist 140 WPM (langsamer als Dialog 150)
		expect(narrator).toBeGreaterThan(dialog);
	});
});
