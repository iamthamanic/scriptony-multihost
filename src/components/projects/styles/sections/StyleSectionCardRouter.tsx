/**
 * Routes section key to specialized or generic style section card (T79/T80).
 * Location: src/components/projects/styles/sections/StyleSectionCardRouter.tsx
 */

import type {
  StyleProfileType,
  StyleSectionState,
  VisualSpecSectionKey,
} from "@/lib/types/style-profile";
import type { StyleSectionDefinition } from "@/lib/style-profile/section-registry";
import { StyleSectionCard } from "../StyleSectionCard";
import {
  StyleDnaSectionCard,
  ColorSystemSectionCard,
  LineSystemSectionCard,
  ShadingLightingSectionCard,
} from "./wave1-section-cards-a";
import {
  DoAvoidSectionCard,
  CharacterRulesSectionCard,
  ShapeLanguageSectionCard,
  CameraCompositionSectionCard,
} from "./wave1-section-cards-b";
import {
  CreatureRulesSectionCard,
  PropRulesSectionCard,
  VehicleRulesSectionCard,
  EnvironmentRulesSectionCard,
  MaterialRulesSectionCard,
} from "./wave2-section-cards-a";
import {
  FxRulesSectionCard,
  PoseActingSectionCard,
  RecognitionMarkersSectionCard,
  ValidationAssetsSectionCard,
} from "./wave2-section-cards-b";

const RICH_SECTION_KEYS = new Set<VisualSpecSectionKey>([
  "styleDna",
  "colorSystem",
  "lineSystem",
  "shadingLighting",
  "doAvoid",
  "characterRules",
  "shapeLanguage",
  "cameraComposition",
  "creatureRules",
  "propRules",
  "vehicleRules",
  "environmentRules",
  "materialRules",
  "fxRules",
  "poseActing",
  "recognitionMarkers",
  "validationAssets",
]);

interface StyleSectionCardRouterProps {
  section: StyleSectionDefinition;
  state: StyleSectionState;
  profileType: StyleProfileType;
  profileId?: string;
  readOnly?: boolean;
  onChange: (key: VisualSpecSectionKey, next: StyleSectionState) => void;
  onValidationAssetsUploaded?: (refs: string[]) => void;
}

export function StyleSectionCardRouter({
  section,
  state,
  profileType,
  profileId,
  readOnly,
  onChange,
  onValidationAssetsUploaded,
}: StyleSectionCardRouterProps) {
  const handleChange = (next: StyleSectionState) => onChange(section.key, next);

  if (!RICH_SECTION_KEYS.has(section.key)) {
    return (
      <StyleSectionCard
        section={section}
        state={state}
        readOnly={readOnly}
        onChange={onChange}
      />
    );
  }

  switch (section.key) {
    case "styleDna":
      return (
        <StyleDnaSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "colorSystem":
      return (
        <ColorSystemSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "lineSystem":
      return (
        <LineSystemSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "shadingLighting":
      return (
        <ShadingLightingSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "doAvoid":
      return (
        <DoAvoidSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "characterRules":
      return (
        <CharacterRulesSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "shapeLanguage":
      return (
        <ShapeLanguageSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "cameraComposition":
      return (
        <CameraCompositionSectionCard
          section={section}
          state={state}
          profileType={profileType}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "creatureRules":
      return (
        <CreatureRulesSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "propRules":
      return (
        <PropRulesSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "vehicleRules":
      return (
        <VehicleRulesSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "environmentRules":
      return (
        <EnvironmentRulesSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "materialRules":
      return (
        <MaterialRulesSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "fxRules":
      return (
        <FxRulesSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "poseActing":
      return (
        <PoseActingSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "recognitionMarkers":
      return (
        <RecognitionMarkersSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={handleChange}
        />
      );
    case "validationAssets":
      return (
        <ValidationAssetsSectionCard
          section={section}
          state={state}
          profileId={profileId}
          readOnly={readOnly}
          onChange={handleChange}
          onUploaded={onValidationAssetsUploaded}
        />
      );
    default:
      return (
        <StyleSectionCard
          section={section}
          state={state}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
  }
}
