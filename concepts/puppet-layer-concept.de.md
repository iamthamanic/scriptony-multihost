# Puppet Layer Konzept (Scriptony) — Deutsch

## Dokumentstatus

- **Typ:** Zielarchitektur + Ist-Analyse + Integrationskonzept
- **Version:** v1.0 (Konzept)
- **Audience:** Product + Engineering + Stakeholder
- **Normativität:** Zielbild ist verbindlich; Ist-Stand wird explizit getrennt ausgewiesen
- **Reifegrad-Markierung:** Pro Bereich mit `implemented`, `partial`, `planned`

---

## 1) Vision

Das Puppet-Layer-System in Scriptony ist **keine einzelne Function**, sondern die **kanonische Kontroll- und Orchestrierungsschicht** über mehrere Ausführungs-Engines (ComfyUI, Blender, externe Provider).

### Kernidee

Scriptony soll nicht nur Bilder/Videos generieren, sondern den gesamten Generierungsprozess produktionsreif steuern:

- **fachlich kontrolliert** (welches Zielbild in welchem Kontext),
- **technisch reproduzierbar** (welche konkreten Parameter/Assets/Modelle),
- **produktorientiert entscheidbar** (exploratory vs official),
- **langfristig konsistent** über Charaktere, Shots und Sequenzen.

### Produktziel

Nicht „AI Output um jeden Preis", sondern:

1. kreative Kontrolle,
2. Charakter-/Shot-Konsistenz,
3. reproduzierbare Ergebnisse,
4. klare Abnahme-Logik (accept/reject),
5. nachvollziehbare Freshness-Signale.

---

## 2) Begriffe

- **Puppet Layer:** Domänenübergreifende Kontrollschicht für Render-Entscheidungen, Job-Lifecycle und Ergebnisakzeptanz.
- **Executor Engine:** Technischer Ausführer (ComfyUI, Blender, externer Provider).
- **RenderConfig:** Kanonischer, versionierter Render-Contract pro Job (inkl. Controls-Snapshot).
- **Exploratory Render:** Iterativer/prototypischer Render.
- **Official Render:** Vom User akzeptierter, gültiger Produktionsstand.
- **Freshness/Stale:** Signal, ob akzeptierte Ergebnisse durch spätere Änderungen potenziell veraltet sind.
- **Capability:** Verfügbare technische Fähigkeiten eines Executors (Nodes/Modelle/Workflows).

---

## 3) Was es sein soll vs. was heute existiert

## 3.1 Sollzustand (Target)

Das Puppet-Layer-System muss:

1. `renderConfig` als primären Contract verwenden (nicht `repairConfig` aufblasen).
2. Kontrollmethoden als Domänenmodell führen:
   - ControlNet (mind. Canny, Depth, Pose),
   - IP-Adapter (mind. Style/Reference),
   - LoRA (über Registry/Asset-Referenz),
   - optional später: Regional Prompting, Prompt Scheduling, Motion Controls.
3. Engine-neutral orchestrieren:
   - Stage/Style entscheiden fachlich,
   - Bridge übersetzt technisch,
   - Executor führt aus.
4. accepted renders reproduzierbar machen:
   - RenderConfig-Snapshot + RenderLineage + Output-Referenzen.
5. Capability-Checks vor Ausführung erzwingen.

## 3.2 Istzustand in Scriptony (heute)

### Orchestrierung / Lifecycle
- **Status:** `implemented`
- **Wo:** `functions/scriptony-stage`, `functions/scriptony-jobs`, `functions/scriptony-media-worker`, `local-bridge`
- **Leistung:** Job erstellen, ausführen, complete/fail, accept/reject, stale/fresh-Mechanik vorhanden.

### Generative Kontrolle
- **Status:** `partial`
- **Vorhanden:** Prompt/Negative Prompt, Seed, CFG, Steps, Sampler, Resolution, img2img denoise, inpaint mask.
- **Fehlt:** ControlNet/IP-Adapter/LoRA als kanonisches, validiertes Fachmodell.

### Trennung Product vs Technik
- **Status:** `implemented` (Grundstruktur)
- **Gap:** Capability-Vertrag + renderConfig-v1 als verbindlicher Standard fehlen noch.

