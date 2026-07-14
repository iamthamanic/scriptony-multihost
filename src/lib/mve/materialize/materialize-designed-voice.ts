/**
 * Materialize a Qwen VoiceDesign candidate into a persisted MveVoiceProfile + Voicebox clone.
 * Location: src/lib/mve/materialize/materialize-designed-voice.ts
 */

import {
  createMveVoiceProfile,
  getMveVoiceProfiles,
  updateMveVoiceProfile,
} from "@/lib/api-adapter/mve-adapter";
import { requireLocalBackend } from "@/lib/api-adapter/runtime-dispatch";
import {
  createVoiceboxProfile,
  ensureVoiceboxAvailable,
  uploadVoiceboxProfileSample,
} from "@/lib/api/voicebox-api";
import { DEFAULT_VOICE_ENGINE } from "@/lib/config/voice-engine";
import { qwenVoiceDesignAdapter } from "@/lib/multi-voice-engine/adapters/qwen-voice-design.adapter";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import { readVoiceRefAudioFromProject } from "@/lib/mve/safety/read-voice-ref-audio";
import { isDesktopShell } from "@/runtime/detect-runtime";

export const QWEN_VOICE_DESIGN_MODEL = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign";

export interface MaterializeDesignedVoiceParams {
  projectId: string;
  sessionId: string;
  candidateId: string;
  name: string;
  previewText: string;
  characterId?: string;
  language?: string;
}

export interface MaterializeDesignedVoiceResult {
  profile: MveVoiceProfile;
  baseVoiceId: string;
}

function assertDesktopProject(): string {
  if (!isDesktopShell()) {
    throw new Error("Voice-Materialize nur in der Desktop-App verfügbar.");
  }
  const backend = requireLocalBackend();
  return backend.localProject.dirPath;
}

export async function assertUniqueVoiceNameInProject(
  projectId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Bitte einen Namen für die Stimme eingeben.");
  }
  const normalized = trimmed.toLowerCase();
  const existing = await getMveVoiceProfiles(projectId);
  if (
    existing.some((profile) => profile.name.trim().toLowerCase() === normalized)
  ) {
    throw new Error(
      "Eine Stimme mit diesem Namen existiert bereits im Projekt.",
    );
  }
}

async function cloneDesignedVoiceViaVoicebox(params: {
  name: string;
  identityPrompt: string;
  language: string;
  referenceAudioUrl: string;
  referenceText: string;
}): Promise<string> {
  await ensureVoiceboxAvailable();

  const created = await createVoiceboxProfile({
    name: params.name,
    description: params.identityPrompt.slice(0, 500),
    language: params.language,
    voiceType: "cloned",
  });

  const { bytes, fileName } = await readVoiceRefAudioFromProject(
    params.referenceAudioUrl,
  );

  await uploadVoiceboxProfileSample({
    profileId: created.id,
    file: new Blob([new Uint8Array(bytes)]),
    fileName,
    referenceText: params.referenceText,
  });

  return created.id;
}

export async function materializeDesignedVoice(
  params: MaterializeDesignedVoiceParams,
): Promise<MaterializeDesignedVoiceResult> {
  const projectDir = assertDesktopProject();
  const voiceName = params.name.trim();
  const previewText = params.previewText.trim();

  await assertUniqueVoiceNameInProject(params.projectId, voiceName);

  const materialized = await qwenVoiceDesignAdapter.materialize({
    sessionId: params.sessionId,
    candidateId: params.candidateId,
    name: voiceName,
    previewText,
    projectId: params.projectId,
    projectDir,
  });

  const language = params.language?.trim() || "de";
  const draftProfile = await createMveVoiceProfile(params.projectId, {
    name: voiceName,
    characterId: params.characterId,
    language,
    engine: DEFAULT_VOICE_ENGINE,
    type: "generated",
    status: "processing",
    creationMode: "designed",
    provider: "qwen",
    model: QWEN_VOICE_DESIGN_MODEL,
    identityPrompt: materialized.identityPrompt,
    referenceAudioAssetId: materialized.referenceAudioAssetId,
    referenceAudioUrl: materialized.referenceAudioUrl,
    referenceText: materialized.referenceText,
    description: materialized.identityPrompt,
    previewText,
    consentStatus: "not_required",
  });

  try {
    const baseVoiceId = await cloneDesignedVoiceViaVoicebox({
      name: voiceName,
      identityPrompt: materialized.identityPrompt,
      language,
      referenceAudioUrl: materialized.referenceAudioUrl,
      referenceText: materialized.referenceText,
    });

    const profile = await updateMveVoiceProfile(draftProfile.id, {
      status: "ready",
      baseVoiceId,
    });

    return { profile, baseVoiceId };
  } catch (err) {
    await updateMveVoiceProfile(draftProfile.id, { status: "failed" });
    throw err;
  }
}
