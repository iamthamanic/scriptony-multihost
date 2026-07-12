# Puppet Layer Concept (Scriptony) — English

## Document Status

- **Type:** target architecture + as-is analysis + integration concept
- **Version:** v1.0 (concept)
- **Audience:** Product + Engineering + Stakeholders
- **Normativity:** target-state is guiding; current-state is explicitly separated
- **Maturity tags:** each area marked as `implemented`, `partial`, or `planned`

---

## 1) Vision

The Puppet Layer in Scriptony is **not a single function**. It is the **canonical control and orchestration layer** across multiple execution engines (ComfyUI, Blender, external providers).

### Core idea

Scriptony should not just generate media, but operate a production-grade controlled pipeline:

- **domain-controlled** (what should be generated and why),
- **technically reproducible** (which exact parameters/assets/models),
- **product-decision-ready** (exploratory vs official),
- **consistent over time** (characters, shots, sequences).

### Product outcome

Not “AI output at any cost,” but:

1. creative control,
2. character/shot consistency,
3. reproducible renders,
4. clear acceptance semantics,
5. explicit freshness/staleness signals.

---

## 2) Terminology

- **Puppet Layer:** cross-domain control layer for render decisions, lifecycle, and acceptance.
- **Executor Engine:** technical renderer (ComfyUI, Blender, external provider).
- **RenderConfig:** canonical, versioned render contract per job (with controls snapshot).
- **Exploratory Render:** iterative/prototyping render.
- **Official Render:** accepted production render.
- **Freshness/Stale:** signal that official output may be outdated after later changes.
- **Capability:** available technical features of an executor (nodes/models/workflows).

---

## 3) Target vs Current State

## 3.1 Target State

The Puppet Layer must:

1. use `renderConfig` as primary contract (do not overload `repairConfig`).
2. model controls explicitly:
   - ControlNet (at least Canny, Depth, Pose),
   - IP-Adapter (at least Style/Reference),
   - LoRA via registry/asset reference,
   - optional later: regional prompts, prompt schedules, motion controls.
3. keep execution engine-neutral:
   - Stage/Style decide domain logic,
   - Bridge translates technically,
   - Executor runs.
4. make accepted renders reproducible:
   - RenderConfig snapshot + RenderLineage + output references.
5. enforce capability checks before execution.

## 3.2 Current State in Scriptony

### Orchestration / Lifecycle
- **Status:** `implemented`
- **Where:** `functions/scriptony-stage`, `functions/scriptony-jobs`, `functions/scriptony-media-worker`, `local-bridge`
- **What works:** create/execute/complete/fail, accept/reject, stale/fresh mechanisms.

### Generative control depth
- **Status:** `partial`
- **Available now:** prompt/negative prompt, seed, cfg, steps, sampler, resolution, img2img denoise, inpaint mask.
- **Missing:** canonical ControlNet/IP-Adapter/LoRA control domain.

### Product-vs-technical separation
- **Status:** `implemented` (foundation)
- **Gap:** capability contract + renderConfig v1 as mandatory standard.

### Blender integration
- **Status:** `partial`
- **Interpretation:** Blender is primarily a Guide Producer and secondarily an Executor. Both roles follow shared shot/job/freshness semantics with different technical capabilities.

---

## 4) Architecture

## 4.1 Layer model

1. **UI/Product Layer**
   - user intent, creative controls.
2. **Domain Orchestration Layer**
   - `scriptony-stage`, `scriptony-style`, `scriptony-style-guide`.
3. **Job Control Plane**
   - `scriptony-jobs`, `scriptony-media-worker`.
4. **Execution Adapter Layer**
   - `local-bridge` (ComfyUI), future Blender adapter.
5. **Execution Engines**
   - ComfyUI / Blender / external providers.
6. **Asset/Storage Layer**
   - `scriptony-assets` + `scriptony-storage`.

## 4.2 Responsibility boundaries

### Stage/Style (domain)
- decide creative intent,
- validate renderConfig,
- create job + snapshot,
- decide exploratory vs official.

### Bridge (technical)
- resolve assets,
- map renderConfig to engine inputs,
- execute and return outputs,
- must **not** make creative product decisions.

### Executor
- compute/render only,
- no product semantics.

## 4.3 Core architectural decision (binding)

- Scriptony does **not** integrate ComfyUI as a full unrestricted UI passthrough.
- Scriptony productizes selected control building blocks with explicit contracts, capability checks, and UI gating.
- ComfyUI/Bridge remain technical executors; product logic stays in Stage/Style/Jobs.

