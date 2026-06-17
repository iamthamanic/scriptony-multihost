/**
 * Shared chrome rows for audio DAW section — keeps label column and clip rows vertically aligned.
 * Location: src/components/structure/timeline/tracks/StructureTimelineAudioLaneChrome.tsx
 */

import { Plus } from "lucide-react";
import { LANE_UI } from "../../../../lib/audio-lane";
import { cn } from "../../../../lib/utils";

const HEADER_ROW_CLASS =
  "border-b border-border px-2 py-1 flex items-center bg-card/80 shrink-0";
const FOOTER_ROW_CLASS = "border-t border-border px-2 py-2 bg-card/80 shrink-0";

export function StructureTimelineAudioLaneSectionHeader({
  showLabel = true,
}: {
  showLabel?: boolean;
}) {
  return (
    <div
      className={HEADER_ROW_CLASS}
      style={{ minHeight: LANE_UI.sectionHeaderMinHeight }}
      aria-hidden={!showLabel}
    >
      {showLabel ? (
        <span className="text-[9px] font-semibold text-foreground">
          Audio-Spuren
        </span>
      ) : (
        <span className="text-[9px] opacity-0 select-none" aria-hidden>
          Audio-Spuren
        </span>
      )}
    </div>
  );
}

export function StructureTimelineAudioLaneSectionFooter({
  onAddSfx,
  disabled,
}: {
  onAddSfx?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={FOOTER_ROW_CLASS}>
      {onAddSfx ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onAddSfx}
          className={cn(
            "flex items-center justify-center gap-1 w-full py-1 text-[10px] rounded",
            "border border-dashed border-orange-400/60 text-muted-foreground",
            "hover:text-foreground hover:bg-orange-500/10 disabled:opacity-50",
          )}
          aria-label="SFX-Spur hinzufügen"
        >
          <Plus className="size-3" />
          SFX
        </button>
      ) : (
        <div className="py-1" aria-hidden />
      )}
    </div>
  );
}
