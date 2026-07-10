/**
 * MVE voice engine adapters barrel.
 * Location: src/lib/multi-voice-engine/adapters/index.ts
 */

import { dummyVoiceEngineAdapter } from "./dummy.adapter";
import { kokoroVoiceEngineAdapter } from "./kokoro.adapter";
import { voiceboxVoiceEngineAdapter } from "./voicebox.adapter";
import { getDefaultVoiceEngineRegistry } from "./registry";

export * from "./voice-engine-adapter";
export * from "./registry";
export * from "./kokoro.adapter";
export * from "./voicebox.adapter";
export * from "./dummy.adapter";

/** Register built-in local adapters once. */
export function registerDefaultVoiceEngineAdapters(): void {
  const registry = getDefaultVoiceEngineRegistry();
  if (!registry.has("voicebox")) {
    registry.register(voiceboxVoiceEngineAdapter);
  }
  if (!registry.has("kokoro")) {
    registry.register(kokoroVoiceEngineAdapter);
  }
  if (!registry.has("dummy")) {
    registry.register(dummyVoiceEngineAdapter);
  }
}

registerDefaultVoiceEngineAdapters();
