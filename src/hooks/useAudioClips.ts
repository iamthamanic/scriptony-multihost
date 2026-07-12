/**
 * React Query Hooks für AudioClip CRUD (Ist-Ebene).
 *
 * T28: Clip-CRUD über Feature-Flag vorbereitet.
 * Keine Breaking Changes: Bestehende AudioTrack-Hooks bleiben aktiv.
 *
 * POUR (WCAG):
 * - useAudioClips: Lädt Clips für Scene (Predictable State).
 * - useCreateAudioClip: Optimistische Invalidierung.
 * - useUpdateAudioClip: Targeted Invalidierung.
 * - useDeleteAudioClip: Targeted Invalidierung.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { queryKeys } from "../lib/react-query";
import * as ClipAPI from "../lib/api/audio-clip-api";
import type { AudioClipUpdatePayload } from "../lib/api/audio-clip-api";
import { assignLaneIndex } from "../lib/audio-lane";
import type { AudioClip } from "../lib/types";

// ── Query: Clips by Scene ─────────────────────────────────────────

export function useAudioClips(sceneId: string | undefined) {
  const { getAccessToken, loading: authLoading } = useAuth();

  return useQuery<AudioClip[]>({
    queryKey: queryKeys.audio.clipsByScene(sceneId || ""),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      if (!sceneId) throw new Error("sceneId is required");
      return ClipAPI.getClipsByScene(sceneId, token);
    },
    enabled: !!sceneId && !authLoading,
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ── Mutation: Create ──────────────────────────────────────────────

export function useCreateAudioClip(
  projectId: string | undefined,
  sceneId: string | undefined,
) {
  const qc = useQueryClient();
  const { getAccessToken } = useAuth();

  return useMutation({
    mutationFn: async (clipData: Partial<AudioClip>) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      if (!sceneId || !projectId)
        throw new Error("sceneId and projectId required");

      const existing = await ClipAPI.getClipsByScene(sceneId, token);
      const draft = {
        id: "pending",
        trackId: clipData.trackId ?? "pending",
        sceneId,
        projectId,
        startSec: clipData.startSec ?? 0,
        endSec: clipData.endSec ?? 1,
        laneIndex: 0,
        orderIndex: clipData.orderIndex ?? existing.length,
        trackType: clipData.trackType ?? "dialog",
        ...clipData,
      } as AudioClip;
      const laneIndex = clipData.laneIndex ?? assignLaneIndex(existing, draft);

      return ClipAPI.createClip(
        sceneId,
        projectId,
        { ...clipData, laneIndex },
        token,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.audio.clipsByScene(sceneId || ""),
      });
    },
  });
}

// ── Mutation: Update ──────────────────────────────────────────────

export function useUpdateAudioClip(
  clipId: string,
  sceneId: string | undefined,
) {
  const qc = useQueryClient();
  const { getAccessToken } = useAuth();

  return useMutation({
    mutationFn: async (updates: AudioClipUpdatePayload) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return ClipAPI.updateClip(clipId, updates, token);
    },
    onSuccess: () => {
      // Invalidate spezifische Scene + globale Clip-Liste
      qc.invalidateQueries({
        queryKey: queryKeys.audio.clipsByScene(sceneId || ""),
      });
      qc.invalidateQueries({ queryKey: queryKeys.audio.clips() });
    },
  });
}

// ── Mutation: Delete ─────────────────────────────────────────────

export function useDeleteAudioClip(
  clipId: string,
  sceneId: string | undefined,
) {
  const qc = useQueryClient();
  const { getAccessToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return ClipAPI.deleteClip(clipId, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.audio.clipsByScene(sceneId || ""),
      });
      qc.invalidateQueries({ queryKey: queryKeys.audio.clips() });
    },
  });
}
