/**
 * Voice creation adapter registry — resolve by providerId (e.g. qwen-voice-design).
 * Location: src/lib/multi-voice-engine/adapters/voice-creation-registry.ts
 */

import type { VoiceCreationAdapter } from "./voice-creation-adapter";
import { UnknownVoiceCreationProviderError } from "./voice-creation-adapter";

export class VoiceCreationRegistry {
  private readonly adapters = new Map<string, VoiceCreationAdapter>();

  register(adapter: VoiceCreationAdapter): void {
    this.adapters.set(adapter.providerId, adapter);
  }

  resolve(providerId: string | undefined | null): VoiceCreationAdapter {
    const key = providerId?.trim();
    if (!key) {
      throw new UnknownVoiceCreationProviderError("(empty)");
    }
    const adapter = this.adapters.get(key);
    if (!adapter) {
      throw new UnknownVoiceCreationProviderError(key);
    }
    return adapter;
  }

  listProviders(): string[] {
    return [...this.adapters.keys()].sort();
  }

  has(providerId: string): boolean {
    return this.adapters.has(providerId);
  }
}

let defaultCreationRegistry: VoiceCreationRegistry | null = null;

export function getDefaultVoiceCreationRegistry(): VoiceCreationRegistry {
  if (!defaultCreationRegistry) {
    defaultCreationRegistry = new VoiceCreationRegistry();
  }
  return defaultCreationRegistry;
}

export function resolveVoiceCreationAdapter(
  providerId: string | undefined | null,
): VoiceCreationAdapter {
  return getDefaultVoiceCreationRegistry().resolve(providerId);
}

export function resetDefaultVoiceCreationRegistryForTests(): void {
  defaultCreationRegistry = null;
}
