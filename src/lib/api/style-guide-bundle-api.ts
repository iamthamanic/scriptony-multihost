/**
 * Cloud API: create guide bundle from style profile spec (T96).
 * Location: src/lib/api/style-guide-bundle-api.ts
 */

import { apiPost, unwrapApiResult } from "@/lib/api-client";
import { usesCloudHttpForDomain } from "@/lib/api-adapter/domain-access";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { getStyleProfile } from "@/lib/api-adapter/style-profiles-adapter";
import { canUseCloudSessionAndConfig } from "@/lib/auth/cloud-session";

export async function canUseGuideBundleCloudApi(): Promise<boolean> {
  if (usesCloudHttpForDomain()) return true;
  return canUseCloudSessionAndConfig();
}

export interface GuideBundleFromSpecResult {
  guideBundle: {
    id: string;
    revision: number;
    shotId: string;
    metadata?: Record<string, unknown>;
  };
  shot: Record<string, unknown>;
}

async function resolveCloudStyleProfileId(
  profileId: string | null | undefined,
): Promise<string | null | undefined> {
  if (!profileId?.trim()) return profileId;
  if (!isLocalProfile()) return profileId.trim();
  const profile = await getStyleProfile(profileId.trim());
  const cloudId = profile.sync.cloudId?.trim();
  if (!cloudId) {
    throw new Error(
      "Style-Profil ist noch nicht in der Cloud synchronisiert — zuerst Style-Sync ausführen",
    );
  }
  return cloudId;
}

export async function createGuideBundleFromStyleProfile(input: {
  projectId: string;
  shotId: string;
  styleProfileId?: string | null;
  sceneOverrideId?: string | null;
}): Promise<GuideBundleFromSpecResult> {
  if (!(await canUseGuideBundleCloudApi())) {
    throw new Error("Guide aus Style benötigt eine Cloud-Session");
  }

  const payload = {
    projectId: input.projectId,
    shotId: input.shotId,
    styleProfileId: input.styleProfileId
      ? await resolveCloudStyleProfileId(input.styleProfileId)
      : undefined,
    sceneOverrideId: input.sceneOverrideId
      ? await resolveCloudStyleProfileId(input.sceneOverrideId)
      : undefined,
  };

  const result = await apiPost<GuideBundleFromSpecResult>(
    "/ai/style/guide-bundle",
    payload,
  );
  return unwrapApiResult(result);
}
