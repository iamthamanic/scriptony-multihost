/**
 * TTS-Generate-Button — Standalone-Komponente für Audio-Tracks.
 *
 * T31: TTS-Pipeline und Audio-Generierung.
 * Verwendet useTtsGeneration Hook direkt, um die AudioDropdown
 * Prop-Chain nicht aufzublähen.
 */

import { useState, useCallback } from "react";
import { Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTtsGeneration } from "../../hooks/useTtsGeneration";
import { cn } from "../../lib/utils";
import { isFeatureEnabled } from "../../lib/feature-flags";

interface TtsGenerateButtonProps {
  trackId: string;
  sceneId: string;
  clipId?: string;
  text: string;
  voiceId?: string;
  hasTTS: boolean;
  isAmbiguous?: boolean;
  className?: string;
}

export function TtsGenerateButton({
  trackId,
  sceneId,
  clipId,
  text,
  voiceId,
  hasTTS,
  isAmbiguous,
  className,
}: TtsGenerateButtonProps) {
  const { startTts, isGenerating } = useTtsGeneration({
    sceneId,
  });
  const [isPending, setIsPending] = useState(false);

  const isBusy = isGenerating || isPending;
  const canGenerate = Boolean(
    hasTTS && text?.trim() && voiceId?.trim() && !isBusy && !isAmbiguous,
  );

  const handleGenerate = useCallback(async () => {
    if (!isFeatureEnabled("audioClipSystem")) {
      toast.info("TTS-Pipeline ist noch nicht aktiviert.");
      return;
    }
    if (isAmbiguous || !clipId) {
      toast.info("Mehrere oder keine Clips gefunden — TTS-Ziel ist unklar.");
      return;
    }
    if (!text?.trim()) {
      toast.info("Kein Text vorhanden zum Generieren.");
      return;
    }
    if (!voiceId?.trim()) {
      toast.info("Keine TTS-Voice zugewiesen. Bitte Voice zuweisen.");
      return;
    }
    setIsPending(true);
    try {
      await startTts({
        trackId,
        clipId,
        text,
        voiceId,
      });
    } finally {
      setIsPending(false);
    }
  }, [trackId, clipId, text, voiceId, isAmbiguous, startTts]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleGenerate();
      }}
      disabled={!canGenerate}
      className={cn(
        "shrink-0 p-1 rounded transition-colors",
        canGenerate
          ? "hover:bg-emerald-100 text-emerald-600 dark:hover:bg-emerald-900/40 dark:text-emerald-400"
          : "opacity-40 cursor-not-allowed text-muted-foreground",
        className,
      )}
      title={
        !hasTTS
          ? "Kein TTS-Track"
          : isAmbiguous
            ? "Kein eindeutiger Clip — TTS nicht möglich"
            : !text?.trim()
              ? "Kein Text vorhanden"
              : !voiceId?.trim()
                ? "Keine Voice zugewiesen"
                : isBusy
                  ? "Wird generiert…"
                  : "TTS generieren"
      }
      aria-label="TTS generieren"
    >
      {isBusy ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Mic className="size-3" />
      )}
    </button>
  );
}
