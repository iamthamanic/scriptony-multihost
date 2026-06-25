/**
 * MVE Enhance Script — LLM orchestration (PRD §6.6).
 * Location: functions/_shared/mve-enhance-script-service.ts
 *
 * Canonical schema/guardrails live in src/lib (bundled at build time; same pattern as scriptony-gym).
 */

import { chat } from "./ai-service/services/text";
import {
  MveEnhanceScriptRequestSchema,
  MveEnhanceScriptResultSchema,
  type MveEnhanceScriptRequest,
  type MveEnhanceScriptResult,
} from "../../src/lib/multi-voice-engine/schema/enhance-script";
import {
  applyEnhanceGuardrails,
  extractJsonObject,
} from "../../src/lib/mve/enhance-script-guardrails";
import { badEnhanceRequest } from "./mve-enhance-script-errors";

const PROMPT_VERSION = "mve-enhance-script-v1";

function buildSystemPrompt(uiLanguage?: "de" | "en"): string {
  const lang =
    uiLanguage === "en"
      ? "Respond with JSON only. Character names and dialogue stay in the source language."
      : "Antworte nur mit JSON. Namen und Dialoge bleiben in der Sprache des Rohtexts.";
  return [
    "You are a voice-script structuring assistant for audio drama production.",
    PROMPT_VERSION,
    lang,
    "Task: Convert raw script text with speaker labels into structured characters and lines.",
    "Rules:",
    "- Do NOT invent plot, facts, names, or numbers.",
    "- Do NOT change proper names or numeric values from the source.",
    "- Recognize narrator vs dialogue; use roleType narrator for narration voice.",
    "- Segment dialogue; suggest mild direction (emotion, pace, pauseBeforeMs) only when justified.",
    "- Output strict JSON matching this shape:",
    '{"characters":[{"tempId":"char_1","name":"…","roleType":"character|narrator|extra|system","description":"…"}],"lines":[{"orderIndex":0,"type":"dialogue|narration|pause","characterTempId":"char_1","text":"…","direction":{"emotion":"neutral","pace":"medium"}}]}',
    "tempId must be stable char_1, char_2, … referenced by lines.",
    "orderIndex is 0-based in speech order.",
    "No markdown fences in the response.",
  ].join("\n");
}

function buildUserPrompt(input: MveEnhanceScriptRequest): string {
  const known =
    input.existingCharacterNames?.filter(Boolean).slice(0, 32) ?? [];
  const knownBlock =
    known.length > 0
      ? `\n\nBekannte Figuren im Projekt (Namen beibehalten): ${known.join(", ")}`
      : "";
  return `Rohtext:\n"""${input.rawText}"""${knownBlock}`;
}

async function callEnhanceLlm(
  userId: string,
  input: MveEnhanceScriptRequest,
): Promise<MveEnhanceScriptResult> {
  const response = await chat(
    userId,
    [{ role: "user", content: buildUserPrompt(input) }],
    "assistant_chat",
    {
      temperature: 0.2,
      systemPrompt: buildSystemPrompt(input.uiLanguage),
    },
  );
  const parsed = extractJsonObject(response.content);
  const validated = MveEnhanceScriptResultSchema.safeParse(parsed);
  if (!validated.success) {
    const issue = validated.error.issues[0];
    throw badEnhanceRequest(
      issue
        ? `KI-Ausgabe ungültig: ${issue.path.join(".")} — ${issue.message}`
        : "KI-Ausgabe entspricht nicht dem Schema.",
    );
  }
  return validated.data;
}

export async function runMveEnhanceScript(
  userId: string,
  body: unknown,
): Promise<MveEnhanceScriptResult & { promptVersion: string }> {
  const parsedReq = MveEnhanceScriptRequestSchema.safeParse(body);
  if (!parsedReq.success) {
    const issue = parsedReq.error.issues[0];
    throw badEnhanceRequest(
      issue
        ? `Ungültige Anfrage: ${issue.path.join(".")} — ${issue.message}`
        : "Ungültige Anfrage.",
    );
  }
  const input = parsedReq.data;

  let result: MveEnhanceScriptResult;
  try {
    result = await callEnhanceLlm(userId, input);
  } catch (firstErr) {
    try {
      result = await callEnhanceLlm(userId, input);
    } catch {
      throw firstErr instanceof Error
        ? firstErr
        : badEnhanceRequest("Enhance Script fehlgeschlagen.");
    }
  }

  const guardWarnings = applyEnhanceGuardrails(input.rawText, result);
  const warnings = [...(result.warnings ?? []), ...guardWarnings];

  return {
    ...result,
    warnings: warnings.length > 0 ? warnings : undefined,
    promptVersion: PROMPT_VERSION,
  };
}
