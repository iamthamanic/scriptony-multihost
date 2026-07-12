# Ticket T53 — Legacy-API-Aufrufe auf ScriptonyBackend umstellen (Done)

Stand: 2026-05-25 — **Abgeschlossen**

## Ziel

Alle UI-Komponenten nutzen `useScriptonyBackend().projects` statt der legacy `projectsApi`-HTTP-Aufrufe, sodass sie im Local-Modus ohne Appwrite-Server funktionieren.

---

## Kontext

T35 (Backend Boundary) und T38 (LocalBackend MVP) haben die `ScriptonyBackend`-Schnittstelle mit `LocalBackend`/`LocalProjectRepository` aufgebaut. T36–T37 haben die Desktop-Shell und das lokale Projektformat integriert. T50 (Runtime Auto-Detect) lässt Tauri jetzt direkt in den Local-Modus starten.

Aber: Die Hauptseiten (`ProjectsPage`, `WorldbuildingPage`, `HomePage` etc.) rufen noch die legacy `projectsApi` auf, die HTTP-Requests an Appwrite-Functions macht. Im Local-Modus gibt es keinen Appwrite-Server → "Fehler beim Laden der Daten".

## Problem

6 Dateien importieren `projectsApi`/`worldsApi`/`itemsApi` aus `@/utils/api` (deprecated) statt `useScriptonyBackend()`:

| Datei                                                                      | API-Aufrufe                                 |
| -------------------------------------------------------------------------- | ------------------------------------------- |
| `src/components/pages/ProjectsPage.tsx`                                    | `projectsApi`, `worldsApi`, `itemsApi`      |
| `src/components/pages/WorldbuildingPage.tsx`                               | `projectsApi`, `worldsApi`                  |
| `src/components/pages/HomePage.tsx`                                        | `projectsApi`, `worldsApi`                  |
| `src/components/assistant/ScriptonyAssistant.tsx`                          | `projectsApi`, `worldsApi`, `itemsApi` u.a. |
| `src/integrations/stage-export.ts`                                         | `itemsApi`, `projectsApi`, `worldsApi`      |
| `src/modules/creative-gym/adapters/integrated/scriptony-project-bridge.ts` | `projectsApi`, `scenesApi`                  |

Die ScriptonyBackend-Repositories existieren, sind getestet und funktional – werden aber nicht genutzt.

## Lösung

### Adapter-Strategie (KISS)

Statt jede Komponente einzeln umzuschreiben: Einen **Runtime-Aware API-Adapter** einführen, der die bestehende `projectsApi`-Schnittstelle beibehält, aber intern auf `ScriptonyBackend` delegiert wenn der Runtime-Modus `local` ist.

```text
projectsApi.getAll()
  → ApiAdapter.projects.getAll()
    → runtime.profile === "local"
      ? useScriptonyBackend().projects.list()   → LocalProjectRepository → SQLite
      : fetch("/api/projects")                  → Appwrite Function (wie bisher)
```

**Warum Adapter statt direkter Migration:**

- Keine Änderung der 6 Consumer-Dateien nötig
- Bestehendes Verhalten (Cloud) bleibt unverändert
- Lokaler Pfad wird transparent durch den Adapter aktiviert
- `src/utils/api.tsx` wird zum Adapter statt zum deprecated Wrapper
- Später können Consumer einzeln auf `useScriptonyBackend()` migriert werden

### Neue Dateien

```text
src/lib/api-adapter.ts          ← Runtime-aware Adapter, ersetzt direkte HTTP-Aufrufe
```

### Geänderte Dateien

```text
src/utils/api.tsx               ← Importiert von api-adapter statt api-client
```

### Was explizit NICHT Teil dieses Tickets ist

- Umstellung der Consumer-Dateien auf direkte `useScriptonyBackend()`-Aufrufe (Folge-Ticket)
- Neue Features in LocalBackend (nur Anbindung bestehender Repositories)
- AppwriteBackend-Refactoring (bleibt wie er ist)

## User Journey

### Local Desktop

1. User öffnet Scriptony Desktop-App.
2. Kein Login nötig (T50 bereits erledigt).
3. Klickt auf Projekte.
4. `projectsApi.getAll()` → Adapter erkennt Local-Modus → `LocalProjectRepository.list()` → SQLite.
5. Projekte werden angezeigt (leer bei neuem Projekt, oder bestehende lokale Projekte).

