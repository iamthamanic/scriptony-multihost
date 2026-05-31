/**
 * TrackTransportToggles — Mute / Solo / Record for track header row.
 */

import { Trash2, Volume2, VolumeX } from "lucide-react";
import type { LaneState } from "../../../lib/audio-lane";
import { TransportToggle } from "./TransportToggle";

export interface TrackTransportTogglesProps {
  label: string;
  laneIndex: number;
  state: LaneState;
  onMuteChange: (laneIndex: number, mute: boolean) => void;
  onSoloChange: (laneIndex: number, solo: boolean) => void;
  onRecordToggle?: (laneIndex: number) => void;
  isRecording?: boolean;
  onDeleteLane?: (laneIndex: number) => void;
  className?: string;
}

export function TrackTransportToggles({
  label,
  laneIndex,
  state,
  onMuteChange,
  onSoloChange,
  onRecordToggle,
  isRecording,
  onDeleteLane,
  className,
}: TrackTransportTogglesProps) {
  return (
    <div className={className ?? "flex flex-row items-center gap-0.5 shrink-0"}>
      {onDeleteLane ? (
        <TransportToggle
          icon={<Trash2 className="size-3" aria-hidden />}
          onClick={() => onDeleteLane(laneIndex)}
          ariaLabel={`Spur löschen: ${label}`}
          className="hover:bg-destructive/15 hover:text-destructive hover:border-destructive/40"
        />
      ) : null}
      <TransportToggle
        icon={
          state.mute ? (
            <VolumeX className="size-3" aria-hidden />
          ) : (
            <Volume2 className="size-3" aria-hidden />
          )
        }
        active={state.mute}
        activeClassName="bg-white/30 text-white border-white/60"
        onClick={() => onMuteChange(laneIndex, !state.mute)}
        ariaLabel={`${state.mute ? "Unmute" : "Mute"} ${label}`}
      />
      <TransportToggle
        label="S"
        active={state.solo}
        activeClassName="bg-yellow-500/30 text-yellow-50 border-yellow-400/70"
        onClick={() => onSoloChange(laneIndex, !state.solo)}
        ariaLabel={`${state.solo ? "Unsolo" : "Solo"} ${label}`}
      />
      {onRecordToggle ? (
        <TransportToggle
          label="R"
          active={isRecording}
          activeClassName="bg-red-500/25 text-red-300 border-red-400/80"
          onClick={() => onRecordToggle(laneIndex)}
          ariaLabel={
            isRecording ? `Aufnahme stoppen ${label}` : `Aufnahme ${label}`
          }
        />
      ) : null}
    </div>
  );
}
