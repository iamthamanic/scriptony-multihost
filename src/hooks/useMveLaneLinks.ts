/**
 * React Query hook for MVE lane links (per-character default scene/shot links).
 * Location: src/hooks/useMveLaneLinks.ts
 */

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMveLaneLink,
  deleteMveLaneLink,
  getMveLaneLinkForCharacter,
  getMveLaneLinks,
  updateMveLaneLink,
} from "@/lib/api-adapter/mve-adapter";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { queryKeys } from "@/lib/react-query";
import type { MveLaneLinkTargetContainerType } from "@/lib/multi-voice-engine/schema/lane-link";
import { toast } from "sonner";

export function useMveLaneLinks(
  projectId: string | undefined,
  characterId?: string,
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(projectId) && isLocalProfile();

  const listQuery = useQuery({
    queryKey: projectId
      ? queryKeys.mve.laneLinksByProject(projectId)
      : ["mve", "laneLinks"],
    queryFn: () => getMveLaneLinks(projectId!),
    enabled,
  });

  const characterLinkQuery = useQuery({
    queryKey:
      projectId && characterId
        ? queryKeys.mve.laneLinkByCharacter(projectId, characterId)
        : ["mve", "laneLinks", "character"],
    queryFn: () =>
      projectId && characterId
        ? getMveLaneLinkForCharacter(projectId, characterId)
        : null,
    enabled: enabled && Boolean(characterId),
  });

  const invalidate = useCallback(async () => {
    if (!projectId) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.mve.laneLinksByProject(projectId),
    });
    if (characterId) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mve.laneLinkByCharacter(projectId, characterId),
      });
    }
  }, [projectId, characterId, queryClient]);

  const createMutation = useMutation({
    mutationFn: (payload: {
      characterId: string;
      targetContainerId: string;
      targetContainerType?: MveLaneLinkTargetContainerType;
    }) => createMveLaneLink(projectId!, payload),
    onSuccess: () => void invalidate(),
    onError: (err: Error) => {
      toast.error(err.message || "Lane-Link konnte nicht erstellt werden.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      linkId,
      patch,
    }: {
      linkId: string;
      patch: {
        targetContainerId?: string;
        targetContainerType?: MveLaneLinkTargetContainerType;
        enabled?: boolean;
      };
    }) => updateMveLaneLink(linkId, patch),
    onSuccess: () => void invalidate(),
    onError: (err: Error) => {
      toast.error(err.message || "Lane-Link konnte nicht aktualisiert werden.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (linkId: string) => deleteMveLaneLink(linkId),
    onSuccess: () => void invalidate(),
    onError: (err: Error) => {
      toast.error(err.message || "Lane-Link konnte nicht gelöscht werden.");
    },
  });

  const createLink = useCallback(
    async (payload: {
      characterId: string;
      targetContainerId: string;
      targetContainerType?: MveLaneLinkTargetContainerType;
    }) => createMutation.mutateAsync(payload),
    [createMutation],
  );

  const updateLink = useCallback(
    async (
      linkId: string,
      patch: {
        targetContainerId?: string;
        targetContainerType?: MveLaneLinkTargetContainerType;
        enabled?: boolean;
      },
    ) => updateMutation.mutateAsync({ linkId, patch }),
    [updateMutation],
  );

  const deleteLink = useCallback(
    async (linkId: string) => deleteMutation.mutateAsync(linkId),
    [deleteMutation],
  );

  return {
    links: listQuery.data ?? [],
    characterLink: characterLinkQuery.data,
    isLoading: listQuery.isLoading || characterLinkQuery.isLoading,
    isError: listQuery.isError || characterLinkQuery.isError,
    enabled,
    createLink,
    updateLink,
    deleteLink,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
}

export type UseMveLaneLinksResult = ReturnType<typeof useMveLaneLinks>;
