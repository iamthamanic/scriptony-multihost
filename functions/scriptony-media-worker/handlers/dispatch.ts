/**
 * T15 Media Worker Dispatch Handler.
 *
 * SOLID/SRP: Validiert Payload, erstellt Job, gibt jobId zurueck.
 * Keine Medienverarbeitung hier — nur Job-Orchestration.
 */

import { requireAuth } from "../../_shared/auth-http";
import {
  type RequestLike,
  type ResponseLike,
  readJsonBody,
  sendJson,
  sendServerError,
} from "../../_shared/http";
import { requireProjectAccess } from "../../_shared/scriptony";
import { checkPayloadSize, createMediaJob } from "../_shared/media-job-service";
import { SUPPORTED_MEDIA_ACTIONS } from "../config/supported-actions";

/**
 * Handle POST /v1/worker/media/:action
 *
 * 1. Authenticate
 * 2. Validate action exists
 * 3. Validate payload with Zod (base + action-specific schema)
 * 4. Check project access (via _shared/scriptony.ts — includes org check)
 * 5. Check payload size
 * 6. Create job in jobs collection (Direct DB Write)
 * 7. Return jobId immediately (async, < 5s)
 */
export async function handleDispatch(
  req: RequestLike,
  res: ResponseLike,
  action: string,
): Promise<void> {
  const user = await requireAuth(req, res);
  if (!user) return;

  const config =
    SUPPORTED_MEDIA_ACTIONS[action as keyof typeof SUPPORTED_MEDIA_ACTIONS];
  if (!config) {
    sendJson(res, 422, {
      error: `Unsupported media action: ${action}`,
      supported_actions: Object.keys(SUPPORTED_MEDIA_ACTIONS),
    });
    return;
  }

  // Parse request body
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    console.error("[media-worker] failed to parse JSON body:", err);
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  // Validate payload with action-specific Zod schema
  const parsed = config.payloadSchema.safeParse(body);
  if (!parsed.success) {
    sendJson(res, 400, {
      error: "Invalid request body",
      details: parsed.error.issues,
    });
    return;
  }

  const projectId = parsed.data.project_id;

  try {
    // Security: Verify project access via _shared/scriptony.ts (includes org check)
    const project = await requireProjectAccess(projectId, user.id, res);
    if (!project) return;

    // Check payload size
    const sizeCheck = checkPayloadSize(parsed.data, config.maxPayloadBytes);
    if (!sizeCheck.ok) {
      sendJson(res, 413, {
        error: "Payload too large",
        limit_bytes: sizeCheck.limit,
        actual_bytes: sizeCheck.size,
      });
      return;
    }

    // Create job entry (Direct DB Write — no HTTP roundtrip)
    const job = await createMediaJob(
      config.jobType,
      parsed.data,
      user.id,
      projectId,
    );

    sendJson(res, 202, {
      success: true,
      jobId: job.jobId,
      status: job.status,
      action,
      message: `Job queued for ${action}`,
      createdAt: job.createdAt,
    });
  } catch (error) {
    console.error(`[media-worker] failed to create job for ${action}:`, error);
    sendServerError(res, error);
  }
}
