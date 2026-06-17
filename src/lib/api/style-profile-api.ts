/**
 * Style profile facade for UI — routes through style-profiles-adapter.
 * Location: src/lib/api/style-profile-api.ts
 */

export type {
  StyleProfile,
  StyleProfileSpec,
  StyleProfileSummary,
  StyleProfileType,
  StyleProfileStatus,
  StyleSectionState,
  StyleProfileTemplateId,
  CreateStyleProfilePayload,
  UpdateStyleProfilePatch,
  StyleProfileExport,
} from "@/lib/types/style-profile";

export {
  listStyleProfiles,
  getStyleProfile,
  createStyleProfile,
  updateStyleProfile,
  deleteStyleProfile,
  duplicateStyleProfile,
  exportStyleProfileJson,
  getActiveStyleProfileId,
  setActiveStyleProfile,
  importFromStyleGuide,
  styleProfileFullSpecEditingAvailable,
  uploadStyleProfilePreview,
} from "@/lib/api-adapter/style-profiles-adapter";

export {
  STYLE_PROFILE_TEMPLATES,
  buildSpecFromTemplate,
  templateIdToType,
} from "@/lib/style-profile/reference-presets";
export { STYLE_SECTION_REGISTRY } from "@/lib/style-profile/section-registry";
