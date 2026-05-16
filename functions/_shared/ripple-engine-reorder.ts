/**
 * Ripple scene reorder: repack scenes after drag-reorder.
 *
 * Repository twin (byte-identical): functions/_shared/ripple-engine-reorder.ts ↔ src/lib/ripple-engine-reorder.ts

 */

import type {
  RippleAct,
  RippleClip,
  RippleOutput,
  RippleScene,
  RippleSequence,
  SceneReorderInput,
} from "./ripple-engine-types";

function sceneContentDurationSec(
  sceneId: string,
  scene: RippleScene,
  clips: RippleClip[],
): number {
  const sceneClips = clips.filter(
    (c) => c.sceneId === sceneId && !c.crossScene,
  );
  if (sceneClips.length > 0) {
    const minStart = Math.min(...sceneClips.map((c) => c.startSec));
    const maxEnd = Math.max(...sceneClips.map((c) => c.endSec));
    return Math.max(maxEnd - minStart, 0);
  }
  return Math.max(scene.durationSec, scene.endSec - scene.startSec, 0);
}

function propagateSequenceEndDelta(
  sequences: RippleSequence[],
  scenes: RippleScene[],
  clips: RippleClip[],
  acts: RippleAct[],
  sequenceId: string,
  seqDelta: number,
): { affectedSequences: number; affectedActs: number; affectedClips: number } {
  let affectedSequences = 0;
  let affectedActs = 0;
  let affectedClips = 0;

  const seqIdx = sequences.findIndex((sq) => sq.id === sequenceId);
  if (seqIdx < 0 || seqDelta === 0) {
    return { affectedSequences, affectedActs, affectedClips };
  }

  const sequence = sequences[seqIdx];
  const actId = sequence.actId;
  if (!actId) {
    return { affectedSequences, affectedActs, affectedClips };
  }

  const seqsInAct = sequences
    .filter((sq) => sq.actId === actId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const seqOrderIdx = seqsInAct.findIndex((sq) => sq.id === sequenceId);

  for (let i = seqOrderIdx + 1; i < seqsInAct.length; i++) {
    const nextSeq = seqsInAct[i];
    const idx = sequences.findIndex((sq) => sq.id === nextSeq.id);
    const newStart = Math.max(nextSeq.startSec + seqDelta, 0);
    sequences[idx] = {
      ...nextSeq,
      startSec: newStart,
      endSec: Math.max(nextSeq.endSec + seqDelta, newStart),
    };

    const scenesToShift = scenes.filter((s) => s.sequenceId === nextSeq.id);
    for (const s of scenesToShift) {
      const sIdx = scenes.findIndex((scene) => scene.id === s.id);
      const newSceneStart = Math.max(s.startSec + seqDelta, 0);
      scenes[sIdx] = {
        ...s,
        startSec: newSceneStart,
        endSec: Math.max(s.endSec + seqDelta, newSceneStart),
      };

      const clipsToShift = clips.filter(
        (c) => c.sceneId === s.id && !c.crossScene,
      );
      for (const c of clipsToShift) {
        const cIdx = clips.findIndex((clip) => clip.id === c.id);
        const newClipStart = Math.max(c.startSec + seqDelta, 0);
        clips[cIdx] = {
          ...c,
          startSec: newClipStart,
          endSec: Math.max(c.endSec + seqDelta, newClipStart),
        };
        affectedClips++;
      }
    }
  }

  const actIdx = acts.findIndex((a) => a.id === actId);
  if (actIdx < 0) {
    return { affectedSequences, affectedActs, affectedClips };
  }

  const act = acts[actIdx];
  const updatedSeqsInAct = sequences
    .filter((sq) => sq.actId === actId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const newActEndSec =
    updatedSeqsInAct.length > 0
      ? updatedSeqsInAct[updatedSeqsInAct.length - 1].endSec
      : act.endSec;
  const actDelta = newActEndSec - act.endSec;

  if (actDelta !== 0) {
    acts[actIdx] = {
      ...act,
      endSec: newActEndSec,
      durationSec: Math.max(newActEndSec - act.startSec, 0),
    };
    affectedActs++;

    const sortedActs = acts.sort((a, b) => a.orderIndex - b.orderIndex);
    const actOrderIdx = sortedActs.findIndex((a) => a.id === actId);
    for (let i = actOrderIdx + 1; i < sortedActs.length; i++) {
      const nextAct = sortedActs[i];
      const idx = acts.findIndex((a) => a.id === nextAct.id);
      const newStart = Math.max(nextAct.startSec + actDelta, 0);
      acts[idx] = {
        ...nextAct,
        startSec: newStart,
        endSec: Math.max(nextAct.endSec + actDelta, newStart),
      };

      const seqsToShift = sequences.filter((sq) => sq.actId === nextAct.id);
      for (const sq of seqsToShift) {
        const sqIdx = sequences.findIndex((s) => s.id === sq.id);
        const newSeqStart = Math.max(sq.startSec + actDelta, 0);
        sequences[sqIdx] = {
          ...sq,
          startSec: newSeqStart,
          endSec: Math.max(sq.endSec + actDelta, newSeqStart),
        };

        const scenesToShift = scenes.filter((s) => s.sequenceId === sq.id);
        for (const s of scenesToShift) {
          const sIdx = scenes.findIndex((scene) => scene.id === s.id);
          const newSceneStart = Math.max(s.startSec + actDelta, 0);
          scenes[sIdx] = {
            ...s,
            startSec: newSceneStart,
            endSec: Math.max(s.endSec + actDelta, newSceneStart),
          };

          const clipsToShift = clips.filter(
            (c) => c.sceneId === s.id && !c.crossScene,
          );
          for (const c of clipsToShift) {
            const cIdx = clips.findIndex((clip) => clip.id === c.id);
            const newClipStart = Math.max(c.startSec + actDelta, 0);
            clips[cIdx] = {
              ...c,
              startSec: newClipStart,
              endSec: Math.max(c.endSec + actDelta, newClipStart),
            };
            affectedClips++;
          }
        }
      }
    }
  }

  affectedSequences = seqDelta !== 0 ? 1 : 0;
  return { affectedSequences, affectedActs, affectedClips };
}

/**
 * Repacks scenes in a sequence after reorder and ripples container shifts.
 */
export function calculateSceneReorderRipple(
  input: SceneReorderInput,
): RippleOutput {
  const clips = input.allClips.map((c) => ({ ...c }));
  const scenes = input.allScenes.map((s) => ({ ...s }));
  const sequences = input.allSequences.map((sq) => ({ ...sq }));
  const acts = input.allActs.map((a) => ({ ...a }));

  if (input.orderedSceneIds.length === 0) {
    throw new Error("orderedSceneIds is required");
  }

  const firstScene = scenes.find((s) => s.id === input.orderedSceneIds[0]);
  if (!firstScene) {
    throw new Error(`Scene not found: ${input.orderedSceneIds[0]}`);
  }

  const sequenceId = firstScene.sequenceId;
  if (!sequenceId) {
    input.orderedSceneIds.forEach((id, index) => {
      const idx = scenes.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error(`Scene not found: ${id}`);
      scenes[idx] = { ...scenes[idx], orderIndex: index };
    });
    return {
      updatedClips: clips,
      updatedScenes: scenes,
      updatedSequences: sequences,
      updatedActs: acts,
      stats: {
        affectedClips: 0,
        affectedScenes: input.orderedSceneIds.length,
        affectedSequences: 0,
        affectedActs: 0,
        deltaSec: 0,
      },
    };
  }

  for (const id of input.orderedSceneIds) {
    const sc = scenes.find((s) => s.id === id);
    if (!sc) throw new Error(`Scene not found: ${id}`);
    if (sc.sequenceId !== sequenceId) {
      throw new Error(`Scene ${id} is not in sequence ${sequenceId}`);
    }
  }

  const scenesInSeq = scenes.filter((s) => s.sequenceId === sequenceId);
  const missingIds = scenesInSeq
    .filter((s) => !input.orderedSceneIds.includes(s.id))
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((s) => s.id);
  const fullOrder = [...input.orderedSceneIds, ...missingIds];

  fullOrder.forEach((id, index) => {
    const idx = scenes.findIndex((s) => s.id === id);
    scenes[idx] = { ...scenes[idx], orderIndex: index };
  });

  const seqIdx = sequences.findIndex((sq) => sq.id === sequenceId);
  if (seqIdx === -1) {
    throw new Error(`Sequence not found: ${sequenceId}`);
  }

  const sequence = sequences[seqIdx];
  const oldSeqEnd = sequence.endSec;
  let cursor = sequence.startSec;
  let affectedClips = 0;
  let affectedScenes = 0;

  for (const sceneId of fullOrder) {
    const sIdx = scenes.findIndex((s) => s.id === sceneId);
    const scene = scenes[sIdx];
    const oldStart = scene.startSec;
    const dur = sceneContentDurationSec(sceneId, scene, clips);
    const newStart = cursor;
    const newEnd = cursor + dur;

    if (oldStart !== newStart || scene.endSec !== newEnd) {
      affectedScenes++;
    }

    scenes[sIdx] = {
      ...scene,
      startSec: newStart,
      endSec: newEnd,
      durationSec: dur,
    };

    const shift = newStart - oldStart;
    if (shift !== 0) {
      for (const c of clips.filter(
        (clip) => clip.sceneId === sceneId && !clip.crossScene,
      )) {
        const cIdx = clips.findIndex((clip) => clip.id === c.id);
        const newClipStart = Math.max(c.startSec + shift, 0);
        clips[cIdx] = {
          ...c,
          startSec: newClipStart,
          endSec: Math.max(c.endSec + shift, newClipStart),
        };
        affectedClips++;
      }
    }

    cursor = newEnd;
  }

  const newSeqEnd = cursor;
  const seqDelta = newSeqEnd - oldSeqEnd;
  sequences[seqIdx] = {
    ...sequence,
    endSec: newSeqEnd,
    durationSec: Math.max(newSeqEnd - sequence.startSec, 0),
  };

  const propagated = propagateSequenceEndDelta(
    sequences,
    scenes,
    clips,
    acts,
    sequenceId,
    seqDelta,
  );

  return {
    updatedClips: clips,
    updatedScenes: scenes,
    updatedSequences: sequences,
    updatedActs: acts,
    stats: {
      affectedClips: affectedClips + propagated.affectedClips,
      affectedScenes,
      affectedSequences:
        seqDelta !== 0
          ? 1 + propagated.affectedSequences
          : propagated.affectedSequences,
      affectedActs: propagated.affectedActs,
      deltaSec: seqDelta,
    },
  };
}
