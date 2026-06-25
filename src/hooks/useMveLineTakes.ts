/**
 * React Query hook for MVE takes on a line (#23).
 * Location: src/hooks/useMveLineTakes.ts
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMveTakesByLine,
  selectMveTake,
} from "@/lib/api-adapter/mve-render-adapter";
import {
  getOpenLocalProjectId,
  isLocalProfile,
} from "@/lib/api-adapter/runtime-dispatch";
import { queryKeys } from "@/lib/react-query";
import { syncClipWithSelectedTake } from "@/lib/mve/sync-clip-with-selected-take";

export function useMveLineTakes(
  lineId: string | undefined,
  projectId: string | undefined,
) {
  const queryClient = useQueryClient();
  const effectiveProjectId = projectId ?? getOpenLocalProjectId();
  const enabled =
    Boolean(lineId) && Boolean(effectiveProjectId) && isLocalProfile();

  const takesQuery = useQuery({
    queryKey: queryKeys.mve.takesByLine(lineId ?? ""),
    queryFn: () => getMveTakesByLine(lineId!),
    enabled,
  });

  const selectMutation = useMutation({
    mutationFn: async (takeId: string) => {
      if (!lineId) throw new Error("Keine Line-ID.");
      const result = await selectMveTake(lineId, takeId);
      if (effectiveProjectId) {
        try {
          await syncClipWithSelectedTake(effectiveProjectId, lineId);
        } catch (err) {
          console.warn(
            "[MVE] Clip-Sync nach Take-Auswahl fehlgeschlagen:",
            err,
          );
          toast.error(
            err instanceof Error
              ? err.message
              : "Clip konnte nicht mit Take synchronisiert werden.",
          );
        }
      }
      return result;
    },
    onSuccess: async () => {
      if (!lineId) return;
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mve.takesByLine(lineId),
      });
      if (effectiveProjectId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.mve.linesByProject(effectiveProjectId),
        });
        await queryClient.invalidateQueries({
          queryKey: ["project", effectiveProjectId, "clips"],
        });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Take konnte nicht ausgewählt werden.");
    },
  });

  return {
    takes: takesQuery.data ?? [],
    isLoading: takesQuery.isLoading,
    selectTake: selectMutation.mutateAsync,
    isSelecting: selectMutation.isPending,
    enabled,
  };
}
