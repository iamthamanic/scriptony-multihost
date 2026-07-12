/**
 * React Query hook for MVE voice profiles (local desktop).
 * Location: src/hooks/useMveVoiceProfiles.ts
 */

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMveVoiceProfiles } from "@/lib/api-adapter/mve-adapter";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { queryKeys } from "@/lib/react-query";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

export function useMveVoiceProfiles(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const enabled = Boolean(projectId) && isLocalProfile();

  const profilesQuery = useQuery({
    queryKey: queryKeys.mve.voiceProfilesByProject(projectId ?? ""),
    queryFn: () => getMveVoiceProfiles(projectId!),
    enabled,
  });

  const profileByCharacterId = useMemo(() => {
    const map = new Map<string, MveVoiceProfile>();
    for (const profile of profilesQuery.data ?? []) {
      if (profile.characterId) {
        map.set(profile.characterId, profile);
      }
    }
    return map;
  }, [profilesQuery.data]);

  const invalidate = useCallback(async () => {
    if (!projectId) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.mve.voiceProfilesByProject(projectId),
    });
  }, [projectId, queryClient]);

  return {
    profiles: profilesQuery.data ?? [],
    profileByCharacterId,
    isLoading: profilesQuery.isLoading,
    isError: profilesQuery.isError,
    enabled,
    invalidate,
  };
}

export type UseMveVoiceProfilesResult = ReturnType<typeof useMveVoiceProfiles>;
