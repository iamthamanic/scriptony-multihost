/**
 * Image generation tool settings with prompt chips (T81).
 * Location: src/components/projects/styles/tool-settings/ToolSettingsImageGenSection.tsx
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
import {
  patchImageGeneration,
  promptToTokens,
  tokensToPrompt,
} from "@/lib/style-profile/tool-settings-params";
import { TagChipInput } from "../sections/shared/TagChipInput";
import { SectionSliderRow } from "../sections/shared/SectionSliderRow";

interface ToolSettingsImageGenSectionProps {
  spec: StyleProfileSpec;
  readOnly?: boolean;
  onChange: (spec: StyleProfileSpec) => void;
}

export function ToolSettingsImageGenSection({
  spec,
  readOnly,
  onChange,
}: ToolSettingsImageGenSectionProps) {
  const image = spec.toolSettings.imageGeneration ?? {};
  const positiveTokens = promptToTokens(image.promptTemplate);
  const negativeTokens = promptToTokens(image.negativePrompt);

  return (
    <section className="space-y-4">
      <h4 className="text-sm font-medium">Image Generation</h4>
      <TagChipInput
        label="Style Prompt Tokens"
        tags={positiveTokens}
        readOnly={readOnly}
        placeholder="flat cutout, cel shaded…"
        onChange={(tags) =>
          onChange(
            patchImageGeneration(spec, {
              promptTemplate: tokensToPrompt(tags),
            }),
          )
        }
      />
      <TagChipInput
        label="Negative Tokens"
        tags={negativeTokens}
        tone="avoid"
        readOnly={readOnly}
        placeholder="photorealistic, 3d render…"
        onChange={(tags) =>
          onChange(
            patchImageGeneration(spec, {
              negativePrompt: tokensToPrompt(tags),
            }),
          )
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Steps</Label>
          <Input
            type="number"
            min={1}
            max={150}
            disabled={readOnly}
            value={image.steps ?? ""}
            onChange={(e) =>
              onChange(
                patchImageGeneration(spec, {
                  steps: Number(e.target.value) || undefined,
                }),
              )
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">CFG Scale</Label>
          <Input
            type="number"
            min={1}
            max={30}
            step={0.5}
            disabled={readOnly}
            value={image.cfg ?? ""}
            onChange={(e) =>
              onChange(
                patchImageGeneration(spec, {
                  cfg: Number(e.target.value) || undefined,
                }),
              )
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Breite</Label>
          <Input
            type="number"
            disabled={readOnly}
            value={image.defaultWidth ?? ""}
            onChange={(e) =>
              onChange(
                patchImageGeneration(spec, {
                  defaultWidth: Number(e.target.value) || undefined,
                }),
              )
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Höhe</Label>
          <Input
            type="number"
            disabled={readOnly}
            value={image.defaultHeight ?? ""}
            onChange={(e) =>
              onChange(
                patchImageGeneration(spec, {
                  defaultHeight: Number(e.target.value) || undefined,
                }),
              )
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Seed-Policy</Label>
        <Select
          value={image.seedPolicy ?? "random"}
          disabled={readOnly}
          onValueChange={(v) =>
            onChange(
              patchImageGeneration(spec, {
                seedPolicy: v as NonNullable<typeof image.seedPolicy>,
              }),
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="random">Zufällig</SelectItem>
            <SelectItem value="locked_per_asset">Pro Asset</SelectItem>
            <SelectItem value="locked_per_revision">Pro Revision</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
