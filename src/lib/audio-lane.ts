/**
 * Audio Lane Utilities — T32 DAW Features.
 *
 * Pure functions for lane assignment, FX presets, and volume/pan helpers.
 * No side effects, no React — just logic.
 */

import { LANE_SCHEMA } from "../lib/types";
import type { AudioClip, AudioTrackType } from "../lib/types";

// ── Lane Assignment ──────────────────────────────────────────────────

/**
 * Assigns the first non-overlapping lane index for a new clip.
 * Falls back to the last lane of the type (overlap marked visually).
 */
export function assignLaneIndex(
  clips: AudioClip[],
  newClip: AudioClip,
): number {
  const laneConfig = LANE_SCHEMA[newClip.trackType as keyof typeof LANE_SCHEMA];
  if (!laneConfig) {
    // Unknown type: use dialog lanes as fallback
    const fallback = LANE_SCHEMA.dialog;
    return findFreeLane(clips, newClip, fallback.base, fallback.max);
  }
  return findFreeLane(clips, newClip, laneConfig.base, laneConfig.max);
}

function findFreeLane(
  clips: AudioClip[],
  newClip: AudioClip,
  base: number,
  max: number,
): number {
  for (let lane = base; lane <= max; lane++) {
    const laneClips = clips.filter((c) => c.laneIndex === lane);
    const hasOverlap = laneClips.some(
      (c) => !(newClip.endSec <= c.startSec || newClip.startSec >= c.endSec),
    );
    if (!hasOverlap) return lane;
  }
  // All lanes full — fallback to max (overlap allowed, visually marked)
  return max;
}

/** Get human-readable lane label from lane index. */
export function getLaneLabel(laneIndex: number): string {
  for (const config of Object.values(LANE_SCHEMA)) {
    const { base, max, label } = config;
    if (laneIndex >= base && laneIndex <= max) {
      const offset = laneIndex - base;
      // dialog has multiple character lanes; others are numbered
      return offset === 0 ? label : `${label} ${offset + 1}`;
    }
  }
  return `Lane ${laneIndex}`;
}

/** Get the track type for a lane index. */
export function getLaneType(laneIndex: number): AudioTrackType | "global" {
  for (const [type, config] of Object.entries(LANE_SCHEMA)) {
    const { base, max } =
      config as (typeof LANE_SCHEMA)[keyof typeof LANE_SCHEMA];
    if (laneIndex >= base && laneIndex <= max) {
      return type as AudioTrackType | "global";
    }
  }
  return "dialog";
}

/** Get the colour class for a track type. */
export const LANE_COLORS: Record<string, string> = {
  dialog: "bg-indigo-500/20 border-indigo-500",
  sfx: "bg-orange-500/20 border-orange-500",
  music: "bg-violet-500/20 border-violet-500",
  atmo: "bg-emerald-500/20 border-emerald-500",
  narrator: "bg-blue-500/20 border-blue-500",
  global: "bg-gray-500/20 border-gray-500",
};

// ── FX Presets ──────────────────────────────────────────────────────

export interface FxPreset {
  id: string;
  name: string;
  type: "reverb" | "eq" | "compressor";
  settings: Record<string, number>;
}

export const FX_PRESETS: FxPreset[] = [
  {
    id: "reverb_light",
    name: "Leichter Hall",
    type: "reverb",
    settings: { roomSize: 0.3, damp: 0.5 },
  },
  {
    id: "reverb_medium",
    name: "Mittlerer Hall",
    type: "reverb",
    settings: { roomSize: 0.5, damp: 0.4 },
  },
  {
    id: "reverb_large",
    name: "Großer Hall",
    type: "reverb",
    settings: { roomSize: 0.8, damp: 0.3 },
  },
  {
    id: "reverb_cathedral",
    name: "Kathedrale",
    type: "reverb",
    settings: { roomSize: 1.0, damp: 0.2 },
  },
];

/** Look up a preset by ID. Returns undefined if not found. */
export function getFxPreset(id: string | undefined): FxPreset | undefined {
  return FX_PRESETS.find((p) => p.id === id);
}

// ── Volume / Pan Helpers ────────────────────────────────────────────

/** Convert linear volume (0–1.2) to dB. 0 → -∞, 1 → 0 dB, 1.2 → ~1.58 dB */
export function volumeToDb(volume: number): number {
  if (volume <= 0) return -60;
  return 20 * Math.log10(volume);
}

