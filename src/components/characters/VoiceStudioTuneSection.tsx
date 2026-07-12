/**
 * Voice Studio tune section — non-destructive preset from base profile (MVP 0.4).
 * Location: src/components/characters/VoiceStudioTuneSection.tsx
 */

import { useState } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MveEnergy, MvePace } from "@/lib/multi-voice-engine/schema/enums";
import type { MveVoiceAttributes } from "@/lib/multi-voice-engine/schema/voice-profile";
import { voiceTuneBlockedReason } from "@/lib/mve/tune/create-tuned-voice-profile";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

const PITCH_OPTIONS: NonNullable<MveVoiceAttributes["pitch"]>[] = [
  "very_low",
  "low",
  "medium",
  "high",
  "very_high",
];

const PACE_OPTIONS: MvePace[] = ["x_slow", "slow", "medium", "fast", "x_fast"];

const ENERGY_OPTIONS: MveEnergy[] = [
  "very_low",
  "low",
  "medium",
  "high",
  "very_high",
];

export interface VoiceTuneSubmitOptions {
  tuneDescription: string;
  pitch?: MveVoiceAttributes["pitch"];
  pace?: MvePace;
  energy?: MveEnergy;
  speed: number;
}

export interface VoiceStudioTuneSectionProps {
  baseProfile?: MveVoiceProfile | null;
  isBusy: boolean;
  disabled?: boolean;
  onSubmit: (options: VoiceTuneSubmitOptions) => void;
}

export function VoiceStudioTuneSection({
  baseProfile,
  isBusy,
  disabled,
  onSubmit,
}: VoiceStudioTuneSectionProps) {
  const [tuneDescription, setTuneDescription] = useState("");
  const [pitch, setPitch] = useState<MveVoiceAttributes["pitch"]>("medium");
  const [pace, setPace] = useState<MvePace>("medium");
  const [energy, setEnergy] = useState<MveEnergy>("medium");
  const [speed, setSpeed] = useState(1);

  const blockedReason = voiceTuneBlockedReason(baseProfile);
  const canSubmit =
    !disabled && !blockedReason && !isBusy && Boolean(baseProfile?.id);

  return (
    <div
      className="space-y-3 rounded-lg border border-border bg-muted/10 p-3"
      data-testid="voice-studio-tune"
    >
      <p className="text-xs font-semibold text-foreground">Stimme tunen</p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Erzeugt ein neues VoiceProfile — die Basis-Stimme bleibt unverändert.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="mve-tune-description" className="text-[11px]">
          Anpassung (optional)
        </Label>
        <Textarea
          id="mve-tune-description"
          value={tuneDescription}
          onChange={(e) => setTuneDescription(e.target.value)}
          placeholder="z. B. tiefer, ruhiger, seriöser"
          className="min-h-[56px] text-xs"
          disabled={!canSubmit && Boolean(blockedReason)}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-[11px]">
          <span className="text-muted-foreground">Pitch</span>
          <select
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            value={pitch ?? "medium"}
            onChange={(e) =>
              setPitch(e.target.value as MveVoiceAttributes["pitch"])
            }
            disabled={!canSubmit && Boolean(blockedReason)}
          >
            {PITCH_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-[11px]">
          <span className="text-muted-foreground">Tempo</span>
          <select
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            value={pace}
            onChange={(e) => setPace(e.target.value as MvePace)}
            disabled={!canSubmit && Boolean(blockedReason)}
          >
            {PACE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-[11px]">
          <span className="text-muted-foreground">Energie</span>
          <select
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
            value={energy}
            onChange={(e) => setEnergy(e.target.value as MveEnergy)}
            disabled={!canSubmit && Boolean(blockedReason)}
          >
            {ENERGY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-[11px]">
          <span className="text-muted-foreground">
            Speed ({speed.toFixed(2)}×)
          </span>
          <input
            type="range"
            min={0.75}
            max={1.25}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full"
            disabled={!canSubmit && Boolean(blockedReason)}
          />
        </label>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={!canSubmit}
        onClick={() =>
          onSubmit({
            tuneDescription,
            pitch,
            pace,
            energy,
            speed,
          })
        }
      >
        {isBusy ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Tune wird erstellt…
          </>
        ) : (
          <>
            <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
            Getunte Stimme erstellen
          </>
        )}
      </Button>

      {blockedReason ? (
        <p className="text-[11px] text-muted-foreground">{blockedReason}</p>
      ) : null}
    </div>
  );
}
