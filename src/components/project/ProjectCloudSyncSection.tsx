/**
 * Project settings block for T40 cloud sync (Axis 3) on desktop local shell.
 * Location: src/components/project/ProjectCloudSyncSection.tsx
 */

import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { Separator } from "@/components/ui/separator";
import { CloudSyncActivateButton } from "./CloudSyncActivateButton";

export function ProjectCloudSyncSection() {
  if (!isDesktopShell() || !isLocalProfile()) {
    return null;
  }

  return (
    <>
      <Separator />
      <div className="space-y-2">
        <p className="text-sm font-bold">Cloud Sync (dieses Projekt)</p>
        <CloudSyncActivateButton />
      </div>
    </>
  );
}
