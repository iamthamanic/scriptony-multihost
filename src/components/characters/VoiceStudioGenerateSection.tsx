/**
 * Voice Studio generate section — suggest Kokoro voice from description (MVP 0.4).
 * Location: src/components/characters/VoiceStudioGenerateSection.tsx
 */

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface VoiceStudioGenerateSectionProps {
  description: string;
  isBusy: boolean;
  disabled?: boolean;
  hint?: string;
  onSuggest: () => void;
}

export function VoiceStudioGenerateSection({
  description,
  isBusy,
  disabled,
  hint,
  onSuggest,
}: VoiceStudioGenerateSectionProps) {
  const canSuggest = !disabled && description.trim().length > 0 && !isBusy;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-3">
      <p className="text-xs font-semibold text-foreground">
        Stimme aus Beschreibung
      </p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Beschreibung oben eingeben, dann passende Kokoro-Stimme vorschlagen
        (Attribut-Matching, kein Prompt-to-Voice).
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={!canSuggest}
        onClick={onSuggest}
      >
        {isBusy ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Stimme wird zugeordnet…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Stimme vorschlagen
          </>
        )}
      </Button>
      {hint ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-500">{hint}</p>
      ) : null}
    </div>
  );
}
