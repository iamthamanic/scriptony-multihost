/**
 * Runtime-aware timeline characters API.
 */

import type { Character } from "@/lib/types";
import {
  cloudCreateCharacter,
  cloudDeleteCharacter,
  cloudGetCharacter,
  cloudGetCharacters,
  cloudUpdateCharacter,
} from "@/lib/api/characters-cloud-http";
import { dispatchByRuntime } from "./runtime-dispatch";
import {
  localCreateCharacter,
  localDeleteCharacter,
  localGetCharacter,
  localGetCharacters,
  localUpdateCharacter,
} from "./characters-local";

export function getCharacters(
  projectId: string,
  _token?: string,
): Promise<Character[]> {
  return dispatchByRuntime(
    () => cloudGetCharacters(projectId),
    () => localGetCharacters(projectId),
  );
}

export function getCharacter(
  characterId: string,
  _token?: string,
): Promise<Character> {
  return dispatchByRuntime(
    () => cloudGetCharacter(characterId),
    () => localGetCharacter(characterId),
  );
}

export function createCharacter(
  projectId: string,
  characterData: Partial<Character>,
  _token?: string,
): Promise<Character> {
  return dispatchByRuntime(
    () => cloudCreateCharacter(projectId, characterData),
    () => localCreateCharacter(projectId, characterData),
  );
}

export function updateCharacter(
  characterId: string,
  updates: Partial<Character>,
  _token?: string,
): Promise<Character> {
  return dispatchByRuntime(
    () => cloudUpdateCharacter(characterId, updates),
    () => localUpdateCharacter(characterId, updates),
  );
}

export function deleteCharacter(
  characterId: string,
  _token?: string,
): Promise<void> {
  return dispatchByRuntime(
    () => cloudDeleteCharacter(characterId),
    () => localDeleteCharacter(characterId),
  );
}
