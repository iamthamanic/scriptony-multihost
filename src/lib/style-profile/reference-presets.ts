/**
 * Six reference style presets (mockup-inspired content, T83).
 * Location: src/lib/style-profile/reference-presets.ts
 */

import type {
  StyleProfileSpec,
  StyleProfileTemplateId,
  StyleProfileType,
} from "@/lib/types/style-profile";
import { buildBaseSpecFromTemplateId } from "./templates";

const CINEMATIC_PRESETS = new Set<StyleProfileTemplateId>([
  "cinematic_photoreal",
  "superhero_blockbuster",
  "wes_anderson",
]);

export function resolveBaseTemplateId(
  templateId: StyleProfileTemplateId,
): "animated_stylized" | "cinematic_photoreal" {
  return CINEMATIC_PRESETS.has(templateId)
    ? "cinematic_photoreal"
    : "animated_stylized";
}

export function templateIdToType(
  templateId: StyleProfileTemplateId,
): StyleProfileType {
  return CINEMATIC_PRESETS.has(templateId)
    ? "cinematic_photoreal"
    : "animated_stylized";
}

type PresetOverride = (spec: StyleProfileSpec) => void;

const PRESET_OVERRIDES: Partial<
  Record<StyleProfileTemplateId, PresetOverride>
> = {
  cutout_satire: (spec) => {
    patchDna(
      spec,
      "Flat cutout satire with paper-layer comedy.",
      ["Flat Cutout", "Paper Layers", "Big Heads"],
      ["flat cutout", "paper town", "satire"],
    );
    patchDoAvoid(
      spec,
      ["Flat shapes", "Big heads", "Deadpan"],
      ["Realistic detail", "3D rendering"],
    );
    spec.visualSpec.lineSystem.machineParams = {
      outlineWeight: 0.1,
      outerWeight: 0.1,
      innerWeight: 0,
      tapering: "none",
    };
    spec.visualSpec.characterRules.machineParams = {
      headHeightRatio: 0.5,
      proportions: "cartoon",
    };
    spec.toolSettings.imageGeneration = {
      ...spec.toolSettings.imageGeneration,
      promptTemplate: "south park style, flat cutout, paper layers, satire",
      negativePrompt: "realistic, 3d, detailed shading",
    };
  },
  martial_adventure: (spec) => {
    patchDna(
      spec,
      "Upbeat martial-arts adventure with bold shonen energy.",
      ["Bold Outlines", "Cel Shaded", "Dynamic Poses"],
      ["shonen anime", "martial arts", "bright colors"],
    );
    patchDoAvoid(
      spec,
      ["Bold silhouettes", "Clear expressions"],
      ["Muted colors", "Thin dirty lines"],
    );
    spec.visualSpec.lineSystem.machineParams = {
      outerWeight: 0.9,
      innerWeight: 0.55,
      tapering: "strong",
    };
    spec.visualSpec.shadingLighting.machineParams = {
      shadowSteps: 2,
      gradients: false,
      rimLight: 0.4,
    };
    spec.visualSpec.characterRules.machineParams = {
      headHeightRatio: 0.28,
      proportions: "heroic",
    };
    spec.toolSettings.imageGeneration = {
      ...spec.toolSettings.imageGeneration,
      promptTemplate: "anime, martial arts, shonen, cel shaded, dynamic",
      negativePrompt: "photorealistic, muted, muddy",
    };
  },
  superhero_blockbuster: (spec) => {
    patchDna(
      spec,
      "Heroic cinematic blockbuster with epic scale.",
      ["Epic Scale", "Dramatic Contrast", "Grounded Realism"],
      ["cinematic", "superhero", "blockbuster"],
    );
    spec.visualSpec.cameraComposition.machineParams = {
      shotTypes: ["Low Angle Hero", "Wide Establishing"],
      focalLengths: ["18", "35", "85"],
      symmetry: 0.25,
    };
    spec.toolSettings.imageGeneration = {
      ...spec.toolSettings.imageGeneration,
      promptTemplate: "cinematic superhero, epic scale, dramatic rim light",
      negativePrompt: "cartoon, flat lighting, oversaturated",
    };
  },
  wes_anderson: (spec) => {
    patchDna(
      spec,
      "Quirky symmetrical theatrical worlds with pastel precision.",
      ["Symmetrical", "Pastel Palette", "Theatrical Sets"],
      ["wes anderson", "symmetrical", "pastel", "centered framing"],
    );
    spec.visualSpec.colorSystem.machineParams = {
      palette: ["#F2C6DE", "#F4E1C1", "#C5D8F0", "#E8D5B7", "#9BB8CD"],
      primaryShare: 0.6,
      accentShare: 0.1,
      saturation: 0.55,
    };
    spec.visualSpec.cameraComposition.machineParams = {
      shotTypes: ["Centered Wide", "Two Shot"],
      symmetry: 0.95,
      focalLengths: ["24", "35"],
    };
    spec.toolSettings.imageGeneration = {
      ...spec.toolSettings.imageGeneration,
      promptTemplate: "symmetrical composition, pastel palette, theatrical set",
      negativePrompt: "chaotic, handheld, high contrast",
    };
  },
  dark_fantasy: (spec) => {
    patchDna(
      spec,
      "Gothic fantasy with bold outlines and mystic energy.",
      ["Bold Outline", "Cel Shaded", "Muted Palette"],
      ["gothic fantasy", "cel shaded", "heroic silhouette"],
    );
    spec.visualSpec.colorSystem.machineParams = {
      palette: ["#2B3A67", "#4A6FA5", "#8FB8DE", "#C5A059", "#1A1A2E"],
      primaryShare: 0.7,
      accentShare: 0.1,
      saturation: 0.45,
    };
    spec.visualSpec.lineSystem.machineParams = {
      outerWeight: 1,
      innerWeight: 0.6,
      tapering: "strong",
    };
    spec.toolSettings.imageGeneration = {
      ...spec.toolSettings.imageGeneration,
      promptTemplate: "gothic fantasy, cel shaded, bold outlines, mystic glow",
      negativePrompt: "photorealistic, pastel, cute",
    };
  },
  gaulic_adventure: (spec) => {
    patchDna(
      spec,
      "Franco-Belgian adventure comic with clean bright lines.",
      ["Clean Outlines", "Bright Palette", "Rounded Forms"],
      ["franco-belgian comic", "adventure", "village"],
    );
    patchDoAvoid(
      spec,
      ["Clear silhouettes", "Bright clean colors"],
      ["Photorealism", "Muddy colors"],
    );
    spec.visualSpec.colorSystem.machineParams = {
      palette: ["#5BADE6", "#6DBE45", "#F4D03F", "#E74C3C", "#F5E6D3"],
      primaryShare: 0.45,
      accentShare: 0.25,
      saturation: 0.75,
    };
    spec.visualSpec.propRules.machineParams = {
      detailDensity: 0.45,
      functionClarity: 0.9,
    };
    spec.toolSettings.imageGeneration = {
      ...spec.toolSettings.imageGeneration,
      promptTemplate: "franco-belgian comic, clean outlines, bright palette",
      negativePrompt: "photorealistic, dark, gritty",
    };
  },
};

