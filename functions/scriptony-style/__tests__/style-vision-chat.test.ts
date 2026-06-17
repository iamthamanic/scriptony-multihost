/**
 * Tests for vision status parsing (T91).
 */

import { describe, expect, it } from "vitest";
import { parseVisionStatus } from "../style-vision-chat";

describe("parseVisionStatus", () => {
  it("parses ok", () => {
    expect(parseVisionStatus("STATUS: ok — palette matches")).toBe("ok");
  });

  it("parses warn", () => {
    expect(parseVisionStatus("STATUS: WARN — slight mismatch")).toBe("warn");
  });

  it("parses fail", () => {
    expect(parseVisionStatus("STATUS: FAIL — wrong style")).toBe("fail");
  });

  it("defaults to warn for ambiguous text", () => {
    expect(parseVisionStatus("unclear response")).toBe("warn");
  });
});
