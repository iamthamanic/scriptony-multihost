/**
 * useClipUpdate — T32 DAW Feature.
 *
 * React Query mutation hook for updating a clip's properties
 * (primarily laneIndex, but can update any clip field).
 * Invalidates relevant queries on success.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ClipAPI from "../lib/api/audio-clip-api";
import type { AudioClipUpdatePayload } from "../lib/api/audio-clip-api";
import { queryKeys } from "../lib/react-query";
import { useAuth } from "./useAuth";

export type { AudioClipUpdatePayload };

export function useClipUpdate(projectId: string) {
  const qc = useQueryClient();
  const { getAccessToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      clipId,
      updates,
    }: {
      clipId: string;
      updates: AudioClipUpdatePayload;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return ClipAPI.updateClip(clipId, updates, token);
    },
    onSuccess: (data) => {
      if (data?.sceneId) {
        qc.invalidateQueries({
          queryKey: queryKeys.audio.clipsByScene(data.sceneId),
        });
      }
      qc.invalidateQueries({
        queryKey: queryKeys.timeline.audioByProject(projectId),
      });
      // Also invalidate all scene clip queries for refresh
      qc.invalidateQueries({
        queryKey: queryKeys.audio.clips(),
      });
    },
  });
}
