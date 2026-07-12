/**
 * Runtime-aware style guide load (local draft vs scriptony-style-guide).
 */

import type { StyleGuideData } from "@/lib/api/style-guide-api";
import { cloudGetStyleGuide } from "@/lib/api/style-guide-cloud-http";
import {
  canUseCloudStyleGuide,
  createEmptyStyleGuideDraft,
  localStyleGuideUnavailableHint,
} from "@/lib/style-guide-local-draft";
import { dispatchByRuntime, isLocalProfile } from "./runtime-dispatch";

async function localGetStyleGuide(projectId: string): Promise<StyleGuideData> {
  if (await canUseCloudStyleGuide()) {
    try {
      return await cloudGetStyleGuide(projectId);
    } catch {
      // fall through to draft
    }
  }
  return createEmptyStyleGuideDraft(projectId);
}

export function getStyleGuide(projectId: string): Promise<StyleGuideData> {
  return dispatchByRuntime(
    () => cloudGetStyleGuide(projectId),
    () => localGetStyleGuide(projectId),
  );
}

export function getStyleGuideUnavailableHint(): string {
  if (!isLocalProfile()) {
    return "Style Guide konnte nicht geladen werden.";
  }
  return localStyleGuideUnavailableHint();
}
