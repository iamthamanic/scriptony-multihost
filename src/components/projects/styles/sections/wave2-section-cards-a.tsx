/**
 * Wave 2 rich section cards: creature, prop, vehicle, environment (T80).
 * Location: src/components/projects/styles/sections/wave2-section-cards-a.tsx
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import { Label } from "../../../ui/label";
import type { StyleSectionState } from "@/lib/types/style-profile";
import type { StyleSectionDefinition } from "@/lib/style-profile/section-registry";
import {
  getMachineNumber,
  getMachineString,
  getMachineStringArray,
  patchMachineParams,
} from "@/lib/style-profile/section-params";
import { SectionCardFrame } from "./shared/SectionCardFrame";
import { SectionSliderRow } from "./shared/SectionSliderRow";
import { TagChipInput } from "./shared/TagChipInput";

interface SectionCardProps {
  section: StyleSectionDefinition;
  state: StyleSectionState;
  readOnly?: boolean;
  onChange: (next: StyleSectionState) => void;
}

export function CreatureRulesSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  return (
    <SectionCardFrame section={section} state={state}>
      <SectionSliderRow
        label="Realism"
        value={getMachineNumber(state, "realism", 0.3)}
        readOnly={readOnly}
        onChange={(v) => onChange(patchMachineParams(state, { realism: v }))}
      />
      <SectionSliderRow
        label="Exaggeration"
        value={getMachineNumber(state, "exaggeration", 0.7)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { exaggeration: v }))
        }
      />
      <div className="space-y-2">
        <Label>Threat Level</Label>
        <Select
          value={getMachineString(state, "threatLevel", "medium")}
          disabled={readOnly}
          onValueChange={(v) =>
            onChange(patchMachineParams(state, { threatLevel: v }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Niedrig</SelectItem>
            <SelectItem value="medium">Mittel</SelectItem>
            <SelectItem value="high">Hoch</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </SectionCardFrame>
  );
}

export function PropRulesSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  return (
    <SectionCardFrame section={section} state={state}>
      <SectionSliderRow
        label="Detail-Level"
        value={getMachineNumber(
          state,
          "detailDensity",
          getMachineNumber(state, "detailLevel", 0.4),
        )}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(
            patchMachineParams(state, { detailDensity: v, detailLevel: v }),
          )
        }
      />
      <SectionSliderRow
        label="Function Clarity"
        value={getMachineNumber(state, "functionClarity", 0.85)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { functionClarity: v }))
        }
      />
    </SectionCardFrame>
  );
}

export function VehicleRulesSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  return (
    <SectionCardFrame section={section} state={state}>
      <SectionSliderRow
        label="Scale Readability"
        value={getMachineNumber(state, "scale", 0.7)}
        readOnly={readOnly}
        onChange={(v) => onChange(patchMachineParams(state, { scale: v }))}
      />
      <SectionSliderRow
        label="Surface Detail"
        value={getMachineNumber(state, "surfaceDetail", 0.45)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { surfaceDetail: v }))
        }
      />
      <SectionSliderRow
        label="Boxiness"
        value={getMachineNumber(state, "boxiness", 0.55)}
        readOnly={readOnly}
        onChange={(v) => onChange(patchMachineParams(state, { boxiness: v }))}
      />
    </SectionCardFrame>
  );
}

export function EnvironmentRulesSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  return (
    <SectionCardFrame section={section} state={state}>
      <SectionSliderRow
        label="Set Density"
        value={getMachineNumber(state, "setDensity", 0.5)}
        readOnly={readOnly}
        onChange={(v) => onChange(patchMachineParams(state, { setDensity: v }))}
      />
      <SectionSliderRow
        label="Atmospheric Depth"
        value={getMachineNumber(
          state,
          "atmosphericDepth",
          getMachineNumber(state, "backgroundDetail", 0.45),
        )}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(
            patchMachineParams(state, {
              atmosphericDepth: v,
              backgroundDetail: v,
            }),
          )
        }
      />
      <SectionSliderRow
        label="Clutter Level"
        value={getMachineNumber(state, "clutterLevel", 0.35)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { clutterLevel: v }))
        }
      />
    </SectionCardFrame>
  );
}

export function MaterialRulesSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  const materials = getMachineStringArray(state, "materialTags");

  return (
    <SectionCardFrame section={section} state={state}>
      <TagChipInput
        label="Material-Tags"
        tags={materials}
        readOnly={readOnly}
        placeholder="Paper, Metal, Cloth…"
        onChange={(next) =>
          onChange(patchMachineParams(state, { materialTags: next }))
        }
      />
      <SectionSliderRow
        label="Abstraction"
        value={getMachineNumber(state, "abstraction", 0.5)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { abstraction: v }))
        }
      />
      <SectionSliderRow
        label="Reflectivity"
        value={getMachineNumber(state, "reflectivity", 0.4)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { reflectivity: v }))
        }
      />
    </SectionCardFrame>
  );
}
