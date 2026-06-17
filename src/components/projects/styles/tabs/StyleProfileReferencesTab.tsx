/**
 * References tab — reuses StyleGuideReferencesTab.
 * Location: src/components/projects/styles/tabs/StyleProfileReferencesTab.tsx
 */

import { Loader2 } from "lucide-react";
import { StyleGuideReferencesTab } from "../../../style-guide/StyleGuideReferencesTab";
import { useProjectStyleGuide } from "@/hooks/useProjectStyleGuide";
import { getStyleGuideUnavailableHint } from "@/lib/api-adapter/style-guide-adapter";
import { useQueryClient } from "@tanstack/react-query";

interface StyleProfileReferencesTabProps {
  projectId: string;
}

export function StyleProfileReferencesTab({
  projectId,
}: StyleProfileReferencesTabProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useProjectStyleGuide(projectId);

  if (isLoading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive py-8">
        {error instanceof Error
          ? error.message
          : getStyleGuideUnavailableHint()}
      </p>
    );
  }

  return (
    <StyleGuideReferencesTab
      projectId={projectId}
      data={data}
      onChange={(sg) => queryClient.setQueryData(["styleGuide", projectId], sg)}
    />
  );
}
