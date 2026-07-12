/**
 * TrackMixGrid — Vol + Pan rows (mockup mini-field grid).
 */

import {
  formatPanPercent,
  formatVolumeDb,
  parsePanReadout,
  parseVolumeDbInput,
  type LaneState,
} from "../../../lib/audio-lane";
import { PanSliderTrack } from "./PanSliderTrack";
import { VolumeSliderTrack } from "./VolumeSliderTrack";
import { MixerReadoutInput } from "./MixerReadoutInput";

export interface TrackMixGridProps {
  label: string;
  laneIndex: number;
  state: LaneState;
  onVolumeChange: (laneIndex: number, volume: number) => void;
  onPanChange: (laneIndex: number, pan: number) => void;
}

export function TrackMixGrid({
  label,
  laneIndex,
  state,
  onVolumeChange,
  onPanChange,
}: TrackMixGridProps) {
  const sliderRowCols = "22px minmax(0, 1fr) 3rem";

  return (
    <div className="grid w-full min-w-0 max-w-full shrink-0 gap-y-1 overflow-hidden">
      <div
        className="grid min-w-0 w-full items-center gap-x-1.5"
        style={{ gridTemplateColumns: sliderRowCols }}
      >
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium pr-1 shrink-0">
          VOL
        </span>
        <VolumeSliderTrack
          className="mx-0.5 min-w-0"
          min={0}
          max={1.2}
          step={0.01}
          value={state.volume}
          onChange={(v) => onVolumeChange(laneIndex, v)}
          ariaLabel={`Volume für ${label}`}
        />
        <MixerReadoutInput
          className="pr-1"
          displayValue={formatVolumeDb(state.volume)}
          parse={parseVolumeDbInput}
          onCommit={(v) => onVolumeChange(laneIndex, v)}
          ariaLabel={`Volume dB für ${label}`}
          title="z. B. -6,0 dB"
        />
      </div>

      <div
        className="grid min-w-0 w-full items-center gap-x-1.5"
        style={{ gridTemplateColumns: sliderRowCols }}
      >
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium pr-1 shrink-0">
          PAN
        </span>
        <div className="flex min-w-0 items-center gap-1 px-0.5">
          <span className="text-[8px] text-muted-foreground/80 shrink-0 w-2 text-center">
            L
          </span>
          <PanSliderTrack
            pan={state.pan}
            onChange={(v) => onPanChange(laneIndex, v)}
            ariaLabel={`Pan für ${label}`}
            className="flex-1 min-w-0"
          />
          <span className="text-[8px] text-muted-foreground/80 shrink-0 w-2 text-center">
            R
          </span>
        </div>
        <MixerReadoutInput
          className="pr-1"
          displayValue={formatPanPercent(state.pan)}
          parse={parsePanReadout}
          onCommit={(v) => onPanChange(laneIndex, v)}
          ariaLabel={`Pan für ${label}`}
          title="z. B. R50%, L50%, 0 C"
        />
      </div>
    </div>
  );
}
