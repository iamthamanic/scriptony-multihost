/**
 * MveDurationChip — compact pill for WPM estimate or bound-audio duration on dialog clips.
 * Reuses emotion chip surface styling; no remove button.
 *
 * Location: src/components/structure/timeline/mve/MveDurationChip.tsx
 */

import { cn } from "@/lib/utils";
import { MVE_EMOTION_CHIP_SURFACE_CLASSES } from "@/lib/mve/mve-emotion-chip-classes";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../ui/tooltip";

export const MVE_DURATION_CHIP_TOOLTIP = {
  estimate: "WPM-Schätzung",
  audio: "Audiolänge",
} as const;

export interface MveDurationChipProps {
  label: string;
  title?: string;
  variant?: "estimate" | "audio";
  className?: string;
  "data-testid"?: string;
}

export function MveDurationChip({
  label,
  title,
  variant = "estimate",
  className,
  "data-testid": dataTestId,
}: MveDurationChipProps) {
  const tooltipText = title ?? MVE_DURATION_CHIP_TOOLTIP[variant];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            MVE_EMOTION_CHIP_SURFACE_CLASSES,
            "tabular-nums cursor-default",
            variant === "audio" && "max-w-none",
            className,
          )}
          aria-label={`${label}, ${tooltipText}`}
          data-testid={dataTestId}
          data-duration-source={variant}
        >
          <span className="truncate">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
