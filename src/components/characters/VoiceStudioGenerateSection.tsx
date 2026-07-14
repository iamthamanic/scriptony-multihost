/**
 * Voice Studio generate section — suggest from catalog or design new voice (MVP 0.4+).
 * Location: src/components/characters/VoiceStudioGenerateSection.tsx
 */

import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface VoiceStudioGenerateSectionProps {
  description: string;
  isBusy: boolean;
  disabled?: boolean;
  hint?: string;
  onSuggest: () => void;
  /** Prompt-to-Voice via Voicebox designed profile (desktop). */
  showDesign?: boolean;
  designDisabled?: boolean;
  onDesign?: () => void;
}

export function VoiceStudioGenerateSection({
  description,
  isBusy,
  disabled,
  hint,
  onSuggest,
  showDesign = false,
  designDisabled,
  onDesign,
}: VoiceStudioGenerateSectionProps) {
  const hasDescription = description.trim().length > 0;
  const canSuggest = !disabled && hasDescription && !isBusy;
  const canDesign =
    showDesign && !designDisabled && hasDescription && !isBusy && onDesign;

  return (
    <div
      className="space-y-2 rounded-lg border border-border bg-muted/10 p-3"
      data-testid="voice-studio-generate"
    >
      <p className="text-xs font-semibold text-foreground">
        Stimme aus Beschreibung
      </p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Beschreibung oben eingeben — dann entweder eine passende Stimme aus dem
        Katalog wählen oder eine neue Stimme in Voicebox erzeugen lassen.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          disabled={!canSuggest}
          onClick={onSuggest}
          data-testid="voice-studio-suggest"
        >
          {isBusy ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Wird verarbeitet…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Stimme vorschlagen
            </>
          )}
        </Button>
        {showDesign ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="flex-1"
            disabled={!canDesign}
            onClick={onDesign}
            data-testid="voice-studio-design"
          >
            {isBusy ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Wird verarbeitet…
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-3.5 w-3.5" />
                Stimme erzeugen
              </>
            )}
          </Button>
        ) : null}
      </div>
      {hint ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-500">{hint}</p>
      ) : null}
    </div>
  );
}
