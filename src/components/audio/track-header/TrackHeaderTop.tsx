/**
 * TrackHeaderTop — top row with drag handle, label, and transport toggles.
 * Extracted from TrackHeader.tsx to respect the 150-line component limit (T26).
 */

import type { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "../../../lib/utils";
import { LevelMeter } from "../LevelMeter";
import { TrackTransportToggles } from "./TrackTransportToggles";
import type { LaneState } from "../../../lib/audio-lane";
import type { AudioTrackType, Character } from "../../../lib/types";

export interface TrackHeaderTopProps {
  laneIndex: number;
  trackType: AudioTrackType | "global";
  state: LaneState;
  label: string;
  accentBorder: string;
  locked: boolean;
  poweredOff: boolean;
  expanded: boolean;
  isCharacterLane: boolean;
  dragOrderIndex?: number;
  onReorderDrag?: (fromIndex: number, toIndex: number) => void;
  onMuteChange: (laneIndex: number, mute: boolean) => void;
  onSoloChange: (laneIndex: number, solo: boolean) => void;
  onRecordToggle?: (laneIndex: number) => void;
  isRecording?: boolean;
  onDeleteLane?: (laneIndex: number) => void;
  headerAddon?: ReactNode;
}

export function TrackHeaderTop({
  laneIndex,
  trackType,
  state,
  label,
  accentBorder,
  locked,
  poweredOff,
  expanded,
  isCharacterLane,
  dragOrderIndex,
  onReorderDrag,
  onMuteChange,
  onSoloChange,
  onRecordToggle,
  isRecording,
  onDeleteLane,
  headerAddon,
}: TrackHeaderTopProps) {
  const canDrag =
    isCharacterLane &&
    typeof dragOrderIndex === "number" &&
    Boolean(onReorderDrag);

  return (
    <div
      className={cn(
        "flex min-h-0 shrink-0 min-w-0 w-full items-center justify-between gap-2",
      )}
    >
      <div
        className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
        onDragOver={
          canDrag
            ? (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            : undefined
        }
        onDrop={
          canDrag
            ? (e) => {
                e.preventDefault();
                const from = Number(
                  e.dataTransfer.getData("text/character-lane-from"),
                );
                if (!Number.isFinite(from) || from === dragOrderIndex) return;
                onReorderDrag?.(from, dragOrderIndex!);
              }
            : undefined
        }
      >
        {canDrag ? (
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(
                "text/character-lane-from",
                String(dragOrderIndex),
              );
              e.dataTransfer.effectAllowed = "move";
            }}
            className="shrink-0 p-0 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            aria-label="Spur-Reihenfolge ändern"
          >
            <GripVertical className="size-3.5" aria-hidden />
          </button>
        ) : null}
        {expanded ? (
          <LevelMeter
            value={state.meterPeak}
            variant="vertical"
            className="shrink-0"
          />
        ) : null}
        <span
          className="text-[10px] font-medium text-foreground truncate min-w-0 leading-tight"
          title={label}
        >
          {label}
        </span>
      </div>
      <div
        className="flex shrink-0 items-center gap-0.5"
        onDragOver={
          canDrag
            ? (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            : undefined
        }
        onDrop={
          canDrag
            ? (e) => {
                e.preventDefault();
                const from = Number(
                  e.dataTransfer.getData("text/character-lane-from"),
                );
                if (!Number.isFinite(from) || from === dragOrderIndex) return;
                onReorderDrag?.(from, dragOrderIndex!);
              }
            : undefined
        }
      >
        <TrackTransportToggles
          label={label}
          laneIndex={laneIndex}
          state={state}
          onMuteChange={onMuteChange}
          onSoloChange={onSoloChange}
          onRecordToggle={onRecordToggle}
          isRecording={isRecording}
          onDeleteLane={onDeleteLane}
        />
        {headerAddon}
      </div>
    </div>
  );
}
