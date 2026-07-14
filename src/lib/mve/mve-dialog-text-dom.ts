/**
 * Serialize / deserialize MVE dialog text with inline emotion chips (contenteditable).
 * Location: src/lib/mve/mve-dialog-text-dom.ts
 */

import {
  formatMveTag,
  getMveTagPattern,
  mveTagDisplayLabel,
  parseMveTag,
  type MveTag,
} from "./tags";
import {
  MVE_EMOTION_CHIP_REMOVE_BUTTON_CLASSES,
  MVE_EMOTION_CHIP_SURFACE_CLASSES,
} from "./mve-emotion-chip-classes";

const CHIP_REMOVE_ATTR = "data-mve-tag-remove";

export function serializeMveDialogText(root: HTMLElement): string {
  const parts: string[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? "");
      return;
    }
    if (!(node instanceof HTMLElement)) return;

    const tag = node.dataset.mveTag;
    if (tag && parseMveTag(formatMveTag(tag as MveTag))) {
      parts.push(formatMveTag(tag as MveTag));
      return;
    }

    if (node.tagName === "BR") {
      parts.push("\n");
      return;
    }

    node.childNodes.forEach(walk);
  };

  root.childNodes.forEach(walk);
  return parts.join("");
}

export function createMveDialogTagChipElement(
  tag: MveTag,
  doc: Document = document,
): HTMLSpanElement {
  const token = formatMveTag(tag);
  const label = mveTagDisplayLabel(tag);
  const chip = doc.createElement("span");
  chip.contentEditable = "false";
  chip.dataset.mveTag = tag;
  chip.className = MVE_EMOTION_CHIP_SURFACE_CLASSES;
  chip.setAttribute("title", label);

  const labelSpan = doc.createElement("span");
  labelSpan.className = "truncate";
  labelSpan.textContent = label;
  chip.appendChild(labelSpan);

  const removeBtn = doc.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = MVE_EMOTION_CHIP_REMOVE_BUTTON_CLASSES;
  removeBtn.setAttribute("aria-label", `${label} entfernen`);
  removeBtn.setAttribute(CHIP_REMOVE_ATTR, tag);
  removeBtn.textContent = "×";
  chip.appendChild(removeBtn);

  // Avoid eslint unused - token documents persisted form
  chip.setAttribute("data-mve-token", token);
  return chip;
}

export function buildMveDialogTextFragment(
  text: string,
  doc: Document = document,
): DocumentFragment {
  const frag = doc.createDocumentFragment();
  const pattern = getMveTagPattern();
  const source = String(text);
  let lastIndex = 0;

  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      frag.appendChild(doc.createTextNode(source.slice(lastIndex, start)));
    }
    const parsed = parseMveTag(match[0]);
    if (parsed) {
      frag.appendChild(createMveDialogTagChipElement(parsed, doc));
    } else {
      frag.appendChild(doc.createTextNode(match[0]));
    }
    lastIndex = start + match[0].length;
  }

  if (lastIndex < source.length) {
    frag.appendChild(doc.createTextNode(source.slice(lastIndex)));
  }

  return frag;
}

export function replaceMveDialogTextDom(root: HTMLElement, text: string): void {
  root.replaceChildren(buildMveDialogTextFragment(text, root.ownerDocument));
}

export function nodeTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").length;
  }
  if (node instanceof HTMLElement && node.dataset.mveTag) {
    const tag = node.dataset.mveTag as MveTag;
    return formatMveTag(tag).length;
  }
  if (node instanceof HTMLElement && node.tagName === "BR") {
    return 1;
  }
  let len = 0;
  node.childNodes.forEach((child) => {
    len += nodeTextLength(child);
  });
  return len;
}

export function getCaretTextOffset(root: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return serializeMveDialogText(root).length;
  }

  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) {
    return serializeMveDialogText(root).length;
  }

  let offset = 0;
  let found = false;

  const walk = (node: Node): boolean => {
    if (found) return true;

    if (node === range.startContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += range.startOffset;
      } else if (node instanceof HTMLElement && node.dataset.mveTag) {
        const afterChip =
          range.startOffset > 0 ||
          (range.startContainer instanceof HTMLElement &&
            range.startContainer.closest("[data-mve-tag]") === node);
        if (afterChip) offset += nodeTextLength(node);
      }
      found = true;
      return true;
    }

    if (node instanceof HTMLElement && node.dataset.mveTag) {
      const chip = node;
      if (chip.contains(range.startContainer)) {
        const removeBtn = chip.querySelector(`[${CHIP_REMOVE_ATTR}]`);
        const beforeChip =
          range.startContainer === chip &&
          range.startOffset === 0 &&
          !removeBtn?.contains(range.startContainer as Node);
        if (!beforeChip) offset += nodeTextLength(chip);
        found = true;
        return true;
      }
    }

    offset += nodeTextLength(node);
    return false;
  };

  for (const child of root.childNodes) {
    if (walk(child)) break;
  }

  return offset;
}

export function setCaretTextOffset(
  root: HTMLElement,
  targetOffset: number,
): void {
  const sel = window.getSelection();
  if (!sel) return;

  let remaining = Math.max(0, targetOffset);
  const range = document.createRange();

  const placeAtEnd = () => {
    range.selectNodeContents(root);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  if (remaining === 0) {
    if (root.firstChild) {
      range.setStart(root, 0);
      range.collapse(true);
    } else {
      placeAtEnd();
      return;
    }
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }

  let placed = false;

  const walk = (node: Node): boolean => {
    const len = nodeTextLength(node);
    if (len === 0) return false;

    if (node.nodeType === Node.TEXT_NODE) {
      if (remaining <= len) {
        range.setStart(node, remaining);
        range.collapse(true);
        placed = true;
        return true;
      }
      remaining -= len;
      return false;
    }

    if (node instanceof HTMLElement && node.dataset.mveTag) {
      if (remaining <= len) {
        const parent = node.parentNode ?? root;
        const index = Array.from(parent.childNodes).indexOf(node as ChildNode);
        if (remaining === 0) {
          range.setStart(parent, index);
        } else {
          range.setStart(parent, index + 1);
        }
        range.collapse(true);
        placed = true;
        return true;
      }
      remaining -= len;
      return false;
    }

    for (const child of node.childNodes) {
      if (walk(child)) return true;
    }
    return false;
  };

  for (const child of root.childNodes) {
    if (walk(child)) break;
  }

  if (!placed) placeAtEnd();
  else {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export function getMveTagRemoveTarget(
  target: EventTarget | null,
): MveTag | null {
  if (!(target instanceof HTMLElement)) return null;
  const btn = target.closest(`[${CHIP_REMOVE_ATTR}]`);
  if (!(btn instanceof HTMLElement)) return null;
  const tag = btn.getAttribute(CHIP_REMOVE_ATTR);
  return tag && parseMveTag(formatMveTag(tag as MveTag))
    ? (tag as MveTag)
    : null;
}
