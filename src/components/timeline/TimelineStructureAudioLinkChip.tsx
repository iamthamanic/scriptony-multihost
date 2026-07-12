/**
 * Truncated audio lane link chip with tooltip + link icon.
 * Location: src/components/timeline/TimelineStructureAudioLinkChip.tsx
 */

import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SCENE_AUDIO_LINK_CHIP_CLASS,
  SHOT_AUDIO_LINK_CHIP_CLASS,
} from "@/lib/scene-audio-lane-link";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export type TimelineStructureAudioLinkVariant = "scene" | "shot";

const VARIANT_CHIP_CLASS: Record<TimelineStructureAudioLinkVariant, string> = {
  scene: SCENE_AUDIO_LINK_CHIP_CLASS,
  shot: SHOT_AUDIO_LINK_CHIP_CLASS,
};

export interface TimelineStructureAudioLinkChipProps {
  shortLabel: string;
  fullLabel: string;
  variant: TimelineStructureAudioLinkVariant;
  /** Sidebar rows are narrower — tighter max-width + smaller text. */
  size?: "clip" | "sidebar";
  /** Clip lane: icon-only mini-pill when zoomed out (label in tooltip). */
  iconOnly?: boolean;
  onClick: () => void;
  className?: string;
}

export function TimelineStructureAudioLinkChip({
  shortLabel,
  fullLabel,
  variant,
  size = "clip",
  iconOnly = false,
  onClick,
  className,
}: TimelineStructureAudioLinkChipProps) {
  const isSidebar = size === "sidebar";
  const showLabel = !iconOnly || isSidebar;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-0.5 shrink min-w-0 rounded transition-opacity hover:opacity-90",
            isSidebar
              ? "max-w-[5.25rem] px-1 py-px text-[7px]"
              : "max-w-full px-1 py-px text-[8px]",
            iconOnly && !isSidebar && "scene-audio-link-chip-icon-only",
            VARIANT_CHIP_CLASS[variant],
            className,
          )}
          aria-label={fullLabel}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {showLabel ? (
            <span className="truncate font-medium">{shortLabel}</span>
          ) : null}
          <Link2
            className="shrink-0 opacity-90 size-2 text-inherit"
            aria-hidden
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{fullLabel}</TooltipContent>
    </Tooltip>
  );
}
