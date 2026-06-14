/**
 * @deprecated Film layout: use projectStructureBlocksFromTree (src/lib/timeline-tree/projectBlocks.ts).
 * Book word timing: use src/lib/timeline-book-duration.ts.
 * Kept for legacy fallback when USE_HIERARCHICAL_STRUCTURE_RIPPLE is off.
 */

import { resolveFilmActGlobalSpans } from "../lib/timeline-act-layout";
import {
  bookDurationSecForWordCount,
  calculateWordCountFromContent,
} from "../lib/timeline-book-duration";

export { calculateWordCountFromContent } from "../lib/timeline-book-duration";

const DEFAULT_EMPTY_ACT_MIN = 5;

/** Film: act global shell from resolved spans (never raw overlapping pct). */
function filmActShellSecById(
  acts: Array<{ id: string }>,
  duration: number,
): Map<string, { startSec: number; endSec: number; durSec: number }> {
  const spans = resolveFilmActGlobalSpans(acts, duration);
  const out = new Map<
    string,
    { startSec: number; endSec: number; durSec: number }
  >();
  for (const act of acts) {
    const span = spans.get(act.id);
    if (!span) continue;
    out.set(act.id, {
      startSec: span.startSec,
      endSec: span.endSec,
      durSec: Math.max(0, span.endSec - span.startSec),
    });
  }
  return out;
}

interface TimelineData {
  acts?: any[];
  sequences?: any[];
  scenes?: any[];
}

interface BlockResult {
  id: string;
  startSec: number;
  endSec: number;
  x: number;
  width: number;
  visible: boolean;
  [key: string]: any;
}

export type { BlockResult };

/**
 * Calculate act blocks for timeline
 */
export function calculateActBlocks(
  timelineData: TimelineData | null,
  duration: number,
  viewStartSec: number,
  viewEndSec: number,
  pxPerSec: number,
  isBookProject: boolean,
  readingSpeedWpm?: number,
): BlockResult[] {
  if (!timelineData?.acts) return [];

  const filmActSpans = !isBookProject
    ? resolveFilmActGlobalSpans(timelineData.acts, duration)
    : null;

  return timelineData.acts.map((act, actIndex) => {
    if (isBookProject && readingSpeedWpm) {
      // 📖 BOOK: Position based on cumulative duration
      const acts = timelineData.acts || [];
      const sequences = timelineData.sequences || [];
      const scenes = timelineData.scenes || [];

      // 🚀 CALCULATE: Act word count from scenes
      const getActWordCount = (actId: string): number => {
        const actSequences = sequences.filter((s) => s.actId === actId);
        const actScenes = scenes.filter((sc) =>
          actSequences.some((seq) => seq.id === sc.sequenceId),
        );

        return actScenes.reduce((sum, sc) => {
          const dbWordCount = sc.metadata?.wordCount || sc.wordCount || 0;
          if (dbWordCount > 0) return sum + dbWordCount;
          return sum + calculateWordCountFromContent(sc.content);
        }, 0);
      };

      // Calculate start time (cumulative duration of all previous acts)
      let startSec = 0;
      for (let i = 0; i < actIndex; i++) {
        const prevAct = acts[i];
        const prevActWordCount = getActWordCount(prevAct.id);

        if (prevActWordCount > 0) {
          startSec += (prevActWordCount / readingSpeedWpm) * 60;
        } else {
          startSec += DEFAULT_EMPTY_ACT_MIN * 60;
        }
      }

      // Calculate this act's duration
      const actWordCount = getActWordCount(act.id);
      const actDuration =
        actWordCount > 0
          ? (actWordCount / readingSpeedWpm) * 60
          : DEFAULT_EMPTY_ACT_MIN * 60;

      const endSec = startSec + actDuration;
      const x = (startSec - viewStartSec) * pxPerSec;
      const width = (endSec - startSec) * pxPerSec;

      return {
        ...act,
        wordCount: actWordCount,
        startSec,
        endSec,
        x,
        width,
        visible: endSec >= viewStartSec && startSec <= viewEndSec,
      };
    } else {
      // 🎬 FILM: resolved global spans (de-overlap corrupt pct metadata).
      const span = filmActSpans?.get(act.id);
      const startSec = span?.startSec ?? 0;
      const endSec = span?.endSec ?? duration;

      const x = (startSec - viewStartSec) * pxPerSec;
      const width = (endSec - startSec) * pxPerSec;

      return {
        ...act,
        startSec,
        endSec,
        x,
        width,
        // Film: immer rendern (Zoom/Trim-Griffe zuverlässig); Book: Viewport-Culling
        visible: true,
      };
    }
  });
}

