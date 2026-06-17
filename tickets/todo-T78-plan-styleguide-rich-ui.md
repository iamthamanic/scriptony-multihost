# T78 — Styleguide Rich UI (Plan)

**Status:** todo  
**Typ:** plan  
**Scope:** Frontend (`src/components/projects/styles/`, `src/lib/style-profile/`)  
**Basis:** [`docs/STYLEGUIDE_SYSTEM_CONCEPT.md`](../docs/STYLEGUIDE_SYSTEM_CONCEPT.md) §5–7, §17, §20

## Problem

Step 1 lieferte bewusst ein **Scaffold**: 18 Sektionen als eine generische `StyleSectionCard` (Summary, Do/Avoid, Advanced JSON). Die Referenz-Mockups (Cutout Satire, Martial Adventure, Superhero Blockbuster, Wes Anderson, Dark Fantasy, Gaulic Adventure) zeigen dagegen **pro Sektion eigene, visuell reiche, interaktive Editoren** — Slider, Paletten, Referenzbilder, Chips, Gauge, Validation-Grid.

Diese Rich UI ist im Konzept als **„perspektivisch alle Ebenen“** beschrieben, aber **nicht** explizit Step 2–4 zugeordnet. Step 5 deckt nur Analyse/Validation/Compare ab, nicht die 18 spezialisierten Section-Cards.

Ohne dieses Plan-Ticket riskiert das Team, Step 3/4 zu bauen, während die Haupt-UX weiter wie ein Formular-Scaffold wirkt.

## Zielbild

Alle Styleguide-Inhalte sind **sichtbar und interagierbar** — angelehnt an die Mockup-**Informationsarchitektur**, nicht an deren App-Chrome:

| Übernehmen | Nicht übernehmen |
|------------|------------------|
| 18 spezialisierte Section-Editoren | Eigenes dunkles Theme pro Preset |
| Builder-Chrome (Preset, Gauge, Compare-Entry) | Fake-Prozentwerte als echte KI-Analyse |
| Prompt/Negative als Chips | Fremde Farbpaletten als Scriptony-Shell |
| Tool Settings (ComfyUI/Blender-Formulare, speichern) | ComfyUI-Queue / Blender-Execute (→ Step 4) |
| Validation-Grid-UI (Assets + Scores) | Echte Scores ohne Backend (→ Step 5) |
| Referenz-Asset-Slots (`exampleRefs`) | Vollbild-Route statt inline Panel (optional Step 6) |

**Shell bleibt:** Collapsible auf Projektseite, Scriptony-Chrome (`Button`, `Card`, `Slider`, `Select` aus `src/components/ui/`), Akzent Lila.

## Ausgangslage (Step 1 ✅)

| Vorhanden | Fehlt |
|-----------|-------|
| `StyleProfileBuilderLayout` (3 Spalten) | Spezialisierte Section-Komponenten |
| `StyleSectionCard` (generisch) | `machineParams`-Schemas pro Sektion |
| `STYLE_SECTION_REGISTRY` (18 Keys) | Builder-Sidebar: Preset, Gauge, Analyze |
| 2 Create-Templates (`animated_stylized`, `cinematic_photoreal`) | 6 Referenz-Presets als wählbare Profile |
| Tool Settings Tab (Basis-Textfelder) | Chips, Reference Strength, ComfyUI/Blender-Forms |
| Validation / Compare Tabs (Placeholder) | Validation Grid, Side-by-Side Compare |
| Preview-Upload (Overview, Cloud Step 2) | Hero-Galerie im Editor-Header |

## Abhängigkeiten

```
T77 Step 2 (Cloud Spec)     → sollte vor Cloud-Rich-UI fertig sein (Spec round-trip)
T78 Plan (dieses Ticket)    → priorisiert Umsetzung
T79–T83 Implementation      → siehe Phasen unten
Step 3 Sync                 → parallel möglich, blockiert Rich UI nicht
Step 5 Analyse              → liefert echte Gauge/Scores; UI-Shell kann früher kommen
Step 6 Subnav               → optional später; Collapsible bleibt Default
```

**Empfohlene Reihenfolge:** T77 ✅ → **T79** (Chrome + Top-Sektionen) → T81 Tool Settings → T80 Rest-Sektionen → T83 Presets → T82 Validation UI → Step 5

