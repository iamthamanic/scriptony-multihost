/**
 * MVE VoiceConsent schema (PRD §8.4, §20).
 * Location: src/lib/multi-voice-engine/schema/voice-consent.ts
 */

import { z } from "zod";
import { MveIdSchema } from "./enums";

export const MveVoiceConsentRecordStatusSchema = z.enum([
  "verified",
  "rejected",
  "blocked",
]);
export type MveVoiceConsentRecordStatus = z.output<
  typeof MveVoiceConsentRecordStatusSchema
>;

export const MveSourceAudioHashSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, "Expected SHA-256 hex digest");

export const MveVoiceConsentSchema = z.object({
  id: MveIdSchema,
  projectId: MveIdSchema,
  voiceId: MveIdSchema,
  userId: MveIdSchema,
  consentTextVersion: z.string().min(1).max(32),
  consentConfirmedAt: z.string().datetime(),
  sourceAudioHash: MveSourceAudioHashSchema.optional(),
  commercialUseAllowed: z.boolean().default(false),
  status: MveVoiceConsentRecordStatusSchema.default("verified"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MveVoiceConsent = z.output<typeof MveVoiceConsentSchema>;

/** Latest verified consent wins when multiple records exist for one voice. */
export function pickLatestVerifiedVoiceConsent(
  consents: readonly MveVoiceConsent[],
): MveVoiceConsent | null {
  const verified = consents
    .filter((c) => c.status === "verified")
    .sort(
      (a, b) =>
        Date.parse(b.consentConfirmedAt) - Date.parse(a.consentConfirmedAt),
    );
  return verified[0] ?? null;
}
