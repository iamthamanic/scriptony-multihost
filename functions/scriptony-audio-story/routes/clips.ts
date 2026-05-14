/**
 * Audio Clip Routes - Temporale Realisierung (Ist-Ebene).
 *
 * T28: CRUD-Implementierung mit Appwrite/GraphQL-Compat.
 * SRP: Nur Clip-CRUD. Kein Track-Logik, kein TTS, kein Ripple.
 *
 * Security (OWASP ASVS):
 * - Alle Routen erfordern Authentifizierung.
 * - Schreiboperationen pruefen canEditProject (Least Privilege).
 * - Inputs werden auf Typ/Kardinalitaet validiert (Defense in Depth).
 * - Fehler geben keine internen Details preis (Fail-Secure).
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import { requireUserBootstrap } from "../../_shared/auth";
import {
	getQuery,
	getParam,
	readJsonBody,
	sendJson,
	sendBadRequest,
	sendUnauthorized,
	sendServerError,
	sendNotFound,
	sendMethodNotAllowed,
	sendForbidden,
} from "../../_shared/http";
import { requestGraphql } from "../../_shared/graphql-compat";
import { canEditProject, canReadProject } from "../_shared/access";
import { z } from "zod";

// --- Zod Validierungsschema fuer AudioClip Input ---

const ClipInputSchema = z.object({
	track_id: z.string().min(1),
	scene_id: z.string().min(1),
	project_id: z.string().min(1),
	start_sec: z.number().min(0).default(0),
	end_sec: z.number().min(0).default(1),
	lane_index: z.number().int().min(0).max(99).default(0),
	order_index: z.number().int().min(0).default(0),
	audio_file_id: z.string().min(1).optional(),
	waveform_data: z
		.union([z.array(z.number().min(0).max(1)).max(200), z.string()])
		.optional(),
	cross_scene: z.boolean().default(false),
	fx_preset_id: z.string().min(1).optional(),
	track_type: z.string().min(1).optional(),
	content: z.string().min(1).optional(),
	character_id: z.string().min(1).optional(),
});

/** Lade die project_id eines Tracks via GraphQL ( fuer serverseitige Auth-Validierung ). */
async function getTrackProjectId(
	trackId: string,
): Promise<{ projectId: string; sceneId: string } | null> {
	try {
		const data = await requestGraphql<{
			scene_audio_tracks_by_pk: { project_id: string; scene_id: string } | null;
		}>(
			`
			query GetTrackProjectId($id: uuid!) {
				scene_audio_tracks_by_pk(id: $id) { project_id scene_id }
			}
			`,
			{ id: trackId },
		);
		const track = data.scene_audio_tracks_by_pk;
		if (!track) return null;
		return { projectId: track.project_id, sceneId: track.scene_id };
	} catch {
		return null;
	}
}

/** Lade die project_id eines Clips via GraphQL ( fuer Auth-Checks ). */
async function getClipProjectId(clipId: string): Promise<string | null> {
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

/** Strips unknown keys and validates with Zod. */
function sanitizeClipInput(
	body: Record<string, unknown>,
): Record<string, unknown> {
	const result = ClipInputSchema.partial().safeParse(body);
	if (!result.success) {
		// Return empty so caller can detect "no valid fields"
		return {};
	}
	// Filter out undefined values to keep payload clean
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(result.data)) {
		if (value !== undefined) out[key] = value;
	}
	return out;
}

// --- LIST ---

