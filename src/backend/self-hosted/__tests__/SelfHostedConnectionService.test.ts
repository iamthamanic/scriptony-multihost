import { describe, it, expect, vi, beforeEach } from "vitest";
import { SelfHostedConnectionService } from "../SelfHostedConnectionService";
import type { SelfHostedConnectionStore } from "../SelfHostedConnectionStore";

vi.mock("appwrite", () => ({
  Client: vi.fn().mockImplementation(() => ({
    setEndpoint: vi.fn().mockReturnThis(),
    setProject: vi.fn().mockReturnThis(),
    ping: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("SelfHostedConnectionService", () => {
  const store = {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    getActive: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    setActive: vi.fn(),
  } as unknown as SelfHostedConnectionStore;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("testConnection returns ok on ping success", async () => {
    const svc = new SelfHostedConnectionService(store);
    const result = await svc.testConnection({
      endpoint: "https://app.example.com/v1",
      projectId: "proj1",
    });
    expect(result.ok).toBe(true);
  });

});
