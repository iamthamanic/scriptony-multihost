/**
 * Compile universal voice design spec to provider-specific prompts/params.
 * Location: src/lib/mve/casting/voice-prompt-compiler.ts
 */

import type { VoiceProviderId } from "@/lib/config/voice-providers";
import type { MveVoiceCreationMode } from "@/lib/multi-voice-engine/schema/enums";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import type { MveVoiceDesignSpec } from "@/lib/multi-voice-engine/schema/voice-design-spec";
import type { MveVoiceRenderSettings } from "@/lib/multi-voice-engine/schema/voice-profile";
import { inferCreationModeFromProfileType } from "@/lib/multi-voice-engine/schema/voice-identity";
import { compileVoiceDesignPrompt } from "./compile-voice-design-prompt";
import { getProviderVoiceCapabilities } from "./provider-voice-capabilities";

/** Voicebox/Qwen instruct field limit (matches identity prompt cap). */
export const MAX_PERFORMANCE_INSTRUCT_LENGTH = 2000;

export interface CompiledProviderVoicePrompt {
  designPrompt?: string;
  instruct?: string;
  renderSettings?: Partial<MveVoiceRenderSettings>;
  hint?: string;
}

export interface PerformanceIdentityInput {
  identityPrompt?: string;
  description?: string;
  designSpec?: MveVoiceDesignSpec | null;
  creationMode?: MveVoiceCreationMode;
  profileType?: string;
}

export interface CompiledPerformanceInstruct {
  instruct?: string;
  warnings?: string[];
}

function resolveIdentityPrompt(identity: PerformanceIdentityInput): string {
  const explicit = identity.identityPrompt?.trim();
  if (explicit) {
    return explicit;
  }
  return compileVoiceDesignPrompt({
    basicDescription: identity.description,
    designSpec: identity.designSpec,
  }).trim();
}

function formatDirectionPerformance(direction: MveLineDirection): string {
  const parts: string[] = [];
  const note = direction.directorNote?.trim();
  if (note) {
    parts.push(note);
  }
  if (direction.emotion) {
    parts.push(`emotion: ${direction.emotion}`);
  }
  if (direction.pace) {
    parts.push(`pace: ${direction.pace}`);
  }
  if (direction.volume) {
    parts.push(`volume: ${direction.volume}`);
  }
  if (direction.energy) {
    parts.push(`energy: ${direction.energy}`);
  }
  if (direction.emphasis) {
    parts.push(`emphasis: ${direction.emphasis}`);
  }
  if (direction.pauseBeforeMs != null && direction.pauseBeforeMs > 0) {
    parts.push(`pause ${direction.pauseBeforeMs}ms before speaking`);
  }
  if (direction.pauseAfterMs != null && direction.pauseAfterMs > 0) {
    parts.push(`pause ${direction.pauseAfterMs}ms after speaking`);
  }
  return parts.join("; ");
}

export function resolveVoiceCreationMode(
  identity: PerformanceIdentityInput,
): MveVoiceCreationMode {
  return (
    identity.creationMode ??
    inferCreationModeFromProfileType(identity.profileType)
  );
}

export function voiceProfileUsesIdentityInstruct(
  identity: PerformanceIdentityInput,
): boolean {
  const mode = resolveVoiceCreationMode(identity);
  return mode === "designed" || mode === "cloned";
}

/** Combine voice identity with line performance for TTS instruct. */
export function compilePerformanceInstruct(
  identity: PerformanceIdentityInput,
  direction?: MveLineDirection | null,
): CompiledPerformanceInstruct {
  const warnings: string[] = [];
  const includeIdentity = voiceProfileUsesIdentityInstruct(identity);
  const identityText = includeIdentity ? resolveIdentityPrompt(identity) : "";
  const performanceText = direction
    ? formatDirectionPerformance(direction)
    : "";

  const segments: string[] = [];
  if (identityText) {
    segments.push(`Voice identity: ${identityText}`);
  }
  if (performanceText) {
    segments.push(`Performance: ${performanceText}`);
  }

  if (segments.length === 0) {
    return {};
  }

  let instruct = segments.join(". ");
  if (instruct.length > MAX_PERFORMANCE_INSTRUCT_LENGTH) {
    instruct = instruct.slice(0, MAX_PERFORMANCE_INSTRUCT_LENGTH);
    warnings.push(
      `Instruct auf ${MAX_PERFORMANCE_INSTRUCT_LENGTH} Zeichen gekürzt.`,
    );
  }

  return {
    instruct,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
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
