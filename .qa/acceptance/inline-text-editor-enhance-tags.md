# Feature: T27 — Inline Text Editor with Enhance + Tags

<!-- seeded by ecc-runner from issue #26 on 2026-06-26 — @implement may refine -->

## Intent

Text block editor supports `--tag` highlighting in purple, a tag dropdown with drag-and-drop insertion, and inline enhance suggestions that can be confirmed or rejected.

## Happy Path

- [ ] `--*` tags are highlighted in purple while typing in the text block editor.
- [ ] A tag dropdown shows available tags and allows drag-and-drop insertion into the editor.
- [ ] Inline enhance suggestions appear for selected text or the current block.
- [ ] Each enhance suggestion has confirm and reject controls.
- [ ] Confirming a suggestion applies the change; rejecting removes the suggestion.
- [ ] E2E screenshot of the happy path is captured.

## Edge Cases

- [ ] No tags exist: dropdown is empty but still usable.
- [ ] No selected text: enhance suggestion either disabled or shows a polite empty state.
- [ ] Duplicate tags are not double-highlighted or duplicated on drop.
- [ ] Rejecting a previously confirmed suggestion is handled gracefully (idempotent state).

## Regression

- [ ] Existing text blocks still load and save without data loss.
- [ ] Other editor shortcuts and formatting still work.

## Assumptions

- Runtime is local-desktop only.
- Depends on placeholder #ISSUE_T26; no real blocking dependency found.

## Screenshots

| Step | Filename            |
| ---- | ------------------- |
| 1    | `01-happy-path.png` |

## Implementation Notes

<!-- filled after coding -->
