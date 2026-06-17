/**
 * Helpers for StyleProfileSpec.toolSettings read/write (T81).
 * Location: src/lib/style-profile/tool-settings-params.ts
 */

import type {
  StyleProfileSpec,
  StyleProfileToolSettings,
} from "@/lib/types/style-profile";

export function promptToTokens(prompt: string | undefined): string[] {
  if (!prompt?.trim()) return [];
  return prompt
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function tokensToPrompt(tokens: string[]): string {
  return tagsUnique(tokens).join(", ");
}

function tagsUnique(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags.filter((t) => {
    const key = t.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function patchToolSettings(
  spec: StyleProfileSpec,
  patch: Partial<StyleProfileToolSettings>,
): StyleProfileSpec {
  return {
    ...spec,
    toolSettings: { ...spec.toolSettings, ...patch },
  };
}

export function patchImageGeneration(
  spec: StyleProfileSpec,
  patch: NonNullable<StyleProfileToolSettings["imageGeneration"]>,
): StyleProfileSpec {
  return patchToolSettings(spec, {
    imageGeneration: { ...spec.toolSettings.imageGeneration, ...patch },
  });
}

export function patchComfyUi(
  spec: StyleProfileSpec,
  patch: NonNullable<StyleProfileToolSettings["comfyui"]>,
): StyleProfileSpec {
  const current = spec.toolSettings.comfyui ?? {};
  return patchToolSettings(spec, {
    comfyui: {
      ...current,
      ...patch,
      workflowBindings: {
        ...current.workflowBindings,
        ...patch.workflowBindings,
      },
      controlNetMix: {
        ...current.controlNetMix,
        ...patch.controlNetMix,
      },
      ipAdapter: {
        ...current.ipAdapter,
        ...patch.ipAdapter,
      },
    },
  });
}

export function patchBlender(
  spec: StyleProfileSpec,
  patch: NonNullable<StyleProfileToolSettings["blender"]>,
): StyleProfileSpec {
  return patchToolSettings(spec, {
    blender: { ...spec.toolSettings.blender, ...patch },
  });
}
