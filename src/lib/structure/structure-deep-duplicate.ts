/**
 * Deep-duplicate structure lanes (act / sequence / scene) including descendants.
 * Location: src/lib/structure/structure-deep-duplicate.ts
 *
 * Shared by useHierarchyCRUD (timeline) and mirrors DropdownView semantics.
 */

import type { Act, Scene, Sequence, Shot } from "@/lib/types";
import * as TimelineAPI from "@/lib/api-adapter/timeline-structure-adapter";
import * as ShotsAPI from "@/lib/api/shots-api";

const COPY_SUFFIX = " (Kopie)";

export interface DeepDuplicateCounts {
  sequencesCreated: number;
  scenesCreated: number;
  shotsCreated: number;
}

export interface DeepDuplicateActResult extends DeepDuplicateCounts {
  act: Act;
}

export interface DeepDuplicateSequenceResult extends DeepDuplicateCounts {
  sequence: Sequence;
}

export interface DeepDuplicateSceneResult extends DeepDuplicateCounts {
  scene: Scene;
}

function shotCreatePayload(shot: Shot, projectId: string) {
  return {
    shotNumber: shot.shotNumber,
    description: shot.description,
    cameraAngle: shot.cameraAngle,
    cameraMovement: shot.cameraMovement,
    framing: shot.framing,
    lens: shot.lens,
    duration: shot.duration,
    shotlengthMinutes: shot.shotlengthMinutes,
    shotlengthSeconds: shot.shotlengthSeconds,
    notes: shot.notes,
    dialog: shot.dialog,
    projectId,
  };
}

function sceneCreatePayload(
  scene: Scene,
  overrides: Partial<Scene> = {},
): Partial<Scene> {
  return {
    sceneNumber: scene.sceneNumber,
    title: scene.title,
    description: scene.description,
    location: scene.location,
    timeOfDay: scene.timeOfDay,
    characters: scene.characters,
    content: scene.content,
    color: scene.color,
    wordCount: scene.wordCount,
    orderIndex: scene.orderIndex,
    ...overrides,
  };
}

async function duplicateShotsForScene(
  sourceSceneId: string,
  targetSceneId: string,
  shots: Shot[],
  projectId: string,
  token: string,
): Promise<number> {
  const sceneShots = shots.filter((s) => s.sceneId === sourceSceneId);
  if (sceneShots.length === 0) return 0;

  await Promise.all(
    sceneShots.map((shot) =>
      ShotsAPI.createShot(
        targetSceneId,
        shotCreatePayload(shot, projectId),
        token,
      ),
    ),
  );
  return sceneShots.length;
}

async function duplicateScenesUnderSequence(
  sourceSequenceId: string,
  targetSequenceId: string,
  scenes: Scene[],
  shots: Shot[],
  projectId: string,
  token: string,
): Promise<DeepDuplicateCounts> {
  const sourceScenes = scenes.filter((s) => s.sequenceId === sourceSequenceId);
  let shotsCreated = 0;

  await Promise.all(
    sourceScenes.map(async (scene) => {
      const newScene = await TimelineAPI.createScene(
        targetSequenceId,
        sceneCreatePayload(scene),
        token,
      );
      shotsCreated += await duplicateShotsForScene(
        scene.id,
        newScene.id,
        shots,
        projectId,
        token,
      );
    }),
  );

  return {
    sequencesCreated: 0,
    scenesCreated: sourceScenes.length,
    shotsCreated,
  };
}

