/**
 * Voicebox VoiceEngineAdapter — HTTP TTS via local Voicebox app.
 * Kokoro presets run inside Voicebox (no standalone sidecar).
 * Location: src/lib/multi-voice-engine/adapters/voicebox.adapter.ts
 */

import {
  createVoiceboxPresetProfile,
  ensureVoiceboxAvailable,
  generateVoiceboxSpeech,
  getVoiceboxProfile,
  isPresetVoiceEntryId,
  parsePresetVoiceEntryId,
  resolveVoiceboxProfileIdForSelection,
} from "@/lib/api/voicebox-api";
import { compilePerformanceInstruct } from "@/lib/mve/casting/voice-prompt-compiler";
import { resolveMveTtsVoiceId } from "@/lib/mve/resolve-tts-voice-id";
import type { RenderLineInput, RenderLineOutput } from "../schema/render-line";
import type { VoiceEngineAdapter } from "./voice-engine-adapter";

function looksLikeLegacyKokoroVoiceId(id: string): boolean {
  return /^(af|am|bf|bm|ef|em|ff|fm|hf|hm|if|im|jf|jm|pf|pm|zf|zm)_/.test(id);
}

async function resolveVoiceboxProfileIdForRender(
  input: RenderLineInput,
): Promise<string> {
  const rawId = resolveMveTtsVoiceId(input.voice);
  if (!rawId) {
    throw new Error(
      "VoiceProfile hat keine Voicebox profile_id (baseVoiceId).",
    );
  }

  if (isPresetVoiceEntryId(rawId)) {
    return resolveVoiceboxProfileIdForSelection({
      voiceId: rawId,
      characterName: input.voice.name,
      language: input.voice.language,
    });
  }

  const existing = await getVoiceboxProfile(rawId);
  if (existing) {
    return rawId;
  }

  if (input.voice.engine === "kokoro" || looksLikeLegacyKokoroVoiceId(rawId)) {
    const created = await createVoiceboxPresetProfile({
      name: input.voice.name,
      presetEngine: "kokoro",
      presetVoiceId: rawId,
      language: input.voice.language,
      description: input.voice.description,
    });
    return created.id;
  }

  const preset = parsePresetVoiceEntryId(rawId);
  if (preset) {
    const created = await createVoiceboxPresetProfile({
      name: input.voice.name,
      presetEngine: preset.engine,
      presetVoiceId: preset.voiceId,
      language: input.voice.language,
    });
    return created.id;
  }

  return rawId;
}

export class VoiceboxVoiceEngineAdapter implements VoiceEngineAdapter {
  readonly engineName = "voicebox";

  readonly capabilities = {
    supportsTextToSpeech: true,
    supportsVoiceCloning: true,
    supportsVoiceGenerationFromPrompt: false,
    supportsVoiceTuning: false,
    supportsPerformanceReference: false,
    supportsEmotion: true,
    supportsSSML: false,
  } as const;

  async renderLine(input: RenderLineInput): Promise<RenderLineOutput> {
    const profileId = await resolveVoiceboxProfileIdForRender(input);

    await ensureVoiceboxAvailable();

    const { instruct, warnings } = compilePerformanceInstruct(
      {
        identityPrompt: input.voice.identityPrompt,
        description: input.voice.description,
        designSpec: input.voice.designSpec,
        creationMode: input.voice.creationMode,
        profileType: input.voice.type,
      },
      input.direction,
    );

    const result = await generateVoiceboxSpeech({
      text: input.text,
      profileId,
      language: input.language,
      projectDir: input.projectDir,
      instruct,
    });

    if (!result.audioPath?.trim()) {
      throw new Error("Voicebox hat keine Audio-Datei erzeugt.");
    }

    return {
      audioUrl: result.audioPath,
      durationMs: result.durationMs,
      warnings,
    };
  }
}

export const voiceboxVoiceEngineAdapter = new VoiceboxVoiceEngineAdapter();
