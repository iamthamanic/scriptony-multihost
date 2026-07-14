/**
 * Compile universal voice design spec to provider-specific prompts/params.
 * Location: src/lib/mve/casting/voice-prompt-compiler.ts
 */

import type { VoiceProviderId } from "@/lib/config/voice-providers";
import { compileVoiceDesignPrompt } from "./compile-voice-design-prompt";
import { getProviderVoiceCapabilities } from "./provider-voice-capabilities";
import type { MveVoiceDesignSpec } from "@/lib/multi-voice-engine/schema/voice-design-spec";
import type { MveVoiceRenderSettings } from "@/lib/multi-voice-engine/schema/voice-profile";

export interface CompiledProviderVoicePrompt {
  designPrompt?: string;
  instruct?: string;
  renderSettings?: Partial<MveVoiceRenderSettings>;
  hint?: string;
}

export function compileForProvider(
  provider: VoiceProviderId,
  input: {
    basicDescription?: string;
    designSpec?: MveVoiceDesignSpec | null;
  },
): CompiledProviderVoicePrompt {
  const caps = getProviderVoiceCapabilities(provider);
  const designPrompt = compileVoiceDesignPrompt({
    basicDescription: input.basicDescription,
    designSpec: input.designSpec,
  });

  if (provider === "voicebox") {
    return {
      designPrompt,
      renderSettings: {
        seed: input.designSpec?.technical?.seed,
        guidance: input.designSpec?.technical?.guidance,
        temperature: input.designSpec?.technical?.temperature,
        variationStrength: input.designSpec?.technical?.variationStrength,
      },
    };
  }

  if (caps.supportsInstruct && provider === "qwen_custom_voice") {
    return {
      instruct: `Speak with this voice identity: ${designPrompt.slice(0, 480)}`,
      hint: "Qwen CustomVoice nutzt Preset + Instruction für Performance.",
    };
  }

  if (caps.supportsPresetOnly) {
    return {
      hint:
        provider === "elevenlabs"
          ? "Cloud Voice Design ist eingefroren — Katalog oder Voicebox nutzen."
          : `${provider} unterstützt kein freies Prompt-to-Voice — nächstes Preset + Speed.`,
    };
  }

  return { designPrompt };
}
