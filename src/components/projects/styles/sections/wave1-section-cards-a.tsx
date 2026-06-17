/**
 * Wave 1 rich section cards: DNA, color, line, shading (T79).
 * Location: src/components/projects/styles/sections/wave1-section-cards-a.tsx
 */

import { Label } from "../../../ui/label";
import { Textarea } from "../../../ui/textarea";
import { Switch } from "../../../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import type { StyleSectionState } from "@/lib/types/style-profile";
import type { StyleSectionDefinition } from "@/lib/style-profile/section-registry";
import {
  getMachineNumber,
  getMachineScalar,
  getMachineString,
  getMachineStringArray,
  getMachineBool,
  patchMachineParams,
  patchSection,
} from "@/lib/style-profile/section-params";
import { SectionCardFrame } from "./shared/SectionCardFrame";
import { TagChipInput } from "./shared/TagChipInput";
import { SectionSliderRow } from "./shared/SectionSliderRow";
import { PaletteSwatchEditor } from "./shared/PaletteSwatchEditor";
import { ColorShareBar } from "./shared/ColorShareBar";
import { ColorDistributionDonut } from "./shared/ColorDistributionDonut";

interface SectionCardProps {
  section: StyleSectionDefinition;
  state: StyleSectionState;
  readOnly?: boolean;
  onChange: (next: StyleSectionState) => void;
}

export function StyleDnaSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  const tags = getMachineStringArray(state, "tags");
  const traits = state.humanRules ?? [];

  return (
    <SectionCardFrame section={section} state={state}>
      <div className="space-y-2">
        <Label htmlFor={`${section.key}-summary`}>Kurzbeschreibung</Label>
        <Textarea
          id={`${section.key}-summary`}
          rows={2}
          disabled={readOnly}
          value={state.summary ?? ""}
          onChange={(e) =>
            onChange(patchSection(state, { summary: e.target.value }))
          }
        />
      </div>
      <TagChipInput
        label="Style-Tags"
        tags={tags}
        readOnly={readOnly}
        onChange={(next) => onChange(patchMachineParams(state, { tags: next }))}
      />
      <TagChipInput
        label="Merkmale / Traits"
        tags={traits}
        readOnly={readOnly}
        placeholder="z. B. Flat shapes"
        onChange={(next) => onChange(patchSection(state, { humanRules: next }))}
      />
    </SectionCardFrame>
  );
}

export function ColorSystemSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  const palette = getMachineStringArray(state, "palette");
  const safePalette = palette.length > 0 ? palette : ["#6E59A5", "#F5E6D3"];

  const primaryShare = getMachineNumber(state, "primaryShare", 0.45);
  const accentShare = getMachineNumber(state, "accentShare", 0.15);

  return (
    <SectionCardFrame section={section} state={state}>
      <PaletteSwatchEditor
        palette={safePalette}
        readOnly={readOnly}
        onChange={(next) =>
          onChange(patchMachineParams(state, { palette: next }))
        }
      />
      <ColorDistributionDonut primary={primaryShare} accent={accentShare} />
      <ColorShareBar primary={primaryShare} accent={accentShare} />
      <SectionSliderRow
        label="Primary-Anteil"
        value={primaryShare}
        readOnly={readOnly}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) =>
          onChange(patchMachineParams(state, { primaryShare: v }))
        }
      />
      <SectionSliderRow
        label="Accent-Anteil"
        value={accentShare}
        readOnly={readOnly}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) =>
          onChange(patchMachineParams(state, { accentShare: v }))
        }
      />
      <SectionSliderRow
        label="Sättigung"
        value={getMachineNumber(state, "saturation", 0.65)}
        readOnly={readOnly}
        onChange={(v) => onChange(patchMachineParams(state, { saturation: v }))}
      />
    </SectionCardFrame>
  );
}

export function LineSystemSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  const tapering = getMachineString(state, "tapering", "weak");

  return (
    <SectionCardFrame section={section} state={state}>
      <SectionSliderRow
        label="Außenkontur"
        value={getMachineNumber(
          state,
          "outerWeight",
          getMachineNumber(state, "outlineWeight", 0.8),
        )}
        readOnly={readOnly}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) =>
          onChange(
            patchMachineParams(state, { outerWeight: v, outlineWeight: v }),
          )
        }
      />
      <SectionSliderRow
        label="Innenlinien"
        value={getMachineNumber(state, "innerWeight", 0.45)}
        readOnly={readOnly}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) =>
          onChange(patchMachineParams(state, { innerWeight: v }))
        }
      />
      <div className="space-y-2">
        <Label>Tapering</Label>
        <Select
          value={tapering}
          disabled={readOnly}
          onValueChange={(v) =>
            onChange(patchMachineParams(state, { tapering: v }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Keins</SelectItem>
            <SelectItem value="weak">Schwach</SelectItem>
            <SelectItem value="strong">Stark</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </SectionCardFrame>
  );
}

export function ShadingLightingSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  const moods = getMachineStringArray(state, "lightingMoods");

  return (
    <SectionCardFrame section={section} state={state}>
      <SectionSliderRow
        label="Shadow Steps"
        value={getMachineNumber(state, "shadowSteps", 0)}
        min={0}
        max={4}
        step={1}
        format={(v) => String(Math.round(v))}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { shadowSteps: Math.round(v) }))
        }
      />
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${section.key}-gradients`}>Gradienten</Label>
        <Switch
          id={`${section.key}-gradients`}
          checked={getMachineBool(state, "gradients", false)}
          disabled={readOnly}
          onCheckedChange={(v) =>
            onChange(patchMachineParams(state, { gradients: v }))
          }
        />
      </div>
      <SectionSliderRow
        label="Rim Light"
        value={getMachineScalar(state, "rimLight", 0)}
        readOnly={readOnly}
        onChange={(v) => onChange(patchMachineParams(state, { rimLight: v }))}
      />
      <TagChipInput
        label="Lighting Moods"
        tags={moods}
        readOnly={readOnly}
        placeholder="Day, Dusk, Interior…"
        onChange={(next) =>
          onChange(patchMachineParams(state, { lightingMoods: next }))
        }
      />
    </SectionCardFrame>
  );
}
