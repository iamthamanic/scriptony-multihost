/**
 * StyleProfile domain types — machine-readable visual style specs.
 * Location: src/lib/types/style-profile.ts
 */

export type StyleProfileType =
  | "animated_stylized"
  | "cinematic_photoreal"
  | "custom";

export type StyleProfileStatus = "draft" | "published" | "archived";

export type StyleSectionStatus = "draft" | "configured" | "missing";

export type StyleProfileTemplateId =
  | "animated_stylized"
  | "cinematic_photoreal"
  | "cutout_satire"
  | "martial_adventure"
  | "superhero_blockbuster"
  | "wes_anderson"
  | "dark_fantasy"
  | "gaulic_adventure";

export interface StyleSectionState {
  status: StyleSectionStatus;
  summary?: string;
  humanRules?: string[];
  machineParams?: Record<string, unknown>;
  toolMapping?: Record<string, unknown>;
  doItems?: string[];
  avoidItems?: string[];
  exampleRefs?: string[];
  disabled?: boolean;
}

export interface VisualSpecSections {
  styleDna: StyleSectionState;
  shapeLanguage: StyleSectionState;
  lineSystem: StyleSectionState;
  colorSystem: StyleSectionState;
  shadingLighting: StyleSectionState;
  characterRules: StyleSectionState;
  creatureRules: StyleSectionState;
  propRules: StyleSectionState;
  vehicleRules: StyleSectionState;
  environmentRules: StyleSectionState;
  materialRules: StyleSectionState;
  fxRules: StyleSectionState;
  cameraComposition: StyleSectionState;
  poseActing: StyleSectionState;
  doAvoid: StyleSectionState;
  recognitionMarkers: StyleSectionState;
  validationAssets: StyleSectionState;
}

export type VisualSpecSectionKey = keyof VisualSpecSections;

export interface StyleProfileToolSettings {
  imageGeneration?: {
    baseModelId?: string;
    baseModelHash?: string;
    loraStack?: Array<{
      id: string;
      name?: string;
      hash?: string;
      strengthModel?: number;
      strengthClip?: number;
      triggerWords?: string[];
    }>;
    promptTemplate?: string;
    negativePrompt?: string;
    sampler?: string;
    scheduler?: string;
    steps?: number;
    cfg?: number;
    denoise?: number;
    seedPolicy?: "random" | "locked_per_asset" | "locked_per_revision";
    defaultWidth?: number;
    defaultHeight?: number;
  };
  comfyui?: {
    workflowBindings?: {
      textToImage?: string;
      imageToImage?: string;
      characterSheet?: string;
      propSheet?: string;
      environmentConcept?: string;
      shotPreview?: string;
      shotFinal?: string;
      repairInpaint?: string;
    };
    controlNetMix?: {
      depth?: number;
      lineart?: number;
      pose?: number;
      segmentation?: number;
      normal?: number;
    };
    ipAdapter?: {
      styleReferenceStrength?: number;
      characterReferenceStrength?: number;
      compositionReferenceStrength?: number;
    };
  };
  blender?: {
    guideExportPresetId?: string;
    shaderProfileId?: string;
    outlinePresetId?: string;
    materialProfileId?: string;
    renderEngine?: string;
    colorManagement?: string;
  };
}

export interface StyleProfileValidationConfig {
  requiredAssets?: string[];
  checks?: {
    paletteMatch?: boolean;
    lineMatch?: boolean;
    shapeMatch?: boolean;
    characterConsistency?: boolean;
    materialMatch?: boolean;
    structureMatch?: boolean;
  };
  thresholds?: {
    styleScore?: number;
    paletteScore?: number;
    silhouetteScore?: number;
    characterConsistencyScore?: number;
  };
}

export interface StyleProfileSpec {
  visualSpec: VisualSpecSections;
  toolSettings: StyleProfileToolSettings;
  validationConfig?: StyleProfileValidationConfig;
  references?: unknown[];
  metadata?: Record<string, unknown>;
}

/** Compact cloud-safe summary (maps to legacy StyleProfileConfig fields). */
export interface StyleProfileSummary {
  styleSummary?: string;
  toneSummary?: string;
  keywords?: string[];
  negativeKeywords?: string[];
  mustHave?: string[];
  avoid?: string[];
  palettePrimary?: string[];
  paletteSecondary?: string[];
  paletteAccent?: string[];
  paletteBackground?: string[];
  typographyNotes?: string;
  compactPrompt?: string;
  type?: StyleProfileType;
  status?: StyleProfileStatus;
  source?: StyleProfileSource;
}

export interface StyleProfileSource {
  type: "manual" | "style-guide" | "import" | "template" | "unknown";
  referenceId?: string;
  styleGuideId?: string;
  templateId?: string;
  importedAt?: string;
}

export type StyleProfileSyncStatus =
  | "local"
  | "pending"
  | "synced"
  | "conflict";

export interface StyleProfileSyncMeta {
  status: StyleProfileSyncStatus;
  cloudId?: string | null;
  lastSyncedAt?: string | null;
}

export interface StyleProfile {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type: StyleProfileType;
  status: StyleProfileStatus;
  version: number;
  previewImageId?: string | null;
  previewUrl?: string | null;
  specRef?: string | null;
  configSummary: StyleProfileSummary;
  spec: StyleProfileSpec;
  source?: StyleProfileSource;
  sync: StyleProfileSyncMeta;
  createdAt: string;
  updatedAt: string;
  /** Derived when listing — matches project.activeStyleProfileId */
  isActiveForProject?: boolean;
  /** UI hint: full spec editing available (local project open). */
  fullSpecEditing?: boolean;
}

export interface CreateStyleProfilePayload {
  name: string;
  description?: string;
  templateId?: StyleProfileTemplateId;
  type?: StyleProfileType;
  spec?: Partial<StyleProfileSpec>;
  setActive?: boolean;
}

export interface UpdateStyleProfilePatch {
  name?: string;
  description?: string;
  type?: StyleProfileType;
  status?: StyleProfileStatus;
  previewImageId?: string | null;
  configSummary?: StyleProfileSummary;
  spec?: StyleProfileSpec;
  source?: StyleProfileSource;
  version?: number;
}

export interface StyleProfileExport {
  profile: StyleProfile;
  exportedAt: string;
  format: "style-profile-v1";
}