## 4.4 Domain chain (product view)

`Project -> StyleGuide -> Characters -> CharacterAnchors -> Sequences -> Shots -> GuideBundles -> RenderJobs -> AcceptedRenders`

---

## 5) Data Model: RenderConfig v1 (required)

> Goal: `renderConfig` is canonical; `repairConfig` remains legacy/compatibility only.

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

### Required rules

- each accepted render references RenderConfig snapshot + RenderLineage + outputs.
- no unvalidated free-form controls JSON.
- LoRA only via registry/storage references.

---

## 6) Capability Model (required, job-specific preflight)

A job is runnable only if **all** conditions pass:

1. matching workflow template exists (version + hash),
2. required nodes exist,
3. required models are available and compatible,
4. required preprocessors exist,
5. referenced assets are resolvable and authorized,
6. engine is online and limits are sufficient (resolution/batch/VRAM).

If any condition fails:
- UI must block and explain why,
- job stays `failed` with a matching failure code,
- no blind transition into `executing`.

---

## 7) Scriptony integration (current + future)

## 7.1 Already integrated

- `functions/scriptony-stage` — render-job orchestration.
- `functions/scriptony-stage2d`, `functions/scriptony-stage3d` — puppet APIs.
- `local-bridge/src/workflow-resolver.ts` — template resolution.
- `local-bridge/src/input-resolver.ts` — input resolution/upload.
- `local-bridge/src/render-job-handler.ts` — execution pipeline.
- `functions/scriptony-style-guide` / style profile logic.
- Accept/Reject/Freshness mechanisms in pipeline.

## 7.2 Still to integrate

- renderConfig v1 as mandatory field.
- controls domain (ControlNet/IPAdapter/LoRA).
- capability endpoint + UI gating.
- Blender Guide Producer role + optional executor routing under shared semantics.

---

## 8) User Flows (detailed)

## 8.1 End-to-end flow: film project -> character -> shots -> video

### Step 1: Create project (film)

1. User creates a film project.
2. User defines visual direction in Style Guide.
3. System creates initial style defaults.

**LoRA/style-guide relevance:**
- Style Guide defines creative baseline.
- LoRA is selected via registered assets (not arbitrary file strings).

### Step 2: Create character in multiple poses

#### A) Text-to-image
1. User enters character description.
2. Starts exploratory render.
3. Sets prompt/seed/cfg/steps and optional controls.
4. Compares variants.
5. Accepts one as official character anchor.

#### B) Image-to-image
1. User uploads reference character image.
2. Sets denoise + target variation.
3. Runs variants and accepts best output.

### Step 3: Create shots from different angles

1. User creates Shot A/B/C with different camera intent.
2. RenderConfig is stored per shot.
3. Shared controls/references preserve consistency.
4. User accepts official result per shot.

### Step 4: Video generation

Depending on pipeline:
- text-to-video,
- image-to-video,
- controlled render + video executor.

Currently external providers cover many video paths; local ComfyUI video control is not fully integrated.

### Step 5: Multiple shots with same character

1. User reuses character anchors and control assets.
2. Per-shot differences are explicit in renderConfig.
3. Freshness marks outputs potentially outdated after edits.

---

## 8.2 Partial flows (available now vs planned)

### Available now
- prompt-based iteration,
- img2img/inpaint,
- style text constraints,
- official/exploratory decision path.

### Planned
- true pose/depth/edge controls,
- IP-Adapter identity/style controls,
- LoRA registry,
- region-aware controls,
- stronger local video control.

---

## 9) Comparison: how this differs from alternatives

## 9.1 Versus Higgsfield/Kling/Sora/Veo/LTX

### External providers
- + strong base model outputs
- + quick setup
- - less pipeline transparency
- - weaker low-level reproducibility/control

### Puppet Layer approach
- + product-level governance
- + reproducible snapshots
- + engine-agnostic orchestration

## 9.2 Versus ComfyUI alone

ComfyUI alone is an execution tool.
Puppet Layer + ComfyUI is a product-grade control system.

## 9.3 Versus Blender alone

Blender alone is strong for spatial/animation consistency, but not a full GenAI orchestration product layer.
In Puppet Layer architecture, Blender is primarily a guide producer and optionally an executor under shared semantics.

---

## 10) Determinism: realistic framing

- **Absolute 100% determinism:** not realistic for GenAI.
- **Production determinism:** realistic via
  - fixed render snapshots,
  - versioned assets/models,
  - capability checks,
  - controlled executor routing.

---

## 11) Ticket/Roadmap alignment

