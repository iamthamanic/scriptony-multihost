/**
 * React Query: Ripple-Update Hook (T30).
 *
 * Optimiertes Update mit Debounced Persistenz.
 * 500ms nach letzter Änderung → Backend-Sync.
 * Bei Fehler → refetchTimeline() für Rollback.
 */

import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { queryKeys } from "../lib/react-query";
import * as ClipAPI from "../lib/api/audio-clip-api";
import type { AudioClip } from "../lib/types";

interface RippleVariables {
	changedClipId: string;
	newEndSec: number;
	allClips: AudioClip[];
	allScenes: Array<Record<string, unknown>>;
	allSequences: Array<Record<string, unknown>>;
	allActs: Array<Record<string, unknown>>;
	sceneId: string;
	projectId: string;
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
		onSuccess: () => {
			// T30: Invalidate alle betroffenen Queries für konsistente Timeline
			qc.invalidateQueries({
				queryKey: queryKeys.audio.clipsByScene(sceneId || ""),
			});
			qc.invalidateQueries({
				queryKey: queryKeys.audio.tracksByScene(sceneId || ""),
			});
			if (projectId) {
				qc.invalidateQueries({
					queryKey: queryKeys.timeline.audioByProject(projectId),
				});
			}
		},
		onError: () => {
			// T30: Bei Backend-Fehler → refetch für Rollback auf letzten konsistenten Zustand
			qc.invalidateQueries({
				queryKey: queryKeys.audio.clipsByScene(sceneId || ""),
			});
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
