# Epic Design: Text-First Audio Workflow (Timeline Character Lanes)

## Problem

Aktuell entsteht Audio in den Character-Dialog-Lanes über den „+“/„Add Audio“-Button in drei unabhängigen Aktionen (Record / Upload / Generate). Text ist sekundär: ein `window.prompt` fragt bei „Generate Audio“ erst nachträglich nach einem Dialogtext. Das passt nicht zum mentalen Modell der Anwender:

- Der Autor denkt in **Textblöcken** für einen Charakter in einer Szene.
- Audio ist eine **Ableitung** aus dem Text (TTS/Generate, Upload zu einem Text, Record zu einem Text).
- Die Szene ist der **Zeit-Container**: Audio soll sich an die Szene binden, deren Dauer übernehmen und bei Überlänge die Szene + ihre Parents (Sequence, Act) sowie nachfolgende Szenen per Ripple verschieben.

## Goal

In der Timeline-View einer Character-Lane führt der Plus-Button nur noch **„Text hinzufügen“** ein. Der Text-Block wird inline erstellt, bekommt Enhance-Unterstützung (Dropdown mit `--sad` etc.) und kann nachträglich in Audio verwandelt werden (Generate, Upload, Record). Optional wird über ein Link-Icon in der Lane-Settingsbox eine Standard-Szene festgelegt, an die neue Textblöcke gebunden werden; ohne Link fragt das System vor jeder Audio-Aktion nach Act/Sequence/Scene.

## Non-Goals

