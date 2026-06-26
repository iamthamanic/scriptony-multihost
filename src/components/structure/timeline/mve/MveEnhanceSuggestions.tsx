/**
 * MVE Enhance Suggestions — shows confirmable/rejectable inline suggestions
 * produced by the per-line enhance hook (T27).
 *
 * Location: src/components/structure/timeline/mve/MveEnhanceSuggestions.tsx
 */

import { Check, X } from "lucide-react";
import { Button } from "../../../ui/button";
import { cn } from "../../../../lib/utils";
import type { MveEnhanceLineDraft } from "../../../../lib/multi-voice-engine/schema/enhance-script";

export interface MveEnhanceSuggestionsProps {
  suggestions: MveEnhanceLineDraft[] | null;
  onConfirm: (text: string) => void;
  onReject: () => void;
}

export function MveEnhanceSuggestions({
  suggestions,
  onConfirm,
  onReject,
}: MveEnhanceSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div
      className="rounded-md border border-border bg-muted/30 p-2 space-y-2"
      data-testid="mve-enhance-suggestions"
    >
      <p className="text-xs font-medium text-muted-foreground">
        Enhance-Vorschläge
      </p>
      {suggestions.map((line, index) => (
        <div
          key={`${index}-${line.text}-${line.characterTempId ?? ""}`}
          className="flex items-start gap-2"
        >
          <div className="flex-1 min-w-0">
            {line.characterTempId ? (
              <p className="text-xs font-medium text-foreground truncate">
                {line.characterTempId}:
              </p>
            ) : null}
            <p
              className={cn(
                "text-sm text-muted-foreground",
                !line.characterTempId && "text-foreground",
              )}
            >
              {line.text}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onConfirm(line.text)}
              aria-label="Vorschlag übernehmen"
              title="Übernehmen"
            >
              <Check className="size-4 text-primary" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onReject}
              aria-label="Vorschlag verwerfen"
              title="Verwerfen"
            >
              <X className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