async function listClips(req: RequestLike, res: ResponseLike): Promise<void> {
	const bootstrap = await requireUserBootstrap(req);
	if (!bootstrap) {
		sendUnauthorized(res);
		return;
	}

	const sceneId = getQuery(req, "sceneId") || getParam(req, "sceneId");
	if (!sceneId) {
		sendBadRequest(res, "sceneId is required");
		return;
	}

	try {
		const data = await requestGraphql<{
			audio_clips: Array<Record<string, unknown>>;
		}>(
			`
			query GetAudioClips($sceneId: uuid!) {
				audio_clips(
					where: { scene_id: { _eq: $sceneId } }
					order_by: [{ lane_index: asc }, { order_index: asc }]
				) {
					id
					track_id
					scene_id
					project_id
					start_sec
					end_sec
					lane_index
					order_index
					audio_file_id
					waveform_data
					cross_scene
					fx_preset_id
					track_type
					content
					character_id
					created_at
					updated_at
				}
			}
			`,
			{ sceneId },
		);

		const clips = data.audio_clips ?? [];
		// Auth: pruefe Lesezugriff auf das Projekt des ersten Clips (alle Clips einer Scene
		// teilen dasselbe project_id). Wenn leer, ist kein Zugriff noetig.
		if (clips.length > 0) {
			const projectId = (clips[0]?.project_id as string) || "";
			if (projectId && !(await canReadProject(bootstrap.user.id, projectId))) {
				sendForbidden(res);
				return;
			}
		}

		sendJson(res, 200, { clips });
	} catch (error) {
		console.error("[Audio Story] Error fetching clips:", error);
		sendServerError(res, "Failed to fetch audio clips");
	}
}

// --- CREATE ---

async function createClip(req: RequestLike, res: ResponseLike): Promise<void> {
	const bootstrap = await requireUserBootstrap(req);
	if (!bootstrap) {
		sendUnauthorized(res);
		return;
	}

	const body = await readJsonBody<Record<string, unknown>>(req);

	// Zod-Validierung fuer Pflichtfelder + optionale Felder
	const parseResult = ClipInputSchema.safeParse(body);
	if (!parseResult.success) {
		const firstIssue = parseResult.error.issues[0];
		sendBadRequest(
			res,
			`Invalid input: ${firstIssue?.path.join(".")} — ${firstIssue?.message}`,
		);
		return;
	}

	const { project_id: projectId } = parseResult.data;

	if (!(await canEditProject(bootstrap.user.id, projectId))) {
		sendUnauthorized(res);
		return;
	}

	try {
		const data = await requestGraphql<{
			insert_audio_clips_one: Record<string, unknown>;
		}>(
			`
			mutation CreateAudioClip($object: audio_clips_insert_input!) {
				insert_audio_clips_one(object: $object) {
					id
					track_id
					scene_id
					project_id
					start_sec
					end_sec
					lane_index
					order_index
					created_at
					updated_at
				}
			}
			`,
			{ object: parseResult.data },
		);

		sendJson(res, 201, { clip: data.insert_audio_clips_one });
	} catch (error) {
		console.error("[Audio Story] Error creating clip:", error);
		sendServerError(res, "Failed to create audio clip");
	}
}

// --- GET SINGLE ---

async function getClip(req: RequestLike, res: ResponseLike): Promise<void> {
	const bootstrap = await requireUserBootstrap(req);
	if (!bootstrap) {
		sendUnauthorized(res);
		return;
	}

	const clipId = getParam(req, "id");
	if (!clipId) {
		sendBadRequest(res, "clip id is required");
		return;
	}

	// Auth: Lade project_id des existierenden Clips und pruefe Lesezugriff.
	const projectId = await getClipProjectId(clipId);
	if (!projectId) {
		sendNotFound(res, "Audio clip not found");
		return;
	}
	if (!(await canReadProject(bootstrap.user.id, projectId))) {
		sendForbidden(res);
		return;
	}

	try {
		const data = await requestGraphql<{
			audio_clips_by_pk: Record<string, unknown> | null;
		}>(
			`
			query GetAudioClip($id: uuid!) {
				audio_clips_by_pk(id: $id) {
					id
					track_id
					scene_id
					project_id
					start_sec
					end_sec
					lane_index
					order_index
					audio_file_id
					waveform_data
					cross_scene
					fx_preset_id
					track_type
					content
					character_id
					created_at
					updated_at
				}
			}
			`,
			{ id: clipId },
		);

		if (!data.audio_clips_by_pk) {
			sendNotFound(res, "Audio clip not found");
			return;
		}

		sendJson(res, 200, { clip: data.audio_clips_by_pk });
	} catch (error) {
		console.error("[Audio Story] Error fetching clip:", error);
		sendServerError(res, "Failed to fetch audio clip");
	}
}

