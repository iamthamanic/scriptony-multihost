/**
 * Remaining locked Voice Studio 0.4 placeholders (clone, tune, perf ref).
 * Location: src/components/characters/VoiceProfileFutureSections.tsx
 */

import { Lock } from "lucide-react";
import { VoiceStudioGenerateSection } from "./VoiceStudioGenerateSection";

const LOCKED_ITEMS = [
  "Stimme klonen",
  "Stimme tunen",
  "Performance Reference",
] as const;

export interface VoiceProfileFutureSectionsProps {
  description: string;
  generateBusy?: boolean;
  generateDisabled?: boolean;
  generateHint?: string;
  onSuggestFromDescription?: () => void;
}

export function VoiceProfileFutureSections({
  description,
  generateBusy = false,
  generateDisabled,
  generateHint,
  onSuggestFromDescription,
}: VoiceProfileFutureSectionsProps) {
  return (
    <div className="space-y-2">
      <VoiceStudioGenerateSection
        description={description}
        isBusy={generateBusy}
        disabled={generateDisabled}
        hint={generateHint}
        onSuggest={() => onSuggestFromDescription?.()}
      />

      <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/10 p-3">
        <p className="text-xs font-semibold text-muted-foreground">
          Voice Studio (demnächst)
        </p>
        <ul className="space-y-1.5">
          {LOCKED_ITEMS.map((label) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-background/50 px-2 py-1.5 text-xs text-muted-foreground"
            >
              <Lock className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
