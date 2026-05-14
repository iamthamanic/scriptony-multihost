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

// --- Ripple Schemas ---

const RippleInputSchema = z.object({
	changedClipId: z.string().min(1),
	newEndSec: z.number().min(0),
	allClips: z.array(z.unknown()),
	allScenes: z.array(z.unknown()),
	allSequences: z.array(z.unknown()),
	allActs: z.array(z.unknown()),
});

interface TemporalContainer {
	id: string;
	startSec: number;
	endSec: number;
	durationSec: number;
	orderIndex: number;
}

interface RippleScene extends TemporalContainer {
	sequenceId: string;
}

interface RippleSequence extends TemporalContainer {
	actId: string;
}

interface RippleAct extends TemporalContainer {}

interface RippleInput {
	changedClipId: string;
	newEndSec: number;
	allClips: Array<Record<string, unknown>>;
	allScenes: RippleScene[];
	allSequences: RippleSequence[];
	allActs: RippleAct[];
}

interface RippleOutput {
	updatedClips: Array<Record<string, unknown>>;
	updatedScenes: RippleScene[];
	updatedSequences: RippleSequence[];
	updatedActs: RippleAct[];
	stats: {
		affectedClips: number;
		affectedScenes: number;
		affectedSequences: number;
		affectedActs: number;
		deltaSec: number;
	};
}

