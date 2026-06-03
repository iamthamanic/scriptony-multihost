/**
 * Characters API Client — facade → characters-adapter (local vs cloud).
 */

export type { Character } from "../types";

export {
  getCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from "@/lib/api-adapter/characters-adapter";
