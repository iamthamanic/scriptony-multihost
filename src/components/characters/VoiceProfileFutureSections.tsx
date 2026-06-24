/**
 * Disabled Voice Studio 0.4 placeholders inside the voice editor modal.
 * Location: src/components/characters/VoiceProfileFutureSections.tsx
 */

import { Lock } from "lucide-react";

const FUTURE_ITEMS = [
  "Stimme aus Beschreibung generieren",
  "Stimme klonen",
  "Stimme tunen",
  "Performance Reference",
] as const;

export function VoiceProfileFutureSections() {
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/10 p-3">
      <p className="text-xs font-semibold text-muted-foreground">
        Voice Studio (MVP 0.4)
      </p>
      <ul className="space-y-1.5">
        {FUTURE_ITEMS.map((label) => (
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
  );
}
