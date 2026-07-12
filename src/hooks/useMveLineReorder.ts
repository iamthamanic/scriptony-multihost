/**
 * In-scene horizontal reorder mutation for MVE text blocks (T32 follow-up).
 * Extracted from useMveLines.ts to keep that hook within the file-size budget.
 *
 * Location: src/hooks/useMveLineReorder.ts
 */

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { reorderTextBlockInScene } from "@/lib/mve/reorder-text-block-in-scene";

export function useMveLineReorder(
  projectId: string | undefined,
  invalidate: () => Promise<void>,
) {
  const mutation = useMutation({
    mutationFn: async ({
      lineId,
      sceneId,
      targetIndex,
    }: {
      lineId: string;
      sceneId: string;
      targetIndex: number;
    }) =>
      reorderTextBlockInScene({
        projectId: projectId!,
        lineId,
        sceneId,
        targetIndex,
      }),
    onSuccess: async ({ reordered }) => {
      if (!reordered) return;
      await invalidate();
    },
    onError: (err: Error) => {
      toast.error(
        err.message || "Textblock konnte nicht neu angeordnet werden.",
      );
    },
  });

  const reorderLineInScene = useCallback(
    async (lineId: string, sceneId: string, targetIndex: number) => {
      await mutation.mutateAsync({ lineId, sceneId, targetIndex });
    },
    [mutation],
  );

  return { reorderLineInScene, isPending: mutation.isPending };
}
