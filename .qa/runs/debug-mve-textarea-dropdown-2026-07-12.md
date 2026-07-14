# Debug Report — `mve-textarea-dropdown`

**Date:** 2026-07-12
**Project:** `scriptony-multihost`
**Branch:** `issue/49-timeline-row-shell-structure`
**Shell:** tauri (desktop, `dev:desktop` confirmed running on `http://localhost:3000`, MCP bridge on `9223`)
**Repro grade:** partial (code-analysis; live Tauri click-repro not completed — see Reproduction)

---

## Summary

Three independent bugs, two with high-confidence code-level root causes:

- **Bug A** (textarea not editable): the timeline-row wrapper around the MVE text block sets the native HTML `draggable` attribute on an *ancestor* of `<textarea>`, a documented cross-browser/WebKit conflict that blocks click-to-focus/caret placement inside nested `<textarea>`/`<input>` elements. **Confidence: medium-high.**
- **Bug C** (dropdown/popover see-through): the shared `PopoverContent`/`DropdownMenuContent` primitives use a Tailwind arbitrary-value class `z-[110]` that **does not exist** in the project's frozen, statically-committed `src/index.css` (no live Tailwind build step). The class silently no-ops, so portal content renders with `z-index: auto` instead of being reliably stacked above the timeline card. **Confidence: high (verified by direct grep of the compiled CSS, not inference).**
- **Bug B** (chip border color): cosmetic-only, no root cause work performed per instructions — see Notes.

Bug A and Bug C are **independent** root causes (different mechanisms: native HTML5 drag-and-drop vs. a missing compiled CSS utility). They are not the same shared issue, but Bug C's fix is a **single shared fix** for all three affected menus (Regie-Popover, Tags-Dropdown, Audio-"+"-Dropdown) because all three go through the same two primitives (`src/components/ui/popover.tsx`, `src/components/ui/dropdown-menu.tsx`).

---

## Bug description

### Bug A — Textarea not editable

| | |
|--|--|
| **Expected** | Clicking into the dialog-clip textarea places a caret and allows typing. |
| **Actual** | Click does not focus/place caret reliably; raw tag text (e.g. `--sad`) is only visible because the transparent-text backdrop technique is working as designed — the *editability* is what's broken, not the highlighting. |
| **Steps** | 1. Open a project with an MVE scene containing a text-only dialog line. 2. In the Structure Timeline audio lane, click into the dialog clip's textarea. 3. Try to type / place the cursor mid-text. |

### Bug B — Emotion chip styling (note only)

`MveEmotionChip` ("Traurig ×") currently has no border at all (`bg-zinc-950 text-white dark:bg-white dark:text-zinc-950`, no `border-*` class). User wants a purple border. Deferred — cosmetic, not a root-cause item for this pass.

### Bug C — Dropdown/popover content see-through

| | |
|--|--|
| **Expected** | Opening the Regie-bearbeiten popover, Tags dropdown, or Audio "+" dropdown (Generate/Upload/Record) shows an opaque menu that fully occludes the card/textarea behind it. |
| **Actual** | Menu content renders with the underlying card/textarea text visibly bleeding through underneath it (see screenshot). |
| **Steps** | 1. Open a dialog clip card. 2. Click the Audio "+" button (or Tags button, or Regie-bearbeiten). 3. Observe the opened menu against the card text behind it. |

---

## Reproduction

- **Command / URL:** `npm run dev:desktop` (already running in terminal `1`, PID 32214, Tauri window + Vite on `:3000`, MCP bridge on `:9223`).
- **Browser MCP attempt:** Navigated `cursor-ide-browser` to `http://localhost:3000` — landed on the cloud-session login screen ("Willkommen bei Scriptony"), not the local-project timeline. The local runtime's MVE timeline requires an open `.scriptony` project via the Tauri native shell (workspace-fs/local-project-fs), which the plain browser MCP session does not have. Per `tauri-debug.md`, this is a case where Vite-only/browser repro cannot reach the target UI — flagged `tauri-native-layer` gap.
- **Result:** not reproduced interactively. Root causes below are derived from static code + compiled-CSS analysis, cross-referenced with the provided screenshot and the component call graph. No `e2e/debug-repro-*.spec.ts` was created (would need a fixture project pre-seeded with an MVE scene/line, out of scope for a report-only pass).

---

## Evidence

### Screenshot

