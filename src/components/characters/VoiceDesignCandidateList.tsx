/**
 * Voice design preview candidates — play, save, and per-candidate regenerate.
 * Location: src/components/characters/VoiceDesignCandidateList.tsx
 */

import { useEffect } from "react";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useVoiceDesignCandidatePlayback } from "@/hooks/useVoiceDesignCandidatePlayback";
import type {
  VoiceDesignCandidate,
  VoiceDesignCandidateSynthesisProgress,
} from "@/lib/mve/casting/voice-design-candidate";
import { InlineTaskProgress } from "./InlineTaskProgress";
import { VoiceDesignCandidatePlayer } from "./VoiceDesignCandidatePlayer";

export interface VoiceDesignCandidateListProps {
  candidates: VoiceDesignCandidate[];
  synthesisProgress?: Record<string, VoiceDesignCandidateSynthesisProgress>;
  savingCandidateId?: string | null;
  regeneratingCandidateId?: string | null;
  disabled?: boolean;
  onSave: (candidate: VoiceDesignCandidate) => void;
  onRegenerate: (candidate: VoiceDesignCandidate) => void;
}

export function VoiceDesignCandidateList({
  candidates,
  synthesisProgress = {},
  savingCandidateId,
  regeneratingCandidateId,
  disabled,
  onSave,
  onRegenerate,
}: VoiceDesignCandidateListProps) {
  const playback = useVoiceDesignCandidatePlayback();

  useEffect(() => {
    for (const candidate of candidates) {
      const path = candidate.previewAudioPath?.trim();
      if (!path) continue;
      void playback.ensureLoaded(candidate.id, path).catch(() => undefined);
    }
  }, [candidates, playback.ensureLoaded]);

  if (candidates.length === 0) return null;

  const readyCount = candidates.filter((candidate) =>
    Boolean(candidate.previewAudioPath),
  ).length;
  const synthesizingCount = candidates.filter((candidate) => {
    const synth = synthesisProgress[candidate.id];
    return (
      synth?.status === "pending" ||
      synth?.status === "synthesizing" ||
      regeneratingCandidateId === candidate.id
    );
  }).length;

  const handleToggle = async (candidate: VoiceDesignCandidate) => {
    const path = candidate.previewAudioPath?.trim();
    if (!path) return;
    try {
      await playback.togglePlayback(candidate.id, path);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Vorschau fehlgeschlagen.",
      );
    }
  };

  return (
    <div
      className="space-y-2 rounded-lg border border-border bg-muted/5 p-3"
      data-testid="voice-design-candidates"
    >
      <p className="text-xs font-semibold text-foreground">
        Stimm-Kandidaten — anhören und speichern
      </p>
      <p className="text-[10px] text-muted-foreground leading-snug">
        {synthesizingCount > 0
          ? `${readyCount} bereit — ${synthesizingCount} in Arbeit. Bereite Kandidaten kannst du schon anhören.`
          : readyCount > 0 && readyCount < candidates.length
            ? `${readyCount} von ${candidates.length} bereit — fehlgeschlagene erneut erzeugen.`
            : "A, B und C sind drei unterschiedliche Varianten deiner Beschreibung."}
      </p>
      <ul className="space-y-2">
        {candidates.map((candidate) => {
          const synth = synthesisProgress[candidate.id];
          const isSaving = savingCandidateId === candidate.id;
          const isRegenerating = regeneratingCandidateId === candidate.id;
          const hasError =
            synth?.status === "error" || Boolean(candidate.errorMessage);
          const isSynthesizing =
            isRegenerating ||
            synth?.status === "pending" ||
            synth?.status === "synthesizing";
          const isReady = Boolean(candidate.previewAudioPath);
          const canSave = isReady && !isSynthesizing;
          const playerView = playback.getView(candidate.id);

          return (
            <li
              key={candidate.id}
              className="flex items-start gap-2 rounded-md border border-border/70 bg-background/60 px-2 py-1.5"
              data-testid={`voice-design-candidate-${candidate.index}`}
            >
              <span className="mt-1.5 w-6 text-xs font-bold text-muted-foreground">
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
              ) : isReady ? (
                <VoiceDesignCandidatePlayer
                  candidateIndex={candidate.index}
                  candidateLabel={candidate.label}
                  audioPath={candidate.previewAudioPath!}
                  view={playerView}
                  disabled={disabled}
                  onToggle={() => void handleToggle(candidate)}
                  onSeek={(ratio) =>
                    void playback.seek(
                      candidate.id,
                      candidate.previewAudioPath!,
                      ratio,
                    )
                  }
                />
              ) : null}
              <Button
                type="button"
                variant="default"
                size="sm"
                className="mt-0.5 h-8 shrink-0"
                disabled={isSaving || !canSave || isRegenerating}
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
