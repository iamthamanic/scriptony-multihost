/**
 * Marquee hit-testing — lane-local and cross-track (client coordinates).
 * Location: src/lib/timeline-selection/hit-test.ts
 */

import { TIMELINE_SELECTABLE_LANES } from "./lane-config";
import type { MarqueeRect, TimelineSelectableKind } from "./types";
import { TIMELINE_KIND_STATE_KEY } from "./types";

export interface StackMarqueeHits {
  beats: string[];
  acts: string[];
  sequences: string[];
  scenes: string[];
  shots: string[];
}

export function normalizeMarqueeRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): MarqueeRect {
  const left = Math.min(x0, x1);
  const top = Math.min(y0, y1);
  return {
    left,
    top,
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0),
  };
}

export function rectsOverlap(a: MarqueeRect, b: MarqueeRect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

function toContainerRect(el: HTMLElement, container: HTMLElement): MarqueeRect {
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    left: elRect.left - containerRect.left,
    top: elRect.top - containerRect.top,
    width: elRect.width,
    height: elRect.height,
  };
}

/** Partial overlap against a lane-local marquee rect. */
export function queryClipIdsInMarquee(
  container: HTMLElement,
  kind: TimelineSelectableKind,
  marquee: MarqueeRect,
): string[] {
  const { selector, readId } = TIMELINE_SELECTABLE_LANES[kind];
  const hits: string[] = [];
  container.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const id = readId(el);
    if (!id) return;
    if (rectsOverlap(marquee, toContainerRect(el, container))) {
      hits.push(id);
    }
  });
  return hits;
}

export function clientToContainerPoint(
  container: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = container.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function clientRectFromMarqueeInContainer(
  container: HTMLElement,
  marquee: MarqueeRect,
): MarqueeRect {
  const containerRect = container.getBoundingClientRect();
  return {
    left: containerRect.left + marquee.left,
    top: containerRect.top + marquee.top,
    width: marquee.width,
    height: marquee.height,
  };
}

function queryKindInClientMarquee(
  stackRoot: HTMLElement,
  kind: TimelineSelectableKind,
  clientMarquee: MarqueeRect,
): string[] {
  const { selector, readId } = TIMELINE_SELECTABLE_LANES[kind];
  const hits: string[] = [];
  stackRoot.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const id = readId(el);
    if (!id) return;
    const clipRect = el.getBoundingClientRect();
    const clip: MarqueeRect = {
      left: clipRect.left,
      top: clipRect.top,
      width: clipRect.width,
      height: clipRect.height,
    };
    if (rectsOverlap(clientMarquee, clip)) {
      hits.push(id);
    }
  });
  return hits;
}

/** Cross-track hit test within a stack for the given lane kinds. */
export function queryStackMarqueeHits(
  stackRoot: HTMLElement,
  stackLocalMarquee: MarqueeRect,
  kinds: readonly TimelineSelectableKind[],
): StackMarqueeHits {
  const clientMarquee = clientRectFromMarqueeInContainer(
    stackRoot,
    stackLocalMarquee,
  );
  const hits = {} as StackMarqueeHits;
  for (const kind of kinds) {
    hits[TIMELINE_KIND_STATE_KEY[kind]] = queryKindInClientMarquee(
      stackRoot,
      kind,
      clientMarquee,
    );
  }
  return hits;
}

/** @deprecated Use queryStackMarqueeHits with explicit kinds. */
export function queryCrossTrackMarqueeHits(
  stackRoot: HTMLElement,
  stackLocalMarquee: MarqueeRect,
): StackMarqueeHits {
  return queryStackMarqueeHits(stackRoot, stackLocalMarquee, ["beat", "scene"]);
}
