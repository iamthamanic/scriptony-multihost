/**
 * Scene-level style profile override (Step 4 timeline).
 * Location: src/components/timeline/SceneStyleOverrideControl.tsx
 */

import type { Scene } from "@/lib/types";
import { StyleProfileOverrideSelect } from "../projects/styles/StyleProfileOverrideSelect";

interface SceneStyleOverrideControlProps {
  projectId: string;
  scene: Scene;
  onUpdate: (sceneId: string, updates: Partial<Scene>) => void;
}

export function SceneStyleOverrideControl({
  projectId,
  scene,
  onUpdate,
}: SceneStyleOverrideControlProps) {
  return (
    <div className="px-2 pb-2">
      <StyleProfileOverrideSelect
        projectId={projectId}
        label="Szene Style-Override"
        value={scene.styleProfileOverrideId}
        className="max-w-xs"
        onChange={(id) => onUpdate(scene.id, { styleProfileOverrideId: id })}
      />
    </div>
  );
}
