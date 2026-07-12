/**
 * Book word extraction from TipTap JSON (Epic T55).
 */

import { describe, expect, it } from "vitest";
import { extractWordsFromContent } from "../extractWordsFromContent";

describe("extractWordsFromContent", () => {
  it("extracts words from paragraph nodes", () => {
    const words = extractWordsFromContent({
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello brave world" }],
        },
      ],
    });
    expect(words).toEqual(["Hello", "brave", "world"]);
  });

  it("returns empty array for invalid content", () => {
    expect(extractWordsFromContent(null)).toEqual([]);
    expect(extractWordsFromContent({})).toEqual([]);
  });
});
