# Debug Report — `mve-textblock-scene-layout`

**Date:** 2026-07-10  
**Project:** scriptony-multihost  
**Shell:** tauri (`npm run dev:desktop`, port 3000 WebView)  
**Repro grade:** partial (user screenshot + code correlation; no live Playwright/Tauri rerun this session)

---

## Summary

MVE-Textblöcke nutzen eine **unkappte Mindestbreite (220 px)** und **keine Scene-Bounds** beim Rendern; nach Audio-Generierung landet der Clip bei **`startSec = 0`** (absolut) statt bei der Szene — dadurch Breiten-Overflow und Desync beim Scene-Verschieben.

**Confidence:** high

---

## Bug description

| | |
|--|--|
| **Expected** | Textblöcke einer Szene liegen innerhalb des pinken Scene-Containers, sind mindestens so breit wie nötig (WPM nur bei Text), und bewegen sich beim Verschieben der Szene mit. Nach Audio-Generierung bleibt der Block in der Szene. |
| **Actual** | (1) Leere Blöcke 2+3 ragen über die Scene-Breite hinaus. (2) Block 1 mit Text „Test“ sitzt am Timeline-Anfang (~0:00), nicht unter Scene 3 — besonders nach Audio-Generierung. (3) Beim Verschieben (Modus „Verschieben“) bewegen sich die Textblöcke nicht synchron mit dem pinken Scene-Block. |
| **Steps** | 1. Audio-Projekt öffnen, Structure & Beats, Scene 3 mit Seq 3. 2. Dialog-Lane „Pazulu“: drei Textblöcke in Scene 3, nur erster mit Text. 3. Beobachten: Breite vs. pinker Container. 4. Scene 3 per Body-Drag verschieben → Textblöcke bleiben zurück. 5. Audio für Block 1 generieren → springt an 0:00. |

**Environment:** macOS, branch `issue/49-timeline-row-shell-structure`, Tauri local runtime, Screenshot `shot_1783707479.png`.

---

## Reproduction

- **Command / URL:** `npm run dev:desktop` → Projekt → Structure & Beats → Audio Dialog Lane
- **Playwright spec:** bestehend `.qa/runs/2026-07-06-mve-textblock-order-sync.spec.ts` (Stacking, nicht Scene-Cap / Move-Sync / Clip-Start)
- **Result:** reproduced via user screenshot + DOM selectors; automated Tauri-E2E für Move-Sync und Post-Audio-Position nicht ausgeführt

---

## Evidence

### Screenshot

- `~/Library/Application Support/ai.scriptony.app/visual-editor/screenshots/shot_1783707479.png`
- Block 1 („Test“) links bei ~0:00; Blöcke 2–3 unter Scene 3, rechts über Container hinaus
- Modus: **Verschieben** aktiv

### DOM (user-provided)

| Element | Rolle |
|---------|--------|
| `div.absolute.inset-y-0…bg-pink-50` | Scene 3 Shell (Structure-Track) |
| `div.border-b` / `div.rounded` / `div.shrink-0` | MVE `AudioTimelineMveTextBlock` / `MveDialogClipHost` |
| `data-testid="audio-timeline-mve-text-block"` | Text-only Lane Items |

### Console / Network

Nicht gesammelt (Tauri WebView, Bug ist layout/state — kein API-Fehler vermutet).

---

## Prior art

- [x] Repo: `.qa/acceptance/mve-line-duration-width.md` — erwartet Scene-Bounds + korrekte Clip-Position nach Audio
- [x] Repo: `.qa/acceptance/mve-textblock-order-sync.md` — Stacking fix; **Scene-Cap + Move-Sync noch offen** (Tauri manual pending)
- [x] Repo: `src/lib/mve/__tests__/mve-dialog-clip-layout.test.ts` — testet bewusst **Overflow** über enge Scene (`end > 15`)
- [ ] GitHub issue: keine Treffer für „mve text block scene width“
- [ ] LightRAG: nicht abgefragt

---

## Root cause

### 1. Textblöcke füllen Scene-Container nicht / ragen über (high)

Zwei getrennte Layout-Pfade:

**A) Visuelle Spannweite (Position + Dauer in Sekunden)** — `resolveMveLineVisualSpanMap()`:

```113:128:src/lib/mve/mve-dialog-clip-layout.ts
    for (const line of ordered) {
      const logical = resolveMveLineSpan({ ... });
      const startSec = Math.max(logical.startSec, visualCursorSec);
      const widthPx = resolveMveLineStackWidthPx(
        logical.startSec,
        logical.endSec,
        pxPerSec,
      );
      const endSec = startSec + widthPx / pxPerSec;
      result.set(line.id, { startSec, endSec });
      visualCursorSec = endSec;
    }
```

- Nutzt `resolveMveLineStackWidthPx` — **Mindestbreite 220 px, kein Cap auf `sceneBlock.endSec`**
- Leere Zeilen 2+3: `DEFAULT_EMPTY_LINE_SHELL_SEC = 5` s (`resolve-mve-line-span.ts`), nicht volle Scene-Breite (by design für „additional empty“)
- Drei Blöcke × min 220 px können `sceneBlock.endSec - sceneBlock.startSec` überschreiten → Overflow rechts (wie im Screenshot)

