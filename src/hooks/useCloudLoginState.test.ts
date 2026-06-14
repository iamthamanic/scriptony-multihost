/**
 * useCloudLoginState — static contract: no runtime profile switch on save (Axis 2).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

describe("useCloudLoginState", () => {
  it("does not call RuntimeProvider.activateSelfHosted (local shell stays local)", () => {
    const src = readFileSync(
      resolve(import.meta.dirname, "useCloudLoginState.ts"),
      "utf8",
    );
    expect(src).not.toContain("activateSelfHosted");
    expect(src).not.toContain("useRuntimeController");
    expect(src).toContain("SelfHostedConnectionService");
    expect(src).toContain("confirmSessionAfterAuth");
  });
});
