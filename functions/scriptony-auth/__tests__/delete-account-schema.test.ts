import { describe, expect, it } from "vitest";
import { parseDeleteAccountBody } from "../delete-account-schema";

describe("parseDeleteAccountBody", () => {
  it("accepts password with min 8 chars", () => {
    const result = parseDeleteAccountBody({ password: "secret12" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.password).toBe("secret12");
    }
  });

  it("rejects short password", () => {
    const result = parseDeleteAccountBody({ password: "short" });
    expect(result.ok).toBe(false);
  });

  it("rejects missing password", () => {
    const result = parseDeleteAccountBody({});
    expect(result.ok).toBe(false);
  });
});
