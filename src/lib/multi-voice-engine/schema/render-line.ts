/**
 * MVE render line input/output (PRD §12.7).
 * Location: src/lib/multi-voice-engine/schema/render-line.ts
 */

import { z } from "zod";
import { MveIdSchema } from "./enums";
import { MveLineDirectionSchema } from "./line-direction";
import { MveVoiceProfileSchema } from "./voice-profile";
import { MveVoiceRenderSettingsSchema } from "./voice-profile";

export const VoiceRenderSettingsSchema = MveVoiceRenderSettingsSchema.extend({
  variationStrength: z.number().min(0).max(1).optional(),
  seed: z.number().int().optional(),
});
export type VoiceRenderSettings = z.infer<typeof VoiceRenderSettingsSchema>;

export const RenderLineInputSchema = z.object({
  lineId: MveIdSchema,
  text: z.string().min(1).max(20_000),
  language: z.string().min(2).max(16),
  voice: MveVoiceProfileSchema,
  direction: MveLineDirectionSchema.optional(),
  takeIndex: z.number().int().min(0).max(10),
  renderSettings: VoiceRenderSettingsSchema.optional(),
  /** Local desktop: sidecar boot + asset paths */
  projectDir: z.string().min(1).optional(),
});
export type RenderLineInput = z.infer<typeof RenderLineInputSchema>;

export const RenderLineOutputSchema = z.object({
  audioUrl: z.string().min(1),
  durationMs: z.number().int().min(0).optional(),
  warnings: z.array(z.string()).optional(),
});
export type RenderLineOutput = z.infer<typeof RenderLineOutputSchema>;
