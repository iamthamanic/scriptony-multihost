/**
 * Hook: style analysis with cloud fallback (Step 5 / T91).
 * Location: src/hooks/useStyleProfileAnalysis.ts
 */

import { useCallback, useMemo, useState } from "react";
import type { StyleProfileSpec } from "@/lib/types/style-profile";
import {
  analyzeStyleProfile,
  type StyleAnalysisScores,
} from "@/lib/style-profile/analyze-style";
import {
  analyzeStyleProfileWithFallback,
  type StyleAssetCheck,
} from "@/lib/style-profile/analyze-style-remote";
import { toast } from "sonner";

export function useStyleProfileAnalysis(
  spec: StyleProfileSpec | undefined,
  profileId?: string,
) {
  const [remoteScores, setRemoteScores] = useState<StyleAnalysisScores | null>(
    null,
  );
  const [assetChecks, setAssetChecks] = useState<StyleAssetCheck[] | null>(
    null,
  );
  const [analyzing, setAnalyzing] = useState(false);

  const localScores = useMemo<StyleAnalysisScores | null>(() => {
    if (!spec) return null;
    return analyzeStyleProfile(spec);
  }, [spec]);

  const scores = remoteScores ?? localScores;

  const analyze = useCallback(async () => {
    if (!spec) return;
    setAnalyzing(true);
    try {
      const result = await analyzeStyleProfileWithFallback({
        spec,
        profileId,
      });
      setRemoteScores(result.scores);
      setAssetChecks(result.assetChecks ?? null);
      toast.success("Style-Analyse aktualisiert");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Style-Analyse fehlgeschlagen",
      );
    } finally {
      setAnalyzing(false);
    }
  }, [spec, profileId]);

  return {
    scores,
    assetChecks,
    analyzing,
    analyzed: scores != null,
    analyze,
  };
}
