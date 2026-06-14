import { describe, expect, it } from "vitest";
import {
  bookDurationSecForWordCount,
  calculateWordCountFromContent,
} from "../timeline-book-duration";

describe("timeline-book-duration", () => {
  it("counts words in TipTap JSON", () => {
    expect(
      calculateWordCountFromContent({
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "one two three" }],
          },
        ],
      }),
    ).toBe(3);
  });

  it("bookDurationSecForWordCount uses WPM", () => {
    expect(bookDurationSecForWordCount(150, 150)).toBe(60);
    expect(bookDurationSecForWordCount(0, 150)).toBe(300);
  });
});
