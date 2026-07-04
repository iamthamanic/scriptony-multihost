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

  return {
    ok: results.length > 0 && results.every((r) => r.ok),
    maxDeltaPx,
    results,
    measuredAt: new Date().toISOString(),
  };
}
