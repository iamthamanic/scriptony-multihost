/**
 * Drag-and-drop image helpers for structure timeline lanes (Film shot / Audio scene).
 * Location: src/lib/timeline-image-drop.ts
 */

export interface TimelineBlockSpan {
  id: string;
  startSec: number;
  endSec: number;
  title?: string;
  label?: string;
}

const IMAGE_MIME_PREFIX = "image/";
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|bmp|heic|heif|svg)$/i;

function dataTransferHasFiles(dataTransfer: DataTransfer): boolean {
  if (dataTransfer.files?.length > 0) return true;

  const types = Array.from(dataTransfer.types ?? []);
  if (
    types.includes("Files") ||
    types.includes("application/x-moz-file") ||
    types.includes("public.file-url")
  ) {
    return true;
  }

  const items = dataTransfer.items;
  if (!items?.length) return false;
  for (let i = 0; i < items.length; i++) {
    if (items[i]?.kind === "file") return true;
  }
  return false;
}

export function isInternalTimelineDrag(dataTransfer: DataTransfer): boolean {
  const types = Array.from(dataTransfer.types ?? []);
  return types.some(
    (type) =>
      type.startsWith("text/structure-") || type === "text/character-lane-from",
  );
}

export function isTimelineExternalFileDrag(
  dataTransfer: DataTransfer,
): boolean {
  if (isInternalTimelineDrag(dataTransfer)) return false;
  return dataTransferHasFiles(dataTransfer);
}

/** WebKit/Tauri: types/items may be empty during dragover — still accept OS file drags. */
export function shouldAllowTimelineFileDragOver(
  dataTransfer: DataTransfer,
): boolean {
  if (isInternalTimelineDrag(dataTransfer)) return false;
  if (dataTransferHasFiles(dataTransfer)) return true;
  const types = Array.from(dataTransfer.types ?? []);
  if (types.length === 0) return true;
  return (
    types.includes("Files") ||
    types.includes("application/x-moz-file") ||
    types.includes("public.file-url")
  );
}

export function looksLikeImageFile(file: File): boolean {
  if (file.type.startsWith(IMAGE_MIME_PREFIX)) return true;
  return IMAGE_EXT.test(file.name);
}

export function extractImageFileFromDataTransfer(
  dataTransfer: DataTransfer,
): File | null {
  const files = dataTransfer.files;
  if (files?.length) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (looksLikeImageFile(file)) return file;
    }
  }

  const items = dataTransfer.items;
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item?.kind !== "file") continue;
      const file = item.getAsFile();
      if (file && looksLikeImageFile(file)) return file;
    }
  }

  return null;
}

export function timeSecFromTimelineDropEvent(
  clientX: number,
  scrollEl: HTMLElement,
  pxPerSec: number,
): number {
  if (pxPerSec <= 0) return 0;
  const rect = scrollEl.getBoundingClientRect();
  const localX = clientX - rect.left;
  return Math.max(0, (scrollEl.scrollLeft + localX) / pxPerSec);
}

export function findBlockAtTime<T extends TimelineBlockSpan>(
  blocks: T[],
  timeSec: number,
): T | undefined {
  return blocks.find(
    (block) => timeSec >= block.startSec && timeSec <= block.endSec,
  );
}

/** Parent sequence for a new scene at drop time (audio). */
export function resolveSequenceParentAtTime(
  sequenceBlocks: TimelineBlockSpan[],
  timeSec: number,
): TimelineBlockSpan | undefined {
  if (sequenceBlocks.length === 0) return undefined;
  const exact = findBlockAtTime(sequenceBlocks, timeSec);
  if (exact) return exact;
  const before = sequenceBlocks
    .filter((b) => b.startSec <= timeSec)
    .sort((a, b) => b.startSec - a.startSec);
  if (before[0]) return before[0];
  return sequenceBlocks[0];
}

/** Parent scene for a new shot at drop time (film). */
export function resolveSceneParentAtTime(
  sceneBlocks: TimelineBlockSpan[],
  timeSec: number,
): TimelineBlockSpan | undefined {
  if (sceneBlocks.length === 0) return undefined;
  const exact = findBlockAtTime(sceneBlocks, timeSec);
  if (exact) return exact;
  const before = sceneBlocks
    .filter((b) => b.startSec <= timeSec)
    .sort((a, b) => b.startSec - a.startSec);
  if (before[0]) return before[0];
  return sceneBlocks[0];
}

export function blockDisplayLabel(block: TimelineBlockSpan): string {
  return block.title || block.label || block.id;
}
