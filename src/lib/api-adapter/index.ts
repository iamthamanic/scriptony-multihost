/**
 * API adapter barrel (T53/T55/T56).
 *
 * Location: src/lib/api-adapter/index.ts
 */

export {
  canUseCloudFeatures,
  dispatchByRuntime,
  getActiveBackend,
  getOpenLocalProjectId,
  getRuntimeProfile,
  isCloudProfile,
  isLocalProfile,
  localNotSupported,
  requireLocalBackend,
} from "./runtime-dispatch";

export {
  CLOUD_AUTH_REQUIRED_MESSAGE,
  DomainAccessError,
  hasOpenLocalProject,
  requireCloudAuthToken,
  resolveDomainAuthToken,
  resolveDomainAuthTokenOrEmpty,
  usesCloudHttpForDomain,
} from "./domain-access";

export {
  charactersApiAdapter,
  scenesApiAdapter,
} from "./scenes-characters-adapter";

export { projectsApiAdapter } from "./projects-adapter";

export {
  categoriesApiAdapter,
  itemsApiAdapter,
  worldsApiAdapter,
} from "./worlds-adapter";

export { resolveLocalProjectId, categoryIdForSlug } from "./worlds-core";

export {
  loadProjectTimelineBundleForRuntime,
  loadCloudProjectTimelineBundle,
} from "./timeline-bundle";

export {
  assignVoice,
  createAudioTrack,
  deleteAudioTrack,
  getClipsByScene,
  getProjectAudioClips,
  getProjectAudioTracks,
  getSceneAudioTracks,
  getVoiceAssignments,
  updateAudioTrack,
} from "./audio-story-adapter";

export * from "./legacy-shape-mappers";

export {
  getBeats,
  createBeat,
  updateBeat,
  deleteBeat,
  reorderBeats,
} from "./beats-adapter";

export {
  getCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from "./characters-adapter";

export {
  createClip,
  updateClip,
  rippleClips,
  deleteClip,
} from "./clips-adapter";

export {
  getShots,
  getShot,
  createShot,
  updateShot,
  deleteShot,
  getAllShotsByProject,
} from "./shots-adapter";

export {
  getStyleGuide,
  getStyleGuideUnavailableHint,
} from "./style-guide-adapter";

export {
  getActs,
  createAct,
  updateAct,
  deleteAct,
  getSequences,
  createSequence,
  updateSequence,
  deleteSequence,
  getScenes,
  createScene,
  updateScene,
  deleteScene,
} from "./timeline-structure-adapter";