### Blender-Einbindung
- **Status:** `partial`
- **Einordnung:** Blender ist primär Guide Producer und sekundär Executor. Beide Rollen folgen derselben Shot-/Job-/Freshness-Semantik, aber mit unterschiedlichen technischen Capabilities.

---

## 4) Architektur

## 4.1 Schichtenmodell

1. **UI/Product Layer**
   - User-Intent, kreative Steuerung, Controls.
2. **Domain Orchestration Layer**
   - `scriptony-stage`, `scriptony-style`, `scriptony-style-guide`.
3. **Job Control Plane**
   - `scriptony-jobs`, `scriptony-media-worker`.
4. **Execution Adapter Layer**
   - `local-bridge` (ComfyUI), zukünftiger Blender-Adapter.
5. **Execution Engines**
   - ComfyUI / Blender / externe Provider.
6. **Asset/Storage Layer**
   - `scriptony-assets` + `scriptony-storage`.

## 4.2 Verantwortlichkeiten (strict boundaries)

### Stage/Style (fachlich)
- definiert kreatives Ziel,
- validiert RenderConfig,
- erzeugt Job + Snapshot,
- entscheidet exploratory vs official.

### Bridge (technisch)
- löst Inputs/Assets auf,
- mappt RenderConfig zu Engine-Inputs,
- führt aus und meldet zurück,
- trifft **keine** kreativen Produktentscheidungen.

### Executor
- rendert nur,
- besitzt keine Produktsemantik.

## 4.3 Zentrale Architekturentscheidung (verbindlich)

- Scriptony bindet ComfyUI **nicht** als vollständiges, frei konfigurierbares UI-Passthrough an.
- Scriptony produktisiert gezielt einzelne Control-Bausteine mit klaren Contracts, Capability-Checks und UI-Gating.
- ComfyUI/Bridge bleiben technische Executor; Produktlogik bleibt in Stage/Style/Jobs.

## 4.4 Domänenkette (Product View)

`Project -> StyleGuide -> Characters -> CharacterAnchors -> Sequences -> Shots -> GuideBundles -> RenderJobs -> AcceptedRenders`

---

## 5) Datenmodell: RenderConfig v1 (Pflicht)

> Ziel: `renderConfig` als kanonischer Contract; `repairConfig` nur Legacy/Kompatibilität.

```ts
type ControlSource =
  | { kind: "file"; fileId: string }
  | { kind: "guideBundleAsset"; guideBundleId: string; asset: "depth" | "normal" | "lineart" | "preview" | "segmentation" }
  | { kind: "guideBundleMask"; guideBundleId: string; maskId: string }
  | { kind: "stage2dLayer"; layerId: string };

type RenderConfigV1 = {
  version: 1;
  mode: "txt2img" | "img2img" | "inpaint" | "video";

  base: {
    checkpoint?: string;
    positivePrompt: string;
    negativePrompt?: string;
    seed?: number;
    sampler?: string;
    scheduler?: string;
    steps: number;
    cfg: number;
    width: number;
    height: number;
    denoise?: number;
  };

  inputs?: {
    sourceImageFileId?: string;
    maskImageFileId?: string;
    guideBundleId?: string;
    styleProfileId?: string;
    referenceImageFileIds?: string[];
  };

  controls?: {
    controlNets?: Array<{
      id: string;
      kind:
        | "canny"
        | "depth"
        | "openpose"
        | "lineart"
        | "softedge"
        | "scribble"
        | "segmentation"
        | "normal"
        | "tile"
        | "mlsd";
      source: ControlSource;
      preprocessor?: string;
      model?: string;
      weight: number;
      startPercent: number;
      endPercent: number;
      enabled: boolean;
    }>;

    ipAdapters?: Array<{
      id: string;
      kind: "style" | "composition" | "face" | "reference";
      source: ControlSource;
      model?: string;
      weight: number;
      startPercent?: number;
      endPercent?: number;
      enabled: boolean;
    }>;

    loras?: Array<{
      id: string;
      name: string;
      fileId: string;
      trigger?: string;
      strengthModel: number;
      strengthClip: number;
      enabled: boolean;
    }>;
  };

  engineHints?: {
    preferredEngine?: "comfyui" | "blender" | "provider";
    requiredCapabilities?: string[];
  };
};
```

### Pflichtregeln