Recommended sequence:

1. Finish Ticket 12 (official semantics UX, accept/reject/freshness)
2. Ticket 13: RenderConfig v1 + ControlSource + validation
3. Ticket 14: GuideBundle v2 + Blender Guide Producer
4. Ticket 15: Controlled image rendering (Depth + Lineart + Mask)
5. Ticket 16: Capability preflight + UI gating
6. Ticket 17: RenderLineage v1
7. Ticket 18: IP-Adapter (Reference/Style)
8. Ticket 19: ModelAssetRegistry + LoRA
9. Ticket 20+: Regional controls / Prompt scheduling / Video controls

---

## 12) Risks and mitigations

- **Risk:** `repairConfig` becomes a catch-all
  - **Mitigation:** mandatory renderConfig v1.
- **Risk:** bridge starts making product decisions
  - **Mitigation:** enforce strict domain/technical boundary.
- **Risk:** jobs created without runnable capabilities
  - **Mitigation:** capability preflight.
- **Risk:** accepted outputs not reproducible
  - **Mitigation:** RenderConfig snapshot + RenderLineage + output references.

---

## 13) Definition of Done (Puppet Layer v1)

Puppet Layer v1 is done when:

- renderConfig v1 is production path in stage jobs,
- GuideBundle v2 minimal set is active (preview + depth + lineart + mask),
- controlled-image with Depth + Lineart + Mask is executable,
- capability preflight + UI gating are active,
- accepted outputs are reproducible via RenderConfig snapshot + RenderLineage.

Phased scope:
- **v1.1:** IP-Adapter (Reference/Style).
- **v2:** ModelAssetRegistry + LoRA + Character Anchors + Regional/Video controls.

---

## 14) Conclusion

The Puppet Layer is Scriptony's **control authority**.
ComfyUI, Blender, and external providers are execution arms.
Long-term value comes from contract discipline, clear responsibilities, reproducibility, and user-facing decision semantics.

---

## 15) Plain-language explanation: what does this mean for users?

### 15.1 Short version

The Puppet Layer is like **director + production control** for AI images/videos in Scriptony.

- It prevents random, non-repeatable AI output workflows.
- It gives users a controlled production process.

### 15.2 Practical user benefit

Without Puppet Layer:
- many random prompt attempts,
- hard to reproduce,
- unclear “final” output.

With Puppet Layer:
- users generate exploratory options,
- mark one as official,
- system stores exactly how it was generated.

### 15.3 What users can already do today

- control prompt/negative prompt,
- control seed/cfg/steps/sampler,
- use img2img + inpaint,
- accept/reject outputs,
- track stale/fresh indicators.

### 15.4 What users cannot fully do yet

- deep ControlNet/IP-Adapter control stacks,
- integrated LoRA registry controls,
- regional prompt control,
- fully local advanced video-control pipeline.

### 15.5 Everyday user journey

1. Create film project and visual style.
2. Generate character variants and pick an official anchor.
3. Build shots from multiple angles.
4. Mark official results per shot.
5. Generate video variants.
6. Use freshness to know what must be rerendered after changes.

### 15.6 Why ComfyUI + Blender + providers together is valuable

- ComfyUI: flexible generative workflows.
- Blender: spatial/animation correctness.
- External providers: strong specialized generation.

Puppet Layer unifies all of them into one understandable product workflow.

### 15.7 Expectation management

Absolute control is unrealistic in GenAI.
But high production-grade control and reproducibility are realistic — this is exactly what the Puppet Layer is built for.

---

## 16) Blender Role Model (normative)

Blender has two distinct roles in the Puppet Layer system:

### Role A: Guide Producer
Blender produces deterministic guide assets:
- Depth pass
- Normal pass
- Lineart/Freestyle
- Object/material/custom masks
- Viewport/preview
- Camera/framing metadata
- optional pose/rig data

These assets are stored as `GuideBundle` and consumed by generative executors.

### Role B: Executor
Blender can also produce its own render artifacts:
- technical 3D/layout renders
- viewport/clay previews
- GLB/animation/camera-path outputs

Both roles use the same shot/job/freshness semantics, while remaining technically distinct execution types.

---

## 17) GuideBundle v2 (mandatory core model)

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

## 18) RenderLineage v1 (required for reproducibility)

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

## 19) ModelAssetRegistry (required)

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

### Character Anchor (minimal model)

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

## 20) ControlSource abstraction (instead of only fileId)

