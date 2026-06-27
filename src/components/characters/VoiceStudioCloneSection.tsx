/**
 * Voice clone section — reference upload + consent (MVP 0.4).
 * Location: src/components/characters/VoiceStudioCloneSection.tsx
 */

import { useRef, useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceStudioConsentForm } from "./VoiceStudioConsentForm";
import {
  canStartVoiceClone,
  voiceCloneBlockedReason,
} from "@/lib/mve/safety/can-start-voice-clone";
import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

export interface VoiceStudioCloneSectionProps {
  profile?: MveVoiceProfile | null;
  latestConsent?: MveVoiceConsent | null;
  isBusy?: boolean;
  disabled?: boolean;
  onSubmit: (
    file: File,
    options: {
      consentConfirmed: boolean;
      commercialUseAllowed: boolean;
    },
  ) => void;
  onRevoke?: () => void;
  onStartClone?: () => void;
  isStartBusy?: boolean;
}

export function VoiceStudioCloneSection({
  profile,
  latestConsent,
  isBusy,
  disabled,
  onSubmit,
  onRevoke,
  onStartClone,
  isStartBusy = false,
}: VoiceStudioCloneSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [commercialUseAllowed, setCommercialUseAllowed] = useState(false);

  const cloneReady = canStartVoiceClone(profile, latestConsent);
  const blockReason = voiceCloneBlockedReason(profile, latestConsent);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-3">
      <p className="text-xs font-semibold text-foreground">Stimme klonen</p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Referenz-Audio (WAV/MP3, 30 s–5 min) hochladen und Consent bestätigen.
      </p>

      {cloneReady ? (
        <>
          <p className="text-[11px] text-green-600 dark:text-green-500">
            Consent verifiziert — Clone kann gestartet werden.
          </p>
          {profile?.status === "processing" ? (
            <p className="text-[11px] text-muted-foreground">Clone läuft…</p>
          ) : null}
          {profile?.status === "failed" ? (
            <p className="text-[11px] text-destructive">
              Clone fehlgeschlagen — erneut versuchen.
            </p>
          ) : null}
          {onStartClone ? (
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={
                disabled || isStartBusy || profile?.status === "processing"
              }
              onClick={onStartClone}
            >
              {isStartBusy || profile?.status === "processing" ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Klon wird vorbereitet…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Klonen starten
                </>
              )}
            </Button>
          ) : null}
        </>
      ) : blockReason ? (
        <p className="text-[11px] text-muted-foreground">{blockReason}</p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="audio/wav,audio/mpeg,audio/mp3,.wav,.mp3"
        className="hidden"
        onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={disabled || isBusy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-3.5 w-3.5" />
        {selectedFile ? selectedFile.name : "Referenz-Audio wählen"}
      </Button>

      <VoiceStudioConsentForm
        consentConfirmed={consentConfirmed}
        commercialUseAllowed={commercialUseAllowed}
        onConsentConfirmedChange={setConsentConfirmed}
        onCommercialUseAllowedChange={setCommercialUseAllowed}
        disabled={disabled || isBusy}
      />

      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={
          disabled ||
          isBusy ||
          !selectedFile ||
          !consentConfirmed ||
          !profile?.id
        }
        onClick={() => {
          if (!selectedFile) return;
          onSubmit(selectedFile, { consentConfirmed, commercialUseAllowed });
        }}
      >
        {isBusy ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Consent wird gespeichert…
          </>
        ) : (
          "Consent speichern"
        )}
      </Button>

      {cloneReady && onRevoke ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-destructive"
          disabled={disabled || isBusy}
          onClick={onRevoke}
        >
          Consent widerrufen
        </Button>
      ) : null}
    </div>
  );
}
