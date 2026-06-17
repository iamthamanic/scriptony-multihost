/**
 * Default visualSpec sections and template factories.
 * Location: src/lib/style-profile/templates.ts
 */

import type {
  StyleProfileSpec,
  StyleProfileTemplateId,
  StyleProfileType,
  StyleSectionState,
  VisualSpecSections,
} from "@/lib/types/style-profile";
import { VISUAL_SPEC_SECTION_KEYS } from "./section-registry";

function emptySection(
  status: StyleSectionState["status"] = "missing",
): StyleSectionState {
  return { status };
}

function configuredSection(
  summary: string,
  extra?: Partial<StyleSectionState>,
): StyleSectionState {
  return { status: "configured", summary, ...extra };
}

export function createEmptyVisualSpec(): VisualSpecSections {
  return Object.fromEntries(
    VISUAL_SPEC_SECTION_KEYS.map((key) => [key, emptySection()]),
  ) as unknown as VisualSpecSections;
}

export function createEmptyStyleProfileSpec(): StyleProfileSpec {
  return {
    visualSpec: createEmptyVisualSpec(),
    toolSettings: {},
    validationConfig: {
      checks: {
        paletteMatch: true,
        lineMatch: true,
        shapeMatch: true,
      },
      thresholds: {
        styleScore: 0.8,
        paletteScore: 0.85,
      },
    },
    references: [],
    metadata: {},
  };
}

function animatedStylizedVisualSpec(): VisualSpecSections {
  const base = createEmptyVisualSpec();
  return {
    ...base,
    styleDna: configuredSection("Flat cutout comedy with paper-layer depth.", {
      humanRules: ["Flat shapes", "Paper layers", "Deadpan humor"],
      machineParams: { tags: ["flat cutout", "paper layers", "stylized"] },
    }),
    shapeLanguage: configuredSection(
      "Simple geometric primitives, chunky silhouettes.",
      {
        machineParams: { angularity: 0.7, chunkiness: 0.8 },
      },
    ),
    lineSystem: configuredSection(
      "Minimal or no outlines; flat color blocks.",
      {
        machineParams: { outlineWeight: 0.2, tapering: "weak" },
      },
    ),
    colorSystem: configuredSection("Limited palette with bold accent colors.", {
      machineParams: {
        palette: ["#F5E6D3", "#6E59A5", "#E85D4C", "#4A90A4"],
        primaryShare: 0.4,
        accentShare: 0.3,
        saturation: 0.7,
      },
    }),
    shadingLighting: configuredSection("No gradients; flat fills only.", {
      machineParams: { shadowSteps: 0, gradients: false },
    }),
    characterRules: configuredSection(
      "Big heads, simple bodies, clear silhouettes.",
      {
        machineParams: {
          headHeightRatio: 0.45,
          headRatio: "large",
          proportions: "cartoon",
        },
      },
    ),
    propRules: configuredSection("Simple iconic props, flat colors.", {
      machineParams: { detailDensity: 0.3 },
    }),
    environmentRules: configuredSection(
      "Layered paper backgrounds, simple depth.",
      {
        machineParams: { backgroundDetail: 0.4 },
      },
    ),
    doAvoid: configuredSection("Maintain flat stylization.", {
      doItems: ["Flat shapes", "Clear silhouettes", "Limited palette"],
      avoidItems: ["Photorealism", "3D rendering", "Heavy gradients"],
    }),
    creatureRules: emptySection("draft"),
    vehicleRules: emptySection("draft"),
    materialRules: emptySection("draft"),
    fxRules: emptySection("draft"),
    cameraComposition: configuredSection(
      "Front-on and wide orthographic setups.",
      {
        machineParams: {
          cameraMode: "orthographic",
          shotTypes: ["Front-on", "Wide"],
          symmetry: 0.2,
        },
      },
    ),
    poseActing: emptySection("draft"),
    recognitionMarkers: emptySection("draft"),
    validationAssets: emptySection("draft"),
  };
}

