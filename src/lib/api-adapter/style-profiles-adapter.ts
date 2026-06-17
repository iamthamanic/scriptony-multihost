/**
 * Runtime-aware style profile API dispatch.
 * Location: src/lib/api-adapter/style-profiles-adapter.ts
 */

import type {
  CreateStyleProfilePayload,
  StyleProfile,
  StyleProfileExport,
  UpdateStyleProfilePatch,
} from "@/lib/types/style-profile";
import { getStyleGuide } from "./style-guide-adapter";
import { mergeStyleGuideImport } from "@/lib/style-profile/import-from-style-guide";
import { normalizeStyleProfileSpec } from "@/lib/style-profile/normalize";
import { buildAndValidateSummary } from "@/lib/style-profile/summary";
import {
  buildSpecFromTemplate,
  templateIdToType,
} from "@/lib/style-profile/reference-presets";
import { createEmptyStyleProfileSpec } from "@/lib/style-profile/templates";
import { isLocalProfile } from "./runtime-dispatch";
import { hasOpenLocalProject, usesCloudHttpForDomain } from "./domain-access";
import {
  cloudCreateStyleProfile,
  cloudDeleteStyleProfile,
  cloudGetStyleProfile,
  cloudListStyleProfiles,
  cloudUpdateStyleProfile,
  cloudUploadStyleProfilePreview,
} from "@/lib/api/style-profile-cloud-http";
import {
  localCreateStyleProfile,
  localDeleteStyleProfile,
  localGetActiveStyleProfileId,
  localGetStyleProfile,
  localListStyleProfiles,
  localSetActiveStyleProfileId,
  localUpdateStyleProfile,
} from "./style-profiles-local";
import {
  afterLocalStyleProfileSave,
  deleteStyleProfileFromCloud,
  scheduleHybridActiveStyleProfilePush,
} from "@/lib/style-profile/hybrid-cloud-push";
import { apiGet, apiPut } from "@/lib/api-client";
import { mergeActiveStyleProfileIntoMetadata } from "@/lib/project-metadata-merge";
import { unwrapApiResult } from "@/lib/api-client";

async function cloudGetActiveStyleProfileId(
  projectId: string,
): Promise<string | null> {
  try {
    const result = await apiGet<{ project?: Record<string, unknown> }>(
      `/projects/${encodeURIComponent(projectId)}`,
    );
    const data = unwrapApiResult(result);
    const project = (data?.project ?? data) as Record<string, unknown>;
    const metaRaw = project.metadata_json ?? project.metadataJson;
    if (typeof metaRaw === "string" && metaRaw.trim()) {
      const meta = JSON.parse(metaRaw) as Record<string, unknown>;
      const id = meta.activeStyleProfileId ?? meta.active_style_profile_id;
      return typeof id === "string" && id.trim() ? id.trim() : null;
    }
    if (metaRaw && typeof metaRaw === "object") {
      const meta = metaRaw as Record<string, unknown>;
      const id = meta.activeStyleProfileId ?? meta.active_style_profile_id;
      return typeof id === "string" && id.trim() ? id.trim() : null;
    }
  } catch (error) {
    console.error(
      "[style-profiles] cloudGetActiveStyleProfileId failed:",
      error,
    );
    return null;
  }
  return null;
}

export async function listStyleProfiles(
  projectId: string,
): Promise<StyleProfile[]> {
  if (usesCloudHttpForDomain()) {
    const activeId = await cloudGetActiveStyleProfileId(projectId);
    return cloudListStyleProfiles(projectId, {
      activeStyleProfileId: activeId,
    });
  }
  return localListStyleProfiles(projectId);
}

export async function getStyleProfile(
  profileId: string,
): Promise<StyleProfile> {
  if (usesCloudHttpForDomain()) {
    return cloudGetStyleProfile(profileId);
  }
  return localGetStyleProfile(profileId);
}

export async function createStyleProfile(
  projectId: string,
  payload: CreateStyleProfilePayload,
): Promise<StyleProfile> {
  if (usesCloudHttpForDomain()) {
    const spec = normalizeStyleProfileSpec(
      payload.spec ??
        (payload.templateId
          ? buildSpecFromTemplate(payload.templateId)
          : createEmptyStyleProfileSpec()),
    );
    const type =
      payload.type ??
      (payload.templateId ? templateIdToType(payload.templateId) : "custom");
    const summary = buildAndValidateSummary({
      spec,
      type,
      status: "draft",
    });
    const existing = await cloudListStyleProfiles(projectId, {
      activeStyleProfileId: await cloudGetActiveStyleProfileId(projectId),
    });
    const created = await cloudCreateStyleProfile(projectId, {
      name: payload.name,
      projectId,
      config: summary,
      spec,
    });
    const shouldActivate =
      payload.setActive === true ||
      (payload.setActive !== false && existing.length === 0);
    if (shouldActivate) {
      await setActiveStyleProfile(projectId, created.id);
      return { ...created, isActiveForProject: true };
    }
    return created;
  }
  const profile = await localCreateStyleProfile(projectId, payload);
  afterLocalStyleProfileSave(profile);
  return profile;
}

