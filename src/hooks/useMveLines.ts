/**
 * React Query hook for MVE lines on the Structure Timeline (local desktop).
 * Location: src/hooks/useMveLines.ts
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMveLine,
  deleteMveLine,
  getMveLines,
  updateMveLine,
} from "@/lib/api-adapter/mve-adapter";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { ensureMveLineForClip } from "@/lib/mve/ensure-mve-line-for-clip";
import { queryKeys } from "@/lib/react-query";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { AudioClip } from "@/lib/types";
import { toast } from "sonner";
import { moveTextBlockToScene } from "@/lib/mve/move-text-block-to-scene";
import type { SceneTimeBlock } from "@/lib/mve/resolve-scene-at-timeline-sec";
import {
  reconcileMveSceneDurations,
  syncSceneDurationForMveContent,
} from "@/lib/mve/sync-scene-duration-for-mve-content";
import { isContentDrivenSceneDuration } from "@/lib/mve/scene-duration-policy";
import { useMveLineReorder } from "./useMveLineReorder";

export interface UseMveLinesOptions {
  projectType?: string;
  readingSpeedWpm?: number;
  getSceneBlocks?: () => SceneTimeBlock[];
  getPxPerSec?: () => number;
  /** Reload structure timeline after content-driven scene resize (audio projects). */
  onStructureSynced?: () => void | Promise<void>;
}

