/**
 * Stage 3D — Bridge sub-tab: Blender bridge status + 3D placeholder.
 * Location: src/components/stage/Stage3DBridgePanel.tsx
 */
import { Stage3DPlaceholder } from "@/engines/stage-3d";
import { BridgeStatusBar } from "../BridgeStatusBar";
import type { StageDocumentStage3D } from "@/lib/stage-schema-info";

export interface Stage3DBridgePanelProps {
  importedStage3D: StageDocumentStage3D | null;
}

export function Stage3DBridgePanel({
  importedStage3D,
}: Stage3DBridgePanelProps) {
  return (
    <div className="space-y-4 p-3">
      <div className="rounded-md border border-[#3b355a] bg-[#221f35]/95 p-3">
        <BridgeStatusBar />
      </div>
      <Stage3DPlaceholder document={importedStage3D} />
    </div>
  );
}
