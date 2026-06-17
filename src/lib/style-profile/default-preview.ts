/**
 * In-memory preview profile for default style mode (no active style yet).
 * Location: src/lib/style-profile/default-preview.ts
 */

import type {
  StyleProfile,
  StyleProfileTemplateId,
} from "@/lib/types/style-profile";
import { buildStyleProfileSummary } from "./summary";
import {
  buildSpecFromTemplate,
  STYLE_PROFILE_TEMPLATES,
  templateIdToType,
} from "./reference-presets";

export const PREVIEW_PROFILE_ID = "__preview__";

export const DEFAULT_PREVIEW_TEMPLATE_ID: StyleProfileTemplateId =
  "cutout_satire";

export function buildPreviewStyleProfile(
  templateId: StyleProfileTemplateId = DEFAULT_PREVIEW_TEMPLATE_ID,
  projectId = "",
): StyleProfile {
  const template = STYLE_PROFILE_TEMPLATES.find((t) => t.id === templateId);
  const spec = buildSpecFromTemplate(templateId);
  const type = templateIdToType(templateId);
  const now = new Date().toISOString();

  return {
    id: PREVIEW_PROFILE_ID,
    projectId,
    name: template ? `${template.labelDe} (Vorschau)` : "Style-Vorschau",
    description: template?.descriptionDe,
    type,
    status: "draft",
    version: 1,
    configSummary: buildStyleProfileSummary({
      spec,
      type,
      source: { type: "template", templateId },
    }),
    spec,
    source: { type: "template", templateId },
    sync: { status: "local" },
    createdAt: now,
    updatedAt: now,
    isActiveForProject: false,
    fullSpecEditing: false,
  };
}
