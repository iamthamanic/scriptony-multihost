/**
 * Tauri native file-drop → structure timeline image targets (desktop WebView).
 * HTML5 drag/drop from Finder is blocked when dragDropEnabled is true (Tauri default).
 * Location: src/lib/tauri-timeline-image-drop-bridge.ts
 */

import { looksLikeImageFile } from "./timeline-image-drop";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|bmp|heic|heif|svg)$/i;

export function isImagePath(path: string): boolean {
  const name = path.split(/[/\\]/).pop() ?? path;
  return IMAGE_EXT.test(name);
}

function mimeForExtension(ext: string | undefined): string {
  switch (ext) {
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "heic":
    case "heif":
      return "image/heic";
    case "svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

export async function fileFromTauriDropPath(path: string): Promise<File | null> {
  if (!isImagePath(path)) return null;
  const fileName = path.split(/[/\\]/).pop() ?? "image.jpg";
  const ext = fileName.split(".").pop()?.toLowerCase();
  const { readFile } = await import("@tauri-apps/plugin-fs");
  const bytes = await readFile(path);
  const file = new File([bytes], fileName, { type: mimeForExtension(ext) });
  return looksLikeImageFile(file) ? file : null;
}

export type TimelineImageDropLane = "scene" | "shot";

export interface ResolvedTimelineImageDropTarget {
  kind: "scene-clip" | "shot-clip" | "lane";
  lane: TimelineImageDropLane;
  nodeId?: string;
  clientX: number;
}

/** Map drop coordinates to scene/shot clip or lane under the cursor. */
export function resolveTimelineImageDropTarget(
  clientX: number,
  clientY: number,
): ResolvedTimelineImageDropTarget | null {
  const element = document.elementFromPoint(clientX, clientY);
  if (!element) return null;

  const shotClip = element.closest("[data-shot-id]");
  if (shotClip instanceof HTMLElement) {
    return {
      kind: "shot-clip",
      lane: "shot",
      nodeId: shotClip.dataset.shotId,
      clientX,
    };
  }

  const sceneClip = element.closest("[data-scene-id]");
  if (sceneClip instanceof HTMLElement) {
    return {
      kind: "scene-clip",
      lane: "scene",
      nodeId: sceneClip.dataset.sceneId,
      clientX,
    };
  }

  const laneEl = element.closest("[data-timeline-image-lane]");
  if (laneEl instanceof HTMLElement) {
    const lane = laneEl.dataset.timelineImageLane;
    if (lane === "scene" || lane === "shot") {
      return { kind: "lane", lane, clientX };
    }
  }

  return null;
}
