# Issue Draft: Timeline Row-Pair Layout (Slice 2)

**Status: CREATED on GitHub (2026-07-04)**

Epic design: `.qa/design/timeline-row-pair-layout.md`  
Depends on: Slice 1 done (`.qa/acceptance/timeline-row-alignment.md`)

| # | Title | Priority |
|---|-------|----------|
| [#49](https://github.com/arsvivai/scriptony-multihost/issues/49) | Row shell + migrate Beat–Scene rows | P0 |
| [#50](https://github.com/arsvivai/scriptony-multihost/issues/50) | Audio lanes to row-pair shell | P1 |
| [#51](https://github.com/arsvivai/scriptony-multihost/issues/51) | Film rows + remove parallel label column | P1 |

**In progress (2026-07-04):** Sticky label column inside single horizontal `scrollRef` (CapCut-style); `StructureTimelineRowShell.tsx` scaffold for #49.

---

## Issue 1 — Row shell + structure tracks

**Title:** Structure Timeline: introduce RowShell and migrate Beat–Scene rows  
**Priority:** P0  
**featureSlug:** timeline-row-shell-structure  
**dependsOn:** []

### Intent
Einführung von `StructureTimelineRowShell` (Label-Slot + Content-Slot pro Zeile) und Migration der Structure-Tracks Beat, Act, Sequence, Scene.

### Acceptance
- [ ] Jede Structure-Zeile ist ein DOM-Paar `[label | content]`
- [ ] Vertikal scrollt der Row-Stack; horizontal ein gemeinsamer `scrollRef`
- [ ] Labels horizontal fix (sticky left oder äquivalent)
- [ ] Playwright alignment: Beat/Akt Δ ≤ 2px
- [ ] Marquee/trim auf Beat/Act unverändert nutzbar

---

## Issue 2 — Audio DAW per-lane rows

**Title:** Structure Timeline: migrate audio lanes to row-pair shell  
**Priority:** P1  
**featureSlug:** timeline-row-shell-audio  
**dependsOn:** [Structure Timeline: introduce RowShell and migrate Beat–Scene rows]

### Intent
Audio-Section-Header/Footer und jede Dialog/SFX/Music-Lane als Row-Pair statt getrennte Label-/Scroll-Listen.

### Acceptance
- [ ] `StructureTimelineAudioLaneLabels` + `ScrollRows` durch per-lane Rows ersetzt
- [ ] Section chrome bleibt symmetrisch (Slice 1 Chrome-Komponenten)
- [ ] Dialog-Sidebar ↔ Lane-Content Δ ≤ 2px (Playwright)
- [ ] Expanded lane height (280/320) weiter synchron

---

## Issue 3 — Film production rows + editor shrink

**Title:** Structure Timeline: film rows in RowShell; remove parallel label column  
**Priority:** P1  
**featureSlug:** timeline-row-shell-film  
**dependsOn:** [Structure Timeline: migrate audio lanes to row-pair shell]

### Intent
Shot/Clip/Musik/SFX in RowShell; parallele Label-Spalte aus `StructureTimelineEditor` entfernen; Editor spürbar schrumpfen (T50).

### Acceptance
- [ ] Film-Reihenfolge: Shot → Audio → Clip → Musik → SFX in einem Row-Stack
- [ ] Keine doppelte Label-Spalte mehr im Editor
- [ ] `docs/STRUCTURE_TIMELINE.md` Layout + Glossar aktualisiert
- [ ] Tauri harness `#qa-timeline-row-alignment-tauri` PASS auf test.scriptony

---

## MVP cut (not in this epic)

- MVE Card-internes Scroll (Enhance-Panel wheel pass-through)
- Cloud/Appwrite timeline paths
- Row-pair für standalone `StructureTimelineAudioLanesStack` (nur Structure-Tab)

---

## Create issues

```bash
bash "$HOME/.cursor/skills/feature-intake/scripts/create-github-issues.sh" \
  .qa/intake/timeline-row-pair-layout-issues.json
```

Then: `@ecc-runner`
