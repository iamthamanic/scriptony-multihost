# Scriptony Architecture Refactor Tickets (ticket 32)

Stand: 2026-05-13

## Ziel

Diese Tickets etablieren eine vereinheitlichte Clip-basierte Zeitarchitektur für alle Projekttypen (Film, Serie, Audio, Buch). Das Ziel ist die Trennung von Plan (narrative Struktur) und Ist (temporale Realisierung) mit Bottom-Up-Ripple-Propagation.

## Zielarchitektur

| Gruppe    | Functions                                                                                                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core      | `scriptony-auth`, `scriptony-projects`, `scriptony-structure`, `scriptony-script`, `scriptony-characters`, `scriptony-worldbuilding`, `scriptony-timeline`, `scriptony-editor-readmodel` |
| Media     | `scriptony-assets`, `scriptony-audio`, `scriptony-image`, `scriptony-video`, `scriptony-media-worker`                                                                                    |
| Workflows | `scriptony-audio-production`, `scriptony-stage`, `scriptony-stage2d`, `scriptony-stage3d`, `scriptony-style`, `scriptony-style-guide`, `scriptony-sync`, `scriptony-gym`                 |
| Platform  | `scriptony-ai`, `scriptony-assistant`, `scriptony-jobs`, `scriptony-observability`, `scriptony-admin`, `scriptony-mcp-appwrite`, `scriptony-storage`, `scriptony-collaboration`          |
| Legacy    | `jobs-handler`, `make-server-3b52693b`                                                                                                                                                   |

## Arbeitsregeln

- Neue Features muessen vor Codeaenderung in der Domain Map einer Ziel-Function zugeordnet sein.
- Jede Code-Phase beginnt mit Analyse der betroffenen Dateien, Routen, Collections, Buckets, Env Vars und Frontend-Aufrufer.
- Keine Breaking Changes ohne Compatibility Wrapper oder dokumentierte Migration.
- Keine technische Provider-Logik in Produkt-Orchestration.
- Keine Produktlogik in technischen Media APIs.
- Keine Upload-Duplikation ausserhalb von `scriptony-assets`.
- Keine Job-Status-Duplikation ausserhalb von `scriptony-jobs`.
- Kein Script-/Dialogtext in `scriptony-audio-production` als Source of Truth.
- Keine Editor-Aggregation in `scriptony-structure`.
- `_shared` enthaelt primitive Infrastruktur, Typen, Permission-Primitives und kleine Adapter, aber keine Workflow-Orchestration.
- `scriptony-storage` besitzt Storage Provider, Storage-OAuth, Storage Connections, Storage Targets, Storage Objects, Sync, Import und Export.
- `scriptony-assets` besitzt fachliche Asset-Metadaten, nicht Provider-OAuth oder physische Storage-Strategie.
- Asset-Uploads muessen ueber eine Storage-Abstraktion laufen. Initial darf diese Appwrite Storage verwenden.
- `scriptony-collaboration` besitzt Projektfreigaben, Mitglieder, Rollen, Einladungen, Organisationen/Workspaces und Access Checks.
- Direkte Projektfreigabe ohne Organisation muss moeglich bleiben.
- Neue Domain-Functions duerfen Projektzugriff nicht direkt ueber `project.created_by` pruefen.
- Neue Domain-Functions muessen Access-Helper wie `canReadProject`, `canEditProject`, `canManageProject` verwenden.
- Initiale Access-Helper-Implementierung darf intern noch `created_by` pruefen, muss aber spaeter `project_members` und `organization_members` beruecksichtigen koennen.
- UI-Aenderungen muessen zum bestehenden UI/UX-System passen: keine neuen Marketing-Layouts, keine unpassenden Komponenten, keine ungeprueften Responsiveness- oder Accessibility-Regressions.

## Done-Report-Vertrag

Beim Abschluss jedes Tickets muss ein Done Report in `docs/scriptony-architecture-refactor 25.04.26.md` geschrieben werden.

Format:

```md
## Phase X - <Bereich>

### Done Report: TXX - <Ticket-Titel>

- Date: YYYY-MM-DD HH:mm CEST
- Verification Marker: ARCH-REF-TXX-DONE
- Changed files:
- Appwrite collections:
- Appwrite buckets:
- Env vars:
- Routes:
- UI/UX checks:
- Tests run:
- Shimwrappercheck command:
- Shimwrappercheck result:
- AI Review result:
- Known risks:
- Rollback plan:
- Notes:
```

