/**
 * React Query: Ripple-Update Hook (T30).
 *
 * Optimiertes Update mit Debounced Persistenz + Optimistic UI.
 * 500ms nach letzter Änderung → Backend-Sync.
 * Bei Fehler → Rollback auf letzten konsistenten Zustand.
 */

import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { queryKeys } from "../lib/react-query";
import * as ClipAPI from "../lib/api/audio-clip-api";
import type { AudioClip } from "../lib/types";
import type { RippleOutput } from "../lib/ripple-engine";

export interface RippleVariables {
	changedClipId: string;
	newEndSec: number;
	allClips: AudioClip[];
	allScenes: Array<Record<string, unknown>>;
	allSequences: Array<Record<string, unknown>>;
	allActs: Array<Record<string, unknown>>;
	sceneId: string;
	projectId: string;
	/** T30: Lokales Ripple-Ergebnis für optimistisches UI-Update */
	localResult: RippleOutput;
	/** T30: Alle betroffenen Scene-IDs für Query-Invalidierung */
	affectedSceneIds: string[];
}

export function useRippleUpdate(
	sceneId: string | undefined,
	projectId: string | undefined,
) {
	const qc = useQueryClient();
	const { getAccessToken } = useAuth();
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
		// T30: Optimistisches UI-Update → Query-Cache SOFORT aktualisieren
		onMutate: async (vars) => {
			const { localResult } = vars;

			// Cancelle ausstehende Refetches für diese Queries
			await qc.cancelQueries({
				queryKey: queryKeys.audio.clipsByScene(sceneId || ""),
			});

			// Speichere vorherigen Zustand für Rollback
			const previousClips = qc.getQueryData<AudioClip[]>(
				queryKeys.audio.clipsByScene(sceneId || ""),
			);

			// Aktualisiere Clips im Cache mit Ripple-Ergebnis
			qc.setQueryData(
				queryKeys.audio.clipsByScene(sceneId || ""),
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

			return { previousClips };
		},
		onError: (_err, vars, context) => {
			// T30: Rollback bei Fehler
			if (context?.previousClips) {
				qc.setQueryData(
					queryKeys.audio.clipsByScene(sceneId || ""),
					context.previousClips,
				);
			}
			// T30: Invalidate ALLE betroffenen Szenen
			for (const sid of vars.affectedSceneIds) {
				qc.invalidateQueries({
					queryKey: queryKeys.audio.clipsByScene(sid),
				});
			}
			qc.invalidateQueries({
				queryKey: queryKeys.audio.tracksByScene(sceneId || ""),
			});
			if (projectId) {
				qc.invalidateQueries({
					queryKey: queryKeys.timeline.audioByProject(projectId),
				});
			}
		},
		onSuccess: (_data, vars) => {
			// T30: Invalidate ALLE betroffenen Szenen (nicht nur die erste)
			for (const sid of vars.affectedSceneIds) {
				qc.invalidateQueries({
					queryKey: queryKeys.audio.clipsByScene(sid),
				});
			}
			qc.invalidateQueries({
				queryKey: queryKeys.audio.tracksByScene(sceneId || ""),
			});
			if (projectId) {
				qc.invalidateQueries({
					queryKey: queryKeys.timeline.audioByProject(projectId),
				});
			}
		},
	});

	/**
	 * Debounced Ripple-Update.
	 * Ruft mutation nach 500ms auf, bricht vorherige Timer ab.
	 */
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
