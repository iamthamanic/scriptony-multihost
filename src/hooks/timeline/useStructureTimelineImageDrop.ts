/**
 * Image drop on structure timeline lanes — clip upload + empty-lane create confirm.
 * Location: src/hooks/timeline/useStructureTimelineImageDrop.ts
 */

import { useCallback, useMemo, useState } from "react";
import type { RefObject } from "react";
import { toast } from "sonner";
import { validateImageFile } from "@/lib/api/image-upload-api";
import { createTimelineImageDropBindings } from "@/lib/timeline-image-drop-bindings";
import type { TimelineImageDropBindings } from "@/lib/timeline-image-drop-bindings";
import {
  blockDisplayLabel,
  findBlockAtTime,
  resolveSceneParentAtTime,
  resolveSequenceParentAtTime,
  timeSecFromTimelineDropEvent,
  type TimelineBlockSpan,
} from "@/lib/timeline-image-drop";

export type StructureImageDropKind = "scene" | "shot";

export interface PendingStructureImageDrop {
  kind: StructureImageDropKind;
  timeSec: number;
  file: File;
  parentId: string;
  parentLabel: string;
}

export interface UseStructureTimelineImageDropOptions {
  scrollRef: RefObject<HTMLDivElement | null>;
  pxPerSec: number;
  isAudioProject: boolean;
  isFilmProject: boolean;
  sequenceBlocks: TimelineBlockSpan[];
  sceneBlocks: TimelineBlockSpan[];
  shotBlocks: TimelineBlockSpan[];
  formatTimeLabel: (totalSeconds: number) => string;
  uploadSceneImage: (sceneId: string, file: File) => Promise<string | null>;
  uploadShotImage: (shotId: string, file: File) => Promise<string | null>;
  createNodeAndRefresh: (
    kind: "scene" | "shot",
    parentId: string,
  ) => Promise<string | null>;
}

function validateDropFile(file: File): boolean {
  try {
    validateImageFile(file, 5);
    return true;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Ungültiges Bild");
    return false;
  }
}

