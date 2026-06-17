/**
 * React Query hook for project Style Guide data (references/rules tabs).
 * Location: src/hooks/useProjectStyleGuide.ts
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PatchStyleGuidePayload,
  StyleGuideData,
} from "@/lib/api/style-guide-api";
import * as StyleGuideApi from "@/lib/api/style-guide-api";
import { getStyleGuide } from "@/lib/api-adapter/style-guide-adapter";
import { toast } from "sonner";

export function useProjectStyleGuide(projectId: string | undefined) {
  return useQuery({
    queryKey: ["styleGuide", projectId],
    queryFn: () => getStyleGuide(projectId!),
    enabled: Boolean(projectId),
  });
}

export function usePatchStyleGuide(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: PatchStyleGuidePayload) =>
      StyleGuideApi.patchStyleGuide(projectId, patch),
    onSuccess: (data: StyleGuideData) => {
      queryClient.setQueryData(["styleGuide", projectId], data);
      toast.success("Gespeichert");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
