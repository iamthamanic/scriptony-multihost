/**
 * Hook: project-wide hybrid sync (T93).
 * Location: src/hooks/useProjectSync.ts
 */

import { useMutation } from "@tanstack/react-query";
import {
  syncProjectBidirectional,
  type ProjectSyncResult,
} from "@/lib/sync/project-sync-engine";
import { queryKeys } from "@/lib/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

export function useProjectSync(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<ProjectSyncResult | null>(null);

  const syncMutation = useMutation({
    mutationFn: () => syncProjectBidirectional(projectId!),
    onSuccess: async (result) => {
      setLastResult(result);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.styleProfiles.byProject(projectId ?? ""),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.byProject(projectId ?? ""),
      });
      const { totals, byDomain } = result;
      const parts: string[] = [];
      if (byDomain.styleProfiles.pulled > 0) {
        parts.push(`${byDomain.styleProfiles.pulled} Profile aktualisiert`);
      }
      if (byDomain.styleProfiles.synced > 0) {
        parts.push(`${byDomain.styleProfiles.synced} Profile hochgeladen`);
      }
      if (byDomain.characters.pulled) {
        parts.push(`${byDomain.characters.pulled} Charaktere`);
      }
      if (totals.conflicts > 0) {
        parts.push(`${totals.conflicts} Konflikt(e)`);
      }
      const skippedDomains = [
        byDomain.characters.skipReason,
        byDomain.timelineMeta.skipReason,
      ].filter(Boolean);
      if (parts.length > 0) {
        toast.success(`Projekt-Sync: ${parts.join(", ")}`);
      } else if (totals.failed > 0) {
        toast.error("Projekt-Sync teilweise fehlgeschlagen");
      } else if (skippedDomains.length > 0) {
        toast.message(
          "Style-Profile synchronisiert. Timeline/Charaktere: noch nicht in v1.",
        );
      } else {
        toast.message("Nichts zu synchronisieren");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    syncing: syncMutation.isPending,
    syncAll: () => syncMutation.mutate(),
    lastResult,
  };
}
