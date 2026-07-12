/**
 * MVE shared Zod enums (PRD §8 MVP subset).
 * Location: src/lib/multi-voice-engine/schema/enums.ts
 */

import { z } from "zod";

/** Scriptony local IDs use `prefix_uuid` — not strict RFC UUID. */
export const MveIdSchema = z.string().min(1).max(128);

export const MveSceneStatusSchema = z.enum(["draft", "ready", "rendered"]);
export type MveSceneStatus = z.infer<typeof MveSceneStatusSchema>;

export const MveCharacterRoleTypeSchema = z.enum([
  "character",
  "narrator",
  "extra",
  "system",
]);
export type MveCharacterRoleType = z.infer<typeof MveCharacterRoleTypeSchema>;

export const MveLineTypeSchema = z.enum([
  "dialogue",
  "narration",
  "sfx",
  "music",
  "ambience",
  "pause",
]);
export type MveLineType = z.infer<typeof MveLineTypeSchema>;

export const MveLineStatusSchema = z.enum([
  "draft",
  "dirty",
  "ready",
  "rendered",
  "failed",
]);
export type MveLineStatus = z.infer<typeof MveLineStatusSchema>;

export const MveVoiceProfileTypeSchema = z.enum([
  "default",
  "generated",
  "cloned",
  "tuned",
  "licensed",
  "uploaded",
  "external_api",
]);
export type MveVoiceProfileType = z.infer<typeof MveVoiceProfileTypeSchema>;

export const MveVoiceProfileStatusSchema = z.enum([
  "draft",
  "processing",
  "ready",
  "failed",
  "blocked",
  "archived",
]);
export type MveVoiceProfileStatus = z.infer<typeof MveVoiceProfileStatusSchema>;

export const MveConsentStatusSchema = z.enum([
  "not_required",
  "pending",
  "verified",
  "rejected",
  "blocked",
]);
export type MveConsentStatus = z.infer<typeof MveConsentStatusSchema>;

export const MveEmotionSchema = z.enum([
  "neutral",
  "warm",
  "friendly",
  "confident",
  "calm",
  "serious",
  "tense",
  "fearful",
  "sad",
  "angry",
  "excited",
  "dramatic",
  "whispered",
  "controlled",
  "panic",
]);
export type MveEmotion = z.infer<typeof MveEmotionSchema>;

export const MvePaceSchema = z.enum([
  "x_slow",
  "slow",
  "medium",
  "fast",
  "x_fast",
]);
export type MvePace = z.infer<typeof MvePaceSchema>;

export const MveVolumeSchema = z.enum(["whisper", "quiet", "medium", "loud"]);
export type MveVolume = z.infer<typeof MveVolumeSchema>;

export const MveEnergySchema = z.enum([
  "very_low",
  "low",
  "medium",
  "high",
  "very_high",
]);
export type MveEnergy = z.infer<typeof MveEnergySchema>;

export const MveEmphasisSchema = z.enum(["none", "light", "medium", "strong"]);
export type MveEmphasis = z.infer<typeof MveEmphasisSchema>;

export const MveAudioJobStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type MveAudioJobStatus = z.infer<typeof MveAudioJobStatusSchema>;

export const MveTakeStatusSchema = z.enum(["processing", "ready", "failed"]);
export type MveTakeStatus = z.infer<typeof MveTakeStatusSchema>;
