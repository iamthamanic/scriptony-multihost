/**
 * Local voice clone request lifecycle — wires Voicebox sample upload when engine=voicebox.
 * Location: src/lib/mve/clone/request-voice-clone.ts
 */

import {
  createMveVoiceRequest,
  getLatestVerifiedMveVoiceConsent,
  getMveVoiceProfile,
  updateMveVoiceProfile,
  updateMveVoiceRequest,
} from "@/lib/api-adapter/mve-adapter";
import {
  canStartVoiceClone,
  voiceCloneBlockedReason,
} from "@/lib/mve/safety/can-start-voice-clone";
import { readVoiceRefAudioFromProject } from "@/lib/mve/safety/read-voice-ref-audio";
import {
  createVoiceboxProfile,
  ensureVoiceboxAvailable,
  uploadVoiceboxProfileSample,
} from "@/lib/api/voicebox-api";
import { resolveVoiceEngineId } from "@/lib/config/voice-engine";
import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import {
  MveCloneVoiceInputSchema,
  type MveCloneVoiceInput,
  type MveVoiceRequest,
} from "@/lib/multi-voice-engine/schema/voice-operations";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

export interface RequestVoiceCloneParams {
  projectId: string;
  voiceProfileId: string;
  name?: string;
}

export interface RequestVoiceCloneResult {
  profile: MveVoiceProfile;
  request: MveVoiceRequest;
}

export function buildCloneVoiceInput(
  projectId: string,
  profile: MveVoiceProfile,
  consent: MveVoiceConsent,
  name?: string,
): MveCloneVoiceInput {
  return MveCloneVoiceInputSchema.parse({
    projectId,
    name: name?.trim() || profile.name,
    language: profile.language,
    referenceAudioUrl: profile.referenceAudioUrl,
    sourceAudioHash: consent.sourceAudioHash,
    consentId: consent.id,
    commercialUseAllowed: consent.commercialUseAllowed,
  });
}

async function runVoiceboxClone(profile: MveVoiceProfile): Promise<string> {
  await ensureVoiceboxAvailable();

  let voiceboxProfileId = profile.baseVoiceId?.trim();
  if (!voiceboxProfileId) {
    const created = await createVoiceboxProfile({
      name: profile.name,
      description: profile.description,
      language: profile.language,
      voiceType: "cloned",
    });
    voiceboxProfileId = created.id;
  }

  if (!profile.referenceAudioUrl?.trim()) {
    throw new Error("Referenz-Audio fehlt für Voicebox Clone.");
  }

  const { bytes, fileName } = await readVoiceRefAudioFromProject(
    profile.referenceAudioUrl,
  );
  const referenceText =
    profile.previewText?.trim() || profile.description?.trim() || profile.name;

  await uploadVoiceboxProfileSample({
    profileId: voiceboxProfileId,
    file: new Blob([new Uint8Array(bytes)]),
    fileName,
    referenceText,
  });

  return voiceboxProfileId;
}

export async function requestVoiceClone(
  params: RequestVoiceCloneParams,
): Promise<RequestVoiceCloneResult> {
  const profile = await getMveVoiceProfile(params.voiceProfileId);
  if (!profile) {
    throw new Error("VoiceProfile nicht gefunden.");
  }

  const latestConsent = await getLatestVerifiedMveVoiceConsent(
    params.voiceProfileId,
  );
  const blocked = voiceCloneBlockedReason(profile, latestConsent);
  if (blocked || !canStartVoiceClone(profile, latestConsent)) {
    throw new Error(blocked ?? "Clone derzeit nicht möglich.");
  }

  const cloneInput = buildCloneVoiceInput(
    params.projectId,
    profile,
    latestConsent!,
    params.name,
  );

  const request = await createMveVoiceRequest(params.projectId, {
    operationType: "clone",
    voiceProfileId: params.voiceProfileId,
    status: "processing",
    inputJson: JSON.stringify(cloneInput),
  });

  await updateMveVoiceProfile(params.voiceProfileId, {
    status: "processing",
    type: "cloned",
  });

  try {
    const engine = resolveVoiceEngineId(profile.engine);
    let baseVoiceId = profile.baseVoiceId;

    if (engine === "voicebox") {
      baseVoiceId = await runVoiceboxClone(profile);
    } else {
      throw new Error(
        `Voice Clone für Engine „${engine}“ ist noch nicht implementiert.`,
      );
    }

    const completedRequest = await updateMveVoiceRequest(request.id, {
      status: "completed",
    });

    const readyProfile = await updateMveVoiceProfile(params.voiceProfileId, {
      status: "ready",
      type: "cloned",
      engine,
      baseVoiceId,
      version: (profile.version ?? 1) + 1,
    });

    return { profile: readyProfile, request: completedRequest };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Clone fehlgeschlagen.";
    await updateMveVoiceRequest(request.id, {
      status: "failed",
      errorMessage: message,
    });
    await updateMveVoiceProfile(params.voiceProfileId, {
      status: "failed",
    });
    throw err;
  }
}