Wenn die passende Phase im Done-Report-Dokument noch fehlt, wird sie beim Abschluss des Tickets angelegt.

## Pflicht-Checks

Alle Implementierungstickets muessen ueber den Shim laufen. AI Review darf nicht deaktiviert werden. Die genaue Check-Matrix steht zusaetzlich in `docs/scriptony-architecture-refactor 25.04.26.md`.

Standard-Gate fuer normale Tickets:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Wenn unrelated User-Aenderungen im Worktree liegen, muss der Ticket-Scope explizit gesetzt werden:

```bash
SHIM_CHANGED_FILES="path/a.ts,path/b.md" CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Alternativ kann `SHIM_CHANGED_FILES_FILE` auf eine Datei mit einem Pfad pro Zeile zeigen. Der Scope gilt fuer Format/Lint/Function-Build und wird an den AI Review als Diff-Datei durchgereicht.

Backend-only Gate, wenn sicher kein Frontend/UI betroffen ist:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend
```

Frontend-only Gate, wenn sicher keine Functions/Appwrite-Konfiguration betroffen sind:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend
```

---

# T32 — DAW-Features: Multi-Lanes, Track-Header, FX-Chain

## Kontext

Nach T31 existiert ein vollständiger Audio-Clip-Workflow mit TTS-Generierung und Ripple. T32 bringt **Produktions-Features** aus der DAW-Welt: Mehrere SFX-Spuren (damit SFX sich überlappen können), Track-Header mit Mixer-Controls (Mute, Solo, Volume, Pan), und eine einfache FX-Chain (Reverb-Presets).

## Problem

1. Aktuell gibt es nur **eine SFX-Lane**. Wenn SFX 1 (Zug bremst) und SFX 2 (Rollkoffer) gleichzeitig passieren sollen, müssen sie auf derselben Lane überlappen — was visuell unübersichtlich ist.
2. Keine Mute/Solo/Volume/Pan-Controls pro Spur. Für das Mixing von Hörspielen essenziell.
3. Keine Audio-Effekte (Reverb, EQ). SFX klingen "trocken" ohne Raum.
4. Track-Header in thestuu existieren als Referenz, sind aber nicht in Scriptony integriert.

## Lösung

### Feature A: Multi-Lane SFX (und ggf. Musik/Atmo)

Lane-Index-Schema erweitern:

```ts
const LANE_SCHEMA = {
  dialog: { base: 0, max: 9, label: "Dialog" }, // 0-9: pro Charakter eine Lane
  sfx: { base: 10, max: 19, label: "SFX" }, // 10-19: bis zu 10 SFX-Spuren
  music: { base: 20, max: 29, label: "Musik" }, // 20-29: bis zu 10 Musik-Spuren
  atmo: { base: 30, max: 39, label: "Atmo" }, // 30-39: bis zu 10 Atmo-Spuren
  global: { base: 90, max: 99, label: "Global" }, // 90+: Cross-Scene
};
```

Auto-Lane-Zuweisung:

```ts
function assignLaneIndex(clips: AudioClip[], newClip: AudioClip): number {
  const typeBase = LANE_SCHEMA[newClip.type].base;
  const typeMax = LANE_SCHEMA[newClip.type].max;

  // Suche erste freie Lane (kein Überlappungs-Konflikt)
  for (let lane = typeBase; lane <= typeMax; lane++) {
    const laneClips = clips.filter((c) => c.laneIndex === lane);
    const hasOverlap = laneClips.some(
      (c) => !(newClip.endSec <= c.startSec || newClip.startSec >= c.endSec),
    );
    if (!hasOverlap) return lane;
  }

  // Fallback: letzte Lane (Überlappung erlaubt, aber markiert)
  return typeMax;
}
```

Manuelle Lane-Zuweisung: Dropdown zeigt "SFX-Spur 1"–"SFX-Spur 10" als Select. Autor kann wählen.

### Feature B: Track-Header (aus thestuu adaptiert)

Pro Lane ein fester Header links (wie in `thestuu/apps/dashboard/components/stuu-shell.jsx`):

```tsx
<div className="track-header">
  <!-- Label -->
  <span className="track-label">{lane.label}</span>

  <!-- Mute / Solo / Record -->
  <div className="track-toggles">
    <button
      className={cn("mute-toggle", lane.mute && "active")}
      onClick={() => setMute(lane.index, !lane.mute)}
    >M</button>
    <button
      className={cn("solo-toggle", lane.solo && "active")}
      onClick={() => setSolo(lane.index, !lane.solo)}
    >S</button>
  </div>

  <!-- Volume -->
  <label className="track-volume">
    <input
      type="range" min={0} max={1.2} step={0.01}
      value={lane.volume}
      onChange={(e) => setVolume(lane.index, e.target.value)}
    />
    <input
      type="number"
      value={toVolumeDb(lane.volume)}
      onChange={(e) => setVolumeDb(lane.index, e.target.value)}
    /> dB
  </label>

  <!-- Pan -->
  <label className="track-pan">
    <span>L</span>
    <input
      type="range" min={-1} max={1} step={0.01}
      value={lane.pan}
      onChange={(e) => setPan(lane.index, e.target.value)}
    />
    <span>R</span>
  </label>

  <!-- Mini Level Meter (optional) -->
  <LevelMeter value={lane.meterPeak} variant="arrangement" />
