/**
 * Validation tab: asset grid + consistency scores (T82 / Step 5).
 * Location: src/components/projects/styles/tabs/StyleProfileValidationTab.tsx
 */

import type { StyleProfile, StyleProfileSpec } from "@/lib/types/style-profile";
import type { StyleAnalysisScores } from "@/lib/style-profile/analyze-style";
import type { StyleAssetCheck } from "@/lib/style-profile/analyze-style-remote";
import { ValidationAssetGrid } from "../validation/ValidationAssetGrid";
import { StyleScoreBreakdown } from "../validation/StyleScoreBreakdown";
import { StyleStrengthGauge } from "../StyleStrengthGauge";
import { readValidationAssetRefs } from "@/lib/style-profile/validation-assets";

interface StyleProfileValidationTabProps {
  profile: StyleProfile;
  profileId: string;
  scores: StyleAnalysisScores | null;
  assetChecks?: StyleAssetCheck[] | null;
  analyzing?: boolean;
  analyzed?: boolean;
  onAnalyze?: () => void;
  readOnly?: boolean;
  onSpecChange?: (spec: StyleProfileSpec) => void;
}

export function StyleProfileValidationTab({
  profile,
  profileId,
  scores,
  assetChecks,
  analyzing,
  analyzed,
  onAnalyze,
  readOnly,
  onSpecChange,
}: StyleProfileValidationTabProps) {
  const assetRefs = readValidationAssetRefs(profile.spec);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <StyleStrengthGauge
        score={scores?.overall}
        analyzed={analyzed}
        analyzing={analyzing}
        onAnalyze={onAnalyze}
      />
      <div className="space-y-6">
        {scores && (
          <StyleScoreBreakdown scores={scores} assetChecks={assetChecks} />
        )}
        <ValidationAssetGrid
          profileId={profileId}
          filledRefs={assetRefs}
          assetChecks={assetChecks ?? undefined}
          readOnly={readOnly}
          onUploaded={(refs) => {
            onSpecChange?.({
              ...profile.spec,
              visualSpec: {
                ...profile.spec.visualSpec,
                validationAssets: {
                  ...profile.spec.visualSpec.validationAssets,
                  exampleRefs: refs,
                  machineParams: {
                    ...profile.spec.visualSpec.validationAssets.machineParams,
                    assetRefs: refs,
                  },
                },
              },
            });
          }}
        />
      </div>
    </div>
  );
}
