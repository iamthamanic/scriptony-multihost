/**
 * Session signal when Voicebox TTS has run successfully (model warm / health stale).
 * Location: src/lib/voicebox/voicebox-model-ready-signal.ts
 */

type Listener = () => void;

let ttsSucceededThisSession = false;
const listeners = new Set<Listener>();

export function markVoiceboxTtsSucceeded(): void {
  ttsSucceededThisSession = true;
  for (const listener of listeners) {
    listener();
  }
}

export function shouldHideVoiceboxModelLoadingHint(): boolean {
  return ttsSucceededThisSession;
}

export function subscribeVoiceboxModelRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only reset — avoids cross-test session leakage. */
export function resetVoiceboxModelReadySignalForTests(): void {
  ttsSucceededThisSession = false;
}

export function notifyVoiceboxModelRefresh(): void {
  for (const listener of listeners) {
    listener();
  }
}
