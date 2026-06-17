/**
 * Rules tab — reuses StyleGuideRulesExportTab.
 * Location: src/components/projects/styles/tabs/StyleProfileRulesTab.tsx
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { StyleGuideRulesExportTab } from "../../../style-guide/StyleGuideRulesExportTab";
import {
  usePatchStyleGuide,
  useProjectStyleGuide,
} from "@/hooks/useProjectStyleGuide";
import { getStyleGuideUnavailableHint } from "@/lib/api-adapter/style-guide-adapter";
import { useQueryClient } from "@tanstack/react-query";

interface StyleProfileRulesTabProps {
  projectId: string;
}

export function StyleProfileRulesTab({ projectId }: StyleProfileRulesTabProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useProjectStyleGuide(projectId);
  const patchMutation = usePatchStyleGuide(projectId);
  const [useForCover, setUseForCover] = useState(false);

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
    <StyleGuideRulesExportTab
      projectId={projectId}
      data={data}
      saving={patchMutation.isPending}
      onSave={async (patch) => {
        await patchMutation.mutateAsync(patch);
      }}
      onChange={(sg) => queryClient.setQueryData(["styleGuide", projectId], sg)}
      useForCover={useForCover}
      onUseForCoverChange={setUseForCover}
    />
  );
}
