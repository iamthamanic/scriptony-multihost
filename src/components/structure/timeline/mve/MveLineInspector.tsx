/**
 * MveLineInspector — LineDirection popover for Structure Timeline clips.
 * Location: src/components/structure/timeline/mve/MveLineInspector.tsx
 */

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import type {
  MveEmotion,
  MvePace,
} from "@/lib/multi-voice-engine/schema/enums";

const EMOTION_OPTIONS: { value: MveEmotion; label: string }[] = [
  { value: "neutral", label: "Neutral" },
  { value: "warm", label: "Warm" },
  { value: "friendly", label: "Freundlich" },
  { value: "confident", label: "Selbstbewusst" },
  { value: "calm", label: "Ruhig" },
  { value: "serious", label: "Ernst" },
  { value: "tense", label: "Angespannt" },
  { value: "excited", label: "Begeistert" },
  { value: "dramatic", label: "Dramatisch" },
  { value: "whispered", label: "Geflüstert" },
];

const PACE_OPTIONS: { value: MvePace; label: string }[] = [
  { value: "x_slow", label: "Sehr langsam" },
  { value: "slow", label: "Langsam" },
  { value: "medium", label: "Mittel" },
  { value: "fast", label: "Schnell" },
  { value: "x_fast", label: "Sehr schnell" },
];

export interface MveLineInspectorProps {
  direction?: MveLineDirection;
  disabled?: boolean;
  onSave: (direction: MveLineDirection) => Promise<void>;
}

export function MveLineInspector({
  direction,
  disabled,
  onSave,
}: MveLineInspectorProps) {
  const [open, setOpen] = useState(false);
  const [emotion, setEmotion] = useState<MveEmotion | "">(
    direction?.emotion ?? "",
  );
  const [pace, setPace] = useState<MvePace | "">(direction?.pace ?? "");
  const [pauseBeforeMs, setPauseBeforeMs] = useState(
    direction?.pauseBeforeMs != null ? String(direction.pauseBeforeMs) : "",
  );
  const [pauseAfterMs, setPauseAfterMs] = useState(
    direction?.pauseAfterMs != null ? String(direction.pauseAfterMs) : "",
  );
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setEmotion(direction?.emotion ?? "");
      setPace(direction?.pace ?? "");
      setPauseBeforeMs(
        direction?.pauseBeforeMs != null ? String(direction.pauseBeforeMs) : "",
      );
      setPauseAfterMs(
        direction?.pauseAfterMs != null ? String(direction.pauseAfterMs) : "",
      );
    }
    setOpen(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const next: MveLineDirection = {};
      if (emotion) next.emotion = emotion;
      if (pace) next.pace = pace;
      const before = Number.parseInt(pauseBeforeMs, 10);
      const after = Number.parseInt(pauseAfterMs, 10);
      if (Number.isFinite(before) && before >= 0) next.pauseBeforeMs = before;
      if (Number.isFinite(after) && after >= 0) next.pauseAfterMs = after;
      await onSave(next);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="shrink-0 p-0.5 rounded-sm hover:bg-white/30 transition-colors focus:outline-none focus:ring-1 focus:ring-white/50 disabled:opacity-50"
          aria-label="Regie bearbeiten"
          title="Regie (Emotion, Tempo, Pause)"
        >
          <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="start" sideOffset={4}>
        <p className="text-xs font-medium text-foreground">Regie</p>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Emotion</label>
          <select
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={emotion}
            onChange={(e) =>
              setEmotion((e.target.value || "") as MveEmotion | "")
            }
          >
            <option value="">—</option>
            {EMOTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Tempo</label>
          <select
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            value={pace}
            onChange={(e) => setPace((e.target.value || "") as MvePace | "")}
          >
            <option value="">—</option>
            {PACE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">
              Pause vor (ms)
            </label>
            <Input
              type="number"
              min={0}
              className="h-8 text-xs"
              value={pauseBeforeMs}
              onChange={(e) => setPauseBeforeMs(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">
              Pause nach (ms)
            </label>
            <Input
              type="number"
              min={0}
              className="h-8 text-xs"
              value={pauseAfterMs}
              onChange={(e) => setPauseAfterMs(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full h-8 text-xs"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Speichern…" : "Speichern"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
