/**
 * Book timeline duration from word counts and reading speed (Epic T55).
 * Canonical source for book layout timing — prefer over legacy timeline-blocks pct paths.
 */

const DEFAULT_EMPTY_ACT_MIN = 5;

type TipTapNode = {
  type?: string;
  text?: string;
  content?: TipTapNode[];
};

function extractTextFromNode(node: TipTapNode, text: string): string {
  if (node.type === "text" && node.text) {
    text += node.text + " ";
  }
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      text = extractTextFromNode(child, text);
    }
  }
  return text;
}

function countWordsInTipTapDoc(content: unknown): number {
  if (!content || typeof content !== "object") return 0;
  const doc = content as { content?: TipTapNode[] };
  let text = "";
  if (doc.content && Array.isArray(doc.content)) {
    for (const node of doc.content) {
      text = extractTextFromNode(node, text);
    }
  }
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function calculateWordCountFromContent(content: unknown): number {
  if (!content) return 0;
  try {
    const parsed =
      typeof content === "string" ? (JSON.parse(content) as unknown) : content;
    return countWordsInTipTapDoc(parsed);
  } catch {
    return 0;
  }
}

/** Seconds for a word count at WPM; empty acts get a default shell duration. */
export function bookDurationSecForWordCount(
  wordCount: number,
  readingSpeedWpm: number,
): number {
  if (wordCount > 0 && readingSpeedWpm > 0) {
    return (wordCount / readingSpeedWpm) * 60;
  }
  return DEFAULT_EMPTY_ACT_MIN * 60;
}

export { DEFAULT_EMPTY_ACT_MIN as BOOK_DEFAULT_EMPTY_ACT_MINUTES };
