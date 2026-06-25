# Feature Intake: Text-First Audio Workflow

Epic-Design: `.qa/design/text-first-audio-workflow.md`

## Slices (Draft)

### T25 — Text-Block Data Model + Lane Link Persistence

**priority:** P0
**labels:** implementation, local-desktop, database
**featureSlug:** text-block-data-model
**dependsOn:** none

**Intent**
SQLite-Schema und Repository-Erweiterung, damit eine Character-Lane eine verlinkte Szene speichern kann und Text-Blöcke (MVE Lines) auch ohne AudioClip existieren dürfen.

**User Journey**
Nutzer öffnet ein `.scriptony` Projekt. Character-Lane bekommt optional ein `linked_scene_id`. Neue Text-Blöcke werden mit `scene_id` angelegt, aber ohne `audio_clip_id`.

**Solution**
- Tabelle `mve_lines` erlaubt `audio_clip_id = NULL` (heute schon optional).
- Neue Tabelle oder Spalte für `character_lane_links(project_id, character_id, linked_scene_id, linked_shot_id?, updated_at)`.
- Repository: `LocalCharacterLaneLinkRepository` mit get/upsert/delete.
- Mapper + Typen aktualisieren.

**Edge Cases**
- Charakter ohne Link: neue Textblöcke bekommen `scene_id = NULL` bis Audio-Aktion ausgewählt.
- Gelöschte Szene: Link bleibt in DB bestehen; UI zeigt „verwaister Link“ an und fragt bei nächster Aktion neu.

**Acceptance**
- [ ] Migration fügt Link-Tabelle/Spalte hinzu
- [ ] Unit-Test: Link CRUD
- [ ] Unit-Test: Text-Block ohne AudioClip erstellbar

**Runtime**
Local Desktop only.

---

### T26 — Lane Header: Plus-Button → „Text hinzufügen“

**priority:** P0
**labels:** implementation, ui, local-desktop
**featureSlug:** text-first-plus-button
**dependsOn:** T25

**Intent**
Der Plus-Button in der Character-Dialog-Lane erzeugt einen neuen Text-Block an der Playhead-Position (bzw. an der verlinkten Szene), nicht mehr Audio direkt.

**User Journey**
Nutzer klickt auf „+“ in einer Character-Lane. Ein Inline-Text-Editor erscheint in der Lane. Er tippt den Dialogtext.

**Solution**
- `AddAudioTimelineMenu` umbauen: bei Character-Dialog-Lanes nur „Text hinzufügen“.
- SFX/Music/Atmo-Lanes bleiben wie heute (Add Audio).
- `useTimelineAddAudio.addTextBlock(laneIndex, startSec)` erzeugt `MveLine` mit `sceneId` aus Link oder Playhead-Szene.
- Text-Block wird in `AudioClipLaneContent` als spezielles Segment gerendert (Szene-Farbe, kein Audio).

**Edge Cases**
- Lane ohne Charakter → Plus-Button disabled + Hinweis.
- Playhead steht außerhalb einer Szene → Modal fragt nach Szene.

**Acceptance**
- [ ] Plus-Button bei Dialog-Lanes zeigt „Text hinzufügen“
- [ ] Text-Block erscheint inline
- [ ] SFX/Music/Atmo unverändert
- [ ] E2E Screenshot im QA-Harness

**Runtime**
Local Desktop only.

---

### T27 — Inline Text Editor mit Enhance + Tags

**priority:** P0
**labels:** implementation, ui, mve
**featureSlug:** text-block-editor-enhance
**dependsOn:** T26

**Intent**
Im Text-Block kann der Nutzer den Dialogtext eingeben, mit `--sad`, `--happy` etc. markieren (lila hervorgehoben) und Enhance-Vorschläge per Dropdown einfügen.

**User Journey**
Nutzer tippt `--sad` im Text. Das Wort wird lila hervorgehoben. Er kann alternativ aus einem Dropdown (z. B. „sad“) per Drag-Drop an die aktuelle Cursor-Position setzen.

**Solution**
- Erweitern von `AudioTimelineSegmentMveText` oder neuer `MveTextBlockEditor`.
- ContentEditable-basierter Editor mit einfachem Token-Highlighter für `--*` Tags.
- Dropdown mit verfügbaren Tags (aus `apply-enhance-script` Mapping oder hartkodierte Liste).
- Enhance-Button öffnet `MveEnhanceScriptPanel` im Inline-Modus (nur für diesen Text) und zeigt Vorschläge; Bestätigung ersetzt den Text.

