/**
 * Ripple-Engine barrel — re-exports all modules.
 *
 * Repository twin (byte-identical): functions/_shared/ripple-engine.ts ↔ src/lib/ripple-engine.ts
 *
 * Import from "./ripple-engine" (unchanged public API).
 */

export * from "./ripple-engine-types";
export { calculateRipple } from "./ripple-engine-calculate";
export { calculateSceneReorderRipple } from "./ripple-engine-reorder";
export { checkForConflict } from "./ripple-engine-conflict";
