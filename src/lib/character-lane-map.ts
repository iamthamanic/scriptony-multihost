/**
 * Character ↔ dialog lane mapping (1:1, max 100 character lanes).
 */

import type { AudioClip, Character } from "./types";

export const MAX_CHARACTER_LANES = 100 as const;
export const CHARACTER_LANE_BASE = 0 as const;

export class CharacterLaneCapError extends Error {
  constructor(message = "Max. 100 Sprecher-Spuren pro Projekt.") {
    super(message);
    this.name = "CharacterLaneCapError";
  }
}

function sortByCreatedAt(a: Character, b: Character): number {
  const ta = Date.parse(a.createdAt || "") || 0;
  const tb = Date.parse(b.createdAt || "") || 0;
  if (ta !== tb) return ta - tb;
  return a.name.localeCompare(b.name, "de");
}

/** Merge saved order with active characters; append new IDs by createdAt. */
export function buildDialogLaneOrder(
  characters: Character[],
  savedOrder?: string[] | null,
): string[] {
  const active = characters.filter((c) => c.id);
  const activeIds = new Set(active.map((c) => c.id));
  const byId = new Map(active.map((c) => [c.id, c]));

  const order: string[] = [];
  if (savedOrder?.length) {
    for (const id of savedOrder) {
      if (activeIds.has(id) && !order.includes(id)) order.push(id);
    }
  }

  const missing = active
    .filter((c) => !order.includes(c.id))
    .sort(sortByCreatedAt);
  for (const c of missing) order.push(c.id);

  return order.slice(0, MAX_CHARACTER_LANES);
}

export function assertCharacterLaneCap(order: string[]): void {
  if (order.length >= MAX_CHARACTER_LANES) {
    throw new CharacterLaneCapError();
  }
}

export function laneIndexForCharacter(
  characterId: string,
  order: string[],
): number | undefined {
  const idx = order.indexOf(characterId);
  if (idx < 0) return undefined;
  return CHARACTER_LANE_BASE + idx;
}

export function characterIdForLaneIndex(
  laneIndex: number,
  order: string[],
): string | undefined {
  if (!isCharacterDialogLane(laneIndex)) return undefined;
  const idx = laneIndex - CHARACTER_LANE_BASE;
  return order[idx];
}

export function characterForLaneIndex(
  laneIndex: number,
  order: string[],
  charactersById: Map<string, Character>,
): Character | undefined {
  const id = characterIdForLaneIndex(laneIndex, order);
  return id ? charactersById.get(id) : undefined;
}

export function isCharacterDialogLane(laneIndex: number): boolean {
  return (
    laneIndex >= CHARACTER_LANE_BASE &&
    laneIndex < CHARACTER_LANE_BASE + MAX_CHARACTER_LANES
  );
}

export function activeCharacterLaneIndices(order: string[]): number[] {
  return order.map((_, i) => CHARACTER_LANE_BASE + i);
}

export function reorderDialogLanes(
  order: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= order.length ||
    toIndex >= order.length ||
    fromIndex === toIndex
  ) {
    return order;
  }
  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function appendCharacterToOrder(
  order: string[],
  characterId: string,
): string[] {
  assertCharacterLaneCap(order);
  if (order.includes(characterId)) return order;
  return [...order, characterId];
}

export function removeCharacterFromOrder(
  order: string[],
  characterId: string,
): string[] {
  return order.filter((id) => id !== characterId);
}

/** After reorder: update laneIndex for clips on character dialog lanes. */
export function remapClipsAfterReorder(
  oldOrder: string[],
  newOrder: string[],
  clips: AudioClip[],
): Array<{ clipId: string; laneIndex: number; characterId?: string }> {
  const updates: Array<{
    clipId: string;
    laneIndex: number;
    characterId?: string;
  }> = [];

  for (const clip of clips) {
    let characterId = clip.characterId;
    if (!characterId && isCharacterDialogLane(clip.laneIndex)) {
      characterId = characterIdForLaneIndex(clip.laneIndex, oldOrder);
    }
    if (!characterId) continue;

    const newLane = laneIndexForCharacter(characterId, newOrder);
    if (newLane === undefined) continue;
    if (newLane !== clip.laneIndex || clip.characterId !== characterId) {
      updates.push({
        clipId: clip.id,
        laneIndex: newLane,
        characterId,
      });
    }
  }

  return updates;
}

/** Assign first character to orphan dialog clips on lane 0 without characterId. */
export function migrateOrphanDialogClips(
  clips: AudioClip[],
  order: string[],
): Array<{ clipId: string; laneIndex: number; characterId: string }> {
  const firstId = order[0];
  if (!firstId) return [];

  return clips
    .filter(
      (c) =>
        isCharacterDialogLane(c.laneIndex) &&
        !c.characterId &&
        (c.trackType === "dialog" ||
          c.trackType === "narrator" ||
          !c.trackType),
    )
    .map((c) => {
      const lane = laneIndexForCharacter(firstId, order) ?? CHARACTER_LANE_BASE;
      return { clipId: c.id, laneIndex: lane, characterId: firstId };
    });
}

export function getCharacterLaneDisplayLabel(character: Character): string {
  return character.name;
}
