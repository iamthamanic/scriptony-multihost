/**
 * Cloud timeline-characters API.
 */

import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  unwrapApiResult,
} from "../api-client";
import type { Character } from "../types";
import { parseCharacterFromApi } from "./character-cloud-parse";

function sanitizeCharacterPayload(
  data: Partial<Character>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...data };
  delete payload.image_url;
  delete payload.imageUrl;
  return payload;
}

export async function cloudGetCharacters(
  projectId: string,
): Promise<Character[]> {
  const result = await apiGet(`/timeline-characters?project_id=${projectId}`);
  const data = unwrapApiResult(result);
  const chars = Array.isArray(data?.characters) ? data.characters : [];
  return chars.map((raw: unknown) => parseCharacterFromApi(raw));
}

export async function cloudGetCharacter(
  characterId: string,
): Promise<Character> {
  const result = await apiGet(`/timeline-characters/${characterId}`);
  const data = unwrapApiResult(result);
  return parseCharacterFromApi(data?.character ?? data);
}

export async function cloudCreateCharacter(
  projectId: string,
  characterData: Partial<Character>,
): Promise<Character> {
  const payload = sanitizeCharacterPayload(characterData);
  const result = await apiPost("/timeline-characters", {
    project_id: projectId,
    ...payload,
  });
  const data = unwrapApiResult(result);
  return parseCharacterFromApi(data?.character ?? data);
}

export async function cloudUpdateCharacter(
  characterId: string,
  updates: Partial<Character>,
): Promise<Character> {
  const payload = sanitizeCharacterPayload(updates);
  const result = await apiPut(`/timeline-characters/${characterId}`, payload);
  const data = unwrapApiResult(result);
  return parseCharacterFromApi(data?.character ?? data);
}

export async function cloudDeleteCharacter(characterId: string): Promise<void> {
  const result = await apiDelete(`/timeline-characters/${characterId}`);
  unwrapApiResult(result);
}
