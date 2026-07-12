/**
 * Extract plain words from TipTap JSON for book timeline playback.
 */

export function extractWordsFromContent(content: unknown): string[] {
  if (
    !content ||
    typeof content !== "object" ||
    !("content" in content) ||
    !Array.isArray((content as { content?: unknown }).content)
  ) {
    return [];
  }

  let text = "";
  for (const node of (content as { content: unknown[] }).content) {
    if (
      node &&
      typeof node === "object" &&
      "type" in node &&
      (node as { type: string }).type === "paragraph" &&
      "content" in node &&
      Array.isArray((node as { content?: unknown }).content)
    ) {
      for (const child of (node as { content: unknown[] }).content) {
        if (
          child &&
          typeof child === "object" &&
          "type" in child &&
          (child as { type: string }).type === "text" &&
          "text" in child &&
          typeof (child as { text: unknown }).text === "string"
        ) {
          text += `${(child as { text: string }).text} `;
        }
      }
      text += " ";
    }
  }

  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}
