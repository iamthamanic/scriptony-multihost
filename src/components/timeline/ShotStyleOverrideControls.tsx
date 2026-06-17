/**
 * Shot-level style profile override controls (Step 4 timeline).
 * Location: src/components/timeline/ShotStyleOverrideControls.tsx
 */

import type { Shot } from "@/lib/types";
import { StyleProfileOverrideSelect } from "../projects/styles/StyleProfileOverrideSelect";
import { StyleProfileOverridesPanel } from "../projects/styles/StyleProfileOverridesPanel";
import { GuideFromStyleButton } from "./GuideFromStyleButton";

interface ShotStyleOverrideControlsProps {
  projectId: string;
  shot: Shot;
  sceneOverrideId?: string | null;
  onUpdate: (updates: Partial<Shot>) => void;
}

export function ShotStyleOverrideControls({
  projectId,
  shot,
  sceneOverrideId,
  onUpdate,
}: ShotStyleOverrideControlsProps) {
  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <p className="text-xs font-medium">Style-Profil (Shot)</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <StyleProfileOverrideSelect
          projectId={projectId}
          label="Shot zugewiesen"
          value={shot.styleProfileId}
          onChange={(id) => onUpdate({ styleProfileId: id })}
        />
        <StyleProfileOverrideSelect
          projectId={projectId}
          label="Shot Override"
          value={shot.styleProfileOverrideId}
          onChange={(id) => onUpdate({ styleProfileOverrideId: id })}
        />
      </div>
      <StyleProfileOverridesPanel
        projectId={projectId}
        sceneOverrideId={sceneOverrideId}
        shotAssignedProfileId={shot.styleProfileId}
        shotOverrideId={shot.styleProfileOverrideId}
      />
      <GuideFromStyleButton
        projectId={projectId}
        shotId={shot.id}
        styleProfileId={shot.styleProfileId}
        sceneOverrideId={sceneOverrideId}
      />
    </div>
  );
}
