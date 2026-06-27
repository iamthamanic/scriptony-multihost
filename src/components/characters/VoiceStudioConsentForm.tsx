/**
 * Consent checkbox + version display for voice cloning (MVP 0.4).
 * Location: src/components/characters/VoiceStudioConsentForm.tsx
 */

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getVoiceCloneConsentDisplay } from "@/lib/mve/safety/consent-text";

export interface VoiceStudioConsentFormProps {
  consentConfirmed: boolean;
  commercialUseAllowed: boolean;
  onConsentConfirmedChange: (value: boolean) => void;
  onCommercialUseAllowedChange: (value: boolean) => void;
  disabled?: boolean;
}

export function VoiceStudioConsentForm({
  consentConfirmed,
  commercialUseAllowed,
  onConsentConfirmedChange,
  onCommercialUseAllowedChange,
  disabled,
}: VoiceStudioConsentFormProps) {
  const { version, text } = getVoiceCloneConsentDisplay();

  return (
    <div className="space-y-3 rounded-md border border-border bg-background/60 p-3">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {text}
      </p>
      <p className="text-[10px] text-muted-foreground">
        Consent-Version: {version}
      </p>
      <div className="flex items-start gap-2">
        <Checkbox
          id="voice-clone-consent"
          checked={consentConfirmed}
          disabled={disabled}
          onCheckedChange={(v) => onConsentConfirmedChange(v === true)}
        />
        <Label
          htmlFor="voice-clone-consent"
          className="text-xs leading-snug cursor-pointer"
        >
          Ich habe den Consent-Text gelesen und stimme zu.
        </Label>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id="voice-clone-commercial"
          checked={commercialUseAllowed}
          disabled={disabled}
          onCheckedChange={(v) => onCommercialUseAllowedChange(v === true)}
        />
        <Label
          htmlFor="voice-clone-commercial"
          className="text-xs leading-snug cursor-pointer"
        >
          Kommerzielle Nutzung erlaubt (optional)
        </Label>
      </div>
    </div>
  );
}