/**
 * Calculate sequence blocks for timeline
 */
export function calculateSequenceBlocks(
  timelineData: TimelineData | null,
  duration: number,
  viewStartSec: number,
  viewEndSec: number,
  pxPerSec: number,
  isBookProject: boolean,
  totalWords?: number,
  readingSpeedWpm?: number,
): BlockResult[] {
  if (!timelineData) return [];

  const sequenceBlocks: BlockResult[] = [];

  if (isBookProject && totalWords && readingSpeedWpm) {
    // 📖 BOOK: Position based on ACTUAL word count from scenes
    const acts = timelineData.acts || [];
    const sequences = timelineData.sequences || [];
    const scenes = timelineData.scenes || [];
    const secondsPerWord = 60 / readingSpeedWpm;

    const getSequenceWordCount = (sequenceId: string): number => {
      const seqScenes = scenes.filter((sc) => sc.sequenceId === sequenceId);
      return seqScenes.reduce((sum, sc) => {
        const dbWordCount = sc.metadata?.wordCount || sc.wordCount || 0;
        if (dbWordCount > 0) return sum + dbWordCount;
        return sum + calculateWordCountFromContent(sc.content);
      }, 0);
    };

    let wordsSoFar = 0;

    acts.forEach((act) => {
      const actSequences = sequences.filter((s) => s.actId === act.id);

      actSequences.forEach((sequence) => {
        const seqWords = getSequenceWordCount(sequence.id);

        if (seqWords > 0) {
          const startSec = wordsSoFar * secondsPerWord;
          const endSec = (wordsSoFar + seqWords) * secondsPerWord;
          const x = (startSec - viewStartSec) * pxPerSec;
          const width = (endSec - startSec) * pxPerSec;

          sequenceBlocks.push({
            ...sequence,
            wordCount: seqWords,
            startSec,
            endSec,
            x,
            width,
            visible: endSec >= viewStartSec && startSec <= viewEndSec,
          });

          wordsSoFar += seqWords;
        }
      });

      // Add empty act padding
      const actSequenceWords = actSequences.reduce(
        (sum, seq) => sum + getSequenceWordCount(seq.id),
        0,
      );
      if (actSequenceWords === 0) {
        wordsSoFar += (DEFAULT_EMPTY_ACT_MIN * 60) / secondsPerWord;
      }
    });
  } else {
    // 🎬 FILM: resolved act shells + seq pct (matches calculateActBlocks).
    const acts = timelineData.acts || [];
    const actShells = filmActShellSecById(acts, duration);
    const totalActs = acts.length || 1;
    const actDurationFallback = duration / totalActs;

    acts.forEach((act, actIndex) => {
      const sequences = (timelineData.sequences || []).filter(
        (s) => s.actId === act.id,
      );

      const shell = actShells.get(act.id);
      const actStartSec = shell?.startSec ?? actIndex * actDurationFallback;
      const actDurSec = shell?.durSec ?? actDurationFallback;
      const sequenceDurationFallback =
        sequences.length > 0 ? actDurSec / sequences.length : actDurSec;

      sequences.forEach((sequence, seqIndex) => {
        const seqMeta = (sequence as any).metadata ?? {};
        const seqPctFrom =
          typeof seqMeta?.pct_from === "number" ? seqMeta.pct_from : undefined;
        const seqPctTo =
          typeof seqMeta?.pct_to === "number" ? seqMeta.pct_to : undefined;

        const startSec =
          seqPctFrom !== undefined
            ? actStartSec + (seqPctFrom / 100) * actDurSec
            : actStartSec + seqIndex * sequenceDurationFallback;
        const endSec =
          seqPctTo !== undefined
            ? actStartSec + (seqPctTo / 100) * actDurSec
            : startSec + sequenceDurationFallback;
        const x = (startSec - viewStartSec) * pxPerSec;
        const width = (endSec - startSec) * pxPerSec;

        sequenceBlocks.push({
          ...sequence,
          startSec,
          endSec,
          x,
          width,
          visible: true,
        });
      });
    });
  }

  return sequenceBlocks;
}

/**
 * Calculate scene blocks for timeline
 */