---

## Pakete & Prioritäten

### Paket A — Builder Chrome (P1, klein)

**Ziel:** Mockup-Sidebar und Editor-Header ohne neue Section-Logik.

| Feature | Mockup-Referenz | Umsetzung |
|---------|-----------------|-----------|
| Preset-Dropdown im Builder | Alle Mockups links | Wechsel zwischen Profilen im Projekt (nicht App-Theme) |
| „+ Neues Profil“ / Compare-Entry | Alle | Compare → Tab springen; New → bestehender Create-Dialog |
| Style-Strength-Gauge | 92–95 % Ring | UI-Platzhalter `0 %` / „—“, Button disabled + Tooltip „Step 5“ |
| Editor-Header | Wes Anderson / Marvel | Name, Typ-Badge, Version, Kurzbeschreibung, Preview-Thumbnails (`previewUrl` + `exampleRefs`) |
| Bottom-Status-Zeile | Asterix / DB | Style-ID, Last saved, Dirty-State (kein „All checks passed“ bis Step 5) |

**Dateien (neu/geändert):**

- `src/components/projects/styles/StyleProfileBuilderSidebar.tsx` (neu)
- `src/components/projects/styles/StyleProfileEditorHeader.tsx` (neu)
- `src/components/projects/styles/StyleProfileBuilderStatusBar.tsx` (neu)
- `StyleProfileBuilderLayout.tsx` — Sidebar + Status einbinden
- `ProjectStyleProfileEditor.tsx` — Header

**Acceptance:**

- [x] Builder zeigt 18er-Nav + Preset-Dropdown + Gauge-Platzhalter
- [x] Header zeigt Profilname + Preview-Thumbnail
- [x] Keine Fake-Analyse-Prozente

---

### Paket B — Rich Section Editors, Welle 1 (P1, groß)

**Ziel:** Die 8 wichtigsten Sektionen — decken ~80 % der Mockup-Fläche ab.

**Priorität (Reihenfolge Implementierung):**

| Prio | # | Key | Warum zuerst | Mockup-Controls |
|------|---|-----|--------------|-----------------|
| 1 | 1 | `styleDna` | Hero-Sektion, Tags, Stimmung | Keyword-Chips, Trait-Liste, optional 1 Referenzbild |
| 2 | 4 | `colorSystem` | In allen 6 Mockups zentral | Palette-Swatches (add/remove), Verteilung (Primary/Accent/Neutral %), Saturation-Slider |
| 3 | 3 | `lineSystem` | Comic + Anime + Cutout | Outer/Inner-Gewicht-Slider (0–100 %), Tapering-Select, Outline-Select |
| 4 | 5 | `shadingLighting` | Cel vs Flat vs Cinematic | Shadow-Steps (0–4), Gradient-Toggle, Rim-Light-Slider, Lighting-Mood-Tags |
| 5 | 15 | `doAvoid` | Klare UX, hoher Nutzen | Zwei Spalten Do/Avoid mit Chips; optional `exampleRefs` je Seite (später Bilder) |
| 6 | 6 | `characterRules` | Figuren in jedem Mockup | Heads-Tall-Slider, Proportion-Select, Silhouette-Priorität |
| 7 | 2 | `shapeLanguage` | Form-Sprache | Angularity, Chunkiness, Organic-Curves (Slider 0–1) |
| 8 | 13 | `cameraComposition` | Cinematic-Mockups | Shot-Type-Tags, Symmetry/Centering-Slider; Focal-Length-Chips (18–85 mm) für `cinematic_photoreal` |

**Architektur:**

```
src/components/projects/styles/sections/
  StyleSectionCardRouter.tsx      # key → spezialisierte Komponente | Fallback generic
  StyleDnaSectionCard.tsx
  ColorSystemSectionCard.tsx
  LineSystemSectionCard.tsx
  ...
  shared/
    SectionSliderRow.tsx
    PaletteSwatchEditor.tsx
    TagChipInput.tsx
    SectionReferenceSlots.tsx     # exampleRefs, max N Slots
```

```
src/lib/style-profile/section-schemas/
  index.ts
  style-dna.schema.ts             # Zod + machineParams defaults
  color-system.schema.ts
  ...
```

