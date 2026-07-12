/**
 * React Query: Audio timeline bundle — acts/sequences/scenes + audio tracks + voice assignments + clips.
 * Reuses useProjectTimeline for the structural nodes, then loads audio via audio-story-adapter (local SQLite or cloud).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { queryKeys } from "../lib/react-query";
import { useProjectTimeline } from "./useProjectTimeline";
import {
  createAudioTrack,
  deleteAudioTrack,
  getProjectAudioClips,
  getProjectAudioTracks,
  getSceneAudioTracks,
  getVoiceAssignments,
  updateAudioTrack,
} from "@/lib/api-adapter/audio-story-adapter";
import { isFeatureEnabled } from "../lib/feature-flags";
import type { AudioTimelineData } from "../lib/types/audio-timeline";
import type {
  AudioClip,
  AudioTrack,
  CharacterVoiceAssignment,
} from "../lib/types";

import { isAudioProjectType } from "../lib/project-type-audio";

function trackSceneId(track: AudioTrack): string | undefined {
  const sid = track.sceneId?.trim();
  if (sid) return sid;
  const legacy = (track as unknown as { scene_id?: string }).scene_id;
  return typeof legacy === "string" && legacy.trim() ? legacy : undefined;
}

function trackSortKey(track: AudioTrack): number {
  const raw = track as unknown as { start_time?: number };
  return track.startTime ?? raw.start_time ?? 0;
}

function groupTracksByScene(
  allTracks: AudioTrack[],
  sceneIds: Set<string>,
): Record<string, AudioTrack[]> {
  const tracksByScene: Record<string, AudioTrack[]> = {};
  for (const t of allTracks) {
    const sid = trackSceneId(t);
    if (sid && sceneIds.has(sid)) {
      if (!tracksByScene[sid]) tracksByScene[sid] = [];
      tracksByScene[sid].push(t);
    }
  }
  for (const sid of Object.keys(tracksByScene)) {
    tracksByScene[sid].sort((a, b) => trackSortKey(a) - trackSortKey(b));
  }
  return tracksByScene;
}

function groupClipsByScene(
  allClips: AudioClip[],
  sceneIds: Set<string>,
): Record<string, AudioClip[]> {
  const clipsByScene: Record<string, AudioClip[]> = {};
  for (const c of allClips) {
    const sid = c.sceneId;
    if (sid && sceneIds.has(sid)) {
      if (!clipsByScene[sid]) clipsByScene[sid] = [];
      clipsByScene[sid].push(c);
    }
  }
  for (const sid of Object.keys(clipsByScene)) {
    clipsByScene[sid].sort(
      (a, b) =>
        (a.laneIndex ?? 0) - (b.laneIndex ?? 0) ||
        (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
    );
  }
  return clipsByScene;
}

export function useAudioTimeline(
  projectId: string | undefined,
  projectType?: string | null,
) {
  const { getAccessToken, loading: authLoading } = useAuth();
  const { data: structuralData } = useProjectTimeline(projectId, projectType);

  const isAudioType = isAudioProjectType(projectType);

  return useQuery<AudioTimelineData>({
    queryKey: queryKeys.timeline.audioByProject(projectId || ""),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      if (!structuralData) {
        throw new Error("Structural timeline data not loaded");
      }

      const idSet = new Set(structuralData.scenes.map((s) => s.id));

      const [allTracks, allClips, voiceAssignments] = await Promise.all([
        getProjectAudioTracks(projectId!),
        getProjectAudioClips(projectId!, token),
        getVoiceAssignments(projectId!),
      ]);

      const voiceMap: Record<string, CharacterVoiceAssignment> = {};
      voiceAssignments.forEach((va) => {
        voiceMap[va.characterId] = va;
      });

      return {
        acts: structuralData.acts ?? [],
        sequences: structuralData.sequences ?? [],
        scenes: structuralData.scenes ?? [],
        tracksByScene: groupTracksByScene(allTracks, idSet),
        clipsByScene: groupClipsByScene(allClips, idSet),
        voiceAssignments: voiceMap,
      };
    },
    enabled: !!projectId && !authLoading && !!structuralData && isAudioType,
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

function invalidateAudioProjectQueries(
  qc: ReturnType<typeof useQueryClient>,
  projectId: string | undefined,
  sceneId: string | undefined,
  clipSystemEnabled: boolean,
) {
  if (projectId) {
    qc.invalidateQueries({
      queryKey: queryKeys.timeline.audioByProject(projectId),
    });
  }
  if (sceneId) {
    qc.invalidateQueries({
      queryKey: queryKeys.audio.tracksByScene(sceneId),
    });
    if (clipSystemEnabled) {
      qc.invalidateQueries({
        queryKey: queryKeys.audio.clipsByScene(sceneId),
      });
    }
  }
}

export function useAudioTracks(
  sceneId: string | undefined,
  projectId: string | undefined,
) {
  const { loading: authLoading } = useAuth();

  return useQuery<AudioTrack[]>({
    queryKey: queryKeys.audio.tracksByScene(sceneId || ""),
    queryFn: async () => getSceneAudioTracks(sceneId!),
    enabled: !!sceneId && !!projectId && !authLoading,
    staleTime: 10 * 1000,
  });
}

export function useCreateAudioTrack(
  projectId: string | undefined,
  sceneId: string | undefined,
) {
  const qc = useQueryClient();
  const clipSystemEnabled = isFeatureEnabled("audioClipSystem");

  return useMutation({
    mutationFn: async (trackData: Partial<AudioTrack>) => {
      const result = await createAudioTrack(sceneId!, projectId!, trackData);
      return result.track;
    },
    onSuccess: () => {
      invalidateAudioProjectQueries(qc, projectId, sceneId, clipSystemEnabled);
    },
  });
}

export function useUpdateAudioTrack(
  trackId: string,
  projectId: string | undefined,
  sceneId: string | undefined,
) {
  const qc = useQueryClient();
  const clipSystemEnabled = isFeatureEnabled("audioClipSystem");

  return useMutation({
    mutationFn: async (trackData: Partial<AudioTrack>) =>
      updateAudioTrack(trackId, trackData),
    onSuccess: () => {
      invalidateAudioProjectQueries(qc, projectId, sceneId, clipSystemEnabled);
    },
  });
}

export function useDeleteAudioTrack(
  trackId: string,
  projectId: string | undefined,
  sceneId: string | undefined,
) {
  const qc = useQueryClient();
  const clipSystemEnabled = isFeatureEnabled("audioClipSystem");

  return useMutation({
    mutationFn: async () => deleteAudioTrack(trackId),
    onSuccess: () => {
      invalidateAudioProjectQueries(qc, projectId, sceneId, clipSystemEnabled);
    },
  });
}

export function useCharacterVoiceAssignments(projectId: string | undefined) {
  const { loading: authLoading } = useAuth();

  return useQuery<CharacterVoiceAssignment[]>({
    queryKey: queryKeys.audio.voicesByProject(projectId || ""),
    queryFn: async () => getVoiceAssignments(projectId!),
    enabled: !!projectId && !authLoading,
    staleTime: 60 * 1000,
  });
}