- Jeder accepted render referenziert RenderConfig-Snapshot + RenderLineage + Outputs.
- Keine unvalidierte Freitext-JSON für Controls.
- LoRA nur via Registry/Storage-Referenz.

---

## 6) Capability-Modell (Pflicht, job-spezifischer Preflight)

Ein Job ist nur ausführbar, wenn **alle** folgenden Bedingungen erfüllt sind:

1. passendes Workflow-Template (Version + Hash) vorhanden,
2. erforderliche Nodes vorhanden,
3. erforderliche Modelle verfügbar/kompatibel,
4. erforderliche Preprocessor vorhanden,
5. referenzierte Assets auflösbar und zugriffsberechtigt,
6. Engine online und Limits ausreichend (Auflösung/Batch/VRAM).

Wenn eine Bedingung fehlschlägt:
- UI muss blockieren und den Grund erklären,
- Job bleibt `failed` mit passendem Failure Code,
- kein blindes Starten in `executing`.

---

## 7) Integration in Scriptony (heute + künftig)

## 7.1 Bereits integriert

- `functions/scriptony-stage` — Render-Job-Orchestrierung.
- `functions/scriptony-stage2d`, `functions/scriptony-stage3d` — Puppet-Layer APIs.
- `local-bridge/src/workflow-resolver.ts` — Workflow-Template-Auflösung.
- `local-bridge/src/input-resolver.ts` — Input-Dateien lösen/laden.
- `local-bridge/src/render-job-handler.ts` — Job-Ausführung.
- `functions/scriptony-style-guide` / Style-Profile-Logik.
- Accept/Reject/Freshness in der Pipeline.

## 7.2 Noch zu integrieren

- renderConfig v1 als verbindliches Feld.
- Controls-Domain (ControlNet/IPAdapter/LoRA).
- Capability Endpoint + UI-Gating.
- Blender als Guide Producer plus optionaler Executor unter gemeinsamer Semantik.

---

## 8) User Flows (detailliert)

## 8.1 End-to-End Flow: Filmprojekt -> Charakter -> Shots -> Video

### Schritt 1: Projekt erstellen (Film)

1. User erstellt Projekt (Typ Film).
2. User definiert Style Guide (Mood, visuelle Referenzen, gewünschte Ästhetik).
3. System erstellt initiale Style-Basis für Render.

**LoRA-/Styleguide-Relevanz:**
- Style Guide liefert kreative Baseline.
- LoRA wird als registriertes Asset angeboten (nicht freie Dateiangabe).

### Schritt 2: Charakter erstellen in mehreren Posen

#### A) Text-to-Image
1. User gibt Charakterbeschreibung ein.
2. Wählt Exploratory Render.
3. Einstellbar: Prompt, Seed, CFG, Steps, optional Controls.
4. Varianten erscheinen.
5. User akzeptiert eine Variante als Official Character Anchor.

#### B) Image-to-Image
1. User lädt Referenzbild des Charakters.
2. Setzt Denoise + gewünschte Pose/Variation.
3. Rendert Varianten und akzeptiert bestes Ergebnis.

### Schritt 3: Shot erstellen aus mehreren Winkeln

1. User erstellt Shot A, B, C mit unterschiedlichen Kamerawinkeln.
2. Pro Shot wird RenderConfig gespeichert.
3. Für Konsistenz: wiederverwendete Referenzen/Controls.
4. User akzeptiert pro Shot official Ergebnis.

### Schritt 4: Video aus Shot/Charakter

Optionen je nach Pipeline:
- text-to-video,
- image-to-video,
- controlled render + Video-Executor.

Aktuell sind externe Video-Provider für viele Fälle aktiv; lokale ComfyUI-Video-Control ist noch nicht vollständig integriert.

### Schritt 5: Mehrere Shots mit gleichem Charakter

1. User erstellt Sequenz mit wiederkehrendem Charakter.
2. System nutzt Anchor + Controls-Snapshot je Job.
3. Freshness signalisiert, falls spätere Änderungen Official-Renders veralten.

---

## 8.2 Teilflows (heute nutzbar vs geplant)

### Heute nutzbar
- Prompt-basierte Varianten,
- img2img/inpaint,
- style text constraints,
- official/exploratory Decision.

### Geplant
- echte Pose/Depth/Edge Controls,
- IP-Adapter style/identity consistency,
- LoRA Registry,
- region-aware controls,
- robuste Video-Control.

