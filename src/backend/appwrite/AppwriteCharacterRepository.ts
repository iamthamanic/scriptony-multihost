/**
 * AppwriteCharacterRepository — Cloud Character CRUD via characters-api.
 *
 * DRY: Dünner Wrapper um den existierenden characters-api Client.
 * Location: src/backend/appwrite/AppwriteCharacterRepository.ts
 */

import type { CharacterRepository, Character } from "../ScriptonyBackend";
import {
  getCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from "@/lib/api/characters-api";

export class AppwriteCharacterRepository implements CharacterRepository {
  async list(projectId: string): Promise<Character[]> {
    return getCharacters(projectId, "");
  }

  async get(id: string): Promise<Character | null> {
    return getCharacter(id, "");
  }

  async create(
    projectId: string,
    payload: Partial<Character>,
  ): Promise<Character> {
    return createCharacter(projectId, payload, "");
  }

  async update(id: string, patch: Partial<Character>): Promise<Character> {
    return updateCharacter(id, patch, "");
  }

  async delete(id: string): Promise<void> {
    return deleteCharacter(id, "");
  }
}
