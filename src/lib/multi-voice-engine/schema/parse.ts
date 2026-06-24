/**
 * MVE schema parse helpers — structured errors for DE UI.
 * Location: src/lib/multi-voice-engine/schema/parse.ts
 */

import type { ZodError, ZodTypeAny, z } from "zod";
import type { MveCharacter } from "./character";
import { MveCharacterSchema } from "./character";
import type { MveLine } from "./line";
import { MveLineSchema } from "./line";
import type { MveScene } from "./scene";
import { MveSceneSchema } from "./scene";
import type { MveVoiceProfile } from "./voice-profile";
import { MveVoiceProfileSchema } from "./voice-profile";

export type MveParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: ZodError; messages: string[] };

function toMessages(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
}

function parseWith<S extends ZodTypeAny>(
  schema: S,
  input: unknown,
): MveParseResult<z.output<S>> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error,
    messages: toMessages(result.error),
  };
}

export function parseMveScene(input: unknown): MveParseResult<MveScene> {
  return parseWith(MveSceneSchema, input);
}

export function parseMveCharacter(
  input: unknown,
): MveParseResult<MveCharacter> {
  return parseWith(MveCharacterSchema, input);
}

export function parseMveLine(input: unknown): MveParseResult<MveLine> {
  return parseWith(MveLineSchema, input);
}

export function parseMveVoiceProfile(
  input: unknown,
): MveParseResult<MveVoiceProfile> {
  return parseWith(MveVoiceProfileSchema, input);
}
