# Scriptony — Gesamtarchitektur

```mermaid
---
title: Scriptony Gesamtarchitektur
config:
  theme: dark
  flowchart:
    rankSpacing: 50
    nodeSpacing: 30
    curve: basis
---

flowchart TB
    subgraph Users["Benutzer & Geräte"]
        direction TB
        Browser["Web-Browser"]
        Mobile["Mobile App (Capacitor)"]
        Desktop["Desktop (Vite PWA)"]
    end

    subgraph CDN["Delivery Layer"]
        Vercel["Vercel Edge\n(Frontend Hosting)"]
    end

    subgraph Frontend["Frontend — React + Vite + TypeScript"]
        direction TB
        subgraph UI_Components["UI-Komponenten (Radix UI + Tailwind)"]
            Layout["Layout & Navigation"]
            Editors["Editor-Komponenten"]
            Dialogs["Dialoge & Popups"]
            Media["Media Player & Timeline"]
        end
        subgraph State_Layer["State & Logic"]
            ReactQuery["React Query\n(Server State)"]
            AuthHook["useAuth\n(AuthContext)"]
            CustomHooks["Custom Hooks\n(Beats, Timeline, Jobs, ...)"]
        end
        subgraph Router["Routing"]
            AppContent["AppContent\n(Router)"]
            Pages["Pages:\nLogin · Projects · Editor\nBeats · Timeline · Settings"]
        end
    end

    subgraph BridgeLayer["Lokale Bridge & DCC-Tools"]
        direction TB
        Bridge["local-bridge\n(Python HTTP Bridge)"]
        BlenderAddon["Blender Addon"]
        BlenderExt["Blender Extension"]
    end

    subgraph AppwritePlatform["Appwrite Platform"]
        direction TB
        Auth["Appwrite Auth\n(OAuth + Magic Link + Email)"]
        Database["Appwrite Database\n(Dokumente & Collections)"]
        Storage["Appwrite Storage\n(Buckets)"]
        Realtime["Appwrite Realtime\n(Subscriptions)"]
        Functions["Appwrite Functions\n(Serverless Node/Hono)"]
    end

    subgraph Functions["Backend Functions (Hono + esbuild)"]
        direction TB
        subgraph CoreFuncs["Kern-Funktionen"]
            FAuth["scriptony-auth"]
            FProjects["scriptony-projects"]
            FNodes["scriptony-project-nodes"]
            FChars["scriptony-characters"]
            FBeats["scriptony-beats"]
            FShots["scriptony-shots"]
            FClips["scriptony-clips"]
        end
        subgraph MediaFuncs["Media & Assets"]
            FImage["scriptony-image"]
            FAudio["scriptony-audio"]
            FAudioStory["scriptony-audio-story"]
            FVideo["scriptony-video"]
            FAssets["scriptony-assets"]
        end
        subgraph AIFuncs["AI & Assistenz"]
            FAI["scriptony-ai\n(LLM-Routing)"]
            FAssistant["scriptony-assistant\n(Chat)"]
            FJobs["scriptony-jobs\n(Langlauf-Tasks)"]
            FMCP["scriptony-mcp-appwrite\n(Model Context Protocol)"]
        end
        subgraph StageFuncs["Stage & Visualisierung"]
            FStage["scriptony-stage"]
            FStage2D["scriptony-stage2d"]
            FStage3D["scriptony-stage3d"]
            FWorld["scriptony-worldbuilding"]
            FStyle["scriptony-style"]
            FStyleGuide["scriptony-style-guide"]
        end
        subgraph UtilFuncs["Utility & Admin"]
            FSync["scriptony-sync"]
            FGym["scriptony-gym"]
            FScript["scriptony-script"]
            FSAdmin["scriptony-superadmin"]
            FLogs["scriptony-logs"]
            FStats["scriptony-stats"]
            FReadModel["scriptony-editor-readmodel"]
        end
    end

    subgraph Shared["functions/_shared (Shared Library)"]
        direction TB
        SharedEnv["env.ts\n(Konfiguration)"]
        SharedZod["Zod-Schemas"]
        SharedAI["AI-Service\n(Model Discovery, Routing)"]
        SharedDB["DB-Helpers"]
        SharedUtils["Utilities"]
    end

    subgraph ExternalAI["Externe AI-Provider"]
        OpenAI["OpenAI\n(GPT-4o, DALL-E, TTS)"]
        Anthropic["Anthropic (Claude)"]
        OtherAI["Weitere Provider\nGemini, Mistral, Local..."]
    end

    subgraph DevOps["DevOps & Tooling"]
        direction TB
        Docker["Docker Compose\n(infra/appwrite)"]
        Shim["shimwrappercheck\n(Lint · Build · Test · AI Review)"]
        Scripts["scripts/\n(Deploy · Verify · Smoke Tests)"]
        GitHooks["Husky\nPre-push Hook"]
    end

    %% Connections: Users → Frontend
    Browser --> Vercel
    Mobile --> Vercel
    Desktop --> Vercel
    Vercel --> Frontend

    %% Frontend internal
    Router --> State_Layer --> UI_Components
    AppContent --> Pages

    %% Frontend → Appwrite
    ReactQuery --> Database
    AuthHook --> Auth
    CustomHooks --> Storage
    UI_Components --> Realtime

    %% Frontend → Bridge
    Media --> Bridge
    Bridge --> BlenderAddon
    Bridge --> BlenderExt

    %% Appwrite → Functions
    Functions --> CoreFuncs
    Functions --> MediaFuncs
    Functions --> AIFuncs
    Functions --> StageFuncs
    Functions --> UtilFuncs

    %% Functions → Shared
    CoreFuncs --> Shared
    MediaFuncs --> Shared
    AIFuncs --> Shared
    StageFuncs --> Shared
    UtilFuncs --> Shared

    %% Functions → Appwrite Services
    CoreFuncs --> Database
    MediaFuncs --> Storage
    FJobs --> Database
    FReadModel --> Database
    FAI --> Database
    FSync --> Database

    %% AI Functions → External
    FAI --> OpenAI
    FAI --> Anthropic
    FAI --> OtherAI
    FImage --> OpenAI
    FAudio --> OpenAI

    %% Functions ↔ Functions
    FJobs -.->|"triggers"| FAI
    FAI -.->|"status update"| FJobs
    FReadModel -.->|"aggregiert"| Database
    FSync -.->|"sync"| Database
    FMCP -.->|"kontext"| FAI
    FMCP -.->|"kontext"| Database

    %% DevOps
    Scripts --> Docker
    Scripts --> shimwrappercheck
    GitHooks --> Shim
    Shim --> Frontend
    Shim --> Functions

    %% Styling
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff
    classDef backend fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    classDef shared fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    classDef external fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
    classDef infra fill:#64748b,stroke:#475569,stroke-width:2px,color:#fff
    classDef user fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff
    classDef bridge fill:#06b6d4,stroke:#0891b2,stroke-width:2px,color:#fff
    classDef appwrite fill:#fd366e,stroke:#e11d48,stroke-width:2px,color:#fff
    classDef ai fill:#a855f7,stroke:#9333ea,stroke-width:2px,color:#fff

    class Browser,Mobile,Desktop user
    class Vercel infra
    class UI_Components,State_Layer,Router,AppContent,Pages,Layout,Editors,Dialogs,Media,ReactQuery,AuthHook,CustomHooks frontend
    class Bridge,BridgeLayer,BlenderAddon,BlenderExt bridge
    class CoreFuncs,MediaFuncs,AIFuncs,StageFuncs,UtilFuncs,FAuth,FProjects,FNodes,FChars,FBeats,FShots,FClips,FImage,FAudio,FAudioStory,FVideo,FAssets,FAI,FAssistant,FJobs,FMCP,FStage,FStage2D,FStage3D,FWorld,FStyle,FStyleGuide,FSync,FGym,FScript,FSAdmin,FLogs,FStats,FReadModel backend
    class Shared,SharedEnv,SharedZod,SharedAI,SharedDB,SharedUtils shared
    class OpenAI,Anthropic,OtherAI,ai
    class Auth,Database,Storage,Realtime,Functions appwrite
    class Docker,Shim,Scripts,GitHooks infra
```

