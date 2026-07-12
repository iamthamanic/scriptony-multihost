/**
 * TTS-Schemas — Zod-Validierung für TTS-Routen.
 *
 * T31: TTS-Pipeline und Audio-Generierung.
 */

import { z } from "zod";

const uuidSchema = z.string().uuid();
// Appwrite Document IDs: alphanumerisch, 7-36 Zeichen (ID.unique())
const appwriteIdSchema = z.string().min(7).max(64);

export const TtsGenerateSchema = z
  .object({
    trackId: uuidSchema,
    text: z.string().min(1).max(10000),
    voiceId: z.string().min(1),
    clipId: uuidSchema,
    emotion: z.string().optional(),
    speed: z.number().min(0.25).max(4.0).optional(),
    stability: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
  })
  .strict();

export const TtsCallbackSuccessSchema = z
  .object({
    callbackSignature: z.string().min(1),
    jobId: appwriteIdSchema,
    trackId: uuidSchema,
    clipId: uuidSchema,
    audioFileId: z.string().min(1),
    durationSec: z.number(),
    waveformData: z
      .array(z.number().min(0).max(1))
      .max(200)
      .nullable()
      .optional(),
    success: z.literal(true),
  })
  .strict();

export const TtsCallbackFailureSchema = z
  .object({
    callbackSignature: z.string().min(1),
    jobId: appwriteIdSchema,
    trackId: uuidSchema,
    clipId: uuidSchema,
    success: z.literal(false),
    error: z.string().optional(),
  })
  .strict();

export const TtsCallbackSchema = z.discriminatedUnion("success", [
  TtsCallbackSuccessSchema,
  TtsCallbackFailureSchema,
]);
