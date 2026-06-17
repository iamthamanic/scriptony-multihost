/**
 * Stage 3D — Puppetlayer sub-tab: project shot overview, renders, current shot.
 * Location: src/components/stage/Stage3DPuppetLayerPanel.tsx
 */
import { Suspense, lazy } from "react";
import type { Shot } from "@/lib/types";
import type { ValidPage } from "@/hooks/useRouter";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { StageShotPuppetLayer } from "./StageShotPuppetLayer";

const ProjectStageSection = lazy(() =>
  import("../projects/ProjectStageSection").then((m) => ({
    default: m.ProjectStageSection,
  })),
);
const ProjectRendersSection = lazy(() =>
  import("../projects/ProjectRendersSection").then((m) => ({
    default: m.ProjectRendersSection,
  })),
);

export interface Stage3DPuppetLayerPanelProps {
  projectId: string | null;
  shotId: string | null;
  loadedShot: Shot | null;
  onNavigate: (page: ValidPage, id?: string, categoryId?: string) => void;
}

export function Stage3DPuppetLayerPanel({
  projectId,
  shotId,
  loadedShot,
  onNavigate,
}: Stage3DPuppetLayerPanelProps) {
  if (!projectId) {
    return (
      <p className="text-sm text-[#8a83a3] p-3">
        Puppet-Layer: Bitte ein Projekt in der Stage-Navigation öffnen.
      </p>
    );
  }

  return (
    <div className="space-y-6 p-3">
      {shotId ? (
        <StageShotPuppetLayer shot={loadedShot} shotId={shotId} />
      ) : null}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[#c7c0de]">
          Projekt-Übersicht
        </h3>
        <Suspense fallback={<LoadingSpinner />}>
          <ProjectStageSection
            projectId={projectId}
            onOpenShot={(shot) => onNavigate("stage", projectId, shot.id)}
          />
        </Suspense>
      </div>

      <div id="stage-puppet-renders" className="space-y-3">
        <h3 className="text-sm font-medium text-[#c7c0de]">Renders</h3>
        <Suspense fallback={<LoadingSpinner />}>
          <ProjectRendersSection projectId={projectId} />
        </Suspense>
      </div>
    </div>
  );
}
