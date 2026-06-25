/**
 * Hook to render MVE line takes (local desktop) — UI in #23.
 * Location: src/hooks/useMveLineRender.ts
 */

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { renderMveLineForProject } from "@/lib/mve/render-mve-line";
import {
  isLocalProfile,
  requireLocalBackend,
} from "@/lib/api-adapter/runtime-dispatch";
import { useGlobalLoadingProgress } from "@/hooks/useGlobalLoadingProgress";
import { queryKeys } from "@/lib/react-query";
import { MveRenderLineError } from "@/lib/multi-voice-engine/render/render-line";

export function useMveLineRender(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const { runWithProgress } = useGlobalLoadingProgress();
  const enabled = Boolean(projectId) && isLocalProfile();

  const invalidate = useCallback(async () => {
    if (!projectId) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.mve.linesByProject(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.mve.allTakes(projectId),
      }),
    ]);
  }, [projectId, queryClient]);

  const mutation = useMutation({
    mutationFn: async ({
      lineId,
      takeCount,
    }: {
      lineId: string;
      takeCount?: number;
    }) => {
      if (!projectId) {
        throw new MveRenderLineError("Kein Projekt geöffnet.");
      }
      const backend = requireLocalBackend(projectId);
      return renderMveLineForProject({
        projectId,
        lineId,
        projectDir: backend.localProject.dirPath,
        takeCount,
      });
    },
    onSuccess: (_, variables) => {
      void invalidate();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.mve.takesByLine(variables.lineId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.mve.jobsByLine(variables.lineId),
      });
    },
    onError: (err: Error) => {
      if (err instanceof MveRenderLineError) {
        toast.error(err.message);
        return;
      }
      toast.error(err.message || "Render fehlgeschlagen.");
    },
  });

  const renderLine = useCallback(
    async (lineId: string, takeCount?: number) => {
      if (!enabled) {
        toast.info("Line-Render nur in geöffneten lokalen Projekten.");
        return null;
      }
      return runWithProgress({
        id: `mve-render-line-${lineId}`,
        title: "Dialog rendern",
        initialMessage: "Render-Job wird vorbereitet…",
        initialPercent: 5,
        run: async (report) => {
          report({ percent: 15, message: "Stimme wird synthetisiert…" });
          const result = await mutation.mutateAsync({ lineId, takeCount });
          report({
            percent: 100,
            message: `${result.takes.length} Take(s) bereit`,
          });
          return result;
        },
      });
    },
    [enabled, mutation, runWithProgress],
  );

  return {
    enabled,
    renderLine,
    isRendering: mutation.isPending,
    renderingLineId: mutation.isPending
      ? (mutation.variables?.lineId ?? null)
      : null,
  };
}
