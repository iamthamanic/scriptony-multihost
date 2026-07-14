# Debug Report — `mve-textarea-caret-misalignment`

**Date:** 2026-07-12  
**Branch:** `issue/49-timeline-row-shell-structure`  
**Repro grade:** partial (code-analysis + unit tests; Tauri manual confirm)

## Summary

Caret appeared between lines instead of at the edit position because the highlight overlay and textarea used **different layout widths** for inline MVE tags.

## Root cause (high confidence)

`HighlightedTextarea` mirrors text in an overlay while the user edits transparent text in the `<textarea>`. Caret position follows **textarea line breaks** only.

`MveDialogClipCard` replaced `--sad` in the overlay with a wide `MveEmotionChip` label (**„Traurig ×“**), while the textarea still contained the short token **`--sad`**. Wider overlay tokens wrap differently → visible text and caret diverge vertically.

Secondary: overlay used `break-words` without matching textarea; typography classes were split unevenly between layers.

## Fix

1. **`MveInlineTagChip`** — invisible span with exact `token` string reserves layout width; chip label floats absolutely on top.
2. **`HighlightedTextarea`** — shared `mirrorClassName` on both layers; `whitespace-pre-wrap` only (no `break-words`); matched scroll overflow.

## Regression guard

- `MveInlineTagChip.test.tsx` — ghost token width preserved
- Manual: click mid-line in Tauri, caret tracks character position with `--sad` tag present
