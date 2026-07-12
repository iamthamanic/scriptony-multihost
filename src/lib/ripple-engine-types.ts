/**
 * Shared Ripple-Engine: Bottom-Up Cascade (Backend + Frontend).
 *
 * T30: Pure Function, kein React, kein State, kein Side-Effect.
 * SRP: Nur Berechnung. Persistenz ist Aufgabe des Callers.
 *
 * Repository twin (byte-identical): functions/_shared/ripple-engine-types.ts ↔ src/lib/ripple-engine-types.ts
 *
 * KISS: Keine komplexe Graph-Traversal. Baum-Hierarchie:
 *   Clip → Scene → Sequence → Act
 *   Ripple-Propagation: Änderung fließt aufwärts (Container-Dauer)
 *   und seitwärts (nachfolgende Geschwister verschieben).
 */

// ── Interfaces ────────────────────────────────────────────────────

/** Temporale Container, die vom Ripple berechnet werden. */
export interface TemporalContainer {
  id: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  orderIndex: number;
}

export interface RippleScene extends TemporalContainer {
  sequenceId: string | null | undefined;
}

export interface RippleSequence extends TemporalContainer {
  actId: string | null | undefined;
}

export type RippleAct = TemporalContainer;

export interface RippleClip {
  id: string;
  sceneId: string;
  startSec: number;
  endSec: number;
  crossScene?: boolean;
}

export interface RippleInput {
  /** Der Clip, dessen endSec sich geändert hat. */
  changedClipId: string;
  /** Neuer endSec-Wert. */
  newEndSec: number;
  /** Alle Clips des Projekts (mutiert werden). */
  allClips: RippleClip[];
  /** Alle Scenes (mutiert werden). */
  allScenes: RippleScene[];
  /** Alle Sequences (mutiert werden). */
  allSequences: RippleSequence[];
  /** Alle Acts (mutiert werden). */
  allActs: RippleAct[];
}

export interface RippleOutput {
  updatedClips: RippleClip[];
  updatedScenes: RippleScene[];
  updatedSequences: RippleSequence[];
  updatedActs: RippleAct[];
  stats: {
    affectedClips: number;
    affectedScenes: number;
    affectedSequences: number;
    affectedActs: number;
    deltaSec: number;
  };
}

// ── Scene reorder ───────────────────────────────────────────────

export interface SceneReorderInput {
  orderedSceneIds: string[];
  allClips: RippleClip[];
  allScenes: RippleScene[];
  allSequences: RippleSequence[];
  allActs: RippleAct[];
}

export interface ConflictCheckInput {
  clipId: string;
  lastKnownUpdatedAt: string;
  allClips: Array<{ id: string; updatedAt: string }>;
}