/** T30: Pure Function — Ripple-Berechnung (KISS, keine Side-Effects). */
function calculateRipple(input: RippleInput): RippleOutput {
	const {
		changedClipId,
		newEndSec,
		allClips,
		allScenes,
		allSequences,
		allActs,
	} = input;

	const clips = allClips.map((c) => ({ ...c }));
	const scenes = allScenes.map((s) => ({ ...s }));
	const sequences = allSequences.map((sq) => ({ ...sq }));
	const acts = allActs.map((a) => ({ ...a }));

	const changedIdx = clips.findIndex((c) => c.id === changedClipId);
	if (changedIdx === -1) throw new Error(`Clip not found: ${changedClipId}`);

	const changedClip = clips[changedIdx];
	const oldEndSec = Number(changedClip.end_sec ?? changedClip.endSec ?? 0);
	const delta = newEndSec - oldEndSec;

	if (delta === 0) {
		return {
			updatedClips: clips,
			updatedScenes: scenes,
			updatedSequences: sequences,
			updatedActs: acts,
			stats: { affectedClips: 0, affectedScenes: 0, affectedSequences: 0, affectedActs: 0, deltaSec: 0 },
		};
	}

	clips[changedIdx] = { ...changedClip, end_sec: newEndSec, endSec: newEndSec };
	let affectedClips = 1;
	let affectedScenes = 0;
	let affectedSequences = 0;
	let affectedActs = 0;

	// Scene
	const sceneId = String(changedClip.scene_id ?? changedClip.sceneId ?? "");
	const sceneIdx = scenes.findIndex((s) => s.id === sceneId);
	if (sceneIdx === -1) throw new Error(`Scene not found: ${sceneId}`);

	const scene = scenes[sceneIdx];
	const sceneClips = clips.filter((c) => (c.scene_id ?? c.sceneId) === sceneId);
	const newSceneEndSec = Math.max(...sceneClips.map((c) => Number(c.end_sec ?? c.endSec ?? 0)), 0);
	const oldSceneEndSec = scene.endSec;
	const sceneDelta = newSceneEndSec - oldSceneEndSec;

	if (sceneDelta !== 0) {
		scenes[sceneIdx] = { ...scene, endSec: newSceneEndSec, durationSec: Math.max(newSceneEndSec - scene.startSec, 0) };
		affectedScenes++;
	}

	// Nachfolgende Scenes in Sequence
	const sequenceId = scene.sequenceId;
	const scenesInSeq = scenes
		.filter((s) => s.sequenceId === sequenceId)
		.sort((a, b) => a.orderIndex - b.orderIndex);
	const sceneOrderIdx = scenesInSeq.findIndex((s) => s.id === sceneId);
	for (let i = sceneOrderIdx + 1; i < scenesInSeq.length; i++) {
		const nextScene = scenesInSeq[i];
		const idx = scenes.findIndex((s) => s.id === nextScene.id);
		const newStart = Math.max(nextScene.startSec + sceneDelta, 0);
		scenes[idx] = { ...nextScene, startSec: newStart, endSec: Math.max(nextScene.endSec + sceneDelta, newStart) };

		const clipsToShift = clips.filter((c) => (c.scene_id ?? c.sceneId) === nextScene.id && !(c.cross_scene ?? c.crossScene));
		for (const c of clipsToShift) {
			const cIdx = clips.findIndex((clip) => clip.id === c.id);
			const newClipStart = Math.max(Number(c.start_sec ?? c.startSec ?? 0) + sceneDelta, 0);
			clips[cIdx] = { ...c, start_sec: newClipStart, end_sec: Math.max(Number(c.end_sec ?? c.endSec ?? 0) + sceneDelta, newClipStart) };
			affectedClips++;
		}
	}

	// Sequence
	const seqIdx = sequences.findIndex((sq) => sq.id === sequenceId);
	if (seqIdx >= 0) {
		const sequence = sequences[seqIdx];
		const updatedScenesInSeq = scenes.filter((s) => s.sequenceId === sequenceId).sort((a, b) => a.orderIndex - b.orderIndex);
		const newSeqEndSec = updatedScenesInSeq.length > 0 ? updatedScenesInSeq[updatedScenesInSeq.length - 1].endSec : sequence.endSec;
		const seqDelta = newSeqEndSec - sequence.endSec;
		if (seqDelta !== 0) {
			sequences[seqIdx] = { ...sequence, endSec: newSeqEndSec, durationSec: Math.max(newSeqEndSec - sequence.startSec, 0) };
			affectedSequences++;
		}

		// Nachfolgende Sequences in Act
		const actId = sequence.actId;
		const seqsInAct = sequences.filter((sq) => sq.actId === actId).sort((a, b) => a.orderIndex - b.orderIndex);
		const seqOrderIdx = seqsInAct.findIndex((sq) => sq.id === sequenceId);
		for (let i = seqOrderIdx + 1; i < seqsInAct.length; i++) {
			const nextSeq = seqsInAct[i];
			const idx = sequences.findIndex((sq) => sq.id === nextSeq.id);
			const newStart = Math.max(nextSeq.startSec + seqDelta, 0);
			sequences[idx] = { ...nextSeq, startSec: newStart, endSec: Math.max(nextSeq.endSec + seqDelta, newStart) };

			const scenesToShift = scenes.filter((s) => s.sequenceId === nextSeq.id);
			for (const s of scenesToShift) {
				const sIdx = scenes.findIndex((scene) => scene.id === s.id);
				const newSceneStart = Math.max(s.startSec + seqDelta, 0);
				scenes[sIdx] = { ...s, startSec: newSceneStart, endSec: Math.max(s.endSec + seqDelta, newSceneStart) };

				const clipsToShift = clips.filter((c) => (c.scene_id ?? c.sceneId) === s.id && !(c.cross_scene ?? c.crossScene));
				for (const c of clipsToShift) {
					const cIdx = clips.findIndex((clip) => clip.id === c.id);
					const newClipStart = Math.max(Number(c.start_sec ?? c.startSec ?? 0) + seqDelta, 0);
					clips[cIdx] = { ...c, start_sec: newClipStart, end_sec: Math.max(Number(c.end_sec ?? c.endSec ?? 0) + seqDelta, newClipStart) };
					affectedClips++;
				}
			}
		}
	}

	// Act
	const actIdx = acts.findIndex((a) => a.id === (sequenceId ? sequences[seqIdx]?.actId : ""));
	if (actIdx >= 0 && sequenceId) {
		const act = acts[actIdx];
		const actId = act.id;
		const updatedSeqsInAct = sequences.filter((sq) => sq.actId === actId).sort((a, b) => a.orderIndex - b.orderIndex);
		const newActEndSec = updatedSeqsInAct.length > 0 ? updatedSeqsInAct[updatedSeqsInAct.length - 1].endSec : act.endSec;
		const actDelta = newActEndSec - act.endSec;
		if (actDelta !== 0) {
			acts[actIdx] = { ...act, endSec: newActEndSec, durationSec: Math.max(newActEndSec - act.startSec, 0) };
			affectedActs++;
		}

		// Nachfolgende Acts
		const sortedActs = acts.sort((a, b) => a.orderIndex - b.orderIndex);
		const actOrderIdx = sortedActs.findIndex((a) => a.id === actId);
		for (let i = actOrderIdx + 1; i < sortedActs.length; i++) {
			const nextAct = sortedActs[i];
			const idx = acts.findIndex((a) => a.id === nextAct.id);
			const newStart = Math.max(nextAct.startSec + actDelta, 0);
			acts[idx] = { ...nextAct, startSec: newStart, endSec: Math.max(nextAct.endSec + actDelta, newStart) };

			const seqsToShift = sequences.filter((sq) => sq.actId === nextAct.id);
			for (const sq of seqsToShift) {
				const sqIdx = sequences.findIndex((s) => s.id === sq.id);
				const newSeqStart = Math.max(sq.startSec + actDelta, 0);
				sequences[sqIdx] = { ...sq, startSec: newSeqStart, endSec: Math.max(sq.endSec + actDelta, newSeqStart) };

				const scenesToShift = scenes.filter((s) => s.sequenceId === sq.id);
				for (const s of scenesToShift) {
					const sIdx = scenes.findIndex((scene) => scene.id === s.id);
					const newSceneStart = Math.max(s.startSec + actDelta, 0);
					scenes[sIdx] = { ...s, startSec: newSceneStart, endSec: Math.max(s.endSec + actDelta, newSceneStart) };

					const clipsToShift = clips.filter((c) => (c.scene_id ?? c.sceneId) === s.id && !(c.cross_scene ?? c.crossScene));
					for (const c of clipsToShift) {
						const cIdx = clips.findIndex((clip) => clip.id === c.id);
						const newClipStart = Math.max(Number(c.start_sec ?? c.startSec ?? 0) + actDelta, 0);
						clips[cIdx] = { ...c, start_sec: newClipStart, end_sec: Math.max(Number(c.end_sec ?? c.endSec ?? 0) + actDelta, newClipStart) };
						affectedClips++;
					}
				}
			}
		}
	}

	return {
		updatedClips: clips,
		updatedScenes: scenes,
		updatedSequences: sequences,
		updatedActs: acts,
		stats: { affectedClips, affectedScenes, affectedSequences, affectedActs, deltaSec: delta },
	};
}
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

	const { changedClipId, newEndSec, allClips, allScenes, allSequences, allActs } =
		parseResult.data;

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
		const result = calculateRipple({
			changedClipId,
			newEndSec,
			allClips: allClips as Array<Record<string, unknown>>,
			allScenes: allScenes as unknown as RippleScene[],
			allSequences: allSequences as unknown as RippleSequence[],
			allActs: allActs as unknown as RippleAct[],
		});

		// T30: Batch-Update aller betroffenen Clips (best-effort, kein echter Transaction)
		const typedAllClips = allClips as Array<Record<string, unknown>>;
		const updatedClips = result.updatedClips.filter((c) => {
			const orig = typedAllClips.find((orig) => orig.id === c.id);
			if (!orig) return false;
			const origStart = Number((orig as Record<string, unknown>).start_sec ?? (orig as Record<string, unknown>).startSec ?? 0);
			const origEnd = Number((orig as Record<string, unknown>).end_sec ?? (orig as Record<string, unknown>).endSec ?? 0);
			const newStart = Number(c.start_sec ?? c.startSec ?? 0);
			const newEnd = Number(c.end_sec ?? c.endSec ?? 0);
			return origStart !== newStart || origEnd !== newEnd;
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
							start_sec: clip.start_sec ?? clip.startSec,
							end_sec: clip.end_sec ?? clip.endSec,
						},
					},
				);
			} catch (err) {
				console.error(`[Audio Story] Ripple update failed for clip ${clip.id}:`, err);
				updateErrors.push(String(clip.id));
			}
		}

		sendJson(res, 200, {
			stats: result.stats,
			updatedClips: updatedClips.length,
			errors: updateErrors.length > 0 ? updateErrors : undefined,
			warning:
				updateErrors.length > 0
					? `${updateErrors.length} Clip-Updates fehlgeschlagen. Daten könnten inkonsistent sein.`
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
