/**
 * Expand-only parent shells: children may shrink inside a parent; parents only grow when content overflows.
 * Location: src/lib/timeline-parent-expand-only.ts
 */

export interface PctRange {
  pct_from: number;
  pct_to: number;
}

/** True when a pct patch widens (or keeps) the parent shell — never accepts shrink-only edits. */
export function patchExpandsParentShell(
  parentShell: TimeShell,
  patch: PctRange,
  budgetSec: number,
): boolean {
  const span = Math.max(1e-9, budgetSec);
  const newStart = (patch.pct_from / 100) * span;
  const newEnd = (patch.pct_to / 100) * span;
  if (newEnd - newStart < TIMELINE_EXPAND_EPS_SEC) return false;
  const oldDur = parentShell.endSec - parentShell.startSec;
  const newDur = newEnd - newStart;
  return (
    newStart <= parentShell.startSec + TIMELINE_EXPAND_EPS_SEC &&
    newEnd >= parentShell.endSec - TIMELINE_EXPAND_EPS_SEC &&
    newDur >= oldDur - TIMELINE_EXPAND_EPS_SEC
  );
}

/** Relative child row (e.g. sequence in act): patch must not shrink the child shell. */
export function patchExpandsChildShellInParent(
  childShell: TimeShell,
  patch: PctRange,
  parentShell: TimeShell,
): boolean {
  const parentDur = Math.max(1e-9, parentShell.endSec - parentShell.startSec);
  const newStart = parentShell.startSec + (patch.pct_from / 100) * parentDur;
  const newEnd = parentShell.startSec + (patch.pct_to / 100) * parentDur;
  if (newEnd - newStart < TIMELINE_EXPAND_EPS_SEC) return false;
  const oldDur = childShell.endSec - childShell.startSec;
  const newDur = newEnd - newStart;
  return (
    newStart <= childShell.startSec + TIMELINE_EXPAND_EPS_SEC &&
    newEnd >= childShell.endSec - TIMELINE_EXPAND_EPS_SEC &&
    newDur >= oldDur - TIMELINE_EXPAND_EPS_SEC
  );
}

export const TIMELINE_EXPAND_EPS_SEC = 1e-3;

export interface TimeShell {
  startSec: number;
  endSec: number;
}

export function contentFitsShell(
  need: TimeShell,
  shell: TimeShell,
  eps = TIMELINE_EXPAND_EPS_SEC,
): boolean {
  return (
    need.startSec >= shell.startSec - eps && need.endSec <= shell.endSec + eps
  );
}

/** Widen shell only where need exceeds edges; never tighten. */
export function expandShellToContainNeed(
  need: TimeShell,
  shell: TimeShell,
  eps = TIMELINE_EXPAND_EPS_SEC,
): TimeShell | null {
  let start = shell.startSec;
  let end = shell.endSec;
  let changed = false;
  if (need.startSec < shell.startSec - eps) {
    start = need.startSec;
    changed = true;
  }
  if (need.endSec > shell.endSec + eps) {
    end = need.endSec;
    changed = true;
  }
  if (!changed) return null;
  return { startSec: start, endSec: end };
}

export function globalSpanToTimelinePct(
  shell: TimeShell,
  totalDur: number,
): PctRange | null {
  const span = totalDur;
  if (span < 1e-3) return null;
  const lo = Math.max(0, shell.startSec);
  const hi = Math.min(span, shell.endSec);
  if (hi - lo < 1e-3) return null;
  return {
    pct_from: (lo / span) * 100,
    pct_to: (hi / span) * 100,
  };
}

export function relativeSpanToParentPct(
  shell: TimeShell,
  parent: TimeShell,
): PctRange | null {
  const parentDur = parent.endSec - parent.startSec;
  if (parentDur < 1e-3) return null;
  const lo = shell.startSec - parent.startSec;
  const hi = shell.endSec - parent.startSec;
  const from = (lo / parentDur) * 100;
  const to = (hi / parentDur) * 100;
  return {
    pct_from: Math.max(0, Math.min(100, from)),
    pct_to: Math.max(0, Math.min(100, Math.max(from + 1e-3, to))),
  };
}

export interface ExpandOnlyStructureResult {
  act?: PctRange;
  sequence?: PctRange;
  scene?: PctRange;
  /** Global seconds after expand (for ripple). */
  actShell?: TimeShell;
  sequenceShell?: TimeShell;
}

/**
 * Scene → sequence → act: expand-only chain on global timeline seconds.
 */
