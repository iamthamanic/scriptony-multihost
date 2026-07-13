/**
 * Voice design preview candidates — play, save, and per-candidate regenerate.
 * Location: src/components/characters/VoiceDesignCandidateList.tsx
 */

import { Loader2, Play, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  VoiceDesignCandidate,
  VoiceDesignCandidateSynthesisProgress,
} from "@/lib/mve/casting/voice-design-candidate";
import { InlineTaskProgress } from "./InlineTaskProgress";

export interface VoiceDesignCandidateListProps {
  candidates: VoiceDesignCandidate[];
  synthesisProgress?: Record<string, VoiceDesignCandidateSynthesisProgress>;
  playingCandidateId?: string | null;
  savingCandidateId?: string | null;
  regeneratingCandidateId?: string | null;
  disabled?: boolean;
  onPlay: (candidate: VoiceDesignCandidate) => void;
  onSave: (candidate: VoiceDesignCandidate) => void;
  onRegenerate: (candidate: VoiceDesignCandidate) => void;
}

export function VoiceDesignCandidateList({
  candidates,
  synthesisProgress = {},
  playingCandidateId,
  savingCandidateId,
  regeneratingCandidateId,
  disabled,
  onPlay,
  onSave,
  onRegenerate,
}: VoiceDesignCandidateListProps) {
  if (candidates.length === 0) return null;

  const anySynthesizing = candidates.some((candidate) => {
    const synth = synthesisProgress[candidate.id];
    return (
      synth?.status === "pending" ||
      synth?.status === "synthesizing" ||
      (!candidate.previewAudioPath && synth?.status !== "error")
    );
  });

  return (
    <div
      className="space-y-2 rounded-lg border border-border bg-muted/5 p-3"
      data-testid="voice-design-candidates"
    >
      <p className="text-xs font-semibold text-foreground">
        Stimm-Kandidaten — anhören und speichern
      </p>
      <p className="text-[10px] text-muted-foreground leading-snug">
        {anySynthesizing
          ? "Vorschau-Sätze werden synthetisiert — Anhören ist danach verfügbar."
          : "A, B und C sind drei unterschiedliche Varianten deiner Beschreibung."}
      </p>
      <ul className="space-y-2">
        {candidates.map((candidate) => {
          const synth = synthesisProgress[candidate.id];
          const isPlaying = playingCandidateId === candidate.id;
          const isSaving = savingCandidateId === candidate.id;
          const isRegenerating = regeneratingCandidateId === candidate.id;
          const hasError = synth?.status === "error";
          const isSynthesizing =
            isRegenerating ||
            synth?.status === "pending" ||
            synth?.status === "synthesizing" ||
            (!candidate.previewAudioPath && !hasError);
          const isReady = Boolean(candidate.previewAudioPath);
          const canPlay =
            isReady && !disabled && !anySynthesizing && !isRegenerating;

          return (
            <li
              key={candidate.id}
              className="flex items-center gap-2 rounded-md border border-border/70 bg-background/60 px-2 py-1.5"
              data-testid={`voice-design-candidate-${candidate.index}`}
            >
              <span className="w-6 text-xs font-bold text-muted-foreground">
                {candidate.label}
              </span>
              {isSynthesizing ? (
                <InlineTaskProgress
                  className="min-w-0 flex-1 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
                  title={`Kandidat ${candidate.label}`}
                  message={synth?.message ?? "Wird synthetisiert…"}
                  percent={synth?.percent ?? 5}
                  testId={`voice-design-synth-${candidate.index}`}
                />
              ) : hasError ? (
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-[10px] text-destructive leading-snug">
                    {synth?.message ?? "Synthese fehlgeschlagen"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 justify-start"
                    disabled={disabled || isRegenerating}
                    onClick={() => onRegenerate(candidate)}
                    aria-label={`Kandidat ${candidate.label} erneut generieren`}
                    data-testid={`voice-design-regenerate-${candidate.index}`}
                  >
                    {isRegenerating ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    )}
                    Erneut generieren
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 flex-1 justify-start"
                  disabled={!canPlay || isPlaying || isSaving}
                  onClick={() => onPlay(candidate)}
                  aria-label={`Kandidat ${candidate.label} abspielen`}
                  data-testid={`voice-design-play-${candidate.index}`}
                >
                  {isPlaying ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-3.5 w-3.5" />
                  )}
                  Anhören
                </Button>
              )}
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-8"
                disabled={
                  disabled ||
                  isSaving ||
                  isPlaying ||
                  !isReady ||
                  isRegenerating
                }
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
