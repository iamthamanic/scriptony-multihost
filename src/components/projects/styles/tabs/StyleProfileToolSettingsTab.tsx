/**
 * Rich tool settings tab: image gen chips, ComfyUI, Blender, export (T81).
 * Location: src/components/projects/styles/tabs/StyleProfileToolSettingsTab.tsx
 */

import type { StyleProfile, StyleProfileSpec } from "@/lib/types/style-profile";
import { ToolSettingsImageGenSection } from "../tool-settings/ToolSettingsImageGenSection";
import { ToolSettingsComfySection } from "../tool-settings/ToolSettingsComfySection";
import { ToolSettingsBlenderSection } from "../tool-settings/ToolSettingsBlenderSection";
import { ToolSettingsExportActions } from "../tool-settings/ToolSettingsExportActions";

interface StyleProfileToolSettingsTabProps {
  spec: StyleProfileSpec;
  profile?: StyleProfile;
  readOnly?: boolean;
  onChange: (spec: StyleProfileSpec) => void;
}

export function StyleProfileToolSettingsTab({
  spec,
  profile,
  readOnly,
  onChange,
}: StyleProfileToolSettingsTabProps) {
  return (
    <div className="space-y-6">
      <ToolSettingsImageGenSection
        spec={spec}
        readOnly={readOnly}
        onChange={onChange}
      />
      <ToolSettingsComfySection
        spec={spec}
        readOnly={readOnly}
        onChange={onChange}
      />
      <ToolSettingsBlenderSection
        spec={spec}
        readOnly={readOnly}
        onChange={onChange}
      />
      <ToolSettingsExportActions profile={profile} readOnly={readOnly} />
    </div>
  );
}
