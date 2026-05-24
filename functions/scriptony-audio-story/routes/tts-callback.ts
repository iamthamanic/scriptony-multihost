/**
 * TTS-Callback — wird von scriptony-audio via Appwrite Execution API aufgerufen.
 *
 * Security:
 *   - Prüft callbackToken aus Body gegen TTS_CALLBACK_SECRET.
 *   - Validiert Track/Clip-Zugehörigkeit vor Mutation.
 *   - Validiert Job-Besitz durch user_id vor Status-Mutation.
 *
 * T31: Module-Independence — keine Imports aus anderen Function-Modulen.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { Storage } from "node-appwrite";
import type { RequestLike, ResponseLike } from "../../_shared/http";
import {
	readJsonBody,
	sendJson,
	sendBadRequest,
	sendUnauthorized,
	sendNotFound,
} from "../../_shared/http";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
	getJobById,
	markJobCompleted,
	markJobFailed,
	getDbClient,
} from "./tts-job";
import { TtsCallbackSchema } from "./tts-schemas";
import { triggerRippleAfterTts } from "./tts-callback-ripple";

/** Rekursiv sortierte kanonische JSON-Serialisierung.
 *  Sortiert Keys auf allen Ebenen und entfernt callbackSignature.
 *  Verhindert Kollisionen bei verschachtelten Feldern wie waveformData.
 */
function canonicalizePayload(payload: Record<string, unknown>): string {
	function sortDeep(obj: unknown): unknown {
		if (Array.isArray(obj)) {
			return obj.map(sortDeep);
		}
		if (obj !== null && typeof obj === "object") {
			const rec = obj as Record<string, unknown>;
			return Object.keys(rec)
				.filter((k) => k !== "callbackSignature")
				.sort()
				.reduce<Record<string, unknown>>((acc, key) => {
					acc[key] = sortDeep(rec[key]);
					return acc;
				}, {});
		}
		return obj;
	}
	return JSON.stringify(sortDeep(payload));
}