### Cloud Browser

1. User öffnet scriptony.com im Browser.
2. Login nötig.
3. Klickt auf Projekte.
4. `projectsApi.getAll()` → Adapter erkennt Cloud-Modus → HTTP fetch an Appwrite Function.
5. Kein Verhaltensunterschied zur aktuellen Version.

## Architektur

```text
ProjectsPage / WorldbuildingPage / HomePage
  ↓ (keine Änderung)
projectsApi / worldsApi / itemsApi  (src/utils/api.tsx)
  ↓
ApiAdapter  (src/lib/api-adapter.ts)
  ├── runtime.profile === "local"
  │   → useScriptonyBackend().projects / .worldbuilding  → SQLite
  └── runtime.profile === "cloud" | "selfHosted"
      → apiGet / apiPost  (src/lib/api-client.ts)  → Appwrite Functions
```

## Edge Cases

1. **Kein lokales Projekt geöffnet**: `LocalBackendNotReady` wirft "Open a local project first" – Adapter fängt den Fehler und gibt leeres Array zurück statt zu crashen.
2. **Runtime-Wechsel zur Laufzeit**: Adapter muss den aktuellen Runtime-Profile bei jedem Aufruf neu ermitteln, nicht beim ersten Aufruf cachen.
3. **Mixed Calls (Projects = Local, AI = Cloud)**: Nicht Teil dieses Tickets, aber Adapter-Struktur erlaubt später einen Hybriden-Modus.
4. **ScriptonyAssistant**: Dieser nutzt viele APIs (ai, audio, image etc.) – für Local-Modus können nicht alle umgestellt werden. Adapter gibt für nicht-unterstützte APIs im Local-Modus stub-Responses zurück.
5. **stage-export.ts**: Wird von der Stage-Seite aufgerufen – muss im Local-Modus entweder lokal exportieren oder klar kommunizieren dass Cloud-Export nicht verfügbar ist.

## Akzeptanzkriterien

- [ ] `ProjectsPage` zeigt keine "Fehler beim Laden der Daten"-Meldung im Local-Modus.
- [ ] `ProjectsPage` zeigt lokale Projekte aus SQLite (oder leere Liste bei neuem Projekt).
- [ ] `HomePage` lädt ohne Fehler im Local-Modus.
- [ ] `WorldbuildingPage` lädt ohne Fehler im Local-Modus.
- [ ] Cloud-Modus (Browser) verhält sich exakt wie vor diesem Ticket (kein Regression).
- [ ] `src/utils/api.tsx` delegiert über den Adapter.
- [ ] `npm run typecheck` läuft durch.
- [ ] Shimwrappercheck läuft durch.
- [ ] Keine neue Abhängigkeit eingeführt.

## Notizen

- Abhängigkeit: T50 (Runtime Auto-Detect) muss eingebaut sein – erledigt.
- Die `utils/api.tsx`-Consumer können in Folgetickets einzeln auf `useScriptonyBackend()` migriert werden. Sobald alle Consumer migriert sind, kann `utils/api.tsx` gelöscht werden.
- Die Adapter-Strategie ist bewusst KISS: Eine Schicht, die den Runtime-Check macht und delegiert. Kein Proxy-Pattern, kein Dependency-Injection-Container, kein Event-Bus.

## SOLID / DRY / KISS

- **SRP**: Der Adapter hat genau eine Verantwortung – Runtime-basierte Delegation. Weder Domain-Logik noch HTTP-Details.
- **OCP**: Neue Repositories im ScriptonyBackend unterstützen sich automatisch – der Adapter muss nicht geändert werden, wenn `LocalBackend` neue Domains bekommt.
- **LSP**: Die Adapter-Methoden haben dieselben Signaturen wie die bestehenden `projectsApi`-Methoden – Consumer merken keinen Unterschied.
- **ISP**: Der Adapter exponiert nur die Methoden die die Consumer brauchen, nicht das komplette Backend-Interface.
- **DIP**: Consumer hängen an `projectsApi` (Abstraktion), nicht an `apiGet` oder `LocalProjectRepository` (Implementierung).
- **DRY**: Ein Adapter statt 6 Komponenten-Änderungen. Runtime-Check zentral, nicht in jedem Consumer dupliziert.
- **KISS**: Eine Datei (`api-adapter.ts`), eine Entscheidung (`local` vs `cloud`), eine Delegation. Kein Overengineering.
