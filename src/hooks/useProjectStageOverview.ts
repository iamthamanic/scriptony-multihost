/**
 * Aggregates shot freshness for project Stage tab (T99).
 * Location: src/hooks/useProjectStageOverview.ts
 */

import { useQuery } from "@tanstack/react-query";
import { getAllShotsByProject } from "@/lib/api-adapter/shots-adapter";
import { computeFreshness } from "@/lib/freshness";
import type { Shot } from "@/lib/types";
import { queryKeys } from "@/lib/react-query";

export type ProjectStageShotRow = {
  shot: Shot;
  guidesStale: boolean;
  renderStale: boolean;
  previewStale: boolean;
  anyStale: boolean;
};

export function useProjectStageOverview(projectId: string | undefined) {
  return useQuery({
    queryKey: [
      ...queryKeys.timeline.byProject(projectId ?? ""),
      "stage-overview",
    ],
    queryFn: async () => {
      const shots = await getAllShotsByProject(projectId!);
      const rows: ProjectStageShotRow[] = shots.map((shot) => {
        const freshness = computeFreshness({
          blenderSyncRevision: shot.blenderSyncRevision,
          guideBundleRevision: shot.guideBundleRevision,
          styleProfileRevision: shot.styleProfileRevision,
          renderRevision: shot.renderRevision,
          lastBlenderSyncAt: shot.lastBlenderSyncAt,
          lastPreviewAt: shot.lastPreviewAt,
        });
        return {
          shot,
          guidesStale: freshness.guidesStale === "stale",
          renderStale: freshness.renderStale === "stale",
          previewStale: freshness.previewStale === "stale",
          anyStale: freshness.overall === "stale",
        };
      });
      const staleCount = rows.filter((row) => row.anyStale).length;
      return {
        rows,
        total: rows.length,
        staleCount,
        withPreview: rows.filter((row) => Boolean(row.shot.imageUrl)).length,
      };
    },
    enabled: Boolean(projectId),
    staleTime: 20_000,
  });
}
