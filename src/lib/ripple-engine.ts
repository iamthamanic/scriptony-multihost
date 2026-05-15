/**
 * Ripple-Engine: Bottom-Up Cascade für temporale Realisierung.
 *
 * T30: Pure Function, kein React, kein State, kein Side-Effect.
 * SRP: Nur Berechnung. Persistenz ist Aufgabe des Callers.
 *
 * ⚠️ ACHTUNG: Diese Datei MUSS byte-identisch zu
 * functions/_shared/ripple-engine.ts bleiben. Änderungen immer
 * in BOTH Dateien synchronisieren.
 *
 * KISS: Keine komplexe Graph-Traversal. Baum-Hierarchie:
 *   Clip → Scene → Sequence → Act
 *   Ripple-Propagation: Änderung fließt aufwärts (Container-Dauer)
 *   und seitwärts (nachfolgende Geschwister verschieben).
 */

import type { AudioClip } from "./types";

// ── Interfaces ────────────────────────────────────────────────────

/** Temporale Container, die vom Ripple berechnet werden. */
interface TemporalContainer {
	id: string;
	startSec: number;
	endSec: number;
	durationSec: number;
	orderIndex: number;
}

interface Scene extends TemporalContainer {
	sequenceId: string | null | undefined;
}

interface Sequence extends TemporalContainer {
	actId: string | null | undefined;
}

type Act = TemporalContainer;

export interface RippleInput {
	/** Der Clip, dessen endSec sich geändert hat. */
	changedClipId: string;
	/** Neuer endSec-Wert. */
	newEndSec: number;
	/** Alle Clips des Projekts (mutiert werden). */
	allClips: AudioClip[];
	/** Alle Scenes (mutiert werden). */
	allScenes: Scene[];
	/** Alle Sequences (mutiert werden). */
	allSequences: Sequence[];
	/** Alle Acts (mutiert werden). */
	allActs: Act[];
}

export interface RippleOutput {
	updatedClips: AudioClip[];
	updatedScenes: Scene[];
	updatedSequences: Sequence[];
	updatedActs: Act[];
	stats: {
		affectedClips: number;
		affectedScenes: number;
		affectedSequences: number;
		affectedActs: number;
		deltaSec: number;
	};
}

// ── Pure Function ─────────────────────────────────────────────────

/**
 * Berechnet Ripple-Effekt einer Clip-Änderung.
 *
 * Algorithmus (KISS):
 * 1. Clip endSec aktualisieren.
 * 2. Scene-Dauer = max(clip.endSec) aller Clips in Scene.
 * 3. Delta = neue Scene.endSec - alte Scene.endSec.
 * 4. Nachfolgende Scenes in Sequence um Delta verschieben.
 * 5. Sequence.endSec = letzte Scene.endSec in Sequence.
 * 6. Nachfolgende Sequences in Act um Delta verschieben.
 * 7. Act.endSec = letzte Sequence.endSec in Act.
 * 8. Nachfolgende Acts um Delta verschieben.
 *
 * Edge Cases:
 * - Delta = 0 → Früher Rückgabe, keine Mutation.
 * - Cross-Scene-Clips werden NICHT verschoben (absolute Zeit).
 * - Negative Deltas erlaubt (Clip kürzer), aber startSec ≥ 0 enforced.
 * - Scene ohne sequenceId → Intra-Scene-Ripple only, keine Cross-Scene.
 */