export async function updateStyleProfile(
  profileId: string,
  patch: UpdateStyleProfilePatch,
): Promise<StyleProfile> {
  if (usesCloudHttpForDomain()) {
    const existing = await cloudGetStyleProfile(profileId);
    const spec = normalizeStyleProfileSpec(patch.spec ?? existing.spec);
    const summary = buildAndValidateSummary({
      spec,
      type: patch.type ?? existing.type,
      status: patch.status ?? existing.status,
      source: patch.source ?? existing.source,
    });
    return await cloudUpdateStyleProfile(profileId, {
      name: patch.name,
      previewImageId: patch.previewImageId,
      config: summary,
      spec,
    });
  }
  const updated = await localUpdateStyleProfile(profileId, patch);
  afterLocalStyleProfileSave(updated);
  return updated;
}

export async function deleteStyleProfile(profileId: string): Promise<void> {
  if (usesCloudHttpForDomain()) {
    return cloudDeleteStyleProfile(profileId);
  }
  const existing = await localGetStyleProfile(profileId);
  const cloudId = existing.sync.cloudId;
  await localDeleteStyleProfile(profileId);
  void deleteStyleProfileFromCloud(cloudId);
}

export async function duplicateStyleProfile(
  profileId: string,
): Promise<StyleProfile> {
  const source = await getStyleProfile(profileId);
  if (usesCloudHttpForDomain()) {
    const summary = buildAndValidateSummary({
      spec: source.spec,
      type: source.type,
      status: "draft",
      source: { type: "manual", referenceId: source.id },
    });
    return cloudCreateStyleProfile(source.projectId, {
      name: `${source.name} (Copy)`,
      projectId: source.projectId,
      config: summary,
      spec: source.spec,
    });
  }
  const copy = await localCreateStyleProfile(source.projectId, {
    name: `${source.name} (Copy)`,
    type: source.type,
    spec: source.spec,
    setActive: false,
  });
  afterLocalStyleProfileSave(copy);
  return copy;
}

export async function exportStyleProfileJson(
  profileId: string,
): Promise<StyleProfileExport> {
  const profile = await getStyleProfile(profileId);
  return {
    profile,
    exportedAt: new Date().toISOString(),
    format: "style-profile-v1",
  };
}

export async function getActiveStyleProfileId(
  projectId: string,
): Promise<string | null> {
  if (usesCloudHttpForDomain()) {
    return cloudGetActiveStyleProfileId(projectId);
  }
  return localGetActiveStyleProfileId(projectId);
}

export async function setActiveStyleProfile(
  projectId: string,
  profileId: string | null,
): Promise<void> {
  if (usesCloudHttpForDomain()) {
    const result = await apiGet<{ project?: Record<string, unknown> }>(
      `/projects/${encodeURIComponent(projectId)}`,
    );
    const data = unwrapApiResult(result);
    const project = (data?.project ?? data) as Record<string, unknown>;
    await apiPut(`/projects/${encodeURIComponent(projectId)}`, {
      metadata_json: mergeActiveStyleProfileIntoMetadata(
        project.metadata_json ?? project.metadataJson,
        profileId,
      ),
    });
    return;
  }
  await localSetActiveStyleProfileId(projectId, profileId);
  scheduleHybridActiveStyleProfilePush(projectId, profileId);
}

export async function importFromStyleGuide(
  projectId: string,
  profileId: string,
): Promise<StyleProfile> {
  const profile = await getStyleProfile(profileId);
  const styleGuide = await getStyleGuide(projectId);
  const merged = mergeStyleGuideImport(profile, styleGuide);
  return updateStyleProfile(profileId, {
    spec: merged.spec,
    configSummary: merged.configSummary,
    source: merged.source,
  });
}

export function styleProfileFullSpecEditingAvailable(): boolean {
  if (isLocalProfile() && hasOpenLocalProject()) {
    return true;
  }
  return usesCloudHttpForDomain();
}

export async function uploadStyleProfilePreview(
  profileId: string,
  file: File,
): Promise<StyleProfile> {
  if (usesCloudHttpForDomain()) {
    return cloudUploadStyleProfilePreview(profileId, file);
  }
  const profile = await localGetStyleProfile(profileId);
  const cloudId = profile.sync.cloudId?.trim();
  if (!cloudId) {
    throw new Error(
      "Preview-Upload benötigt Cloud-Anmeldung und ein synchronisiertes Profil.",
    );
  }
  const cloudProfile = await cloudUploadStyleProfilePreview(cloudId, file);
  return localUpdateStyleProfile(profileId, {
    previewImageId: cloudProfile.previewImageId,
  });
}
