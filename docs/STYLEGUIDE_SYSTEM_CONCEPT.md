# Scriptony Styleguide-System — Gesamtkonzept

> **Status:** Planung / Step 1 Implementation  
> **Stand:** 2026-06-15  
> **Zielgruppe:** Entwickler, Agenten, Produkt  
> **Produktprinzip:** Desktop-first (Tauri + `.scriptony` + SQLite). Cloud ist Hybrid-Erweiterung, nicht Ersatz.

---

## Inhaltsverzeichnis

1. [Vision & Produktentscheidungen](#1-vision--produktentscheidungen)
2. [Abgrenzung: Was existiert schon](#2-abgrenzung-was-existiert-schon)
3. [Domänenmodell](#3-domänenmodell)
4. [Informationsarchitektur (Navigation)](#4-informationsarchitektur-navigation)
5. [UI/UX — Gesamtlayout](#5-uiux--gesamtlayout)
6. [UI/UX — Screens & Flows](#6-uiux--screens--flows)
7. [Die 18 Styleguide-Sektionen](#7-die-18-styleguide-sektionen)
8. [Datenmodell (Types & Speicher)](#8-datenmodell-types--speicher)
9. [Lokal vs. Cloud vs. Hybrid](#9-lokal-vs-cloud-vs-hybrid)
10. [API & Adapter-Schicht](#10-api--adapter-schicht)
11. [Backend (Functions & infra)](#11-backend-functions--infra)
12. [Migration vom alten StyleGuide](#12-migration-vom-alten-styleguide)
13. [Templates](#13-templates)
14. [Aktives StyleProfile](#14-aktives-styleprofile)
15. [Edge Cases & Fehlerverhalten](#15-edge-cases--fehlerverhalten)
16. [Step 1 — Scope (MUSS)](#16-step-1--scope-muss)
17. [Step 2+ — Roadmap (SPÄTER)](#17-step-2--roadmap-später)
18. [Dateistruktur & SOLID/DRY](#18-dateistruktur--soliddry)
19. [Acceptance Criteria](#19-acceptance-criteria)
20. [Referenz-Mockups](#20-referenz-mockups)
21. [Agent-Implementierungsreihenfolge](#21-agent-implementierungsreihenfolge)

---

## 1. Vision & Produktentscheidungen

### Was der Styleguide ist

Der Styleguide ist **nicht** nur Text/Prompt. Er ist die **UI für ein maschinenlesbares StyleProfile / StyleSpec**, das später steuert:

- ComfyUI (Workflows, LoRA, ControlNet, IP-Adapter)
- Blender (Shader, Outline, Export-Presets)
- GuideBundles
- RenderJobs & Repair-Jobs
- Stage2D / Stage3D / Puppet-Layer
- Bildgenerierung (Shot Preview, Character Sheets, etc.)

### Was er in Step 1 **nicht** ist

- Keine echte ComfyUI-Queue
- Keine Blender-Ausführung
- Keine KI-Analyse von Referenzbildern
- Kein Node-Editor
- Keine RenderPipeline-Ausführung
- Kein bidirektionaler Cloud-Sync

Step 1 liefert: **UI, Datenmodell, lokale Persistenz, Cloud-Summary-Fallback, JSON-Export, aktives Projekt-Style.**

### Bindende Architekturentscheidungen

| Thema | Entscheidung |
|-------|--------------|
| Primärdomäne | **StyleProfile** (N pro Projekt) |
| Legacy StyleGuide | Import/Link; Tabs wiederverwenden, nicht neu bauen |
| Desktop | Voller CRUD + volle Spec in SQLite |
| Cloud Step 1 | Kompakte Summary in `configJson`; volle Spec **local-only** |
| `configJson` 10k-Limit | **Nicht** blind erhöhen; Summary + später `specRef` / Storage |
| Aktives Profil | `activeStyleProfileId` am Projekt — **Default**, nicht einziges Profil |
| UI-Layout | Tabs oben + **Builder-Tab = 3-Spalten-Mockup** |
| Routing | Hash: `#projekte/{projectId}/styles?profileId={id}` |
| Stack | Vite + React + Tauri; **kein** Lovable/Supabase/Next-Parallelstack |

### Projekt-IA (langfristig)

```
Project
├── Overview
├── Cast
├── Stage
├── Styles          ← Step 1
├── Renders         ← später
└── Settings
```

Step 1 implementiert nur **Styles**. Rest bleibt unverändert.

---

## 2. Abgrenzung: Was existiert schon

### Nicht neu bauen

| Bereich | Pfad / Service | Status |
|---------|----------------|--------|
| Projektseite | `ProjectsPage` / `ProjectDetail` | ✓ existiert |
| StyleGuide UI (Basis) | `StyleGuideSection` + 3 Tabs | ✓ wiederverwenden |
| StyleGuide API | `scriptony-style-guide` → `/style-guide/*` | ✓ Cloud/Hybrid |
| StyleProfile Backend | `scriptony-style` → `/ai/style/profiles` | ✓ Cloud only |
| Collection | `styleProfiles` | ✓ `configJson` max 10k |
| RenderJobs | `renderJobs` + `RenderJobPanel` | ✓ pro Shot, nicht anbinden in Step 1 |
| Stage2D/3D | `StagePage`, Functions | ✓ nicht anbinden in Step 1 |
| Navigation global | `Navigation.tsx` | ✓ Stage bleibt global |

### Zwei getrennte Domänen (wichtig!)

| | StyleGuide | StyleProfile |
|---|------------|--------------|
| **Anzahl** | 1× pro Projekt | N× pro Projekt |
| **Function** | `scriptony-style-guide` | `scriptony-style` |
| **Speicher Cloud** | `project_visual_style` + `_items` | `styleProfiles` |
| **Frontend API** | `style-guide-api.ts` + Adapter | **fehlt** — Step 1 bauen |
| **Lokal** | Draft via Adapter | **fehlt** — Step 1 SQLite |
| **Zweck heute** | Mood, Referenzen, Prompt-Export | Puppet-Layer, Shots, RenderJobs |

**Step-1-Strategie:** StyleProfile primär; StyleGuide-Inhalt per Import (`source.type = "style-guide"`) und Tabs References/Rules.

### Tech-Stack (verbindlich)

- Vite + React 18 + TypeScript
- Hash-Router (`useRouter.ts`), **kein** react-router-dom für Pages
- Tauri Desktop-first
- Tailwind + CSS-Variablen (`src/index.css`)
- Radix/shadcn-style: `src/components/ui/*`
- API: `src/lib/api-adapter/` + `dispatchByRuntime`
- Appwrite Functions (Hono), **kein** Express/Supabase

Siehe auch: `docs/DESKTOP_FIRST_DEV.md`, `docs/ARCHITECTURE_LOCAL_CLOUD.md`, `docs/DOMAIN_GLOSSAR.md`.

---

## 3. Domänenmodell

```
┌─────────────────────────────────────────────────────────────┐
│ Project                                                      │
│  activeStyleProfileId?: string   (Default, nicht exclusiv)  │
└──────────────────────────┬──────────────────────────────────┘
                           │ 1:N
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ StyleProfile                                                 │
│  Metadaten: name, type, status, version, preview            │
│  configSummary (kompakt, cloud-safe)                        │
│  spec (voll: visualSpec + toolSettings + validationConfig)  │
│  source?: Link zu StyleGuide                                │
│  sync?: { cloudId, status, lastSyncedAt }  (vorbereitet)    │
└──────────────────────────┬──────────────────────────────────┘
                           │ später
                           ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ GuideBundle  │  │ RenderJob    │  │ Shot/Scene   │
│              │  │              │  │ Overrides    │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Override-Hierarchie (später, vorbereiten in Types)

```
project.activeStyleProfileId          → Default
scene.styleProfileOverrideId?         → später
shot.styleProfileOverrideId?          → später
character.defaultStyleProfileId?      → später
renderJob.styleProfileId              → existiert in Collection
```

Step 1: nur `project.activeStyleProfileId` + UI „Set as Active“.

---

## 4. Informationsarchitektur (Navigation)

### Hash-Router (3 Segmente + Query)

```
#page / id / categoryId
```

| URL | Bedeutung |
|-----|-----------|
| `#projekte` | Projektliste |
| `#projekte/{projectId}` | ProjectDetail (Overview, Structure, Cast, …) |
| `#projekte/{projectId}/styles` | Deep-Link: öffnet Collapsible + Tab „Style Profiles“ (kein eigener Screen) |
| `#projekte/{projectId}/styles?profileId={id}` | Deep-Link: Collapsible + Profile-Editor inline |

**Router:** `useRouter` parst `?profileId=`; nach Öffnen normalisiert die App auf `#projekte/{projectId}` (State bleibt).

### Einstiegspunkte

1. **ProjectDetail** — Collapsible „Style Guide“ (Chevron) → Tabs „Style Guide“ | „Style Profiles“
2. **Deep-Link** — `#projekte/…/styles?profileId=…` öffnet Collapsible + Editor
3. **Später** — Projekt-Subnav-Tabs (Step 6)

### Guards

- **Desktop + lokales Projekt:** `LocalProjectOpenGuard` wie bei ProjectDetail
- **Cloud-only:** Styles-Liste erlaubt; voller Editor mit Banner

---

## 5. UI/UX — Gesamtlayout

### Design-System (Scriptony, nicht Mockup-Skin)

Die Referenz-Mockups (South Park, Marvel, Wes Anderson, Asterix, Dark Fantasy, Dragon Ball) definieren **Informationsarchitektur**, nicht das App-Chrome:

| Element | Scriptony |
|---------|-----------|
| Akzentfarbe | Lila `#6E59A5` (bestehend) |
| Hintergrund | `bg-background`, `bg-card` |
| Komponenten | `Button`, `Badge`, `Tabs`, `Card`, `Collapsible`, `Slider`, `Select` aus `src/components/ui/` |
| Typografie | Bestehende App-Hierarchie |
| Preset-Namen | Inhalt der Profile, **nicht** UI-Theme wechseln |

### Style Profiles (inline im Collapsible)

```
┌─ Collapsible: Style Guide ─────────────────────────────────┐
│ [Style Guide] [Style Profiles]                             │
├────────────────────────────────────────────────────────────┤
│ Active Project Style: [CUTOUT SATIRE ▼]   [+ Neues Profile]│
│ ┌─────────┐ ┌─────────┐                                    │
│ │ Card    │ │ Card    │  … Liste / Editor inline           │
│ └─────────┘ └─────────┘                                    │
└────────────────────────────────────────────────────────────┘
```

Komponenten: `ProjectStyleGuidePanel`, `ProjectStyleProfilesPanel`, `ProjectStyleProfileEditor`.

**Empty State:** Icon + „Create Style Profile“ + Template-Auswahl.

### Profile-Editor (ProjectStyleProfileEditor)

**Oben: Tab-Leiste (horizontal, scrollbar auf Mobile)**

```
Overview | Builder | References | Rules | Validation Grid | Tool Settings | Compare | Export / JSON
```

**Sticky Footer/Bar bei Dirty State:**

```
[● Ungespeichert]                    [Discard] [Save]
```

**Cloud-Banner (wenn full spec nicht editierbar):**

```
⚠ Full StyleSpec editing requires a local .scriptony project until cloud spec storage is enabled.
  You can edit the compact summary below.
```

### Builder-Tab — 3-Spalten-Layout (Kern-UX)

Inspiriert von Referenz-Mockups; umgesetzt in Scriptony-Chrome:

```
┌──────────────┬────────────────────────────────────┬─────────────────┐
│ Style        │  Visual Rule Cards (Grid)          │ Tool Settings   │
│ Overview     │                                    │ Inspector       │
│ (18 Nav)     │  ┌──────┐ ┌──────┐ ┌──────┐      │                 │
│              │  │ 1 DNA│ │ 2 Shp│ │ 3 Line│      │ Prompt Tokens   │
│ 1 Style DNA ●│  └──────┘ └──────┘ └──────┘      │ Negative Tokens │
│ 2 Shape      │  ┌──────┐ ┌──────┐ ...            │ Reference Str.  │
│ 3 Line       │  │ ...  │                          │ ComfyUI (scaff) │
│ ...          │                                    │ Blender (scaff) │
│ 18 Tool*     │  [Section 17: Validation Assets]   │                 │
│              │  (breite Karte unten)              │ [Export Pkg]    │
│ Preset: [▼]  │                                    │ (disabled S1)   │
│ + New Style  │                                    │                 │
│ Compare      │                                    │                 │
│              │                                    │                 │
│ ○ 95% Consist│                                    │                 │
│ [Analyze]    │                                    │                 │
│ (placeholder)│                                    │                 │
└──────────────┴────────────────────────────────────┴─────────────────┘
```

**Responsive:**

| Breakpoint | Verhalten |
|------------|-----------|
| Desktop (≥1024px) | 3 Spalten: Nav ~220px, Grid flex, Inspector ~280px |
| Tablet | Nav horizontal scroll oben; Inspector als rechte Drawer/Sheet |
| Mobile | Nav → Dropdown; Cards 1-spaltig; Inspector → Bottom Sheet |

### Style Strength Gauge (Step 1)

- UI-Platzhalter (Kreis 0–100 %)
- Button „Analyze Style“ → disabled + Tooltip „Coming soon“
- Keine Fake-Analyse

---

## 6. UI/UX — Screens & Flows

### Flow A: Erstes StyleProfile anlegen

1. User öffnet Projekt → klickt „Styles öffnen“
2. Empty State → „Create Style Profile“
3. Dialog: Name, Template (`Animated/Stylized` | `Cinematic/Photoreal`)
4. System erstellt Profil mit Template-Defaults
5. **Optional:** erstes Profil → `activeStyleProfileId` setzen
6. Redirect zu `#projekte/{id}/styles?profileId={newId}`
7. Editor öffnet auf Tab **Overview**

### Flow B: Profil bearbeiten & speichern

1. User wählt Sektion in Builder-Nav
2. Grid scrollt zu Card / Card highlighted
3. User editiert Felder (Form oder JSON-Subeditor)
4. Dirty State → Save
5. **Lokal:** volle `spec_json` in SQLite
6. **Cloud (wenn Session):** nur `configSummary` an `/ai/style/profiles/{id}`

### Flow C: Aus StyleGuide importieren

1. Tab **Overview** oder **Rules** → Button „Aus Style Guide übernehmen“
2. Lädt `StyleGuideData` (bestehender Adapter)
3. Mappt Felder (siehe [Anhang A](#anhang-a--styleguide--styleprofile-import-mapping))
4. Setzt `source: { type: "style-guide", referenceId, styleGuideId }`
5. User speichert explizit

### Flow D: Aktives Profil wechseln

1. Styles-Liste oder Overview → „Set as Active Project Style“
2. Schreibt `activeStyleProfileId` in `project-settings.json` (lokal) bzw. `metadata_json` (cloud)
3. Badge „Active“ auf Karte
4. Kein Auto-Apply auf Shots in Step 1

### Flow E: Duplicate & Export

- **Duplicate:** Adapter `get` + `create` mit kopiertem Namen „{name} (Copy)“
- **Export JSON:** Volle Spec + Summary + Metadata; Download + Clipboard

### Flow F: ProjectDetail-Migration

**Vorher:** Collapsible „Style Guide“ (default zu) mit vollem `StyleGuideSection`

**Nachher:**

```
┌─────────────────────────────────────────┐
│ 🎨 Style Guide              [Styles →]  │
│ Kurz: 2 Profile · Active: CUTOUT SATIRE │
│ oder: Noch kein Style Profile           │
└─────────────────────────────────────────┘
```

Klick „Styles →“ navigiert zu `#projekte/{id}/styles`.

---

## 7. Die 18 Styleguide-Sektionen

Jede Sektion ist eine **StyleSectionCard** mit einheitlichem Schema.

### Sektions-Registry (`style-section-registry.ts`)

| # | Key | Titel (DE UI) | Step-1-Status |
|---|-----|---------------|---------------|
| 1 | `styleDna` | Style DNA | Template + editierbar |
| 2 | `shapeLanguage` | Shape Language | Template + editierbar |
| 3 | `lineSystem` | Line System | Template + editierbar |
| 4 | `colorSystem` | Color System | Template + editierbar |
| 5 | `shadingLighting` | Shading / Lighting | Template + editierbar |
| 6 | `characterRules` | Character Rules | Template + editierbar |
| 7 | `creatureRules` | Creature Rules | Scaffold |
| 8 | `propRules` | Prop Rules | Template + editierbar |
| 9 | `vehicleRules` | Vehicle Rules | Scaffold |
| 10 | `environmentRules` | Environment Rules | Template + editierbar |
| 11 | `materialRules` | Material Rules | Scaffold |
| 12 | `fxRules` | FX Rules | Scaffold |
| 13 | `cameraComposition` | Camera / Composition | Template (Cinematic) |
| 14 | `poseActing` | Pose / Acting | Scaffold |
| 15 | `doAvoid` | Do / Avoid | Template + editierbar |
| 16 | `recognitionMarkers` | Recognition Markers | Scaffold |
| 17 | `validationAssets` | Validation Assets | Scaffold (Validation Grid Tab) |
| 18 | `toolSettings` | Tool Settings | Scaffold (eigener Tab + Inspector) |

### Card-Struktur (perspektivisch alle Ebenen; Step 1 Teilmenge)

```typescript
interface StyleSectionState {
  status: "draft" | "configured" | "missing";
  summary?: string; // 1–2 Zeilen UI
  humanRules?: string[]; // Lesbare Regeln
  machineParams?: Record<string, unknown>; // Slider, Enums
  toolMapping?: Record<string, unknown>; // ComfyUI/Blender keys
  doItems?: string[];
  avoidItems?: string[];
  exampleRefs?: string[]; // URLs / asset IDs (später)
}
```

### Step-1-Mindestfelder pro Card

- Titel + Beschreibung (aus Registry)
- Status-Badge (auto: `missing` wenn leer, `configured` wenn Pflichtfelder gesetzt)
- Summary-Textarea
- Optional: 2–3 kontextspezifische Felder (z. B. `colorSystem.palette[]`, `lineSystem.weight`)
- „Advanced JSON“ collapsible für Power-User

### Status-Logik

```
missing     → keine meaningful data
draft       → partial data
configured  → template defaults applied OR required fields filled
```

---

## 8. Datenmodell (Types & Speicher)

### StyleProfile (Domain)

```typescript
interface StyleProfile {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type: "animated_stylized" | "cinematic_photoreal" | "custom";
  status: "draft" | "published" | "archived";
  version: number;
  previewImageId?: string | null;
  previewUrl?: string | null;

  configSummary: StyleProfileSummary; // cloud-safe, <10k serialized
  spec: StyleProfileSpec; // full local

  source?: StyleProfileSource;
  sync: StyleProfileSyncMeta;

  createdAt: string;
  updatedAt: string;
}

interface StyleProfileSource {
  type: "manual" | "style-guide" | "import" | "template" | "unknown";
  referenceId?: string;
  styleGuideId?: string;
  templateId?: string;
  importedAt?: string;
}

interface StyleProfileSyncMeta {
  status: "local" | "pending" | "synced" | "conflict";
  cloudId?: string | null;
  lastSyncedAt?: string | null;
}
```

### StyleProfileSpec

```typescript
interface StyleProfileSpec {
  visualSpec: {
    styleDna: StyleSectionState;
    shapeLanguage: StyleSectionState;
    lineSystem: StyleSectionState;
    colorSystem: StyleSectionState;
    shadingLighting: StyleSectionState;
    characterRules: StyleSectionState;
    creatureRules: StyleSectionState;
    propRules: StyleSectionState;
    vehicleRules: StyleSectionState;
    environmentRules: StyleSectionState;
    materialRules: StyleSectionState;
    fxRules: StyleSectionState;
    cameraComposition: StyleSectionState;
    poseActing: StyleSectionState;
    doAvoid: StyleSectionState;
    recognitionMarkers: StyleSectionState;
    validationAssets: StyleSectionState;
    // Sektion 18 in Nav; Daten in spec.toolSettings
  };
  toolSettings: {
    imageGeneration?: {
      baseModelId?: string;
      baseModelHash?: string;
      loraStack?: Array<{
        id: string;
        name?: string;
        hash?: string;
        strengthModel?: number;
        strengthClip?: number;
        triggerWords?: string[];
      }>;
      promptTemplate?: string;
      negativePrompt?: string;
      sampler?: string;
      scheduler?: string;
      steps?: number;
      cfg?: number;
      denoise?: number;
      seedPolicy?: "random" | "locked_per_asset" | "locked_per_revision";
      defaultWidth?: number;
      defaultHeight?: number;
    };
    comfyui?: {
      workflowBindings?: {
        textToImage?: string;
        imageToImage?: string;
        characterSheet?: string;
        propSheet?: string;
        environmentConcept?: string;
        shotPreview?: string;
        shotFinal?: string;
        repairInpaint?: string;
      };
      controlNetMix?: {
        depth?: number;
        lineart?: number;
        pose?: number;
        segmentation?: number;
        normal?: number;
      };
      ipAdapter?: {
        styleReferenceStrength?: number;
        characterReferenceStrength?: number;
        compositionReferenceStrength?: number;
      };
    };
    blender?: {
      guideExportPresetId?: string;
      shaderProfileId?: string;
      outlinePresetId?: string;
      materialProfileId?: string;
      renderEngine?: string;
      colorManagement?: string;
    };
  };
  validationConfig?: {
    requiredAssets?: string[];
    checks?: {
      paletteMatch?: boolean;
      lineMatch?: boolean;
      shapeMatch?: boolean;
      characterConsistency?: boolean;
      materialMatch?: boolean;
      structureMatch?: boolean;
    };
    thresholds?: {
      styleScore?: number;
      paletteScore?: number;
      silhouetteScore?: number;
      characterConsistencyScore?: number;
    };
  };
  references?: unknown[]; // Step 1: []
  metadata?: Record<string, unknown>;
}
```

### Abwärtskompatibilität (altes `StyleProfileConfig`)

Bestehendes Puppet-Schema (`functions/_shared/style-profile-schema.ts`):

- `styleSummary`, `palettePrimary`, `compactPrompt`, etc. bleiben gültig
- `normalizeStyleProfile()` mappt alte `config` → `configSummary` + leere `visualSpec`-Defaults
- `.passthrough()` erlaubt neue Keys ohne Breaking Change

### SQLite `style_profiles` (Schema v2)

```sql
CREATE TABLE style_profiles (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT DEFAULT '',
  type                TEXT NOT NULL DEFAULT 'custom',
  status              TEXT NOT NULL DEFAULT 'draft',
  version             INTEGER NOT NULL DEFAULT 1,
  preview_asset_id    TEXT,
  config_summary_json TEXT NOT NULL DEFAULT '{}',
  spec_json           TEXT NOT NULL DEFAULT '{}',
  source_json         TEXT DEFAULT '{}',
  sync_status         TEXT NOT NULL DEFAULT 'local',
  cloud_id            TEXT,
  last_synced_at      TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  deleted_at          TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX idx_style_profiles_project ON style_profiles(project_id);
```

`SCHEMA_VERSION`: 1 → 2 mit Migration in `database-init` / Migrations-Runner.

### `activeStyleProfileId`

| Runtime | Speicherort |
|---------|-------------|
| Lokal | `project-settings.json` → Feld `activeStyleProfileId` |
| Cloud | `projects.metadata_json.activeStyleProfileId` (PATCH via `scriptony-projects`) |

Erweiterung `LocalProjectSettings` in `src/local/project-settings.ts`.

### Cloud `styleProfiles` Collection (Step 1 minimal)

Bestehend + vorbereitet:

```
userId, projectId, name, previewImageId, configJson (summary), version, createdAt
+ specRef (string, optional, null in Step 1)
```

**Keine** produktive `styleProfileSpecs` Collection in Step 1.

---

## 9. Lokal vs. Cloud vs. Hybrid

### Capability-Matrix

| Fähigkeit | Desktop + `.scriptony` offen | Desktop ohne Cloud-Session | Cloud-Browser |
|-----------|-------------------------------|----------------------------|---------------|
| Profile Liste | SQLite | SQLite | Appwrite API |
| Create/Edit/Delete | ✓ voll | ✓ voll | Summary only |
| Volle visualSpec | ✓ | ✓ | ✗ (Banner) |
| toolSettings voll | ✓ | ✓ | Scaffold read-only |
| StyleGuide References | Hybrid wenn JWT | Draft/Hinweis | Cloud API |
| Export JSON voll | ✓ | ✓ | Summary + Hinweis |
| activeStyleProfileId | project-settings | project-settings | metadata_json |

### Cloud-Save-Regel (kritisch)

```
Vor jedem Cloud PUT:
  summary = buildStyleProfileSummary(spec)
  if serialize(summary).length > 10000:
    → Fehler, Toast, KEIN Save, lokale Spec unberührt
  payload = { config: summary, specRef: null }
```

**Niemals** volle Spec in `configJson` schreiben.

### Hybrid mit Cloud-Session (Desktop)

Optional in Step 1:

- Nach lokalem Save → Background-Push Summary an Cloud (best effort)
- Fehler nicht blockierend (Toast warning)
- Volle Spec bleibt lokal bis Step 2 `specRef`

---

## 10. API & Adapter-Schicht

### Facade (`style-profile-api.ts`)

```typescript
listStyleProfiles(projectId: string): Promise<StyleProfile[]>;
getStyleProfile(profileId: string): Promise<StyleProfile>;
createStyleProfile(
  projectId: string,
  payload: CreateStyleProfilePayload,
): Promise<StyleProfile>;
updateStyleProfile(
  profileId: string,
  patch: UpdateStyleProfilePatch,
): Promise<StyleProfile>;
duplicateStyleProfile(profileId: string): Promise<StyleProfile>;
deleteStyleProfile(profileId: string): Promise<void>;
exportStyleProfileJson(profileId: string): Promise<StyleProfileExport>;
setActiveStyleProfile(
  projectId: string,
  profileId: string | null,
): Promise<void>;
getActiveStyleProfileId(projectId: string): Promise<string | null>;
importFromStyleGuide(
  projectId: string,
  profileId: string,
): Promise<StyleProfile>;
```

### Adapter (`style-profiles-adapter.ts`)

```typescript
dispatchByRuntime(
  () => cloudList(projectId),
  () => localList(projectId),
);
```

### Cloud HTTP (`style-profile-cloud-http.ts`)

Mapped zu bestehenden Endpoints:

| Operation | Endpoint |
|-----------|----------|
| List | `GET /ai/style/profiles?projectId=` |
| Get | `GET /ai/style/profiles/{id}` |
| Create | `POST /ai/style/profiles` |
| Update | `PUT /ai/style/profiles/{id}` |
| Delete | `DELETE /ai/style/profiles/{id}` |

### Lokales Repository

`LocalStyleProfileRepository` — CRUD auf `style_profiles` Tabelle, soft delete via `deleted_at`.

### React Query Keys

```typescript
styleProfiles: {
  byProject: (projectId) => ["styleProfiles", "project", projectId],
  byId: (id) => ["styleProfiles", id],
  active: (projectId) => ["styleProfiles", "active", projectId],
}
```

### UI-Regel

Komponenten importieren **nur** `style-profile-api.ts` — nie `apiClient`, nie Cloud-HTTP direkt.

---

## 11. Backend (Functions & infra)

### Step 1 — erlaubt

**`functions/_shared/style-profile-schema.ts`**

- `styleProfileSummarySchema` (subset, strikt size-bounded)
- `styleProfileConfigSchema` behält `.passthrough()` für Legacy
- `specRef` optional in API types
- `serializeStyleProfileConfig` → nur Summary; klare Fehlermeldung bei >10k

**`functions/scriptony-style/style-service.ts`**

- `styleProfileRowToApi` gibt `specRef` zurück
- Create/Update akzeptieren Summary in `configJson`

**`infra/appwrite/collections/styleProfiles.json`**

- Attribut `specRef` (string, optional) hinzufügen

**`functions/scriptony-projects`**

- PATCH erlaubt `metadata_json.activeStyleProfileId` (merge, nicht replace ganzes JSON)

### Step 1 — nicht

- `styleProfileSpecs` Collection aktiv
- Sync-Endpoints
- Duplicate-Endpoint (Client/Adapter)
- RenderJob-Integration
- ComfyUI/Blender Execute

---

## 12. Migration vom alten StyleGuide

### Phase Step 1

| Alt | Neu (Step 1, Stand 2026) |
|-----|--------------------------|
| Collapsible mit nur `StyleGuideSection` | Collapsible mit `ProjectStyleGuidePanel`: Tab Guide (3 Sub-Tabs) + Tab Profiles |
| StyleGuide nur inline | Referenzen/Regeln **nur** im Tab „Style Guide“ (DRY) |
| — | Style Profiles: Liste + Editor **inline**, kein eigener Vollbild-Screen |
| StyleGuide Daten | Bleiben in `project_visual_style`; Import-Button im Profile-Overview |
| `useStyleGuideForCover` | Bleibt an StyleGuide-Tab „Regeln“ gebunden |

### Phase später

- Option: ein aktives Profile wird aus StyleGuide auto-generiert bei Projekt-Create
- Referenz-Items (`project_visual_style_items`) → Profile `references` oder verlinkt
- Deprecation StyleGuide als eigene Domäne (langfristig)

---

## 13. Templates

### `animated_stylized` (stärker vorausgefüllt)

Prefill:

- `styleDna`, `shapeLanguage`, `lineSystem`, `colorSystem`, `shadingLighting`
- `characterRules`, `propRules`, `environmentRules`
- `doAvoid` mit typischen DO/AVOID
- `toolSettings.imageGeneration` mit generischen Prompt-Tokens
- `lineSystem.status = configured`
- `cameraComposition` basic

### `cinematic_photoreal`

Prefill:

- `cameraComposition`, `shadingLighting`, `materialRules`, `colorSystem` (grade/LUT-orientiert)
- `lineSystem` → `{ disabled: true, status: "configured" }` oder Hinweis „not relevant“
- `toolSettings.blender` + `imageGeneration` cinematic defaults

### Create-Dialog UX

```
Name: [________________]
Template:
  (●) Animated / Stylized
  ( ) Cinematic / Photoreal
[Cancel] [Create]
```

---

## 14. Aktives StyleProfile

### Semantik

- `project.activeStyleProfileId` = **Default Project Style**
- **Nicht** das einzige erlaubte Profil
- Später: Overrides auf Scene/Shot/Character/RenderJob

### UI

- Badge „Active“ auf Listen-Card
- Overview-Tab: „This is the active project style“
- Button „Set as Active Project Style“ (explizite Aktion)
- Dropdown in Listen-Header für schnellen Wechsel

### Regeln

| Aktion | Verhalten |
|--------|-----------|
| Erstes Profil erstellt | Optional auto-active (Default: `true`) |
| Aktives Profil gelöscht | `activeStyleProfileId = null` + Toast |
| Profil dupliziert | Kopie **nicht** auto-active |

---

## 15. Edge Cases & Fehlerverhalten

| # | Fall | Verhalten |
|---|------|-----------|
| 1 | Kein lokales Projekt geöffnet (Desktop) | Guard + CTA „Projekt öffnen“ |
| 2 | Cloud-only, volle Spec speichern | Block + Banner, Summary erlaubt |
| 3 | Summary > 10k | Fehler vor API-Call; lokale Spec safe |
| 4 | StyleGuide Cloud offline | References-Tab Hinweis; Profile lokal nutzbar |
| 5 | `profileId` in URL ungültig | 404-State + Link zur Liste |
| 6 | Dirty State + Navigation weg | Confirm-Dialog |
| 7 | Concurrent edit (selber Client) | Last save wins (Step 1); Sync später |
| 8 | Legacy Cloud Profile ohne visualSpec | `normalizeStyleProfile()` Defaults |
| 9 | localId ≠ cloudId | `sync.cloudId` für Step 3 vorbereitet |
| 10 | Mobile 3-Spalten | Responsive: Nav oben, Inspector als Sheet |

---

## 16. Step 1 — Scope (MUSS)

### Implementieren

- [x] SQLite `style_profiles` + Migration v4
- [x] `LocalStyleProfileRepository` + Unit-Tests
- [x] Types, Registry, Templates, Summary-Builder, Normalize
- [x] `style-profile-api` + Adapter + Cloud-HTTP
- [x] Router: Deep-Link `?profileId=` (normalisiert auf Projekt-URL)
- [x] Inline Profiles: Liste, Empty, Create, Duplicate, Export, Set Active
- [x] `ProjectStyleProfileEditor` (Tabs, Builder 3-Spalten, 18 Cards Scaffold)
- [x] Tool Settings Scaffold (Form + JSON)
- [x] JSON Export Tab
- [x] `activeStyleProfileId` in project-settings + cloud metadata
- [x] ProjectDetail: Collapsible + `ProjectStyleGuidePanel` (Guide + Profiles)
- [x] StyleGuide Tabs wiederverwendet (Referenzen, Regeln im Guide-Tab)
- [x] Import from StyleGuide (Basic Mapping) + Tests
- [x] Functions: Summary serializer, `specRef` field, compatible parse
- [x] `CloudSpecLimitedBanner`
- [x] Capability registry `domain.crud.style_profiles`
- [x] Dirty-State Confirm, 404 Profil, Active-UX (Overview + Listen-Dropdown)

### Explizit nicht

- ComfyUI Queue, Blender Execute
- RenderJob / GuideBundle Wiring
- Sync Engine / Conflict Resolution
- `styleProfileSpecs` Cloud Collection produktiv
- Style Strength echte Analyse
- Compare Tab (nur Placeholder)
- Projekt-Subnav Overview/Cast/Stage/Renders/Settings

---

## 17. Step 2+ — Roadmap

### Step 2 — Cloud Spec Storage (done, T77)

- [x] Volle Spec in Appwrite Storage (`general` bucket), `specRef` = File-ID
- [x] `scriptony-style`: GET Profil lädt Spec; PUT/POST speichern Spec + Summary
- [x] Preview-Upload: `POST /ai/style/profiles/:id/preview-image`
- [x] Cloud-Browser: voller Editor (`fullSpecEditing: true`, Spec aus Storage)
- [x] Hybrid Desktop: lokaler Save → Background-Push Spec + Summary (`hybrid-cloud-push.ts`)
- [x] SQLite-Migration v4 (`style_profiles`) beim Projekt-Öffnen (`migrateLocalDb`)
- [ ] Manueller Smoke in Cloud (Auth/Rate-Limit — `scripts/smoke-style-profiles.mjs`)
- [ ] Optional: dediziertes Storage-Bucket `style-profile-specs` (deferred)

### Step 3 — Sync (T40-Pattern)

- [x] `style-profile-sync-engine` + Konflikt-UI (T86)
- [x] `ProjectSyncEngine` Orchestrator (T93) — Style + Meta + Characters + Timeline-Meta
- `syncStatus`, `conflictState`, `lastSyncedAt` auf Profiles

### Step 4 — Overrides & Pipeline

- [x] `scene.styleProfileOverrideId`, `shot.styleProfileOverrideId`
- [x] RenderJob nutzt active + override resolution
- [x] `POST /ai/style/guide-bundle` — GuideBundle aus Spec (T96)

### Step 5 — Analyse & Validation

- [x] Style Strength / Consistency Score (Heuristik + `mode: ai`)
- [x] `mode: vision` + Asset-Checks pro Slot (T91)
- [x] Validation Grid mit Ampeln
- [x] Compare Styles Side-by-Side (T90)

### Step 6 — Projekt-IA

- [x] Subnav: Overview | Struktur | Cast | **Stage** | Styles | Renders | **Einstellungen**
- [x] Renders als aggregierte Projektsektion (T88)
- [x] Settings: aktives Profil + Projekt-Sync (T100)

---

## 18. Dateistruktur & SOLID/DRY

### Neue Dateien (Step 1)

```
src/lib/types/style-profile.ts
src/lib/style-profile/
  section-registry.ts
  templates.ts
  summary.ts
  normalize.ts
  import-from-style-guide.ts

src/lib/api/style-profile-api.ts
src/lib/api/style-profile-cloud-http.ts
src/lib/api-adapter/style-profiles-adapter.ts
src/lib/api-adapter/style-profiles-local.ts

src/backend/local/LocalStyleProfileRepository.ts
src/backend/local/__tests__/LocalStyleProfileRepository.test.ts

src/hooks/useProjectStyleProfiles.ts
src/hooks/useActiveStyleProfile.ts
src/hooks/useStyleProfileEditor.ts

src/components/projects/styles/
  ProjectStyleGuidePanel.tsx
  ProjectStyleProfilesPanel.tsx
  ProjectStyleProfileList.tsx
  ProjectStyleProfileEditor.tsx
  StyleProfileBuilderLayout.tsx
  StyleSectionCard.tsx
  StyleSectionNav.tsx
  StyleProfileJsonExport.tsx
  CloudSpecLimitedBanner.tsx
  CreateStyleProfileDialog.tsx
  tabs/
    StyleProfileOverviewTab.tsx
    StyleProfileBuilderTab.tsx
    StyleProfileReferencesTab.tsx    # wraps StyleGuideReferencesTab
    StyleProfileRulesTab.tsx         # wraps StyleGuideRulesExportTab
    StyleProfileValidationTab.tsx
    StyleProfileToolSettingsTab.tsx
    StyleProfileCompareTab.tsx
    StyleProfileExportTab.tsx
```

### Geänderte Dateien (Step 1)

```
src/local/project-schema.ts              # style_profiles table, v2
src/local/project-settings.ts            # activeStyleProfileId
src/hooks/useRouter.ts                   # ?profileId= query parse
src/components/pages/ProjectsPage.tsx    # categoryId routing, preview card
src/capabilities/registry.ts             # style_profiles capability
src/lib/react-query.ts                   # query keys

functions/_shared/style-profile-schema.ts
functions/scriptony-style/style-service.ts
infra/appwrite/collections/styleProfiles.json
functions/scriptony-projects/...         # metadata_json merge
```

### SOLID/DRY-Regeln

- **Eine** Section-Registry für Nav, Cards, Defaults, Status
- **Eine** `buildStyleProfileSummary()` für Cloud
- **Ein** Normalize-Pfad beim Load
- UI → nur Facade; Adapter → nur Dispatch; Repo → nur SQL

### KISS-Regeln

- `activeStyleProfileId` in `project-settings.json` (kein SQLite-`projects`-Migration)
- Hash-Router `categoryId=styles` + Query `profileId`
- Duplicate via Adapter `get` + `create`, kein neuer Endpoint
- Styles komplett aus `ProjectsPage` extrahieren

---

## 19. Acceptance Criteria

Nach Step 1:

1. Style Guide auf ProjectDetail per Collapsible auf/zu; Tab „Style Profiles“ inline
2. Liste zeigt lokale Profile mit Name, Type, Status, Active-Badge
3. Empty State + Create aus Template (Animated / Cinematic)
4. Profil öffnen inline, 18 Sektionen im Builder
5. Zentrale Felder editierbar, Save persistiert lokal
6. Tool Settings Scaffold speicherbar
7. JSON Export (Clipboard + Download)
8. Duplicate funktioniert; Active setzbar (Liste-Dropdown + Overview-Button)
9. Collapsible bleibt; StyleGuide 3 Tabs + Profiles im selben Panel
10. Referenzen/Regeln nur im Guide-Tab (nicht doppelt im Editor)
11. Cloud-Browser: Liste + Summary; Banner bei vollem Spec
12. Kein stilles Datenabschneiden bei Cloud-Save
13. Ungespeicherte Änderungen: Confirm beim Einklappen / Tab-Wechsel
14. Ungültige profileId: Fehler + „Zurück zur Liste“
15. Checks grün (scoped frontend snippet)

---

## 20. Referenz-Mockups

Gespeicherte Referenzbilder (Informationsarchitektur, im Workspace):

| Stil | Beschreibung |
|------|--------------|
| Cutout Satire | South-Park-ähnlich: Flat Cutout, Paper Layers |
| Superhero Blockbuster | Marvel-Inspired: Cinematic, Lens, Lighting |
| Wes Anderson | Symmetrisch, Pastell, Dollhouse |
| Gaulic Adventure | Franco-Belgian Comic, klare Outlines |
| Dark Fantasy Anime | Cel-Shaded, Muted Palette |
| Martial Adventure | Shonen/DB-Inspired, Energy FX |

**Übernommen aus Mockups:**

- Linke 18er-Navigation
- Grid aus Visual-Rule-Cards
- Rechtes Tool-Settings-Panel
- Preset-Dropdown + Compare + New Style
- Style-Strength-Anzeige (Platzhalter)
- Prompt Tokens / Negative Tokens
- Do/Avoid Split-Cards
- Validation Assets Zeile

**Nicht übernommen:**

- Eigenes dunkles Theme pro Preset
- Fake-Prozentwerte als echte Analyse
- Fremde Farbpaletten als App-Chrome

---

## 21. Agent-Implementierungsreihenfolge

```
1.  docs/STYLEGUIDE_SYSTEM_CONCEPT.md (dieses Dokument)
2.  Types + Registry + Templates + normalize + summary
3.  SQLite schema v2 + LocalStyleProfileRepository + tests
4.  project-settings activeStyleProfileId
5.  style-profile-api + cloud-http + adapter
6.  Functions/infra minimal (summary, specRef, metadata)
7.  useRouter profileId query
8.  Inline Profiles panel (list, create, duplicate, export, active)
9.  ProjectStyleProfileEditor (tabs shell, dirty/save)
10. Builder 3-column + 18 StyleSectionCards
11. Tool Settings + Export tabs
12. StyleGuide tab reuse + import
13. ProjectsPage migration (preview, routing)
14. CloudSpecLimitedBanner + capability registry
15. npm run checks (scoped)
```

### Checks-Befehl

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" \
SHIM_CHANGED_FILES="src/lib/types/style-profile.ts,src/lib/style-profile/,src/lib/api/style-profile-api.ts,src/lib/api-adapter/style-profiles-adapter.ts,src/backend/local/LocalStyleProfileRepository.ts,src/local/project-schema.ts,src/local/project-settings.ts,src/hooks/useRouter.ts,src/components/projects/styles/,src/components/pages/ProjectsPage.tsx,src/capabilities/registry.ts" \
npm run checks
```

---

## Anhang A — StyleGuide → StyleProfile Import-Mapping

| StyleGuide-Feld | StyleProfile-Ziel |
|-----------------|-------------------|
| `styleSummary` | `visualSpec.styleDna.summary` + `configSummary.styleSummary` |
| `toneSummary` | `visualSpec.styleDna.humanRules` |
| `keywords` | `visualSpec.styleDna.machineParams.keywords` |
| `negativeKeywords` | `toolSettings.imageGeneration.negativePrompt` (partial) |
| `mustHave` | `visualSpec.doAvoid.doItems` |
| `avoid` | `visualSpec.doAvoid.avoidItems` |
| `palettePrimary` etc. | `visualSpec.colorSystem.machineParams.palette` |
| `compactPrompt` | `toolSettings.imageGeneration.promptTemplate` |
| `items[]` (references) | Step 1: nicht auto-migriert; Hinweis in References-Tab |

---

## Anhang B — Glossar

| Begriff | Bedeutung |
|---------|-----------|
| StyleGuide | Legacy 1×-pro-Projekt Moodboard (`scriptony-style-guide`) |
| StyleProfile | N×-pro-Projekt maschinenlesbare Spec (`styleProfiles`) |
| configSummary | Kompakte JSON-Darstellung für Cloud `<10k` |
| spec / spec_json | Volle Spec, lokal in SQLite |
| specRef | Pointer auf externe volle Spec (Cloud Step 2+) |
| activeStyleProfileId | Projekt-Default-Style |
| Builder | Tab mit 3-Spalten-Editor |
| Puppet-Layer | Render/Guide/Blender/ComfyUI-Orchestrierung |

---

## Anhang C — Verwandte Docs

- `docs/DESKTOP_FIRST_DEV.md` — Desktop-Workflow, Hybrid-Gates
- `docs/ARCHITECTURE_LOCAL_CLOUD.md` — 3 Achsen (Shell / Session / Daten)
- `docs/DOMAIN_GLOSSAR.md` — Style Guide vs Timeline-Characters etc.
- `concepts/puppet-layer-concept.de.md` — RenderJobs, GuideBundles, StyleProfile Revision
- `docs/appwrite-function-inventory.md` — `scriptony-style`, `scriptony-style-guide`

---

*Ende des Konzeptdokuments.*
