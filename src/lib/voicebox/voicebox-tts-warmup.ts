/**
 * Proactive Qwen TTS warm-up via Voicebox (loads model into RAM before user generates).
 * Location: src/lib/voicebox/voicebox-tts-warmup.ts
 */

import {
  ensureVoiceboxSidecar,
  generateVoiceboxSpeech,
  getVoiceboxHealth,
  listVoiceboxProfiles,
} from "@/lib/api/voicebox-api";
import type { LoadingProgressReporter } from "@/lib/loading/global-loading-progress";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { shouldHideVoiceboxModelLoadingHint } from "./voicebox-model-ready-signal";

export const VOICEBOX_TTS_WARMUP_TEXT = "Ja.";
export const VOICEBOX_QWEN_TTS_ENGINE = "qwen_custom_voice";

export interface VoiceboxTtsWarmupResult {
  warmed: boolean;
  skipped: boolean;
  reason?: string;
}

export interface WarmUpVoiceboxQwenTtsParams {
  projectDir: string;
  profileId?: string;
  onProgress?: LoadingProgressReporter;
}

let inFlightWarmup: Promise<VoiceboxTtsWarmupResult> | null = null;

async function resolveWarmupProfileId(
  explicitProfileId?: string,
): Promise<string | null> {
  const trimmed = explicitProfileId?.trim();
  if (trimmed) return trimmed;

  const profiles = await listVoiceboxProfiles();
  for (const profile of profiles) {
    const id = profile.id?.trim();
    if (id) return id;
  }
  return null;
}

export async function warmUpVoiceboxQwenTts(
  params: WarmUpVoiceboxQwenTtsParams,
): Promise<VoiceboxTtsWarmupResult> {
  if (!isDesktopShell()) {
    return { warmed: false, skipped: true, reason: "not-desktop" };
  }

  const projectDir = params.projectDir.trim();
  if (!projectDir) {
    return { warmed: false, skipped: true, reason: "no-project" };
  }

  await ensureVoiceboxSidecar(params.onProgress);

  const health = await getVoiceboxHealth();
  if (health?.model_loaded || shouldHideVoiceboxModelLoadingHint()) {
    return { warmed: true, skipped: true, reason: "already-warm" };
  }

  const profileId = await resolveWarmupProfileId(params.profileId);
  if (!profileId) {
    return { warmed: false, skipped: true, reason: "no-profile" };
  }

  params.onProgress?.({
    percent: 18,
    message: "Qwen TTS-Modell wird vorbereitet…",
    phase: "synthesis",
  });

  try {
    await generateVoiceboxSpeech({
      text: VOICEBOX_TTS_WARMUP_TEXT,
      profileId,
      language: "de",
      projectDir,
      engine: VOICEBOX_QWEN_TTS_ENGINE,
      onProgress: params.onProgress,
    });
    return { warmed: true, skipped: false };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { warmed: false, skipped: false, reason };
  }
}

/** Single shared warm-up — avoids duplicate Qwen loads when modal/effects fire twice. */
export function warmUpVoiceboxQwenTtsDeduped(
  params: WarmUpVoiceboxQwenTtsParams,
): Promise<VoiceboxTtsWarmupResult> {
  if (!inFlightWarmup) {
    inFlightWarmup = warmUpVoiceboxQwenTts(params).finally(() => {
      inFlightWarmup = null;
    });
  }
  return inFlightWarmup;
}

/** @internal test-only */
export function resetVoiceboxTtsWarmupForTests(): void {
  inFlightWarmup = null;
}
