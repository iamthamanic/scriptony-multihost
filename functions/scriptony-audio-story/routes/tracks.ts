/**
 * Audio Tracks Routes — Audio Production Orchestration.
 *
 * Verantwortung (T07):
 *   Track-Management: Dialog, Musik, SFX, Atmo auf Timeline-Ebene.
 *   Technische Audio-Processing/Engine-Logik ist VERBOTEN hier.
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
	sendMethodNotAllowed,
	sendNotFound,
} from "../../_shared/http";
import { requestGraphql } from "../../_shared/graphql-compat";
import { canReadProject, canEditProject } from "../_shared/access";
import { estimateDurationSec } from "../../_shared/audio-utils";
import { z } from "zod";

const TrackTypeSchema = z.enum(["dialog", "narrator", "sfx", "music", "atmo"]);

async function listTracks(req: RequestLike, res: ResponseLike): Promise<void> {
	const bootstrap = await requireUserBootstrap(req);
	if (!bootstrap) {
		sendUnauthorized(res);
		return;
	}

	const sceneId = getQuery(req, "sceneId") || getParam(req, "sceneId");
	const projectId = getQuery(req, "project_id") || getParam(req, "project_id");
	if (!sceneId) {
		sendBadRequest(res, "sceneId is required");
		return;
	}
	if (projectId && !(await canReadProject(bootstrap.user.id, projectId))) {
		sendUnauthorized(res);
		return;
	}

	try {
		const data = await requestGraphql<{
			scene_audio_tracks: Array<Record<string, unknown>>;
		}>(
			`
      query GetAudioTracks($sceneId: uuid!) {
        scene_audio_tracks(
          where: { scene_id: { _eq: $sceneId } }
          order_by: { start_time: asc }
        ) {
          id
          scene_id
          project_id
          type
          content
          character_id
          audio_file_id
          waveform_data
          start_time
          duration
          fade_in
          fade_out
          tts_voice_id
          tts_settings
          tts_audio_generated
          created_at
          updated_at
        }
      }
    `,
			{ sceneId },
		);

		sendJson(res, 200, { tracks: data.scene_audio_tracks });
	} catch (error) {
		console.error("[Audio Story] Error fetching tracks:", error);
		sendServerError(res, error);
	}
}

async function createTrack(req: RequestLike, res: ResponseLike): Promise<void> {
	const bootstrap = await requireUserBootstrap(req);
	if (!bootstrap) {
		sendUnauthorized(res);
		return;
	}

	const body = await readJsonBody<Record<string, unknown>>(req);
	const {
		sceneId,
		type,
		content,
		characterId,
		startTime,
		duration,
		projectId,
	} = body;

	if (!sceneId || !type || !projectId) {
		sendBadRequest(res, "sceneId, type, and projectId are required");
		return;
	}
	if (!(await canEditProject(bootstrap.user.id, String(projectId)))) {
		sendUnauthorized(res);
		return;
	}

	// T29: Zod-Validierung für type
	const parse = TrackTypeSchema.safeParse(type);
	if (!parse.success) {
		sendBadRequest(
			res,
			`Invalid track type: "${type}". Must be one of: dialog, narrator, sfx, music, atmo`,
		);
		return;
	}

	let trackId: string | null = null;
	let clipId: string | null = null;

	try {
		// ── 1. Track erstellen (bestehende Logik) ────────────────────
		const trackData = await requestGraphql<{
			insert_scene_audio_tracks_one: Record<string, unknown>;
		}>(
			`
      mutation CreateAudioTrack($object: scene_audio_tracks_insert_input!) {
        insert_scene_audio_tracks_one(object: $object) {
          id
          scene_id
          project_id
          type
          content
          character_id
          start_time
          duration
          created_at
          updated_at
        }
      }
    `,
			{
				object: {
					scene_id: sceneId,
					project_id: projectId,
					type,
					content: content || null,
					character_id: characterId || null,
					start_time: startTime || 0,
					duration: duration || 0,
					created_by: bootstrap.user.id,
				},
			},
		);

		const track = trackData.insert_scene_audio_tracks_one;
		trackId = String(track.id);

		// ── 2. WPM-Schätzung berechnen ───────────────────────────────
		const ttsSettings = body.ttsSettings;
		const emotion =
			typeof ttsSettings === "object" &&
			ttsSettings !== null &&
			!Array.isArray(ttsSettings)
				? (ttsSettings as Record<string, unknown>).emotion
				: undefined;

		const language =
			typeof body.language === "string"
				? (body.language as "de" | "en" | "es")
				: "de";

		const wpmEstimate = estimateDurationSec(String(content || ""), {
			type: type as "dialog" | "narrator" | "sfx" | "music" | "atmo",
			emotion: typeof emotion === "string" ? emotion : undefined,
			language,
		});

		// ── 3. Existierende Clips in Szene zählen (für Startzeit + Order) ─
		const clipsAggData = await requestGraphql<{
			audio_clips_aggregate: { aggregate: { count: number } };
			audio_clips: Array<{ end_sec: number }>;
		}>(
			`
      query GetSceneClipsInfo($sceneId: uuid!) {
        audio_clips_aggregate(where: { scene_id: { _eq: $sceneId } }) {
          aggregate { count }
        }
        audio_clips(where: { scene_id: { _eq: $sceneId } }, order_by: { end_sec: desc }, limit: 1) {
          end_sec
        }
      }
    `,
			{ sceneId },
		);

		const clipCount = clipsAggData.audio_clips_aggregate.aggregate?.count ?? 0;
		const lastEndSec = clipsAggData.audio_clips[0]?.end_sec ?? 0;
		const clipStartSec = lastEndSec;
		const clipEndSec = clipStartSec + wpmEstimate;

		// ── 4. Shadow-Clip erstellen (Dual-Write T29) ──────────────────
		const clipData = await requestGraphql<{
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
          track_type
          content
          character_id
          created_at
        }
      }
    `,
			{
				object: {
					track_id: trackId,
					scene_id: sceneId,
					project_id: projectId,
					start_sec: clipStartSec,
					end_sec: clipEndSec,
					lane_index: resolveLaneIndex(
						String(type),
						characterId as string | undefined,
					),
					order_index: clipCount,
					track_type: type,
					content: content || null,
					character_id: characterId || null,
					created_by: bootstrap.user.id,
				},
			},
		);
		clipId = String(clipData.insert_audio_clips_one.id);

		// ── 5. Track-Zeitfelder mit Clip-Werten aktualisieren ─────────
		await requestGraphql(
			`
      mutation UpdateTrackTime($id: uuid!, $set: scene_audio_tracks_set_input!) {
        update_scene_audio_tracks_by_pk(pk_columns: { id: $id }, _set: $set) {
          id
        }
      }
    `,
			{
				id: trackId,
				set: {
					start_time: clipStartSec,
					duration: wpmEstimate,
				},
			},
		);

		sendJson(res, 201, {
			track: { ...track, start_time: clipStartSec, duration: wpmEstimate },
			clip: clipData.insert_audio_clips_one,
		});
	} catch (error) {
		// T29: Rollback — bei Fehler Track + Clip löschen (best-effort)
		if (clipId) {
			try {
				await requestGraphql(
					`
          mutation DeleteAudioClip($id: uuid!) {
            delete_audio_clips_by_pk(id: $id) { id }
          }
        `,
					{ id: clipId },
				);
			} catch (rollbackErr) {
				console.error("[Audio Story] Clip rollback failed:", rollbackErr);
			}
		}
		if (trackId) {
			try {
				await requestGraphql(
					`
          mutation DeleteAudioTrack($id: uuid!) {
            delete_scene_audio_tracks_by_pk(id: $id) { id }
          }
        `,
					{ id: trackId },
				);
			} catch (rollbackErr) {
				console.error("[Audio Story] Track rollback failed:", rollbackErr);
			}
		}
		console.error("[Audio Story] Error creating track:", error);
		sendServerError(res, error);
	}
}

/** KISS: Lane-Zuweisung basierend auf Track-Typ.
 * MUSS mit Frontend LANE_SCHEMA in src/lib/types/index.ts übereinstimmen:
 *   dialog: 0, narrator: 40, sfx: 10, music: 20, atmo: 30
 */
