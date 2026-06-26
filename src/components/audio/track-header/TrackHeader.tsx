/**
 * TrackHeader — playlist track column (TheStuu-style head + mix + FX chain).
 */

import type { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "../../../lib/utils";
import { type LaneState } from "../../../lib/audio-lane";
import { isCharacterDialogLane } from "../../../lib/character-lane-map";
import { LevelMeter } from "../LevelMeter";
import type { AudioTrackType, Character } from "../../../lib/types";
import { TrackMixGrid } from "./TrackMixGrid";
import { TrackFxChain } from "./TrackFxChain";
import { TrackTransportToggles } from "./TrackTransportToggles";
import { TrackCharacterRow } from "./TrackCharacterRow";

const LANE_ACCENT_BORDER: Record<string, string> = {
  dialog: "border-l-indigo-500",
  sfx: "border-l-orange-500",
  music: "border-l-violet-500",
  atmo: "border-l-emerald-500",
  narrator: "border-l-indigo-500",
  global: "border-l-zinc-500",
};

export interface TrackHeaderProps {
  laneIndex: number;
  trackType: AudioTrackType | "global";
  state: LaneState;
  character?: Character;
  displayLabel?: string;
  layout?: "compact" | "expanded";
  dragOrderIndex?: number;
  onReorderDrag?: (fromIndex: number, toIndex: number) => void;
  onMuteChange: (laneIndex: number, mute: boolean) => void;
  onSoloChange: (laneIndex: number, solo: boolean) => void;
  onVolumeChange: (laneIndex: number, volume: number) => void;
  onPanChange: (laneIndex: number, pan: number) => void;
  onFxSlotChange: (
    laneIndex: number,
    slotIndex: number,
    presetId: string | null,
  ) => void;
  onFxChainEnabledChange: (laneIndex: number, enabled: boolean) => void;
  onRecordToggle?: (laneIndex: number) => void;
  isRecording?: boolean;
  onDeleteLane?: (laneIndex: number) => void;
  onLinkClick?: (laneIndex: number) => void;
  linkActive?: boolean;
  linkWarning?: boolean;
  laneLinkLabel?: string;
  headerAddon?: ReactNode;
  className?: string;
}

export function TrackHeader({
  laneIndex,
  trackType,
  state,
  character,
  displayLabel,
  layout = "compact",
  dragOrderIndex,
  onReorderDrag,
  onMuteChange,
  onSoloChange,
  onVolumeChange,
  onPanChange,
  onFxSlotChange,
  onFxChainEnabledChange,
  onRecordToggle,
  isRecording,
  onDeleteLane,
  onLinkClick,
  linkActive,
  linkWarning,
  laneLinkLabel,
  headerAddon,
  className,
}: TrackHeaderProps) {
  const isCharacterLane =
    isCharacterDialogLane(laneIndex) && Boolean(character);
  const label =
    displayLabel ?? (isCharacterLane ? "Audio Dialog" : `Audio ${trackType}`);
  const accentBorder =
    LANE_ACCENT_BORDER[trackType] || LANE_ACCENT_BORDER.dialog;
  const locked = state.locked ?? false;
  const poweredOff = state.mute && (state.volume ?? 1) === 0;
  const expanded = layout === "expanded";
  const canDrag =
    isCharacterLane &&
    typeof dragOrderIndex === "number" &&
    Boolean(onReorderDrag);

  return (
    <div
      className={cn(
        "box-border flex flex-col justify-between gap-1",
        "h-full min-h-0 w-full min-w-0 max-w-full overflow-hidden",
        "border-l-[3px] pl-2 pr-2 pt-1 pb-1",
        "bg-card/95",
        accentBorder,
        (state.mute || poweredOff) && "opacity-55",
        locked && "ring-1 ring-inset ring-amber-500/35",
        className,
      )}
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
      <div className="flex min-h-0 shrink-0 min-w-0 w-full items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
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
        <div className="flex shrink-0 items-center gap-0.5">
          <TrackTransportToggles
            label={character?.name ?? label}
            laneIndex={laneIndex}
            state={state}
            onMuteChange={onMuteChange}
            onSoloChange={onSoloChange}
            onRecordToggle={onRecordToggle}
            isRecording={isRecording}
            onDeleteLane={onDeleteLane}
            onLinkClick={onLinkClick}
            linkActive={linkActive}
            linkWarning={linkWarning}
          />
          {headerAddon}
        </div>
      </div>

      {character ? (
        <TrackCharacterRow
          character={character}
          laneLinkLabel={laneLinkLabel}
          laneLinkOrphan={linkWarning}
        />
      ) : null}

      <TrackMixGrid
        label={character?.name ?? label}
        laneIndex={laneIndex}
        state={state}
        onVolumeChange={onVolumeChange}
        onPanChange={onPanChange}
      />

      <TrackFxChain
        laneIndex={laneIndex}
        state={state}
        onFxSlotChange={onFxSlotChange}
        onFxChainEnabledChange={onFxChainEnabledChange}
      />
    </div>
  );
}
