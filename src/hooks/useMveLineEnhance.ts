/**
 * React hook — per-line MVE text enhancement for the inline text-block editor (T27).
 * Location: src/hooks/useMveLineEnhance.ts
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { enhanceMveScriptWithRuntime } from "@/lib/api-adapter/audio-story-enhance-adapter";
import { getCharacters } from "@/lib/api-adapter/characters-adapter";
import { queryKeys } from "@/lib/react-query";
import type { MveEnhanceLineDraft } from "@/lib/multi-voice-engine/schema/enhance-script";

export function useMveLineEnhance(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const enhance = useCallback(
    async (rawText: string): Promise<MveEnhanceLineDraft[] | null> => {
      if (!projectId || !rawText.trim()) return null;
      try {
        const existing = await getCharacters(projectId);
        const result = await enhanceMveScriptWithRuntime({
          projectId,
          rawText: rawText.trim(),
          existingCharacterNames: existing.map((c) => c.name),
          uiLanguage: "de",
        });
        if (result.warnings?.length) {
          toast.warning(
            `${result.warnings.length} Hinweis(e) — bitte Vorschau prüfen.`,
          );
        }
        return result.lines.slice(0, 3);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Enhance fehlgeschlagen.";
        toast.error(msg);
        return null;
      } finally {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.mve.linesByProject(projectId),
        });
      }
    },
    [projectId, queryClient],
  );

  return { enhance };
}

export type UseMveLineEnhanceResult = ReturnType<typeof useMveLineEnhance>;
