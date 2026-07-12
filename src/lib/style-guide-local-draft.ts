/**
 * Local Style Guide draft when cloud API / JWT is unavailable (T57 hybrid).
 *
 * Location: src/lib/style-guide-local-draft.ts
 */

import type { StyleGuideData } from "./api/style-guide-api";
import {
  canUseCloudFeatures,
  isLocalProfile,
} from "./api-adapter/runtime-dispatch";
import { requireCapability } from "@/capabilities/registry";

export function createEmptyStyleGuideDraft(projectId: string): StyleGuideData {
  return {
    id: `local-draft-${projectId}`,
    projectId,
    title: "Style Guide",
    styleSummary: "",
    toneSummary: "",
    keywords: [],
    negativeKeywords: [],
    mustHave: [],
    avoid: [],
    palettePrimary: [],
    paletteSecondary: [],
    paletteAccent: [],
    paletteBackground: [],
    typographyNotes: "",
    compactPrompt: "",
    exportPayload: {},
    status: "draft",
    items: [],
  };
}

/** Cloud style-guide function needs Appwrite config + user JWT. */
export async function canUseCloudStyleGuide(): Promise<boolean> {
  if (!isLocalProfile()) return true;
  if (!canUseCloudFeatures()) return false;
  try {
    await requireCapability("hybrid.style_guide_read");
    return true;
  } catch {
    return false;
  }
}

export function localStyleGuideUnavailableHint(): string {
  if (!canUseCloudFeatures()) {
    return "Style Guide (Cloud) ist offline: Appwrite in .env.local konfigurieren oder Modus wechseln.";
  }
  return "Style Guide (Cloud) benötigt Cloud-Anmeldung in der Kopfleiste. Lokal wird ein Entwurf angezeigt.";
}
