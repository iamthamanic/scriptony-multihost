/**
 * Preview voice design candidates (3 ephemeral Voicebox designed profiles).
 * Location: src/lib/mve/casting/preview-voice-design-candidates.ts
 */

import {
  createDesignedVoiceboxProfile,
  deleteVoiceboxProfile,
  ensureVoiceboxSidecar,
} from "@/lib/api/voicebox-api";
import type { LoadingProgressReporter } from "@/lib/loading/global-loading-progress";
import type { MveVoiceDesignSpec } from "@/lib/multi-voice-engine/schema/voice-design-spec";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { compileVoiceDesignPrompt } from "./compile-voice-design-prompt";
import {
  VOICE_DESIGN_PREVIEW_COUNT,
  VOICE_DESIGN_PREVIEW_NAME_PREFIX,
  voiceDesignCandidateLabel,
  type VoiceDesignCandidate,
  type VoiceDesignPreviewSession,
} from "./voice-design-candidate";

export interface PreviewVoiceDesignCandidatesParams {
  characterName: string;
  basicDescription?: string;
  designSpec?: MveVoiceDesignSpec | null;
  previewText?: string;
  projectDir: string;
  count?: number;
  onProgress?: LoadingProgressReporter;
}

export async function previewVoiceDesignCandidates(
  params: PreviewVoiceDesignCandidatesParams,
): Promise<VoiceDesignPreviewSession> {
  if (!isDesktopShell()) {
    throw new Error("Prompt-to-Voice nur in der Desktop-App verfügbar.");
  }

  const designPrompt = compileVoiceDesignPrompt({
    basicDescription: params.basicDescription,
    designSpec: params.designSpec,
  });
  if (!designPrompt) {
    throw new Error("Bitte zuerst eine Stimmbeschreibung eingeben.");
  }

  const projectDir = params.projectDir.trim();
  if (!projectDir) {
    throw new Error("Lokales Projekt erforderlich für Voicebox.");
  }

  await ensureVoiceboxSidecar(params.onProgress);

  const sessionId = crypto.randomUUID();
  const count = params.count ?? VOICE_DESIGN_PREVIEW_COUNT;

  const candidates: VoiceDesignCandidate[] = [];

  for (let index = 0; index < count; index += 1) {
    params.onProgress?.({
      percent: 10 + Math.round((index / count) * 80),
      message: `Kandidat ${index + 1}/${count} wird erzeugt…`,
      phase: "voice-design",
    });

    const profile = await createDesignedVoiceboxProfile({
      name: `${VOICE_DESIGN_PREVIEW_NAME_PREFIX}${sessionId}-${index}`,
      designPrompt,
      language: "de",
      description: designPrompt.slice(0, 500),
    });

    candidates.push({
      id: `${sessionId}-${index}`,
      voiceboxProfileId: profile.id,
      index: index as 0 | 1 | 2,
      label: voiceDesignCandidateLabel(index),
    });
  }

  params.onProgress?.({
    percent: 95,
    message: "Stimm-Kandidaten bereit.",
    phase: "voice-design",
  });

  return {
    sessionId,
    designPrompt,
    designSpec: params.designSpec ?? null,
    candidates,
  };
}

export async function discardVoiceDesignPreviewSession(
  session: VoiceDesignPreviewSession | null | undefined,
): Promise<void> {
  if (!session?.candidates.length) return;
  await Promise.all(
    session.candidates.map((c) =>
      deleteVoiceboxProfile(c.voiceboxProfileId).catch(() => undefined),
    ),
  );
}

export async function discardVoiceDesignCandidatesExcept(
  session: VoiceDesignPreviewSession,
  keepVoiceboxProfileId: string,
): Promise<void> {
  const toDelete = session.candidates.filter(
    (c) => c.voiceboxProfileId !== keepVoiceboxProfileId,
  );
  await Promise.all(
    toDelete.map((c) =>
      deleteVoiceboxProfile(c.voiceboxProfileId).catch(() => undefined),
    ),
  );
}