---

## 9) Vergleich: Was unterscheidet sich von anderen Ansätzen?

## 9.1 Gegenüber Higgsfield/Kling/Sora/Veo/LTX

### Externe Provider
- + starke Modelle, schnelle Ergebnisse
- - weniger tiefe Pipeline-Kontrolle
- - geringere Nachvollziehbarkeit intern

### Puppet Layer Ansatz
- + produktnahe Steuerung und Governance
- + reproduzierbare Snapshots
- + engine-unabhängige Orchestrierung

## 9.2 Gegenüber ComfyUI allein

ComfyUI allein ist ein Workflow-Executor. 
Puppet Layer + ComfyUI ist ein produktionsfähiges Steuerungssystem.

## 9.3 Gegenüber Blender allein

Blender allein ist stark für räumliche Korrektheit/Animation, aber kein kompletter GenAI-Orchestrator. 
Im Puppet Layer ist Blender primär Guide Producer und optional Executor unter derselben Semantik.

---

## 10) Determinismus: Realität und Ziel

- **Absolute 100%-Deterministik:** nicht realistisch bei GenAI.
- **Produktdeterminismus:** realistisch durch
  - festen RenderConfig-Snapshot,
  - registrierte Modell-/Asset-Versionen,
  - Capability-Checks,
  - kontrollierte Executor-Auswahl.

---

## 11) Ticket-/Roadmap-Einordnung

Empfohlene Reihenfolge:

1. Ticket 12: Frontend Official Semantics (Accept/Reject/Freshness)
2. Ticket 13: RenderConfig v1 + ControlSource + Validation
3. Ticket 14: GuideBundle v2 + Blender Guide Producer
4. Ticket 15: Controlled Image Rendering (Depth + Lineart + Mask)
5. Ticket 16: Capability Preflight + UI Gating
6. Ticket 17: RenderLineage v1
7. Ticket 18: IP-Adapter (Reference/Style)
8. Ticket 19: ModelAssetRegistry + LoRA
9. Ticket 20+: Regional Controls / Prompt Scheduling / Video Controls

---

## 12) Risiken und Gegenmaßnahmen

- **Risk:** repairConfig wird Müllcontainer
  - **Mitigation:** renderConfig v1 als Pflichtcontract.
- **Risk:** Bridge trifft Produktentscheidungen
  - **Mitigation:** klare Domain/Tech-Grenze erzwingen.
- **Risk:** Jobs laufen auf fehlenden Capabilities
  - **Mitigation:** Capability-Preflight.
- **Risk:** accepted results nicht reproduzierbar
  - **Mitigation:** RenderConfig-Snapshot + RenderLineage + Output-Referenzen.

---

## 13) Definition of Done (Puppet Layer v1)

Puppet Layer v1 ist erreicht, wenn:

- renderConfig v1 produktiv in Stage-Jobs genutzt wird,
- GuideBundle v2 minimal aktiv ist (preview + depth + lineart + mask),
- controlled-image mit Depth + Lineart + Mask ausführbar ist,
- Capability-Preflight + UI-Gating aktiv sind,
- accepted renders über RenderConfig-Snapshot + RenderLineage reproduzierbar sind.

Ausbaustufen:
- **v1.1:** IP-Adapter (Reference/Style).
- **v2:** ModelAssetRegistry + LoRA + Character Anchors + Regional/Video Controls.

---

## 14) Fazit

Das Puppet-Layer-System ist in Scriptony die **Regie- und Kontrollinstanz**. 
ComfyUI, Blender und externe Provider sind Ausführungsarme. 
Der entscheidende Wert entsteht durch Contract-Disziplin, klare Verantwortlichkeiten, reproduzierbare Entscheidungen und konsistente User-Semantik.

---

## 15) Erklärung für Laien: Was bedeutet das für mich als User?

Dieser Abschnitt erklärt das System ohne Entwickler-Sprache.

### 15.1 Kurz gesagt

Das Puppet-Layer-System ist wie **Regie + Produktionsleitung** für KI-Bilder und KI-Videos in Scriptony.

- Es sorgt dafür, dass du nicht nur „zufällige KI-Bilder" bekommst,
- sondern einen kontrollierbaren Produktionsprozess.

### 15.2 Was bringt mir das konkret?