export function calculateSceneBlocks(
  timelineData: TimelineData | null,
  duration: number,
  viewStartSec: number,
  viewEndSec: number,
  pxPerSec: number,
  isBookProject: boolean,
  readingSpeedWpm?: number,
): BlockResult[] {
  if (!timelineData) return [];

  const sceneBlocks: BlockResult[] = [];

  if (isBookProject && readingSpeedWpm) {
    // 📖 BOOK: Position based on word count from content
    const scenes = timelineData.scenes || [];
    const sequences = timelineData.sequences || [];
    const acts = timelineData.acts || [];
    const secondsPerWord = 60 / readingSpeedWpm;

    let wordsSoFar = 0;

    acts.forEach((act) => {
      const actSequences = sequences.filter((s) => s.actId === act.id);

      actSequences.forEach((sequence) => {
        const seqScenes = scenes.filter((sc) => sc.sequenceId === sequence.id);

        seqScenes.forEach((scene) => {
          const dbWordCount = scene.metadata?.wordCount || scene.wordCount || 0;
          const sceneWords =
            dbWordCount > 0
              ? dbWordCount
              : calculateWordCountFromContent(scene.content);

          if (sceneWords > 0) {
            const startSec = wordsSoFar * secondsPerWord;
            const endSec = (wordsSoFar + sceneWords) * secondsPerWord;
            const x = (startSec - viewStartSec) * pxPerSec;
            const width = (endSec - startSec) * pxPerSec;

            sceneBlocks.push({
              ...scene,
              wordCount: sceneWords,
              startSec,
              endSec,
              x,
              width,
              visible: endSec >= viewStartSec && startSec <= viewEndSec,
            });

            wordsSoFar += sceneWords;
          }
        });
      });

      // Add empty act padding
      const actScenes = scenes.filter((sc) =>
        actSequences.some((seq) => seq.id === sc.sequenceId),
      );
      const actSceneWords = actScenes.reduce((sum, sc) => {
        const dbWordCount = sc.metadata?.wordCount || sc.wordCount || 0;
        return (
          sum +
          (dbWordCount > 0
            ? dbWordCount
            : calculateWordCountFromContent(sc.content))
        );
      }, 0);

      if (actSceneWords === 0) {
        wordsSoFar += (DEFAULT_EMPTY_ACT_MIN * 60) / secondsPerWord;
      }
    });
  } else {
    const acts = timelineData.acts || [];
    const actShells = filmActShellSecById(acts, duration);
    const totalActs = acts.length || 1;
    const actDurationFallback = duration / totalActs;

    acts.forEach((act, actIndex) => {
      const sequences = (timelineData.sequences || []).filter(
        (s) => s.actId === act.id,
      );

      const shell = actShells.get(act.id);
      const actStartSec = shell?.startSec ?? actIndex * actDurationFallback;
      const actDurSec = shell?.durSec ?? actDurationFallback;
      const sequenceDurationFallback =
        sequences.length > 0 ? actDurSec / sequences.length : actDurSec;

      sequences.forEach((sequence, seqIndex) => {
        const scenes = (timelineData.scenes || []).filter(
          (sc) => sc.sequenceId === sequence.id,
        );

        const seqMeta = (sequence as any).metadata ?? {};
        const seqPctFrom =
          typeof seqMeta?.pct_from === "number" ? seqMeta.pct_from : undefined;
        const seqPctTo =
          typeof seqMeta?.pct_to === "number" ? seqMeta.pct_to : undefined;

        const seqStartSec =
          seqPctFrom !== undefined
            ? actStartSec + (seqPctFrom / 100) * actDurSec
            : actStartSec + seqIndex * sequenceDurationFallback;
        const seqEndSec =
          seqPctTo !== undefined
            ? actStartSec + (seqPctTo / 100) * actDurSec
            : seqStartSec + sequenceDurationFallback;

        const seqDurSec = Math.max(0, seqEndSec - seqStartSec);
        const sceneDurationFallback =
          scenes.length > 0 ? seqDurSec / scenes.length : seqDurSec;

        scenes.forEach((scene, sceneIndex) => {
          const sceneMeta = (scene as any).metadata ?? {};
          const scenePctFrom =
            typeof sceneMeta?.pct_from === "number"
              ? sceneMeta.pct_from
              : undefined;
          const scenePctTo =
            typeof sceneMeta?.pct_to === "number"
              ? sceneMeta.pct_to
              : undefined;

          const startSec =
            scenePctFrom !== undefined
              ? seqStartSec + (scenePctFrom / 100) * seqDurSec
              : seqStartSec + sceneIndex * sceneDurationFallback;
          const endSec =
            scenePctTo !== undefined
              ? seqStartSec + (scenePctTo / 100) * seqDurSec
              : startSec + sceneDurationFallback;
          const x = (startSec - viewStartSec) * pxPerSec;
          const width = (endSec - startSec) * pxPerSec;

          sceneBlocks.push({
            ...scene,
            startSec,
            endSec,
            x,
            width,
            visible: true,
          });
        });
      });
    });
  }

  return sceneBlocks;
}
