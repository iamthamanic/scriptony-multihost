/**
 * Blender tool settings: render engine, color space, presets (T81).
 * Location: src/components/projects/styles/tool-settings/ToolSettingsBlenderSection.tsx
 */

import { Label } from "../../../ui/label";
import { Input } from "../../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import type { StyleProfileSpec } from "@/lib/types/style-profile";
import { patchBlender } from "@/lib/style-profile/tool-settings-params";

interface ToolSettingsBlenderSectionProps {
  spec: StyleProfileSpec;
  readOnly?: boolean;
  onChange: (spec: StyleProfileSpec) => void;
}

export function ToolSettingsBlenderSection({
  spec,
  readOnly,
  onChange,
}: ToolSettingsBlenderSectionProps) {
  const blender = spec.toolSettings.blender ?? {};

  return (
    <section className="space-y-4">
      <h4 className="text-sm font-medium">Blender</h4>
      <div className="space-y-2">
        <Label className="text-xs">Render Engine</Label>
        <Select
          value={blender.renderEngine ?? "EEVEE"}
          disabled={readOnly}
          onValueChange={(v) =>
            onChange(patchBlender(spec, { renderEngine: v }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EEVEE">EEVEE</SelectItem>
            <SelectItem value="Cycles">Cycles</SelectItem>
            <SelectItem value="Workbench">Workbench</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Color Management</Label>
        <Select
          value={blender.colorManagement ?? "Standard"}
          disabled={readOnly}
          onValueChange={(v) =>
            onChange(patchBlender(spec, { colorManagement: v }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Standard">Standard</SelectItem>
            <SelectItem value="AgX">AgX</SelectItem>
            <SelectItem value="Filmic">Filmic</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Shader Preset</Label>
        <Input
          disabled={readOnly}
          value={blender.shaderProfileId ?? ""}
          placeholder="toon-cel / pbr-heroic"
          onChange={(e) =>
            onChange(
              patchBlender(spec, {
                shaderProfileId: e.target.value || undefined,
              }),
            )
          }
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Outline Preset</Label>
        <Input
          disabled={readOnly}
          value={blender.outlinePresetId ?? ""}
          placeholder="grease-pencil / none"
          onChange={(e) =>
            onChange(
              patchBlender(spec, {
                outlinePresetId: e.target.value || undefined,
              }),
            )
          }
        />
      </div>
    </section>
  );
}
