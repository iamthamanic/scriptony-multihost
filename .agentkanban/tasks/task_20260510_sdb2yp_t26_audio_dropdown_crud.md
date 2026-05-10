---
title: t26-audio-dropdown-crud
lane: todo
created: 2026-05-10T13:28:58.182Z
updated: 2026-05-10T13:28:58.183Z
description: |-
  # T26: AudioDropdown — Hierarchie-CRUD (Akt/Sequenz/Szene hinzufügen, bearbeiten, löschen)

  ## Scope

  Die `AudioDropdown`-Komponente (Hörspiel/Hörbuch) kann aktuell nur Audio-Tracks zu bestehenden
  Szenen hinzufügen. Die Hierarchie-Ebenen (Akt → Sequenz → Szene) werden angezeigt, aber es gibt
  keine Möglichkeit, sie zu erstellen, umzubenennen, zu löschen oder zu duplizieren.

  Film- und Buch-Projekte haben diese CRUD-Funktionalität über `FilmDropdown` und `BookDropdown`.
  Hörspiel muss dasselbe können — die API-Endpunkte existieren bereits (`TimelineAPI`).

  ### Architektur: Shared Hook statt 3. Kopie

  Statt die gleiche Logik ein drittes Mal zu kopieren, wird ein **`useHierarchyCRUD`-Hook**
  extrahiert, der die gemeinsame CRUD-Logik für alle Projekttypen kapselt.

  ```
  src/hooks/useHierarchyCRUD.ts     ← NEU: shared CRUD-Handler + Label-Auflösung
  src/lib/projectTypeRegistry.ts     ← BESTEHEND: Labels/Features (wird genutzt)
  src/components/audio/AudioDropdown.tsx  ← ERGÄNZT: nutzt Hook, bekommt "+" Buttons
  ```

  Später können FilmDropdown und BookDropdown auf denselben Hook migriert werden (separates Ticket).

  ## Current State (Ist)

  | Feature | FilmDropdown | BookDropdown | AudioDropdown |
  |---|---|---|---|
  | Akt hinzufügen | `handleAddAct` | `handleAddAct` | **fehlt** |
  | Sequenz hinzufügen | `handleAddSequence` | `handleAddSequence` | **fehlt** |
  | Szene hinzufügen | `handleAddScene` | `handleAddScene` | **fehlt** |
  | Akt umbenennen | `handleUpdateAct` | `handleUpdateAct` | **fehlt** |
  | Sequenz umbenennen | `handleUpdateSequence` | `handleUpdateSequence` | **fehlt** |
  | Szene umbenennen | `handleUpdateScene` | `handleUpdateScene` | **fehlt** |
  | Akt löschen | `handleDeleteAct` | `handleDeleteAct` | **fehlt** |
  | Sequenz löschen | `handleDeleteSequence` | `handleDeleteSequence` | **fehlt** |
  | Szene löschen | `handleDeleteScene` | `handleDeleteScene` | **fehlt** |
  | Akt duplizieren | `handleDuplicateAct` | `handleDuplicateAct` | **fehlt** |
  | Sequenz duplizieren | `handleDuplicateSequence` | `handleDuplicateSequence` | **fehlt** |
  | Szene duplizieren | `handleDuplicateScene` | `handleDuplicateScene` | **fehlt** |
  | Drag & Drop | react-dnd | react-dnd | **fehlt** |
  | Empty State | "+ Akt hinzufügen" | "+ Akt hinzufügen" | "Keine Acts vorhanden" (nur Text) |
  | Track/Shot hinzufügen | `handleAddShot` | — | `handleAddTrack` (existiert) |

  ## Target State (Soll)

  ### 1. `useHierarchyCRUD` Hook (NEU)

  ```ts
  // src/hooks/useHierarchyCRUD.ts
  interface UseHierarchyCRUDOptions {
    projectId: string;
    projectType: string;
    acts: Act[];
    sequences: Sequence[];
    scenes: Scene[];
    onMutationSuccess?: () => void;  // invalidation callback
  }

  interface UseHierarchyCRUDReturn {
    // Create
    handleAddAct: () => Promise<void>;
    handleAddSequence: (actId: string) => Promise<void>;
    handleAddScene: (sequenceId: string) => Promise<void>;
    // Update (rename)
    handleUpdateAct: (actId: string, updates: Partial<Act>) => Promise<void>;
    handleUpdateSequence: (sequenceId: string, updates: Partial<Sequence>) => Promise<void>;
    handleUpdateScene: (sceneId: string, updates: Partial<Scene>) => Promise<void>;
    // Delete
    handleDeleteAct: (actId: string) => Promise<void>;
    handleDeleteSequence: (sequenceId: string) => Promise<void>;
    handleDeleteScene: (sceneId: string) => Promise<void>;
    // Duplicate
    handleDuplicateAct: (actId: string) => Promise<void>;
    handleDuplicateSequence: (sequenceId: string) => Promise<void>;
    handleDuplicateScene: (sceneId: string) => Promise<void>;
    // Labels (aus projectTypeRegistry)
    labelFor: (kind: "act" | "sequence" | "scene") => string;
    labelPluralFor: (kind: "act" | "sequence" | "scene") => string;
    // State
    creating: string | null;
    pendingIds: Set<string>;
  }
  ```

  - Verwendet `TimelineAPI` (wie BookDropdown, server-first pattern)
  - Labels aus `projectTypeRegistry`: Audio = Akt/Sequenz/Szene, Book = Akt/Kapitel/Abschnitt, Film = Akt/Sequence/Scene
  - Default-Titel: `labelFor("act") + " " + nextNumber`
  - Query-Invalidierung über `queryClient.invalidateQueries({ queryKey: queryKeys.timeline.byProject(projectId) })`
  - Toast-Meldungen (success/error) wie BookDropdown

  ### 2. `AudioDropdown.tsx` (ERGÄNZT)

  - Importiert `useHierarchyCRUD`
  - "+" Buttons für Akt, Sequenz (pro Akt), Szene (pro Sequenz)
  - Inline-Editing für Titel (wie Film/Book)
  - Delete-Buttons pro Ebene (wie Film/Book)
  - Duplicate-Buttons pro Ebene (wie Film/Book)
  - Empty State: "+ Akt hinzufügen" statt "Keine Acts vorhanden"
  - Drag & Drop für Reihenfolge (Phase 2 — siehe unten)
  - AudioTrack-Funktionalität bleibt unverändert

  ### 3. `projectTypeRegistry.ts` (ERGÄNZT)

  Neue Label-Map für Hierarchie-Ebenen:

  ```ts
  // Zu jedem Registry-Eintrag:
  hierarchyLabels: {
    act: { singular: "Akt", plural: "Akte" },
    sequence: { singular: "Sequenz", plural: "Sequenzen" },  // Hörspiel
    scene: { singular: "Szene", plural: "Szenen" },
  }
  // Book:
  hierarchyLabels: {
    act: { singular: "Akt", plural: "Akte" },
    sequence: { singular: "Kapitel", plural: "Kapitel" },
    scene: { singular: "Abschnitt", plural: "Abschnitte" },
  }
  // Film:
  hierarchyLabels: {
    act: { singular: "Akt", plural: "Akte" },
    sequence: { singular: "Sequence", plural: "Sequenzen" },
    scene: { singular: "Szene", plural: "Szenen" },
  }
  ```

  ## Phasen

  ### Phase 1: CRUD-Grundfunktionen (dieses Ticket)

  - [ ] `useHierarchyCRUD` Hook erstellen
  - [ ] `projectTypeRegistry` um `hierarchyLabels` erweitern
  - [ ] `AudioDropdown` um CRUD-Handler ergänzen (nutzt Hook)
  - [ ] "+" Buttons für Akt, Sequenz, Szene
  - [ ] Inline-Editing für Titel
  - [ ] Delete-Buttons pro Ebene
  - [ ] Duplicate-Buttons pro Ebene
  - [ ] Empty State mit "Akt hinzufügen"-Button
  - [ ] Manueller Test: Hörspiel-Projekt → Akt erstellen → Sequenz erstellen → Szene erstellen → umbenennen → löschen → duplizieren

  ### Phase 2: Drag & Drop (Follow-up-Ticket)

  - [ ] Drag & Drop für Reihenfolge (react-dnd, wie Film/Book)
  - [ ] `handleMoveAct` / `handleMoveSequence` / `handleMoveScene` im Hook

  ### Phase 3: Refactor Film/Book (Follow-up-Ticket)

  - [ ] FilmDropdown auf `useHierarchyCRUD` migrieren
  - [ ] BookDropdown auf `useHierarchyCRUD` migrieren
  - [ ] Duplizierte CRUD-Handler aus Film/Book entfernen

  ## Acceptance Criteria

  - [ ] In einem Hörspiel-Projekt können Akt, Sequenz und Szene über "+" Buttons erstellt werden
  - [ ] Titel von Akt, Sequenz und Szene können inline bearbeitet werden
  - [ ] Akt, Sequenz und Szene können gelöscht werden (mit Bestätigung)
  - [ ] Akt, Sequenz und Szene können dupliziert werden
  - [ ] Empty State zeigt "Akt hinzufügen"-Button statt "Keine Acts vorhanden"
  - [ ] Labels sind korrekt: Akt/Sequenz/Szene (Hörspiel), Akt/Kapitel/Abschnitt (Buch), Akt/Sequence/Szene (Film)
  - [ ] AudioTrack-Funktionalität (hinzufügen, abspielen) funktioniert weiterhin wie bisher
  - [ ] Kein Backend-Deploy nötig — alle API-Endpunkte existieren bereits

  ## Verification

  1. `npx vite --port 3000 --strictPort` starten
  2. Hörspiel-Projekt öffnen (`http://localhost:3000`)
  3. Dropdown-Ansicht: "+" Akt erstellen → Akt erscheint
  4. Akt aufklappen → "+" Sequenz erstellen → Sequenz erscheint
  5. Sequenz aufklappen → "+" Szene erstellen → Szene erscheint
  6. Titel inline bearbeiten → Änderung wird gespeichert
  7. Akt/Sequenz/Szene löschen → Bestätigungsdialog → Element verschwindet
  8. Akt/Sequenz/Szene duplizieren → Kopie erscheint
  9. AudioTrack zu Szene hinzufügen → funktioniert weiterhin
  10. Film-Projekt: Dropdown funktioniert weiterhin (kein Regression)

  ## Backend-Deploy

  Kein Backend-Deploy nötig. Alle CRUD-Endpunkte (`scriptony-projects`) sind bereits deployed und werden von Film/Book bereits genutzt.