---

## Detail-Diagramm: Datenfluss Frontend ↔ Backend

```mermaid
---
config:
  theme: dark
  flowchart:
    curve: basis
---

sequenceDiagram
    autonumber
    actor User as Benutzer
    participant FE as React Frontend
    participant RQ as React Query
    participant AW as Appwrite SDK
    participant Auth as Appwrite Auth
    participant DB as Appwrite Database
    participant Fn as Appwrite Functions
    participant Job as scriptony-jobs
    participant AI as scriptony-ai
    participant Ext as Externer AI-Provider

    User->>FE: Login / Register
    FE->>AW: account.createEmailPasswordSession()
    AW->>Auth: Auth-Request
    Auth-->>AW: Session + JWT
    AW-->>FE: Session-Objekt
    FE->>RQ: invalidateQueries()

    User->>FE: Projekt erstellen
    FE->>RQ: mutation (createProject)
    RQ->>AW: databases.createDocument()
    AW->>DB: Write Collection
    DB-->>AW: Document
    AW-->>RQ: Response
    RQ-->>FE: UI Update + Cache-Invalidierung

    User->>FE: Beat generieren (AI)
    FE->>Fn: POST /scriptony-ai/generate
    Fn->>Job: createJob()
    Job->>DB: Job-Dokument in DB
    Job-->>Fn: Job-ID
    Fn-->>FE: Job-ID (Polling-Response)

    loop Job-Polling
        FE->>RQ: useQuery(getJobStatus)
        RQ->>AW: databases.getDocument(Job-ID)
        AW->>DB: Read Job
        DB-->>AW: Job Status
        AW-->>RQ: Status (pending|running|completed|failed)
    end

    Job->>AI: processJob()
    AI->>Ext: OpenAI / Claude API Call
    Ext-->>AI: LLM Response / Error
    AI->>DB: Update Job (Result/Error)
    AI-->>Job: Done

    RQ-->>FE: Job completed → UI-Aktualisierung
    FE->>User: Beat-Ergebnis anzeigen

    User->>FE: Audio hochladen
    FE->>AW: storage.createFile()
    AW->>DB: Bucket Write
    DB-->>AW: File-ID
    AW-->>FE: File-Response
    FE->>RQ: Refetch Audio-Liste
```

