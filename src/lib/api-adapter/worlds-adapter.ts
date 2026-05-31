/**
 * worlds-adapter.ts — barrel re-export for backwards compatibility.
 * Core logic moved to worlds-core.ts, categories-api.ts, items-api.ts (T26).
 */

export { worldsApiAdapter, resolveLocalProjectId, categoryIdForSlug } from "./worlds-core";
export { categoriesApiAdapter } from "./categories-api";
export { itemsApiAdapter } from "./items-api";
