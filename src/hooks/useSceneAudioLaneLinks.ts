/**
 * React Query: scene/shot ↔ audio lane links.
 * Location: src/hooks/useSceneAudioLaneLinks.ts
 */

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  readSceneAudioLaneLinks,
  writeSceneAudioLaneLinks,
} from "@/lib/scene-audio-lane-link-settings";
import {
  findNodeIdForLane,
  type SceneAudioLaneLink,
  type SceneAudioLaneLinkMap,
} from "@/lib/scene-audio-lane-link";
import { queryKeys } from "@/lib/react-query";

export function useSceneAudioLaneLinks(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const enabled = !!projectId;

  const query = useQuery({
    queryKey: queryKeys.audio.sceneAudioLaneLinks(projectId || ""),
    queryFn: () => readSceneAudioLaneLinks(projectId!),
    enabled,
  });

  const persist = useCallback(
    async (next: SceneAudioLaneLinkMap) => {
      if (!projectId) return;
      await writeSceneAudioLaneLinks(projectId, next);
      queryClient.setQueryData(
        queryKeys.audio.sceneAudioLaneLinks(projectId),
        next,
      );
    },
    [projectId, queryClient],
  );

  const linkMutation = useMutation({
    mutationFn: async (input: {
      nodeId: string;
      link: SceneAudioLaneLink;
      stealFromNodeId?: string;
    }) => {
      const current = query.data ?? {};
      const next: SceneAudioLaneLinkMap = { ...current };
      delete next[input.nodeId];
      if (input.stealFromNodeId) {
        delete next[input.stealFromNodeId];
      }
      for (const [id, existing] of Object.entries(next)) {
        if (
          id !== input.nodeId &&
          existing.laneIndex === input.link.laneIndex
        ) {
          delete next[id];
        }
      }
      next[input.nodeId] = input.link;
      await persist(next);
      return next;
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Verlinkung fehlgeschlagen.",
      );
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      const current = query.data ?? {};
      if (!current[nodeId]) return current;
      const next = { ...current };
      delete next[nodeId];
      await persist(next);
      return next;
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Verlinkung konnte nicht entfernt werden.",
      );
    },
  });

  const getOccupantNodeId = useCallback(
    (laneIndex: number, exceptNodeId?: string) => {
      const id = findNodeIdForLane(query.data ?? {}, laneIndex);
      if (!id || id === exceptNodeId) return undefined;
      return id;
    },
    [query.data],
  );

  return {
    links: query.data ?? {},
    isLoading: query.isLoading,
    linkLane: linkMutation.mutateAsync,
    unlinkLane: unlinkMutation.mutateAsync,
    isLinking: linkMutation.isPending || unlinkMutation.isPending,
    getOccupantNodeId,
  };
}