function cinematicPhotorealVisualSpec(): VisualSpecSections {
  const base = createEmptyVisualSpec();
  return {
    ...base,
    styleDna: configuredSection(
      "Heroic cinematic scale with grounded realism.",
      {
        humanRules: ["Epic scale", "Dramatic contrast", "Grounded realism"],
        machineParams: { tags: ["cinematic", "superhero", "epic scale"] },
      },
    ),
    shapeLanguage: configuredSection(
      "Monumental forms with industrial accents.",
      {
        machineParams: { monumental: 0.9, industrial: 0.7 },
      },
    ),
    lineSystem: {
      status: "configured",
      summary: "Line system not primary for photoreal pipeline.",
      disabled: true,
    },
    colorSystem: configuredSection(
      "Grade-oriented palette with ACES workflow.",
      {
        machineParams: {
          palette: ["#1A1F2E", "#3D5A80", "#E0FBFC", "#EE6C4D", "#F4F1DE"],
          primaryShare: 0.45,
          accentShare: 0.15,
          gradeLut: "heroic_contrast",
          saturation: 0.85,
        },
      },
    ),
    shadingLighting: configuredSummary(
      "Dramatic rim light, volumetrics, high contrast.",
      {
        machineParams: {
          dramatic: true,
          rimLight: 0.85,
          shadowSteps: 2,
          gradients: true,
          volumetrics: true,
        },
      },
    ),
    materialRules: configuredSection(
      "PBR materials with surface imperfection.",
      {
        machineParams: { reflectivity: 0.7, microDetail: 0.6 },
      },
    ),
    cameraComposition: configuredSection(
      "Wide establishing, low-angle hero shots.",
      {
        machineParams: {
          shotTypes: ["Front-on", "Wide"],
          focalLengths: ["18", "35", "85"],
          symmetry: 0.35,
        },
      },
    ),
    characterRules: emptySection("draft"),
    creatureRules: emptySection("draft"),
    propRules: emptySection("draft"),
    vehicleRules: emptySection("draft"),
    environmentRules: emptySection("draft"),
    fxRules: emptySection("draft"),
    poseActing: emptySection("draft"),
    doAvoid: configuredSummary("Cinematic storytelling rules.", {
      doItems: ["Tell clear story", "Maintain scale", "Push contrast"],
      avoidItems: ["Flat lighting", "Over-saturation", "Excessive lens flares"],
    }),
    recognitionMarkers: emptySection("draft"),
    validationAssets: emptySection("draft"),
  };
}

function configuredSummary(
  summary: string,
  extra?: Partial<StyleSectionState>,
): StyleSectionState {
  return configuredSection(summary, extra);
}

function animatedToolSettings(): StyleProfileSpec["toolSettings"] {
  return {
    imageGeneration: {
      promptTemplate:
        "flat cutout style, paper layers, simple shapes, stylized animation",
      negativePrompt: "photorealistic, 3d render, gradients, detailed texture",
      steps: 28,
      cfg: 7,
      seedPolicy: "random",
      defaultWidth: 1920,
      defaultHeight: 1080,
    },
    comfyui: {
      workflowBindings: {},
      controlNetMix: { lineart: 0.5 },
      ipAdapter: { styleReferenceStrength: 0.85 },
    },
    blender: {
      renderEngine: "EEVEE",
      colorManagement: "Standard",
    },
  };
}

function cinematicToolSettings(): StyleProfileSpec["toolSettings"] {
  return {
    imageGeneration: {
      promptTemplate:
        "cinematic, superhero, epic scale, dramatic lighting, photoreal",
      negativePrompt: "cartoon, flat lighting, low quality",
      steps: 35,
      cfg: 6.5,
      seedPolicy: "locked_per_revision",
      defaultWidth: 1920,
      defaultHeight: 1080,
    },
    comfyui: {
      workflowBindings: {},
      controlNetMix: { depth: 0.6, pose: 0.4 },
      ipAdapter: { styleReferenceStrength: 0.75 },
    },
    blender: {
      renderEngine: "Cycles",
      colorManagement: "AgX",
    },
  };
}

export function buildBaseSpecFromTemplateId(
  templateId: "animated_stylized" | "cinematic_photoreal",
): StyleProfileSpec {
  const spec = createEmptyStyleProfileSpec();
  spec.metadata = { templateId };

  if (templateId === "cinematic_photoreal") {
    spec.visualSpec = cinematicPhotorealVisualSpec();
    spec.toolSettings = cinematicToolSettings();
  } else {
    spec.visualSpec = animatedStylizedVisualSpec();
    spec.toolSettings = animatedToolSettings();
  }

  return spec;
}
