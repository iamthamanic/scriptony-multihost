/**
 * Local/cloud voice engine providers for MVE character voices.
 * Location: src/lib/config/voice-providers.ts
 */

import {
  VOICEBOX_PRESET_ENGINES,
  voiceboxPresetEngineLabel,
  type VoiceboxPresetEngine,
} from "./voicebox-preset-engines";
import { DEFAULT_VOICE_ENGINE, type LocalVoiceEngineId } from "./voice-engine";

const VIA_VOICEBOX = " (via Voicebox)";

/** UI provider id — one Voicebox preset engine or profiles bucket per entry. */
export type VoiceProviderId = "voicebox" | VoiceboxPresetEngine | "elevenlabs";

export interface VoiceProviderOption {
  id: VoiceProviderId;
  label: string;
  description: string;
  requiresDesktop: boolean;
  requiresApiKey: boolean;
  /** True for user profiles + clone (not preset-only catalogs). */
  isProfileProvider: boolean;
}

function presetProviderOption(
  engine: VoiceboxPresetEngine,
): VoiceProviderOption {
  const short = voiceboxPresetEngineLabel(engine);
  return {
    id: engine,
    label: `${short}${VIA_VOICEBOX}`,
    description: `${short}-Presets aus Voicebox — kein separates Sidecar`,
    requiresDesktop: true,
    requiresApiKey: false,
    isProfileProvider: false,
  };
}

export const VOICE_PROVIDER_OPTIONS: VoiceProviderOption[] = [
  {
    id: "voicebox",
    label: `Eigene Stimmen${VIA_VOICEBOX}`,
    description: "Clone, eigene Profile — alles in Scriptony einrichten",
    requiresDesktop: true,
    requiresApiKey: false,
    isProfileProvider: true,
  },
  ...VOICEBOX_PRESET_ENGINES.map(presetProviderOption),
  {
    id: "elevenlabs",
    label: "ElevenLabs",
    description: "Cloud-API mit eigenem Key (kein Scriptony-Login)",
    requiresDesktop: false,
    requiresApiKey: true,
    isProfileProvider: false,
  },
];

export function voiceProviderLabel(
  provider: string | undefined | null,
): string {
  const match = VOICE_PROVIDER_OPTIONS.find((p) => p.id === provider);
  return match?.label ?? provider ?? DEFAULT_VOICE_ENGINE;
}

export function isKnownVoiceProvider(
  provider: string | undefined | null,
): provider is VoiceProviderId {
  return VOICE_PROVIDER_OPTIONS.some((p) => p.id === provider);
}

export function resolveVoiceProviderId(
  engineOrProvider: string | undefined | null,
): VoiceProviderId {
  if (!engineOrProvider) return "voicebox";
  if (isKnownVoiceProvider(engineOrProvider)) return engineOrProvider;
  if (engineOrProvider === "elevenlabs") return "elevenlabs";
  if (engineOrProvider === "kokoro") return "kokoro";
  return "voicebox";
}

/** SQLite `engine` column written on assign. */
export function persistedEngineForProvider(
  provider: VoiceProviderId,
): LocalVoiceEngineId {
  if (provider === "elevenlabs") return "elevenlabs";
  if (provider === "kokoro") return "kokoro";
  return "voicebox";
}

export function isVoiceboxBackedProvider(provider: VoiceProviderId): boolean {
  return provider !== "elevenlabs";
}

export function isProfileVoiceProvider(provider: VoiceProviderId): boolean {
  return provider === "voicebox";
}

const ELEVENLABS_KEY_STORAGE = "scriptony_elevenlabs_api_key";

export function getElevenLabsApiKey(): string | null {
  const fromEnv = import.meta.env.VITE_ELEVENLABS_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    return localStorage.getItem(ELEVENLABS_KEY_STORAGE)?.trim() || null;
  } catch {
    return null;
  }
}

export function setElevenLabsApiKey(key: string): void {
  localStorage.setItem(ELEVENLABS_KEY_STORAGE, key.trim());
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(getElevenLabsApiKey());
}

/** ElevenLabs always listed; voice select stays disabled until key is set. */
export function listAvailableVoiceProviders(): VoiceProviderOption[] {
  return [...VOICE_PROVIDER_OPTIONS];
}

export function isElevenLabsProviderReady(): boolean {
  return isElevenLabsConfigured();
}
