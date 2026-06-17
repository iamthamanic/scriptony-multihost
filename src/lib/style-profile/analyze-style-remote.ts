/**
 * Remote style analysis with local heuristic fallback (Step 5 / T91).
 * Location: src/lib/style-profile/analyze-style-remote.ts
 */

import { usesCloudHttpForDomain } from "@/lib/api-adapter/domain-access";
import { cloudAnalyzeStyleProfile } from "@/lib/api/style-profile-cloud-http";
import { isHybridStyleProfilePushAvailable } from "./hybrid-cloud-push";
import { analyzeStyleProfile, type StyleAnalysisScores } from "./analyze-style";
import { readValidationAssetRefs } from "./validation-assets";
import type { StyleProfileSpec } from "@/lib/types/style-profile";

export type StyleAssetCheckStatus = "ok" | "warn" | "fail" | "skipped";

export type StyleAssetCheck = {
  slotIndex: number;
  slotLabel: string;
  status: StyleAssetCheckStatus;
  message?: string;
};

export type StyleAnalysisRemoteResult = {
  scores: StyleAnalysisScores;
  assetChecks?: StyleAssetCheck[];
};

export async function analyzeStyleProfileWithFallback(input: {
  spec: StyleProfileSpec;
  profileId?: string;
}): Promise<StyleAnalysisRemoteResult> {
  const canUseCloud =
    usesCloudHttpForDomain() || (await isHybridStyleProfilePushAvailable());

  const filledRefs = readValidationAssetRefs(input.spec).filter((r) =>
    r?.trim(),
  );
  const mode =
    canUseCloud && filledRefs.length > 0
      ? ("vision" as const)
      : ("ai" as const);

  if (canUseCloud) {
    try {
      return await cloudAnalyzeStyleProfile({
        spec: input.spec,
        profileId: input.profileId,
        mode,
      });
    } catch (error) {
      console.warn(
        "[style-analyze] cloud failed, using local heuristic:",
        error,
      );
      if (mode === "vision") {
        try {
          return await cloudAnalyzeStyleProfile({
            spec: input.spec,
            profileId: input.profileId,
            mode: "ai",
          });
        } catch {
          /* fall through */
        }
      }
    }
  }

  return { scores: analyzeStyleProfile(input.spec) };
}
