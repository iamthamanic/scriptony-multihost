/**
 * TTS-Generierungs-Routen für scriptony-audio-story.
 *
 * SRP: Router für TTS-Endpunkte. Erstellt TTS-Jobs, liefert Status.
 * Keine TTS-Engine-Logik hier — die lebt in scriptony-audio.
 *
 * T31: Module-Independence: Keine Imports aus anderen Function-Modulen.
 */

import type { RequestLike, ResponseLike } from "../../_shared/http";
import { randomUUID } from "node:crypto";
import { requireUserBootstrap } from "../../_shared/auth";
import {
	getParam,
	readJsonBody,
	sendJson,
	sendBadRequest,
	sendUnauthorized,
	sendServerError,
	sendNotFound,
} from "../../_shared/http";
import { getPathname } from "../../_shared/appwrite-handler";
import { requestGraphql } from "../../_shared/graphql-compat";
import { canEditProject } from "../_shared/access";
import {
	createTtsJob,
	getJobById,
	markJobFailed,
	triggerFunctionExecution,
} from "./tts-job";
import { TtsGenerateSchema } from "./tts-schemas";
import { ttsCallback } from "./tts-callback";

// =============================================================================
// POST /tts/generate
// =============================================================================

export async function generateTts(
	req: RequestLike,
	res: ResponseLike,
): Promise<void> {
	const bootstrap = await requireUserBootstrap(req);
	if (!bootstrap) {
		sendUnauthorized(res);
		return;
	}

	let body: Record<string, unknown>;
	try {
		body = await readJsonBody<Record<string, unknown>>(req);
	} catch (_err) {
		sendBadRequest(res, "Invalid JSON body");
		return;
	}
	const parseResult = TtsGenerateSchema.safeParse(body);
	if (!parseResult.success) {
		const firstIssue = parseResult.error.issues[0];
		sendBadRequest(
			res,
			`Invalid input: ${firstIssue?.path.join(".")} — ${firstIssue?.message}`,
		);
		return;
	}

	const {
		trackId,
		text,
		voiceId,
		clipId: explicitClipId,
		emotion,
		speed,
		stability,
		style,
	} = parseResult.data;

	// Track + Clip lesen (Module-Independence: direkter DB-Zugriff)
	const trackResult = await requestGraphql<{
		scene_audio_tracks_by_pk?: {
			project_id: string;
			scene_id: string;
		} | null;
	}>(
		`

			query GetTrackAndClip($trackId: uuid!) {
				scene_audio_tracks_by_pk(id: $trackId) {
					project_id
					scene_id
				}
			}
		`,
		{ trackId },
	);

	const track = trackResult?.scene_audio_tracks_by_pk;
	if (!track?.project_id) {
		// T31: Keine Details ueber Existenz/Struktur leaken — generische Meldung
		sendNotFound(res, "Resource not found or access denied");
		return;
	}

	const projectId = track.project_id;

	// Berechtigung SOFORT pruefen, bevor weitere DB-Reads Leaks ermoeglichen
	if (!(await canEditProject(bootstrap.user.id, projectId))) {
		// T31: Kein Unterschied zwischen 403 und 404 — gleiche Meldung
		sendNotFound(res, "Resource not found or access denied");
		return;
	}

	// clipId ist verpflichtend — kein Fallback auf letzten Clip (verhindert
	//   falsche Mutation bei mehreren Clips pro Track)
	const clipId: string | undefined = explicitClipId;
	if (clipId) {
		// Validiere, dass der explizite Clip zum Track und zur Scene gehoert
		const clipResult = await requestGraphql<{
			audio_clips_by_pk?: {
				track_id: string;
				scene_id: string;
				project_id: string;
			} | null;
		}>(
			`query ValidateClip($id: uuid!) {
					audio_clips_by_pk(id: $id) {
						track_id
						scene_id
						project_id
					}
				}`,
			{ id: clipId },
		);
		const clip = clipResult?.audio_clips_by_pk;
		if (!clip) {
			sendBadRequest(res, "Clip not found");
			return;
		}
		if (clip.track_id !== trackId) {
			sendBadRequest(res, "Clip does not belong to the specified track");
			return;
		}
		if (clip.scene_id !== track.scene_id) {
			sendBadRequest(res, "Clip does not belong to track's scene");
			return;
		}
		if (clip.project_id !== projectId) {
			sendBadRequest(res, "Clip does not belong to the specified project");
			return;
		}
	}

	if (!clipId) {
		sendBadRequest(res, "clipId is required for TTS generation");
		return;
	}

	try {
		const claimToken = randomUUID();
		const job = await createTtsJob(bootstrap.user.id, {
			trackId,
			clipId,
			projectId,
			text,
			voiceId,
			emotion: emotion ?? null,
			speed: speed ?? 1.0,
			stability: stability ?? 0.5,
			style: style ?? 0.0,
			userId: bootstrap.user.id,
			claimToken,
		});

		try {
			const audioFunctionId =
				process.env.AUDIO_FUNCTION_ID || "scriptony-audio";
			await triggerFunctionExecution(
				audioFunctionId,
				job.$id,
				bootstrap.user.id,
			);

			sendJson(res, 202, {
				success: true,
				jobId: job.$id,
				status: "queued",
				message: "TTS job queued",
			});
		} catch (err) {
			console.error("[tts/generate] Trigger failed:", err);
			await markJobFailed(
				job.$id,
				err instanceof Error ? err.message : String(err),
			);
			sendJson(res, 422, {
				success: false,
				jobId: job.$id,
				status: "failed",
				error: err instanceof Error ? err.message : "Trigger failed",
			});
		}
	} catch (error) {
		console.error("[tts/generate] Error:", error);
		sendServerError(res, "Failed to create TTS job");
	}
}

