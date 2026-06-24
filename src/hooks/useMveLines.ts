/**
 * React Query hook for MVE lines on the Structure Timeline (local desktop).
 * Location: src/hooks/useMveLines.ts
 */

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMveLines, updateMveLine } from "@/lib/api-adapter/mve-adapter";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { ensureMveLineForClip } from "@/lib/mve/ensure-mve-line-for-clip";
import { queryKeys } from "@/lib/react-query";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { AudioClip } from "@/lib/types";
import { toast } from "sonner";

export function useMveLines(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const enabled = Boolean(projectId) && isLocalProfile();

  const linesQuery = useQuery({
    queryKey: queryKeys.mve.linesByProject(projectId ?? ""),
    queryFn: () => getMveLines(projectId!),
    enabled,
  });

  const lineByClipId = useMemo(() => {
    const map = new Map<string, MveLine>();
    for (const line of linesQuery.data ?? []) {
      if (line.audioClipId) map.set(line.audioClipId, line);
    }
    return map;
  }, [linesQuery.data]);

  const invalidate = useCallback(async () => {
    if (!projectId) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.mve.linesByProject(projectId),
    });
  }, [projectId, queryClient]);

  const saveTextMutation = useMutation({
    mutationFn: async ({ lineId, text }: { lineId: string; text: string }) =>
      updateMveLine(lineId, {
        text,
        status: "dirty",
      }),
    onSuccess: () => void invalidate(),
    onError: (err: Error) => {
      toast.error(err.message || "Dialogtext konnte nicht gespeichert werden.");
    },
  });

  const saveDirectionMutation = useMutation({
    mutationFn: async ({
      lineId,
      direction,
    }: {
      lineId: string;
      direction: MveLineDirection;
    }) =>
      updateMveLine(lineId, {
        direction,
        status: "dirty",
      }),
    onSuccess: () => void invalidate(),
    onError: (err: Error) => {
      toast.error(err.message || "Regie konnte nicht gespeichert werden.");
    },
  });

  const ensureForClip = useCallback(
    async (clip: AudioClip, text?: string, characterId?: string) => {
      if (!projectId || !enabled) return null;
      const line = await ensureMveLineForClip({
        projectId,
        clip,
        text,
        characterId,
      });
      await invalidate();
      return line;
    },
    [projectId, enabled, invalidate],
  );

  const saveLineText = useCallback(
    async (lineId: string, text: string) => {
      await saveTextMutation.mutateAsync({ lineId, text });
    },
    [saveTextMutation],
  );

  const saveLineDirection = useCallback(
    async (lineId: string, direction: MveLineDirection) => {
      await saveDirectionMutation.mutateAsync({ lineId, direction });
    },
    [saveDirectionMutation],
  );

  return {
    lines: linesQuery.data ?? [],
    lineByClipId,
    isLoading: linesQuery.isLoading,
    isError: linesQuery.isError,
    enabled,
    ensureForClip,
    saveLineText,
    saveLineDirection,
    isSaving: saveTextMutation.isPending || saveDirectionMutation.isPending,
  };
}

export type UseMveLinesResult = ReturnType<typeof useMveLines>;