Ohne Puppet-Layer:
- Viele Prompts, viel Zufall, wenig Reproduzierbarkeit.

Mit Puppet-Layer:
- Du testest Varianten (exploratory),
- setzt eine Version als offiziell (official),
- und das System merkt sich, wie dieses Ergebnis erzeugt wurde.

### 15.3 Was ist heute schon verfügbar?

Du kannst heute bereits:
- Prompt/Negative Prompt steuern,
- Seed/CFG/Steps/Sampler setzen,
- img2img + inpaint nutzen,
- Ergebnisse akzeptieren/ablehnen,
- mit Freshness sehen, ob etwas veraltet ist.

### 15.4 Was fehlt noch?

Aktuell fehlen zentrale High-Control-Methoden wie:
- ControlNet,
- IP-Adapter,
- LoRA-Integration als Pflichtpfad,
- Regional Prompting,
- tiefe lokale Video-Control.

### 15.5 Wie sieht das im Alltag aus?

Ein normaler User-Flow:

1. Projekt anlegen (Film) und Stil definieren.
2. Charaktervarianten generieren und einen Anchor akzeptieren.
3. Shots aus mehreren Winkeln erzeugen.
4. Beste Varianten offiziell setzen.
5. Video aus Shot-Material ableiten.
6. Bei späteren Änderungen über Freshness prüfen, was neu gerendert werden muss.

### 15.6 Warum ComfyUI + Blender + externe Provider zusammen Sinn ergeben

- ComfyUI: flexible GenAI-Workflows.
- Blender: räumliche/animatorische Kontrolle.
- Externe Provider: starke Spezialfälle.

Das Puppet-Layer-System macht daraus **einen einheitlichen, verständlichen Prozess**.

### 15.7 Erwartungsmanagement

Absolute Kontrolle über GenAI ist nicht realistisch. 
Aber hohe, produktionsfähige Kontrolle und Reproduzierbarkeit sind realistisch — genau dafür ist das Puppet-Layer-System da.

---

## 16) Blender-Rollenmodell (verbindlich)

Blender hat im Puppet-Layer-System zwei klar getrennte Rollen:

### Rolle A: Guide Producer
Blender erzeugt deterministische Guide-Assets:
- Depth Pass
- Normal Pass
- Lineart/Freestyle
- Object-/Material-/Custom-Masken
- Viewport/Preview
- Kamera-/Framing-Metadaten
- optional Pose-/Rig-Daten

Diese Daten werden als `GuideBundle` gespeichert und später von generativen Render-Engines genutzt.

### Rolle B: Executor
Blender kann zusätzlich selbst Render-Artefakte erzeugen:
- technische 3D-/Layout-Render
- Viewport/Clay Preview
- GLB/Animation/Camera-Path Outputs

Beide Rollen nutzen dieselbe Shot-/Job-/Freshness-Semantik, sind aber technisch unterschiedliche Ausführungsarten.

---

## 17) GuideBundle v2 (verbindliches Kernmodell)

```ts
type GuideBundleV2 = {
  version: 2;
  shotId: string;
  revision: number;

  source: {
    engine: "blender";
    sceneFileId?: string;
    blenderVersion?: string;
    addonVersion?: string;
  };

  camera: {
    name?: string;
    frame?: number;
    width: number;
    height: number;
    lensMm?: number;
    transform?: number[];
  };

  assets: {
    previewFileId?: string;
    depthFileId?: string;
    normalFileId?: string;
    lineartFileId?: string;
    clayFileId?: string;
    segmentationFileId?: string;
    poseFileId?: string;
    masks?: Array<{
      id: string;
      name: string;
      kind: "object" | "material" | "collection" | "custom";
      fileId: string;
      objectIds?: string[];
    }>;
  };

  metadata?: {
    frameRange?: { start: number; end: number };
    objects?: Array<{
      id: string;
      name: string;
      type: "character" | "prop" | "environment" | "camera" | "light" | "other";
    }>;
  };
};
```

---

## 18) RenderLineage v1 (Pflicht für Reproduzierbarkeit)

