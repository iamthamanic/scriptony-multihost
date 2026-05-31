import { beforeEach, describe, expect, it, vi } from "vitest";

const storeData = new Map<string, unknown>();

const rustWorkspaceRoot = { value: null as string | null };

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(async (cmd: string, args?: { path?: string }) => {
    if (cmd === "get_stored_workspace_root") {
      return rustWorkspaceRoot.value;
    }
    if (cmd === "clear_stored_workspace_root") {
      rustWorkspaceRoot.value = null;
      return undefined;
    }
    if (cmd === "register_workspace_scope" && args?.path) {
      rustWorkspaceRoot.value = args.path;
      return undefined;
    }
    return undefined;
  }),
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(async () => ({
    get: async <T>(key: string) => storeData.get(key) as T | undefined,
    set: async (key: string, value: unknown) => {
      storeData.set(key, value);
    },
    delete: async (key: string) => {
      storeData.delete(key);
    },
    save: async () => undefined,
  })),
}));

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: () => true,
}));

import {
  getRecentProjectPaths,
  getWorkspaceRoot,
  pushRecentProjectPath,
  setWorkspaceRoot,
} from "./workspace-store";
import { RECENT_PROJECT_PATHS_KEY } from "./workspace-types";

describe("workspace-store", () => {
  beforeEach(() => {
    storeData.clear();
    rustWorkspaceRoot.value = null;
  });

  it("roundtrips workspace root via rust store", async () => {
    expect(await getWorkspaceRoot()).toBeNull();
    rustWorkspaceRoot.value = "/Users/me/Documents/Scriptony";
    expect(await getWorkspaceRoot()).toBe("/Users/me/Documents/Scriptony");
    await setWorkspaceRoot("/Users/me/Documents/Scriptony");
    expect(rustWorkspaceRoot.value).toBe("/Users/me/Documents/Scriptony");
  });

  it("tracks recent project paths with max limit", async () => {
    for (let i = 0; i < 12; i++) {
      await pushRecentProjectPath(`/proj/p${i}.scriptony`);
    }
    const recent = await getRecentProjectPaths();
    expect(recent).toHaveLength(10);
    expect(recent[0]).toBe("/proj/p11.scriptony");
    expect(storeData.has(RECENT_PROJECT_PATHS_KEY)).toBe(true);
  });
});
