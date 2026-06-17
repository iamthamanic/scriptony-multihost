/**
 * Export actions for style profile tool settings panel (T81).
 * Location: src/components/projects/styles/tool-settings/ToolSettingsExportActions.tsx
 */

import { Download, FileJson } from "lucide-react";
import { Button } from "../../../ui/button";
import type { StyleProfile } from "@/lib/types/style-profile";
import { PREVIEW_PROFILE_ID } from "@/lib/style-profile/default-preview";
import { downloadStylePackage } from "@/lib/style-profile/export-style-package";
import { toast } from "sonner";

interface ToolSettingsExportActionsProps {
  profile?: StyleProfile;
  readOnly?: boolean;
}

export function ToolSettingsExportActions({
  profile,
  readOnly,
}: ToolSettingsExportActionsProps) {
  if (!profile || profile.id === PREVIEW_PROFILE_ID || readOnly) {
    return null;
  }

  const handleExport = () => {
    downloadStylePackage(profile);
    toast.success("Style Package exportiert");
  };

  return (
    <section className="space-y-3 pt-2 border-t">
      <h4 className="text-sm font-medium">Export</h4>
      <Button type="button" variant="outline" size="sm" onClick={handleExport}>
        <Download className="size-4 mr-2" />
        Export Style Package
      </Button>
      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <FileJson className="size-3.5 shrink-0 mt-0.5" aria-hidden />
        JSON-Bundle mit Spec, Tool Settings und Summary — client-side, kein
        Cloud-Upload.
      </p>
    </section>
  );
}
