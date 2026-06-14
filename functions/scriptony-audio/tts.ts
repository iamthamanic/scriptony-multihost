/**
 * 🔊 SCRIPTONY AUDIO TTS - Text-to-Speech Edge Function
 *
 * Speech Synthesis Service for Scriptony:
 * - Convert text to speech
 * - Multiple providers: OpenAI TTS, ElevenLabs, Google TTS
 * - Multiple voices and languages
 * - Audio format options (MP3, WAV, etc.)
 *
 * Uses centralized AI service from _shared/ai-service/
 */

import "../_shared/fetch-polyfill";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Client, Databases, Query } from "node-appwrite";
import { createHmac, timingSafeEqual } from "node:crypto";
import { type AuthSource, requireAuthenticatedUser } from "../_shared/auth";
import { createHonoAppwriteHandler } from "../_shared/hono-appwrite-handler";
import process from "node:process";

// =============================================================================
// SETUP
// =============================================================================

export const app = new Hono();

// T31: Getrennte Clients — Admin-Client (mit API Key) fuer privilegierte
//   Operationen, User-Client (ohne API Key) fuer user-facing Routen.
const apiKey = process.env.APPWRITE_API_KEY || "";

const adminClient = new Client()
  .setEndpoint(
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
      process.env.APPWRITE_ENDPOINT ||
      "",
  )
  .setProject(
    process.env.APPWRITE_FUNCTION_PROJECT_ID ||
      process.env.APPWRITE_PROJECT_ID ||
      "",
  );
if (apiKey) {
  adminClient.setKey(apiKey);
}

const databases = new Databases(adminClient);

