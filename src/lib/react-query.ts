/**
 * 🚀 REACT QUERY SETUP
 *
 * Performance-optimierte Query Configuration für "übertrieben schnelle" UX
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * QueryClient mit aggressiver Cache-Strategie
 *
 * ⚡ PERFORMANCE TARGETS:
 * - Beats laden in <10ms (aus Cache)
 * - Stale-While-Revalidate für instant UI
 * - Optimistic Updates für alle Mutations
 * - Background Refetching für freshness
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ Cache für 5 Minuten (beats ändern sich selten)
      gcTime: 5 * 60 * 1000,

      // 🔥 Daten werden nach 30s als "stale" markiert → background refetch
      staleTime: 30 * 1000,

      // ✅ Zeige alte Daten während neue laden (instant UI!)
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,

      // 🎯 Retry Strategy
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

      // 📊 Network Mode
      networkMode: "online",
    },
    mutations: {
      // 🎯 Mutations ohne Retry (UX-Gründe)
      retry: false,

      // 📊 Network Mode
      networkMode: "online",
    },
  },
});

/**
 * Query Keys Factory
 *
 * Zentralisierte Query Keys für einfaches Invalidation & Prefetching
 */
export const queryKeys = {
  // Beats
  beats: {
    all: ["beats"] as const,
    byProject: (projectId: string) => ["beats", "project", projectId] as const,
  },

  // Projects
  projects: {
    all: ["projects"] as const,
    byId: (projectId: string) => ["projects", projectId] as const,
    byOrg: (orgId: string) => ["projects", "org", orgId] as const,
  },

  // Acts
  acts: {
    all: ["acts"] as const,
    byProject: (projectId: string) => ["acts", "project", projectId] as const,
  },

  /** Full timeline bundle (acts/sequences/scenes[/shots]) per project */
  timeline: {
    byProject: (projectId: string) =>
      ["timeline", "bundle", projectId] as const,
    audioByProject: (projectId: string) =>
      ["timeline", "audio", projectId] as const,
  },

  // Audio
  audio: {
    tracksByScene: (sceneId: string) =>
      ["audio", "tracks", "scene", sceneId] as const,
    clipsByScene: (sceneId: string) =>
      ["audio", "clips", "scene", sceneId] as const,
    clips: () => ["audio", "clips"] as const,
    voicesByProject: (projectId: string) =>
      ["audio", "voices", "project", projectId] as const,
    sessionsByScene: (sceneId: string) =>
      ["audio", "sessions", "scene", sceneId] as const,
    dialogLaneOrder: (projectId: string) =>
      ["audio", "dialogLaneOrder", projectId] as const,
    charactersByProject: (projectId: string) =>
      ["characters", "project", projectId] as const,
    localVoices: () => ["audio", "localVoices"] as const,
    sceneAudioLaneLinks: (projectId: string) =>
      ["audio", "sceneAudioLaneLinks", projectId] as const,
  },

  // Playbook
  playbook: {
    all: ["playbook"] as const,
    byProject: (projectId: string) =>
      ["playbook", "project", projectId] as const,
  },

  // Puppet-Layer: Render Jobs
  renderJobs: {
    byShot: (shotId: string) => ["renderJobs", "shot", shotId] as const,
    byId: (jobId: string) => ["renderJobs", jobId] as const,
  },

  // Puppet-Layer: Freshness
  freshness: {
    byShot: (shotId: string) => ["freshness", "shot", shotId] as const,
  },
} as const;

/**
 * Invalidate caches related to character and dialog lane data.
 * Call this after character create/delete in UI handlers.
 */
export async function invalidateCharacterCaches(
  projectId: string,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.audio.charactersByProject(projectId),
  });
  await queryClient.invalidateQueries({
    queryKey: queryKeys.audio.dialogLaneOrder(projectId),
  });
}
