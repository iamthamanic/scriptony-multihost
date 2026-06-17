/**
 * Hook: bidirectional style profile cloud sync (Step 3).
 * Location: src/hooks/useStyleProfileSync.ts
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  countPendingStyleProfileSync,
  countStyleProfileConflicts,
  syncStyleProfilesBidirectional,
} from "@/lib/style-profile/style-profile-sync-engine";
import { queryKeys } from "@/lib/react-query";
import { toast } from "sonner";

export function useStyleProfileSync(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const pendingQuery = useQuery({
    queryKey: [
      ...queryKeys.styleProfiles.byProject(projectId ?? ""),
      "pending-sync",
    ],
    queryFn: () => countPendingStyleProfileSync(projectId!),
    enabled: Boolean(projectId),
    refetchInterval: 30_000,
  });

  const conflictQuery = useQuery({
    queryKey: [
      ...queryKeys.styleProfiles.byProject(projectId ?? ""),
      "sync-conflicts",
    ],
    queryFn: () => countStyleProfileConflicts(projectId!),
    enabled: Boolean(projectId),
    refetchInterval: 30_000,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncStyleProfilesBidirectional(projectId!),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.styleProfiles.byProject(projectId ?? ""),
      });
      const parts: string[] = [];
      if (result.pulled > 0) parts.push(`${result.pulled} aktualisiert`);
      if (result.synced > 0) parts.push(`${result.synced} hochgeladen`);
      if (result.conflicts > 0) parts.push(`${result.conflicts} Konflikt(e)`);
      if (parts.length > 0) {
        toast.success(`Sync: ${parts.join(", ")}`);
      } else if (result.failed > 0) {
        toast.error("Sync fehlgeschlagen — Cloud-Session prüfen");
      } else {
        toast.message("Nichts zu synchronisieren");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    pendingCount: pendingQuery.data ?? 0,
    conflictCount: conflictQuery.data ?? 0,
    syncing: syncMutation.isPending,
    syncAll: () => syncMutation.mutate(),
  };
}