**B) Pixel-Breite im DOM** — `AudioTimelineMveTextBlock`:

```63:68:src/components/audio/AudioTimelineMveTextBlock.tsx
  const clipWidthPx = resolveMveLineStackWidthPx(startSec, endSec, pxPerSec);
  // sceneBlock prop wird empfangen aber NICHT verwendet
```

`resolveMveDialogClipWidthPx()` (cap auf Scene-Breite) existiert und wird in Tests geprüft, ist aber **nicht im Render-Pfad verdrahtet**. `MveTextBlockLaneItems` übergibt `sceneBlock`, Komponente ignoriert es.

### 2. Nach Audio-Generierung Sprung an Timeline-Start (high)

`useMveTextBlockAudioClip.createClipShell()`:

```71:78:src/hooks/useMveTextBlockAudioClip.ts
      const { clip } = await createAudioTrack(activeSceneId, ..., {
        ...
        startTime: 0,
```

→ `localCreateAudioTrack` setzt `startSec = trackData.startTime ?? 0` (**absolute Timeline-Position**, nicht `sceneBlock.startSec`).

Nach `onBindAudioClip` hat die Line `audioClipId` → fällt aus `resolveMveLineVisualSpanMap` raus (`if (line.audioClipId) continue`) → rendert als `AudioTimelineSegment` bei `clip.startSec === 0`. Erklärt Block 1 links bei 0:00 während Blöcke 2–3 noch text-only unter Scene 3 liegen.

`uploadAudioBlob` setzt zusätzlich `startSec: 0` in `updateClip`.

### 3. Textblöcke bewegen sich nicht mit Scene-Verschieben (high)

Structure-Move-Preview:

- Pink Scene-Shell: **DOM `translateX`** via `applyStructureDragFollow()` (`preview.ts`)
- Audio/MVE-Lanes: `sceneBlocks` aus `pickFrozenStructureBlocks()` — **eingefrorene Position beim Move-Start** (`freezeStructureRowLayouts` in `commitStructureBodyMove`)

Während des Drags: Structure-Row bewegt sich visuell, React-`sceneBlocks` für Audio-Lanes bleiben auf alter `startSec` → Textblöcke „kleben“ an alter Position.

Nach Commit: `computeStructureMoveClipRipple` verschiebt **gebundene Clips** relativ zu Scene-`startSec`-Delta; text-only Lines haben **keine persistierte Timeline-Position** (derived from `sceneBlock.startSec`) — sollten nach Reload korrekt sein, wenn `timelineData` refreshed wird.

Clips mit `startSec=0` werden beim Ripple falsch oder gar nicht mit der Scene mitgezogen.

---

## Suggested fix (minimal)

1. **`AudioTimelineMveTextBlock.tsx`**  
   `resolveMveDialogClipWidthPx(startSec, endSec, pxPerSec, sceneBlock)` statt `resolveMveLineStackWidthPx`; `sceneBlock` aus Props nutzen.

2. **`mve-dialog-clip-layout.ts` → `resolveMveLineVisualSpanMap`**  
   - Gestapelte Spans auf `sceneBlock.endSec` begrenzen  
   - Optional: leere Blöcke gleichmäßig innerhalb Scene verteilen (UX-Entscheidung)

3. **`useMveTextBlockAudioClip.ts`** (+ ggf. `createAudioTrack`-Aufrufer)  
   `startTime` / `startSec` = `sceneBlocks.find(id).startSec` (+ optional Offset innerhalb Scene für Stacking), nicht `0`.

4. **Structure-Move-Preview (#49)**  
   Während Drag: Audio-Lanes mit **live preview** `startSec` füttern (Ripple-Preview-Delta auf `sceneBlocksRef`) oder MVE-Textblöcke in denselben `translateX`-Follow wie Structure-Row aufnehmen.  
   Nach Commit: sicherstellen, dass `onAudioClipsSynced` + `reloadTimelineDataFromSource` MVE-Queries invalidiert.

### Regression guard

- Unit: `resolveMveLineVisualSpanMap` — drei Blöcke in enger Scene, `max(endSec) <= sceneBlock.endSec`
- Unit: `createClipShell` — `startSec === sceneBlock.startSec`
- Playwright: `.qa/runs/2026-07-06-mve-textblock-order-sync.spec.ts` erweitern um Scene-Bounds-Assert
- Optional: structure-move preview sync spec

**Next step:** `@implement` (User hat nur `/debug` angefordert)

---

## Notes

- **Assumption:** Block 1 im Screenshot hat bereits `audioClipId` oder Clip bei 0:00 (erklärt Trennung von Blöcken 2–3). Wenn rein text-only, wäre zusätzlich `sceneId`/Block-Mapping zu prüfen.
- **By design (nicht Bug):** Nur der **einzige** leere Block in einer Scene bekommt volle Scene-Breite; weitere leere = 5 s Shell — siehe `.qa/acceptance/mve-line-duration-width.md` Follow-up.
- **Out of scope:** Film-Projekt `structureDriven` Policy (Slice 2).
- **tauri-native-layer:** Nein — rein React layout + local clip `startSec`.
