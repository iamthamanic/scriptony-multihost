/**
 * React Query: Audio timeline bundle — acts/sequences/scenes + audio tracks + voice assignments + clips.
 * Reuses useProjectTimeline for the structural nodes, then fetches audio data in parallel via project-wide batch calls.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { queryKeys } from "../lib/react-query";
import { useProjectTimeline } from "./useProjectTimeline";
import * as AudioAPI from "../lib/api/audio-story-api";
import * as ClipAPI from "../lib/api/audio-clip-api";
import { isFeatureEnabled } from "../lib/feature-flags";
import type { AudioTimelineData } from "../lib/types/audio-timeline";
import type { AudioTrack, CharacterVoiceAssignment } from "../lib/types";

export function useAudioTimeline(
	projectId: string | undefined,
	projectType?: string | null,
) {
	const { getAccessToken, loading: authLoading } = useAuth();

	// Structural nodes (acts/sequences/scenes) — reuse existing timeline query.
	const { data: structuralData } = useProjectTimeline(projectId, projectType);

	return useQuery<AudioTimelineData>({
		queryKey: queryKeys.timeline.audioByProject(projectId || ""),
		queryFn: async () => {
			const token = await getAccessToken();
			if (!token) throw new Error("Not authenticated");
			if (!structuralData) {
				throw new Error("Structural timeline data not loaded");
			}

			const sceneIds = structuralData.scenes.map((s) => s.id);
			const idSet = new Set(sceneIds);

			// Fetch all tracks + clips for the project in parallel (batch, not N+1).
			const [allTracks, allClips, voiceAssignments] = await Promise.all([
				AudioAPI.getProjectAudioTracks(projectId!).catch(() => [] as AudioTrack[]),
				ClipAPI.getProjectAudioClips(projectId!, token ?? "").catch(() => [] as import("../lib/types").AudioClip[]),
				AudioAPI.getVoiceAssignments(projectId!).catch(() => [] as CharacterVoiceAssignment[]),
			]);

			const tracksByScene: Record<string, AudioTrack[]> = {};
			for (const t of allTracks) {
				const raw = t as unknown as Record<string, unknown>;
				const sid = raw.scene_id as string | undefined;
				if (sid && idSet.has(sid)) {
					if (!tracksByScene[sid]) tracksByScene[sid] = [];
					tracksByScene[sid].push(t);
				}
			}
			// Preserve order per scene (backend already orders by start_time).
			for (const sid of Object.keys(tracksByScene)) {
				tracksByScene[sid].sort(
					(a, b) =>
						((a as unknown as Record<string, number>).start_time ?? 0) -
						((b as unknown as Record<string, number>).start_time ?? 0),
				);
			}

			const clipsByScene: Record<string, import("../lib/types").AudioClip[]> = {};
			for (const c of allClips) {
				const sid = c.sceneId;
				if (sid && idSet.has(sid)) {
					if (!clipsByScene[sid]) clipsByScene[sid] = [];
					clipsByScene[sid].push(c);
				}
			}
			// Preserve order per scene.
			for (const sid of Object.keys(clipsByScene)) {
				clipsByScene[sid].sort((a, b) => (a.laneIndex ?? 0) - (b.laneIndex ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
			}

			const voiceMap: Record<string, CharacterVoiceAssignment> = {};
			voiceAssignments.forEach((va) => {
				voiceMap[va.characterId] = va;
			});

			return {
				acts: structuralData.acts ?? [],
				sequences: structuralData.sequences ?? [],
				scenes: structuralData.scenes ?? [],
				tracksByScene,
				clipsByScene,
				voiceAssignments: voiceMap,
			};
		},
		enabled:
			!!projectId &&
			!authLoading &&
			!!structuralData &&
			(projectType ?? "").toLowerCase() === "audio",
		staleTime: 15 * 1000,
		gcTime: 5 * 60 * 1000,
	});
}

export function useAudioTracks(
	sceneId: string | undefined,
	projectId: string | undefined,
) {
	const { getAccessToken, loading: authLoading } = useAuth();

	return useQuery<AudioTrack[]>({
		queryKey: queryKeys.audio.tracksByScene(sceneId || ""),
		queryFn: async () => {
			const token = await getAccessToken();
			if (!token) throw new Error("Not authenticated");
			return AudioAPI.getSceneAudioTracks(sceneId!);
		},
		enabled: !!sceneId && !!projectId && !authLoading,
		staleTime: 10 * 1000,
	});
}

export function useCreateAudioTrack(
	projectId: string | undefined,
	sceneId: string | undefined,
) {
	const qc = useQueryClient();
	const { getAccessToken } = useAuth();
	const clipSystemEnabled = isFeatureEnabled("audioClipSystem");

	return useMutation({
		mutationFn: async (trackData: Partial<AudioTrack>) => {
			const token = await getAccessToken();
			if (!token) throw new Error("Not authenticated");
			const result = await AudioAPI.createAudioTrack(
				sceneId!,
				projectId!,
				trackData,
			);
			return result.track; // T29: unwrap track from dual-write response
		},
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: queryKeys.audio.tracksByScene(sceneId || ""),
			});
			if (clipSystemEnabled) {
				qc.invalidateQueries({
					queryKey: queryKeys.audio.clipsByScene(sceneId || ""),
				});
			}
		},
	});
}

export function useUpdateAudioTrack(
	trackId: string,
	sceneId: string | undefined,
) {
	const qc = useQueryClient();
	const { getAccessToken } = useAuth();

	return useMutation({
		mutationFn: async (trackData: Partial<AudioTrack>) => {
			const token = await getAccessToken();
			if (!token) throw new Error("Not authenticated");
			return AudioAPI.updateAudioTrack(trackId, trackData);
		},
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: queryKeys.audio.tracksByScene(sceneId || ""),
			});
		},
	});
}

export function useDeleteAudioTrack(
	trackId: string,
	sceneId: string | undefined,
) {
	const qc = useQueryClient();
	const { getAccessToken } = useAuth();

	return useMutation({
		mutationFn: async () => {
			const token = await getAccessToken();
			if (!token) throw new Error("Not authenticated");
			return AudioAPI.deleteAudioTrack(trackId);
		},
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: queryKeys.audio.tracksByScene(sceneId || ""),
			});
		},
	});
}

export function useCharacterVoiceAssignments(projectId: string | undefined) {
	const { getAccessToken, loading: authLoading } = useAuth();

	return useQuery<CharacterVoiceAssignment[]>({
		queryKey: queryKeys.audio.voicesByProject(projectId || ""),
		queryFn: async () => {
			const token = await getAccessToken();
			if (!token) throw new Error("Not authenticated");
			return AudioAPI.getVoiceAssignments(projectId!);
		},
		enabled: !!projectId && !authLoading,
		staleTime: 60 * 1000,
	});
}
