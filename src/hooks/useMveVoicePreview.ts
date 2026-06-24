/**
 * Local Kokoro preview playback for MVE character voice UI.
 * Location: src/hooks/useMveVoicePreview.ts
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { playLocalVoicePreview } from "@/lib/mve/play-voice-preview";
import { mveDefaultPreviewForCharacter } from "@/lib/mve/default-preview-text";

export function useMveVoicePreview() {
  const [isPlaying, setIsPlaying] = useState(false);

  const playPreview = useCallback(
    async (params: {
      projectDir?: string;
      voiceId?: string;
      characterName: string;
      previewText: string;
    }) => {
      if (!params.voiceId) {
        toast.info("Bitte zuerst eine Stimme zuweisen.");
        return;
      }
      if (!params.projectDir) {
        toast.error("Projektverzeichnis fehlt für die Vorschau.");
        return;
      }
      setIsPlaying(true);
      try {
        await playLocalVoicePreview({
          projectDir: params.projectDir,
          voiceId: params.voiceId,
          text:
            params.previewText.trim() ||
            mveDefaultPreviewForCharacter(params.characterName),
        });
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Vorschau konnte nicht abgespielt werden.",
        );
      } finally {
        setIsPlaying(false);
      }
    },
    [],
  );

  return { playPreview, isPlaying };
}
