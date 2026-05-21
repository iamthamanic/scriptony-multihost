/**
 * ClipLanePopover — T32 DAW Feature.
 *
 * Popover to change a clip's lane assignment.
 * Shows current lane label and LaneSelect dropdown.
 *
 * WCAG 2.2 AA: keyboard accessible, labelled.
 */

import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { LaneSelect } from "./LaneSelect";
import { getLaneLabel } from "../../lib/audio-lane";
import type { AudioClip, AudioTrackType } from "../../lib/types";

interface ClipLanePopoverProps {
  clip: AudioClip;
  allClips: AudioClip[];
  onLaneChange: (clipId: string, newLaneIndex: number) => void;
}

export function ClipLanePopover({
  clip,
  allClips,
  onLaneChange,
}: ClipLanePopoverProps) {
  const [open, setOpen] = useState(false);
  const trackType = (clip.trackType ?? "dialog") as AudioTrackType | "global";
  const currentLabel = getLaneLabel(clip.laneIndex);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-[10px] px-1 py-0 rounded bg-white/20 hover:bg-white/30 transition-colors focus:outline-none focus:ring-1 focus:ring-white/50"
          aria-label={`Lane: ${currentLabel}. Klicken zum Ändern.`}
          title={`Lane: ${currentLabel}`}
        >
          {currentLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-2"
        align="start"
        sideOffset={4}
        collisionPadding={8}
        onEscapeKeyDown={() => setOpen(false)}
      >
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Lane ändern</p>
          <LaneSelect
            currentLaneIndex={clip.laneIndex}
            trackType={trackType}
            clips={allClips}
            clipId={clip.id}
            clipStartSec={clip.startSec}
            clipEndSec={clip.endSec}
            onChange={(newIdx) => {
              onLaneChange(clip.id, newIdx);
              setOpen(false);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
