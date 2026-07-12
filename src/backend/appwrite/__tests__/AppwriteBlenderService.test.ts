import { describe, it, expect } from "vitest";
import { AppwriteBlenderService } from "../AppwriteBlenderService";

describe("AppwriteBlenderService", () => {
  const svc = new AppwriteBlenderService();

  it("isAvailable is false", async () => {
    expect(await svc.isAvailable()).toBe(false);
  });

  it("connectLive throws desktop required", async () => {
    await expect(svc.connectLive({})).rejects.toThrow(/desktop/i);
  });
});