</div>
```

### Feature C: FX-Chain Presets

Erste Phase: Keine VST-Plugins, nur **Presets**.

```ts
interface FxPreset {
  id: string;
  name: string;
  type: "reverb" | "eq" | "compressor";
  settings: Record<string, number>;
}

const REVERB_PRESETS: FxPreset[] = [
  {
    id: "reverb_light",
    name: "Leichter Hall",
    type: "reverb",
    settings: { roomSize: 0.3, damp: 0.5 },
  },
  {
    id: "reverb_medium",
    name: "Mittlerer Hall",
    type: "reverb",
    settings: { roomSize: 0.5, damp: 0.4 },
  },
  {
    id: "reverb_large",
    name: "Großer Hall",
    type: "reverb",
    settings: { roomSize: 0.8, damp: 0.3 },
  },
  {
    id: "reverb_cathedral",
    name: "Kathedrale",
    type: "reverb",
    settings: { roomSize: 1.0, damp: 0.2 },
  },
];
```

Speicherung: `AudioClip.fxPresetId` oder `AudioTrack.fxPresetId` (wenn Track = Clip).

Anwendung: Erst bei Audio-Export/Render (spätere Phase). Jetzt nur als Meta-Daten.

## User Journey

### Szenario 1: Zwei SFX gleichzeitig

1. Autor fügt SFX 1 "Zug bremst" hinzu (Lane 10).
2. Autor fügt SFX 2 "Rollkoffer" hinzu (gleiche Zeit wie Zug).
3. Auto-Lane: SFX 2 bekommt Lane 11 (kein Überlappungs-Konflikt).
4. Timeline zeigt zwei separate SFX-Lanes, beide mit Waveform.

### Szenario 2: Mixing

1. Autor will nur Dialog von Pazuzu hören.
2. Klickt "S" (Solo) auf Pazuzu-Lane.
3. Alle anderen Lanes werden ausgegraut und stumm geschaltet.
4. Playhead spielt nur Pazuzu-Dialog.

### Szenario 3: 3D-Audio (Pan)

1. Autor will, dass Kamara von links kommt.
2. Zieht Pan-Slider auf Lane "Kamara" nach links (-0.7).
3. Bei Playback hört man Kamara leiser im rechten Ohr.

## Akzeptanzkriterien

- [ ] Mehrere SFX-Lanes sind möglich (bis zu 10, Lane 10–19)
- [ ] Auto-Lane-Zuweisung `assignLaneIndex()` verhindert Überlappung oder markiert sie (rot gestrichelter Border)
- [ ] Manuelle Lane-Zuweisung im Dropdown ist möglich per Select "SFX-Spur 1–10"
- [ ] Track-Header zeigt Mute/Solo/Volume/Pan pro Lane (aus `thestuu/apps/dashboard/components/stuu-shell.jsx` adaptiert)
- [ ] Volume: Range-Slider (0–1.2) + dB-Input (-60 dB bis +1.8 dB)
- [ ] Pan: L/R-Slider (-1 bis +1) + Prozent-Input (L100% bis R100%)
- [ ] Solo schaltet alle anderen Lanes stumm (visuell ausgegraut, `opacity: 0.3`)
- [ ] Mute schaltet eigene Lane stumm (`opacity: 0.5`, durchgestrichen)
- [ ] FX-Presets (Reverb leicht/mittel/stark/Kathedrale) sind als Dropdown wählbar pro Track
- [ ] FX-Preset wird als `fxPresetId` in `AudioClip` (oder `AudioTrack`) gespeichert
- [ ] FX-Preset ist **nur Meta-Daten** in T32 — Audio-Processing kommt in späterer Phase
- [ ] `LevelMeter` Komponente aus thestuu wird in Track-Header integriert (Peak-Meter, 0–1, Green/Yellow/Red)
- [ ] Feature-Flag `VITE_ENABLE_AUDIO_CLIP` ist auf Staging `true`, Prod `false`
- [ ] Keine Regression: Feature-Flag = false → altes Verhalten unverändert
- [ ] `npm run typecheck` und Shimwrappercheck laufen durch

## Architekturskizze

```
┌──────────────────────────────────────────────────────────────┐
│  TRACK HEADER (Links, pro Lane)                                │
│  ┌────────┬────────┬────────┬────────┬────────┐              │
│  │ Label  │ M/S    │ Volume │  Pan   │ Level  │              │
│  │        │ [M][S] │ [====] │[L===R]│ [▓▓▓] │              │
│  │        │        │ -6 dB  │ -30%   │        │              │
│  └────────┴────────┴────────┴────────┴────────┘              │
│                        ↓                                       │
│  TIMELANE (Rechts)                                             │
│  Lane 0: [Pazuzu Clip 45s-85s]                                 │
│  Lane 1: [Kamara Clip 90s-120s]                                │
│  Lane 10:[SFX Zug 50s-53s]                                     │
│  Lane 11:[SFX Rollkoffer 50s-52s]  ← Überlappung erlaubt!   │
│  Lane 20:[Musik 0s-300s] (cross-scene)                        │
│  ────────────────────────────────────►                       │
└──────────────────────────────────────────────────────────────┘
```

## Edge Cases

1. **Alle Lanes voll (10 SFX-Spuren belegt)**: Neuer SFX bekommt Lane 19 (letzte). Überlappung wird visuell markiert (rot gestrichelter Border).
2. **Solo auf mehreren Lanes**: Mehrere "S" aktiv → nur diese Lanes spielen. Rest stumm.
3. **Volume > 1.0**: Erlaubt (Boost bis 1.2 = +1.8 dB), aber LevelMeter zeigt Clipping (rot ab 1.0).
4. **Pan + Mono-Output**: Wenn User Mono-Kopfhörer hat → Pan hat keine Wirkung. Acceptable.
5. **FX-Preset ändern nach TTS-Generierung**: Kein Re-Render nötig. Preset wird erst beim Export angewendet.

## SOLID / DRY / KISS

- **SRP**: Lane-Header = Controls. Timeline = Visualisierung. FX = Meta-Daten. Keine Vermischung.
- **DRY**: Track-Header-Komponenten (Mute/Solo/Volume/Pan) werden aus thestuu übernommen und angepasst. Keine Neuerfindung.
- **KISS**: Keine echten VST-Plugins in T32. Nur Presets als Strings. Audio-Processing kommt später.
- **OCP**: Neue Lane-Typen erfordern nur neuen Eintrag in `LANE_SCHEMA`.
- **Liskov**: `TrackHeader` Komponente akzeptiert `BaseLane` Interface. Funktioniert mit Dialog, SFX, Musik, Atmo.

## Abhängigkeiten

- **Blocker**: T31 (TTS-Pipeline) muss abgeschlossen sein (Audio-Clips existieren).
- **Referenz**: thestuu/apps/dashboard/components/stuu-shell.jsx für Track-Header-Implementierung.
- **Nachfolger**: T33 (Film-Refactoring) ist unabhängig von T32.
