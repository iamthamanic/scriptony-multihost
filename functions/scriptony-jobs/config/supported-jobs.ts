/**
 * T14 Supported Jobs Registry.
 * Neue Job-Typen nur mit Eintrag + Worker-Support.
 *
 * HINWEIS T15: Media-Worker-Job-Typen sind NICHT in dieser Registry.
 * Sie werden ausschliesslich ueber `scriptony-media-worker` (Direct DB Write)
 * erstellt, nicht ueber `POST /v1/jobs/:functionName`. Der Trigger-Pfad
 * (`triggerFunctionExecution`) wuerde 404 liefern, weil
 * `scriptony-media-worker` keinen Default-Job-Execution-Handler hat.
 * Siehe docs/job-schema.md "Direct-DB-Write Pfad".
 */

export const SUPPORTED_JOBS: Record<
	string,
	{ functionId: string; timeoutMs: number; requiresAuth: boolean }
> = {
	"style-guide": {
		functionId: "scriptony-style-guide",
		timeoutMs: 120_000,
		requiresAuth: true,
	},
	"image-generate": {
		functionId: "scriptony-image",
		timeoutMs: 180_000,
		requiresAuth: true,
	},
	"audio-process": {
		functionId: "scriptony-audio",
		timeoutMs: 300_000,
		requiresAuth: true,
	},
	// T31: tts-generate wird ueber direkte Execution (scriptony-audio-story → scriptony-audio)
	//   abgewickelt, nicht ueber den Jobs-Control-Plane. Siehe tts-job.ts.
	"audio-production-generate": {
		functionId: "scriptony-audio-story",
		timeoutMs: 300_000,
		requiresAuth: true,
	},
	"audio-production-preview": {
		functionId: "scriptony-audio-story",
		timeoutMs: 300_000,
		requiresAuth: true,
	},
	"audio-production-export": {
		functionId: "scriptony-audio-story",
		timeoutMs: 600_000,
		requiresAuth: true,
	},
};
