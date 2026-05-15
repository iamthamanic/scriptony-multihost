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

import { z } from "zod";
import { calculateRipple } from "../../_shared/ripple-engine";
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

// --- Ripple Schemas (Deep Validation) ---

const TemporalItemSchema = z
	.object({
		id: z.string().min(1),
		startSec: z.number().optional(),
		start_sec: z.number().optional(),
		endSec: z.number().optional(),
		end_sec: z.number().optional(),
		start: z.number().optional(),
		end: z.number().optional(),
		orderIndex: z.number().optional(),
		order_index: z.number().optional(),
	})
	.passthrough();

const RippleSceneSchema = TemporalItemSchema.extend({
	sequenceId: z.string().nullable().optional(),
	sequence_id: z.string().nullable().optional(),
});

const RippleSequenceSchema = TemporalItemSchema.extend({
	actId: z.string().nullable().optional(),
	act_id: z.string().nullable().optional(),
});

const RippleActSchema = TemporalItemSchema;

const RippleClipSchema = z
	.object({
		id: z.string().min(1),
		sceneId: z.string().optional(),
		scene_id: z.string().optional(),
		startSec: z.number().optional(),
		start_sec: z.number().optional(),
		endSec: z.number().optional(),
		end_sec: z.number().optional(),
		crossScene: z.boolean().optional(),
		cross_scene: z.boolean().optional(),
	})
	.passthrough();

const RippleInputSchema = z.object({
	changedClipId: z.string().min(1),
	newEndSec: z.number().min(0),
	allClips: z.array(RippleClipSchema).min(1),
	allScenes: z.array(RippleSceneSchema).min(1),
	allSequences: z.array(RippleSequenceSchema),
	allActs: z.array(RippleActSchema),
});

// --- Mapper: snake_case → camelCase ---

/** Extrahiert startSec aus verschiedenen Feldnamen. */
function extractStartSec(item: Record<string, unknown>): number {
	return Number(item.startSec ?? item.start_sec ?? item.start ?? 0);
}

/** Extrahiert endSec aus verschiedenen Feldnamen. */
function extractEndSec(item: Record<string, unknown>): number {
	return Number(item.endSec ?? item.end_sec ?? item.end ?? 0);
}

/** Extrahiert orderIndex aus verschiedenen Feldnamen. */
function extractOrderIndex(item: Record<string, unknown>): number {
	return Number(item.orderIndex ?? item.order_index ?? 0);
}

/** Mapped Clip- Rohdaten in RippleClip für die Shared Engine. */
function mapToRippleClip(
	raw: unknown,
): import("../../_shared/ripple-engine").RippleClip {
	const item = raw as Record<string, unknown>;
	return {
		id: String(item.id),
		sceneId: String(item.sceneId ?? item.scene_id ?? ""),
		startSec: extractStartSec(item),
		endSec: extractEndSec(item),
		crossScene: Boolean(item.crossScene ?? item.cross_scene ?? false),
	};
}

/** Mapped Scene-Rohdaten in RippleScene. */
function mapToRippleScene(
	raw: unknown,
): import("../../_shared/ripple-engine").RippleScene {
	const item = raw as Record<string, unknown>;
	return {
		id: String(item.id),
		sequenceId: (item.sequenceId ?? item.sequence_id ?? null) as string | null,
		startSec: extractStartSec(item),
		endSec: extractEndSec(item),
		durationSec: Math.max(extractEndSec(item) - extractStartSec(item), 0),
		orderIndex: extractOrderIndex(item),
	};
}

/** Mapped Sequence-Rohdaten in RippleSequence. */
function mapToRippleSequence(
	raw: unknown,
): import("../../_shared/ripple-engine").RippleSequence {
	const item = raw as Record<string, unknown>;
	return {
		id: String(item.id),
		actId: (item.actId ?? item.act_id ?? null) as string | null,
		startSec: extractStartSec(item),
		endSec: extractEndSec(item),
		durationSec: Math.max(extractEndSec(item) - extractStartSec(item), 0),
		orderIndex: extractOrderIndex(item),
	};
}

