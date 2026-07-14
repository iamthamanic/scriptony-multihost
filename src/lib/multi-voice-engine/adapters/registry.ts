/**
 * Voice engine adapter registry — resolve by VoiceProfile.engine.
 * Location: src/lib/multi-voice-engine/adapters/registry.ts
 */

import { DEFAULT_VOICE_ENGINE } from "@/lib/config/voice-engine";
import type { VoiceEngineAdapter } from "./voice-engine-adapter";
import { UnknownVoiceEngineError } from "./voice-engine-adapter";

const DEFAULT_ENGINE = DEFAULT_VOICE_ENGINE;

export class VoiceEngineRegistry {
  private readonly adapters = new Map<string, VoiceEngineAdapter>();

  register(adapter: VoiceEngineAdapter): void {
    this.adapters.set(adapter.engineName, adapter);
  }

  resolve(engine: string | undefined | null): VoiceEngineAdapter {
    const key = engine?.trim() || DEFAULT_ENGINE;
    const normalized = key === "kokoro" ? "voicebox" : key;
    const adapter = this.adapters.get(normalized);
    if (!adapter) {
      throw new UnknownVoiceEngineError(normalized);
    }
    return adapter;
  }

  listEngines(): string[] {
    return [...this.adapters.keys()].sort();
  }

  has(engine: string): boolean {
    return this.adapters.has(engine);
  }
}

let defaultRegistry: VoiceEngineRegistry | null = null;

export function getDefaultVoiceEngineRegistry(): VoiceEngineRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new VoiceEngineRegistry();
  }
  return defaultRegistry;
}

export function resolveVoiceEngineAdapter(
  engine: string | undefined | null,
): VoiceEngineAdapter {
  return getDefaultVoiceEngineRegistry().resolve(engine);
}

export function resetDefaultVoiceEngineRegistryForTests(): void {
  defaultRegistry = null;
}
