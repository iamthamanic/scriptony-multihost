/**
 * Short-lived local project session for post-create setup (beats, narrative init).
 * Restores the previous backend instance when done.
 *
 * Location: src/lib/local/transient-project-session.ts
 */

import { LocalProjectContext } from "@/backend/local/LocalProjectContext";
import { createBackend } from "@/backend/create-backend";
import {
  getBackendInstance,
  setBackendInstance,
} from "@/backend/backend-instance";
import { detectRuntime } from "@/runtime/detect-runtime";
import { isDesktopShell } from "@/runtime/detect-runtime";

/**
 * Opens a .scriptony folder, sets LocalBackend on the global instance, runs `fn`, then cleans up.
 * No-op on non-desktop shells (caller should skip local-only setup).
 */
export async function withTransientLocalProjectSession<T>(
  dirPath: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isDesktopShell()) {
    return fn();
  }

  const previous = getBackendInstance();
  const ctx = await LocalProjectContext.open(dirPath);
  const runtime = detectRuntime();
  const backend = createBackend(runtime, ctx);
  setBackendInstance(backend);

  try {
    return await fn();
  } finally {
    await ctx.close();
    setBackendInstance(previous);
  }
}
