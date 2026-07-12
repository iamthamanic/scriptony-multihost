/**
 * Feature Flags für schrittweise Einführung neuer Systeme.
 *
 * T27: AudioClip-System wird über Flag kontrolliert.
 * P0–P1: false (nur Dev/Staging)
 * P2+: true (Beta)
 */

export const FEATURE_FLAGS = {
  /**
   * AudioClip-System (T27–T33).
   * Wenn false: AudioTrack.startTime/duration sind aktiv (Legacy).
   * Wenn true: AudioClip.startSec/endSec sind aktiv (neu).
   */
  audioClipSystem: {
    enabled: import.meta.env.VITE_ENABLE_AUDIO_CLIP === "true" || false,
    rolloutPercentage: 0, // 0% = Dev only, 100% = all users
  },
} as const;

/** Check if a feature flag is active for the current environment. */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag].enabled;
}

/** AudioClip-System: env flag or Höspiel project (timeline embed always uses clips). */
export function isAudioClipSystemEnabled(projectType?: string | null): boolean {
  return (
    isFeatureEnabled("audioClipSystem") ||
    (projectType ?? "").toLowerCase() === "audio"
  );
}