sortOrder: 1
slug: t26_audio_dropdown_crud
---

## Conversation

### user

# T26: AudioDropdown — Hierarchie-CRUD (Akt/Sequenz/Szene hinzufügen, bearbeiten, löschen)

## Scope

Die `AudioDropdown`-Komponente (Hörspiel/Hörbuch) kann aktuell nur Audio-Tracks zu bestehenden
Szenen hinzufügen. Die Hierarchie-Ebenen (Akt → Sequenz → Szene) werden angezeigt, aber es gibt
keine Möglichkeit, sie zu erstellen, umzubenennen, zu löschen oder zu duplizieren.

Film- und Buch-Projekte haben diese CRUD-Funktionalität über `FilmDropdown` und `BookDropdown`.
Hörspiel muss dasselbe können — die API-Endpunkte existieren bereits (`TimelineAPI`).

### Architektur: Shared Hook statt 3. Kopie

Statt die gleiche Logik ein drittes Mal zu kopieren, wird ein **`useHierarchyCRUD`-Hook**
extrahiert, der die gemeinsame CRUD-Logik für alle Projekttypen kapselt.

```
src/hooks/useHierarchyCRUD.ts     ← NEU: shared CRUD-Handler + Label-Auflösung
src/lib/projectTypeRegistry.ts     ← BESTEHEND: Labels/Features (wird genutzt)
src/components/audio/AudioDropdown.tsx  ← ERGÄNZT: nutzt Hook, bekommt "+" Buttons
```

