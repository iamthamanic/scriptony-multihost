/**
 * Cloud style profile HTTP — scriptony-style /ai/style/profiles.
 * Location: src/lib/api/style-profile-cloud-http.ts
 */

import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  unwrapApiResult,
} from "../api-client";
import type {
  StyleProfile,
  StyleProfileSpec,
  StyleProfileSummary,
} from "@/lib/types/style-profile";
import type { StyleAnalysisScores } from "@/lib/style-profile/analyze-style";
import { normalizeCloudStyleProfile } from "@/lib/style-profile/normalize";
import { buildStyleProfilePreviewUrl } from "@/lib/style-profile/preview-url";
import { prepareImageFileForUpload } from "@/lib/image-upload-prep";
import {
  assertPreparedImageWithinUploadLimit,
  fileToBase64,
  type ClientImageUploadPrepOptions,
} from "@/lib/api/image-upload-api";

interface CloudProfileRow {
  id: string;
  userId?: string;
  projectId?: string | null;
  name: string;
  previewImageId?: string | null;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  config?: Record<string, unknown>;
  spec?: Record<string, unknown> | null;
  specRef?: string | null;
}

function mapRow(
  row: CloudProfileRow,
  options?: { isActiveForProject?: boolean; includeSpec?: boolean },
): StyleProfile {
  return normalizeCloudStyleProfile(
    {
      ...row,
      previewUrl: buildStyleProfilePreviewUrl(row.previewImageId),
    },
    {
      fullSpecEditing: true,
      isActiveForProject: options?.isActiveForProject,
    },
  );
}

export async function cloudListStyleProfiles(
  projectId: string,
  options?: { activeStyleProfileId?: string | null },
): Promise<StyleProfile[]> {
  const result = await apiGet<{ profiles: CloudProfileRow[] }>(
    `/ai/style/profiles?projectId=${encodeURIComponent(projectId)}`,
  );
  const data = unwrapApiResult(result);
  const profiles = Array.isArray(data?.profiles) ? data.profiles : [];
  return profiles.map((p) =>
    mapRow(p, {
      isActiveForProject:
        options?.activeStyleProfileId != null &&
        p.id === options.activeStyleProfileId,
    }),
  );
}

export async function cloudGetStyleProfile(
  profileId: string,
): Promise<StyleProfile> {
  const result = await apiGet<{ profile: CloudProfileRow }>(
    `/ai/style/profiles/${encodeURIComponent(profileId)}`,
  );
  const data = unwrapApiResult(result);
  return mapRow(data.profile);
}

export async function cloudCreateStyleProfile(
  projectId: string,
  payload: {
    name: string;
    projectId: string;
    previewImageId?: string | null;
    config: StyleProfileSummary;
    spec?: StyleProfileSpec;
  },
): Promise<StyleProfile> {
  const result = await apiPost<{ profile: CloudProfileRow }>(
    "/ai/style/profiles",
    {
      name: payload.name,
      projectId: payload.projectId,
      previewImageId: payload.previewImageId ?? null,
      config: payload.config,
      spec: payload.spec,
    },
  );
  const data = unwrapApiResult(result);
  return mapRow(data.profile);
}

export async function cloudUpdateStyleProfile(
  profileId: string,
  patch: {
    name?: string;
    projectId?: string | null;
    previewImageId?: string | null;
    config?: StyleProfileSummary;
    spec?: StyleProfileSpec;
  },
): Promise<StyleProfile> {
  const result = await apiPut<{ profile: CloudProfileRow }>(
    `/ai/style/profiles/${encodeURIComponent(profileId)}`,
    patch,
  );
  const data = unwrapApiResult(result);
  return mapRow(data.profile);
}

export async function cloudUploadStyleProfilePreview(
  profileId: string,
  file: File,
  prepOptions?: ClientImageUploadPrepOptions,
): Promise<StyleProfile> {
  const ready = await prepareImageFileForUpload(file, prepOptions);
  assertPreparedImageWithinUploadLimit(ready, 5);
  const base64 = await fileToBase64(ready);
  // JSON body — backend `ensureFile` → `extractUploadedFile` accepts fileBase64.
  const result = await apiPost<{ profile: CloudProfileRow }>(
    `/ai/style/profiles/${encodeURIComponent(profileId)}/preview-image`,
    {
      fileBase64: base64,
      fileName: ready.name,
      mimeType: ready.type,
    },
  );
  const data = unwrapApiResult(result);
  return mapRow(data.profile);
}

export async function cloudDeleteStyleProfile(
  profileId: string,
): Promise<void> {
  await apiDelete(`/ai/style/profiles/${encodeURIComponent(profileId)}`);
}

import type {
  StyleAnalysisRemoteResult,
  StyleAssetCheck,
} from "@/lib/style-profile/analyze-style-remote";

export async function cloudAnalyzeStyleProfile(input: {
  spec?: StyleProfileSpec;
  profileId?: string;
  mode?: "heuristic" | "ai" | "vision";
}): Promise<StyleAnalysisRemoteResult> {
  const result = await apiPost<{
    scores: StyleAnalysisScores;
    assetChecks?: StyleAssetCheck[];
  }>("/ai/style/analyze", input);
  const data = unwrapApiResult(result);
  return { scores: data.scores, assetChecks: data.assetChecks };
}

export async function cloudUploadStyleProfileValidationAsset(
  profileId: string,
  slotIndex: number,
  file: File,
  prepOptions?: ClientImageUploadPrepOptions,
): Promise<StyleProfile> {
  const ready = await prepareImageFileForUpload(file, prepOptions);
  assertPreparedImageWithinUploadLimit(ready, 5);
  const base64 = await fileToBase64(ready);
  const result = await apiPost<{ profile: CloudProfileRow }>(
    `/ai/style/profiles/${encodeURIComponent(profileId)}/validation-asset?slotIndex=${slotIndex}`,
    {
      fileBase64: base64,
      fileName: ready.name,
      mimeType: ready.type,
    },
  );
  const data = unwrapApiResult(result);
  return mapRow(data.profile);
}