- `StyleSectionCard.tsx` bleibt **Fallback** für nicht migrierte Sektionen.
- `StyleSectionCardRouter` ersetzt direkten `StyleSectionCard`-Einsatz im Builder.
- Jede Section: **2–6 sichtbare Controls** + collapsible „Advanced JSON“ (Power-User).
- `normalize.ts` / `templates.ts`: Defaults für neue `machineParams`-Keys.

**Acceptance Welle 1:**

- [ ] 8 Sektionen haben dedizierte UI (kein generisches Textarea-only)
- [ ] Werte persistieren in `spec.visualSpec.*.machineParams` (lokal + Cloud Spec)
- [ ] Status-Badge: `configured` wenn Pflicht-Slider/Tags gesetzt
- [ ] Dateien ≤300 Zeilen (Split bei Bedarf)
- [ ] Vitest: mindestens `color-system.schema`, `line-system.schema` Round-trip

**Folge-Ticket:** `todo-T79-implementation-styleguide-rich-sections-wave1.md`

---

### Paket C — Rich Section Editors, Welle 2 (P2)

**Sektionen 7–12, 14, 16** (Step-1-Scaffold laut Konzept):

| # | Key | Mockup-Controls |
|---|-----|-----------------|
| 7 | `creatureRules` | Realism/Exaggeration-Slider, Threat-Level |
| 8 | `propRules` | Detail-Level, Function-Clarity (bereits teils Template) |
| 9 | `vehicleRules` | Scale, Surface-Detail, Boxiness |
| 10 | `environmentRules` | Set-Density, Atmospheric-Depth |
| 11 | `materialRules` | Material-Tags (Paper/Metal/Cloth), Abstraction-Slider |
| 12 | `fxRules` | FX-Style-Select (Graphic/Realistic), Particle-Density |
| 14 | `poseActing` | Gesture-Size, Expression-Exaggeration, Pose-Tags |
| 16 | `recognitionMarkers` | Icon+Label-Liste (editierbare Marker-Chips) |

**Folge-Ticket:** `todo-T80-implementation-styleguide-rich-sections-wave2.md`

---

### Paket D — Tool Settings Rich (P2)

**Ziel:** Rechtes Panel + Tool-Settings-Tab wie Mockup §18 — **speichern**, nicht ausführen.

| Bereich | Controls | Datenpfad |
|---------|----------|-----------|
| Image Generation | Prompt/Negative **Chips**, Steps, CFG, Resolution | `spec.toolSettings.imageGeneration` |
| Reference | Reference-Strength-Slider (0–1) | `toolSettings.comfyui.ipAdapter.styleReferenceStrength` |
| ComfyUI | Workflow-Select, Checkpoint, Sampler, Seed-Policy, CFG | `spec.toolSettings.comfyui` |
| Blender | Render Engine, Color Space, Shader/Outline-Preset | `spec.toolSettings.blender` |
| Export Actions | „Export Style Package“ → ZIP/JSON Bundle (client-side) | neuer Helper `export-style-package.ts` |
| Style Card | „Generate Style Card“ → PNG/PDF Preview (static layout) | optional Phase 2 |

**Nicht in Paket D:** ComfyUI-Queue, Blender-CLI (→ Step 4 / Puppet-Layer).

**Folge-Ticket:** `todo-T81-implementation-styleguide-tool-settings-rich.md`

---

### Paket E — Validation & Compare UI (P3, gekoppelt an Step 5)

**Ziel:** Mockup §17 + Compare — UI zuerst, echte Scores später.

| Feature | Phase E1 (UI) | Phase E2 (Step 5 Backend) |
|---------|---------------|---------------------------|
| Validation Grid | Asset-Slot-Grid (`validationAssets.exampleRefs`), Checkliste | Echte Consistency-Scores |
| Style Strength Gauge | Anzeige „— / nicht analysiert“ | KI/Heuristik-Analyse |
| Compare Tab | Side-by-Side zwei Profile (Summary + Top-Sektionen) | Diff-Highlight pro Sektion |
| „Analyze Style“ | disabled | `POST /ai/style/analyze` o.ä. |

**Folge-Ticket:** `todo-T82-implementation-styleguide-validation-compare.md` (E1), Step-5-Ticket für E2

---

### Paket F — Referenz-Presets (P3, optional)

