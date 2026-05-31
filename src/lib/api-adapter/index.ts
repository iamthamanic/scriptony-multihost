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

export * from "./legacy-shape-mappers";
