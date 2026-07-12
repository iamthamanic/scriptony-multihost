/**
 * After character create: dialog lane order + optional first dialog clip.
 * Location: src/lib/audio/sync-character-dialog-setup.ts
 */

import { createAudioTrack } from "@/lib/api-adapter/audio-story-adapter";
import {
  appendCharacterToOrder,
  buildDialogLaneOrder,
  CharacterLaneCapError,
  laneIndexForCharacter,
} from "@/lib/character-lane-map";
import {
  readDialogLaneOrder,
  writeDialogLaneOrder,
} from "@/lib/audio-project-settings";
import { getCharacters } from "@/lib/api/characters-api";
import { resolveDomainAuthTokenOrEmpty } from "@/lib/api-adapter/domain-access";
import { isAudioClipSystemEnabled } from "@/lib/feature-flags";

export type SyncCharacterDialogResult = {
  laneOrderUpdated: boolean;
  clipCreated: boolean;
};

export async function syncCharacterDialogOnCreate(params: {
  projectId: string;
  characterId: string;
  firstSceneId?: string;
  projectType?: string | null;
}): Promise<SyncCharacterDialogResult> {
  const result: SyncCharacterDialogResult = {
    laneOrderUpdated: false,
    clipCreated: false,
  };

  const token = await resolveDomainAuthTokenOrEmpty();
  const characters = await getCharacters(params.projectId, token);
  const storedOrder = await readDialogLaneOrder(params.projectId);
  const currentOrder = buildDialogLaneOrder(
    characters,
    storedOrder ?? undefined,
  );

  let nextOrder: string[];
  try {
    nextOrder = appendCharacterToOrder(currentOrder, params.characterId);
  } catch (err) {
    if (err instanceof CharacterLaneCapError) {
      throw err;
    }
    throw err;
  }

  if (nextOrder.join(",") !== currentOrder.join(",")) {
    await writeDialogLaneOrder(params.projectId, nextOrder);
    result.laneOrderUpdated = true;
  }

  if (!params.firstSceneId) {
    return result;
  }

  const laneIndex = laneIndexForCharacter(params.characterId, nextOrder);
  const useClips = isAudioClipSystemEnabled(params.projectType);

  await createAudioTrack(params.firstSceneId, params.projectId, {
    type: "dialog",
    characterId: params.characterId,
    content: "",
    startTime: 0,
    duration: 3,
    ...(useClips && laneIndex !== undefined ? { laneIndex } : {}),
  });
  result.clipCreated = true;
  return result;
}