```ts
type RenderLineageV1 = {
  renderJobId: string;
  renderConfigSnapshot: RenderConfigV1;

  executor: {
    engine: "comfyui" | "blender" | "provider";
    bridgeVersion?: string;
    comfyuiVersion?: string;
    blenderVersion?: string;
    providerName?: string;
    providerModel?: string;
  };

  workflow?: {
    templateId: string;
    templateVersion: string;
    templateHash: string;
    resolvedWorkflowHash: string;
  };

  models?: Array<{
    kind: "checkpoint" | "controlnet" | "ipadapter" | "lora" | "vae" | "embedding";
    name: string;
    fileId?: string;
    hash?: string;
    version?: string;
  }>;

  inputs: Array<{ role: string; fileId: string; hash?: string }>;
  outputs: Array<{ role: "image" | "video" | "preview" | "metadata"; fileId: string; hash?: string }>;

  capabilitySnapshot?: unknown;
  createdAt: string;
};
```

**Accepted Render = Output + RenderConfig Snapshot + RenderLineage.**

---

## 19) ModelAssetRegistry (Pflicht)

```ts
type ModelAssetRegistryEntry = {
  id: string;
  kind: "checkpoint" | "lora" | "controlnet" | "ipadapter" | "vae" | "embedding";
  name: string;
  fileId?: string;
  hash?: string;

  compatibility: {
    baseModel: "sd15" | "sdxl" | "flux" | "other";
    requiredNodes?: string[];
  };

  defaults?: {
    trigger?: string;
    strengthModel?: number;
    strengthClip?: number;
    weight?: number;
  };

  ownership: {
    orgId: string;
    projectId?: string;
    visibility: "private" | "project" | "org" | "global";
  };

  status: "available" | "missing" | "deprecated" | "disabled";
};
```

### Character Anchor (Minimalmodell)

```ts
type CharacterAnchorV1 = {
  id: string;
  projectId: string;
  characterId: string;
  revision: number;
  acceptedRenderJobId: string;
  referenceImageFileId: string;
  renderConfigSnapshot: RenderConfigV1;
  renderLineageId?: string;
  status: "official" | "stale" | "deprecated";
};
```

---

## 20) ControlSource-Abstraktion (statt nur fileId)

```ts
type ControlSource =
  | { kind: "file"; fileId: string }
  | { kind: "guideBundleAsset"; guideBundleId: string; asset: "depth" | "normal" | "lineart" | "preview" | "segmentation" }
  | { kind: "guideBundleMask"; guideBundleId: string; maskId: string }
  | { kind: "stage2dLayer"; layerId: string };
```

Control-Konfigurationen referenzieren `source: ControlSource`, nicht nur rohe File-IDs.

---

## 21) Capability Preflight (job-spezifisch)

Preflight muss vor Ausführung prüfen:
- Workflow vorhanden + Version/Hash passend
- benötigte Nodes vorhanden
- benötigte Modelle lokal/verfügbar
- erforderliche Preprocessor vorhanden
- Asset-Zugriff erlaubt
- Engine online + Limits ausreichend (Auflösung/Batch/VRAM)

Nur bei bestandenem Preflight darf ein Job in `executing` übergehen.

---

## 22) Control Fidelity Modell

Engines müssen nach Kontrolltiefe klassifiziert werden:

- **Hard-Control Engine** (z. B. lokale ComfyUI): volle Workflow-/Node-/Model-Kontrolle
- **Structural Engine** (z. B. Blender): deterministische Geometrie/Guides/Passes
- **Soft-Control Provider** (z. B. externe APIs): begrenzte Steuerung, kein voller interner RenderGraph

Das Puppet-Layer-System deklariert pro Engine, welche Semantik tatsächlich erfüllbar ist.

---

## 23) Produktzustände (Pflicht)

```ts
type ProductState = "draft" | "candidate" | "official" | "rejected" | "stale" | "needs_rerender";
```

Wichtig:
- Diese Zustände werden durch Product-/Stage-Semantik gesetzt.
- Technische Worker dürfen keine offiziellen Produktzustände eigenmächtig setzen.

---

## 24) Security / Access Control

Mindestregeln:
- Jeder RenderJob ist an `orgId/projectId/shotId` gebunden.
- Jeder Asset-/Modelzugriff wird gegen Org-/Projektrechte geprüft.
- ModelAssets haben Sichtbarkeit (`private/project/org/global`).
- Local Bridge darf keine Produktentscheidungen setzen.
- Worker dürfen keine geschützten Felder (`acceptedRenderJobId`, `reviewStatus`, Revisionen) manipulieren.
- Externe Provider erhalten nur explizit freigegebene Assets.
- Provider-Execution ist pro Asset/Projekt/Org explizit freizugeben (`providerExecutionAllowed`).
- Secrets/API-Keys werden nie in RenderConfig-Snapshots gespeichert.