// =============================================================================
// GET /tts/status/:id
// =============================================================================

export async function getTtsStatus(
	req: RequestLike,
	res: ResponseLike,
): Promise<void> {
	const bootstrap = await requireUserBootstrap(req);
	if (!bootstrap) {
		sendUnauthorized(res);
		return;
	}

	const pathname = getPathname(req);
	const jobIdMatch = pathname.match(/\/status\/([^/]+)/);
	const jobId = jobIdMatch
		? decodeURIComponent(jobIdMatch[1])
		: getParam(req, "id");
	if (!jobId || !/^[a-zA-Z0-9_-]{7,64}$/.test(jobId)) {
		sendBadRequest(res, "Invalid jobId format");
		return;
	}

	try {
		const job = await getJobById(jobId);
		if (!job) {
			sendNotFound(res, "Job not found");
			return;
		}

		if (job.user_id !== bootstrap.user.id) {
			sendNotFound(res);
			return;
		}

		let result: Record<string, unknown> | undefined;
		if (job.result_json) {
			try {
				result = JSON.parse(job.result_json) as Record<string, unknown>;
			} catch {
				result = undefined;
			}
		}

		sendJson(res, 200, {
			jobId: job.$id,
			status: job.status,
			progress: job.progress,
			error: job.error,
			result,
		});
	} catch (error) {
		console.error("[tts/status] Error:", error);
		sendServerError(res, "Failed to fetch job status");
	}
}

// =============================================================================
// Router Export
// =============================================================================

export default async function ttsRoutes(
	req: RequestLike,
	res: ResponseLike,
): Promise<void> {
	const method = req.method?.toUpperCase() || "GET";
	const pathname = getPathname(req);

	if (method === "POST" && pathname === "/tts/callback") {
		await ttsCallback(req, res);
		return;
	}

	if (
		method === "POST" &&
		(pathname === "/tts" || pathname === "/tts/generate")
	) {
		await generateTts(req, res);
		return;
	}

	if (method === "GET" && pathname.includes("/status/")) {
		await getTtsStatus(req, res);
		return;
	}

	sendJson(res, 404, { error: "Not found" });
}
