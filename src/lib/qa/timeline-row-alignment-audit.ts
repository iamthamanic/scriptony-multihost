/**
 * DEV QA — measure Y alignment between label column and lane content rows.
 * Location: src/lib/qa/timeline-row-alignment-audit.ts
 */

export interface RowAlignmentResult {
  pair: string;
  leftTestId: string;
  rightTestId: string;
  leftY: number;
  rightY: number;
  delta: number;
  ok: boolean;
}

export interface TimelineRowAlignmentReport {
  ok: boolean;
  maxDeltaPx: number;
  results: RowAlignmentResult[];
  measuredAt: string;
}

const DEFAULT_MAX_DELTA = 2;

function rowTop(root: ParentNode, testId: string): number | null {
  const el = root.querySelector(`[data-testid="${testId}"]`);
  if (!el) return null;
  return el.getBoundingClientRect().top;
}

function addPair(
  root: ParentNode,
  results: RowAlignmentResult[],
  leftTestId: string,
  rightTestId: string,
  maxDelta: number,
  label?: string,
) {
  const leftY = rowTop(root, leftTestId);
  const rightY = rowTop(root, rightTestId);
  if (leftY == null || rightY == null) return;
  const delta = Math.abs(leftY - rightY);
  results.push({
    pair: label ?? `${leftTestId} ↔ ${rightTestId}`,
    leftTestId,
    rightTestId,
    leftY,
    rightY,
    delta,
    ok: delta <= maxDelta,
  });
}

/**
 * Row-pair layout (#49): labels must sit pinned at the scroller's left edge
 * and the playhead/content origin must start exactly after the label column.
 */
function auditStickyLabelsAndOrigin(
  root: ParentNode,
  results: RowAlignmentResult[],
  maxDelta: number,
) {
  const scroller = root.querySelector<HTMLElement>(
    '[data-testid="structure-timeline-scroller"], [data-testid="qa-timeline-scroller"]',
  );
  const origin = root.querySelector<HTMLElement>(
    '[data-testid="timeline-content-origin"]',
  );
  if (!scroller || !origin) return;

  const scrollerRect = scroller.getBoundingClientRect();
  const label = root.querySelector<HTMLElement>(
    '[data-testid="timeline-label-beat"]',
  );
  const labelCell = label?.parentElement;
  if (labelCell) {
    const cellRect = labelCell.getBoundingClientRect();
    const deltaLeft = Math.abs(cellRect.left - scrollerRect.left);
    results.push({
      pair: "Sticky label pinned to scroller left",
      leftTestId: "timeline-label-beat",
      rightTestId: "structure-timeline-scroller",
      leftY: cellRect.left,
      rightY: scrollerRect.left,
      delta: deltaLeft,
      ok: deltaLeft <= maxDelta,
    });

    const originRect = origin.getBoundingClientRect();
    const expectedOriginLeft =
      scrollerRect.left + cellRect.width - scroller.scrollLeft;
    const deltaOrigin = Math.abs(originRect.left - expectedOriginLeft);
    results.push({
      pair: "Content origin starts after label column",
      leftTestId: "timeline-content-origin",
      rightTestId: "structure-timeline-scroller",
      leftY: originRect.left,
      rightY: expectedOriginLeft,
      delta: deltaOrigin,
      ok: deltaOrigin <= maxDelta,
    });
  }
}

/**
 * Audit alignment via data-testid pairs in the timeline DOM.
 * Skips missing rows (e.g. film-only labels when project has no film tracks).
 */
export function runTimelineRowAlignmentAudit(
  root: ParentNode = document,
  maxDeltaPx = DEFAULT_MAX_DELTA,
): TimelineRowAlignmentReport {
  const results: RowAlignmentResult[] = [];

  const staticPairs: Array<[string, string, string?]> = [
    ["timeline-label-beat", "timeline-content-beat", "Beat"],
    ["timeline-label-act", "timeline-content-act", "Act"],
    [
      "timeline-audio-section-header-labels",
      "timeline-audio-section-header-scroll",
      "Audio header",
    ],
    [
      "timeline-audio-section-footer-labels",
      "timeline-audio-section-footer-scroll",
      "Audio footer",
    ],
    ["timeline-label-film-clip", "timeline-content-film-clip", "Film clip"],
  ];

  for (const [left, right, label] of staticPairs) {
    addPair(root, results, left, right, maxDeltaPx, label);
  }

  root
    .querySelectorAll('[data-testid^="audio-lane-sidebar-"]')
    .forEach((el) => {
      const testId = el.getAttribute("data-testid");
      if (!testId) return;
      const laneIndex = testId.replace("audio-lane-sidebar-", "");
      addPair(
        root,
        results,
        testId,
        `audio-lane-content-${laneIndex}`,
        maxDeltaPx,
        `Dialog lane ${laneIndex}`,
      );
    });

  auditStickyLabelsAndOrigin(root, results, maxDeltaPx);

  return {
    ok: results.length > 0 && results.every((r) => r.ok),
    maxDeltaPx,
    results,
    measuredAt: new Date().toISOString(),
  };
}