**Ziel:** Die 6 Mockup-Stile als **Inhalt**, nicht als UI-Skin.

| Preset-ID | Name | Basis-Template |
|-----------|------|----------------|
| `cutout_satire` | Paper Town Cutout | `animated_stylized` |
| `martial_adventure` | Martial Adventure (DB-Inspired) | `animated_stylized` |
| `superhero_blockbuster` | Superhero Blockbuster | `cinematic_photoreal` |
| `wes_anderson` | Wes Anderson (Symmetrical) | `cinematic_photoreal` |
| `dark_fantasy` | Duskwarden / Dark Fantasy | `animated_stylized` |
| `gaulic_adventure` | Gaulic Adventure Comic | `animated_stylized` |

- Erweiterung `templates.ts` + `CreateStyleProfileDialog` (6 Optionen + Custom).
- Kein Preset-spezifisches CSS.

**Folge-Ticket:** `todo-T83-implementation-styleguide-reference-presets.md`

---

## Implementierungsreihenfolge (verbindlich)

```
Phase 0  T77 Step 2 ✅ (Spec round-trip, Migration on open, Hybrid push)
Phase 1  T79 ✅ Paket A (Builder Chrome)
Phase 2  T79 ✅ Paket B Welle 1 (8 Section Cards)
Phase 3  T81 — Paket D (Tool Settings Rich)
Phase 4  T80 — Paket C Welle 2 (8 Section Cards)
Phase 5  T83 — Paket F (6 Referenz-Presets)
Phase 6  T82 — Paket E1 (Validation/Compare UI-Shell)
Phase 7  Step 5  — Paket E2 (echte Analyse + Scores)
Phase 8  Step 6  — optional Vollbild-Styles-Route / Subnav
```

**Parallel erlaubt:** Step 3 Sync mit Phase 2–4 (kein Blocker).

---

## Technische Regeln

1. **Eine Registry** (`section-registry.ts`) bleibt Source of Truth für Nav/Titel; Section-Schemas nur für `machineParams`-Form.
2. **Keine Business-Logik in Cards** — Patch über `useStyleProfileEditor` / `onSectionChange`.
3. **Desktop-first:** Speichern über `style-profiles-adapter`; keine neuen raw `apiGet` in Components.
4. **Dateigröße:** max 300 Zeilen/Datei; Shared-Primitives unter `sections/shared/`.
5. **Tests:** Zod-Schema + normalize Round-trip pro neuer Section-Welle.
6. **Advanced JSON** bleibt als Escape-Hatch in jeder Card.

---

## Nicht-Ziele (explizit)

- App-Theme wechseln pro Preset (South-Park-Grün, Marvel-Dunkel, …)
- Fake 93–95 % Consistency ohne Analyse
- ComfyUI/Blender **ausführen**
- RenderJob / GuideBundle (Step 4)
- Cloud Sync-Konflikte (Step 3)
- Dedizierte `#projekte/{id}/styles` Vollbild-Route (Step 6, optional)

---

## Checks (wenn Implementation startet)

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" \
SHIM_CHANGED_FILES="src/components/projects/styles/,src/lib/style-profile/,src/hooks/useStyleProfileEditor.ts" \
npm run checks
```

---

## Acceptance (Plan-Ticket T78)

- [x] Gap Mockups vs Step-1-Scaffold dokumentiert
- [x] Pakete A–F mit Prioritäten und Sektions-Reihenfolge
- [x] Folge-Tickets T79–T83 benannt
- [x] Abhängigkeit zu Step 2/5/6 klar
- [ ] `docs/STYLEGUIDE_SYSTEM_CONCEPT.md` §17 um Rich-UI-Phasen ergänzen (bei Start T79)

---

## Referenz-Mockups (Workspace)

| Datei | Stil |
|-------|------|
| `assets/southpark_styleguide_example-*.png` | Cutout Satire |
| `assets/dragonball_styleguide_example-*.png` | Martial Adventure |
| `assets/marvel_styleguide_example-*.png` | Superhero Blockbuster |
| `assets/wes_anderson_styleguide_example-*.png` | Wes Anderson |
| `assets/adnime_adventure_styleguide_example-*.png` | Dark Fantasy |
| `assets/asterix_styleguide_example-*.png` | Gaulic Adventure |
