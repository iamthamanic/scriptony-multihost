/**
 * Capability registry — which features need cloud session, local project, or sync.
 * Location: src/capabilities/registry.ts
 *
 * OCP: new features add one entry here; gates use requireCapability / getCapabilityKind.
 */

import {
  DomainAccessError,
  hasOpenLocalProject,
} from "@/lib/api-adapter/domain-access";
import {
  canUseCloudFeatures,
  isLocalProfile,
} from "@/lib/api-adapter/runtime-dispatch";
import { canUseCloudSession } from "@/lib/auth/cloud-session";
import { isDesktopShell } from "@/runtime/detect-runtime";

/** How a feature accesses data or cloud services. */
export type CapabilityKind =
  | "LOCAL_ALWAYS"
  | "LOCAL_WHEN_PROJECT_OPEN"
  | "CLOUD_SESSION"
  | "CLOUD_SYNC_PROJECT"
  | "LOCAL_ONLY";

export type CapabilityId =
  | "domain.crud.characters"
  | "domain.crud.beats"
  | "domain.crud.timeline_structure"
  | "domain.crud.audio_clips"
  | "domain.crud.shots"
  | "domain.crud.worldbuilding"
  | "domain.crud.projects_workspace"
  | "hybrid.ai_assistant"
  | "hybrid.tts"
  | "hybrid.style_guide_read"
  | "hybrid.style_guide_write"
  | "sync.project_cloud"
  | "feature.stage"
  | "feature.creative_gym";

export interface CapabilityEntry {
  id: CapabilityId;
  kind: CapabilityKind;
  label: string;
}

export const CAPABILITY_REGISTRY: readonly CapabilityEntry[] = [
  {
    id: "domain.crud.characters",
    kind: "LOCAL_WHEN_PROJECT_OPEN",
    label: "Projekt-Figuren (Timeline)",
  },
  {
    id: "domain.crud.beats",
    kind: "LOCAL_WHEN_PROJECT_OPEN",
    label: "Story Beats",
  },
  {
    id: "domain.crud.timeline_structure",
    kind: "LOCAL_WHEN_PROJECT_OPEN",
    label: "Timeline-Struktur",
  },
  {
    id: "domain.crud.audio_clips",
    kind: "LOCAL_WHEN_PROJECT_OPEN",
    label: "Audio-Clips",
  },
  {
    id: "domain.crud.shots",
    kind: "LOCAL_WHEN_PROJECT_OPEN",
    label: "Shots",
  },
  {
    id: "domain.crud.worldbuilding",
    kind: "LOCAL_WHEN_PROJECT_OPEN",
    label: "Worldbuilding",
  },
  {
    id: "domain.crud.projects_workspace",
    kind: "LOCAL_WHEN_PROJECT_OPEN",
    label: "Projekte (Workspace)",
  },
  {
    id: "hybrid.ai_assistant",
    kind: "CLOUD_SESSION",
    label: "KI Assistant",
  },
  { id: "hybrid.tts", kind: "CLOUD_SESSION", label: "TTS" },
  {
    id: "hybrid.style_guide_read",
    kind: "CLOUD_SESSION",
    label: "Style Guide (Cloud lesen)",
  },
  {
    id: "hybrid.style_guide_write",
    kind: "CLOUD_SESSION",
    label: "Style Guide (Upload/Jobs)",
  },
  {
    id: "sync.project_cloud",
    kind: "CLOUD_SYNC_PROJECT",
    label: "Cloud Sync pro Projekt",
  },
  { id: "feature.stage", kind: "LOCAL_ONLY", label: "Stage / Blender" },
  {
    id: "feature.creative_gym",
    kind: "CLOUD_SESSION",
    label:
      "Creative Gym (Fortschritt lokal; Cloud-Upload wenn Session — API folgt)",
  },
] as const;

const BY_ID = new Map<CapabilityId, CapabilityEntry>(
  CAPABILITY_REGISTRY.map((e) => [e.id, e]),
);

export function getCapabilityEntry(id: CapabilityId): CapabilityEntry {
  const entry = BY_ID.get(id);
  if (!entry) throw new Error(`Unknown capability: ${id}`);
  return entry;
}

export function getCapabilityKind(id: CapabilityId): CapabilityKind {
  return getCapabilityEntry(id).kind;
}

/** All domain CRUD capabilities must stay local-when-project-open on desktop. */
export function listDomainCrudCapabilities(): CapabilityEntry[] {
  return CAPABILITY_REGISTRY.filter((e) => e.id.startsWith("domain.crud."));
}

export class CapabilityDeniedError extends Error {
  readonly code = "CAPABILITY_DENIED" as const;

  constructor(
    public readonly capabilityId: CapabilityId,
    message: string,
  ) {
    super(message);
    this.name = "CapabilityDeniedError";
  }
}

/**
 * Throws if the capability is not satisfied in the current runtime/session.
 * Domain CRUD on desktop with open project does not require cloud session.
 */
export async function requireCapability(id: CapabilityId): Promise<void> {
  const kind = getCapabilityKind(id);

  switch (kind) {
    case "LOCAL_ALWAYS":
    case "LOCAL_ONLY":
      return;
    case "LOCAL_WHEN_PROJECT_OPEN":
      if (isLocalProfile() && isDesktopShell() && !hasOpenLocalProject()) {
        throw new CapabilityDeniedError(
          id,
          "Öffne zuerst ein lokales .scriptony-Projekt.",
        );
      }
      return;
    case "CLOUD_SESSION":
      if (!(await canUseCloudSession())) {
        throw new DomainAccessError();
      }
      return;
    case "CLOUD_SYNC_PROJECT":
      if (!(await canUseCloudSession())) {
        throw new DomainAccessError();
      }
      if (!canUseCloudFeatures()) {
        throw new CapabilityDeniedError(
          id,
          "Cloud Sync benötigt Appwrite-Konfiguration in .env.local.",
        );
      }
      return;
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unhandled capability kind: ${String(_exhaustive)}`);
    }
  }
}

export function isHybridCapability(id: CapabilityId): boolean {
  return id.startsWith("hybrid.");
}
