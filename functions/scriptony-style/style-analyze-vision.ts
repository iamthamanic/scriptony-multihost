/**
 * Vision-based validation asset checks (T91).
 * Location: functions/scriptony-style/style-analyze-vision.ts
 */

import { Buffer } from "node:buffer";
import type { StyleAnalysisScores } from "../_shared/style-analyze";
import { analyzeStyleProfileSpec } from "../_shared/style-analyze";
import { enhanceStyleAnalysisWithAi } from "./style-analyze-ai";
import {
  downloadStorageFileBuffer,
  extractStorageFileId,
} from "../_shared/storage";
import { getStorageBucketId } from "../_shared/env";
import { visionStyleSlotReview } from "./style-vision-chat";

export type StyleAssetCheckStatus = "ok" | "warn" | "fail" | "skipped";

export type StyleAssetCheck = {
  slotIndex: number;
  slotLabel: string;
  status: StyleAssetCheckStatus;
  message?: string;
};

const DEFAULT_SLOT_LABELS = [
  "Character",
  "Creature",
  "Prop",
  "Environment",
  "Close-Up",
  "Wide Shot",
];

function readValidationRefs(spec: Record<string, unknown>): string[] {
  const visualSpec = (spec.visualSpec ?? {}) as Record<string, unknown>;
  const validationAssets = (visualSpec.validationAssets ?? {}) as Record<
    string,
    unknown
  >;
  const fromExample = Array.isArray(validationAssets.exampleRefs)
    ? validationAssets.exampleRefs
    : [];
  const machineParams = (validationAssets.machineParams ?? {}) as Record<
    string,
    unknown
  >;
  const fromMachine = Array.isArray(machineParams.assetRefs)
    ? machineParams.assetRefs
    : [];
  return (fromExample.length > 0 ? fromExample : fromMachine).map((entry) =>
    typeof entry === "string" ? entry : "",
  );
}

function guessImageMimeFromRef(ref: string): string {
  const lower = ref.toLowerCase();
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".jpg") || lower.includes(".jpeg")) return "image/jpeg";
  if (lower.includes(".gif")) return "image/gif";
  return "image/png";
}

async function resolveImageDataUrl(ref: string): Promise<string | null> {
  if (ref.startsWith("assets/")) {
    return null;
  }
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    return null;
  }
  const fileId = extractStorageFileId(ref);
  if (!fileId) {
    return null;
  }
  try {
    const buffer = await downloadStorageFileBuffer(
      getStorageBucketId("projectImages"),
      fileId,
    );
    const mime = guessImageMimeFromRef(ref);
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn("[style-analyze-vision] download failed:", fileId, error);
    return null;
  }
}

async function visionCheckSlot(
  userId: string,
  spec: Record<string, unknown>,
  slotIndex: number,
  slotLabel: string,
  ref: string,
): Promise<StyleAssetCheck> {
  if (!ref.trim()) {
    return {
      slotIndex,
      slotLabel,
      status: "skipped",
      message: "Kein Bild",
    };
  }
  if (ref.startsWith("assets/")) {
    return {
      slotIndex,
      slotLabel,
      status: "skipped",
      message: "Lokales Asset — Vision nur in Cloud",
    };
  }
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    return {
      slotIndex,
      slotLabel,
      status: "skipped",
      message: "Externe URLs nicht erlaubt — nur Storage-Refs",
    };
  }

  const imageUrl = await resolveImageDataUrl(ref);
  if (!imageUrl) {
    return {
      slotIndex,
      slotLabel,
      status: "skipped",
      message: "Bild nicht auflösbar",
    };
  }

  const palette = (
    (
      (spec.visualSpec as Record<string, unknown> | undefined)?.colorSystem as
        | Record<string, unknown>
        | undefined
    )?.machineParams as Record<string, unknown> | undefined
  )?.palette;

  const context = JSON.stringify({
    slotLabel,
    palette: Array.isArray(palette) ? palette.slice(0, 8) : [],
    lineSystem: (spec.visualSpec as Record<string, unknown> | undefined)
      ?.lineSystem,
  });

  try {
    const review = await visionStyleSlotReview(
      userId,
      imageUrl,
      slotLabel,
      context,
    );
    return {
      slotIndex,
      slotLabel,
      status: review.status,
      message: review.message,
    };
  } catch (error) {
    console.warn("[style-analyze-vision] slot check failed:", error);
    return {
      slotIndex,
      slotLabel,
      status: "skipped",
      message: "Vision-Provider nicht verfügbar",
    };
  }
}

export async function analyzeStyleProfileWithVision(
  userId: string,
  spec: Record<string, unknown>,
): Promise<{ scores: StyleAnalysisScores; assetChecks: StyleAssetCheck[] }> {
  const base = analyzeStyleProfileSpec(spec);
  const scores = await enhanceStyleAnalysisWithAi(userId, spec, base);
  const refs = readValidationRefs(spec);
  const slots = DEFAULT_SLOT_LABELS;
  const assetChecks: StyleAssetCheck[] = [];

  for (let i = 0; i < slots.length; i += 1) {
    const ref = refs[i] ?? "";
    assetChecks.push(
      await visionCheckSlot(userId, spec, i, slots[i] ?? `Slot ${i + 1}`, ref),
    );
  }

  return { scores, assetChecks };
}
