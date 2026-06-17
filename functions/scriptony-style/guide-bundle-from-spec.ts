/**
 * Create a spec-only guide bundle from a style profile (T96).
 * Location: functions/scriptony-style/guide-bundle-from-spec.ts
 */

import { ID } from "node-appwrite";
import { C, createDocument, updateDocument } from "../_shared/appwrite-db";
import { getAccessibleProject } from "../_shared/scriptony";
import { toInteger } from "../_shared/puppet-helpers";
import {
  getStyleProfileById,
  getStyleShotById,
  styleProfileRowToApiWithSpec,
  userCanAccessShotStyle,
  userCanAccessStyleProfile,
} from "./style-service";

export type CreateGuideBundleFromSpecInput = {
  projectId: string;
  shotId: string;
  styleProfileId?: string | null;
  sceneOverrideId?: string | null;
};

function pickString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function resolveEffectiveProfileId(
  input: CreateGuideBundleFromSpecInput,
  shotRow: Record<string, unknown>,
  projectRow: Record<string, unknown> | null,
): string | null {
  if (input.styleProfileId?.trim()) {
    return input.styleProfileId.trim();
  }
  const shotOverride = pickString(shotRow.styleProfileOverrideId);
  if (shotOverride) return shotOverride;
  const sceneOverride = pickString(input.sceneOverrideId);
  if (sceneOverride) return sceneOverride;
  const shotAssigned = pickString(shotRow.styleProfileId);
  if (shotAssigned) return shotAssigned;
  if (!projectRow) return null;
  const metaRaw = projectRow.metadata_json ?? projectRow.metadataJson;
  if (typeof metaRaw === "string" && metaRaw.trim()) {
    try {
      const meta = JSON.parse(metaRaw) as Record<string, unknown>;
      return (
        pickString(meta.activeStyleProfileId) ??
        pickString(meta.active_style_profile_id)
      );
    } catch {
      return null;
    }
  }
  if (metaRaw && typeof metaRaw === "object") {
    const meta = metaRaw as Record<string, unknown>;
    return (
      pickString(meta.activeStyleProfileId) ??
      pickString(meta.active_style_profile_id)
    );
  }
  return null;
}

function resolveCompactPrompt(spec: Record<string, unknown>): string {
  if (typeof spec.compactPrompt === "string" && spec.compactPrompt.trim()) {
    return spec.compactPrompt.trim();
  }
  const toolSettings = (spec.toolSettings ?? {}) as Record<string, unknown>;
  const imageGen = (toolSettings.imageGeneration ?? {}) as Record<
    string,
    unknown
  >;
  if (
    typeof imageGen.promptTemplate === "string" &&
    imageGen.promptTemplate.trim()
  ) {
    return imageGen.promptTemplate.trim();
  }
  const visualSpec = (spec.visualSpec ?? {}) as Record<string, unknown>;
  const styleDna = (visualSpec.styleDna ?? {}) as Record<string, unknown>;
  if (typeof styleDna.summary === "string" && styleDna.summary.trim()) {
    return styleDna.summary.trim();
  }
  return "";
}

function extractPalette(spec: Record<string, unknown>): string[] {
  const visualSpec = (spec.visualSpec ?? {}) as Record<string, unknown>;
  const colorSystem = (visualSpec.colorSystem ?? {}) as Record<string, unknown>;
  const machineParams = (colorSystem.machineParams ?? {}) as Record<
    string,
    unknown
  >;
  const palette = machineParams.palette;
  if (!Array.isArray(palette)) return [];
  return palette.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0,
  );
}

function extractDoAvoid(spec: Record<string, unknown>): {
  doItems: string[];
  avoidItems: string[];
} {
  const visualSpec = (spec.visualSpec ?? {}) as Record<string, unknown>;
  const doAvoid = (visualSpec.doAvoid ?? {}) as Record<string, unknown>;
  const machineParams = (doAvoid.machineParams ?? {}) as Record<
    string,
    unknown
  >;
  const doItems = Array.isArray(machineParams.doItems)
    ? machineParams.doItems.filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      )
    : [];
  const avoidItems = Array.isArray(machineParams.avoidItems)
    ? machineParams.avoidItems.filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      )
    : [];
  return { doItems, avoidItems };
}

export async function createGuideBundleFromSpec(
  input: CreateGuideBundleFromSpecInput,
  userId: string,
  organizationIds: string[],
): Promise<{
  guideBundle: Record<string, unknown>;
  shot: Record<string, unknown>;
}> {
  const shotRow = await getStyleShotById(input.shotId);
  if (!shotRow) {
    throw new Error("Shot not found");
  }
  if (!(await userCanAccessShotStyle(shotRow, userId, organizationIds))) {
    throw new Error("Shot not found");
  }

  const shotProjectId = pickString(shotRow.project_id ?? shotRow.projectId);
  if (!shotProjectId || shotProjectId !== input.projectId.trim()) {
    throw new Error("Shot does not belong to project");
  }

  const projectRow = await getAccessibleProject(
    input.projectId,
    userId,
    organizationIds,
  );
  if (!projectRow) {
    throw new Error("Project not found");
  }

  const resolvedProfileId = resolveEffectiveProfileId(
    input,
    shotRow,
    projectRow,
  );
  if (!resolvedProfileId) {
    throw new Error("No style profile resolved for shot");
  }

  const profileRow = await getStyleProfileById(resolvedProfileId);
  if (!profileRow) {
    throw new Error("Style profile not found");
  }
  if (!(await userCanAccessStyleProfile(profileRow, userId, organizationIds))) {
    throw new Error("Style profile not found");
  }
  const profileProjectId = pickString(
    profileRow.project_id ?? profileRow.projectId,
  );
  if (!profileProjectId || profileProjectId !== input.projectId.trim()) {
    throw new Error("Style profile does not belong to project");
  }

  const profileApi = await styleProfileRowToApiWithSpec(profileRow);
  const spec =
    profileApi.spec && typeof profileApi.spec === "object"
      ? (profileApi.spec as Record<string, unknown>)
      : {};
  const compactPrompt = resolveCompactPrompt(spec);
  const { doItems, avoidItems } = extractDoAvoid(spec);
  const palette = extractPalette(spec);

  const now = new Date().toISOString();
  const nextRevision = toInteger(shotRow.guideBundleRevision) + 1;
  const metadata = {
    version: 1,
    source: {
      engine: "style-profile",
      profileId: resolvedProfileId,
      profileVersion: profileApi.version,
    },
    style: {
      compactPrompt,
      palette,
      doItems,
      avoidItems,
      toolSettings: spec.toolSettings ?? {},
    },
    resolvedProfileId,
  };

  const guideBundle = await createDocument(C.guideBundles, ID.unique(), {
    shotId: input.shotId,
    userId,
    revision: nextRevision,
    files: "{}",
    metadata: JSON.stringify(metadata),
    maskFileId: null,
    layerId: null,
    sourceFileId: null,
    repairType: null,
    createdAt: now,
    updatedAt: now,
  });

  const guideBundleId = String(guideBundle.id ?? guideBundle.$id ?? "");
  const updatedShot = await updateDocument(C.shots, String(shotRow.id), {
    guideBundleRevision: nextRevision,
    latestGuideBundleId: guideBundleId,
    styleProfileId: resolvedProfileId,
    styleProfileRevision: profileApi.version,
    updatedAt: now,
  });

  return {
    guideBundle: {
      id: guideBundleId,
      revision: nextRevision,
      shotId: input.shotId,
      metadata,
    },
    shot: updatedShot,
  };
}