Später können FilmDropdown und BookDropdown auf denselben Hook migriert werden (separates Ticket).

## Current State (Ist)

| Feature | FilmDropdown | BookDropdown | AudioDropdown |
|---|---|---|---|
| Akt hinzufügen | `handleAddAct` | `handleAddAct` | **fehlt** |
| Sequenz hinzufügen | `handleAddSequence` | `handleAddSequence` | **fehlt** |
| Szene hinzufügen | `handleAddScene` | `handleAddScene` | **fehlt** |
| Akt umbenennen | `handleUpdateAct` | `handleUpdateAct` | **fehlt** |
| Sequenz umbenennen | `handleUpdateSequence` | `handleUpdateSequence` | **fehlt** |
| Szene umbenennen | `handleUpdateScene` | `handleUpdateScene` | **fehlt** |
| Akt löschen | `handleDeleteAct` | `handleDeleteAct` | **fehlt** |
| Sequenz löschen | `handleDeleteSequence` | `handleDeleteSequence` | **fehlt** |
| Szene löschen | `handleDeleteScene` | `handleDeleteScene` | **fehlt** |
| Akt duplizieren | `handleDuplicateAct` | `handleDuplicateAct` | **fehlt** |
| Sequenz duplizieren | `handleDuplicateSequence` | `handleDuplicateSequence` | **fehlt** |
| Szene duplizieren | `handleDuplicateScene` | `handleDuplicateScene` | **fehlt** |
| Drag & Drop | react-dnd | react-dnd | **fehlt** |
| Empty State | "+ Akt hinzufügen" | "+ Akt hinzufügen" | "Keine Acts vorhanden" (nur Text) |
| Track/Shot hinzufügen | `handleAddShot` | — | `handleAddTrack` (existiert) |

