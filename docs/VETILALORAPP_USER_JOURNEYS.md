# VETILALORAPP — Manuelle Verifikation der Film-Structure-Trim User Journeys

Stand: 2026-06-04
Status: ausstehende manuelle Bestätigung am Desktop (Tauri). Code-Fixes 2026-06-06:
Load-Repair über `repairFilmTimelineLayout` (Acts/Sequences/Scenes), Shot-Lane
`left:0 + translateX` wie Act/Seq/Scene, toter Film-Preview-Code entfernt.
Engine/Hook-Tests decken Journeys ab; Desktop-Reload-Check bleibt Pflicht vor Merge.

## Voraussetzungen

- `dev:desktop` läuft (`npm run dev:desktop`, Tauri-WebView, Port 3000)
- Workspace-Folder gewählt, `.scriptony`-Projekt geöffnet
- Film-Projekt mit mindestens 2 Acts, 3+ Sequences, 4+ Scenes, 8+ Shots
- In-App: Trim-Handles sind sichtbar (Lane-Modus Structure, nicht Beat)
- Browser-DevTools offen, **Network-Tab** und **Console** beobachtet

## Journey 12.1 — Scene +10s propagates to Act

| Schritt                                                                              | Erwartung                                                         |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 1. Trimme rechte Kante von Scene 1 in der Scene-Lane um +10s (Maus-Drag nach rechts) |                                                                   |
| 2. Beobachte Scene 1 rechts wachsen                                                  | Szene wird breiter, Position verschiebt sich nicht                |
| 3. Beobachte Shot 1+ in der Shot-Lane                                                | Folge-Shots rutschen nach rechts                                  |
| 4. Beobachte Sequence 1 in der Sequence-Lane                                         | Sequence 1 wird breiter, Folge-Sequences rutschen                 |
| 5. Beobachte Act 1 in der Act-Lane                                                   | Act 1 wird breiter, Folge-Acts rutschen                           |
| 6. Console-Log                                                                       | Kein Debug-`fetch`; Trim läuft über VET-Bridge (DOM-Preview via `useStructureTrimSession`) |
| 7. Network-Tab                                                                       | **Kein** Appwrite-Request während des Drags                       |
| 8. Loslassen → Commit                                                                | `persistRipplePatches` läuft, exakt **ein** Round-Trip            |
| 9. Reload des Projekts                                                               | Identische Timeline, Shots an neuen Positionen                    |

**Akzeptanz:** alle 9 Schritte ✓. Test: `scene_right_grow_propagates_to_act` (engine).

## Journey 12.2 — Scene -10s propagates to Act

| Schritt                                                                | Erwartung                                                         |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1. Trimme rechte Kante von Scene 2 um -10s                             |                                                                   |
| 2. Scene 2 wird schmaler, Scene 3 rückt nach links                     |                                                                   |
| 3. Sequence 2 wird schmaler, Sequence 3 rückt nach links               |                                                                   |
| 4. Act 2 wird schmaler, Act 3 rückt nach links                         |                                                                   |
| 5. Shots in Scene 2 rücken nach links, Shot-Positionen sind konsistent |                                                                   |
| 6. Loslassen → Commit                                                  | Datenbank spiegelt neue Boundaries, Reload zeigt stabile Timeline |

**Akzeptanz:** identisches Verhalten, negativ. Test: `scene_right_shrink_propagates_to_act`.

## Journey 12.3 — Shot +5s propagates to Act

| Schritt                                               | Erwartung                        |
| ----------------------------------------------------- | -------------------------------- |
| 1. Trimme rechte Kante von Shot 3 (in Scene 2) um +5s |                                  |
| 2. Shot 3 wächst, Shot 4 rückt nach rechts            |                                  |
| 3. Scene 2 wächst um +5s, Scene 3 rückt nach rechts   |                                  |
| 4. Sequence 2 wächst um +5s                           |                                  |
| 5. Act 2 wächst um +5s                                |                                  |
| 6. Loslassen → Commit                                 | Persist-Roundtrip, Reload stabil |

**Akzeptanz:** Test `shot_right_grow_propagates_to_act` grün.

## Journey 12.4 — Sequence +20s propagates

| Schritt                                                          | Erwartung |
| ---------------------------------------------------------------- | --------- |
| 1. Trimme rechte Kante von Sequence 1 um +20s                    |           |
| 2. Sequence 1 wächst, alle Scenes in Seq 1 rücken (oder wachsen) |           |
| 3. Sequence 2 rückt nach rechts                                  |           |
| 4. Act 1 wächst, Act 2 rückt nach rechts                         |           |
| 5. Commit + Reload                                               | Stabil    |

**Akzeptanz:** Test `sequence_right_grow_propagates_to_act` grün.

## Journey 12.5 — Act-Outer-Trim ripples to siblings

