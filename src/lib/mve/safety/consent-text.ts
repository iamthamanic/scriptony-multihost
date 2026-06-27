/**
 * Versioned voice-cloning consent copy (PRD §20).
 * Location: src/lib/mve/safety/consent-text.ts
 */

export const CONSENT_TEXT_VERSION = "2026-06-01";

export const VOICE_CLONE_CONSENT_TEXT = `Ich bestätige, dass ich berechtigt bin, diese Stimme für Voice Cloning in diesem Projekt zu verwenden. Ich habe die Einwilligung der betroffenen Person (oder meine eigene bei Selbstaufnahme) eingeholt. Die Referenz-Audio-Datei wird nur lokal im Projekt gespeichert und nicht öffentlich verbreitet.`;

export function getVoiceCloneConsentDisplay(version = CONSENT_TEXT_VERSION): {
  version: string;
  text: string;
} {
  return { version, text: VOICE_CLONE_CONSENT_TEXT };
}
