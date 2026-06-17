/**
 * Wave 2 rich section cards: fx, pose, recognition (T80).
 * Location: src/components/projects/styles/sections/wave2-section-cards-b.tsx
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
  patchSection,
} from "@/lib/style-profile/section-params";
import { SectionCardFrame } from "./shared/SectionCardFrame";
import { SectionSliderRow } from "./shared/SectionSliderRow";
import { TagChipInput } from "./shared/TagChipInput";
import { ValidationAssetGrid } from "../validation/ValidationAssetGrid";

interface SectionCardProps {
  section: StyleSectionDefinition;
  state: StyleSectionState;
  readOnly?: boolean;
  onChange: (next: StyleSectionState) => void;
}

export function FxRulesSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  const fxStyle = getMachineString(state, "fxStyle", "graphic");

  return (
    <SectionCardFrame section={section} state={state}>
      <div className="space-y-2">
        <Label>FX-Stil</Label>
        <Select
          value={fxStyle}
          disabled={readOnly}
          onValueChange={(v) =>
            onChange(patchMachineParams(state, { fxStyle: v }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="graphic">Graphic / Comic</SelectItem>
            <SelectItem value="stylized">Stylized</SelectItem>
            <SelectItem value="realistic">Realistic</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <SectionSliderRow
        label="Particle Density"
        value={getMachineNumber(state, "particleDensity", 0.5)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { particleDensity: v }))
        }
      />
      <SectionSliderRow
        label="FX Readability"
        value={getMachineNumber(state, "fxReadability", 0.8)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { fxReadability: v }))
        }
      />
    </SectionCardFrame>
  );
}

export function PoseActingSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  const poseTags = getMachineStringArray(state, "poseTags");

  return (
    <SectionCardFrame section={section} state={state}>
      <SectionSliderRow
        label="Gesture Size"
        value={getMachineNumber(state, "gestureSize", 0.65)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { gestureSize: v }))
        }
      />
      <SectionSliderRow
        label="Expression Exaggeration"
        value={getMachineNumber(state, "expressionExaggeration", 0.7)}
        readOnly={readOnly}
        onChange={(v) =>
          onChange(patchMachineParams(state, { expressionExaggeration: v }))
        }
      />
      <TagChipInput
        label="Pose-Tags"
        tags={poseTags}
        readOnly={readOnly}
        placeholder="Heroic stance, Arguing…"
        onChange={(next) =>
          onChange(patchMachineParams(state, { poseTags: next }))
        }
      />
    </SectionCardFrame>
  );
}

export function RecognitionMarkersSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: SectionCardProps) {
  const markers =
    getMachineStringArray(state, "markers").length > 0
      ? getMachineStringArray(state, "markers")
      : (state.humanRules ?? []);

  return (
    <SectionCardFrame section={section} state={state}>
      <TagChipInput
        label="Recognition Markers"
        tags={markers}
        readOnly={readOnly}
        placeholder="Wing-like helmet, Striped trousers…"
        onChange={(next) =>
          onChange(
            patchSection(state, {
              humanRules: next,
              machineParams: { ...(state.machineParams ?? {}), markers: next },
            }),
          )
        }
      />
      <p className="text-xs text-muted-foreground">
        Wiedererkennbare Motive, die den Stil sofort identifizierbar machen.
      </p>
    </SectionCardFrame>
  );
}

interface ValidationAssetsSectionCardProps extends SectionCardProps {
  profileId?: string;
  onUploaded?: (refs: string[]) => void;
}

export function ValidationAssetsSectionCard({
  section,
  state,
  profileId,
  readOnly,
  onChange,
  onUploaded,
}: ValidationAssetsSectionCardProps) {
  const refs = state.exampleRefs ?? getMachineStringArray(state, "assetRefs");

  return (
    <SectionCardFrame section={section} state={state}>
      {profileId ? (
        <ValidationAssetGrid
          profileId={profileId}
          filledRefs={refs}
          readOnly={readOnly}
          onUploaded={(nextRefs) => {
            onChange(
              patchSection(state, {
                exampleRefs: nextRefs,
                machineParams: {
                  ...(state.machineParams ?? {}),
                  assetRefs: nextRefs,
                },
                status: nextRefs.some((r) => r?.trim())
                  ? "configured"
                  : state.status,
              }),
            );
            onUploaded?.(nextRefs);
          }}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          Speichere das Profil, um Validation-Assets hochzuladen.
        </p>
      )}
    </SectionCardFrame>
  );
}
