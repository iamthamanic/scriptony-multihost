/**
 * React hook — MVE Enhance Script (cloud LLM + local apply).
 * Location: src/hooks/useMveEnhanceScript.ts
 */

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { enhanceMveScriptWithRuntime } from "@/lib/api-adapter/audio-story-enhance-adapter";
import { applyEnhanceScriptResult } from "@/lib/mve/apply-enhance-script";
import { getCharacters } from "@/lib/api-adapter/characters-adapter";
import type { MveEnhanceScriptResult } from "@/lib/multi-voice-engine/schema/enhance-script";
import { queryKeys } from "@/lib/react-query";

export function useMveEnhanceScript(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<MveEnhanceScriptResult | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const enhance = useCallback(async () => {
    const text = rawText.trim();
    if (!projectId || !text) return;
    setIsEnhancing(true);
    setPreview(null);
    try {
      const existing = await getCharacters(projectId);
      const result = await enhanceMveScriptWithRuntime({
        projectId,
        rawText: text,
        existingCharacterNames: existing.map((c) => c.name),
        uiLanguage: "de",
      });
      setPreview(result);
      if (result.warnings?.length) {
        toast.warning(
          `${result.warnings.length} Hinweis(e) — bitte Vorschau prüfen.`,
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Enhance Script fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setIsEnhancing(false);
    }
  }, [projectId, rawText]);

  const apply = useCallback(
    async (sceneId: string) => {
      if (!projectId || !preview) return;
      setIsApplying(true);
      try {
        const existing = await getCharacters(projectId);
        const stats = await applyEnhanceScriptResult({
          projectId,
          sceneId,
          result: preview,
          existingCharacters: existing,
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.mve.linesByProject(projectId),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.audio.charactersByProject(projectId),
        });
        toast.success(
          `${stats.linesCreated} Zeile(n) übernommen${stats.charactersCreated > 0 ? `, ${stats.charactersCreated} neue Figur(en)` : ""}.`,
        );
        setPreview(null);
        setRawText("");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Übernehmen fehlgeschlagen.";
        toast.error(msg);
      } finally {
        setIsApplying(false);
      }
    },
    [projectId, preview, queryClient],
  );

  const reset = useCallback(() => {
    setPreview(null);
  }, []);

  return {
    rawText,
    setRawText,
    preview,
    isEnhancing,
    isApplying,
    enhance,
    apply,
    reset,
    canEnhance: Boolean(projectId && rawText.trim().length > 0),
  };
}

export type UseMveEnhanceScriptResult = ReturnType<typeof useMveEnhanceScript>;
