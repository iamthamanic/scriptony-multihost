/**
 * TimelineTrackAddButton — „+“ on structure track label rows (Act/Seq/Scene).
 * Location: src/components/timeline/TimelineTrackAddButton.tsx
 */

import { Plus } from "lucide-react";
import { cn } from "../../lib/utils";

export interface TimelineTrackAddButtonProps {
  onClick: () => void;
  title: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function TimelineTrackAddButton({
  onClick,
  title,
  ariaLabel,
  disabled = false,
  className,
}: TimelineTrackAddButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-primary/15 text-primary",
        "disabled:opacity-40 disabled:pointer-events-none",
        className,
      )}
      title={title}
      aria-label={ariaLabel ?? title}
    >
      <Plus className="size-3.5" strokeWidth={2.25} />
    </button>
  );
}