/** Scene + shots under the same sequence. */
export async function duplicateSceneDeep(input: {
  sceneId: string;
  scenes: Scene[];
  shots: Shot[];
  projectId: string;
  token: string;
}): Promise<DeepDuplicateSceneResult> {
  const scene = input.scenes.find((s) => s.id === input.sceneId);
  if (!scene?.sequenceId) {
    throw new Error("Scene not found or missing sequence");
  }

  const siblings = input.scenes.filter(
    (s) => s.sequenceId === scene.sequenceId,
  );
  const maxSceneNumber = siblings.reduce(
    (max, s) => Math.max(max, s.sceneNumber || 0),
    0,
  );

  const newScene = await TimelineAPI.createScene(
    scene.sequenceId,
    sceneCreatePayload(scene, {
      sceneNumber: maxSceneNumber + 1,
      title: `${scene.title || "Scene"}${COPY_SUFFIX}`,
      orderIndex: siblings.length,
    }),
    input.token,
  );

  const shotsCreated = await duplicateShotsForScene(
    scene.id,
    newScene.id,
    input.shots,
    input.projectId,
    input.token,
  );

  return {
    scene: newScene,
    sequencesCreated: 0,
    scenesCreated: 1,
    shotsCreated,
  };
}

/** Sequence + scenes + shots (same act). */
export async function duplicateSequenceDeep(input: {
  sequenceId: string;
  sequences: Sequence[];
  scenes: Scene[];
  shots: Shot[];
  projectId: string;
  token: string;
}): Promise<DeepDuplicateSequenceResult> {
  const sequence = input.sequences.find((s) => s.id === input.sequenceId);
  if (!sequence?.actId) {
    throw new Error("Sequence not found or missing act");
  }

  const actSequences = input.sequences.filter(
    (s) => s.actId === sequence.actId,
  );
  const maxSeqNumber = actSequences.reduce(
    (max, s) => Math.max(max, s.sequenceNumber || 0),
    0,
  );

  const newSequence = await TimelineAPI.createSequence(
    sequence.actId,
    {
      sequenceNumber: maxSeqNumber + 1,
      title: `${sequence.title || "Sequence"}${COPY_SUFFIX}`,
      description: sequence.description,
      color: sequence.color,
      orderIndex: actSequences.length,
    },
    input.token,
  );

  const childCounts = await duplicateScenesUnderSequence(
    sequence.id,
    newSequence.id,
    input.scenes,
    input.shots,
    input.projectId,
    input.token,
  );

  return {
    sequence: newSequence,
    sequencesCreated: 1,
    scenesCreated: childCounts.scenesCreated,
    shotsCreated: childCounts.shotsCreated,
  };
}

/** Act + sequences + scenes + shots. */
export async function duplicateActDeep(input: {
  actId: string;
  projectId: string;
  token: string;
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  shots: Shot[];
}): Promise<DeepDuplicateActResult> {
  const act = input.acts.find((a) => a.id === input.actId);
  if (!act) throw new Error("Act not found");

  const freshActs = await TimelineAPI.getActs(input.projectId, input.token);
  const maxActNumber =
    freshActs.length > 0
      ? Math.max(...freshActs.map((a) => a.actNumber || 0))
      : 0;

  const newAct = await TimelineAPI.createAct(
    input.projectId,
    {
      actNumber: maxActNumber + 1,
      title: `${act.title || "Act"}${COPY_SUFFIX}`,
      description: act.description,
      color: act.color,
      orderIndex: freshActs.length,
    },
    input.token,
  );

  const actSequences = input.sequences.filter((s) => s.actId === input.actId);
  let scenesCreated = 0;
  let shotsCreated = 0;

  await Promise.all(
    actSequences.map(async (seq) => {
      const newSeq = await TimelineAPI.createSequence(
        newAct.id,
        {
          sequenceNumber: seq.sequenceNumber,
          title: seq.title,
          description: seq.description,
          color: seq.color,
          orderIndex: seq.orderIndex,
        },
        input.token,
      );

      const childCounts = await duplicateScenesUnderSequence(
        seq.id,
        newSeq.id,
        input.scenes,
        input.shots,
        input.projectId,
        input.token,
      );
      scenesCreated += childCounts.scenesCreated;
      shotsCreated += childCounts.shotsCreated;
    }),
  );

  return {
    act: newAct,
    sequencesCreated: actSequences.length,
    scenesCreated,
    shotsCreated,
  };
}