## Target State (Soll)

### 1. `useHierarchyCRUD` Hook (NEU)

```ts
// src/hooks/useHierarchyCRUD.ts
interface UseHierarchyCRUDOptions {
  projectId: string;
  projectType: string;
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  onMutationSuccess?: () => void;  // invalidation callback
}

interface UseHierarchyCRUDReturn {
  // Create
  handleAddAct: () => Promise<void>;
  handleAddSequence: (actId: string) => Promise<void>;
  handleAddScene: (sequenceId: string) => Promise<void>;
  // Update (rename)
  handleUpdateAct: (actId: string, updates: Partial<Act>) => Promise<void>;
  handleUpdateSequence: (sequenceId: string, updates: Partial<Sequence>) => Promise<void>;
  handleUpdateScene: (sceneId: string, updates: Partial<Scene>) => Promise<void>;
  // Delete
  handleDeleteAct: (actId: string) => Promise<void>;
  handleDeleteSequence: (sequenceId: string) => Promise<void>;
  handleDeleteScene: (sceneId: string) => Promise<void>;
  // Duplicate
  handleDuplicateAct: (actId: string) => Promise<void>;
  handleDuplicateSequence: (sequenceId: string) => Promise<void>;
  handleDuplicateScene: (sceneId: string) => Promise<void>;
  // Labels (aus projectTypeRegistry)
  labelFor: (kind: "act" | "sequence" | "scene") => string;
  labelPluralFor: (kind: "act" | "sequence" | "scene") => string;
  // State
  creating: string | null;
  pendingIds: Set<string>;
}
```

- Verwendet `TimelineAPI` (wie BookDropdown, server-first pattern)
- Labels aus `projectTypeRegistry`: Audio = Akt/Sequenz/Szene, Book = Akt/Kapitel/Abschnitt, Film = Akt/Sequence/Scene
- Default-Titel: `labelFor("act") + " " + nextNumber`
- Query-Invalidierung über `queryClient.invalidateQueries({ queryKey: queryKeys.timeline.byProject(projectId) })`
- Toast-Meldungen (success/error) wie BookDropdown

### 2. `AudioDropdown.tsx` (ERGÄNZT)

- Importiert `useHierarchyCRUD`
- "+" Buttons für Akt, Sequenz (pro Akt), Szene (pro Sequenz)
- Inline-Editing für Titel (wie Film/Book)
- Delete-Buttons pro Ebene (wie Film/Book)
- Duplicate-Buttons pro Ebene (wie Film/Book)
- Empty State: "+ Akt hinzufügen" statt "Keine Acts vorhanden"
- Drag & Drop für Reihenfolge (Phase 2 — siehe unten)
- AudioTrack-Funktionalität bleibt unverändert