function resolveLaneIndex(type: string, characterId?: string | null): number {
	switch (type) {
		case "dialog":
			// T29: Dialog-Lanes 0–9, optional pro Charakter (future)
			return characterId ? 0 : 0;
		case "narrator":
			return 40;
		case "sfx":
			return 10;
		case "music":
			return 20;
		case "atmo":
			return 30;
		default:
			return 0;
	}
}

async function updateTrack(
	req: RequestLike,
	res: ResponseLike,
	trackId: string,
): Promise<void> {
	const bootstrap = await requireUserBootstrap(req);
	if (!bootstrap) {
		sendUnauthorized(res);
		return;
	}

	// Access-Check: Track project_id holen und pruefen.
	try {
		const trackData = await requestGraphql<{
			scene_audio_tracks_by_pk: { project_id: string } | null;
		}>(
			`
      query GetTrackProject($id: uuid!) {
        scene_audio_tracks_by_pk(id: $id) { project_id }
      }
    `,
			{ id: trackId },
		);
		if (!trackData.scene_audio_tracks_by_pk) {
			sendNotFound(res, "Track not found");
			return;
		}
		if (
			!(await canEditProject(
				bootstrap.user.id,
				trackData.scene_audio_tracks_by_pk.project_id,
			))
		) {
			sendUnauthorized(res);
			return;
		}
	} catch (error) {
		console.error("[Audio Story] Error checking track access:", error);
		sendServerError(res, error);
		return;
	}

	const body = await readJsonBody<Record<string, unknown>>(req);

	// KISS: Allowlist — nur erlaubte Felder durchreichen.
	const allowed = [
		"type",
		"content",
		"character_id",
		"start_time",
		"duration",
		"fade_in",
		"fade_out",
		"tts_voice_id",
		"tts_settings",
		"audio_file_id",
		"waveform_data",
	];
	const set = Object.fromEntries(
		Object.entries(body).filter(([k]) => allowed.includes(k)),
	);

	try {
		const data = await requestGraphql<{
			update_scene_audio_tracks_by_pk: Record<string, unknown> | null;
		}>(
			`
      mutation UpdateAudioTrack($id: uuid!, $set: scene_audio_tracks_set_input!) {
        update_scene_audio_tracks_by_pk(pk_columns: { id: $id }, _set: $set) {
          id
          type
          content
          character_id
          start_time
          duration
          fade_in
          fade_out
          updated_at
        }
      }
    `,
			{ id: trackId, set },
		);

		if (!data.update_scene_audio_tracks_by_pk) {
			sendNotFound(res, "Track not found");
			return;
		}

		sendJson(res, 200, { track: data.update_scene_audio_tracks_by_pk });
	} catch (error) {
		console.error("[Audio Story] Error updating track:", error);
		sendServerError(res, error);
	}
}