- Kein Rewrite der allgemeinen Audio-Lanes (SFX, Music, Atmo).
- Kein Ersatz für das MVE-Render-System (#17–#24); wir verwenden es weiter, aber öffnen nach dem Render ein Take-Auswahl-Modal.
- Keine echte DAW-Mixautomatisierung; Mixer-Einstellungen (Volume, Pan, FX) bleiben wie heute.
- Keine Cloud-Implementierung; der Epic fokussiert `local-desktop` + Tauri.

## Was im Repo schon da ist

- `src/hooks/useTimelineAddAudio.ts` — zentrale Aktionen `addGenerated`, `triggerUpload`, `toggleRecord`, `addSfxLane`.
- `src/components/timeline/audio/AddAudioTimelineMenu.tsx` — derzeit Record/Upload/Generate Dropdown im Lane-Header.
- `src/components/timeline/audio/AudioClipLaneSidebar.tsx` + `AudioClipLaneTracks.tsx` — Lane-Header und Clip-Inhalt.
- `src/components/audio/track-header/TrackHeader.tsx` + `TrackTransportToggles.tsx` — Header mit Delete-Icon.
- `src/lib/character-lane-map.ts` + `src/hooks/useCharacterLaneMap.ts` — Mapping Charakter ↔ Lane.
- `src/lib/mve/ensure-mve-line-for-clip.ts` + `src/hooks/useMveLines.ts` — MVE Line an AudioClip binden.
- `src/lib/mve/apply-enhance-script.ts` + `src/components/structure/timeline/mve/MveEnhanceScriptPanel.tsx` — Enhance für Szenen-Text.
- `src/lib/multi-voice-engine/render/render-line.ts` + `src/hooks/useMveLineRender.ts` — MVE Render für Takes.
- `src/lib/ripple-engine/` — visuelles Preview-System für Structure-Container-Verschiebungen.
- `src/hooks/useAudioRecording.ts` — Recording-State.

## Assumptions

1. Ein Text-Block ist initial ein **MveLine** ohne AudioClip. Erst bei Generate/Upload/Record entsteht ein AudioClip als Kind der zugeordneten Szene.
2. Buch-Projekte: Hierarchie `Act → Sequence → Scene`. Film-Projekte zusätzlich `Shot` unter Scene.
3. Ein Lane-Link ist eine **Eigenschaft der Character-Lane** (`linkedSceneId`, optional), nicht des einzelnen Clips.
4. Die Szene-Dauer passt sich automatisch an die längste Audio-Spur an, sobald Audio vorhanden ist; leere Textblöcke ohne Audio verändern die Szene nicht.
5. Takes bleiben erhalten, wenn der Nutzer das Take-Auswahl-Modal schließt, ohne etwas auszuwählen.

## Options

### Option A: YAGNI / Minimal Scope
**Nicht bauen.** Stattdessen nur den bestehenden `window.prompt` bei Generate verbessern und das Dropdown auf Record/Upload/Generate lassen.

- **Pros:** Kein neues Datenmodell, kein Ripple-Risiko.
- **Cons:** Löst nicht das eigentliche UX-Problem; Audio bleibt primär, Text sekundär.
- **Verdict:** Nicht empfohlen — der Wunsch ist berechtigt und passt zur Roadmap (MVE Epic).

### Option B: Text-First, aber ohne Link (KISS)
Der Plus-Button erzeugt einen Text-Block. Bei Generate/Upload/Record fragt immer ein Modal nach Act/Sequence/Scene. Kein Link-Icon, keine Settingsbox-Änderung.

- **Pros:** Weniger UI-Komplexität, kein Link-State zu persistieren.
- **Cons:** Bei vielen Aktionen für denselben Charakter/Szene wird das Modal nervig. Entspricht nicht dem Wunsch nach „alle Textboxen für Szene X“.
- **Verdict:** Unterscope — Link ist explizit gewünscht.

### Option C: Text-First + Lane-Link + Ripple-Verlängerung (Empfohlen)
Wie im Goal beschrieben. Plus-Button → Text-Block. Lane-Settingsbox bekommt Link-Icon → Modal mit Act/Sequence/Scene(/Shot). Audio-Aktionen landen als Kind der verlinkten Szene. Längere Audio verlängert Szene + Parents per Ripple.

- **Pros:** Erfüllt den Wunsch vollständig; wiederverwendet bestehende MVE-, Ripple- und Timeline-Systeme.
- **Cons:** Größerer Scope, mehrere Slices nötig (Schema, UI, Ripple, Recording-Metronom).
- **Verdict:** Empfohlen.

## Decision

**Option C** — Text-First + Lane-Link + Ripple.

## Cross-Domain Sign-Off

| Domain | Status | Rationale |
|--------|--------|-----------|
| KISS | ⚠️ | Mehrere neue Komponenten, aber jede hat klare Verantwortung. |
| SOLID | ✅ | Text-Block, Link, Render-Modal, Ripple-Verlängerung getrennt. |
| DRY | ✅ | Wiederverwendung von MVE, Ripple, Recording, Upload-Logik. |
| Security | ✅ | Keine neuen Endpunkte; alles local/Tauri. |
| UI/UX | ✅ | Klares Text-first-Mentalmodell. |
| Scaling | ⚠️ | Ripple bei vielen Szenen kann teuer werden; Preview-Modus nutzen. |
| Testability | ✅ | MVE-Tests, Ripple-Tests, Playwright-E2E können erweitert werden. |
| Maintainability | ✅ | Slices sind entkoppelt. |

## Implementation Sketch

### Neue / geänderte Pfade (high-level)

- `src/lib/multi-voice-engine/schema/` — Textblock-Status erweitern (z. B. `textOnly` vs `rendered`).
- `src/backend/local/` — `linked_scene_id` auf Character-Dialog-Clips oder separater `character_lane_links`-Tabelle speichern.
- `src/components/timeline/audio/AddAudioTimelineMenu.tsx` — Umbau zu „Text hinzufügen“ + neues Dropdown für Generate/Upload/Record am Text-Block.
- `src/components/audio/AudioTimelineSegmentMveText.tsx` — Inline-Text-Editor erweitern um Enhance-Dropdown + Tags + Audio-Ableitungs-Menü.
- `src/components/structure/timeline/mve/MveTextBlockAudioMenu.tsx` (new) — Dropdown Generate/Upload/Record innerhalb des Text-Blocks.
- `src/components/structure/timeline/mve/MveTextBlockEditor.tsx` (new) — Inline-Text-Editor im Text-Block mit Tag-Highlighter + Enhance-Popover.
- `src/components/structure/timeline/mve/MveTextBlockAudioMenu.tsx` (new) — Dropdown Generate/Upload/Record innerhalb des Text-Blocks.
- `src/components/structure/timeline/mve/MveLineTakePanel.tsx` — bestehendes Take-Popover wird als sekundäre UI wiederverwendet (kein neues Modal im MVP).
- `src/components/timeline/audio/AudioClipLaneSidebar.tsx` / `TrackHeader.tsx` / `TrackTransportToggles.tsx` — Link-Icon neben Delete (P1-Slice T30).
- `src/components/structure/timeline/modals/SceneLinkModal.tsx` (new) — Act/Sequence/Scene(/Shot)-Auswahl, nur wenn kein Lane-Link gesetzt oder Nutzer wechselt.
- `src/hooks/useMveTextBlock.ts` (new) — CRUD für Textblöcke ohne AudioClip.
- `src/hooks/useAudioLaneLink.ts` (new) — Lane-Link lesen/schreiben.
- `src/hooks/useTimelineAddAudio.ts` — `addGenerated`, `triggerUpload`, `toggleRecord` akzeptieren optionalen Textblock/Parent-Scene-Kontext.
- `src/lib/mve/render-text-block.ts` (new) — Text-Block → MVE Render; wählt ersten erfolgreichen Take automatisch aus.
- `src/lib/structure/extend-scene-for-audio.ts` (new, P1) — Szene + Parents per Ripple verlängern.
- `src/hooks/useAudioRecording.ts` — Recording ohne Metronom im MVP; Count-in folgt in T31.
- `src/components/structure/timeline/modals/MetronomeSettingsModal.tsx` (new, P1) — BPM/Takt einstellbar.

### Neue Dependencies

- Keine. Metronom-Click kann mit Web Audio API (`AudioContext`) oder einem eingebetteten Soundfile umgesetzt werden.

### Estimated Scope

- ~8–12 neue/modifizierte Komponenten
- ~4–6 neue Hooks/Services
- ~2 neue DB-Felder/Tabelle
- Tests: Unit + E2E

## Runtime Matrix

| Slice | Local Desktop | Cloud Session | Appwrite Functions |
|-------|---------------|---------------|--------------------|
| Text-Block CRUD | ✅ | ❌ (Cloud noch nicht) | ❌ |
| Lane-Link | ✅ | ❌ | ❌ |
| Generate (MVE) | ✅ | ❌ | ❌ |
| Upload | ✅ | ❌ | ❌ |
| Record + Metronom | ✅ | ❌ | ❌ |
| Ripple-Verlängerung | ✅ | ❌ | ❌ |

## Bereit für /implement?

YES — Epic ist groß genug, um in vertikale Slices zerlegt zu werden. Nächster Schritt: `@feature-intake` für Issue-Slices.