- User-provided screenshot (Structure Timeline, MVE dialog clip card "Szene 1: Scene 3", take badge `#2`, emotion chip "Traurig ×", Audio "+" dropdown open showing Generate/Upload/Record over card text).
- Note: the "Was geändert wurde…" bullet text visible behind the dropdown does **not** match any string in the Scriptony codebase (`rg "Was geändert wurde"` → no matches) and reads like a changelog/PR-description summary of *this very ticket's* changes (Live-WPM width, `useMveTextBlockEditor` `onDraftTextChange`, `resolveMveLineVisualSpanMapWithDraft`). This is almost certainly a **different app/window's overlay** (e.g. an editor/AI-chat tooltip) captured in the same screen region, not Scriptony UI — treated as out of scope for Bug C's root cause, but the **Generate/Upload/Record dropdown itself bleeding into the card text** is real, reproducible-by-code-inspection Scriptony UI and is the actual Bug C evidence.

### Console / Network

Not collected — browser session never reached the target screen (see Reproduction). No Tauri stderr/panic observed in terminal `1` output at the relevant timestamps.

### Code evidence

**Bug A:**

```196:206:src/components/audio/AudioTimelineMveTextBlock.tsx
  return (
    <div
      draggable={canDrag}
      onDragStart={handleDragStart}
      className={cn(
        "absolute inset-y-0 overflow-hidden rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        canDrag && "cursor-grab active:cursor-grabbing",
      )}
      style={style}
      onClick={() => onClick?.(line.id)}
      data-testid="audio-timeline-mve-text-block"
```

`canDrag = Boolean(draggableProp)`, and `draggableProp` is threaded down from:

```205:213:src/components/timeline/audio/AudioClipLaneContent.tsx
        draggable={
          Boolean(
            mveLines?.onMoveLineToScene || mveLines?.onReorderLineInScene,
          ) && !locked
        }
```

