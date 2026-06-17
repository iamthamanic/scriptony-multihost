/**
 * Editor state for a single style profile (dirty tracking).
 * Location: src/hooks/useStyleProfileEditor.ts
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { StyleProfile, StyleProfileSpec } from "@/lib/types/style-profile";
import {
  useStyleProfile,
  useStyleProfileMutations,
} from "./useProjectStyleProfiles";

export function useStyleProfileEditor(
  projectId: string,
  profileId: string | undefined,
) {
  const {
    data: loaded,
    isLoading,
    isError,
    isFetched,
    error,
  } = useStyleProfile(profileId);
  const { updateMutation } = useStyleProfileMutations(projectId);
  const [draft, setDraft] = useState<StyleProfile | null>(null);

  useEffect(() => {
    if (loaded) setDraft(structuredClone(loaded));
  }, [loaded]);

  const isDirty = useMemo(() => {
    if (!loaded || !draft) return false;
    return JSON.stringify(loaded) !== JSON.stringify(draft);
  }, [loaded, draft]);

  const setSpec = useCallback((spec: StyleProfileSpec) => {
    setDraft((prev) => (prev ? { ...prev, spec } : prev));
  }, []);

  const setName = useCallback((name: string) => {
    setDraft((prev) => (prev ? { ...prev, name } : prev));
  }, []);

  const discard = useCallback(() => {
    if (loaded) setDraft(structuredClone(loaded));
  }, [loaded]);

  const save = useCallback(() => {
    if (!draft || !profileId) return;
    updateMutation.mutate({
      profileId,
      patch: {
        name: draft.name,
        description: draft.description,
        type: draft.type,
        status: draft.status,
        spec: draft.spec,
        source: draft.source,
      },
    });
  }, [draft, profileId, updateMutation]);

  return {
    profile: draft,
    isLoading,
    isError,
    isFetched,
    loadError: error,
    isDirty,
    isSaving: updateMutation.isPending,
    setSpec,
    setName,
    setDraft,
    discard,
    save,
  };
}
