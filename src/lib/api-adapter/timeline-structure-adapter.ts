/**
 * Timeline structure adapter — Acts/Sequences/Scenes CRUD entry point.
 * Local routing is handled inside timeline-api-v2 via usesCloudHttpForDomain.
 */

export {
  getActs,
  createAct,
  updateAct,
  deleteAct,
  reorderActs,
  getSequences,
  createSequence,
  updateSequence,
  deleteSequence,
  reorderSequences,
  getScenes,
  createScene,
  updateScene,
  deleteScene,
  reorderScenes,
  getAllSequencesByProject,
  getAllScenesByProject,
} from "@/lib/api/timeline-api";
