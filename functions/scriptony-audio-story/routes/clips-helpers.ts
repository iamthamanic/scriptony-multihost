/**
 * Shared helpers for clip routes: project lookup and input sanitization.
 */

import { requestGraphql } from "../../_shared/graphql-compat";
import { ClipInputSchema } from "./clips-schemas";

export async function getClipProjectId(clipId: string): Promise<string | null> {
  try {
    const data = await requestGraphql<{
      audio_clips_by_pk: { project_id: string } | null;
    }>(
      `
			query GetClipProjectId($id: uuid!) {
				audio_clips_by_pk(id: $id) { project_id }
			}
			`,
      { id: clipId },
    );
    return data.audio_clips_by_pk?.project_id ?? null;
  } catch {
    return null;
  }
}

export function sanitizeClipInput(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const result = ClipInputSchema.partial().safeParse(body);
  if (!result.success) {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(result.data)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}
