/**
 * MVE voice engine adapters barrel.
 * Location: src/lib/multi-voice-engine/adapters/index.ts
 */

import { dummyVoiceEngineAdapter } from "./dummy.adapter";
import { elevenlabsVoiceEngineAdapter } from "./elevenlabs.adapter";
import { voiceboxVoiceEngineAdapter } from "./voicebox.adapter";
import { getDefaultVoiceEngineRegistry } from "./registry";

export * from "./voice-engine-adapter";
export * from "./registry";
export * from "./voice-creation-adapter";
export * from "./voice-creation-registry";
export * from "./voicebox.adapter";
export * from "./elevenlabs.adapter";
export * from "./dummy.adapter";

/** Register built-in adapters once (Voicebox + ElevenLabs; Kokoro only inside Voicebox). */
export function registerDefaultVoiceEngineAdapters(): void {
  const registry = getDefaultVoiceEngineRegistry();
  if (!registry.has("voicebox")) {
    registry.register(voiceboxVoiceEngineAdapter);
  }
  if (!registry.has("elevenlabs")) {
    registry.register(elevenlabsVoiceEngineAdapter);
  }
  if (!registry.has("dummy")) {
    registry.register(dummyVoiceEngineAdapter);
  }
}

registerDefaultVoiceEngineAdapters();
