/**
 * MetronomeSettingsButton — opens metronome settings from audio lane header (T31).
 * Location: src/components/structure/timeline/modals/MetronomeSettingsButton.tsx
 */

import { useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetronomeConfig } from "@/lib/audio/metronome-config";
import { MetronomeSettingsModal } from "./MetronomeSettingsModal";

export interface MetronomeSettingsButtonProps {
  config: MetronomeConfig;
  onSave: (config: MetronomeConfig) => void;
  className?: string;
}

export function MetronomeSettingsButton({
  config,
  onSave,
  className,
}: MetronomeSettingsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 rounded border border-border/80 px-1.5 py-0.5",
          "text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted/60",
          config.enabled && "border-primary/40 text-primary",
          className,
        )}
        aria-label="Metronom-Einstellungen"
        data-testid="metronome-settings-button"
      >
        <Timer className="size-3" aria-hidden />
        {config.enabled ? `${config.bpm} BPM` : "Metronom"}
      </button>
      <MetronomeSettingsModal
        open={open}
        config={config}
        onSave={onSave}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
