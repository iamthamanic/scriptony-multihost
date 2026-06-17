/**
 * Wave 1 rich section cards: do/avoid, character, shape, camera (T79).
 * Location: src/components/projects/styles/sections/wave1-section-cards-b.tsx
 */

import { Label } from "../../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";
import type { StyleProfileType } from "@/lib/types/style-profile";
import type { StyleSectionState } from "@/lib/types/style-profile";
import type { StyleSectionDefinition } from "@/lib/style-profile/section-registry";
import {
  getMachineNumber,
  getMachineString,
  getMachineStringArray,
  getFocalLengthTags,
  patchMachineParams,
  patchSection,
} from "@/lib/style-profile/section-params";
import { SectionCardFrame } from "./shared/SectionCardFrame";
import { TagChipInput } from "./shared/TagChipInput";
import { SectionSliderRow } from "./shared/SectionSliderRow";

interface SectionCardProps {
  section: StyleSectionDefinition;
  state: StyleSectionState;
  profileType?: StyleProfileType;
  readOnly?: boolean;
  onChange: (next: StyleSectionState) => void;
}

export function DoAvoidSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  return (
    <SectionCardFrame section={section} state={state}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TagChipInput
          label="Do"
          tags={state.doItems ?? []}
          tone="do"
          readOnly={readOnly}
          onChange={(next) => onChange(patchSection(state, { doItems: next }))}
        />
        <TagChipInput
          label="Avoid"
          tags={state.avoidItems ?? []}
          tone="avoid"
          readOnly={readOnly}
          onChange={(next) =>
            onChange(patchSection(state, { avoidItems: next }))
          }
        />
      </div>
    </SectionCardFrame>
  );
}

export function CharacterRulesSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  const proportions = getMachineString(state, "proportions", "cartoon");

  const headRatio = getMachineString(state, "headRatio", "");
  const headHeightFallback =
    headRatio === "large" ? 0.45 : headRatio === "small" ? 0.25 : 0.35;

  return (
    <SectionCardFrame section={section} state={state}>
      <SectionSliderRow
        label="Kopfgröße (relativ)"
        value={getMachineNumber(state, "headHeightRatio", headHeightFallback)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { headHeightRatio: v }))
        }
      />
      <div className="space-y-2">
        <Label>Proportionen</Label>
        <Select
          value={proportions}
          disabled={readOnly}
          onValueChange={(v) =>
            onChange(patchMachineParams(state, { proportions: v }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cartoon">Cartoon (4 Köpfe)</SelectItem>
            <SelectItem value="heroic">Heroisch (6–7 Köpfe)</SelectItem>
            <SelectItem value="realistic">Realistisch</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <SectionSliderRow
        label="Silhouetten-Priorität"
        value={getMachineNumber(state, "silhouettePriority", 0.85)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { silhouettePriority: v }))
        }
      />
    </SectionCardFrame>
  );
}

export function ShapeLanguageSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  return (
    <SectionCardFrame section={section} state={state}>
      <SectionSliderRow
        label="Angularity"
        value={getMachineNumber(state, "angularity", 0.5)}
        readOnly={readOnly}
        onChange={(v) => onChange(patchMachineParams(state, { angularity: v }))}
      />
      <SectionSliderRow
        label="Chunkiness"
        value={getMachineNumber(state, "chunkiness", 0.5)}
        readOnly={readOnly}
        onChange={(v) => onChange(patchMachineParams(state, { chunkiness: v }))}
      />
      <SectionSliderRow
        label="Organische Kurven"
        value={getMachineNumber(state, "organicCurves", 0.4)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { organicCurves: v }))
        }
      />
    </SectionCardFrame>
  );
}

const FOCAL_LENGTHS = ["18", "24", "35", "50", "85"] as const;

export function CameraCompositionSectionCard({
  section,
  state,
  profileType,
  readOnly,
  onChange,
}: SectionCardProps) {
  const shotTypes = getMachineStringArray(state, "shotTypes");
  const focalLengths = getFocalLengthTags(state);

  return (
    <SectionCardFrame section={section} state={state}>
      <TagChipInput
        label="Shot-Typen"
        tags={shotTypes}
        readOnly={readOnly}
        placeholder="Close-Up, Wide…"
        onChange={(next) =>
          onChange(patchMachineParams(state, { shotTypes: next }))
        }
      />
      <SectionSliderRow
        label="Symmetrie / Zentrierung"
        value={getMachineNumber(state, "symmetry", 0.5)}
        readOnly={readOnly}
        onChange={(v) => onChange(patchMachineParams(state, { symmetry: v }))}
      />
      {profileType === "cinematic_photoreal" && (
        <TagChipInput
          label="Brennweiten (mm)"
          tags={focalLengths}
          readOnly={readOnly}
          placeholder="35"
          onChange={(next) =>
            onChange(
              patchMachineParams(state, {
                focalLengths: next.filter(
                  (t) =>
                    FOCAL_LENGTHS.includes(
                      t as (typeof FOCAL_LENGTHS)[number],
                    ) || /^\d+$/.test(t),
                ),
              }),
            )
          }
        />
      )}
    </SectionCardFrame>
  );
}