### 3. `projectTypeRegistry.ts` (ERGÄNZT)

Neue Label-Map für Hierarchie-Ebenen:

```ts
// Zu jedem Registry-Eintrag:
hierarchyLabels: {
  act: { singular: "Akt", plural: "Akte" },
  sequence: { singular: "Sequenz", plural: "Sequenzen" },  // Hörspiel
  scene: { singular: "Szene", plural: "Szenen" },
}
// Book:
hierarchyLabels: {
  act: { singular: "Akt", plural: "Akte" },
  sequence: { singular: "Kapitel", plural: "Kapitel" },
  scene: { singular: "Abschnitt", plural: "Abschnitte" },
}
// Film:
hierarchyLabels: {
  act: { singular: "Akt", plural: "Akte" },
  sequence: { singular: "Sequence", plural: "Sequenzen" },
  scene: { singular: "Szene", plural: "Szenen" },
}
```

## Phasen

### Phase 1: CRUD-Grundfunktionen (dieses Ticket)

- [ ] `useHierarchyCRUD` Hook erstellen
- [ ] `projectTypeRegistry` um `hierarchyLabels` erweitern
- [ ] `AudioDropdown` um CRUD-Handler ergänzen (nutzt Hook)
- [ ] "+" Buttons für Akt, Sequenz, Szene
- [ ] Inline-Editing für Titel
- [ ] Delete-Buttons pro Ebene
- [ ] Duplicate-Buttons pro Ebene
- [ ] Empty State mit "Akt hinzufügen"-Button
- [ ] Manueller Test: Hörspiel-Projekt → Akt erstellen → Sequenz erstellen → Szene erstellen → umbenennen → löschen → duplizieren

### Phase 2: Drag & Drop (Follow-up-Ticket)

- [ ] Drag & Drop für Reihenfolge (react-dnd, wie Film/Book)
- [ ] `handleMoveAct` / `handleMoveSequence` / `handleMoveScene` im Hook

### Phase 3: Refactor Film/Book (Follow-up-Ticket)

- [ ] FilmDropdown auf `useHierarchyCRUD` migrieren
- [ ] BookDropdown auf `useHierarchyCRUD` migrieren
- [ ] Duplizierte CRUD-Handler aus Film/Book entfernen

## Acceptance Criteria

- [ ] In einem Hörspiel-Projekt können Akt, Sequenz und Szene über "+" Buttons erstellt werden
- [ ] Titel von Akt, Sequenz und Szene können inline bearbeitet werden
- [ ] Akt, Sequenz und Szene können gelöscht werden (mit Bestätigung)
- [ ] Akt, Sequenz und Szene können dupliziert werden
- [ ] Empty State zeigt "Akt hinzufügen"-Button statt "Keine Acts vorhanden"
- [ ] Labels sind korrekt: Akt/Sequenz/Szene (Hörspiel), Akt/Kapitel/Abschnitt (Buch), Akt/Sequence/Szene (Film)
- [ ] AudioTrack-Funktionalität (hinzufügen, abspielen) funktioniert weiterhin wie bisher
- [ ] Kein Backend-Deploy nötig — alle API-Endpunkte existieren bereits

## Verification

1. `npx vite --port 3000 --strictPort` starten
2. Hörspiel-Projekt öffnen (`http://localhost:3000`)
3. Dropdown-Ansicht: "+" Akt erstellen → Akt erscheint
4. Akt aufklappen → "+" Sequenz erstellen → Sequenz erscheint
5. Sequenz aufklappen → "+" Szene erstellen → Szene erscheint
6. Titel inline bearbeiten → Änderung wird gespeichert
7. Akt/Sequenz/Szene löschen → Bestätigungsdialog → Element verschwindet
8. Akt/Sequenz/Szene duplizieren → Kopie erscheint
9. AudioTrack zu Szene hinzufügen → funktioniert weiterhin
10. Film-Projekt: Dropdown funktioniert weiterhin (kein Regression)

## Backend-Deploy

Kein Backend-Deploy nötig. Alle CRUD-Endpunkte (`scriptony-projects`) sind bereits deployed und werden von Film/Book bereits genutzt.

