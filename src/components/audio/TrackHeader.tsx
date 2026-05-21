/**
 * TrackHeader — T32 DAW Feature.
 *
 * Mixer controls for a single lane: Mute/Solo, Volume, Pan, FX Preset.
 * Pure component — state lifted to parent via callbacks.
 * WCAG 2.2 AA: All controls are keyboard accessible, labelled.
 */

import { cn } from "../../lib/utils";
import {
  type LaneState,
  volumeToDb,
  dbToVolume,
  formatPanPercent,
  FX_PRESETS,
  getLaneLabel,
  LANE_COLORS,
} from "../../lib/audio-lane";
import { LevelMeter } from "./LevelMeter";
import type { AudioTrackType } from "../../lib/types";

export interface TrackHeaderProps {
  laneIndex: number;
  trackType: AudioTrackType | "global";
  state: LaneState;
  onMuteChange: (laneIndex: number, mute: boolean) => void;
  onSoloChange: (laneIndex: number, solo: boolean) => void;
  onVolumeChange: (laneIndex: number, volume: number) => void;
  onPanChange: (laneIndex: number, pan: number) => void;
  onFxPresetChange: (laneIndex: number, presetId: string | undefined) => void;
  className?: string;
}

export function TrackHeader({
  laneIndex,
  trackType,
  state,
  onMuteChange,
  onSoloChange,
  onVolumeChange,
  onPanChange,
  onFxPresetChange,
  className,
}: TrackHeaderProps) {
  const label = getLaneLabel(laneIndex);
  const colorClass = LANE_COLORS[trackType] || LANE_COLORS.dialog;

  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-2 rounded-md border-l-4",
        colorClass,
        state.mute && "opacity-50 line-through",
        className,
      )}
    >
      {/* Label + Level Meter */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-medium text-foreground truncate"
          title={label}
        >
          {label}
        </span>
        <LevelMeter value={state.meterPeak} variant="compact" />
      </div>

      {/* Mute / Solo / FX */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onMuteChange(laneIndex, !state.mute)}
          className={cn(
            "w-6 h-6 text-xs font-bold rounded transition-colors",
            "focus:outline-none focus:ring-1 focus:ring-ring",
            state.mute
              ? "bg-red-500/80 text-white"
              : "bg-muted hover:bg-muted/80 text-muted-foreground",
          )}
          aria-label={`${state.mute ? "Unmute" : "Mute"} ${label}`}
          aria-pressed={state.mute}
        >
          M
        </button>
        <button
          type="button"
          onClick={() => onSoloChange(laneIndex, !state.solo)}
          className={cn(
            "w-6 h-6 text-xs font-bold rounded transition-colors",
            "focus:outline-none focus:ring-1 focus:ring-ring",
            state.solo
              ? "bg-yellow-500/80 text-white"
              : "bg-muted hover:bg-muted/80 text-muted-foreground",
          )}
          aria-label={`${state.solo ? "Unsolo" : "Solo"} ${label}`}
          aria-pressed={state.solo}
        >
          S
        </button>
        {/* FX Preset Dropdown — T32: Metadata only, no audio processing */}
        <select
          value={state.fxPresetId || ""}
          onChange={(e) =>
            onFxPresetChange(laneIndex, e.target.value || undefined)
          }
          className="flex-1 min-w-0 text-xs bg-muted border border-border rounded px-1 py-0.5 text-foreground"
          aria-label={`FX Preset für ${label}`}
        >
          <option value="">Kein FX</option>
          {FX_PRESETS.filter((p) => p.type === "reverb").map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Volume Slider */}
      <label className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground w-3 shrink-0">
          V
        </span>
        <input
          type="range"
          min={0}
          max={1.2}
          step={0.01}
          value={state.volume}
          onChange={(e) =>
            onVolumeChange(laneIndex, parseFloat(e.target.value))
          }
          className="flex-1 h-1.5 accent-indigo-500"
          aria-label={`Volume für ${label}`}
        />
        <input
          type="number"
          min={-60}
          max={1.8}
          step={0.1}
          value={volumeToDb(state.volume).toFixed(1)}
          onChange={(e) => {
            const raw = parseFloat(e.target.value);
            const db = Number.isFinite(raw) ? raw : -60;
            onVolumeChange(
              laneIndex,
              Math.min(1.2, Math.max(0, dbToVolume(db))),
            );
          }}
          className="w-10 text-[10px] text-center bg-muted border border-border rounded px-0.5 py-0 text-foreground"
          aria-label={`Volume in dB für ${label}`}
        />
        <span className="text-[10px] text-muted-foreground">dB</span>
      </label>

      {/* Pan Slider */}
      <label className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground shrink-0">L</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={state.pan}
          onChange={(e) => onPanChange(laneIndex, parseFloat(e.target.value))}
          className="flex-1 h-1.5 accent-indigo-500"
          aria-label={`Pan für ${label}`}
        />
        <span className="text-[10px] text-muted-foreground shrink-0">R</span>
        <span className="text-[10px] text-muted-foreground min-w-[2.5rem] text-right">
          {formatPanPercent(state.pan)}
        </span>
      </label>
    </div>
  );
}