---

## 25) Failure Codes (Pflicht)

```ts
type RenderJobFailureCode =
  | "capability_missing"
  | "asset_missing"
  | "model_missing"
  | "workflow_invalid"
  | "executor_offline"
  | "render_timeout"
  | "provider_failed"
  | "callback_failed"
  | "output_upload_failed"
  | "stale_during_render"
  | "unknown";
```

UI und Observability müssen FailureCode + verständliche Fehlermeldung anzeigen.

---

## 26) Freshness-Erweiterung

Freshness basiert auf Snapshot-Vergleich, nicht nur Shot-Revision:

- verwendete GuideBundleRevision vs aktuelle GuideBundleRevision
- verwendete StyleProfileRevision vs aktuelle StyleProfileRevision
- verwendete CharacterAnchorRevision vs aktuelle CharacterAnchorRevision
- verwendete RenderConfigVersion vs aktuell unterstützte Version
- verwendete ModelAsset-Version vs aktuelle/aktive Version

Freshness ist ein Signal; die Produktentscheidung bleibt beim User.

---

## 27) Versionierungs-Matrix

Versioniert werden müssen:
- RenderConfig
- GuideBundle
- Workflow Template
- StyleProfile Revision
- CharacterAnchor Revision
- ModelAsset Version/Hash
- Bridge Version
- Blender Addon Version
- Capability Schema Version

---

## 28) Realistische Definition of Done für Puppet Layer v1

Puppet Layer v1 ist erreicht, wenn:

- Ticket 12 abgeschlossen ist (offizielle Semantik/Freshness/Accept-Reject),
- RenderConfig v1 produktiv in RenderJobs genutzt wird,
- RenderLineage v1 für accepted renders vorhanden ist,
- GuideBundle v2 minimal unterstützt ist (preview + depth + lineart + mask),
- ein controlled-image Pfad mit mindestens Depth + Lineart ausführbar ist,
- Capability Preflight für controlled-image aktiv ist,
- UI Controls darstellt und bei fehlender Capability sauber blockiert.

Hinweis:
IP-Adapter und LoRA können als v1.1/v2 folgen.

---

## 29) Entscheidungsregel: ComfyUI-Anbindung vs. Produkt-Bausteine (konsolidiert in Abschnitt 4.3)

Dieser Grundsatz ist in Abschnitt 4.3 normativ definiert und gilt für alle Control-Erweiterungen.

---

## 30) Zulassungskriterien für neue Control-Typen (DoD-Checklist)

Ein neuer Control-Typ (z. B. Depth-ControlNet, IP-Adapter Reference, LoRA Character) darf erst produktiv freigegeben werden, wenn alle Punkte erfüllt sind:

1. **Schema**
   - Control ist in `RenderConfig` versioniert modelliert (kein ad-hoc JSON).
2. **Validation**
   - Zod/Backend-Validierung deckt Pflichtfelder, Wertebereiche, Konflikte und Defaults ab.
3. **Capability**
   - Job-spezifischer Capability-Preflight prüft Nodes/Modelle/Workflow/Preprocessor/Limits.
4. **Asset-Resolution**
   - Inputs sind über `ControlSource` auflösbar und Zugriff ist autorisiert.
5. **Workflow-Template**
   - Deterministisches Template mit Version + Hash ist vorhanden.
6. **Lineage**
   - `RenderLineage` enthält Snapshot von Config/Workflow/Modellen/Inputs/Outputs.
7. **UX**
   - UI zeigt den Control verständlich, inkl. Guardrails und klarer Fehlermeldungen.
8. **Failure Handling**
   - Fehlercodes sind definiert und in UI/Observability sichtbar.
9. **Freshness**
   - Änderungsabhängigkeiten des Controls fließen in Freshness ein.
10. **Tests**
   - Mindestens Contract- + Integration-Tests für happy path und capability-missing.

Wenn ein Punkt fehlt, bleibt der Control-Typ im Status `planned` oder `partial`, aber nicht `implemented`.