export function useMveLines(
  projectId: string | undefined,
  options: UseMveLinesOptions = {},
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(projectId) && isLocalProfile();
  const {
    projectType,
    readingSpeedWpm,
    getSceneBlocks,
    getPxPerSec,
    onStructureSynced,
  } = options;

  const linesQuery = useQuery({
    queryKey: queryKeys.mve.linesByProject(projectId ?? ""),
    queryFn: () => getMveLines(projectId!),
    enabled,
  });

  const reconcileKeyRef = useRef("");

  useEffect(() => {
    reconcileKeyRef.current = "";
  }, [projectId]);

  useEffect(() => {
    if (!enabled || !projectId || linesQuery.isLoading || !linesQuery.data) {
      return;
    }
    if (!isContentDrivenSceneDuration(projectType)) return;

    const lineIds = linesQuery.data
      .map((line) => line.id)
      .sort()
      .join(",");

    void (async () => {
      let sceneBlocks = getSceneBlocks?.() ?? [];
      for (
        let attempt = 0;
        attempt < 30 && sceneBlocks.length === 0;
        attempt += 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        sceneBlocks = getSceneBlocks?.() ?? [];
      }
      if (sceneBlocks.length === 0) return;

      const reconcileKey = `${projectId}:${lineIds}:${sceneBlocks
        .map((block) => `${block.id}:${block.endSec.toFixed(3)}`)
        .join("|")}:px${getPxPerSec?.() ?? 0}`;
      if (reconcileKeyRef.current === reconcileKey) return;
      reconcileKeyRef.current = reconcileKey;

      try {
        const synced = await reconcileMveSceneDurations({
          projectId,
          projectType,
          sceneBlocks,
          lines: linesQuery.data!,
          readingSpeedWpm,
          pxPerSec: getPxPerSec?.(),
        });
        if (!synced) return;
        await queryClient.invalidateQueries({
          queryKey: queryKeys.timeline.byProject(projectId),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.timeline.audioByProject(projectId),
        });
        await onStructureSynced?.();
      } catch (err) {
        console.warn("[MVE] Szene-Reconcile fehlgeschlagen:", err);
      }
    })();
  }, [
    enabled,
    projectId,
    projectType,
    linesQuery.data,
    linesQuery.isLoading,
    readingSpeedWpm,
    getSceneBlocks,
    getPxPerSec,
    queryClient,
    onStructureSynced,
  ]);

  const syncSceneForLine = useCallback(
    async (
      lineId: string,
      clipId?: string,
      clipEndSec?: number,
      linesOverride?: MveLine[],
    ) => {
      if (!projectId) return;
      const sceneBlocks = getSceneBlocks?.() ?? [];
      if (sceneBlocks.length === 0) return;

      try {
        const lines = linesOverride ?? (await getMveLines(projectId));
        const line = lines.find((l) => l.id === lineId);
        if (!line) return;

        const { synced, requiredEndSec } = await syncSceneDurationForMveContent(
          {
            projectId,
            projectType,
            sceneId: line.sceneId,
            sceneBlocks,
            lines,
            readingSpeedWpm,
            clipId,
            clipEndSec,
            pxPerSec: getPxPerSec?.(),
          },
        );
        const sceneBlock = sceneBlocks.find((b) => b.id === line.sceneId);
        const needsGrow =
          sceneBlock &&
          requiredEndSec != null &&
          requiredEndSec > sceneBlock.endSec + 1e-6;
        const needsShrink =
          sceneBlock &&
          requiredEndSec != null &&
          requiredEndSec < sceneBlock.endSec - 1e-6;

        if (synced) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.timeline.byProject(projectId),
          });
          await queryClient.invalidateQueries({
            queryKey: queryKeys.timeline.audioByProject(projectId),
          });
          await onStructureSynced?.();
        } else if (needsGrow && isContentDrivenSceneDuration(projectType)) {
          console.warn(
            "[MVE] Szene konnte nicht verlängert werden:",
            line.sceneId,
            { requiredEndSec, sceneEndSec: sceneBlock?.endSec },
          );
          toast.message(
            "Szene konnte nicht automatisch verlängert werden — Struktur-Verschieben prüfen.",
            { duration: 3500 },
          );
        } else if (needsShrink && isContentDrivenSceneDuration(projectType)) {
          console.warn(
            "[MVE] Szene konnte nicht verkürzt werden:",
            line.sceneId,
            { requiredEndSec, sceneEndSec: sceneBlock?.endSec },
          );
        }
      } catch (err) {
        console.warn("[MVE] Szene-Dauer-Sync fehlgeschlagen:", err);
      }
    },
    [
      projectId,
      projectType,
      readingSpeedWpm,
      getSceneBlocks,
      getPxPerSec,
      queryClient,
      onStructureSynced,
    ],
  );

  const syncSceneForDraftLine = useCallback(
    async (lineId: string, draftText: string) => {
      if (!projectId) return;
      const lines = linesQuery.data ?? [];
      const merged = lines.map((line) =>
        line.id === lineId ? { ...line, text: draftText } : line,
      );
      await syncSceneForLine(lineId, undefined, undefined, merged);
    },
    [projectId, linesQuery.data, syncSceneForLine],
  );

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
    onSuccess: async (_data, { lineId }) => {
      await invalidate();
      await syncSceneForLine(lineId);
    },
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

  const bindAudioClipMutation = useMutation({
    mutationFn: async ({
      lineId,
      audioClipId,
    }: {
      lineId: string;
      audioClipId: string | null;
    }) =>
      updateMveLine(lineId, {
        audioClipId,
        status: "dirty",
      }),
    onSuccess: () => void invalidate(),
    onError: (err: Error) => {
      toast.error(err.message || "Audio-Clip konnte nicht verknüpft werden.");
    },
  });

  const createLineMutation = useMutation({
    mutationFn: async (payload: {
      sceneId: string;
      characterId: string;
      text?: string;
      orderIndex?: number;
    }) => createMveLine(projectId!, payload),
    onSuccess: async (line) => {
      await invalidate();
      await syncSceneForLine(line.id);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Textblock konnte nicht erstellt werden.");
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

  const bindAudioClip = useCallback(
    async (lineId: string, audioClipId: string | null) => {
      await bindAudioClipMutation.mutateAsync({ lineId, audioClipId });
    },
    [bindAudioClipMutation],
  );

  const createLine = useCallback(
    async (payload: {
      sceneId: string;
      characterId: string;
      text?: string;
      orderIndex?: number;
    }) => createLineMutation.mutateAsync(payload),
    [createLineMutation],
  );

  const moveLineToSceneMutation = useMutation({
    mutationFn: async ({
      lineId,
      targetSceneId,
      sceneBlocks,
    }: {
      lineId: string;
      targetSceneId: string;
      sceneBlocks: SceneTimeBlock[];
    }) =>
      moveTextBlockToScene({
        projectId: projectId!,
        lineId,
        targetSceneId,
        sceneBlocks,
      }),
    onSuccess: async () => {
      await invalidate();
      if (projectId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.timeline.audioByProject(projectId),
        });
      }
      toast.success("Textblock in neue Szene verschoben.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Textblock konnte nicht verschoben werden.");
    },
  });

  const moveLineToScene = useCallback(
    async (
      lineId: string,
      targetSceneId: string,
      sceneBlocks: SceneTimeBlock[],
    ) => {
      await moveLineToSceneMutation.mutateAsync({
        lineId,
        targetSceneId,
        sceneBlocks,
      });
    },
    [moveLineToSceneMutation],
  );

  const lineReorder = useMveLineReorder(projectId, invalidate);

  const deleteLineMutation = useMutation({
    mutationFn: async (lineId: string) => deleteMveLine(lineId),
    onSuccess: async () => {
      await invalidate();
      if (projectId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.timeline.audioByProject(projectId),
        });
      }
      toast.success("Textblock gelöscht.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Textblock konnte nicht gelöscht werden.");
    },
  });

  const deleteLine = useCallback(
    async (lineId: string) => {
      await deleteLineMutation.mutateAsync(lineId);
    },
    [deleteLineMutation],
  );

  return {
    lines: linesQuery.data ?? [],
    lineByClipId,
    isLoading: linesQuery.isLoading,
    isError: linesQuery.isError,
    enabled,
    ensureForClip,
    createLine,
    saveLineText,
    saveLineDirection,
    bindAudioClip,
    moveLineToScene,
    reorderLineInScene: lineReorder.reorderLineInScene,
    deleteLine,
    syncSceneForDraftLine,
    isSaving:
      saveTextMutation.isPending ||
      saveDirectionMutation.isPending ||
      bindAudioClipMutation.isPending ||
      createLineMutation.isPending ||
      moveLineToSceneMutation.isPending ||
      lineReorder.isPending ||
      deleteLineMutation.isPending,
  };
}

export type UseMveLinesResult = ReturnType<typeof useMveLines>;