export async function ttsCallback(
	req: RequestLike,
	res: ResponseLike,
): Promise<void> {
	let body: Record<string, unknown>;
	try {
		body = await readJsonBody<Record<string, unknown>>(req);
	} catch (_err) {
		sendBadRequest(res, "Invalid JSON body");
		return;
	}

	// 1. Zuerst Schema validieren — HMAC darf nur auf definiertem Vertrag
	//    geprueft werden, nicht auf beliebigen unbekannten Feldern.
	const parseResult = TtsCallbackSchema.safeParse(body);
	if (!parseResult.success) {
		const firstIssue = parseResult.error.issues[0];
		sendBadRequest(
			res,
			`Invalid input: ${firstIssue?.path.join(".")} — ${firstIssue?.message}`,
		);
		return;
	}

	// 2. Auth: HMAC auf dem rohen Body-Vertrag (ohne callbackSignature)
	const callbackSignature = String(body.callbackSignature || "");
	const callbackSecret = process.env.TTS_CALLBACK_SECRET || "";
	if (!callbackSecret || !callbackSignature) {
		sendUnauthorized(res);
		return;
	}
	// Format-Enforcement: Signature muss 64-stelliges Hex sein
	if (!/^[a-f0-9]{64}$/i.test(callbackSignature)) {
		sendUnauthorized(res);
		return;
	}
	const { callbackSignature: _sig, ...restPayload } = body as unknown as Record<
		string,
		unknown
	>;
	const expectedSignature = createHmac("sha256", callbackSecret)
		.update(canonicalizePayload(restPayload))
		.digest("hex");
	const sigBuf = Buffer.from(callbackSignature, "hex");
	const expBuf = Buffer.from(expectedSignature, "hex");
	if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
		sendUnauthorized(res);
		return;
	}

	const callbackData = parseResult.data;
	const success = callbackData.success;
	const jobId = callbackData.jobId;
	const trackId = callbackData.trackId;
	const clipId = callbackData.clipId;
	// Diese Felder existieren nur im success-Fall:
	const audioFileId = success ? callbackData.audioFileId : undefined;
	const durationSec = success ? callbackData.durationSec : undefined;
	const waveformData = success ? callbackData.waveformData : undefined;
	const errorMsg = !success ? callbackData.error : undefined;

	// 1. Job validieren — vor jeglicher Status-Mutation
	const job = await getJobById(jobId);
	if (!job) {
		sendNotFound(res, "Job not found");
		return;
	}

	let payload: Record<string, unknown>;
	try {
		const payloadJson = (job.payload_json as string | null | undefined) || "{}";
		payload = JSON.parse(payloadJson) as Record<string, unknown>;
	} catch {
		await markJobFailed(jobId, "Corrupt job payload_json");
		sendBadRequest(res, "Corrupt job payload");
		return;
	}

	// Replay-Schutz: idempotente Wiederholung fuer completed; Recovery fuer
	//   processing wenn der Clip bereits den target audioFileId hat.
	if (job.status === "completed") {
		// Failure-Callbacks gegen bereits abgeschlossene Jobs ablehnen
		if (!success) {
			sendJson(res, 409, {
				success: false,
				message: "Job already completed — failure callback rejected",
			});
			return;
		}
		let result: Record<string, unknown> = {};
		try {
			result = job.result_json ? JSON.parse(job.result_json) : {};
		} catch {
			result = {};
		}
		const isReplayValid =
			result.audioFileId === audioFileId &&
			payload.trackId === trackId &&
			payload.clipId === clipId;
		if (isReplayValid) {
			sendJson(res, 200, {
				success: true,
				message: "Job already completed — idempotent replay accepted",
			});
			return;
		}
		sendJson(res, 409, {
			success: false,
			message: "Job already completed with different result",
		});
		return;
	}
	if (job.status === "failed" || job.status === "cancelled") {
		sendJson(res, 409, {
			success: false,
			message: `Job is already ${job.status}`,
		});
		return;
	}
	if (job.status !== "processing" && job.status !== "queued") {
		sendJson(res, 409, {
			success: false,
			message: `Job status is ${job.status} — expected processing or queued`,
		});
		return;
	}
	// 2. Fehlerfall — Fehler in TTS-Verarbeitung
	// Security: Bevor wir den Job failen, muessen wir die Payload-Identifiers
	//   validieren, damit kein autorisierter Caller beliebige Jobs failen kann.
	if (!success) {
		if (!errorMsg) {
			sendBadRequest(res, "error is required for failure callback");
			return;
		}
		// Ownership-Check: trackId + clipId + userId muessen zum Job-Payload passen
		if (
			payload.trackId !== trackId ||
			payload.clipId !== clipId ||
			job.user_id !== payload.userId
		) {
			sendBadRequest(res, "Track/Clip/User mismatch with job payload");
			return;
		}
		console.warn("[tts/callback] TTS failed:", { jobId, error: errorMsg });
		await markJobFailed(jobId, errorMsg);
		sendJson(res, 200, {
			success: false,
			message: "Failure recorded",
		});
		return;
	}

	// 3. ID-Validierung gegen Job-Payload (VOR DB-Reads – verhindert Info-Leak)
	if (
		payload.trackId !== trackId ||
		payload.clipId !== clipId ||
		job.user_id !== payload.userId
	) {
		sendBadRequest(res, "Track/Clip/User mismatch with job payload");
		return;
	}

	// 4. Track laden
	const trackResult = await requestGraphql<{
		scene_audio_tracks_by_pk?: {
			project_id: string;
			scene_id: string;
		} | null;
	}>(
		`query GetTrack($id: uuid!) {
			scene_audio_tracks_by_pk(id: $id) {
				project_id
				scene_id
			}
		}`,
		{ id: trackId },
	);

	const track = trackResult?.scene_audio_tracks_by_pk;
	if (!track) {
		sendNotFound(res, "Track not found");
		return;
	}

	// 5. Clip laden
	const clipResult = await requestGraphql<{
		audio_clips_by_pk?: {
			scene_id: string;
			track_id: string;
			start_sec: number;
			end_sec: number;
		} | null;
	}>(
		`query GetClip($id: uuid!) {
			audio_clips_by_pk(id: $id) {
				scene_id
				track_id
				start_sec
				end_sec
			}
		}`,
		{ id: clipId },
	);

	const clip = clipResult?.audio_clips_by_pk;
	if (!clip) {
		sendNotFound(res, "Clip not found");
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

	// 6. Projekt-Validierung (Track muss zum Projekt im Job-Payload passen)
	if (payload.projectId !== track.project_id) {
		sendBadRequest(res, "Project/User mismatch with job payload");
		return;
	}

	// Recovery: Job ist processing, aber Clip wurde schon updated (z.B.
	//   weil ein vorheriger Callback markJobCompleted nicht erreicht hat).
	// NUR nach Ownership-Validierung, damit kein unauthorisierter Recovery.
	// Vor markJobCompleted: success-payload validieren.
	if (job.status === "processing") {
		if (
			typeof durationSec !== "number" ||
			!Number.isFinite(durationSec) ||
			durationSec <= 0
		) {
			sendBadRequest(
				res,
				"durationSec must be a finite positive number (greater than 0)",
			);
			return;
		}
		if (!audioFileId) {
			sendBadRequest(res, "audioFileId is required for successful callback");
			return;
		}
		const clipCheck = await requestGraphql<{
			audio_clips_by_pk?: { audio_file_id: string | null } | null;
		}>(
			`query CheckClip($id: uuid!) { audio_clips_by_pk(id: $id) { audio_file_id } }`,
			{ id: clipId },
		);
		if (clipCheck?.audio_clips_by_pk?.audio_file_id === audioFileId) {
			try {
				await markJobCompleted(jobId, {
					audioFileId: audioFileId || null,
					durationSec: durationSec ?? 0,
					trackId,
					clipId,
				});
			} catch (completedErr) {
				console.error("[tts/callback] markJobCompleted failed:", completedErr);
				sendJson(res, 500, {
					success: false,
					message: "Clip updated but job completion failed",
				});
				return;
			}
			sendJson(res, 200, {
				success: true,
				message: "Clip already updated — job completed on recovery",
			});
			return;
		}
	}

	// 7. durationSec + audioFileId validieren (nur zurueckweisen, nicht Job failen)
	if (
		typeof durationSec !== "number" ||
		!Number.isFinite(durationSec) ||
		durationSec <= 0
	) {
		sendBadRequest(
			res,
			"durationSec must be a finite positive number (greater than 0)",
		);
		return;
	}
	if (!audioFileId) {
		sendBadRequest(res, "audioFileId is required for successful callback");
		return;
	}
	// T31: Waveform-Extraktion aus MP3 ist noch nicht implementiert;
	//   nur null ist erlaubt, damit keine ungebundenen Daten ueber Callback
	//   in die DB gelangen.
	if (waveformData != null) {
		sendBadRequest(res, "waveformData must be null in T31");
		return;
	}

	// 8. Clip zuerst aktualisieren, dann Job als completed markieren.
	const newEndSec = clip.start_sec + durationSec;
	const waveformJson = JSON.stringify(waveformData ?? []);
	const now = new Date().toISOString();

	try {
		const updateResult = await requestGraphql<{
			update_audio_clips_by_pk?: {
				id: string | null;
				end_sec: number | null;
			} | null;
		}>(
			`
				mutation UpdateClip(
					$id: uuid!,
					$audioFileId: String,
					$endSec: Float,
					$waveformData: String,
					$updatedAt: timestamptz
				) {
					update_audio_clips_by_pk(
						pk_columns: { id: $id },
						_set: {
							audio_file_id: $audioFileId,
							end_sec: $endSec,
							waveform_data: $waveformData,
							updated_at: $updatedAt,
						}
					) {
						id
						end_sec
					}
				}
			`,
			{
				id: clipId,
				audioFileId: audioFileId ?? null,
				endSec: newEndSec,
				waveformData: waveformJson,
				updatedAt: now,
			},
		);
		if (!updateResult?.update_audio_clips_by_pk?.id) {
			throw new Error("UpdateClip returned null — clip may not exist");
		}
	} catch (error) {
		console.error("[tts/callback] Clip update failed:", error);
		// Idempotenz-Check: pruefe, ob der Clip bereits denselben audioFileId
		//   hat (z.B. weil ein vorheriger Retry erfolgreich war). Dann ist
		//   der Fehler harmlos und wir koennen fortsetzen.
		const clipCheck = await requestGraphql<{
			audio_clips_by_pk?: { audio_file_id: string | null } | null;
		}>(
			`query CheckClip($id: uuid!) { audio_clips_by_pk(id: $id) { audio_file_id } }`,
			{ id: clipId },
		);
		if (clipCheck?.audio_clips_by_pk?.audio_file_id === audioFileId) {
			console.warn(
				"[tts/callback] Clip already has target audioFileId — idempotent continue",
			);
		} else {
			// Cleanup: hochgeladene Audio-Datei loeschen, damit keine verwaiste
			//   Datei im Storage zurueckbleibt
			if (audioFileId) {
				try {
					const client = getDbClient();
					const storage = new Storage(client);
					const bucketId =
						process.env.AUDIO_STORAGE_BUCKET || "scriptony_audio";
					await storage.deleteFile(bucketId, audioFileId);
				} catch (cleanupErr) {
					console.error("[tts/callback] Storage cleanup failed:", cleanupErr);
				}
			}
			await markJobFailed(jobId, String(error));
			sendJson(res, 500, {
				success: false,
				message: "Clip update failed — job marked as failed",
			});
			return;
		}
	}

	// Track-Markierung ist sekundaer — darf nicht blockieren
	try {
		await requestGraphql(
			`
				mutation MarkTrackGenerated($id: uuid!) {
					update_scene_audio_tracks_by_pk(
						pk_columns: { id: $id },
						_set: { tts_audio_generated: true }
					) {
						id
					}
				}
			`,
			{ id: trackId },
		);
	} catch (trackErr) {
		console.error("[tts/callback] Track mark failed:", trackErr);
	}

	// T31: Ripple nach TTS-Abschluss

	let rippleWarning: string | undefined;
	try {
		await triggerRippleAfterTts({
			clipId,
			newEndSec,
			previousEndSec: clip.end_sec,
			projectId: track.project_id,
		});
	} catch (rippleErr) {
		console.error("[tts/callback] Ripple failed:", rippleErr);
		rippleWarning =
			rippleErr instanceof Error ? rippleErr.message : String(rippleErr);
	}

	// Job erst nach erfolgreicher Clip-Mutation als completed markieren
	try {
		await markJobCompleted(jobId, {
			audioFileId: audioFileId || null,
			durationSec: durationSec ?? 0,
			trackId,
			clipId,
		});
	} catch (completedErr) {
		console.error("[tts/callback] markJobCompleted failed:", completedErr);
		// Clip ist aktualisiert, aber Job-Completion fehlgeschlagen.
		// 502: Clip OK, job completion failed — retry recommended.
		sendJson(res, 502, {
			success: true,
			clipId,
			newEndSec,
			warning: "Clip updated but job completion failed — retry recommended",
		});
		return;
	}

	sendJson(res, 200, {
		success: true,
		clipId,
		newEndSec,
		...(rippleWarning ? { rippleWarning } : {}),
		message: "Clip updated after TTS",
	});
}
