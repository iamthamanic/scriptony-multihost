/**
 * Local timeline characters via CharacterRepository.
 */

import type { Character } from "@/lib/types";
import { requireLocalBackend } from "./runtime-dispatch";

export async function localGetCharacters(
  projectId: string,
): Promise<Character[]> {
  const backend = requireLocalBackend(projectId);
  return backend.characters.list(projectId);
}

export async function localGetCharacter(
  characterId: string,
): Promise<Character> {
  const backend = requireLocalBackend();
  const character = await backend.characters.get(characterId);
  if (!character) throw new Error(`Character ${characterId} not found`);
  return character;
}

export async function localCreateCharacter(
  projectId: string,
  characterData: Partial<Character>,
): Promise<Character> {
  const backend = requireLocalBackend(projectId);
  return backend.characters.create(projectId, characterData);
}

export async function localUpdateCharacter(
  characterId: string,
  updates: Partial<Character>,
): Promise<Character> {
  const backend = requireLocalBackend();
  return backend.characters.update(characterId, updates);
}

export async function localDeleteCharacter(characterId: string): Promise<void> {
  const backend = requireLocalBackend();
  await backend.characters.delete(characterId);
}
