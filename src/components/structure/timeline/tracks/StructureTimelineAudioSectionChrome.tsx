/**
 * Shared Audio-Spuren section chrome — header/footer heights must match between
 * label column and scroll column (Structure Timeline row alignment).
 * Location: src/components/structure/timeline/tracks/StructureTimelineAudioSectionChrome.tsx
 */

import { Plus } from "lucide-react";
import { LANE_UI } from "@/lib/audio-lane";
import { cn } from "@/lib/utils";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { MetronomeSettingsButton } from "../modals/MetronomeSettingsButton";
import type { useMetronomeSettings } from "@/hooks/useMetronomeSettings";

type MetronomeApi = Pick<
  ReturnType<typeof useMetronomeSettings>,
  "config" | "setConfig"
>;

export function StructureTimelineAudioSectionHeader({
  side,
  metronome,
}: {
  side: "labels" | "scroll";
  metronome?: MetronomeApi;
}) {
  const showMetronome = Boolean(metronome && isLocalProfile());
  const mirrorOnly = side === "scroll";

  return (
    <div
      className={LANE_UI.sectionHeaderClass}
      data-testid={`timeline-audio-section-header-${side}`}
      aria-hidden={mirrorOnly || undefined}
    >
      <span
        className={cn(
          "text-[9px] font-semibold text-foreground",
          mirrorOnly && "invisible",
        )}
      >
        Audio-Spuren
      </span>
      <div
        className={cn(
          "flex shrink-0 items-center",
          mirrorOnly && "invisible pointer-events-none",
        )}
      >
        {showMetronome && metronome ? (
          <MetronomeSettingsButton
            config={metronome.config}
            onSave={metronome.setConfig}
          />
        ) : (
          <span className="inline-block size-7 shrink-0" aria-hidden />
        )}
      </div>
    </div>
  );
}

export function StructureTimelineAudioSectionFooter({
  side,
  addAudio,
}: {
  side: "labels" | "scroll";
  addAudio?: {
    isBusy: boolean;
    addSfxLane: () => Promise<void> | void;
  };
}) {
  const mirrorOnly = side === "scroll";
  const sfxButton = (
    <button
      type="button"
      disabled={addAudio?.isBusy}
      onClick={() => void addAudio?.addSfxLane()}
      className="flex items-center justify-center gap-1 w-full py-1 text-[10px] rounded border border-dashed border-orange-400/60 text-muted-foreground hover:text-foreground hover:bg-orange-500/10 disabled:opacity-50"
      aria-label="SFX-Spur hinzufügen"
      tabIndex={mirrorOnly ? -1 : undefined}
    >
      <Plus className="size-3" />
      SFX
    </button>
  );

  return (
    <div
      className={LANE_UI.sectionFooterClass}
      data-testid={`timeline-audio-section-footer-${side}`}
      aria-hidden={mirrorOnly || undefined}
    >
      {mirrorOnly ? (
        <div className="invisible pointer-events-none w-full" aria-hidden>
          {sfxButton}
        </div>
      ) : (
        sfxButton
      )}
    </div>
  );
}
