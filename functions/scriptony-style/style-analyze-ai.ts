/**
 * Optional LLM style score overlay (T89 KISS).
 * Location: functions/scriptony-style/style-analyze-ai.ts
 */

import { chat } from "../_shared/ai-service/services/text";
import type { StyleAnalysisScores } from "../_shared/style-analyze";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function parseScoreFromText(text: string): number | null {
  const match = text.match(/(?:score|overall)[^\d]*(\d{1,3})\s*%?/i);
  if (!match) {
    const bare = text.match(/\b(\d{1,3})\b/);
    if (!bare) return null;
    const n = Number(bare[1]);
    return Number.isFinite(n) ? clamp01(n > 1 ? n / 100 : n) : null;
  }
  const n = Number(match[1]);
  return Number.isFinite(n) ? clamp01(n > 1 ? n / 100 : n) : null;
}

/** Blend heuristic scores with optional LLM overall estimate. */
export async function enhanceStyleAnalysisWithAi(
  userId: string,
  spec: Record<string, unknown>,
  base: StyleAnalysisScores,
): Promise<StyleAnalysisScores> {
  const vs = (spec.visualSpec ?? {}) as Record<string, unknown>;
  const dna = (vs.styleDna ?? {}) as Record<string, unknown>;
  const summary =
    (typeof dna.summary === "string" && dna.summary.trim()) ||
    (typeof (spec as { compactPrompt?: string }).compactPrompt === "string"
      ? String((spec as { compactPrompt?: string }).compactPrompt)
      : "");

  const prompt = [
    "Rate visual style guide completeness for animation production.",
    "Return one line: SCORE: NN% (0-100).",
    `Sections configured: ${base.configuredSections}/${base.totalSections}.`,
    summary ? `Style summary: ${summary.slice(0, 1200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await chat(
      userId,
      [{ role: "user", content: prompt }],
      "assistant_chat",
      {
        systemPrompt:
          "You are a visual style guide reviewer. Reply with SCORE: NN% only.",
        maxTokens: 64,
        temperature: 0.2,
      },
    );
    const aiOverall = parseScoreFromText(response.content ?? "");
    if (aiOverall == null) return base;

    const blendedOverall = clamp01(base.overall * 0.55 + aiOverall * 0.45);
    return {
      ...base,
      overall: blendedOverall,
    };
  } catch (error) {
    console.warn("[style-analyze-ai] fallback to heuristic:", error);
    return base;
  }
}