/** Convert dB to linear volume. -60 → 0, 0 → 1, +1.8 → ~1.2 */
export function dbToVolume(db: number): number {
  if (db <= -60) return 0;
  return Math.pow(10, db / 20);
}

/** Format volume as dB string (e.g. "-6.0 dB") */
export function formatVolumeDb(volume: number): string {
  const db = volumeToDb(volume);
  return db <= -60 ? "-∞ dB" : `${db.toFixed(1)} dB`;
}

/** Format pan (-1…+1) as percentage string (L100%…R100%) */
export function formatPanPercent(pan: number): string {
  if (pan === 0) return "C";
  return pan < 0
    ? `L${Math.round(Math.abs(pan) * 100)}%`
    : `R${Math.round(pan * 100)}%`;
}

// ── Lane State ──────────────────────────────────────────────────────

export interface LaneState {
  mute: boolean;
  solo: boolean;
  volume: number; // 0–1.2
  pan: number; // -1…+1
  meterPeak: number; // 0–1+, for LevelMeter
  fxPresetId?: string; // T32: FX preset metadata, no processing
  fxSlots?: string[];
  fxChainEnabled?: boolean;
  locked?: boolean;
}

export type LaneStates = Record<number, LaneState>;

/** Create default lane state for a given lane index. */
export function createDefaultLaneState(): LaneState {
  return {
    mute: false,
    solo: false,
    volume: 1.0,
    pan: 0,
    meterPeak: 0,
  };
}

/** Determine if a lane is audibly active given all lane states. */
export function isLaneAudible(laneIndex: number, states: LaneStates): boolean {
  const lane = states[laneIndex] ?? createDefaultLaneState();
  if (lane.mute) return false;
  const anySolo = Object.values(states).some((s) => s.solo);
  if (anySolo && !lane.solo) return false;
  return true;
}

// ── Overlap Detection ────────────────────────────────────────────

/** Check if a clip would overlap with existing clips on a given lane. */
export function hasOverlap(
  clips: AudioClip[],
  newClip: { startSec: number; endSec: number; id?: string },
  laneIndex: number,
): boolean {
  const laneClips = clips.filter(
    (c) => c.laneIndex === laneIndex && c.id !== newClip.id,
  );
  return laneClips.some(
    (c) => !(newClip.endSec <= c.startSec || newClip.startSec >= c.endSec),
  );
}

// ── UI Constants ───────────────────────────────────────────────

export const LANE_UI = {
  heightCompact: 152,
  heightExpanded: 184,
  mixerWidthClass: "w-[248px] min-w-[248px] max-w-[248px]",
} as const;

// ── Pan/Volume Helpers ─────────────────────────────────────────

export function getPanTrackGradient(pan: number): string {
  const clamped = Math.max(-1, Math.min(1, pan));
  const thumbPercent = ((clamped + 1) / 2) * 100;
  const neutral = "rgba(255,255,255,0.14)";
  const blue = "rgba(59,130,246,0.6)";

  if (Math.abs(clamped) < 0.02) {
    return `linear-gradient(to right, ${neutral} 0%, ${neutral} 100%)`;
  }

  if (clamped < 0) {
    return `linear-gradient(to right, ${neutral} 0%, ${neutral} ${thumbPercent}%, ${blue} ${thumbPercent}%, ${blue} 50%, ${neutral} 50%, ${neutral} 100%)`;
  }

  return `linear-gradient(to right, ${neutral} 0%, ${neutral} 50%, ${blue} 50%, ${blue} ${thumbPercent}%, ${neutral} ${thumbPercent}%, ${neutral} 100%)`;
}

export function getTimelineLaneLabel(laneIndex: number): string {
  return `Audio ${getLaneLabel(laneIndex)}`;
}

export function parseVolumeDbInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, ".");
  const match = normalized.match(/^-?\d+(\.\d+)?$/);
  if (!match) return null;
  const val = parseFloat(normalized);
  if (Number.isNaN(val)) return null;
  return Math.max(-96, Math.min(12, val));
}

export function parsePanReadout(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, ".");
  const match = normalized.match(/^-?\d+(\.\d+)?$/);
  if (!match) return null;
  const val = parseFloat(normalized);
  if (Number.isNaN(val)) return null;
  return Math.max(-100, Math.min(100, val));
}
