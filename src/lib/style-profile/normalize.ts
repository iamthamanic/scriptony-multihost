/**
 * Normalize StyleProfile rows and legacy cloud configs to domain shape.
 * Location: src/lib/style-profile/normalize.ts
 */

import type {
  StyleProfile,
  StyleProfileSpec,
  StyleProfileStatus,
  StyleProfileSummary,
  StyleProfileSyncMeta,
  StyleProfileType,
  StyleSectionState,
  VisualSpecSections,
} from "@/lib/types/style-profile";
import { VISUAL_SPEC_SECTION_KEYS } from "./section-registry";
import { createEmptyStyleProfileSpec } from "./templates";
import { legacyConfigToSummary } from "./summary";

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null || raw === "") return fallback;
  if (typeof raw === "object") return raw as T;
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mergeSection(
  base: StyleSectionState,
  patch?: Partial<StyleSectionState>,
): StyleSectionState {
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    machineParams: { ...base.machineParams, ...patch.machineParams },
  };
}

function mergeVisualSpec(
  partial?: Partial<VisualSpecSections>,
): VisualSpecSections {
  const empty = createEmptyStyleProfileSpec().visualSpec;
  if (!partial) return empty;
  const out = { ...empty };
  for (const key of VISUAL_SPEC_SECTION_KEYS) {
    out[key] = mergeSection(empty[key], partial[key]);
  }
  return out;
}

export function normalizeStyleProfileSpec(
  partial?: Partial<StyleProfileSpec> | null,
): StyleProfileSpec {
  const base = createEmptyStyleProfileSpec();
  if (!partial) return base;
  return {
    visualSpec: mergeVisualSpec(partial.visualSpec),
    toolSettings: { ...base.toolSettings, ...partial.toolSettings },
    validationConfig: {
      ...base.validationConfig,
      ...partial.validationConfig,
    },
    references: partial.references ?? base.references,
    metadata: { ...base.metadata, ...partial.metadata },
  };
}

export function normalizeStyleProfileFromParts(input: {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type?: StyleProfileType;
  status?: StyleProfileStatus;
  version?: number;
  previewImageId?: string | null;
  previewUrl?: string | null;
  specRef?: string | null;
  configSummary?: StyleProfileSummary | Record<string, unknown> | string | null;
  spec?: StyleProfileSpec | string | null;
  source?: StyleProfile["source"] | string | null;
  sync?: Partial<StyleProfileSyncMeta>;
  createdAt?: string;
  updatedAt?: string;
  isActiveForProject?: boolean;
  fullSpecEditing?: boolean;
}): StyleProfile {
  const now = new Date().toISOString();
  const parsedSummary =
    typeof input.configSummary === "string"
      ? parseJson(input.configSummary, null)
      : input.configSummary;
  const rawSummary =
    parsedSummary && typeof parsedSummary === "object"
      ? legacyConfigToSummary(parsedSummary as Record<string, unknown>)
      : {};
  const spec =
    input.spec == null
      ? normalizeStyleProfileSpec(undefined)
      : typeof input.spec === "string"
        ? normalizeStyleProfileSpec(parseJson(input.spec, undefined))
        : normalizeStyleProfileSpec(input.spec);

  const configSummary: StyleProfileSummary = {
    ...rawSummary,
    type: input.type ?? (rawSummary.type as StyleProfileType) ?? "custom",
    status:
      input.status ?? (rawSummary.status as StyleProfileStatus) ?? "draft",
  };

  return {
    id: input.id,
    projectId: input.projectId,
    name: input.name,
    description: input.description ?? "",
    type: input.type ?? configSummary.type ?? "custom",
    status: input.status ?? configSummary.status ?? "draft",
    version: input.version ?? 1,
    previewImageId: input.previewImageId ?? null,
    previewUrl: input.previewUrl ?? null,
    specRef: input.specRef ?? null,
    configSummary,
    spec,
    source:
      typeof input.source === "string"
        ? (parseJson(input.source, undefined) as StyleProfile["source"])
        : (input.source ?? configSummary.source),
    sync: {
      status: input.sync?.status ?? "local",
      cloudId: input.sync?.cloudId ?? null,
      lastSyncedAt: input.sync?.lastSyncedAt ?? null,
    },
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    isActiveForProject: input.isActiveForProject,
    fullSpecEditing: input.fullSpecEditing,
  };
}

/** Cloud API profile row (scriptony-style). */
export function normalizeCloudStyleProfile(
  row: {
    id: string;
    userId?: string;
    projectId?: string | null;
    name: string;
    previewImageId?: string | null;
    previewUrl?: string | null;
    version?: number;
    createdAt?: string;
    updatedAt?: string;
    config?: Record<string, unknown>;
    spec?: Record<string, unknown> | null;
    specRef?: string | null;
  },
  options?: { fullSpecEditing?: boolean; isActiveForProject?: boolean },
): StyleProfile {
  const config = row.config ?? {};
  const loadedSpec =
    row.spec != null && typeof row.spec === "object"
      ? normalizeStyleProfileSpec(row.spec as Partial<StyleProfileSpec>)
      : undefined;
  return normalizeStyleProfileFromParts({
    id: row.id,
    projectId: row.projectId ?? "",
    name: row.name,
    previewImageId: row.previewImageId,
    previewUrl: row.previewUrl,
    version: row.version,
    specRef: row.specRef ?? null,
    configSummary: legacyConfigToSummary(config),
    spec: loadedSpec,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    fullSpecEditing: options?.fullSpecEditing ?? true,
    isActiveForProject: options?.isActiveForProject,
    sync: { status: "synced", cloudId: row.id },
  });
}