```ts
type ControlSource =
  | { kind: "file"; fileId: string }
  | { kind: "guideBundleAsset"; guideBundleId: string; asset: "depth" | "normal" | "lineart" | "preview" | "segmentation" }
  | { kind: "guideBundleMask"; guideBundleId: string; maskId: string }
  | { kind: "stage2dLayer"; layerId: string };
```

Control configs should reference `source: ControlSource`, not only raw file IDs.

---

## 21) Capability Preflight (job-specific)

Before execution, preflight must validate:
- workflow exists with matching version/hash
- required nodes exist
- required models exist locally/are available
- required preprocessors exist
- asset access is authorized
- engine is online and limits are sufficient (resolution/batch/VRAM)

Only successful preflight allows a job to move to `executing`.

---

## 22) Control Fidelity model

Engines must be classified by control depth:

- **Hard-Control Engine** (e.g., local ComfyUI): full workflow/node/model control
- **Structural Engine** (e.g., Blender): deterministic geometry/guides/passes
- **Soft-Control Provider** (e.g., external APIs): limited controls, no full internal render graph

The Puppet Layer must declare which semantics are actually achievable per engine.

---

## 23) Product states (required)

```ts
type ProductState = "draft" | "candidate" | "official" | "rejected" | "stale" | "needs_rerender";
```

Important:
- These states are set by Product/Stage semantics.
- Technical workers must not set official product states unilaterally.

---

## 24) Security / Access Control

Minimum rules:
- Every render job is bound to `orgId/projectId/shotId`.
- Every asset/model access is authorized against org/project rights.
- Model assets have explicit visibility (`private/project/org/global`).
- Local bridge must not set product decisions.
- Workers must not mutate protected fields (`acceptedRenderJobId`, `reviewStatus`, revisions).
- External providers receive only explicitly allowed assets.
- Provider execution must be explicitly allowed per asset/project/org (`providerExecutionAllowed`).
- Secrets/API keys are never stored in render snapshots.

---

## 25) Failure Codes (required)

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

UI and observability must show failure code + human-readable message.

---

## 26) Freshness extension

Freshness should compare snapshots, not only shot revision:

- used GuideBundle revision vs current GuideBundle revision
- used StyleProfile revision vs current StyleProfile revision
- used CharacterAnchor revision vs current CharacterAnchor revision
- used RenderConfig version vs currently supported version
- used ModelAsset version vs currently active version

Freshness is a signal; final product decision remains user-driven.

---

## 27) Versioning matrix

Versioning is required for:
- RenderConfig
- GuideBundle
- Workflow template
- StyleProfile revision
- CharacterAnchor revision
- ModelAsset version/hash
- Bridge version
- Blender addon version
- Capability schema version

---

## 28) Realistic Definition of Done for Puppet Layer v1

Puppet Layer v1 is reached when:

- Ticket 12 is complete (official semantics/freshness/accept-reject),
- RenderConfig v1 is production-active in render jobs,
- RenderLineage v1 exists for accepted renders,
- GuideBundle v2 minimal set is supported (preview + depth + lineart + mask),
- controlled-image path supports at least Depth + Lineart,
- capability preflight is active for controlled-image,
- UI shows controls and blocks execution cleanly when capability is missing.

Note:
IP-Adapter and LoRA can follow in v1.1/v2.

---

## 29) Decision Rule: ComfyUI integration vs productized building blocks (consolidated in section 4.3)

This principle is defined normatively in section 4.3 and applies to all control extensions.

---

## 30) Admission criteria for new control types (DoD checklist)

A new control type (e.g., Depth ControlNet, IP-Adapter Reference, LoRA Character) can only be marked production-ready when all points are met:

1. **Schema**
   - Control is versioned inside `RenderConfig` (no ad-hoc JSON).
2. **Validation**
   - Zod/backend validation covers required fields, ranges, conflicts, and defaults.
3. **Capability**
   - Job-specific capability preflight validates nodes/models/workflow/preprocessors/limits.
4. **Asset resolution**
   - Inputs are resolvable via `ControlSource` and access is authorized.
5. **Workflow template**
   - Deterministic template with version + hash exists.
6. **Lineage**
   - `RenderLineage` captures config/workflow/models/inputs/outputs snapshots.
7. **UX**
   - UI exposes the control clearly with guardrails and clear failure messaging.
8. **Failure handling**
   - Failure codes are defined and visible in UI/observability.
9. **Freshness**
   - Control dependencies are included in freshness evaluation.
10. **Tests**
   - At minimum, contract + integration tests for happy path and capability-missing.

If one point is missing, the control type stays `planned` or `partial`, not `implemented`.
