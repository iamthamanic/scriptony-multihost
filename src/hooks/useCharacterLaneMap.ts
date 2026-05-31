/**
 * useCharacterLaneMap — character ↔ dialog lane order for audio timeline.
 */

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCharacters } from "../lib/api/characters-api";
import {
  activeCharacterLaneIndices,
  appendCharacterToOrder,
  buildDialogLaneOrder,
  characterForLaneIndex,
  characterIdForLaneIndex,
  CharacterLaneCapError,
  laneIndexForCharacter,
  removeCharacterFromOrder,
  reorderDialogLanes,
  remapClipsAfterReorder,
  migrateOrphanDialogClips,
} from "../lib/character-lane-map";
import {
  readDialogLaneOrder,
  writeDialogLaneOrder,
} from "../lib/audio-project-settings";
import { resolveDomainAuthTokenOrEmpty } from "../lib/api-adapter/domain-access";
import { queryKeys } from "../lib/react-query";
import type { AudioClip, Character } from "../lib/types";
import * as ClipAPI from "../lib/api/audio-clip-api";

export interface UseCharacterLaneMapOptions {
  projectId: string | undefined;
  enabled?: boolean;
}

export function useCharacterLaneMap({
  projectId,
  enabled = true,
}: UseCharacterLaneMapOptions) {
  const queryClient = useQueryClient();
  const queryEnabled = enabled && !!projectId;

  const charactersQuery = useQuery({
    queryKey: queryKeys.audio.charactersByProject(projectId || ""),
    queryFn: async () => {
      const token = await resolveDomainAuthTokenOrEmpty();
      return getCharacters(projectId!, token);
    },
    enabled: queryEnabled,
  });

  const orderQuery = useQuery({
    queryKey: queryKeys.audio.dialogLaneOrder(projectId || ""),
    queryFn: () => readDialogLaneOrder(projectId!),
    enabled: queryEnabled,
  });

  const dialogLaneOrder = useMemo(
    () =>
      buildDialogLaneOrder(
        charactersQuery.data ?? [],
        orderQuery.data ?? undefined,
      ),
    [charactersQuery.data, orderQuery.data],
  );

  const charactersById = useMemo(() => {
    const map = new Map<string, Character>();
    for (const c of charactersQuery.data ?? []) map.set(c.id, c);
    return map;
  }, [charactersQuery.data]);

  const orderedCharacters = useMemo(
    () =>
      dialogLaneOrder
        .map((id) => charactersById.get(id))
        .filter((c): c is Character => Boolean(c)),
    [dialogLaneOrder, charactersById],
  );

  const dialogLaneIndices = useMemo(
    () => activeCharacterLaneIndices(dialogLaneOrder),
    [dialogLaneOrder],
  );

  const getCharacterForLane = useCallback(
    (laneIndex: number) =>
      characterForLaneIndex(laneIndex, dialogLaneOrder, charactersById),
    [dialogLaneOrder, charactersById],
  );

  const getLaneForCharacter = useCallback(
    (characterId: string) =>
      laneIndexForCharacter(characterId, dialogLaneOrder),
    [dialogLaneOrder],
  );

  const persistOrder = useCallback(
    async (order: string[]) => {
      if (!projectId) return;
      await writeDialogLaneOrder(projectId, order);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.audio.dialogLaneOrder(projectId),
      });
    },
    [projectId, queryClient],
  );

  const reorderMutation = useMutation({
    mutationFn: async ({
      fromIndex,
      toIndex,
      allClips,
    }: {
      fromIndex: number;
      toIndex: number;
      allClips: AudioClip[];
    }) => {
      const oldOrder = dialogLaneOrder;
      const newOrder = reorderDialogLanes(oldOrder, fromIndex, toIndex);
      await persistOrder(newOrder);
      const updates = remapClipsAfterReorder(oldOrder, newOrder, allClips);
      const token = await resolveDomainAuthTokenOrEmpty();
      for (const u of updates) {
        await ClipAPI.updateClip(
          u.clipId,
          {
            laneIndex: u.laneIndex,
            ...(u.characterId ? { characterId: u.characterId } : {}),
          },
          token,
        );
      }
      return newOrder;
    },
    onSuccess: () => {
      if (projectId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.timeline.audioByProject(projectId),
        });
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Reihenfolge konnte nicht gespeichert werden.",
      );
    },
  });

  const syncOnCharacterCreated = useCallback(
    async (characterId: string) => {
      try {
        const next = appendCharacterToOrder(dialogLaneOrder, characterId);
        await persistOrder(next);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.audio.charactersByProject(projectId || ""),
        });
      } catch (err) {
        if (err instanceof CharacterLaneCapError) {
          toast.error(err.message);
        }
        throw err;
      }
    },
    [dialogLaneOrder, persistOrder, projectId, queryClient],
  );

  const syncOnCharacterDeleted = useCallback(
    async (characterId: string) => {
      const next = removeCharacterFromOrder(dialogLaneOrder, characterId);
      await persistOrder(next);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.audio.charactersByProject(projectId || ""),
      });
    },
    [dialogLaneOrder, persistOrder, projectId, queryClient],
  );

  const migrateClipsIfNeeded = useCallback(
    async (clips: AudioClip[]) => {
      if (!projectId || dialogLaneOrder.length === 0) return;
      const orphans = migrateOrphanDialogClips(clips, dialogLaneOrder);
      if (orphans.length === 0) return;
      const token = await resolveDomainAuthTokenOrEmpty();
      for (const u of orphans) {
        await ClipAPI.updateClip(
          u.clipId,
          { laneIndex: u.laneIndex, characterId: u.characterId },
          token,
        );
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.audioByProject(projectId),
      });
    },
    [dialogLaneOrder, projectId, queryClient],
  );

  return {
    isLoading: charactersQuery.isLoading || orderQuery.isLoading,
    characters: charactersQuery.data ?? [],
    orderedCharacters,
    dialogLaneOrder,
    dialogLaneIndices,
    charactersById,
    getCharacterForLane,
    getLaneForCharacter,
    characterIdForLane: (laneIndex: number) =>
      characterIdForLaneIndex(laneIndex, dialogLaneOrder),
    reorderCharacters: reorderMutation.mutateAsync,
    isReordering: reorderMutation.isPending,
    syncOnCharacterCreated,
    syncOnCharacterDeleted,
    migrateClipsIfNeeded,
  };
}