function patchDna(
  spec: StyleProfileSpec,
  summary: string,
  traits: string[],
  tags: string[],
): void {
  spec.visualSpec.styleDna = {
    status: "configured",
    summary,
    humanRules: traits,
    machineParams: { tags },
  };
}

function patchDoAvoid(
  spec: StyleProfileSpec,
  doItems: string[],
  avoidItems: string[],
): void {
  spec.visualSpec.doAvoid = {
    status: "configured",
    summary: "Style consistency rules.",
    doItems,
    avoidItems,
  };
}

export function buildSpecFromTemplate(
  templateId: StyleProfileTemplateId,
): StyleProfileSpec {
  const baseId = resolveBaseTemplateId(templateId);
  const spec = buildBaseSpecFromTemplateId(baseId);
  spec.metadata = { ...spec.metadata, templateId };

  const override = PRESET_OVERRIDES[templateId];
  if (override) override(spec);

  return spec;
}

export const REFERENCE_PRESET_TEMPLATES = [
  {
    id: "cutout_satire" as const,
    labelDe: "Cutout Satire",
    descriptionDe: "Paper-town cutout comedy — flach, simpel, satirisch.",
    group: "animated" as const,
  },
  {
    id: "martial_adventure" as const,
    labelDe: "Martial Adventure",
    descriptionDe: "Shonen-Anime mit kräftigen Linien und Cel-Shading.",
    group: "animated" as const,
  },
  {
    id: "gaulic_adventure" as const,
    labelDe: "Gaulic Adventure",
    descriptionDe: "Franco-Belgian Comic — hell, klar, abgerundet.",
    group: "animated" as const,
  },
  {
    id: "dark_fantasy" as const,
    labelDe: "Dark Fantasy",
    descriptionDe: "Gothic Cel-Shading mit gedämpfter Palette.",
    group: "animated" as const,
  },
  {
    id: "superhero_blockbuster" as const,
    labelDe: "Superhero Blockbuster",
    descriptionDe: "Cinematic superhero scale mit dramatischem Licht.",
    group: "cinematic" as const,
  },
  {
    id: "wes_anderson" as const,
    labelDe: "Wes Anderson",
    descriptionDe: "Symmetrisch, pastell, theatrical — präzise Sets.",
    group: "cinematic" as const,
  },
] as const;

export const STYLE_PROFILE_TEMPLATES = [
  {
    id: "animated_stylized" as const,
    labelDe: "Animated / Stylized (Basis)",
    descriptionDe: "Generische 2D/Stylized-Vorlage — Startpunkt für Custom.",
  },
  {
    id: "cinematic_photoreal" as const,
    labelDe: "Cinematic / Photoreal (Basis)",
    descriptionDe: "Generische fotorealistische Pipeline-Vorlage.",
  },
  ...REFERENCE_PRESET_TEMPLATES,
] as const;
