/**
 * MveEmotionChip — compact pill for MVE emotion/tag labels on dialog clip cards.
 * White in dark mode, black in light mode for contrast on card backgrounds.
 *
 * Location: src/components/structure/timeline/mve/MveEmotionChip.tsx
 */

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MVE_EMOTION_CHIP_REMOVE_BUTTON_CLASSES,
  MVE_EMOTION_CHIP_SURFACE_CLASSES,
} from "@/lib/mve/mve-emotion-chip-classes";

export interface MveEmotionChipProps {
  label: string;
  onRemove?: () => void;
  removeAriaLabel?: string;
  className?: string;
  "data-testid"?: string;
}

export function MveEmotionChip({
  label,
  onRemove,
  removeAriaLabel = "Emotion entfernen",
  className,
  "data-testid": dataTestId,
}: MveEmotionChipProps) {
  return (
    <span
      className={cn(MVE_EMOTION_CHIP_SURFACE_CLASSES, className)}
      data-testid={dataTestId}
    >
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          className={MVE_EMOTION_CHIP_REMOVE_BUTTON_CLASSES}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={removeAriaLabel}
          data-testid={dataTestId ? `${dataTestId}-remove` : undefined}
        >
          <X className="size-2.5" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
