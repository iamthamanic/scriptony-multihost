# Timeline Domain Decision Document

**Stand:** 2026-04-27
**Ticket:** T13 — Timeline-Konsolidierung vorbereiten
**Verifizierungsmarker:** ARCH-REF-T13-DONE

## Entscheidung

| Frage | Antwort |
|-------|---------|
| Brauchen wir eine generische `timeline_items` Collection? | **Nein — not needed yet.** |
| Sind Shots und Clips ausreichend? | **Ja, für alle aktuellen Produkttypen (Film, Serie, Buch, Theater, Game).** |
| Soll `scriptony-timeline` als physische Function sofort gebaut werden? | **Nein.** `scriptony-shots` und `scriptony-clips` bleiben separate Functions, werden aber logisch als eine Timeline-Domain behandelt. |
| Wann wird `scriptony-timeline` physisch benötigt? | Erst wenn ein neuer Produkttyp oder eine neue Timeline-Abstraktion (z.B. generische "Segmente" für alle Medientypen) eingeführt wird, die Shots und Clips übersteigt. |

## Begründung

### Warum keine `timeline_items`?

1. **YAGNI.** Aktuell gibt es keinen Produkttyp und kein Feature, das eine generische Timeline-Item-Collection braucht.
2. **KISS.** Shots (Film/Serie) und Clips (NLE-Segmente) haben unterschiedliche Attribute, Lebenszyklen und Geschäftsregeln. Eine generische Collection würde zur "Metadaten-Müllhalde" werden.
3. **DRY-Verletzung vermeiden.** Wenn `timeline_items` alle Felder von Shots + Clips + zukünftigen Typen enthält, wird das Schema unübersichtlich und jeder Typ trägt leere Attribute mit.
4. **Migrationsschutz.** Eine `timeline_items` Einführung wäre eine Massenmigration über alle Projekte. Solange kein zwingender Business-Case existiert, bleiben wir bei den bewährten Collections.

### Wann wird `timeline_items` gebraucht?

Eine generische Timeline-Item-Collection wird relevant, wenn:
- Ein neuer Produkttyp eingeführt wird, der weder Shots noch Clips verwendet (z.B. rein audio-basierte Podcast-Episoden, interaktive Game-Segmente mit eigenem Datenmodell).
- Eine Timeline-Engine gebaut wird, die **querschnittlich** über alle Produkttypen funktioniert und Items mit einem vereinheitlichten Interface anzeigt.
- Performance-Probleme auftreten, weil der Editor zu viele heterogene Abfragen (shots + clips + audio_tracks + script_blocks) parallel ausführen muss.

### Aktuelle Timeline-Primitiven

| Primitive | Collection | Besitzt | Nutzt |
|-----------|-----------|---------|-------|
| **Shots** | `shots` | `scriptony-shots` / `scriptony-timeline` | `projects`, `nodes` (scenes), `characters` (via `shot_characters`) |
| **Clips** | `clips` | `scriptony-clips` / `scriptony-timeline` | `projects`, `shots` |
| **Audio Tracks** | `scene_audio_tracks` | `scriptony-audio-production` | `projects`, `scenes` (via `scene_id`), `characters` |
| **Script Blocks** | `script_blocks` | `scriptony-script` | `scripts`, `projects`, `nodes` |

## Domain-Grenzen

### Was gehört zur Timeline-Domain?

- Shot-CRUD, Shot-Reihenfolge, Shot-Metadaten (camera_angle, duration, etc.)
- Clip-CRUD, Clip-Timing, NLE-Segmente (`start_sec`, `end_sec`, `lane_index`)
- Shot/Clip Beziehungen zu Scenes/Nodes
- Readalong/Playback-relevante Segmente

### Was gehört NICHT zur Timeline-Domain?

- Audio-Datei-Upload → `scriptony-assets`
- TTS/STT Ausführung → `scriptony-audio`
- Script-Text → `scriptony-script`
- Voice Assignments → `scriptony-audio-production`
- Asset-Metadaten → `scriptony-assets`
- Mixing/Export → `scriptony-media-worker`

## Beziehungen zu anderen Domänen

```
scriptony-timeline (Shots + Clips)
  │ owns: shots, clips
  │ reads: projects, nodes (scenes), characters
  │
  ├─→ scriptony-assets: Audio-Dateien, Cover-Bilder, Shot-Bilder
  ├─→ scriptony-audio-production: scene_audio_tracks (Timing, Playback)
  ├─→ scriptony-script: script_blocks (Dialog/Content für Readalong)
  ├─→ scriptony-editor-readmodel: liest shots + clips für Editor-State
  └─→ scriptony-structure: nodes (scenes) als Parent für Shots
```

## Frontend-Abstraktion

Die Frontend-API-Layer bündelt Shots und Clips unter `src/lib/api/timeline-domain-api.ts`.
Bestehende `shots-api.ts` und `clips-api.ts` bleiben kompatibel (keine Breaking Changes).
Neuer Code sollte die Domain-API verwenden.

## Architektur-Regeln für neue Features

1. **Keine neuen Timeline-Features in `scriptony-shots` ohne Zielentscheidung.**
2. **Keine neuen Timeline-Features in `scriptony-clips` ohne Zielentscheidung.**
3. **Wenn ein Feature sowohl Shots als auch Clips betrifft:** Ticket erstellen, Docs erweitern, dann entweder `timeline-domain-api.ts` erweitern oder `scriptony-timeline` als physische Function planen.
4. **Wenn ein Feature Shot-Audio betrifft:** `scriptony-assets` oder `scriptony-audio-production`, nicht `scriptony-shots`.

## Migrationspfad (wenn `timeline_items` doch irgendwann nötig wird)

1. Zielschema `timeline_items` definieren (minimale generische Felder + typ-spezifische JSON-Metadaten).
2. Dual-Write-Phase: Neue Items in `timeline_items` schreiben, alte in `shots`/`clips` behalten.
3. Frontend auf `timeline_items` umstellen.
4. Backfill-Migration für bestehende Daten.
5. `shots` und `clips` als Legacy markieren.
6. Nach Beobachtungsfenster: `shots`/`clips` entfernen.

## Checkliste

- [x] Domain Map aktualisiert (`scriptony-shots` → `scriptony-timeline`, `scriptony-clips` → `scriptony-timeline`)
- [x] Backend-Handler mit T13-Markern versehen
- [x] Frontend Domain-API (`timeline-domain-api.ts`) erstellt
- [x] Bestehende APIs als deprecated markiert
- [x] Keine neuen Collections angelegt
- [x] Keine Breaking Changes
- [x] Keine neuen Timeline-Features im Scope dieses Tickets
