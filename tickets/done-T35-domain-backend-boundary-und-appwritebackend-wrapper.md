# Scriptony Architecture Refactor Ticket T35 — Domain Backend Boundary und AppwriteBackend Wrapper

Stand: 2026-05-23

## Ziel

Scriptony trennt Domain-Repositories von Appwrite-Implementierungen, damit UI und Hooks nicht mehr direkt an Appwrite, Collections oder Function-URLs gekoppelt sind.

## Arbeitsregeln

- Keine Breaking Changes ohne Compatibility Wrapper oder dokumentierte Migration.
- Neue Runtime-/Backend-Logik darf nicht direkt in UI-Komponenten landen.
- UI-Komponenten duerfen keine Appwrite-, SQLite-, Tauri- oder Self-hosted-Details kennen.
- Neue Fachlogik muss ueber Domain-Services, Repositories oder klar benannte Adapter laufen.
- Cloud/Appwrite bleibt fuer bestehende Web-/Team-Features voll funktionsfaehig.
- Local Mode darf keinen Login, keinen Appwrite-Server und keinen Docker-Stack voraussetzen.
- Self-hosted Mode darf erst greifen, wenn ein User explizit einen eigenen Endpoint verbindet.
- Jeder Schritt muss Feature-Flag-/Runtime-sicher sein: Cloud-Verhalten darf durch Local-Vorbereitung nicht regressieren.
- Alle Aenderungen muessen zum bestehenden UI/UX-System passen.

## Pflicht-Checks

Standard-Gate fuer normale Tickets:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks
```

Frontend-only Gate, wenn sicher keine Functions/Appwrite-Konfiguration betroffen sind:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --frontend
```

Backend-only Gate, wenn sicher kein Frontend/UI betroffen ist:

```bash
CHECK_MODE=snippet SHIM_CHECKS_ARGS="" npm run checks -- --backend
```

Beim Abschluss muss ein Done Report in `docs/scriptony-architecture-refactor 25.04.26.md` ergaenzt werden.

---
## Kontext

Nach T34 existiert eine Runtime- und Auth-Grenze. Der naechste Schritt ist die Backend-Grenze. Scriptony soll langfristig Local Mode, Cloud Mode und Self-hosted Mode unterstuetzen. Dafuer darf Appwrite nicht mehr das fachliche Datenmodell sein. Das fachliche Datenmodell ist Scriptony: Projects, Structure, Script, Characters, Worldbuilding, Timeline, Audio, Assets, Jobs, AI.

## Problem

Viele Frontend-Aufrufe laufen aktuell ueber Appwrite SDK, API Gateway oder `src/lib/api/*`. Das ist fuer Cloud richtig, aber fuer Local-first falsch. Wenn weitere Features direkt gegen Appwrite gebaut werden, wird LocalBackend spaeter ein Rewrite.

Gefaehrlich waere ein generischer `DataProvider` mit `collection: string`, weil dadurch Appwrite-Collections als Denkmuster erhalten bleiben.

Falsch:

```ts
data.create("audio_clips", data);
```

Richtig:

```ts
backend.audio.createClip(input);
```

## Loesung

Ein domain-spezifisches `ScriptonyBackend` Interface einfuehren:

```ts
export interface ScriptonyBackend {
  auth: AuthClient;
  projects: ProjectRepository;
  structure: StructureRepository;
  scripts: ScriptRepository;
  characters: CharacterRepository;
  worldbuilding: WorldbuildingRepository;
  timeline: TimelineRepository;
  audio: AudioRepository;
  assets: AssetRepository;
  jobs: JobService;
  ai: AiService;
  storage: StorageService;
}
```

Neue Struktur:

```text
src/backend/
├── ScriptonyBackend.ts
├── create-backend.ts
├── backend-provider.tsx      # BackendProvider + useScriptonyBackend()
├── appwrite/
│   ├── AppwriteBackend.ts
│   ├── AppwriteProjectRepository.ts
│   ├── AppwriteAudioRepository.ts
│   ├── AppwriteAssetRepository.ts
│   ├── AppwriteJobService.ts
│   └── AppwriteAiService.ts
└── local/
    ├── LocalBackend.ts
    ├── LocalProjectRepository.ts
    ├── LocalAudioRepository.ts
    ├── LocalAssetRepository.ts
    └── LocalJobService.ts
```

`AppwriteBackend` nutzt intern weiter **`src/lib/api/*`** und **`src/lib/api-gateway.ts`**. Keine duplizierte HTTP-Logik.

`LocalBackend` wird in diesem Ticket nur als Stub eingefuehrt.

### React-Integration

```tsx
// backend-provider.tsx
export function BackendProvider({ children }: { children: ReactNode }) {
  const runtime = useRuntime();
  const backend = useMemo(() => createBackend(runtime), [runtime]);
  return <BackendContext.Provider value={backend}>{children}</BackendContext.Provider>;
}

export function useScriptonyBackend(): ScriptonyBackend { /* ... */ }
```

`App.tsx`: `RuntimeProvider` → `BackendProvider` (Reihenfolge beachten).

### Migrationsregeln (ab sofort)