// --- UPDATE ---

async function updateClip(req: RequestLike, res: ResponseLike): Promise<void> {
	const bootstrap = await requireUserBootstrap(req);
	if (!bootstrap) {
		sendUnauthorized(res);
		return;
	}

	const clipId = getParam(req, "id");
	if (!clipId) {
		sendBadRequest(res, "clip id is required");
		return;
	}

	// Auth: Lade project_id des existierenden Clips und pruefe Schreibzugriff.
	const projectId = await getClipProjectId(clipId);
	if (!projectId) {
		sendNotFound(res, "Audio clip not found");
		return;
	}
	if (!(await canEditProject(bootstrap.user.id, projectId))) {
		sendForbidden(res);
		return;
	}

	const body = await readJsonBody<Record<string, unknown>>(req);
	const updates = sanitizeClipInput(body);
	if (Object.keys(updates).length === 0) {
		sendBadRequest(res, "No valid fields to update");
		return;
	}

	try {
		const data = await requestGraphql<{
			update_audio_clips_by_pk: Record<string, unknown>;
		}>(
			`
			mutation UpdateAudioClip($id: uuid!, $set: audio_clips_set_input!) {
				update_audio_clips_by_pk(pk_columns: { id: $id }, _set: $set) {
					id
					track_id
					start_sec
					end_sec
					lane_index
					order_index
					updated_at
				}
			}
			`,
			{ id: clipId, set: updates },
		);

		sendJson(res, 200, { clip: data.update_audio_clips_by_pk });
	} catch (error) {
		console.error("[Audio Story] Error updating clip:", error);
		sendServerError(res, "Failed to update audio clip");
	}
}

// --- DELETE ---

async function deleteClip(req: RequestLike, res: ResponseLike): Promise<void> {
	const bootstrap = await requireUserBootstrap(req);
	if (!bootstrap) {
		sendUnauthorized(res);
		return;
	}

	const clipId = getParam(req, "id");
	if (!clipId) {
		sendBadRequest(res, "clip id is required");
		return;
	}

	// Auth: Lade project_id des existierenden Clips und pruefe Schreibzugriff.
	const projectId = await getClipProjectId(clipId);
	if (!projectId) {
		sendNotFound(res, "Audio clip not found");
		return;
	}
	if (!(await canEditProject(bootstrap.user.id, projectId))) {
		sendForbidden(res);
		return;
	}

	try {
		await requestGraphql<{ delete_audio_clips_by_pk: { id: string } }>(
			`
			mutation DeleteAudioClip($id: uuid!) {
				delete_audio_clips_by_pk(id: $id) {
					id
				}
			}
			`,
			{ id: clipId },
		);

		sendJson(res, 200, { deleted: true, id: clipId });
	} catch (error) {
		console.error("[Audio Story] Error deleting clip:", error);
		sendServerError(res, "Failed to delete audio clip");
	}
}

// --- ROUTER ---

export default async function clipsRoutes(
	req: RequestLike,
	res: ResponseLike,
): Promise<void> {
	const method = req.method?.toUpperCase() || "GET";
	const id = getParam(req, "id");

	if (method === "GET" && !id) return listClips(req, res);
	if (method === "GET" && id) return getClip(req, res);
	if (method === "POST") return createClip(req, res);
	if (method === "PUT" && id) return updateClip(req, res);
	if (method === "DELETE" && id) return deleteClip(req, res);

	sendMethodNotAllowed(res, ["GET", "POST", "PUT", "DELETE"]);
}
