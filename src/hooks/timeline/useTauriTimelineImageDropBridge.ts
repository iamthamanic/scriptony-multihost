/**
 * Desktop: route Tauri onDragDropEvent file paths to structure timeline image handlers.
 * Location: src/hooks/timeline/useTauriTimelineImageDropBridge.ts
 */

import { useEffect } from "react";
import { toast } from "sonner";
import { isDesktopShell } from "@/runtime/detect-runtime";
import {
  fileFromTauriDropPath,
  isImagePath,
  resolveTimelineImageDropTarget,
} from "@/lib/tauri-timeline-image-drop-bridge";

export interface UseTauriTimelineImageDropBridgeOptions {
  enabled: boolean;
  isAudioProject: boolean;
  isFilmProject: boolean;
  onSceneImageFileDrop?: (sceneId: string, file: File) => void;
  onFilmSceneClipImageDrop?: (
    sceneId: string,
    file: File,
    clientX: number,
  ) => void;
  onShotImageFileDrop?: (shotId: string, file: File) => void;
  onEmptySceneLaneDrop?: (file: File, clientX: number) => void;
  onEmptyShotLaneDrop?: (file: File, clientX: number) => void;
}

export function useTauriTimelineImageDropBridge(
  options: UseTauriTimelineImageDropBridgeOptions,
): void {
  const {
    enabled,
    isAudioProject,
    isFilmProject,
    onSceneImageFileDrop,
    onFilmSceneClipImageDrop,
    onShotImageFileDrop,
    onEmptySceneLaneDrop,
    onEmptyShotLaneDrop,
  } = options;

  useEffect(() => {
    if (!enabled || !isDesktopShell()) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        unlisten = await getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type !== "drop") return;

          const imagePath = event.payload.paths.find(isImagePath);
          if (!imagePath) {
            toast.error("Bitte ein Bild (PNG, JPG, WebP, …) ablegen.");
            return;
          }

          void (async () => {
            const file = await fileFromTauriDropPath(imagePath);
            if (!file) {
              toast.error("Bitte ein Bild (PNG, JPG, WebP, …) ablegen.");
              return;
            }

            const dropPayload = event.payload;
            if (dropPayload.type !== "drop") return;
            const { x, y } = dropPayload.position;
            const scale = window.devicePixelRatio || 1;
            const target =
              resolveTimelineImageDropTarget(x, y) ??
              resolveTimelineImageDropTarget(x / scale, y / scale);
            if (!target) return;

            if (
              target.kind === "shot-clip" &&
              target.nodeId &&
              onShotImageFileDrop
            ) {
              onShotImageFileDrop(target.nodeId, file);
              return;
            }

            if (target.kind === "scene-clip" && target.nodeId) {
              if (isAudioProject && onSceneImageFileDrop) {
                onSceneImageFileDrop(target.nodeId, file);
                return;
              }
              if (isFilmProject && onFilmSceneClipImageDrop) {
                onFilmSceneClipImageDrop(target.nodeId, file, target.clientX);
                return;
              }
            }

            if (target.kind === "lane") {
              if (
                target.lane === "scene" &&
                isAudioProject &&
                onEmptySceneLaneDrop
              ) {
                onEmptySceneLaneDrop(file, target.clientX);
                return;
              }
              if (
                (target.lane === "shot" ||
                  (target.lane === "scene" && isFilmProject)) &&
                onEmptyShotLaneDrop
              ) {
                onEmptyShotLaneDrop(file, target.clientX);
              }
            }
          })();
        });
      } catch (error) {
        console.warn("[TauriTimelineImageDropBridge] setup failed:", error);
      }

      if (cancelled && unlisten) {
        unlisten();
        unlisten = undefined;
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [
    enabled,
    isAudioProject,
    isFilmProject,
    onEmptySceneLaneDrop,
    onEmptyShotLaneDrop,
    onFilmSceneClipImageDrop,
    onSceneImageFileDrop,
    onShotImageFileDrop,
  ]);
}
