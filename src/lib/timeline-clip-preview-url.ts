/**
 * Resolve preview image URLs for timeline structure clips (local + cloud shapes).
 * Location: src/lib/timeline-clip-preview-url.ts
 */

export interface TimelineClipPreviewFields {
  imageUrl?: string;
  image_url?: string;
  thumbnailUrl?: string;
  thumbnail_url?: string;
}

export function timelineClipPreviewUrl(
  row: TimelineClipPreviewFields | null | undefined,
): string {
  if (!row) return "";
  return (
    row.imageUrl || row.image_url || row.thumbnailUrl || row.thumbnail_url || ""
  );
}

export interface TimelineClipImageLayout {
  fullBleed: boolean;
  sideThumb: boolean;
  showPlaceholder: boolean;
}

/** CapCut-style breakpoints shared by shot (film) and scene (audio) lanes. */
export function getTimelineClipImageLayout(
  clipWidthPx: number,
  imgUrl: string,
): TimelineClipImageLayout {
  const hasImage = Boolean(imgUrl);
  if (!hasImage) {
    return {
      fullBleed: false,
      sideThumb: false,
      showPlaceholder: clipWidthPx >= 26,
    };
  }
  if (clipWidthPx < 44) {
    return { fullBleed: true, sideThumb: false, showPlaceholder: false };
  }
  if (clipWidthPx < 72) {
    return { fullBleed: false, sideThumb: true, showPlaceholder: false };
  }
  return { fullBleed: true, sideThumb: false, showPlaceholder: false };
}
