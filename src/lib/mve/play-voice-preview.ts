/**
 * Play a local/cloud TTS preview (Voicebox or ElevenLabs).
 * Location: src/lib/mve/play-voice-preview.ts
 */

import { ensureVoiceboxAvailable } from "@/lib/api/voicebox-api";
import {
  resolveVoiceEngineId,
  usesVoiceboxSidecar,
  type LocalVoiceEngineId,
} from "@/lib/config/voice-engine";
import type { LoadingProgressReporter } from "@/lib/loading/global-loading-progress";
import {
  PLAYBACK_PROGRESS,
  SYNTHESIS_PROGRESS,
} from "@/lib/mve/voice-preview-progress";
import { resolveLocalAudioPlaybackUrl } from "@/lib/local-audio-playback-url";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { resolveVoiceEngineAdapter } from "@/lib/multi-voice-engine/adapters";
import { minimalVoiceProfile } from "@/lib/mve/minimal-voice-profile";

function playUrlWithWebAudio(
  audioContext: AudioContext,
  url: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let blobUrl: string | null = null;
    const cleanup = () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };

    void (async () => {
      try {
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Audio konnte nicht geladen werden (${response.status}).`,
          );
        }

        const buffer = await audioContext.decodeAudioData(
          await response.arrayBuffer(),
        );
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.onended = () => {
          cleanup();
          resolve();
        };
        source.start(0);
      } catch (err) {
        cleanup();
        reject(err);
      }
    })();
  });
}

function playUrlWithHtmlAudio(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    const cleanup = () => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    };
    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Audio konnte nicht abgespielt werden."));
    };
    void audio.play().catch((err) => {
      cleanup();
      reject(err);
    });
  });
}

export async function playLocalVoicePreview(params: {
  projectDir: string;
  voiceId: string;
  text: string;
  speed?: number;
  engine?: LocalVoiceEngineId | string;
  audioContext?: AudioContext;
  onProgress?: LoadingProgressReporter;
}): Promise<void> {
  const engine = resolveVoiceEngineId(params.engine);

  if (engine !== "elevenlabs" && !isDesktopShell()) {
    throw new Error("Voice-Vorschau nur in der Desktop-App verfügbar.");
  }

  if (usesVoiceboxSidecar(engine)) {
    await ensureVoiceboxAvailable(params.onProgress);
  }

  params.onProgress?.(SYNTHESIS_PROGRESS);

  const adapter = resolveVoiceEngineAdapter(engine);
  const result = await adapter.renderLine({
    lineId: "mve_preview_line",
    text: params.text,
    language: "de",
    voice: minimalVoiceProfile(params.voiceId, engine, params.speed),
    takeIndex: 0,
    projectDir: params.projectDir,
  });

  if (!result.audioUrl?.trim()) {
    throw new Error("TTS-Adapter hat keine Audio-Datei erzeugt.");
  }

  params.onProgress?.(PLAYBACK_PROGRESS);
  const playbackUrl = await resolveLocalAudioPlaybackUrl(result.audioUrl);

  if (params.audioContext) {
    await playUrlWithWebAudio(params.audioContext, playbackUrl);
    return;
  }

  await playUrlWithHtmlAudio(playbackUrl);
}

/** Call synchronously from a click handler before any await (autoplay unlock). */
export function createVoicePreviewAudioContext(): AudioContext {
  const ctx = new AudioContext();
  void ctx.resume();
  return ctx;
}
