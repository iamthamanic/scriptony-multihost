/**
 * React Query hooks for project style profiles.
 * Location: src/hooks/useProjectStyleProfiles.ts
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStyleProfile,
  deleteStyleProfile,
  duplicateStyleProfile,
  exportStyleProfileJson,
  getActiveStyleProfileId,
  getStyleProfile,
  importFromStyleGuide,
  listStyleProfiles,
  setActiveStyleProfile,
  type CreateStyleProfilePayload,
  type UpdateStyleProfilePatch,
  updateStyleProfile,
  uploadStyleProfilePreview,
} from "@/lib/api/style-profile-api";
import { queryKeys } from "@/lib/react-query";
import { toast } from "sonner";

export function useProjectStyleProfiles(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.styleProfiles.byProject(projectId ?? ""),
    queryFn: () => listStyleProfiles(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useStyleProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.styleProfiles.byId(profileId ?? ""),
    queryFn: () => getStyleProfile(profileId!),
    enabled: Boolean(profileId),
  });
}

export function useActiveStyleProfileId(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.styleProfiles.active(projectId ?? ""),
    queryFn: () => getActiveStyleProfileId(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useSetActiveStyleProfile(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string | null) =>
      setActiveStyleProfile(projectId, profileId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.styleProfiles.byProject(projectId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.styleProfiles.active(projectId),
      });
      toast.success("Aktives Projekt-Style gesetzt");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useStyleProfileMutations(projectId: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.styleProfiles.byProject(projectId),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.styleProfiles.active(projectId),
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateStyleProfilePayload) =>
      createStyleProfile(projectId, payload),
    onSuccess: async () => {
      await invalidate();
      toast.success("Style Profile erstellt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      profileId,
      patch,
    }: {
      profileId: string;
      patch: UpdateStyleProfilePatch;
    }) => updateStyleProfile(profileId, patch),
    onSuccess: async (_data, vars) => {
      await invalidate();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.styleProfiles.byId(vars.profileId),
      });
      toast.success("Gespeichert");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (profileId: string) => duplicateStyleProfile(profileId),
    onSuccess: async () => {
      await invalidate();
      toast.success("Dupliziert");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (profileId: string) => deleteStyleProfile(profileId),
    onSuccess: async () => {
      await invalidate();
      toast.success("Gelöscht");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setActiveMutation = useMutation({
    mutationFn: (profileId: string | null) =>
      setActiveStyleProfile(projectId, profileId),
    onSuccess: async () => {
      await invalidate();
      toast.success("Aktives Projekt-Style gesetzt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportMutation = useMutation({
    mutationFn: (profileId: string) => exportStyleProfileJson(profileId),
    onError: (e: Error) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: (profileId: string) =>
      importFromStyleGuide(projectId, profileId),
    onSuccess: async (_data, profileId) => {
      await invalidate();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.styleProfiles.byId(profileId),
      });
      toast.success("Aus Style Guide importiert");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadPreviewMutation = useMutation({
    mutationFn: ({ profileId, file }: { profileId: string; file: File }) =>
      uploadStyleProfilePreview(profileId, file),
    onSuccess: async (_data, vars) => {
      await invalidate();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.styleProfiles.byId(vars.profileId),
      });
      toast.success("Vorschaubild hochgeladen");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    createMutation,
    updateMutation,
    duplicateMutation,
    deleteMutation,
    setActiveMutation,
    exportMutation,
    importMutation,
    uploadPreviewMutation,
    invalidate,
  };
}
