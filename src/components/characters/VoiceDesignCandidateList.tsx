/**
 * Voice design preview candidates — play and save actions.
 * Location: src/components/characters/VoiceDesignCandidateList.tsx
 */

import { Loader2, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VoiceDesignCandidate } from "@/lib/mve/casting/voice-design-candidate";

export interface VoiceDesignCandidateListProps {
  candidates: VoiceDesignCandidate[];
  playingCandidateId?: string | null;
  savingCandidateId?: string | null;
  disabled?: boolean;
  onPlay: (candidate: VoiceDesignCandidate) => void;
  onSave: (candidate: VoiceDesignCandidate) => void;
}

export function VoiceDesignCandidateList({
  candidates,
  playingCandidateId,
  savingCandidateId,
  disabled,
  onPlay,
  onSave,
}: VoiceDesignCandidateListProps) {
  if (candidates.length === 0) return null;

  return (
    <div
      className="space-y-2 rounded-lg border border-border bg-muted/5 p-3"
      data-testid="voice-design-candidates"
    >
      <p className="text-xs font-semibold text-foreground">
        Stimm-Kandidaten — anhören und speichern
      </p>
      <ul className="space-y-2">
        {candidates.map((candidate) => {
          const isPlaying = playingCandidateId === candidate.id;
          const isSaving = savingCandidateId === candidate.id;
          const canPlay = Boolean(candidate.previewAudioPath) && !disabled;
          return (
            <li
              key={candidate.id}
              className="flex items-center gap-2 rounded-md border border-border/70 bg-background/60 px-2 py-1.5"
              data-testid={`voice-design-candidate-${candidate.index}`}
            >
              <span className="w-6 text-xs font-bold text-muted-foreground">
                {candidate.label}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 flex-1 justify-start"
                disabled={!canPlay || isPlaying || isSaving}
                onClick={() => onPlay(candidate)}
                aria-label={`Kandidat ${candidate.label} abspielen`}
              >
                {isPlaying ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="mr-2 h-3.5 w-3.5" />
                )}
                Anhören
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-8"
                disabled={disabled || isSaving || isPlaying}
                onClick={() => onSave(candidate)}
                data-testid={`voice-design-save-${candidate.index}`}
              >
                {isSaving ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3.5 w-3.5" />
                )}
                Speichern
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
