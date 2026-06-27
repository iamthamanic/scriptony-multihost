/**
 * Guard whether a voice clone operation may start (consent + profile state).
 * Location: src/lib/mve/safety/can-start-voice-clone.ts
 */

import type { MveVoiceConsent } from "@/lib/multi-voice-engine/schema/voice-consent";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

export function canStartVoiceClone(
  profile: MveVoiceProfile | null | undefined,
  latestConsent?: MveVoiceConsent | null,
): boolean {
  if (!profile) return false;
  if (profile.status === "blocked") return false;
  if (
    profile.consentStatus === "blocked" ||
    profile.consentStatus === "rejected"
  ) {
    return false;
  }
  if (profile.consentStatus !== "verified") return false;
  if (!profile.referenceAudioUrl?.trim()) return false;
  if (!latestConsent || latestConsent.status !== "verified") return false;
  if (!latestConsent.sourceAudioHash) return false;
  return true;
}

export function voiceCloneBlockedReason(
  profile: MveVoiceProfile | null | undefined,
  latestConsent?: MveVoiceConsent | null,
): string | undefined {
  if (canStartVoiceClone(profile, latestConsent)) return undefined;
  if (!profile) return "Kein VoiceProfile vorhanden.";
  if (profile.status === "blocked" || profile.consentStatus === "blocked") {
    return "Stimme ist gesperrt — Clone nicht möglich.";
  }
  if (profile.consentStatus === "rejected") {
    return "Consent abgelehnt — bitte erneut bestätigen.";
  }
  if (profile.consentStatus !== "verified") {
    return "Bitte zuerst Consent bestätigen und Referenz-Audio hochladen.";
  }
  if (!profile.referenceAudioUrl) {
    return "Referenz-Audio fehlt.";
  }
  if (!latestConsent?.sourceAudioHash) {
    return "Consent-Record unvollständig (Hash fehlt).";
  }
  return "Clone derzeit nicht möglich.";
}
