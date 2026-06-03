/**
 * Banner when Stage is LOCAL_ONLY (Blender pipeline, no cloud CRUD).
 * Location: src/components/stage/StageLocalOnlyBanner.tsx
 */

import { getCapabilityKind } from "@/capabilities/registry";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { isDesktopShell } from "@/runtime/detect-runtime";

const STAGE_PAGES = new Set(["stage", "create", "present"]);

interface StageLocalOnlyBannerProps {
  currentPage: string;
}

export function StageLocalOnlyBanner({
  currentPage,
}: StageLocalOnlyBannerProps) {
  if (!STAGE_PAGES.has(currentPage)) {
    return null;
  }
  if (getCapabilityKind("feature.stage") !== "LOCAL_ONLY") {
    return null;
  }

  return (
    <div
      className="border-b border-border bg-muted/30 px-4 py-2 text-center text-xs text-muted-foreground"
      role="status"
    >
      Stage arbeitet <strong className="text-foreground">nur lokal</strong>
      {isDesktopShell() && isLocalProfile()
        ? " (Blender, Assets auf dem Rechner — kein Cloud-Sync in dieser Phase)."
        : "."}
    </div>
  );
}
