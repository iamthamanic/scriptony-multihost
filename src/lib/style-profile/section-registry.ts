/**
 * Registry of 18 Styleguide sections — single source for nav, cards, defaults.
 * Location: src/lib/style-profile/section-registry.ts
 */

import type { VisualSpecSectionKey } from "@/lib/types/style-profile";

export interface StyleSectionDefinition {
  key: VisualSpecSectionKey;
  number: number;
  titleDe: string;
  descriptionDe: string;
  step1Editable: boolean;
}

export const STYLE_SECTION_REGISTRY: readonly StyleSectionDefinition[] = [
  {
    key: "styleDna",
    number: 1,
    titleDe: "Style DNA",
    descriptionDe: "Kernästhetik, Stimmung und visuelle Identität des Profils.",
    step1Editable: true,
  },
  {
    key: "shapeLanguage",
    number: 2,
    titleDe: "Shape Language",
    descriptionDe:
      "Formvokabular: geometrische Primitive und Silhouetten-Sprache.",
    step1Editable: true,
  },
  {
    key: "lineSystem",
    number: 3,
    titleDe: "Line System",
    descriptionDe: "Konturen, Strichstärken und Linienverhalten.",
    step1Editable: true,
  },
  {
    key: "colorSystem",
    number: 4,
    titleDe: "Color System",
    descriptionDe: "Paletten, Farbverteilung und Harmonie-Regeln.",
    step1Editable: true,
  },
  {
    key: "shadingLighting",
    number: 5,
    titleDe: "Shading / Lighting",
    descriptionDe: "Schattierung, Lichtstimmung und Kontrast.",
    step1Editable: true,
  },
  {
    key: "characterRules",
    number: 6,
    titleDe: "Character Rules",
    descriptionDe: "Proportionen, Gesichtsregeln und Charakter-Silhouetten.",
    step1Editable: true,
  },
  {
    key: "creatureRules",
    number: 7,
    titleDe: "Creature Rules",
    descriptionDe: "Kreaturen, Monster und nicht-menschliche Formen.",
    step1Editable: false,
  },
  {
    key: "propRules",
    number: 8,
    titleDe: "Prop Rules",
    descriptionDe: "Requisiten, Objekte und ihre Lesbarkeit.",
    step1Editable: true,
  },
  {
    key: "vehicleRules",
    number: 9,
    titleDe: "Vehicle Rules",
    descriptionDe: "Fahrzeuge und maschinelle Formen.",
    step1Editable: false,
  },
  {
    key: "environmentRules",
    number: 10,
    titleDe: "Environment Rules",
    descriptionDe: "Hintergründe, Sets und atmosphärische Tiefe.",
    step1Editable: true,
  },
  {
    key: "materialRules",
    number: 11,
    titleDe: "Material Rules",
    descriptionDe: "Oberflächen, Texturen und Materialabstraktion.",
    step1Editable: false,
  },
  {
    key: "fxRules",
    number: 12,
    titleDe: "FX Rules",
    descriptionDe: "Effekte, Partikel und visuelle FX-Sprache.",
    step1Editable: false,
  },
  {
    key: "cameraComposition",
    number: 13,
    titleDe: "Camera / Composition",
    descriptionDe: "Kamera, Framing und Bildaufbau.",
    step1Editable: true,
  },
  {
    key: "poseActing",
    number: 14,
    titleDe: "Pose / Acting",
    descriptionDe: "Posen, Mimik und Schauspiel-Exaggeration.",
    step1Editable: false,
  },
  {
    key: "doAvoid",
    number: 15,
    titleDe: "Do / Avoid",
    descriptionDe: "Explizite Do- und Avoid-Regeln für Konsistenz.",
    step1Editable: true,
  },
  {
    key: "recognitionMarkers",
    number: 16,
    titleDe: "Recognition Markers",
    descriptionDe: "Wiedererkennbare visuelle Marker des Stils.",
    step1Editable: false,
  },
  {
    key: "validationAssets",
    number: 17,
    titleDe: "Validation Assets",
    descriptionDe: "Referenz-Assets zur Konsistenzprüfung.",
    step1Editable: false,
  },
] as const;

export const VISUAL_SPEC_SECTION_KEYS = STYLE_SECTION_REGISTRY.map(
  (s) => s.key,
);

export function getSectionDefinition(
  key: VisualSpecSectionKey,
): StyleSectionDefinition | undefined {
  return STYLE_SECTION_REGISTRY.find((s) => s.key === key);
}