// Database IDs
const AUDIO_DB_ID = process.env.AUDIO_DATABASE_ID || "scriptony_audio";
const SYNTHESIS_COLLECTION = "synthesis";

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Appwrite-Key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Auth middleware
async function getUserIdFromAuth(
  authSource: AuthSource,
): Promise<string | null> {
  const user = await requireAuthenticatedUser(authSource);
  return user?.id || null;
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get("/", (c) => {
  return c.json({
    status: "ok",
    function: "scriptony-audio-tts",
    version: "1.0.0",
    message: "Scriptony Text-to-Speech Service",
    endpoints: [
      "POST /synthesize - Convert text to speech",
      "POST /synthesize/stream - Stream synthesis (for long texts)",
      "GET /voices - List available voices",
      "GET /history - Get synthesis history",
      "GET /providers - List TTS-capable providers",
      "GET /models - List available TTS models",
    ],
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// =============================================================================
// PROVIDERS ROUTES
// =============================================================================

/**
 * GET /providers
 * List all TTS-capable providers
 */
app.get("/providers", async (c) => {
  const { PROVIDER_CAPABILITIES, PROVIDER_DISPLAY_NAMES } =
    await import("../_shared/ai-service/providers");

  const ttsProviders = Object.entries(PROVIDER_CAPABILITIES)
    .filter(([_name, caps]) => caps.audio_tts)
    .map(([name, caps]) => ({
      id: name,
      name: PROVIDER_DISPLAY_NAMES[name] || name,
      capabilities: caps,
    }));

  return c.json({ providers: ttsProviders });
});

/**
 * GET /models
 * List all TTS models
 */
app.get("/models", async (c) => {
  const { getModelsForFeature } = await import("../_shared/ai-service/config");

  const models = getModelsForFeature("audio_tts");

  return c.json({ models });
});

// =============================================================================
// VOICES ROUTES
// =============================================================================

/**
 * GET /voices
 * List available voices for TTS
 */
app.get("/voices", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const provider = c.req.query("provider") || "openai"; // NOTE: ignored by synthesize() — resolved from feature config

  try {
    const { getVoices } = await import("../_shared/ai-service");

    const voices = await getVoices(userId, { provider });

    return c.json({ voices });
  } catch (_error: any) {
    // Return default voices if provider doesn't support voice listing
    const { OPENAI_TTS_VOICES } =
      await import("../_shared/ai-service/services/tts");
    const defaultVoices: Record<string, any> = {
      openai: OPENAI_TTS_VOICES.map((v) => ({ ...v, gender: "neutral" })),
      elevenlabs: [
        { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "female" },
        { id: "AZnzlk1XvdvUkg3lJpIB", name: "Domi", gender: "male" },
        { id: "EXAVITQu4vrhnxnUiwQ0", name: "Bella", gender: "female" },
        { id: "VR6AewZ2W9e8O7y5iQ6I", name: "Antoni", gender: "male" },
        { id: "pNInz6obpgDQG4Oca3Ib", name: "Adam", gender: "male" },
      ],
      google: [
        { id: "en-US-Neural2-A", name: "Neural2-A (US)", gender: "female" },
        { id: "en-US-Neural2-C", name: "Neural2-C (US)", gender: "male" },
        { id: "en-GB-Neural2-A", name: "Neural2-A (UK)", gender: "female" },
        { id: "en-GB-Neural2-B", name: "Neural2-B (UK)", gender: "male" },
      ],
    };

    const voices = defaultVoices[provider] || [];
    return c.json({ voices });
  }
});

// =============================================================================
// SYNTHESIS ROUTES
// =============================================================================

/**
 * POST /synthesize
 * Convert text to speech
 */
app.post("/synthesize", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const {
    text,
    provider = "openai", // NOTE: ignored by synthesize() — resolved from feature config
    model = "tts-1", // NOTE: ignored by synthesize() — resolved from feature config
    voice = "alloy",
    speed = 1.0,
    format = "mp3",
    language,
    save_to_history = true,
  } = body;

  if (!text) {
    return c.json({ error: "Text required" }, 400);
  }

  if (text.length > 10000) {
    return c.json({ error: "Text too long (max 10000 characters)" }, 400);
  }

  try {
    const { synthesize } = await import("../_shared/ai-service");
    const responseFormat =
      format === "wav" || format === "pcm" ? format : "mp3";

    const result = await synthesize(userId, text, {
      provider,
      model,
      voice,
      speed,
      responseFormat,
      language,
    });
    const audioUrl = `data:audio/${result.format};base64,${result.audioBuffer.toString(
      "base64",
    )}`;

    // Save to history if requested
    if (save_to_history) {
      try {
        await databases.createDocument(
          AUDIO_DB_ID,
          SYNTHESIS_COLLECTION,
          "unique()",
          {
            user_id: userId,
            text_preview: text.substring(0, 200),
            text_length: text.length,
            provider,
            model,
            voice,
            audio_url: audioUrl,
            duration: result.duration,
            created_at: new Date().toISOString(),
          },
        );
      } catch (e) {
        console.log("Could not save synthesis:", e);
      }
    }

    return c.json({
      success: true,
      audio: {
        url: audioUrl,
        duration: result.duration,
        format: result.format,
        voice,
        provider,
      },
    });
  } catch (error: any) {
    console.error("Synthesis error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});

/**
 * POST /synthesize/stream
 * Stream synthesis for long texts
 */
app.post("/synthesize/stream", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const {
    text_chunks,
    provider = "openai", // NOTE: ignored by synthesize() — resolved from feature config
    model = "tts-1", // NOTE: ignored by synthesize() — resolved from feature config
    voice = "alloy",
    format = "mp3",
  } = body;

  if (!text_chunks || !Array.isArray(text_chunks) || text_chunks.length === 0) {
    return c.json({ error: "text_chunks array required" }, 400);
  }

  if (text_chunks.length > 50) {
    return c.json({ error: "Maximum 50 chunks per request" }, 400);
  }

  try {
    const { synthesize } = await import("../_shared/ai-service");

    const results = await Promise.all(
      text_chunks.map(async (text: string, index: number) => {
        if (!text || text.length > 10000) {
          return {
            index,
            success: false,
            error: text ? "Text too long" : "Text required",
          };
        }

        try {
          const responseFormat =
            format === "wav" || format === "pcm" ? format : "mp3";
          const result = await synthesize(userId, text, {
            provider,
            model,
            voice,
            responseFormat,
          });
          return { index, success: true, ...result };
        } catch (error: any) {
          return {
            index,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    const successful = results.filter((r: any) => r.success);
    const failed = results.filter((r: any) => !r.success);

    return c.json({
      success: true,
      total: text_chunks.length,
      synthesized: successful.length,
      failed: failed.length,
      chunks: successful,
      errors: failed.length > 0 ? failed : undefined,
    });
  } catch (error: any) {
    console.error("Stream synthesis error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});

// =============================================================================
// JOB PROCESSING (T31)
// =============================================================================

/**
 * POST /tts/job
 * Verarbeitet einen TTS-Job (wird von scriptony-jobs aufgerufen).
 *
 * Payload:
 *   - trackId, clipId, projectId, text, voiceId
 *   - emotion, speed, stability, style (optional)
 *
 * Flow:
 *   1. TTS-Synthese
 *   2. Upload zu Appwrite Storage
 *   3. Duration + Waveform extrahieren
 *   4. Callback an scriptony-audio-story /tts/callback
 */
/**
 * Triggert scriptony-audio-story /tts/callback via Appwrite Execution API.
 * Verwendet den lokalen Appwrite-Endpoint + API-Key; kein HTTP-Callback nötig.
 */
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

async function triggerAudioStoryCallback(
  payload: Record<string, unknown>,
): Promise<void> {
  const endpoint =
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    process.env.APPWRITE_ENDPOINT ||
    "";
  const apiKey = process.env.APPWRITE_API_KEY;
  const projectId =
    process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const functionId =
    process.env.AUDIO_STORY_FUNCTION_ID || "scriptony-audio-story";

  if (!endpoint || !apiKey || !projectId) {
    throw new Error("Missing Appwrite credentials for callback trigger");
  }

  const callbackSecret = process.env.TTS_CALLBACK_SECRET || "";
  if (!callbackSecret) {
    throw new Error("Missing TTS_CALLBACK_SECRET for callback auth");
  }

  // T31: Strengte lokale Endpoint-Erkennung — verhindert localhost.evil.com
  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    throw new Error("Invalid APPWRITE_ENDPOINT URL format");
  }
  const isLocal =
    ["localhost", "127.0.0.1", "[::1]"].includes(parsedEndpoint.hostname) ||
    parsedEndpoint.hostname === "[::1]";
  if (!isLocal && !endpoint.startsWith("https://")) {
    throw new Error("Secure endpoint required for callback trigger");
  }

  // HMAC-Signatur der Payload (Secret nie im Body)
  const callbackSignature = createHmac("sha256", callbackSecret)
    .update(canonicalizePayload(payload))
    .digest("hex");

  const res = await fetch(`${endpoint}/v1/functions/${functionId}/executions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Key": apiKey,
      "X-Appwrite-Project": projectId,
    },
    body: JSON.stringify({
      async: false,
      path: "/tts/callback",
      method: "POST",
      body: JSON.stringify({
        ...payload,
        callbackSignature,
      }),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Callback trigger failed: ${res.status} ${text}`);
  }

  // T31: Pruefe ob die Callback-Execution intern erfolgreich war.
  //   Appwrite Execution API: responseStatusCode (number) ist verlaesslich,
  //   status (string wie 'completed'/'failed') ist KEIN HTTP-Statuscode.
  try {
    const executionResult = await res.json();
    const statusCode =
      executionResult?.responseStatusCode ?? executionResult?.statusCode;
    if (
      typeof statusCode === "number" &&
      (statusCode < 200 || statusCode >= 300)
    ) {
      const body =
        typeof executionResult?.responseBody === "string"
          ? executionResult.responseBody
          : JSON.stringify(executionResult?.responseBody ?? "");
      throw new Error(`Callback returned ${statusCode}: ${body.slice(0, 500)}`);
    }
  } catch (parseErr: unknown) {
    // Fail closed: Wenn wir den Response nicht parsen koennen,
    //   koennen wir nicht verifizieren, dass der Callback erfolgreich war.
    if (
      parseErr instanceof Error &&
      parseErr.message.startsWith("Callback returned")
    ) {
      throw parseErr;
    }
    throw new Error(
      `Callback execution result could not be verified: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
    );
  }
}

function verifyJobSignature(
  jobId: string,
  userId: string,
  signature: string,
): boolean {
  const secret = process.env.TTS_JOB_SECRET || "";
  if (!secret || !signature) return false;
  // Format-Enforcement: Signature muss 64-stelliges Hex sein
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret)
    .update(`${jobId}:${userId}`)
    .digest("hex");
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length) return false;
  try {
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

app.post("/tts/job", async (c) => {
  // Interne Auth: Nur HMAC-Signatur — kein Vertrauen auf Execution-Header.
  //   Appwrite-Execution-Header koennen auch von direkten HTTP-Calls
  //   gesetzt werden. Der serverseitige TTS_JOB_SECRET ist die einzige
  //   verlaessliche Grenze.
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch (_parseErr) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { __jobId, __userId, __signature } = body;
  if (typeof __jobId !== "string" || typeof __userId !== "string") {
    return c.json({ error: "Missing __jobId or __userId" }, 400);
  }
  if (
    typeof __signature !== "string" ||
    !verifyJobSignature(__jobId, __userId, __signature)
  ) {
    return c.json({ error: "Unauthorized — signature mismatch" }, 401);
  }

  if (!apiKey) {
    return c.json(
      { error: "Server configuration error — missing API key" },
      500,
    );
  }
  const dbId = process.env.APPWRITE_DATABASE_ID || "scriptony";
  const jobsColl = "jobs";
  let trackId = "";
  let clipId = "";

  try {
    // Job laden und Besitz pruefen BEVOR Status zurueckgegeben wird
    const job = await databases.getDocument(dbId, jobsColl, __jobId);
    if (!job || job.user_id !== __userId) {
      return c.json({ error: "Job not found" }, 404);
    }

    const payloadJson = (job.payload_json as string | null | undefined) || "{}";
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    if (payload.userId !== __userId) {
      return c.json({ error: "Job not found" }, 404);
    }

    if (job.status !== "queued" && job.status !== "processing") {
      return c.json({ error: `Job status is ${job.status}` }, 409);
    }

    trackId = payload.trackId as string;
    clipId = payload.clipId as string;
    const text = payload.text;
    const voiceId = payload.voiceId;
    const speed = typeof payload.speed === "number" ? payload.speed : 1.0;

    const TEXT_MAX_LEN = 10_000;
    if (
      typeof trackId !== "string" ||
      typeof clipId !== "string" ||
      typeof text !== "string" ||
      text.length > TEXT_MAX_LEN ||
      typeof voiceId !== "string"
    ) {
      const msg =
        typeof text === "string" && text.length > TEXT_MAX_LEN
          ? `Text exceeds maximum length of ${TEXT_MAX_LEN} characters`
          : "Job payload invalid";
      console.error(`[tts/job] ${msg}`);
      // Vor Validierungsfehler: Job auf failed setzen
      try {
        await databases.updateDocument(dbId, jobsColl, __jobId, {
          status: "failed",
          error: msg,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (markErr) {
        console.error("[tts/job] Failed to mark job failed:", markErr);
      }
      return c.json({ error: msg }, 400);
    }

    // Erst nach erfolgreicher Validierung: Job auf processing setzen
    if (job.status === "queued") {
      await databases.updateDocument(dbId, jobsColl, __jobId, {
        status: "processing",
      });
    }

    // 1. TTS-Synthese
    const { synthesize } = await import("../_shared/ai-service");
    const synthResult = await synthesize(__userId, text, {
      provider: "openai", // T31: Erster Provider, spaeter ElevenLabs
      voice: voiceId,
      speed,
      responseFormat: "mp3",
    });

    // 2. Upload zu Appwrite Storage
    const { Storage, ID } = await import("node-appwrite");
    const storage = new Storage(adminClient);
    const bucketId = process.env.AUDIO_STORAGE_BUCKET || "scriptony_audio";

    const { InputFile } = await import("node-appwrite/file");
    const safeTrackId = String(trackId)
      .replace(/[^a-zA-Z0-9-_]/g, "")
      .slice(0, 64);
    const uploadResult = await storage.createFile(
      bucketId,
      ID.unique(),
      InputFile.fromBuffer(synthResult.audioBuffer, `tts-${safeTrackId}.mp3`),
    );

    const audioFileId = uploadResult.$id;

    // 3. Duration: Provider-Meta oder Fallback (Bitrate-Schaetzung)
    // FIXME T33: Wenn Provider keine Duration liefert, nutzen wir eine
    //   bitrate-basierte Schaetzung. Das ist ein Provisorium — die echte
    //   Dauer muss spaeter per Audio-Decodierung ermittelt und der Clip
    //   korrigiert werden (duration_provisional = true).
    const durationSec =
      synthResult.duration ??
      Math.max(1, synthResult.audioBuffer.length / ((128 * 1024) / 8)); // ~128kbps MP3 Fallback
    if (!synthResult.duration) {
      console.warn(
        "[tts/job] Estimated duration fallback used — will be corrected in T33",
      );
    }

    // 4. Waveform: Keine echte Extraktion aus MP3 ohne Decodierung.
    //    Null = Frontend zeigt solid border ohne Waveform an.
    const waveformData: number[] | null = null;

    // 5. Callback an scriptony-audio-story via Appwrite Execution API
    try {
      await triggerAudioStoryCallback({
        jobId: __jobId,
        trackId,
        clipId,
        audioFileId,
        durationSec,
        waveformData,
        success: true,
      });
    } catch (callbackErr: any) {
      console.error("[tts/job] Callback error:", callbackErr);
      let cleanupError = "";
      // Cleanup: Upload rueckgaengig machen
      try {
        await storage.deleteFile(bucketId, audioFileId);
      } catch (cleanupErr) {
        cleanupError =
          cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
        console.error("[tts/job] Cleanup failed:", cleanupErr);
      }
      const mainError =
        callbackErr instanceof Error ? callbackErr.message : "Callback error";
      const combinedError = cleanupError
        ? `${mainError} | cleanup: ${cleanupError}`
        : mainError;
      // Job direkt als failed markieren, falls Callback nicht verfuegbar
      try {
        await databases.updateDocument(dbId, jobsColl, __jobId, {
          status: "failed",
          error: combinedError,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (markErr) {
        console.error("[tts/job] Failed to mark job as failed:", markErr);
      }
      return c.json(
        {
          success: false,
          error: combinedError,
        },
        500,
      );
    }

    return c.json({
      success: true,
      audioFileId,
      durationSec,
      waveformData,
    });
  } catch (error: any) {
    console.error("[tts/job] Error:", error);
    // Fehler-Callback VOR markJobFailed senden, damit ttsCallback
    //   den Job im processing-Status akzeptiert (nicht bereits failed).
    if (trackId && clipId) {
      try {
        await triggerAudioStoryCallback({
          jobId: __jobId,
          trackId,
          clipId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      } catch (callbackErr: any) {
        console.error("[tts/job] Error callback failed:", callbackErr);
      }
    } else {
      console.error(
        "[tts/job] Fatal error before payload resolved:",
        error.message,
      );
    }

    // Immer versuchen, den Job als failed zu markieren, auch wenn
    //   trackId/clipId noch nicht resolved sind
    try {
      await databases.updateDocument(dbId, jobsColl, __jobId, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (markErr) {
      console.error("[tts/job] Failed to mark job as failed:", markErr);
    }

    return c.json(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});

// =============================================================================
// HISTORY ROUTES
// =============================================================================

/**
 * GET /history
 * Get user's synthesis history
 */
app.get("/history", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  try {
    const response = await databases.listDocuments(
      AUDIO_DB_ID,
      SYNTHESIS_COLLECTION,
      [
        Query.equal("user_id", userId),
        Query.orderDesc("created_at"),
        Query.limit(limit),
        Query.offset(offset),
      ],
    );

    return c.json({
      synthesis: response.documents,
      total: response.total,
    });
  } catch (_error: any) {
    // Return empty history if DB doesn't exist
    return c.json({ synthesis: [], total: 0 });
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🔊 Scriptony Audio TTS Service starting...");
export default createHonoAppwriteHandler(app);
