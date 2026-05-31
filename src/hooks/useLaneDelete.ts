/**
 * useLaneDelete — handles lane deletion (deletes all clips on a lane).
 * Extracted from useProjectClipLanes.ts to respect the 300-line file limit (KISS/SOLID).
 */

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "../lib/react-query";
import * as ClipAPI from "../lib/api/audio-clip-api";
import { resolveDomainAuthTokenOrEmpty } from "../lib/api-adapter/domain-access";
import type { AudioClip } from "../lib/types";

export function useLaneDelete(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const [isDeletingLane, setIsDeletingLane] = useState(false);

  const handleDeleteLane = useCallback(
    async (laneIndex: number, allClips: AudioClip[]) => {
      const clipsToDelete = allClips.filter((c) => c.laneIndex === laneIndex);
      if (clipsToDelete.length === 0) {
        toast.info("Diese Spur ist leer — nichts zu löschen.");
        return;
      }

      const confirmed = window.confirm(
        `${clipsToDelete.length} Audio-Clip${clipsToDelete.length > 1 ? "s" : ""} von dieser Spur löschen?`,
      );
      if (!confirmed) return;

      setIsDeletingLane(true);
      try {
        const token = await resolveDomainAuthTokenOrEmpty();
        for (const clip of clipsToDelete) {
          await ClipAPI.deleteClip(clip.id, token);
        }
        const sceneIds = [...new Set(clipsToDelete.map((c) => c.sceneId))];
        for (const sceneId of sceneIds) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.audio.clipsByScene(sceneId),
          });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.audio.clips() });
        toast.success("Spur gelöscht");
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Spur konnte nicht gelöscht werden.",
        );
      } finally {
        setIsDeletingLane(false);
      }
    },
    [queryClient],
  );

  return { isDeletingLane, handleDeleteLane };
}
