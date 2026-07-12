/**
 * React Query: Ripple-Update Hook (T30).
 *
 * Optimiertes Update mit Debounced Persistenz + Optimistic UI.
 * 500ms nach letzter Änderung → Backend-Sync.
 * Bei Fehler → Rollback auf letzten konsistenten Zustand.
 */

import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { queryKeys } from "../lib/react-query";
import * as ClipAPI from "../lib/api/audio-clip-api";
import type { AudioClip } from "../lib/types";
import type {
  RippleAct,
  RippleOutput,
  RippleScene,
  RippleSequence,
} from "../lib/ripple-engine";

export interface RippleVariables {
  changedClipId: string;
  newEndSec: number;
  allClips: AudioClip[];
  allScenes: RippleScene[];
  allSequences: RippleSequence[];
  allActs: RippleAct[];
  projectId: string;
  /** T30: Lokales Ripple-Ergebnis für optimistisches UI-Update */
  localResult: RippleOutput;
  /** T30: Alle betroffenen Scene-IDs für Query-Invalidierung */
  affectedSceneIds: string[];
}

export function useRippleUpdate(projectId: string | undefined) {
  const qc = useQueryClient();
  const { getAccessToken } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async (vars: RippleVariables) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return ClipAPI.rippleClips(
        {
          changedClipId: vars.changedClipId,
          newEndSec: vars.newEndSec,
          allClips: vars.allClips,
          allScenes: vars.allScenes,
          allSequences: vars.allSequences,
          allActs: vars.allActs,
        },
        token,
      );
    },
    onMutate: async (vars) => {
      const { localResult, affectedSceneIds } = vars;
      const changedSceneId = vars.allClips.find(
        (c) => c.id === vars.changedClipId,
      )?.sceneId;
      const sceneIds = [
        ...new Set(
          [
            ...affectedSceneIds,
            ...localResult.updatedClips.map((c) => c.sceneId),
            changedSceneId,
          ].filter((x): x is string => Boolean(x)),
        ),
      ];

      for (const sid of sceneIds) {
        await qc.cancelQueries({
          queryKey: queryKeys.audio.clipsByScene(sid),
        });
      }

      const rollbackByScene: Record<string, AudioClip[] | undefined> = {};
      for (const sid of sceneIds) {
        rollbackByScene[sid] = qc.getQueryData<AudioClip[]>(
          queryKeys.audio.clipsByScene(sid),
        );
        qc.setQueryData(
          queryKeys.audio.clipsByScene(sid),
          (prev: AudioClip[] | undefined) => {
            if (!prev) return prev;
            const updatedMap = new Map(
              localResult.updatedClips.map((c) => [c.id, c]),
            );
            return prev.map((c) => {
              const updated = updatedMap.get(c.id);
              if (updated) {
                return {
                  ...c,
                  startSec: updated.startSec,
                  endSec: updated.endSec,
                };
              }
              return c;
            });
          },
        );
      }

      return { rollbackByScene };
    },
    onError: (_err, vars, context) => {
      if (context?.rollbackByScene) {
        for (const [sid, prev] of Object.entries(context.rollbackByScene)) {
          if (prev) {
            qc.setQueryData(queryKeys.audio.clipsByScene(sid), prev);
          }
        }
      }
      const invalidateScenes =
        vars.affectedSceneIds.length > 0
          ? vars.affectedSceneIds
          : Object.keys(context?.rollbackByScene ?? {});
      for (const sid of invalidateScenes) {
        qc.invalidateQueries({
          queryKey: queryKeys.audio.clipsByScene(sid),
        });
      }
      for (const sid of invalidateScenes) {
        qc.invalidateQueries({
          queryKey: queryKeys.audio.tracksByScene(sid),
        });
      }
      if (projectId) {
        qc.invalidateQueries({
          queryKey: queryKeys.timeline.audioByProject(projectId),
        });
      }
    },
    onSuccess: (_data, vars) => {
      const invalidateScenes = [
        ...new Set(
          [
            ...vars.affectedSceneIds,
            ...vars.localResult.updatedClips.map((c) => c.sceneId),
            vars.allClips.find((c) => c.id === vars.changedClipId)?.sceneId,
          ].filter((x): x is string => Boolean(x)),
        ),
      ];
      for (const sid of invalidateScenes) {
        qc.invalidateQueries({
          queryKey: queryKeys.audio.clipsByScene(sid),
        });
      }
      for (const sid of invalidateScenes) {
        qc.invalidateQueries({
          queryKey: queryKeys.audio.tracksByScene(sid),
        });
      }
      if (projectId) {
        qc.invalidateQueries({
          queryKey: queryKeys.timeline.audioByProject(projectId),
        });
      }
    },
  });

  const debouncedRippleUpdate = useCallback(
    (vars: RippleVariables) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        mutation.mutate(vars);
      }, 500);
    },
    [mutation],
  );

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    debouncedUpdate: debouncedRippleUpdate,
    isPending: mutation.isPending,
  };
}

export default useRippleUpdate;
