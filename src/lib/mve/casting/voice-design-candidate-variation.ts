/**
 * Per-candidate variation for Voicebox designed profiles (A/B/C + retries).
 * Location: src/lib/mve/casting/voice-design-candidate-variation.ts
 */

import { VOICE_DESIGN_DESCRIPTION_MAX_LENGTH } from "./voice-design-field-help";

const CANDIDATE_VARIATIONS = [
  "Candidate variant A: balanced baseline — natural, clear interpretation of the description.",
  "Candidate variant B: distinctly deeper pitch, warmer resonance, slightly more relaxed delivery.",
  "Candidate variant C: brighter timbre, lighter vocal weight, a touch more energy and forward presence.",
] as const;

const RETRY_VARIATION_HINT =
  "Alternate voice identity: clearly different from previous attempts — new pitch, timbre, and color.";

function variationSuffix(
  candidateIndex: number,
  variationAttempt: number,
): string {
  const variantSlot =
    (candidateIndex + variationAttempt) % CANDIDATE_VARIATIONS.length;
  const variation =
    CANDIDATE_VARIATIONS[variantSlot] ?? CANDIDATE_VARIATIONS[0];
  if (variationAttempt > 0) {
    return `\n\n${variation}\n${RETRY_VARIATION_HINT}`;
  }
  return `\n\n${variation}`;
}

/** Append English variation block so Voicebox produces distinct designed profiles. */
export function voiceDesignCandidatePrompt(
  basePrompt: string,
  candidateIndex: number,
  variationAttempt = 0,
): string {
  const base = basePrompt.trim();
  if (!base) return "";

  const suffix = variationSuffix(candidateIndex, variationAttempt);
  const combined = `${base}${suffix}`;
  if (combined.length <= VOICE_DESIGN_DESCRIPTION_MAX_LENGTH) {
    return combined;
  }

  const maxBaseLength = VOICE_DESIGN_DESCRIPTION_MAX_LENGTH - suffix.length;
  const trimmedBase = base.slice(0, Math.max(0, maxBaseLength)).trimEnd();
  if (!trimmedBase)
    return combined.slice(0, VOICE_DESIGN_DESCRIPTION_MAX_LENGTH);
  return `${trimmedBase}${suffix}`;
}

/** TTS seed spread — avoids near-identical playback across candidates. */
export function voiceDesignCandidateTtsSeed(
  candidateIndex: number,
  variationAttempt = 0,
): number {
  return 10_000 + candidateIndex * 19_873 + variationAttempt * 9_917;
}
