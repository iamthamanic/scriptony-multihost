/**
 * Create a non-destructive tuned VoiceProfile from a base profile (MVP 0.4).
 * Location: src/lib/mve/tune/create-tuned-voice-profile.ts
 */

import { createMveVoiceProfile } from "@/lib/api-adapter/mve-adapter";
import { resolveMveTtsVoiceId } from "@/lib/mve/resolve-tts-voice-id";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";
import {
  mergeVoiceTuneAttributes,
  mergeVoiceTuneRenderSettings,
  type VoiceTuneSliderOverrides,
} from "./merge-voice-tune-attributes";

export interface CreateTunedVoiceProfileParams {
  projectId: string;
  baseProfile: MveVoiceProfile;
  tuneDescription?: string;
  name?: string;
  overrides?: VoiceTuneSliderOverrides;
}

export function canTuneVoiceProfile(
  profile: MveVoiceProfile | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.status === "blocked") return false;
  if (profile.type === "tuned") return false;
  return Boolean(resolveMveTtsVoiceId(profile));
}

export function voiceTuneBlockedReason(
  profile: MveVoiceProfile | null | undefined,
): string | undefined {
  if (canTuneVoiceProfile(profile)) return undefined;
  if (!profile) return "Kein VoiceProfile vorhanden.";
  if (profile.status === "blocked") {
    return "Basis-Stimme ist gesperrt — Tunen nicht möglich.";
  }
  if (profile.type === "tuned") {
    return "Nur eine Tune-Ebene erlaubt — wähle die Basis-Stimme.";
  }
  if (!resolveMveTtsVoiceId(profile)) {
    return "Basis-Stimme hat keine Voicebox-Zuordnung.";
  }
  return "Stimme kann nicht getunt werden.";
}

export async function createTunedVoiceProfile(
  params: CreateTunedVoiceProfileParams,
): Promise<MveVoiceProfile> {
  const base = params.baseProfile;
  const blocked = voiceTuneBlockedReason(base);
  if (blocked) {
    throw new Error(blocked);
  }

  const tuneDescription = params.tuneDescription?.trim() ?? "";
  const attributes = mergeVoiceTuneAttributes(
    base.attributes,
    tuneDescription,
    params.overrides,
  );
  const defaultSettings = mergeVoiceTuneRenderSettings(
    base.defaultSettings,
    params.overrides,
  );

  const name = params.name?.trim() || `${base.name.trim()} — tuned`;

  return createMveVoiceProfile(params.projectId, {
    name,
    characterId: base.characterId,
    engine: base.engine,
    language: base.language,
    type: "tuned",
    status: "ready",
    baseVoiceId: base.id,
    description: tuneDescription || base.description,
    attributes,
    defaultSettings,
    consentStatus: base.consentStatus,
    commercialUseAllowed: base.commercialUseAllowed,
    previewText: base.previewText,
  });
}
