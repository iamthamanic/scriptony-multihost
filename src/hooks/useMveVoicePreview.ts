/**
 * Local Voicebox preview playback for MVE character voice UI.
 * Location: src/hooks/useMveVoicePreview.ts
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  resolveVoiceEngineId,
  localVoiceEngineUserLabel,
  type LocalVoiceEngineId,
} from "@/lib/config/voice-engine";
import {
  createVoicePreviewAudioContext,
  playLocalVoicePreview,
} from "@/lib/mve/play-voice-preview";
import { mveDefaultPreviewForCharacter } from "@/lib/mve/default-preview-text";
import { useGlobalLoadingProgress } from "@/hooks/useGlobalLoadingProgress";

export function useMveVoicePreview() {
  const [isPlaying, setIsPlaying] = useState(false);
  const { runWithProgress } = useGlobalLoadingProgress();

  const playPreview = useCallback(
    (params: {
      projectDir?: string;
      voiceId?: string;
      characterName: string;
      previewText: string;
      speed?: number;
      engine?: LocalVoiceEngineId | string;
    }) => {
      if (!params.voiceId) {
        toast.info("Bitte zuerst eine Stimme zuweisen.");
        return;
      }
      if (!params.projectDir) {
        toast.error("Projektverzeichnis fehlt für die Vorschau.");
        return;
      }

      const engine = resolveVoiceEngineId(params.engine);
      const audioContext = createVoicePreviewAudioContext();
      setIsPlaying(true);

      void runWithProgress({
        id: `voice-preview-${engine}-${params.voiceId}`,
        title: `${localVoiceEngineUserLabel(engine)} Vorschau`,
        initialMessage: `${localVoiceEngineUserLabel(engine)} wird verbunden…`,
        initialPercent: 5,
        run: async (report) => {
          await playLocalVoicePreview({
            projectDir: params.projectDir!,
            voiceId: params.voiceId!,
            text:
              params.previewText.trim() ||
              mveDefaultPreviewForCharacter(params.characterName),
            speed: params.speed,
            engine,
            audioContext,
            onProgress: report,
          });
        },
      })
        .catch((err) => {
          toast.error(
            err instanceof Error
              ? err.message
              : "Vorschau konnte nicht abgespielt werden.",
          );
        })
        .finally(() => {
          setIsPlaying(false);
          void audioContext.close();
        });
    },
    [runWithProgress],
  );

  return { playPreview, isPlaying };
}
