/**
 * React hook — persisted metronome settings per project (T31).
 * Location: src/hooks/useMetronomeSettings.ts
 */

import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_METRONOME_CONFIG,
  readMetronomeConfig,
  writeMetronomeConfig,
  type MetronomeConfig,
} from "@/lib/audio/metronome-config";

export function useMetronomeSettings(projectId: string | undefined) {
  const [config, setConfigState] = useState<MetronomeConfig>(() =>
    projectId ? readMetronomeConfig(projectId) : DEFAULT_METRONOME_CONFIG,
  );

  const setConfig = useCallback(
    (next: MetronomeConfig) => {
      setConfigState(next);
      if (projectId) writeMetronomeConfig(projectId, next);
    },
    [projectId],
  );

  const patchConfig = useCallback(
    (patch: Partial<MetronomeConfig>) => {
      setConfigState((prev) => {
        const next = { ...prev, ...patch };
        if (projectId) writeMetronomeConfig(projectId, next);
        return next;
      });
    },
    [projectId],
  );

  return useMemo(
    () => ({ config, setConfig, patchConfig }),
    [config, setConfig, patchConfig],
  );
}

export type UseMetronomeSettingsResult = ReturnType<
  typeof useMetronomeSettings
>;
