/**
 * Timeline-Positionierung: Lane-Zuweisung und Startzeit-Berechnung.
 *
 * T27: Pure Functions. Kein State, kein API-Call.
 * T30: Ripple-Engine wird hier ergänzt.
 */

import type { AudioClip, Scene, Sequence, Act } from "./types";
import { LANE_SCHEMA } from "./types";

const DEFAULT_CONTAINER_SEC = 300; // 5 Minuten Fallback

/**
 * Weist eine Lane-Index basierend auf Track-Typ und Charakter zu.
 * KISS: SFX/Musik/Atmo bekommen ihre jeweilige Base-Lane.
 */
export function resolveLaneIndex(
	type: string,
	characterId?: string | null,
): number {
	switch (type) {
		case "dialog":
			return characterId ? LANE_SCHEMA.dialog.base : LANE_SCHEMA.narrator.base;
		case "narrator":
			return LANE_SCHEMA.narrator.base;
		case "sfx":
			return LANE_SCHEMA.sfx.base;
		case "music":
			return LANE_SCHEMA.music.base;
		case "atmo":
			return LANE_SCHEMA.atmo.base;
		default:
			return 0;
	}
}

/**
 * Berechnet die nächste freie Startzeit innerhalb einer Szene.
 * KISS: Ende des letzten Clips in der Szene.
 */
export function getNextAvailableStartSec(
	sceneId: string,
	allClips: AudioClip[],
): number {
	const sceneClips = allClips.filter((c) => c.sceneId === sceneId);
	if (sceneClips.length === 0) return 0;

	const lastClip = sceneClips.sort((a, b) => a.endSec - b.endSec)[
		sceneClips.length - 1
	];
	return lastClip?.endSec ?? 0;
}

/**
 * Berechnet die absolute Startzeit einer Szene (kumulative, Bottom-Up).
 * SRP: Nur Positionierung. Keine Ripple-Logik.
 *
 * NOTE: Act/Sequence haben keine durationSec. Wir verwenden einen
 * konstanten Fallback (300s = 5min) bis T30 die echte Bottom-Up-Dauer
 * aus den Clips berechnet.
 */
export function getSceneAbsoluteStartSec(
	sceneId: string,
	allScenes: Scene[],
	allSequences: Sequence[],
	allActs: Act[],
): number {
	const scene = allScenes.find((s) => s.id === sceneId);
	if (!scene) return 0;

	const sequence = allSequences.find((sq) => sq.id === scene.sequenceId);
	if (!sequence) return 0;

	const act = allActs.find((a) => a.id === sequence.actId);
	if (!act) return 0;

	const sceneOrder = scene.orderIndex ?? 0;
	const seqOrder = sequence.orderIndex ?? 0;
	const actOrder = act.orderIndex ?? 0;

	const prevActs = allActs
		.filter((a) => (a.orderIndex ?? 0) < actOrder)
		.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
	const actStartSec = prevActs.length * DEFAULT_CONTAINER_SEC;

	const prevSeqs = allSequences
		.filter((sq) => sq.actId === act.id && (sq.orderIndex ?? 0) < seqOrder)
		.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
	const seqStartSec = prevSeqs.length * DEFAULT_CONTAINER_SEC;

	const prevScenes = allScenes
		.filter(
			(s) => s.sequenceId === sequence.id && (s.orderIndex ?? 0) < sceneOrder,
		)
		.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
	const sceneStartSec = prevScenes.length * DEFAULT_CONTAINER_SEC;

	return actStartSec + seqStartSec + sceneStartSec;
}
