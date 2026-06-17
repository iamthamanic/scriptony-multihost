/**
 * ComfyUI tool settings: reference strength, control net (T81).
 * Location: src/components/projects/styles/tool-settings/ToolSettingsComfySection.tsx
 */

import { Label } from "../../../ui/label";
import { Input } from "../../../ui/input";
import type { StyleProfileSpec } from "@/lib/types/style-profile";
import { patchComfyUi } from "@/lib/style-profile/tool-settings-params";
import { SectionSliderRow } from "../sections/shared/SectionSliderRow";

interface ToolSettingsComfySectionProps {
  spec: StyleProfileSpec;
  readOnly?: boolean;
  onChange: (spec: StyleProfileSpec) => void;
}

export function ToolSettingsComfySection({
  spec,
  readOnly,
  onChange,
}: ToolSettingsComfySectionProps) {
  const comfy = spec.toolSettings.comfyui ?? {};
  const ip = comfy.ipAdapter ?? {};
  const control = comfy.controlNetMix ?? {};
  const bindings = comfy.workflowBindings ?? {};

  return (
    <section className="space-y-4">
      <h4 className="text-sm font-medium">ComfyUI</h4>
      <SectionSliderRow
        label="Reference Strength"
        value={ip.styleReferenceStrength ?? 0.75}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(
            patchComfyUi(spec, {
              ipAdapter: { ...ip, styleReferenceStrength: v },
            }),
          )
        }
      />
      <SectionSliderRow
        label="Lineart ControlNet"
        value={control.lineart ?? 0}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(
            patchComfyUi(spec, {
              controlNetMix: { ...control, lineart: v },
            }),
          )
        }
      />
      <SectionSliderRow
        label="Depth ControlNet"
        value={control.depth ?? 0}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(
            patchComfyUi(spec, {
              controlNetMix: { ...control, depth: v },
            }),
          )
        }
      />
      <SectionSliderRow
        label="Pose ControlNet"
        value={control.pose ?? 0}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(
            patchComfyUi(spec, {
              controlNetMix: { ...control, pose: v },
            }),
          )
        }
      />
      <div className="space-y-2">
        <Label className="text-xs">Text-to-Image Workflow</Label>
        <Input
          disabled={readOnly}
          placeholder="workflow-id"
          value={bindings.textToImage ?? ""}
          onChange={(e) =>
            onChange(
              patchComfyUi(spec, {
                workflowBindings: {
                  ...bindings,
                  textToImage: e.target.value || undefined,
                },
              }),
            )
          }
        />
      </div>
    </section>
  );
}