`git log` shows this line changed in the current diff from `Boolean(mveLines?.onMoveLineToScene) && !locked` to also include the newly-added `onReorderLineInScene` (this ticket's in-scene reorder feature, `useMveLineReorder.ts` / `reorder-text-block-in-scene.ts`, both new files in this branch). The `draggable=true` HTML attribute on an ancestor of `<textarea>` is a long-standing, cross-engine conflict (Mozilla bugs [739071](https://bugzilla.mozilla.org/show_bug.cgi?id=739071), [1853069](https://bugzilla.mozilla.org/show_bug.cgi?id=1853069), [1189486](https://bugzilla.mozilla.org/show_bug.cgi?id=1189486)) where the browser's native drag-gesture detection on the `draggable` ancestor intercepts the mousedown/click before it can be used to focus the nested textarea and place a caret. Behavior is engine-dependent (Chrome tends to prioritize the input; Firefox and, per multiple reports, Safari/WebKit are more likely to block caret placement or restrict it to "always jump to start"). Tauri on macOS uses WKWebView (Safari's engine), which is in the affected category. `MveDialogClipCard`'s own `onMouseDown={(e) => e.stopPropagation()}` (`src/components/structure/timeline/mve/MveDialogClipCard.tsx:124`) does not help here — it only stops React's synthetic-event bubbling and cannot cancel the browser's native drag-gesture default action, which only `preventDefault()` on the native `dragstart`/`mousedown` (or toggling `draggable` off on focus) can do.

The `draggable` condition existed before this branch too (whenever `onMoveLineToScene` was wired), so this may be a **pre-existing** issue that this ticket's reorder feature **widens** (now true whenever either cross-scene move or same-scene reorder is enabled — i.e. in effectively every normal, unlocked editing session).

**Bug C:**

All three affected menus resolve to the same two shared primitives:

```88:src/components/structure/timeline/mve/MveTextBlockAudioMenu.tsx
        <DropdownMenuContent align="start" className="w-48">
```
```49:src/components/structure/timeline/mve/MveTagDropdown.tsx
      <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
```
```110:src/components/structure/timeline/mve/MveLineInspector.tsx
      <PopoverContent className="w-64 space-y-3" align="start" sideOffset={4}>
```

Both `DropdownMenuContent` and `PopoverContent` apply `z-[110]` (`src/components/ui/dropdown-menu.tsx:45`, `src/components/ui/popover.tsx:33`), alongside `bg-popover text-popover-foreground`, `border`, `rounded-md`, `shadow-md`/`shadow-lg`. Direct grep of the compiled `src/index.css`:

```
rg '\.bg-popover \{' src/index.css        → line 3194  ✅ present
rg '\.border \{' src/index.css            → line 2366  ✅ present
rg '\.rounded-md \{' src/index.css        → line 2335  ✅ present
rg '\.shadow-md \{' src/index.css         → line 4740  ✅ present
rg '\.z-50 \{' src/index.css              → line 853   ✅ present
rg '\.z-\\\[110\\\] \{' src/index.css     → NO MATCH    ❌ missing
```

So the popover/dropdown background, border, radius and shadow all render correctly — only the **z-index** utility is dropped, because `src/index.css` is a **frozen, one-time Tailwind v4 build output** (`/*! tailwindcss v4.1.3 */` header, no `@tailwindcss/vite` plugin or PostCSS config in the repo — confirmed via `grep tailwind vite.config.ts package.json` → no live build step), and the class was introduced *after* that snapshot was taken:

```bash
$ git log -p -- src/components/ui/dropdown-menu.tsx | grep -n 'z-\[110\]\|z-50'
-  "...z-50 max-h-(--radix-dropdown-menu-content-available-height)..."
+  "...z-[110] max-h-(--radix-dropdown-menu-content-available-height)..."
```

That `z-50 → z-[110]` migration landed in commit `f398094a` ("feat(T32): DAW-Features — Multi-Lanes, Track-Header, FX-Chain", 2026-05-21) across `dropdown-menu.tsx`, `popover.tsx`, `hover-card.tsx`, `context-menu.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `drawer.tsx` (needed to clear some other T32 stacking element). `src/index.css` was last regenerated in commit `b6b637db` (2026-06-14), **after** T32 — but that regen still did not capture `z-[110]`, i.e. whatever process/tool produces this file is not scanning these `ui/*.tsx` primitives for arbitrary-value classes, or the snapshot predates the currently-checked-out working tree's usage. With no z-index, the portaled content (Radix appends to `document.body` by default) has `z-index: auto` and loses any deterministic stacking guarantee against other `auto`/positioned content painted after it — consistent with a menu that visually interleaves with card content instead of cleanly occluding it.

### Prior art (uncommitted, already in working tree)

The current dirty working tree (`git status` at session start) already contains an **unstaged, uncommitted** hand-patch to `src/index.css` for this exact ticket (`#49`) and this exact component (`MveDialogClipCard`):

```9247:9251:src/index.css
/* MVE dialog clip toolbar hover/focus (Regie/Enhance/Delete/Takes/Audio-Add
   icon buttons — #49). src/index.css is a frozen Tailwind v4 snapshot with no
   live build step, so utility classes added after the snapshot (hover:bg-white/*,
   hover:text-white, hover:bg-red-500/20, hover:text-red-300, focus:ring-1,
   focus:ring-white/50) never emit CSS and render with zero hover/focus
   feedback. These are hand-added here to match already-used Tailwind syntax.
```

This confirms the exact failure mode (frozen CSS silently dropping classes added after the snapshot) was already diagnosed and partially patched for **hover/focus and `bg-zinc-*`/chip colors** on this same card in this same ticket — but the patch **did not cover `z-[110]`** for the dropdown/popover primitives, which is why Bug C survived that pass.

---

## Prior art

- [x] Repo grep: `src/components/ui/dropdown-menu.tsx:45`, `src/components/ui/popover.tsx:33` — shared `z-[110]` usage.
- [x] Repo grep: `src/index.css` — confirms `.z-\[110\]` absent, `.z-50` present, `.bg-popover`/`.border`/`.rounded-md`/`.shadow-md` present.
- [x] `git log -p` on `dropdown-menu.tsx`/`popover.tsx` — pinpoints the `z-50 → z-[110]` migration to commit `f398094a` (T32, 2026-05-21), predating the last `src/index.css` regen (`b6b637db`, 2026-06-14) yet still missing.
- [x] Working-tree diff on `src/index.css` — pre-existing uncommitted hand-patch for the *same* frozen-CSS failure mode on the *same* component, one pass prior in this ticket.
- [x] Mozilla Bugzilla / GitHub issues on `draggable` ancestors blocking textarea/input focus and caret placement (739071, 1853069, 1189486) — cross-browser precedent for Bug A's mechanism.
- [ ] LightRAG: not queried (no server reachability check performed — time-boxed report-only pass; repo grep + git history covered the two required knowledge sources).
- [ ] GitHub issues (`gh issue list`): not run — no `gh` invocation performed this pass; ticket branch name (`issue/49-...`) and in-repo `#49` markers were used as the correlating source instead.

---

## Root cause

**Bug A:** The timeline-row wrapper `<div draggable={canDrag} ...>` in `AudioTimelineMveTextBlock.tsx` sets the native HTML5 `draggable` attribute on an ancestor of the dialog card's `<textarea>` (nested through `MveDialogClipHost` → `MveDialogClipCard` → `HighlightedTextarea`). This is UI layer, not adapter/backend. `canDrag` is true whenever the lane wires either `onMoveLineToScene` or (new in this ticket) `onReorderLineInScene`, which in a normal unlocked editing session is effectively always. Native `draggable` ancestors are documented across engines (Firefox confirmed-bug, WebKit/Safari partially affected per third-party reports) to intercept the mousedown-driven gesture that would otherwise focus the input and place a caret; JS `stopPropagation()` on a descendant's synthetic mousedown handler cannot cancel this native default behavior.

**Bug C:** UI layer / build-pipeline mismatch. `src/index.css` is committed as a static, one-time Tailwind v4 build artifact with no live Tailwind build step in `vite.config.ts`/`package.json`. `PopoverContent` and `DropdownMenuContent` (shared by the Regie-Popover, Tags-Dropdown, and Audio-"+"-Dropdown) use the Tailwind arbitrary class `z-[110]`, introduced in commit `f398094a` (2026-05-21) to fix an unrelated T32 stacking need, but this class was never captured into the frozen CSS snapshot (still missing as of the latest `src/index.css` regen, `b6b637db`, 2026-06-14). The class silently no-ops (no matching rule), so portal content gets `z-index: auto` instead of a deterministic top-layer stack position, which is consistent with the reported "menu content shows through to the card/textarea behind it."

---

## Suggested fix (minimal)

**Bug A** — one of, in order of preference:
1. In `AudioTimelineMveTextBlock.tsx`, toggle `draggable` off while the textarea has focus (mirrors the standard workaround from the cited bug threads): add `onFocus`/`onBlur` (or `onMouseEnter`/`onMouseLeave`) on the textarea (via a prop threaded through `MveDialogClipCard`/`HighlightedTextarea`) that flips a local `dragDisabled` state, and use `draggable={canDrag && !dragDisabled}` on the wrapper.
2. Alternative: move the `draggable`/`onDragStart` attributes onto a dedicated drag handle element instead of the whole row, so the textarea's DOM subtree is never inside a `draggable=true` ancestor.
3. Regression test: an RTL/Vitest test asserting that clicking into the rendered `<textarea data-testid="mve-text-block-textarea">` while the row wrapper has `draggable=true` still allows `fireEvent.change`/caret placement — likely needs a Playwright-level check since RTL/jsdom does not model native drag-vs-focus browser quirks; flag as `@verify-ui` follow-up if jsdom can't reproduce it.

**Bug C** — add the missing utility to `src/index.css` (same hand-patch pattern already used for the hover/focus/`bg-zinc-*` fix a few lines above it in the current working tree):
1. File: `src/index.css` — add `.z-\[110\] { z-index: 110; }` (plus, for completeness, check the other five files that got the same `z-50 → z-[110]` migration in `f398094a`: `hover-card.tsx`, `context-menu.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `drawer.tsx` — if any of those are exercised elsewhere in the app, they have the identical gap).
2. Longer-term: this is the second frozen-CSS gap found on this exact component/ticket in one session; worth flagging to the team whether `src/index.css` should be regenerated as part of this ticket's checks (`npm run verify`) rather than continuing to hand-patch individual missing classes as they're discovered.
3. Regression guard: a `@verify-ui` visual check (or Playwright) opening the Audio "+" dropdown and asserting the dropdown's computed `z-index` and that a `document.elementFromPoint()` sample inside the dropdown bounds resolves to a dropdown-menu-item node, not the card behind it.

**Next step:** `@implement` (unless user asked to fix in same turn — this pass was report-only per the ticket).

---

## Notes

- **Assumptions:** Bug A's exact on-screen symptom (fully blocked vs. "caret always jumps to start") could not be pinned to one specific sub-behavior without an interactive WKWebView repro; the underlying mechanism (native `draggable` ancestor conflicting with nested textarea) is documented with high confidence, but its precise manifestation in Tauri's WKWebView build was not directly observed this pass.
- **Assumptions:** The "Was geändert wurde…" text visible in the screenshot behind the Audio dropdown is treated as a non-Scriptony overlay (no matching string in the codebase) and excluded from Bug C's root cause — only the Generate/Upload/Record dropdown's occlusion of the card is attributed to the `z-[110]` gap.
- **Out of scope:** Bug B (purple chip border) — styling-only request, explicitly deferred per the ticket; no root-cause investigation performed. `MveEmotionChip` currently has no `border-*` class at all (`src/components/structure/timeline/mve/MveEmotionChip.tsx:28-32`), so any fix is additive (e.g. `border border-primary-purple dark:border-primary-purple-light`), not a bug fix.
- **Out of scope:** Full interactive Tauri repro (would require seeding/opening a local `.scriptony` project with an MVE scene inside the actual Tauri window or via `browser_navigate` against a pre-authenticated local-runtime session — neither was available in this pass; browser MCP only reached the cloud login screen).
- **Independent vs. shared:** Bug A and Bug C do **not** share a root cause. Bug C, however, is a **single shared fix** for all three reported menus (Regie-Popover, Tags-Dropdown, Audio-Dropdown) since they all route through the same `ui/popover.tsx` + `ui/dropdown-menu.tsx` primitives.