export function calculateRipple(input: RippleInput): RippleOutput {
	const {
		changedClipId,
		newEndSec,
		allClips,
		allScenes,
		allSequences,
		allActs,
	} = input;

	// ── 0. Kopien erstellen (Pure Function = keine Mutation der Inputs) ─
	const clips = allClips.map((c) => ({ ...c }));
	const scenes = allScenes.map((s) => ({ ...s }));
	const sequences = allSequences.map((sq) => ({ ...sq }));
	const acts = allActs.map((a) => ({ ...a }));

	// ── 1. Changed Clip finden und aktualisieren ────────────────────
	const changedIdx = clips.findIndex((c) => c.id === changedClipId);
	if (changedIdx === -1) {
		throw new Error(`Clip not found: ${changedClipId}`);
	}

	const changedClip = clips[changedIdx];
	const oldEndSec = changedClip.endSec;
	const delta = newEndSec - oldEndSec;

	// Delta = 0 → keine Ripple nötig
	if (delta === 0) {
		return {
			updatedClips: clips,
			updatedScenes: scenes,
			updatedSequences: sequences,
			updatedActs: acts,
			stats: {
				affectedClips: 0,
				affectedScenes: 0,
				affectedSequences: 0,
				affectedActs: 0,
				deltaSec: 0,
			},
		};
	}

	clips[changedIdx] = { ...changedClip, endSec: newEndSec };
	let affectedClips = 1;
	let affectedScenes = 0;
	let affectedSequences = 0;
	let affectedActs = 0;

	// ── 2. Scene-Dauer neu berechnen ─────────────────────────────────
	const sceneId = changedClip.sceneId;
	const sceneIdx = scenes.findIndex((s) => s.id === sceneId);
	if (sceneIdx === -1) {
		throw new Error(`Scene not found for clip: ${sceneId}`);
	}

	const scene = scenes[sceneIdx];
	const sceneClips = clips.filter((c) => c.sceneId === sceneId);
	const newSceneEndSec = Math.max(...sceneClips.map((c) => c.endSec), 0);
	const oldSceneEndSec = scene.endSec;
	const sceneDelta = newSceneEndSec - oldSceneEndSec;

	if (sceneDelta !== 0) {
		scenes[sceneIdx] = {
			...scene,
			endSec: newSceneEndSec,
			durationSec: Math.max(newSceneEndSec - scene.startSec, 0),
		};
		affectedScenes++;
	}

	// ── 3. Nachfolgende Scenes in Sequence verschieben ──────────────
	const sequenceId = scene.sequenceId;
	if (sequenceId) {
		const scenesInSeq = scenes
			.filter((s) => s.sequenceId === sequenceId)
			.sort((a, b) => a.orderIndex - b.orderIndex);

		const sceneOrderIdx = scenesInSeq.findIndex((s) => s.id === sceneId);
		for (let i = sceneOrderIdx + 1; i < scenesInSeq.length; i++) {
			const nextScene = scenesInSeq[i];
			const idx = scenes.findIndex((s) => s.id === nextScene.id);
			const newStart = Math.max(nextScene.startSec + sceneDelta, 0);
			scenes[idx] = {
				...nextScene,
				startSec: newStart,
				endSec: Math.max(nextScene.endSec + sceneDelta, newStart),
			};

			// Alle Clips in dieser Scene verschieben (außer crossScene)
			const clipsToShift = clips.filter(
				(c) => c.sceneId === nextScene.id && !c.crossScene,
			);
			for (const c of clipsToShift) {
				const cIdx = clips.findIndex((clip) => clip.id === c.id);
				const newClipStart = Math.max(c.startSec + sceneDelta, 0);
				clips[cIdx] = {
					...c,
					startSec: newClipStart,
					endSec: Math.max(c.endSec + sceneDelta, newClipStart),
				};
				affectedClips++;
			}
		}
	}

	// ── 4. Sequence-Dauer neu berechnen ────────────────────────────
	if (sequenceId) {
		const seqIdx = sequences.findIndex((sq) => sq.id === sequenceId);
		if (seqIdx >= 0) {
			const sequence = sequences[seqIdx];
			const updatedScenesInSeq = scenes
				.filter((s) => s.sequenceId === sequenceId)
				.sort((a, b) => a.orderIndex - b.orderIndex);
			const newSeqEndSec =
				updatedScenesInSeq.length > 0
					? updatedScenesInSeq[updatedScenesInSeq.length - 1].endSec
					: sequence.endSec;
			const seqDelta = newSeqEndSec - sequence.endSec;

			if (seqDelta !== 0) {
				sequences[seqIdx] = {
					...sequence,
					endSec: newSeqEndSec,
					durationSec: Math.max(newSeqEndSec - sequence.startSec, 0),
				};
				affectedSequences++;
			}

			// ── 5. Nachfolgende Sequences in Act verschieben ───────────────
			const actId = sequence.actId;
			if (actId) {
				const seqsInAct = sequences
					.filter((sq) => sq.actId === actId)
					.sort((a, b) => a.orderIndex - b.orderIndex);

				const seqOrderIdx = seqsInAct.findIndex(
					(sq) => sq.id === sequenceId,
				);
				for (let i = seqOrderIdx + 1; i < seqsInAct.length; i++) {
					const nextSeq = seqsInAct[i];
					const idx = sequences.findIndex((sq) => sq.id === nextSeq.id);
					const newStart = Math.max(nextSeq.startSec + seqDelta, 0);
					sequences[idx] = {
						...nextSeq,
						startSec: newStart,
						endSec: Math.max(nextSeq.endSec + seqDelta, newStart),
					};

					// Alle Scenes in dieser Sequence verschieben
					const scenesToShift = scenes.filter(
						(s) => s.sequenceId === nextSeq.id,
					);
					for (const s of scenesToShift) {
						const sIdx = scenes.findIndex((scene) => scene.id === s.id);
						const newSceneStart = Math.max(s.startSec + seqDelta, 0);
						scenes[sIdx] = {
							...s,
							startSec: newSceneStart,
							endSec: Math.max(s.endSec + seqDelta, newSceneStart),
						};

						// Alle Clips in diesen Scenes verschieben (außer crossScene)
						const clipsToShift = clips.filter(
							(c) => c.sceneId === s.id && !c.crossScene,
						);
						for (const c of clipsToShift) {
							const cIdx = clips.findIndex((clip) => clip.id === c.id);
							const newClipStart = Math.max(c.startSec + seqDelta, 0);
							clips[cIdx] = {
								...c,
								startSec: newClipStart,
								endSec: Math.max(c.endSec + seqDelta, newClipStart),
							};
							affectedClips++;
						}
					}
				}
			}
		}
	}

	// ── 6. Act-Dauer neu berechnen ──────────────────────────────────
	if (sequenceId) {
		const seqIdx = sequences.findIndex((sq) => sq.id === sequenceId);
		if (seqIdx >= 0) {
			const sequence = sequences[seqIdx];
			const actId = sequence.actId;
			if (actId) {
				const actIdx = acts.findIndex((a) => a.id === actId);
				if (actIdx >= 0) {
					const act = acts[actIdx];
					const updatedSeqsInAct = sequences
						.filter((sq) => sq.actId === actId)
						.sort((a, b) => a.orderIndex - b.orderIndex);
					const newActEndSec =
						updatedSeqsInAct.length > 0
							? updatedSeqsInAct[updatedSeqsInAct.length - 1].endSec
							: act.endSec;
					const actDelta = newActEndSec - act.endSec;

					if (actDelta !== 0) {
						acts[actIdx] = {
							...act,
							endSec: newActEndSec,
							durationSec: Math.max(newActEndSec - act.startSec, 0),
						};
						affectedActs++;
					}

					// ── 7. Nachfolgende Acts verschieben ────────────────────────────
					const sortedActs = acts.sort(
						(a, b) => a.orderIndex - b.orderIndex,
					);
					const actOrderIdx = sortedActs.findIndex(
						(a) => a.id === actId,
					);
					for (let i = actOrderIdx + 1; i < sortedActs.length; i++) {
						const nextAct = sortedActs[i];
						const idx = acts.findIndex((a) => a.id === nextAct.id);
						const newStart = Math.max(nextAct.startSec + actDelta, 0);
						acts[idx] = {
							...nextAct,
							startSec: newStart,
							endSec: Math.max(nextAct.endSec + actDelta, newStart),
						};

						// Alle Sequences in diesem Act verschieben
						const seqsToShift = sequences.filter(
							(sq) => sq.actId === nextAct.id,
						);
						for (const sq of seqsToShift) {
							const sqIdx = sequences.findIndex((s) => s.id === sq.id);
							const newSeqStart = Math.max(sq.startSec + actDelta, 0);
							sequences[sqIdx] = {
								...sq,
								startSec: newSeqStart,
								endSec: Math.max(sq.endSec + actDelta, newSeqStart),
							};

							// Alle Scenes in diesen Sequences verschieben
							const scenesToShift = scenes.filter(
								(s) => s.sequenceId === sq.id,
							);
							for (const s of scenesToShift) {
								const sIdx = scenes.findIndex(
									(scene) => scene.id === s.id,
								);
								const newSceneStart = Math.max(
									s.startSec + actDelta,
									0,
								);
								scenes[sIdx] = {
									...s,
									startSec: newSceneStart,
									endSec: Math.max(
										s.endSec + actDelta,
										newSceneStart,
									),
								};

								// Alle Clips in diesen Scenes verschieben (außer crossScene)
								const clipsToShift = clips.filter(
									(c) =>
										c.sceneId === s.id && !c.crossScene,
								);
								for (const c of clipsToShift) {
									const cIdx = clips.findIndex(
										(clip) => clip.id === c.id,
									);
									const newClipStart = Math.max(
										c.startSec + actDelta,
										0,
									);
									clips[cIdx] = {
										...c,
										startSec: newClipStart,
										endSec: Math.max(
											c.endSec + actDelta,
											newClipStart,
										),
									};
									affectedClips++;
								}
							}
						}
					}
				}
			}
		}
	}

	return {
		updatedClips: clips,
		updatedScenes: scenes,
		updatedSequences: sequences,
		updatedActs: acts,
		stats: {
			affectedClips,
			affectedScenes,
			affectedSequences,
			affectedActs,
			deltaSec: delta,
		},
	};
}

// ── Helper: Konflikt-Check (Optimistic Locking) ───────────────────

export interface ConflictCheckInput {
	clipId: string;
	lastKnownUpdatedAt: string;
	allClips: AudioClip[];
}

/**
 * Prüft, ob ein Clip seit dem letzten Lesen geändert wurde.
 * Für Optimistic Locking: Wenn updatedAt ≠ lastKnownUpdatedAt → Konflikt.
 */
export function checkForConflict(input: ConflictCheckInput): boolean {
	const { clipId, lastKnownUpdatedAt, allClips } = input;
	const clip = allClips.find((c) => c.id === clipId);
	if (!clip) return false; // Clip gelöscht = kein Konflikt (wird separat behandelt)
	return clip.updatedAt !== lastKnownUpdatedAt;
}
