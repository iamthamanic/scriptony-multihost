/**
 * Apply MVE Enhance Script result — create characters + lines (local MVP).
 * Location: src/lib/mve/apply-enhance-script.ts
 */

import { createCharacter } from "@/lib/api-adapter/characters-adapter";
import { createMveLine } from "@/lib/api-adapter/mve-adapter";
import type { MveEnhanceScriptResult } from "@/lib/multi-voice-engine/schema/enhance-script";
import type { Character } from "@/lib/types";

export interface ApplyEnhanceScriptInput {
  projectId: string;
  sceneId: string;
  result: MveEnhanceScriptResult;
  existingCharacters: Character[];
}

export interface ApplyEnhanceScriptOutput {
  charactersCreated: number;
  linesCreated: number;
}

export async function applyEnhanceScriptResult(
  input: ApplyEnhanceScriptInput,
): Promise<ApplyEnhanceScriptOutput> {
  const { projectId, sceneId, result, existingCharacters } = input;
  const nameToId = new Map(
    existingCharacters.map((c) => [c.name.trim().toLowerCase(), c.id]),
  );
  const tempToId = new Map<string, string>();
  let charactersCreated = 0;

  for (const draft of result.characters) {
    const key = draft.name.trim().toLowerCase();
    const existingId = nameToId.get(key);
    if (existingId) {
      tempToId.set(draft.tempId, existingId);
      continue;
    }
    const created = await createCharacter(projectId, {
      name: draft.name.trim(),
      description: draft.description,
    });
    nameToId.set(key, created.id);
    tempToId.set(draft.tempId, created.id);
    charactersCreated += 1;
  }

  let linesCreated = 0;
  for (const line of result.lines) {
    const characterId = line.characterTempId
      ? tempToId.get(line.characterTempId)
      : undefined;
    await createMveLine(projectId, {
      sceneId,
      orderIndex: line.orderIndex,
      type: line.type,
      characterId,
      text: line.text,
      direction: line.direction,
      status: "draft",
    });
    linesCreated += 1;
  }

  return { charactersCreated, linesCreated };
}