**Edge Cases**
- Unbekanntes Tag `--foo` → nicht hervorheben, aber erlauben.
- Leerer Text → Enhance disabled.
- Enhance schlägt fehl → Toast + Text bleibt.

**Acceptance**
- [ ] Tags `--*` werden lila hervorgehoben
- [ ] Tag-Dropdown + Drag-Drop funktioniert
- [ ] Enhance-Vorschläge können bestätigt/verworfen werden
- [ ] E2E Screenshot

**Runtime**
Local Desktop only.

---

### T28 — Audio-Ableitung im Text-Block (Generate / Upload / Record)

**priority:** P0
**labels:** implementation, ui, audio
**featureSlug:** text-block-audio-derive
**dependsOn:** T27

**Intent**
Der Text-Block bekommt ein permanentes Plus-/Menü-Icon mit drei Optionen: Generate Audio, Upload Audio, Record Audio. Audio wird als Kind der zugeordneten Szene erzeugt.

**User Journey**
Nutzer klickt auf das Plus-Icon im Text-Block, wählt „Generate Audio“. MVE-Render startet; nach Fertigstellung öffnet sich ein Take-Auswahl-Modal. Er hört Takes an und übernimmt einen. Der Clip erscheint in der Lane, Wellenform/Dauer synchronisiert sich (#24).

**Solution**
- `MveTextBlockAudioMenu` (neu) mit Generate/Upload/Record.
- `addGenerated`: verwendet `useMveLineRender`, öffnet nach `onSuccess` `MveTakeSelectionModal`.
- `triggerUpload`: Dateiauswahl → AudioClip unter der Textblock-Szene → Wellenform/Dauer.
- `toggleRecord`: startet Recording mit Metronom-Count-in → AudioClip unter der Textblock-Szene.
- Falls keine Szene zugeordnet: `SceneLinkModal` fragt Act/Sequence/Scene.

**Edge Cases**
- Text-Block ohne Text → Generate disabled.
- Lane-Link fehlt und Nutzer bricht Szene-Auswahl ab → keine Aktion.
- Upload länger als Szene → Szene + Parents per Ripple verlängern (T29).

**Acceptance**
- [ ] Generate öffnet Take-Modal nach Render
- [ ] Upload erzeugt AudioClip
- [ ] Record erzeugt AudioClip
- [ ] Bei fehlender Szene erscheint Auswahl-Modal
- [ ] E2E Screenshot + Smoke-Test

**Runtime**
Local Desktop only.

---

### T29 — Ripple: Szene + Parent-Verlängerung bei längerem Audio

**priority:** P1
**labels:** implementation, timeline, ripple
**featureSlug:** audio-extends-scene-ripple
**dependsOn:** T28

**Intent**
Wenn ein Audio-Clip (Generate/Upload/Record) länger ist als seine Szene, verlängert sich die Szene um die Differenz. Sequence, Act und nachfolgende Szenen werden per Ripple verschoben.

**User Journey**
Nutzer generiert Audio zu einem Text-Block. Das Audio ist 2,3 Sekunden länger als die Szene. Die Szene wird visuell länger, die nachfolgende Szene rückt nach rechts.

**Solution**
- `extendSceneForAudio(sceneId, requiredEndSec)` Service.
- Berechnet Delta zur aktuellen Scene-Ende.
- Nutzt bestehende Ripple-Engine (`src/lib/ripple-engine/`) für Preview.
- Committet Änderung via bestehendem Structure-Update-Path (`updateScene`, `updateSequence`, `updateAct`).

**Edge Cases**
- Delta = 0 → keine Aktion.
- Nachfolgende Szenen würden über Projektende hinausgeschoben → Projekt-Dauer verlängert sich (bereits heute möglich).
- Mehrere Audio-Clips in derselben Szene → längster Clip bestimmt.

**Acceptance**
- [ ] Unit-Test: Delta-Berechnung
- [ ] Unit-Test: Ripple-Preview korrekt
- [ ] E2E Screenshot

**Runtime**
Local Desktop only.

---

### T30 — Lane-Link Icon + Modal

**priority:** P1
**labels:** implementation, ui, local-desktop
**featureSlug:** lane-link-scene-modal
**dependsOn:** T25

**Intent**
In der Lane-Settingsbox (neben dem Mülleimer-Icon) erscheint ein Link-Icon. Klick öffnet einen Modal zur Auswahl von Act/Sequence/Scene (optional Shot), die als Standard-Ziel für neue Text-Blöcke dient.

**User Journey**
Nutzer klickt auf Link-Icon in der Lane von „Max Mustermann“. Wählt Act 1 → Sequence 1 → Scene 3. Ab jetzt landen alle neuen Text-Blöcke dieser Lane in Scene 3.

**Solution**
- `TrackTransportToggles` ergänzen um Link-Button.
- `SceneLinkModal` (neu) mit hierarchischer Baum-Ansicht (wiederverwenden aus bestehenden Struktur-Selektoren falls vorhanden).
- Speichern via `LocalCharacterLaneLinkRepository`.
- Link-Status visuell im Header anzeigen (z. B. kleiner Link-Indicator mit Szenen-Name).

**Edge Cases**
- Gelöschte/verschobene Szene → Link-Indicator zeigt Warnfarbe.
- Mehrere Lanes gleichen Charakters → jede Lane hat eigenen Link.

**Acceptance**
- [ ] Link-Icon im Header
- [ ] Modal mit Act/Sequence/Scene
- [ ] Speichern + Anzeige im Header
- [ ] E2E Screenshot

**Runtime**
Local Desktop only.

---

### T31 — Recording Metronom + Settings Modal

**priority:** P2
**labels:** implementation, ui, audio
**featureSlug:** recording-metronome
**dependsOn:** T28

**Intent**
Vor jedem Recording startet ein einstellbares Metronom-Count-in (3 Klicks). Einstellungen (BPM, Takt) über einen Button in der Timeline-View.

**User Journey**
Nutzer klickt auf Metronom-Button neben der Lane. Ein Modal öffnet sich: BPM 120, Takt 4/4, Count-in 3. Er startet Recording — 3 Klicks, dann nimmt er auf.

**Solution**
- `MetronomeSettingsModal` (neu).
- `useAudioRecording` erweitern um `metronomeConfig` + Count-in-Scheduling.
- Count-in via Web Audio API (`OscillatorNode` + `GainNode`) oder kurze Click-Samples.
- Wiederverwendbar auch für SFX/Music/Atmo-Lanes (soweit Recording dort erlaubt).

**Edge Cases**
- BPM = 0 → Count-in wird zu einzelnem Klick.
- Nutzer bricht während Count-in ab → Recording nicht starten.

**Acceptance**
- [ ] 3-Klick-Count-in vor Recording
- [ ] Einstellungs-Modal BPM/Takt
- [ ] Unit-Test für Scheduling-Logik
- [ ] E2E Screenshot

**Runtime**
Local Desktop only.

---

### T32 — Drag & Drop Text-Block zwischen Szenen

**priority:** P2
**labels:** implementation, ui, dnd
**featureSlug:** text-block-drag-drop
**dependsOn:** T26

**Intent**
Nutzer kann einen Text-Block per Drag & Drop in eine andere Szene verschieben. Wenn Audio existiert, wird die Audio-Spur mit verschoben.

**User Journey**
Nutzer zieht Text-Block „Max: Achtung auf Gleis 4“ von Scene 1 in Scene 2. Die Szene-Zuordnung ändert sich; Audio-Clip folgt.

**Solution**
- HTML5 Drag & Drop im `AudioTimelineSegment` für Text-Blöcke (ähnlich bestehendem Character-Lane-Reorder).
- Drop-Ziel: Szene-Bereich in der Timeline.
- Update `MveLine.sceneId` + AudioClip `sceneId` + ggf. `startSec` an neue Szene.

**Edge Cases**
- Drop außerhalb einer Szene → Aktion abbrechen.
- Audio-Clip länger als neue Szene → Ripple-Verlängerung (T29).

**Acceptance**
- [ ] Text-Block drag & drop zwischen Szenen
- [ ] Audio-Clip folgt mit
- [ ] E2E Screenshot

**Runtime**
Local Desktop only.

---

## Notes

- Reihenfolge: T25 → T26 → T27 → T28 → (T29, T30 parallel) → T31 → T32.
- Für die Tauri-Desktop-Umgebung vorgesehen; Cloud-Session bleibt out-of-scope.
