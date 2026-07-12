/**
 * MVE Enhance Script — JSON extract + guardrails.
 * Location: src/lib/mve/enhance-script-guardrails.ts
 */

import type { MveEnhanceScriptResult } from "@/lib/multi-voice-engine/schema/enhance-script";

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenceMatch ? fenceMatch[1] : trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Kein JSON in der KI-Antwort gefunden.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export function collectSpeakerLabels(rawText: string): string[] {
  const labels = new Set<string>();
  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();
    const colonMatch = trimmed.match(/^([A-ZÄÖÜ][A-ZÄÖÜ0-9_\-\s]{0,48}):\s+/);
    if (colonMatch) {
      const label = colonMatch[1].trim();
      if (label === label.toUpperCase()) labels.add(label);
      continue;
    }
    const parenMatch = trimmed.match(/^\(([A-ZÄÖÜ][^)]+)\)\s+/);
    if (parenMatch) labels.add(parenMatch[1].trim());
  }
  return [...labels];
}

export function collectNumericTokens(rawText: string): string[] {
  const tokens = new Set<string>();
  for (const match of rawText.matchAll(/\b\d+(?:[.,]\d+)?\b/g)) {
    tokens.add(match[0]);
  }
  return [...tokens];
}

export function applyEnhanceGuardrails(
  rawText: string,
  result: MveEnhanceScriptResult,
): string[] {
  const warnings: string[] = [];
  const outputNames = new Set(
    result.characters.map((c) => c.name.trim().toLowerCase()),
  );
  for (const label of collectSpeakerLabels(rawText)) {
    if (!outputNames.has(label.toLowerCase())) {
      warnings.push(`Sprecher „${label}" fehlt in der Ausgabe.`);
    }
  }
  const combinedLineText = result.lines.map((l) => l.text).join("\n");
  for (const num of collectNumericTokens(rawText)) {
    if (!combinedLineText.includes(num)) {
      warnings.push(`Zahl „${num}" aus dem Rohtext fehlt in den Dialogzeilen.`);
    }
  }
  return warnings;
}