---

## Detail-Diagramm: AI-Pipeline

```mermaid
---
config:
  theme: dark
  flowchart:
    curve: basis
---

flowchart LR
    subgraph UserReq["Benutzer-Anfrage"]
        Prompt["Prompt / Chat-Nachricht"]
        Context["Kontext:\nProjekt · Charaktere · Beats · Stil"]
    end

    subgraph MCP["Model Context Protocol Layer"]
        FMCP["scriptony-mcp-appwrite"]
        Tools["MCP Tools\nread_document · query_database · search_files"]
    end

    subgraph AI_Engine["AI Engine"]
        FAI["scriptony-ai"]
        Routing["Provider-Routing\n(OpenAI · Claude · Gemini)"]
        Discovery["Model Discovery\n(Fähigkeiten + Preise)"]
        Templates["Prompt-Templates\n(Feature-spezifisch)"]
    end

    subgraph Generation["Generation Services"]
        FGPT["Text-Generation\n(Beats · Dialogue · Summary)"]
        FIMG["Image-Generation\n(scriptony-image)"]
        FAudioS["Audio-Generation / TTS\n(scriptony-audio)"]
        FStory["Story-Audio\n(scriptony-audio-story)"]
    end

    subgraph Jobs["Job Orchestration"]
        FJobs["scriptony-jobs"]
        Queue["Job-Queue\n(Appwrite DB)"]
        Poll["Polling / WebHook"]
    end

    Prompt --> FMCP
    Context --> FMCP
    FMCP --> Tools
    Tools --> Database[(Appwrite DB)]

    FMCP --> FAI
    FAI --> Routing
    Routing --> Discovery
    Discovery --> Templates

    FAI --> FGPT
    FAI --> FIMG
    FAI --> FAudioS
    FAI --> FStory

    FGPT --> FJobs
    FIMG --> FJobs
    FAudioS --> FJobs
    FStory --> FJobs

    FJobs --> Queue
    Queue --> Poll
    Poll --> Frontend["Frontend\n(React Query)"]

    Routing --> OpenAI["OpenAI API"]
    Routing --> Claude["Anthropic Claude"]
    Routing --> Gemini["Google Gemini"]
    Routing --> Local["Local LLM\n(Ollama)"]
```

---

## Detail-Diagramm: Blender / DCC Integration

```mermaid
---
config:
  theme: dark
  flowchart:
    curve: basis
---

flowchart TB
    subgraph Scriptony_FE["Scriptony Frontend"]
        Editor["Shot-Editor / Stage-3D"]
        ExportBtn["Export zu Blender"]
        ImportBtn["Aus Blender importieren"]
    end

    subgraph Bridge["Local Bridge"]
        BridgePy["Python HTTP Bridge\n(local-bridge)"]
        WSS["WebSocket / HTTP Server\nPort 9877"]
    end

    subgraph Blender["Blender 3.x / 4.x"]
        Addon["scriptony_blender_addon\n(Python Addon)"]
        Ext["scriptony_blender_extension\n(Blender Extension Format)"]
        Panel["Scriptony Panel\n(Blender UI)"]
        Importer["Shot-Importer\n(Cameras · Lights · Meshes)"]
        Exporter["Shot-Exporter\n(Render · Animation)"]
        Stage3D["3D Stage View\n(Realtime Preview)"]
    end

    subgraph Files["File Exchange"]
        GLB[".glb / .gltf"]
        FBX[".fbx"]
        USD[".usd / .usdc"]
        JSON[".json (Metadata)"]
    end

    Editor --> ExportBtn
    ExportBtn --> BridgePy
    ImportBtn --> BridgePy
    BridgePy --> WSS
    WSS --> Addon
    WSS --> Ext

    Addon --> Panel
    Ext --> Panel
    Panel --> Importer
    Panel --> Exporter
    Panel --> Stage3D

    Importer --> GLB
    Importer --> FBX
    Importer --> USD
    Importer --> JSON
    Exporter --> GLB
    Exporter --> FBX
    Exporter --> USD
    Exporter --> JSON

    GLB --> Scriptony_FE
    FBX --> Scriptony_FE
    USD --> Scriptony_FE
    JSON --> Scriptony_FE

    Stage3D --> WSS
```

---

## Legend: Farbcodierung

| Farbe | Bedeutung |
|-------|-----------|
| 🔴 Rot | Benutzer / Geräte |
| 🔵 Blau | Frontend (React) |
| 🩵 Cyan | Lokale Bridge / DCC-Tools |
| 💗 Pink | Appwrite Platform-Dienste |
| 🟢 Grün | Backend Functions |
| 🟠 Orange | Shared Library (_shared) |
| 🟣 Violett | Externe AI-Provider |
| Grau | DevOps / Tooling |

---

*Diagramm erstellt am: 2026-04-27*
*Projekt: scriptony-appwrite*