/** Mapped Act-Rohdaten in RippleAct. */
function mapToRippleAct(
	raw: unknown,
): import("../../_shared/ripple-engine").RippleAct {
	const item = raw as Record<string, unknown>;
	return {
		id: String(item.id),
		startSec: extractStartSec(item),
		endSec: extractEndSec(item),
		durationSec: Math.max(extractEndSec(item) - extractStartSec(item), 0),
		orderIndex: extractOrderIndex(item),
	};
}

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

// --- RIPPLE ---

async function ripple(req: RequestLike, res: ResponseLike): Promise<void> {
	const bootstrap = await requireUserBootstrap(req);
	if (!bootstrap) {
		sendUnauthorized(res);
		return;
	}

	const body = await readJsonBody<Record<string, unknown>>(req);
	const parseResult = RippleInputSchema.safeParse(body);
	if (!parseResult.success) {
		const firstIssue = parseResult.error.issues[0];
		sendBadRequest(
			res,
			`Invalid ripple input: ${firstIssue?.path.join(".")} — ${firstIssue?.message}`,
		);
		return;
	}

	const {
		changedClipId,
		newEndSec,
		allClips,
		allScenes,
		allSequences,
		allActs,
	} = parseResult.data;

	// Auth: Projekt des geänderten Clips prüfen
	const projectId = await getClipProjectId(changedClipId);
	if (!projectId) {
		sendNotFound(res, "Audio clip not found");
		return;
	}
	if (!(await canEditProject(bootstrap.user.id, projectId))) {
		sendForbidden(res);
		return;
	}

	try {
		// T30: snake_case → camelCase mappen für Shared Engine
		const mappedClips = allClips.map(mapToRippleClip);
		const mappedScenes = allScenes.map(mapToRippleScene);
		const mappedSequences = allSequences.map(mapToRippleSequence);
		const mappedActs = allActs.map(mapToRippleAct);

		const result = calculateRipple({
			changedClipId,
			newEndSec,
			allClips: mappedClips,
			allScenes: mappedScenes,
			allSequences: mappedSequences,
			allActs: mappedActs,
		});

		// T30: Batch-Update aller betroffenen Clips (best-effort, kein echter Transaction)
		const updatedClips = result.updatedClips.filter((c) => {
			const orig = mappedClips.find((orig) => orig.id === c.id);
			if (!orig) return false;
			return orig.startSec !== c.startSec || orig.endSec !== c.endSec;
		});

		const updateErrors: string[] = [];
		for (const clip of updatedClips) {
			try {
				await requestGraphql(
					`
					mutation RippleUpdateClip($id: uuid!, $set: audio_clips_set_input!) {
						update_audio_clips_by_pk(pk_columns: { id: $id }, _set: $set) { id }
					}
				`,
					{
						id: clip.id,
						set: {
							start_sec: clip.startSec,
							end_sec: clip.endSec,
						},
					},
				);
			} catch (err) {
				console.error(
					`[Audio Story] Ripple update failed for clip ${clip.id}:`,
					err,
				);
				updateErrors.push(String(clip.id));
			}
		}

		// T30: Container-Dauer in timeline_nodes persistieren
		for (const scene of result.updatedScenes) {
			const orig = mappedScenes.find((s) => s.id === scene.id);
			if (!orig) continue;
			if (orig.endSec !== scene.endSec || orig.startSec !== scene.startSec) {
				try {
					await requestGraphql(
						`
						mutation UpdateTimelineNode($id: uuid!, $set: timeline_nodes_set_input!) {
							update_timeline_nodes_by_pk(pk_columns: { id: $id }, _set: $set) { id }
						}
					`,
						{
							id: scene.id,
							set: {
								start_sec: scene.startSec,
								end_sec: scene.endSec,
								duration_sec: scene.durationSec,
								order_index: scene.orderIndex,
							},
						},
					);
				} catch (err) {
					console.error(
						`[Audio Story] Ripple update failed for scene ${scene.id}:`,
						err,
					);
					updateErrors.push(`scene:${String(scene.id)}`);
				}
			}
		}
		for (const seq of result.updatedSequences) {
			const orig = mappedSequences.find((sq) => sq.id === seq.id);
			if (!orig) continue;
			if (orig.endSec !== seq.endSec || orig.startSec !== seq.startSec) {
				try {
					await requestGraphql(
						`
						mutation UpdateTimelineNode($id: uuid!, $set: timeline_nodes_set_input!) {
							update_timeline_nodes_by_pk(pk_columns: { id: $id }, _set: $set) { id }
						}
					`,
						{
							id: seq.id,
							set: {
								start_sec: seq.startSec,
								end_sec: seq.endSec,
								duration_sec: seq.durationSec,
								order_index: seq.orderIndex,
							},
						},
					);
				} catch (err) {
					console.error(
						`[Audio Story] Ripple update failed for sequence ${seq.id}:`,
						err,
					);
					updateErrors.push(`sequence:${String(seq.id)}`);
				}
			}
		}
		for (const act of result.updatedActs) {
			const orig = mappedActs.find((a) => a.id === act.id);
			if (!orig) continue;
			if (orig.endSec !== act.endSec || orig.startSec !== act.startSec) {
				try {
					await requestGraphql(
						`
						mutation UpdateTimelineNode($id: uuid!, $set: timeline_nodes_set_input!) {
							update_timeline_nodes_by_pk(pk_columns: { id: $id }, _set: $set) { id }
						}
					`,
						{
							id: act.id,
							set: {
								start_sec: act.startSec,
								end_sec: act.endSec,
								duration_sec: act.durationSec,
								order_index: act.orderIndex,
							},
						},
					);
				} catch (err) {
					console.error(
						`[Audio Story] Ripple update failed for act ${act.id}:`,
						err,
					);
					updateErrors.push(`act:${String(act.id)}`);
				}
			}
		}
		// T30: Scene/Sequence/Act-Daten zurückgeben (Frontend nutzt sie für optimistisches Update)
		const snakeCaseScenes = result.updatedScenes.map((s) => ({
			id: s.id,
			start_sec: s.startSec,
			end_sec: s.endSec,
			duration_sec: s.durationSec,
			order_index: s.orderIndex,
			sequence_id: s.sequenceId,
		}));
		const snakeCaseSequences = result.updatedSequences.map((sq) => ({
			id: sq.id,
			start_sec: sq.startSec,
			end_sec: sq.endSec,
			duration_sec: sq.durationSec,
			order_index: sq.orderIndex,
			act_id: sq.actId,
		}));
		const snakeCaseActs = result.updatedActs.map((a) => ({
			id: a.id,
			start_sec: a.startSec,
			end_sec: a.endSec,
			duration_sec: a.durationSec,
			order_index: a.orderIndex,
		}));

		sendJson(res, 200, {
			stats: result.stats,
			updatedClips: updatedClips.length,
			scenes: snakeCaseScenes,
			sequences: snakeCaseSequences,
			acts: snakeCaseActs,
			errors: updateErrors.length > 0 ? updateErrors : undefined,
			warning:
				updateErrors.length > 0
					? `${updateErrors.length} Updates fehlgeschlagen (Clip/Scene/Sequence/Act). Daten könnten inkonsistent sein.`
					: undefined,
		});
	} catch (error) {
		console.error("[Audio Story] Ripple calculation failed:", error);
		sendServerError(res, error);
	}
}

// --- ROUTER ---

export default async function clipsRoutes(
	req: RequestLike,
	res: ResponseLike,
): Promise<void> {
	const method = req.method?.toUpperCase() || "GET";
	const id = getParam(req, "id");
	const pathname = (req.path || req.url || "/") as string;

	// T30: POST /clips/ripple (vor id-basierten Routen prüfen)
	if (method === "POST" && pathname.includes("/ripple")) {
		await ripple(req, res);
		return;
	}

	if (method === "GET" && !id) return listClips(req, res);
	if (method === "GET" && id) return getClip(req, res);
	if (method === "POST") return createClip(req, res);
	if (method === "PUT" && id) return updateClip(req, res);
	if (method === "DELETE" && id) return deleteClip(req, res);

	sendMethodNotAllowed(res, ["GET", "POST", "PUT", "DELETE"]);
}