export function useStructureTimelineImageDrop(
  options: UseStructureTimelineImageDropOptions,
) {
  const {
    scrollRef,
    pxPerSec,
    isAudioProject,
    isFilmProject,
    sequenceBlocks,
    sceneBlocks,
    shotBlocks,
    formatTimeLabel,
    uploadSceneImage,
    uploadShotImage,
    createNodeAndRefresh,
  } = options;

  const [pendingDrop, setPendingDrop] =
    useState<PendingStructureImageDrop | null>(null);
  const [dropSubmitting, setDropSubmitting] = useState(false);

  const dropTimeSec = useCallback(
    (clientX: number) => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return 0;
      return timeSecFromTimelineDropEvent(clientX, scrollEl, pxPerSec);
    },
    [pxPerSec, scrollRef],
  );

  const onSceneImageFileDrop = useCallback(
    (sceneId: string, file: File) => {
      if (!isAudioProject) return;
      if (!validateDropFile(file)) return;
      void uploadSceneImage(sceneId, file);
    },
    [isAudioProject, uploadSceneImage],
  );

  const onShotImageFileDrop = useCallback(
    (shotId: string, file: File) => {
      if (!isFilmProject) return;
      if (!validateDropFile(file)) return;
      void uploadShotImage(shotId, file);
    },
    [isFilmProject, uploadShotImage],
  );

  const onEmptySceneLaneDrop = useCallback(
    (file: File, clientX: number) => {
      if (!isAudioProject) return;
      if (!validateDropFile(file)) return;
      const timeSec = dropTimeSec(clientX);
      if (findBlockAtTime(sceneBlocks, timeSec)) return;

      const parent = resolveSequenceParentAtTime(sequenceBlocks, timeSec);
      if (!parent) {
        toast.error(
          "Keine Sequence vorhanden — bitte zuerst Act und Sequence anlegen.",
        );
        return;
      }

      setPendingDrop({
        kind: "scene",
        timeSec,
        file,
        parentId: parent.id,
        parentLabel: blockDisplayLabel(parent),
      });
    },
    [dropTimeSec, isAudioProject, sceneBlocks, sequenceBlocks],
  );

  const onEmptyShotLaneDrop = useCallback(
    (file: File, clientX: number) => {
      if (!isFilmProject) return;
      if (!validateDropFile(file)) return;
      const timeSec = dropTimeSec(clientX);
      if (findBlockAtTime(shotBlocks, timeSec)) return;

      const parent = resolveSceneParentAtTime(sceneBlocks, timeSec);
      if (!parent) {
        toast.error(
          "Keine Scene vorhanden — bitte zuerst Struktur mit Szenen anlegen.",
        );
        return;
      }

      setPendingDrop({
        kind: "shot",
        timeSec,
        file,
        parentId: parent.id,
        parentLabel: blockDisplayLabel(parent),
      });
    },
    [dropTimeSec, isFilmProject, sceneBlocks, shotBlocks],
  );

  const onFilmSceneClipImageDrop = useCallback(
    (sceneId: string, file: File, clientX: number) => {
      if (!isFilmProject || isAudioProject) return;
      if (!validateDropFile(file)) return;

      const timeSec = dropTimeSec(clientX);
      const shotAtTime = findBlockAtTime(shotBlocks, timeSec);
      if (shotAtTime) {
        void uploadShotImage(shotAtTime.id, file);
        return;
      }

      const scene = sceneBlocks.find((s) => s.id === sceneId);
      setPendingDrop({
        kind: "shot",
        timeSec,
        file,
        parentId: sceneId,
        parentLabel: scene ? blockDisplayLabel(scene) : sceneId,
      });
    },
    [
      dropTimeSec,
      isAudioProject,
      isFilmProject,
      sceneBlocks,
      shotBlocks,
      uploadShotImage,
    ],
  );

  const emptyShotLaneDropBindings: TimelineImageDropBindings | undefined =
    useMemo(
      () =>
        isFilmProject
          ? createTimelineImageDropBindings((file, event) =>
              onEmptyShotLaneDrop(file, event.clientX),
            )
          : undefined,
      [isFilmProject, onEmptyShotLaneDrop],
    );

  const emptySceneLaneDropBindings: TimelineImageDropBindings | undefined =
    useMemo(() => {
      if (isAudioProject) {
        return createTimelineImageDropBindings((file, event) =>
          onEmptySceneLaneDrop(file, event.clientX),
        );
      }
      if (isFilmProject) {
        return emptyShotLaneDropBindings;
      }
      return undefined;
    }, [
      emptyShotLaneDropBindings,
      isAudioProject,
      isFilmProject,
      onEmptySceneLaneDrop,
    ]);

  /** @deprecated Film scene lane uses shot drop bindings; clip drops use onFilmSceneClipImageDrop. */
  const filmSceneLaneHintBindings: TimelineImageDropBindings | undefined =
    undefined;

  const onFilmSceneClipImageDropHandler = isFilmProject
    ? onFilmSceneClipImageDrop
    : undefined;

  const cancelPendingDrop = useCallback(() => {
    if (dropSubmitting) return;
    setPendingDrop(null);
  }, [dropSubmitting]);

  const confirmPendingDrop = useCallback(async () => {
    if (!pendingDrop || dropSubmitting) return;
    setDropSubmitting(true);
    try {
      const createdId = await createNodeAndRefresh(
        pendingDrop.kind,
        pendingDrop.parentId,
      );
      if (!createdId) {
        toast.error("Anlegen fehlgeschlagen.");
        return;
      }
      if (pendingDrop.kind === "scene") {
        await uploadSceneImage(createdId, pendingDrop.file);
      } else {
        await uploadShotImage(createdId, pendingDrop.file);
      }
      setPendingDrop(null);
    } catch (error) {
      console.error("[StructureTimelineImageDrop] confirm failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Anlegen fehlgeschlagen.",
      );
    } finally {
      setDropSubmitting(false);
    }
  }, [
    createNodeAndRefresh,
    dropSubmitting,
    pendingDrop,
    uploadSceneImage,
    uploadShotImage,
  ]);

  const dropDialogCopy = useMemo(() => {
    if (!pendingDrop) return null;
    const timeLabel = formatTimeLabel(pendingDrop.timeSec);
    if (pendingDrop.kind === "scene") {
      return {
        title: "Neue Szene anlegen?",
        description: `Szene bei ${timeLabel} in «${pendingDrop.parentLabel}» anlegen und Bild als Szenenbild setzen?`,
        confirmLabel: "Szene anlegen",
      };
    }
    return {
      title: "Neuen Shot anlegen?",
      description: `Shot bei ${timeLabel} in «${pendingDrop.parentLabel}» anlegen und Bild als Shot-Bild setzen?`,
      confirmLabel: "Shot anlegen",
    };
  }, [formatTimeLabel, pendingDrop]);

  return {
    onSceneImageFileDrop: isAudioProject ? onSceneImageFileDrop : undefined,
    onShotImageFileDrop: isFilmProject ? onShotImageFileDrop : undefined,
    onFilmSceneClipImageDrop: onFilmSceneClipImageDropHandler,
    onEmptySceneLaneDrop: isAudioProject ? onEmptySceneLaneDrop : undefined,
    onEmptyShotLaneDrop: isFilmProject ? onEmptyShotLaneDrop : undefined,
    emptySceneLaneDropBindings,
    emptyShotLaneDropBindings,
    filmSceneLaneHintBindings,
    pendingDrop,
    dropSubmitting,
    dropDialogCopy,
    cancelPendingDrop,
    confirmPendingDrop,
  };
}
