/**
 * Provider capabilities for voice design / prompt compilation.
 * Location: src/lib/mve/casting/provider-voice-capabilities.ts
 */

import type { VoiceProviderId } from "@/lib/config/voice-providers";

export interface ProviderVoiceCapabilities {
  supportsDesignedVoice: boolean;
  supportsInstruct: boolean;
  supportsPresetOnly: boolean;
  promptLanguage: "en" | "de";
}

export function getProviderVoiceCapabilities(
  provider: VoiceProviderId,
): ProviderVoiceCapabilities {
  if (provider === "voicebox") {
    return {
      supportsDesignedVoice: true,
      supportsInstruct: true,
      supportsPresetOnly: false,
      promptLanguage: "en",
    };
  }

  if (provider === "elevenlabs") {
    // ponytail: frozen-cloud-path — revisit when new cloud stack is decided
    return {
      supportsDesignedVoice: false,
      supportsInstruct: false,
      supportsPresetOnly: true,
      promptLanguage: "en",
    };
  }

  if (provider === "qwen_custom_voice") {
    return {
      supportsDesignedVoice: false,
      supportsInstruct: true,
      supportsPresetOnly: true,
      promptLanguage: "en",
    };
  }

  return {
    supportsDesignedVoice: false,
    supportsInstruct: false,
    supportsPresetOnly: true,
    promptLanguage: "en",
  };
}
