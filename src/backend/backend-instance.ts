/**
 * Optional global backend reference for non-React modules (T39).
 * Set by BackendProvider when the resolved backend changes.
 */

import type { ScriptonyBackend } from "./ScriptonyBackend";

let instance: ScriptonyBackend | null = null;

export function setBackendInstance(backend: ScriptonyBackend | null): void {
  instance = backend;
}

export function getBackendInstance(): ScriptonyBackend | null {
  return instance;
}
