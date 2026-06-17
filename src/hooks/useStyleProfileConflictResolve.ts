/**
 * Hook: resolve style profile sync conflicts (T86).
 * Location: src/hooks/useStyleProfileConflictResolve.ts
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveStyleProfileConflict } from "@/lib/style-profile/style-profile-sync-engine";
import { queryKeys } from "@/lib/react-query";
import { toast } from "sonner";

export function useStyleProfileConflictResolve(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      resolution,
    }: {
      profileId: string;
      resolution: "local" | "cloud";
    }) => resolveStyleProfileConflict(profileId, resolution),
    onSuccess: async (_result, vars) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.styleProfiles.byProject(projectId ?? ""),
      });
      toast.success(
        vars.resolution === "cloud"
          ? "Cloud-Version übernommen"
          : "Lokale Version hochgeladen",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