async function deleteTrack(
	req: RequestLike,
	res: ResponseLike,
	trackId: string,
): Promise<void> {
	const bootstrap = await requireUserBootstrap(req);
	if (!bootstrap) {
		sendUnauthorized(res);
		return;
	}

	// Access-Check: Track project_id holen und pruefen.
	try {
		const trackData = await requestGraphql<{
			scene_audio_tracks_by_pk: { project_id: string } | null;
		}>(
			`
      query GetTrackProject($id: uuid!) {
        scene_audio_tracks_by_pk(id: $id) { project_id }
      }
    `,
			{ id: trackId },
		);
		if (!trackData.scene_audio_tracks_by_pk) {
			sendNotFound(res, "Track not found");
			return;
		}
		if (
			!(await canEditProject(
				bootstrap.user.id,
				trackData.scene_audio_tracks_by_pk.project_id,
			))
		) {
			sendUnauthorized(res);
			return;
		}
	} catch (error) {
		console.error("[Audio Story] Error checking track access:", error);
		sendServerError(res, error);
		return;
	}

	try {
		await requestGraphql(
			`
      mutation DeleteAudioTrack($id: uuid!) {
        delete_scene_audio_tracks_by_pk(id: $id) {
          id
        }
      }
    `,
			{ id: trackId },
		);

		sendJson(res, 200, { success: true });
	} catch (error) {
		console.error("[Audio Story] Error deleting track:", error);
		sendServerError(res, error);
	}
}

export default async function handler(
	req: RequestLike,
	res: ResponseLike,
): Promise<void> {
	const pathname = (req.path || req.url || "/") as string;

	// GET /tracks?sceneId=xxx
	if (req.method === "GET" && !pathname.match(/tracks\/[\w-]+/)) {
		await listTracks(req, res);
		return;
	}

	// POST /tracks
	if (req.method === "POST") {
		await createTrack(req, res);
		return;
	}

	// PUT /tracks/:id
	const trackMatch = pathname.match(/^\/tracks\/([\w-]+)$/);
	if (trackMatch) {
		const trackId = trackMatch[1];
		if (req.method === "PUT") {
			await updateTrack(req, res, trackId);
			return;
		}
		if (req.method === "DELETE") {
			await deleteTrack(req, res, trackId);
			return;
		}
	}

	sendMethodNotAllowed(res, ["GET", "POST", "PUT", "DELETE"]);
}