| Erlaubt | Verboten in neuem Code |
|---------|-------------------------|
| `useScriptonyBackend()` | Direkter Import `src/lib/appwrite/*` in Komponenten |
| Domain-Hooks, die Backend nutzen | Direkter Import `src/lib/api/*` in `src/components/**` |
| Appwrite-Repositories unter `src/backend/appwrite/` | Neuer generischer `DataProvider` mit `collection: string` |

Bestehende Aufrufer duerfen schrittweise migriert werden; **neue** Features muessen die Regeln einhalten.

## User Journey

Dieses Ticket hat bewusst keine sichtbare Produktveraenderung.

### Cloud User

1. User oeffnet Scriptony wie bisher.
2. Bestehende Cloud-Projekte funktionieren unveraendert.
3. Intern laeuft der Aufruf aber ueber `ScriptonyBackend` -> `AppwriteBackend`.

### Developer

1. Neue Features importieren nicht mehr `src/lib/appwrite/*` oder direkte API-Module.
2. Neue Features nutzen `backend.projects`, `backend.audio`, `backend.assets` usw.
3. Local Implementierungen koennen spaeter pro Domain ergaenzt werden.

## Architektur

```text
React Components / Hooks
  ↓
Domain Hooks / Services
  ↓
ScriptonyBackend Interface
  ├── AppwriteBackend
  │     └── existing src/lib/api/* + api-gateway
  └── LocalBackend
        └── stubs in this ticket
```

Backend-Auswahl:

```ts
export function createBackend(runtime: RuntimeConfig): ScriptonyBackend {
  if (runtime.profile === "local") {
    return new LocalBackend({ auth: createAuthFactory(runtime) });
  }

  return new AppwriteBackend({ auth: createAuthFactory(runtime), runtime });
}
```

## Beispiele

### Project Repository Interface

```ts
export interface ProjectRepository {
  listProjects(): Promise<Project[]>;
  getProject(projectId: string): Promise<Project | null>;
  createProject(input: CreateProjectInput): Promise<Project>;
  updateProject(projectId: string, input: UpdateProjectInput): Promise<Project>;
  deleteProject(projectId: string): Promise<void>;
}
```

### Appwrite Wrapper

```ts
export class AppwriteProjectRepository implements ProjectRepository {
  async listProjects(): Promise<Project[]> {
    return projectsApi.listProjects();
  }

  async getProject(projectId: string): Promise<Project | null> {
    return projectsApi.getProject(projectId);
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    return projectsApi.createProject(input);
  }

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
    return projectsApi.updateProject(projectId, input);
  }

  async deleteProject(projectId: string): Promise<void> {
    return projectsApi.deleteProject(projectId);
  }
}
```

### Local Stub

```ts
export class LocalProjectRepository implements ProjectRepository {
  async listProjects(): Promise<Project[]> {
    throw new Error("Local projects are not implemented yet.");
  }
}
```

## Edge Cases

1. **Bestehende API-Module haben uneinheitliche Return-Shapes**: Appwrite-Repositories muessen auf Domain-Types normalisieren.
2. **Ein Feature braucht Function-Call statt Database-Call**: Repository darf intern Function-Gateway verwenden; UI darf es nicht wissen.
3. **Local Runtime wird gestartet, aber Repository ist Stub**: Fehler muss klar sein und darf nicht auf Appwrite fallbacken.
4. **Self-hosted verwendet AppwriteBackend**: Endpoint/Project-ID muessen aus RuntimeConfig kommen.
5. **Alte Imports bleiben bestehen**: Ticket muss mindestens neue Regeln dokumentieren; Migration kann pro Domain erfolgen.

## Akzeptanzkriterien

- [ ] `BackendProvider` + `useScriptonyBackend()` existieren und sind in `App.tsx` eingebunden.
- [ ] `ScriptonyBackend.auth` ist Typ **`AuthClient`** (bestehendes Interface).
- [ ] Domain-Repositories fuer Projects, Structure, Scripts, Characters, Worldbuilding, Timeline, Audio, Assets, Jobs, AI, Storage sind initial definiert (Interfaces + ggf. `NotImplemented`-Stubs).
- [ ] `AppwriteBackend` existiert und kapselt bestehende API-Module.
- [ ] `LocalBackend` existiert mit klaren Stub-Implementierungen.
- [ ] `createBackend(runtime)` existiert.
- [ ] Mindestens `projects`, `audio`, `assets`, `jobs` sind als Appwrite-Wrapper implementiert.
- [ ] Keine neue UI-Komponente importiert Appwrite SDK direkt.
- [ ] Bestehender Cloud-Flow funktioniert unveraendert.
- [ ] `npm run typecheck` laeuft durch.
- [ ] Shimwrappercheck laeuft durch.

## SOLID / DRY / KISS

- **SRP**: Repositories kapseln Persistenz je Domain; UI rendert nur.
- **OCP**: LocalBackend kann ergaenzt werden, ohne UI zu aendern.
- **LSP**: Appwrite- und Local-Repositories erfuellen dieselben Interfaces.
- **ISP**: Keine riesige generische `DataProvider`-Abstraktion; kleine Domain-Interfaces.
- **DIP**: Domain/UI haengt an Interfaces, nicht an Appwrite.
- **DRY**: Bestehende API-Module werden wiederverwendet, nicht dupliziert.
- **KISS**: Kein Function-Rewrite, kein SQLite in diesem Ticket.