export function expandOnlyStructurePctToFitGlobalNeed(args: {
  needStartSec: number;
  needEndSec: number;
  actBlock: TimeShell & { id: string };
  sequenceBlock: TimeShell & { id: string };
  sceneBlock: TimeShell & { id: string };
  totalDur: number;
}): ExpandOnlyStructureResult {
  const need: TimeShell = {
    startSec: args.needStartSec,
    endSec: args.needEndSec,
  };
  const scene = {
    startSec: args.sceneBlock.startSec,
    endSec: args.sceneBlock.endSec,
  };
  const sequence = {
    startSec: args.sequenceBlock.startSec,
    endSec: args.sequenceBlock.endSec,
  };
  const act = {
    startSec: args.actBlock.startSec,
    endSec: args.actBlock.endSec,
  };

  if (
    contentFitsShell(need, scene) &&
    contentFitsShell(need, sequence) &&
    contentFitsShell(need, act)
  ) {
    return {};
  }

  let sceneShell = { ...scene };
  const sceneExp = expandShellToContainNeed(need, scene);
  if (sceneExp) sceneShell = sceneExp;

  let seqShell = { ...sequence };
  const seqExp = expandShellToContainNeed(sceneShell, sequence);
  if (seqExp) seqShell = seqExp;

  let actShell = { ...act };
  const actExp = expandShellToContainNeed(seqShell, act);
  if (actExp) actShell = actExp;

  actShell = {
    startSec: Math.max(0, actShell.startSec),
    endSec: Math.min(args.totalDur, actShell.endSec),
  };
  seqShell = {
    startSec: Math.max(actShell.startSec, seqShell.startSec),
    endSec: Math.min(actShell.endSec, seqShell.endSec),
  };
  sceneShell = {
    startSec: Math.max(seqShell.startSec, sceneShell.startSec),
    endSec: Math.min(seqShell.endSec, sceneShell.endSec),
  };

  const out: ExpandOnlyStructureResult = {
    actShell,
    sequenceShell: seqShell,
  };

  const actPct = globalSpanToTimelinePct(actShell, args.totalDur);
  if (
    actPct &&
    (actExp ||
      actShell.startSec < act.startSec - TIMELINE_EXPAND_EPS_SEC ||
      actShell.endSec > act.endSec + TIMELINE_EXPAND_EPS_SEC)
  ) {
    out.act = actPct;
  }

  const seqPct = relativeSpanToParentPct(seqShell, actShell);
  if (
    seqPct &&
    (seqExp ||
      seqShell.startSec < sequence.startSec - TIMELINE_EXPAND_EPS_SEC ||
      seqShell.endSec > sequence.endSec + TIMELINE_EXPAND_EPS_SEC)
  ) {
    out.sequence = seqPct;
  }

  const scPct = relativeSpanToParentPct(sceneShell, seqShell);
  if (
    scPct &&
    (sceneExp ||
      sceneShell.startSec < scene.startSec - TIMELINE_EXPAND_EPS_SEC ||
      sceneShell.endSec > scene.endSec + TIMELINE_EXPAND_EPS_SEC)
  ) {
    out.scene = scPct;
  }

  if (!out.act && !out.sequence && !out.scene) return {};
  return out;
}

export function expandOnlyActSequencePctToFitGlobalNeed(args: {
  needStartSec: number;
  needEndSec: number;
  actBlock: TimeShell & { id: string };
  sequenceBlock: TimeShell & { id: string };
  totalDur: number;
}): ExpandOnlyStructureResult {
  const need: TimeShell = {
    startSec: args.needStartSec,
    endSec: args.needEndSec,
  };
  const sequence = {
    startSec: args.sequenceBlock.startSec,
    endSec: args.sequenceBlock.endSec,
  };
  const act = {
    startSec: args.actBlock.startSec,
    endSec: args.actBlock.endSec,
  };

  if (contentFitsShell(need, sequence) && contentFitsShell(need, act)) {
    return {};
  }

  let seqShell = { ...sequence };
  const seqExp = expandShellToContainNeed(need, sequence);
  if (seqExp) seqShell = seqExp;

  let actShell = { ...act };
  const actExp = expandShellToContainNeed(seqShell, act);
  if (actExp) actShell = actExp;

  actShell = {
    startSec: Math.max(0, actShell.startSec),
    endSec: Math.min(args.totalDur, actShell.endSec),
  };
  seqShell = {
    startSec: Math.max(actShell.startSec, seqShell.startSec),
    endSec: Math.min(actShell.endSec, seqShell.endSec),
  };

  const out: ExpandOnlyStructureResult = { actShell, sequenceShell: seqShell };
  const actPct = globalSpanToTimelinePct(actShell, args.totalDur);
  if (
    actPct &&
    (actExp ||
      actShell.startSec < act.startSec - TIMELINE_EXPAND_EPS_SEC ||
      actShell.endSec > act.endSec + TIMELINE_EXPAND_EPS_SEC)
  ) {
    out.act = actPct;
  }
  const seqPct = relativeSpanToParentPct(seqShell, actShell);
  if (
    seqPct &&
    (seqExp ||
      seqShell.startSec < sequence.startSec - TIMELINE_EXPAND_EPS_SEC ||
      seqShell.endSec > sequence.endSec + TIMELINE_EXPAND_EPS_SEC)
  ) {
    out.sequence = seqPct;
  }
  if (!out.act && !out.sequence) return {};
  return out;
}

export function expandOnlyActPctToFitGlobalNeed(args: {
  needStartSec: number;
  needEndSec: number;
  actBlock: TimeShell & { id: string };
  totalDur: number;
}): ExpandOnlyStructureResult {
  const need: TimeShell = {
    startSec: args.needStartSec,
    endSec: args.needEndSec,
  };
  const act = {
    startSec: args.actBlock.startSec,
    endSec: args.actBlock.endSec,
  };
  if (contentFitsShell(need, act)) return {};

  const actExp = expandShellToContainNeed(need, act);
  if (!actExp) return {};

  const actShell = {
    startSec: Math.max(0, actExp.startSec),
    endSec: Math.min(args.totalDur, actExp.endSec),
  };
  const actPct = globalSpanToTimelinePct(actShell, args.totalDur);
  if (!actPct) return {};
  return { act: actPct, actShell };
}