| Schritt                                                                               | Erwartung |
| ------------------------------------------------------------------------------------- | --------- |
| 1. Trimme rechte Kante von Act 1 (letzter Handle der Act-Lane)                        |           |
| 2. Act 1 wächst, Act 2 rückt nach rechts                                              |           |
| 3. Sequences/Scenes/Shots in Act 1 skalieren mit (Bottom-Up via `propagateParentFit`) |           |
| 4. Act 2 selbst bleibt strukturell intakt (kein Mitwachsen)                           |           |
| 5. Commit + Reload                                                                    | Stabil    |

**Akzeptanz:** Test `act_right_grow_moves_following_acts` grün.

## Edge-Cases (separat zu prüfen)

| Szenario                          | Erwartung                                                      |
| --------------------------------- | -------------------------------------------------------------- |
| Trimme auf locked Shot            | Vorschau zeigt keine Änderung, Toast „Locked", kein Commit     |
| Trimme unter Min-Dauer            | Snap an Min-Dauer, kein Clamp-Crash                            |
| Trimme durch Playhead             | Playhead zählt als Snap-Edge, Magnet greift                    |
| Trimme bis Project-Ende           | Boundary clamp am Project-Duration, kein Overflow              |
| Escape während Drag               | Trim wird abgebrochen, Preview verschwindet, State sauber      |
| Pointer-Cancel (Touch)            | Trim wird abgebrochen, identisch zu Escape                     |
| Doppelklick auf Trim-Handle       | Kein Crash, evtl. Toggle-Default (off-spec)                    |
| Hybrid-Projekt (Appwrite + local) | Trim persistiert via Appwrite-Pfad, Reload zeigt beide Quellen |

## Was NICHT zu prüfen ist (out of scope)

- Book-Projekt-Shot-Trim (Buch: `kind === "shot"`, geht weiter über Legacy-Pfad,
  ist nicht VETILALORAPP-Scope).
- Editorial Clips (NLE) — `nleClipDragRef` ist separate Branch.
- Beat-Trim in der Audio-Spur — `applyBeatPreviewToDOM`/`useTrimDragEngine`.
- Drag-Sources außerhalb des Structure-Trims (Asset-Drag, Clip-Drag).

## Routing-Matrix (Stand 2026-06-06)

| Kind     | Buch / Audio / Film / Serie (pct-Structure) | Shot-Lane sichtbar |
| -------- | --------------------------------------------- | ------------------ |
| act      | Bridge → Engine → Preview → Persist           | —                  |
| sequence | Bridge → Engine → Preview → Persist           | —                  |
| scene    | Bridge → Engine → Preview → Persist           | —                  |
| shot     | Bridge (wenn Lane + Shots in Daten)           | nur Film/Serie     |

Während Drag: React-Layout eingefroren (`vet-structure-trim-layout-freeze`);
DOM-Preview via `applyStructurePreviewToDOM`; Viewport-Refs live bei move/scroll.

Legacy Buch-Shot-Pfad nur noch theoretisch (keine Shot-Lane bei Buch). Bridge
fehlt (`tree=null`): Hard-Stop mit Toast.

## Test-Status (automatisiert)

- Engine (`src/lib/ripple-engine/__tests__/hierarchical.test.ts`): Kern-Journeys
  sind als 22 Unit-Tests abgebildet.
- Hook (`src/hooks/__tests__/useStructureTrimSession.test.ts`): Snapshot-Disziplin,
  rAF-Schedule, Cancel-Behavior, Commit-Fail-Revert.
- Tree (`src/lib/timeline-tree/__tests__/`): Round-Trip pct↔frames, Invariants,
  Diff.
- Preview (`src/lib/ripple-engine/__tests__/preview.test.ts`): DOM-Transform
  ohne left-basierten Live-Preview, nur changedIds.

## Erwartetes Shim-Ergebnis

`CHECK_MODE=snippet SHIM_CHECKS_ARGS="--frontend" SHIM_CHANGED_FILES="src/components/VideoEditorTimeline.tsx,src/hooks/useStructureTrimSession.ts,src/hooks/useVetStructureTrimBridge.ts,src/lib/timeline-tree/**,src/lib/ripple-engine/**" npm run checks`

Status: Typecheck grün (654/654 Vitest-Tests, manuell verifiziert).
Manuelle Journeys: ausstehend.

## Rollback-Plan

Falls eine Journey fehlschlägt:

1. `USE_HIERARCHICAL_STRUCTURE_RIPPLE = false` setzen in
   `src/lib/vetilalorapp-feature.ts` → fällt auf Legacy-Film-Pfad zurück.
2. Hard-Stop in `handleTrimClipMouseDown` rückgängig machen
   (`if (kind !== "shot")` Guard entfernen).
3. `git revert` auf den VET-Commit → Legacy vollständig wieder aktiv.
