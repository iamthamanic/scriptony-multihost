/**
 * POST /voices/clone — MVE voice clone request (cloud hybrid, MVP stub).
 * Location: functions/scriptony-audio-story/routes/voices-clone.ts
 *
 * Mirrors src/lib/multi-voice-engine/schema/voice-operations MveCloneVoiceInputSchema.
 * Response: validated request accepted; engine adapter optional (T65).
 */

import { z } from "zod";
import type { RequestLike, ResponseLike } from "../../_shared/http";
import { requireUserBootstrap } from "../../_shared/auth";
import {
  readJsonBody,
  sendJson,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendMethodNotAllowed,
} from "../../_shared/http";
import { canEditProject } from "../_shared/access";

const sourceAudioHashSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, "Expected SHA-256 hex digest");

export const MveCloneVoiceHttpBodySchema = z
  .object({
    projectId: z.string().min(1).max(128),
    voiceProfileId: z.string().min(1).max(128),
    name: z.string().min(1).max(200),
    language: z.string().min(2).max(16).default("de"),
    referenceAudioUrl: z.string().min(1).max(2048),
    sourceAudioHash: sourceAudioHashSchema,
    consentId: z.string().min(1).max(128),
    commercialUseAllowed: z.boolean().default(false),
  })
  .strict();

export type MveCloneVoiceHttpBody = z.output<
  typeof MveCloneVoiceHttpBodySchema
>;

function hasCloneProviderConfigured(): boolean {
  return Boolean(
    process.env.ELEVENLABS_API_KEY?.trim() ||
    process.env.VOICE_CLONE_PROVIDER?.trim(),
  );
}

export async function handleVoiceClone(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const body = await readJsonBody<unknown>(req);
  const parsed = MveCloneVoiceHttpBodySchema.safeParse(body);
  if (!parsed.success) {
    sendBadRequest(res, parsed.error.issues[0]?.message ?? "Invalid input");
    return;
  }

  const data = parsed.data;
  if (!(await canEditProject(bootstrap.user.id, data.projectId))) {
    sendUnauthorized(res);
    return;
  }

  if (!data.consentId.trim() || !data.sourceAudioHash.trim()) {
    sendForbidden(res, "Consent nicht verifiziert — Clone nicht möglich.");
    return;
  }

  if (!hasCloneProviderConfigured()) {
    sendJson(res, 202, {
      success: true,
      status: "queued",
      voiceProfileId: data.voiceProfileId,
      message:
        "Clone-Request validiert — kein Cloud-Provider konfiguriert (lokaler Stub).",
    });
    return;
  }

  sendJson(res, 202, {
    success: true,
    status: "processing",
    voiceProfileId: data.voiceProfileId,
    message: "Clone-Request angenommen — Engine-Verarbeitung folgt.",
  });
}

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  if (req.method === "POST") {
    await handleVoiceClone(req, res);
    return;
  }
  sendMethodNotAllowed(res, ["POST"]);
}
