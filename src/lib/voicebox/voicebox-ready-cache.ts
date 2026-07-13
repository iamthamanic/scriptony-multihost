/**
 * Session cache — skip full Voicebox boot poll when recently healthy.
 * Location: src/lib/voicebox/voicebox-ready-cache.ts
 */

const VOICEBOX_READY_CACHE_TTL_MS = 5 * 60 * 1000;

let lastHealthyAt = 0;

export function markVoiceboxSessionReady(): void {
  lastHealthyAt = Date.now();
}

export function clearVoiceboxSessionReady(): void {
  lastHealthyAt = 0;
}

export function isVoiceboxSessionReady(): boolean {
  return (
    lastHealthyAt > 0 &&
    Date.now() - lastHealthyAt < VOICEBOX_READY_CACHE_TTL_MS
  );
}

/** @internal */
export function voiceboxReadyCacheTtlMs(): number {
  return VOICEBOX_READY_CACHE_TTL_MS;
}
