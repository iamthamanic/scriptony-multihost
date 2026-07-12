VETILALORAPP
Verschachtelte Timeline mit lane-lokalem Ripple und automatischer Parent-Propagation.
Du bist als Senior Software Architect und Implementierungs-Agent für die Codebase von vetilalorapp / Scriptony zuständig.
Ziel ist keine kleine Reparatur und keine Übergangslösung. Ziel ist die vollständige, saubere Umsetzung einer:
Verschachtelten Timeline mit lane-lokalem Ripple und automatischer Parent-Propagation
Arbeite nach:
KISS
SOLID
DRY
testgetrieben
ohne Legacy-Sonderpfade
ohne React-State während pointermove
ohne konkurrierende Timeline-Wahrheiten
ohne raw metadata.pct_from / metadata.pct_to als Layout-Quelle
Diese Umsetzung ersetzt das bisherige unsaubere Mischmodell aus Act-Sonderpfad, Prozent-Layout, Roll-/Pair-Logik, deaktiviertem Parent-Sync und verstreuten Timeline-Helfern.
0. Zentrale Produktdefinition
Die Timeline besteht aus vier sichtbaren Struktur-Lanes:
Act Lane
Sequence Lane
Scene Lane
Shot Lane
Die Hierarchie ist:
Project
  Act
    Sequence
      Scene
        Shot
Jede Ebene hat eigene Segmente auf ihrer eigenen Lane.
Jedes Segment hat:
id
kind
parentId
orderIndex
start
end
duration
locked?
Die Timeline soll sich so verhalten:
Trim auf Act:
  ripplet nachfolgende Acts.

Trim auf Sequence:
  ripplet nachfolgende Sequences innerhalb desselben Acts.
  Wenn der Act dadurch wächst/schrumpft:
    ripplet der Act gegen nachfolgende Acts.

Trim auf Scene:
  ripplet nachfolgende Scenes innerhalb derselben Sequence.
  Wenn die Sequence dadurch wächst/schrumpft:
    ripplet die Sequence gegen nachfolgende Sequences im selben Act.
  Wenn der Act dadurch wächst/schrumpft:
    ripplet der Act gegen nachfolgende Acts.

Trim auf Shot:
  ripplet nachfolgende Shots innerhalb derselben Scene.
  Wenn die Scene dadurch wächst/schrumpft:
    ripplet die Scene gegen nachfolgende Scenes in derselben Sequence.
  Wenn die Sequence dadurch wächst/schrumpft:
    ripplet die Sequence gegen nachfolgende Sequences im selben Act.
  Wenn der Act dadurch wächst/schrumpft:
    ripplet der Act gegen nachfolgende Acts.
Das ist nicht normales CapCut. Es ist:
CapCut-artige UI-Physik
+
hierarchische Story-Timeline-Engine
CapCut-artig bedeutet hier nur:
pointermove
→ boundary berechnen
→ magnetic snap
→ timeline operation berechnen
→ rAF
→ DOM transform preview
→ ein Commit auf pointerup
Nicht:
React-State pro pointermove
DOM-Parent-Container als Wahrheit
pct_from/pct_to als Wahrheit
left/width-Reflow während Drag
1. Harte Architekturentscheidung
1.1 Eine einzige Timeline-Wahrheit
Die kanonische Wahrheit ist nicht mehr:
metadata.pct_from
metadata.pct_to
Die kanonische Wahrheit ist intern:
startFrame / endFrame
Falls die bestehende Codebase zunächst Sekunden braucht, dürfen öffentliche APIs startSec / endSec verwenden. Intern muss aber quantisiert werden:
const FRAME_RATE = 30;

function secToFrame(sec: number): number {
  return Math.round(sec * FRAME_RATE);
}

function frameToSec(frame: number): number {
  return frame / FRAME_RATE;
}
Alle Operationen müssen auf quantisierten Frames/Ticks laufen, nicht auf rohen Float-Sekunden.
Zielmodell:
export type ItemKind = "act" | "sequence" | "scene" | "shot";

export interface TimelineItem {
  id: string;
  kind: ItemKind;
  parentId: string | null;
  orderIndex: number;

  startFrame: number;
  endFrame: number;
  durationFrames: number;

  locked?: boolean;
}

export interface TimelineTree {
  items: Map<string, TimelineItem>;
  childrenOf: Map<string | null, TimelineItem[]>;
  projectDurationFrames: number;
  frameRate: number;
}
Falls aus Kompatibilitätsgründen zusätzlich startSec/endSec gebraucht werden, müssen sie abgeleitet werden:
startSec = startFrame / frameRate
endSec = endFrame / frameRate
Nicht umgekehrt.
2. Verbotene Architektur
Nicht mehr verwenden:
metadata.pct_from / metadata.pct_to als Layout-Wahrheit
buildFullActPctPreviewMapForTrim als Live-Preview-Quelle
liveActPctByActTrim
actTrimLayoutTick
bumpActTrimReactPreviewFromRefs
React setState während pointermove
Act-Sonderfall im Preview-Pfad
left/width als Drag-Preview-Mechanismus
verschiedene Layout-Engines für Static Render und Live Preview
Parent-Sync no-op
Roll/Pair-Redistribution als Default für Ripple
raw pct fallback bei kaputten Daten
Nicht erlauben:
if (kind === "act") return;
Act muss exakt denselben Preview- und Engine-Pfad benutzen wie Sequence, Scene und Shot.
3. Zielarchitektur
Baue die Struktur in klar getrennten Schichten.
timeline-tree/
  types.ts
  buildTree.ts
  diff.ts
  invariants.ts

ripple-engine/
  hierarchical.ts
  snap.ts
  preview.ts
  persist.ts

hooks/
  useStructureTrimSession.ts

components/
  VideoEditorTimeline.tsx
Verantwortlichkeiten:
TimelineTree:
  Datenmodell und Parent/Child-Index.

buildTree:
  Konvertiert bestehende TimelineData in TimelineTree.
  Repariert alte Daten beim Aufbau.
  Dedupliziert IDs.
  Quantisiert in Frames.

HierarchicalRippleEngine:
  Führt Ripple-/Resize-Operationen aus.
  Kennt kein React.
  Kennt keine API.
  Kennt keine DOM-Elemente.
  Kennt keine pct-Persistenz.

Preview:
  Wendet DOM-transform für geänderte Items an.
  Kein React-State.

Persist:
  Wandelt Patches in API-Updates um.
  Regelt Fehler, Revert und Refetch.

useStructureTrimSession:
  React-Adapter.
  Verwaltet pointerdown/move/up.
  Nutzt frozen dragStartTree.
  Triggert rAF Preview.
  Commit auf pointerup.

VideoEditorTimeline:
  Nur View/Integration.
  Keine Engine-Logik.
4. Operationstypen
Die Engine darf nicht alles als eine einzige namenlose Operation behandeln. Intern müssen diese Operationen getrennt sein:
export type StructureTrimOperation =
  | "ripple-resize"
  | "roll-boundary"
  | "shell-resize";
4.1 ripple-resize
Default für dein Zielmodell.
Ein Item wird länger/kürzer. Rechte Siblings im selben Parent ripplen. Parent passt sich an. Parent-Delta propagiert nach oben.
Beispiel:
Scene 1 wird länger
→ Scene 2 und Scene 3 rücken nach rechts
→ Sequence wächst
→ nachfolgende Sequences rücken
→ Act wächst
→ nachfolgende Acts rücken
4.2 roll-boundary
Optionaler späterer Modus, nicht Default.
Boundary zwischen zwei Nachbarn wird verschoben:
[Scene A][Scene B]
→
[Scene A----][Scene B--]
Parent bleibt gleich.
Diese Logik darf nicht mit Ripple vermischt werden.
4.3 shell-resize
Legacy-Operation (nur noch intern/tests). Default-Trim für Acts ist seit CapCut-Align **ripple-resize** — Act wächst/schrumpft mit Kindern, kein Tail-Gap (siehe §4.5).
Direkter Parent-Trim (Legacy shell-resize):
Beispiel:
User zieht den rechten Rand von Act 1.
Legacy-Regel:
Act-Shell wird größer.
Nachfolgende Acts rücken.
Kinder im Act bleiben unverändert.
Am Ende des Acts entsteht expliziter leerer Raum.
4.4 structure-move (Body-Drag, Drag & Drop)
Default für Mitte ziehen (CapCut: middle = drag & drop, edges = trim).
Gilt für **Hörspiel/Film** auf Act-, Sequence- und Scene-Lanes; Buch folgt später. Die Shot-Lane hat **kein** Body-Drag (nur Trim, §4.1) — MOVE_KINDS = act | sequence | scene.
Semantik (verbindlich):
Body-Drag ist **reiner Reorder bzw. Reparent** (drag & drop). Er verändert NIE eine Duration. Er rollt NIE in den Vorgänger. Links-Wachsen in den Vorgänger ist exklusiv Sache der Trim-Handles (§4.5, `shrinkPredecessorForLeftGrow`).
Gezogener Block: Duration konstant; der gesamte Subtree (alle Kinder rekursiv) verschiebt sich mit.
Reorder-Entscheidung: Das Zentrum des gezogenen Blocks (dropCenter = start + delta + duration/2) wird gegen die **Midpoints der Geschwister** im frozen dragStartTree verglichen. Midpoint gekreuzt → neue Einfügeposition (`computeReorderInsertIndex`). Kein Midpoint gekreuzt → No-op: changedIds = ∅, Block snappt visuell zurück, kein Persist, kein Toast-Fehler (nur Hinweis „Zum Umsortieren über die Mitte des Nachbar-Blocks ziehen.").
Reparent-Entscheidung (hat Vorrang vor Reorder): Der **Drop-Frame unter dem Cursor** bestimmt den Ziel-Parent. Sequence über fremdem Act → Reparent in diesen Act. Scene über fremder Sequence → Reparent in diese Sequence. Acts können nicht reparented werden (Root-Lane). Einfügeposition im Ziel-Parent: an der Stelle des Drop-Frames; Ziel-Kinder werden packed repackt.
Nach Move/Reparent: packed, keine impliziten Lücken, Parent-Hulls auto-gefittet, Invarianten (§5) müssen halten. Clamp: nichts vor Lane-Start.
Während des Drags bewegen sich Geschwister **NICHT** (frozen layout). Die Engine wird während pointermove nur für die Slot-Berechnung benutzt; der eigentliche Reorder/Reparent wird genau einmal auf pointerup ausgeführt und committet.
UI-Feedback (alle Pflicht):
1. Lift: gezogener Block bekommt z-index 40, opacity 0.85, Schatten, pointer-events:none (damit elementFromPoint den Inhalt darunter sieht).
2. Cursor-Follow: Block folgt horizontal dem Cursor (transform translateX, geclampt auf Lane-Start).
3. Dim-Overlay: alle vier Struktur-Lanes (Act/Seq/Scene/Shot) werden mit bg-background/55 abgedunkelt → signalisiert „Drag-&-Drop-Modus aktiv".
4. Insert-Slot: heller weißer Slot (border-2 weiß, bg-white/50, Glow-Schatten), auf **allen** Struktur-Lanes an derselben horizontalen Position. Reorder → schmales Junction-Band (min. 12px) an der Grenze zwischen den zwei Nachbarn, an denen eingefügt würde. Reparent → Slot spannt die volle Breite des Ziel-Parents. Kein Slot sichtbar = Loslassen ist No-op (Snap-back).
5. Slot-Quelle ist `getStructureMoveInsertionSlot` (frozen tree) — NICHT die Live-Engine. wouldChange=false → Slot ausblenden.
Commit-Semantik:
Commit (Reorder/Reparent) erst auf pointerup — niemals während pointermove („Drop vor Loslassen" ist ein Bug).
Der nachlaufende Click nach pointerup wird in der Capture-Phase verschluckt (One-Shot-Listener + 300ms-Timeout) — sonst feuert der Click auf das Element unter dem Cursor (z.B. Shot-Block → ungewollter View-Wechsel in die Dropdown-View).
pointercancel → Abbruch ohne Commit (cancelMove: Preview-Styles reset, Overlays weg, Session-Refs löschen).
Escape während des Drags → Abbruch ohne Commit.
window blur (Maus außerhalb des Fensters losgelassen, App-Wechsel) → Abbruch ohne Commit. Ohne diesen Abbruch bliebe die Session aktiv und der nächste Click würde ungewollt navigieren.
Engine: moveStructureItem, reparentStructureItem, resolveStructureMoveOperation (entscheidet Reparent vs. Reorder anhand dropFrame), structure-move-drop-zone (Slot).
React: useStructureMoveSession, useVetStructureMoveBridge.
4.5 CapCut-Align Act-Trim
Act-Rand-Trim nutzt ripple-resize (nicht shell-resize): Act wächst/schrumpft mit dem Child-Hull, nachfolgende Acts ripplen, kein Tail-Gap.
Kürzer (Shrink): Children schrumpfen kaskadierend von der gezogenen Kante aus (jedes Item bis zu ihrer minimalen Subtree-Dauer = Summe der Kind-Minima). Clamp: Boundary nie unter startFrame + minSubtreeDuration.
Länger (Grow): Die äußerste Child-Kette (letztes Kind rekursiv bis Shot-Ebene) wächst mit. Das Projektende ist elastisch — projectDurationFrames wächst mit; beim Commit meldet die Bridge onProjectDurationGrow(minSeconds), der Parent verlängert die gespeicherte Projektdauer still automatisch (CapCut-artig, kein Dialog/Toast).
Links wachsen in Vorgänger (Roll, exklusiv Trim): Vorgänger schrumpft von rechts (`shrinkPredecessorForLeftGrow`). Dabei gilt der **Pin-Invariant**: das erste Geschwister der Lane bleibt am Lane-Start gepinnt — für Root-Acts ist der Lane-Start **Frame 0** (Act 1 startet immer bei 0), für verschachtelte Lanes der Start des ersten Geschwisters. Es darf NIE `rippleLeftSiblings` benutzt werden, wenn ein Vorgänger existiert — das würde frühere Siblings nach rechts schieben und eine Lücke bei 0 erzeugen.
Left-Grow-Reihenfolge (Bugfix-kritisch): growDelta = targetStart − item.startFrame **vor** shiftItemSubtree berechnen, sonst ist delta nach dem Shift 0 und changedIds bleibt leer (keine Preview).
Ripple: Nachfolgende Siblings verschieben sich als ganze Subtrees, symmetrisch für Grow und Shrink (keine Lücken, kein Shell-only-Shift).
4.6 Gesten-Modell und Hit-Zonen
Jeder Struktur-Block (Act/Sequence/Scene) hat drei Zonen:
Linker Rand: Trim-Cap, cursor-ew-resize, `data-structure-trim-handle`, onPointerDown → Trim-Session (side=left).
Mitte: Body, cursor-grab, onPointerDown → Move-Pending. Trim-Handles werden über `closest("[data-structure-trim-handle]")` ausgeschlossen, damit Edge-Down nie eine Move-Session startet.
Rechter Rand: Trim-Cap, cursor-ew-resize, side=right.
Move-Pending → Move-Aktiv: erst wenn der Pointer ≥ 5px (STRUCTURE_BODY_DRAG_THRESHOLD_PX, euklidisch) gewandert ist. Unter 5px bleibt es ein Click (Inline-Titel-Edit bzw. Selektion) — dieser Click wird NICHT verschluckt.
Während aktiver Session laufen pointermove/pointerup/pointercancel als **Window-Listener in der Capture-Phase** (Drag funktioniert auch, wenn der Cursor die Lane verlässt). Zusätzlich window-blur-Listener (Abbruch, §4.4).
Layout-Freeze: während aktiver Trim-/Move-Session werden die Struktur-Rows eingefroren (data-vet-frozen, feste Höhen/Breiten), damit React-Re-Renders die DOM-Previews nicht zerstören. Nach Commit/Cancel: Freeze lösen, Preview-Styles selektiv (nur touched/changed Ids) zurücksetzen, Layout-Epoch bumpen → React rendert die neue Wahrheit.
Snap beim Trim: pixelbasiert (SNAP_THRESHOLD_PX = 8 → Frames über pxPerFrame), scope-aware (§8); die eigene Boundary und die direkt angrenzende Junction-Kante sind als Anchor ausgeschlossen.
4.7 Drag-&-Drop-Verhalten pro Lane (verbindlich)
Act-Lane:
Body-Drag = Reorder unter Project-Root. Kein Reparent möglich.
Act 1 nach links ziehen → No-op (kein früherer Midpoint existiert). Letzten Act nach rechts ziehen → No-op.
Act über 2+ Midpoints ziehen (z.B. letzter Act ganz nach vorn) → Multi-Position-Reorder in einem Commit; Lane bleibt packed ab Frame 0.
Sequence-Lane:
Body-Drag innerhalb des eigenen Acts = Reorder (Act-Hull unverändert).
Body-Drag über einen fremden Act (Drop-Frame im fremden Act) = Reparent: Sequence wird mit konstanter Duration in den Ziel-Act eingefügt, Quell-Act und Ziel-Act fitten ihre Hulls neu, beide Acts ripplen gegen ihre Nachbarn.
Einzige Sequence eines Acts kann weggezogen werden, wenn der Act danach noch valide ist; sonst blocked.
Scene-Lane:
Body-Drag innerhalb der eigenen Sequence = Reorder.
Body-Drag über eine fremde Sequence = Reparent (analog Sequence → Act), Propagation bis zur Root.
Shot-Lane:
Kein Body-Drag. Shots werden ausschließlich getrimmt (Ripple in der Scene, Propagation nach oben) oder über Dialog/Dropdown verwaltet.
Edge-Cases (alle getestet, Engine + Browser-Sim):
1. Einzelkind-Lane (nur 1 Geschwister): Insert-Slot = null, Body-Drag ist immer No-op (Reorder unmöglich); Reparent bleibt möglich (Seq/Scene).
2. Locked: gezogenes Item locked → blocked („locked"); Reorder, der ein locked Sibling verschieben müsste → blocked („locked_ripple"). Blocked = kein Commit + Toast.
3. No-op-Drop (kein Midpoint, kein fremder Parent): Snap-back, changedIds = ∅, kein Persist-Call.
4. Drop-Frame außerhalb aller Parents (vor 0 / hinter Projektende): Cursor-Follow ist geclampt; Slot fällt auf Reorder-Logik zurück bzw. ist hidden.
5. Trim links-grow am ersten Sibling (Act 1 linker Rand): kein Vorgänger → rippleLeftSiblings-Pfad, Boundary clamp ≥ 0.
6. Trim links-grow bis unter das Minimum des Vorgängers: Boundary wird auf minSubtreeDuration des Vorgängers geclampt (Vorgänger endet nie unter seiner Min-Dauer; Act 1 bleibt bei 0).
7. Trim rechts-grow am letzten Act über das Projektende: elastisch, projectDurationFrames wächst still mit (§4.5).
8. Trim shrink unter minSubtreeDuration: Clamp; nachfolgende Siblings rücken exakt um das geclampte Delta.
9. Trailing Click nach Drag/Trim: wird in Capture-Phase verschluckt → kein versehentlicher Shot-Open / View-Wechsel Timeline → Dropdown.
10. Pointer verlässt Fenster + Loslassen draußen: window blur → Abbruch (Session nie „stuck").
11. pointercancel (Touch/Stylus/OS): Abbruch ohne Commit, Overlays und Freeze sauber entfernt.
12. Persist-Fehler beim Commit: Revert auf before-Snapshot + Refetch (§11.4); UI zeigt nie halb-gespeicherten Zustand.
13. Doppel-Ende (pointerup + spätes pointercancel): Guard-Ref verhindert doppelten Commit.
14. Reparent erhält Duration exakt (durationFrames identisch vor/nach), nur start/end/parentId/orderIndex ändern sich.
5. Packed Timeline Invariant
Standardmäßig gilt innerhalb jedes Parents:
Children sind nach orderIndex sortiert.
Children überlappen nicht.
Children sind packed, außer explizite Gap-Items existieren.
Parent.startFrame = firstChild.startFrame
Parent.endFrame = lastChild.endFrame
Wenn ihr keine Gap-Items implementiert, dürfen keine impliziten Lücken entstehen.
Prüfe nach jeder Engine-Operation:
Keine negativen Durations
Keine duration < minItemDurationFrames
Keine Overlaps zwischen Siblings
Keine impliziten Lücken, außer Gap-Items existieren
Child.startFrame >= Parent.startFrame
Child.endFrame <= Parent.endFrame
Parent.endFrame >= Parent.startFrame
Keine doppelten IDs
Keine Zyklen im parentId-Graph
6. TimelineTree-Aufbau
Neue Datei:
src/lib/timeline-tree/types.ts
src/lib/timeline-tree/buildTree.ts
src/lib/timeline-tree/invariants.ts
src/lib/timeline-tree/diff.ts
6.1 buildTimelineTree
Signatur:
export function buildTimelineTree(input: {
  timelineData: TimelineData;
  projectDurationSec: number;
  frameRate: number;
}): TimelineTree;
Pflichten:
1. Bestehende TimelineData laden.
2. Acts deduplizieren.
3. Alte Act-pct mit bestehender resolved-span-Logik reparieren.
4. Sequences über actId als Children einhängen.
5. Scenes über sequenceId als Children einhängen.
6. Shots über sceneId / scene_id als Children einhängen.
7. start/end in Frames quantisieren.
8. childrenOf Map aufbauen.
9. orderIndex stabil normalisieren.
10. Invarianten prüfen.
Wichtig:
buildTree darf raw metadata.pct_from / metadata.pct_to nur als Legacy-Input lesen.
Nach buildTree darf kein Layout-Code mehr raw pct lesen.
6.2 Keine konkurrierenden Block-Engines
Langfristig ersetzen:
calculateActBlocks
calculateSequenceBlocks
calculateSceneBlocks
computeFilmShotSpans
effectiveTimelineData für Structure-Trim
durch Tree-basierte Projektion:
function itemToPixels(item, viewStartFrame, pxPerFrame) {
  return {
    x: (item.startFrame - viewStartFrame) * pxPerFrame,
    width: (item.endFrame - item.startFrame) * pxPerFrame,
  };
}
7. Hierarchical Ripple Engine
Neue Datei:
src/lib/ripple-engine/hierarchical.ts
Signatur:
export interface RippleResizeInput {
  tree: TimelineTree;
  itemId: string;
  side: "left" | "right";
  operation: StructureTrimOperation;
  newBoundaryFrame: number;
  snapEdgesFrame: number[];
  snapThresholdFrames: number;
  minItemDurationFrames: number;
}

export interface RippleResult {
  before: TimelineTree;
  next: TimelineTree;
  changedIds: Set<string>;
  operation: StructureTrimOperation;
}

export function resizeStructureItem(input: RippleResizeInput): RippleResult;
7.1 Pflicht: Snapshot-basierte Berechnung
Jeder Pointermove muss immer vom frozen dragStartTree berechnet werden.
Richtig:
const result = resizeStructureItem({
  tree: dragStartTreeRef.current,
  itemId,
  side,
  operation,
  newBoundaryFrame,
  ...
});
Falsch:
const result = resizeStructureItem({
  tree: previousPreviewTreeRef.current,
  ...
});
Warum:
Sonst werden Ripple-Deltas kumulativ mehrfach angewendet.
Das erzeugt wandernde Siblings, falsche Parent-Größen, Snap-Sprünge und Preview/Commit-Abweichungen.
7.2 ripple-resize Algorithmus
Für operation: "ripple-resize":
1. Clone frozen tree.
2. Boundary snap anwenden.
3. Boundary auf Frame quantisieren.
4. Min-Duration clamp.
5. Child-Hull clamp.
6. Item-Boundary setzen.
7. Delta gegenüber originaler Boundary berechnen.
8. Rechte Siblings im selben Parent um Delta verschieben.
9. Parent auto-fitten.
10. Wenn Parent sich verändert:
    parentDelta berechnen.
    Rechte Siblings des Parents verschieben.
    Dessen Parent fitten.
    Bis Root wiederholen.
11. Invarianten validieren.
12. changedIds zurückgeben.
Pseudocode:
function rippleResizeFromSnapshot(input: RippleResizeInput): RippleResult {
  const before = cloneTree(input.tree);
  const next = cloneTree(input.tree);

  const itemBefore = before.items.get(input.itemId);
  if (!itemBefore || itemBefore.locked) {
    return unchanged(before, input.operation);
  }

  const snappedBoundary = snapBoundary(
    input.newBoundaryFrame,
    input.snapEdgesFrame,
    input.snapThresholdFrames,
  );

  const clampedBoundary = clampBoundary({
    tree: next,
    itemId: input.itemId,
    side: input.side,
    proposedBoundaryFrame: snappedBoundary,
    minItemDurationFrames: input.minItemDurationFrames,
  });

  const delta = setBoundaryAndReturnDelta({
    tree: next,
    itemId: input.itemId,
    side: input.side,
    boundaryFrame: clampedBoundary,
  });

  rippleRightSiblings({
    tree: next,
    parentId: itemBefore.parentId,
    afterOrderIndex: itemBefore.orderIndex,
    deltaFrames: delta,
  });

  propagateParentFit({
    before,
    next,
    changedChildId: input.itemId,
  });

  validateTimelineTree(next);

  return {
    before,
    next,
    changedIds: diffChangedIds(before, next),
    operation: input.operation,
  };
}
7.3 Parent propagation
Parent propagation darf nicht blind parent.end += delta machen.
Richtig:
newParentStart = min(children.startFrame)
newParentEnd = max(children.endFrame)
parentDeltaStart = newParentStart - oldParentStart
parentDeltaEnd = newParentEnd - oldParentEnd
Für dein Default-Modell reicht zunächst:
Rechter Trim propagiert über parent.endFrame.
Linker Trim muss explizit getestet werden.
Bei jedem Parent, dessen Endgrenze wächst/schrumpft:
rechte Siblings des Parents ripplen um parentDeltaEnd
dann dessen Parent fitten
7.4 Locking
Wenn ein Item locked ist:
Es darf nicht verändert werden.
Wenn ein locked Sibling durch Ripple verschoben werden müsste:
  Operation muss entweder blockiert werden
  oder nur bis zur locked-Grenze clamped werden.
Für die erste Version:
Wenn ein Ripple ein locked Item bewegen müsste, blockiere die gesamte Operation und gib unchanged zurück.
8. Magnetic Snap
Neue Datei:
src/lib/ripple-engine/snap.ts
Snap ist scope-aware.
Nicht:
getSnapEdges(): number[]
Sondern:
export function getSnapEdgesForStructureOperation(input: {
  tree: TimelineTree;
  itemId: string;
  kind: ItemKind;
  parentId: string | null;
  operation: StructureTrimOperation;
  side: "left" | "right";
  playheadFrame?: number;
  markerFrames?: number[];
  includeFrameGrid?: boolean;
}): number[];
Snap-Kanten:
Act:
  project start/end
  act boundaries
  playhead
  markers
  frame grid

Sequence:
  parent Act start/end
  sibling sequence boundaries
  playhead
  markers
  frame grid

Scene:
  parent Sequence start/end
  sibling scene boundaries
  playhead
  markers
  frame grid

Shot:
  parent Scene start/end
  sibling shot boundaries
  playhead
  markers
  frame grid
Reihenfolge:
Pointer movement
→ desired boundary
→ snap
→ quantize
→ clamp
→ ripple
→ preview
Snap darf nicht nach Ripple passieren.
9. Preview
Neue Datei:
src/lib/ripple-engine/preview.ts
Signatur:
export function applyStructurePreviewToDOM(input: {
  containerByKind: Record<ItemKind, HTMLElement | null>;
  tree: TimelineTree;
  changedIds: Set<string>;
  viewStartFrame: number;
  pxPerFrame: number;
}): void;
Pflichten:
1. Nur changedIds updaten.
2. Für jedes geänderte Item richtigen Container anhand kind finden.
3. DOM-Node über data-Attribut finden.
4. transform setzen.
5. width setzen.
6. left auf "0" setzen.
7. Kein React-State.
8. Kein Sonderfall für Act.
Data attributes:
act      → data-act-id
sequence → data-sequence-id
scene    → data-scene-id
shot     → data-shot-id
Implementierungsprinzip:
node.style.transform = `translateX(${x}px)`;
node.style.width = `${Math.max(2, width)}px`;
node.style.left = "0";
Kein style.left als Live-Preview.
Reset-Funktion:
export function resetStructurePreviewStyles(input: {
  containerByKind: Record<ItemKind, HTMLElement | null>;
}): void;
10. React Hook
Neue Datei:
src/hooks/useStructureTrimSession.ts
Signatur:
export interface StructureTrimSessionApi {
  startTrim(input: {
    itemId: string;
    kind: ItemKind;
    side: "left" | "right";
    operation: StructureTrimOperation;
    pointerClientX: number;
    pointerId?: number;
    currentTarget?: HTMLElement;
  }): void;

  moveTrim(e: PointerEvent): void;

  endTrim(): Promise<void>;

  cancelTrim(): void;

  isActive(): boolean;
}

export function useStructureTrimSession(args: {
  tree: TimelineTree;
  frameRate: number;
  pxPerFrameRef: React.RefObject<number>;
  viewStartFrameRef: React.RefObject<number>;

  minItemDurationFrames: number;
  snapThresholdFrames: number;

  getSnapEdges: (input: {
    tree: TimelineTree;
    itemId: string;
    kind: ItemKind;
    parentId: string | null;
    operation: StructureTrimOperation;
    side: "left" | "right";
  }) => number[];

  getContainers: () => Record<ItemKind, HTMLElement | null>;

  onCommit: (input: {
    before: TimelineTree;
    next: TimelineTree;
    changedIds: Set<string>;
    patches: TreePatch[];
  }) => Promise<void>;

  onRevert: (before: TimelineTree) => void;
}): StructureTrimSessionApi;
10.1 startTrim
Muss tun:
1. dragStartTreeRef = cloneTree(tree)
2. activeSessionRef setzen
3. startX speichern
4. startBoundaryFrame speichern
5. pointer capture setzen, falls möglich
6. keine großen React-State-Updates
10.2 moveTrim
Muss tun:
1. Wenn keine Session aktiv: no-op.
2. deltaPx = e.clientX - startX.
3. deltaFrames = round(deltaPx / pxPerFrame).
4. newBoundaryFrame = startBoundaryFrame + deltaFrames.
5. snapEdges scope-aware holen.
6. resizeStructureItem mit dragStartTreeRef aufrufen.
7. latestPreviewResultRef setzen.
8. requestAnimationFrame schedule.
9. applyStructurePreviewToDOM nur für changedIds.
Verboten:
setState pro move
timelineData mutieren
API call
fetch
debug ingest
raw pct lesen
10.3 endTrim
Muss tun:
1. latestPreviewResultRef lesen.
2. diffTreeToPatches(before, next) erzeugen.
3. onCommit aufrufen.
4. Bei Erfolg:
   - React timelineData einmal aktualisieren.
   - Preview styles resetten.
5. Bei Fehler:
   - before wiederherstellen.
   - Preview styles resetten.
   - Timeline refetch triggern.
10.4 cancelTrim
Muss tun:
1. Preview styles resetten.
2. before snapshot wiederherstellen.
3. Session refs löschen.
4. Kein Persist.
10.5 useStructureMoveSession (Body-Drag, §4.4)
Gleiches Muster wie Trim, aber für Drag & Drop:
startMove:
1. dragStartTreeRef = cloneTree(tree) (frozen).
2. startX, itemId, kind speichern.
3. Dim-Overlays auf alle Struktur-Lanes (applyStructureDimOverlays).
4. Lift + Cursor-Follow auf den gezogenen Block (applyStructureDragFollow).
moveDrag (pro pointermove, rAF-gebündelt):
1. deltaFrames aus deltaPx; Cursor-Follow-Position clampen (nichts vor Lane-Start).
2. getStructureMoveInsertionSlot(frozenTree, itemId, deltaFrames, dropFrame) berechnen.
3. slot.wouldChange → weißen Insert-Slot auf allen Lanes zeichnen (applyStructureDropZoneAcrossLanes); sonst nur Slots clearen (Dim bleibt).
4. KEIN applyStructurePreviewToDOM auf Geschwister — Geschwister bleiben eingefroren.
5. Verboten: Engine-Commit, setState, API, Persist.
endMove (pointerup):
1. resolveStructureMoveOperation(frozenTree, itemId, deltaFrames, dropFrame) — genau einmal.
2. changedIds leer → Snap-back (Preview-Styles + Overlays reset), Hinweis-Toast, kein Persist.
3. blocked → Snap-back + Fehler-Toast (locked / locked_ripple).
4. Sonst: diffTreeToPatches → onCommit; Erfolg → React-State einmal aktualisieren; Fehler → Revert + Refetch.
5. Immer: Overlays entfernen, Lift-Styles reset, Session-Refs löschen, trailing Click verschlucken.
cancelMove (Escape / pointercancel / window blur):
Wie cancelTrim — Reset ohne Persist, Overlays und Freeze vollständig entfernen.
11. Diff und Persistenz
Neue Datei:
src/lib/timeline-tree/diff.ts
src/lib/ripple-engine/persist.ts
11.1 TreePatch
export interface TreePatch {
  id: string;
  kind: ItemKind;
  parentId: string | null;

  startFrame: number;
  endFrame: number;
  durationFrames: number;

  startSec: number;
  endSec: number;
  durationSec: number;

  pct_from?: number;
  pct_to?: number;
}
11.2 diffTreeToPatches
Muss:
1. before/after vergleichen.
2. Nur geänderte Items ausgeben.
3. Für Legacy-Persistenz pct_from/pct_to relativ zum Parent ableiten.
4. Shots zusätzlich mit durationSec ausgeben.
5. Keine Patches für unveränderte Items.
6. Patches topologisch sortieren:
   Act vor Sequence vor Scene vor Shot.
11.3 Persistenzstrategie
Langfristiges Ziel:
DB speichert startFrame/endFrame oder startSec/endSec.
pct_from/pct_to ist nur Legacy.
Keine Übergangslösung als Endzustand akzeptieren.
Wenn die aktuelle API noch nur pct speichern kann:
Implementiere trotzdem TreePatch mit startFrame/endFrame.
Persistiere zusätzlich Legacy pct_from/pct_to.
Dokumentiere und kapsle das im Repository.
Layout darf nie wieder aus raw pct lesen.
11.4 Fehlerstrategie
Wenn mehrere Patches persistiert werden:
1. Vor Commit before snapshot behalten.
2. Optimistic UI nur mit Revert-Möglichkeit.
3. Bei Teilfehler:
   - UI auf before zurücksetzen.
   - Preview resetten.
   - authoritative refetch auslösen.
   - Fehler melden.
4. Keine halb gespeicherte Timeline als scheinbar erfolgreich behandeln.
Wenn Batch-API möglich ist:
Batch-Endpunkt bevorzugen.
Wenn nur Einzelupdates möglich sind:
topologisch persistieren:
Act → Sequence → Scene → Shot
12. User Journey
12.1 Scene länger ziehen
Ausgang:
Act 1: 0–100
  Sequence 1: 0–50
    Scene 1: 0–20
    Scene 2: 20–50
  Sequence 2: 50–100
Act 2: 100–200
User zieht rechte Kante von Scene 1 um +10s.
Erwartetes Verhalten live während Drag:
Scene 1: 0–30
Scene 2: 30–60

Sequence 1: 0–60
Sequence 2: 60–110

Act 1: 0–110
Act 2: 110–210
Der User sieht:
Scene 1 wird breiter.
Scene 2 rückt nach rechts.
Sequence 1 wird breiter.
Sequence 2 rückt nach rechts.
Act 1 wird breiter.
Act 2 rückt nach rechts.
Alles smooth per transform.
12.2 Scene kürzer ziehen
Ausgang:
Scene 1: 0–30
Scene 2: 30–60
Sequence 1: 0–60
Act 1: 0–110
Act 2: 110–210
User kürzt Scene 1 um -10s.
Erwartung:
Scene 1: 0–20
Scene 2: 20–50
Sequence 1: 0–50
Sequence 2 rückt zurück.
Act 1 schrumpft.
Act 2 rückt zurück.
Parent schrumpft nur, wenn der Child-Hull kleiner wird.
12.3 Shot länger ziehen
Shot 1 länger
→ Shots rechts in derselben Scene rücken.
→ Scene wächst.
→ Scenes rechts in derselben Sequence rücken.
→ Sequence wächst.
→ Sequences rechts im selben Act rücken.
→ Act wächst.
→ Acts rechts im Projekt rücken.
12.4 Sequence länger ziehen
Sequence 1 länger
→ Sequences rechts im selben Act rücken.
→ Act wächst.
→ Acts rechts im Projekt rücken.
Kinder innerhalb Sequence bleiben unverändert, sofern es sich um shell-resize handelt.
Wenn Sequence-Inhalt selbst durch Scene-Ripple wächst, dann kommt die Änderung von unten.
12.5 Act länger ziehen (CapCut-Align, Default)
Default ist ripple-resize (§4.5), KEIN Shell-Resize mit Tail-Gap:
User zieht den rechten Rand von Act 1 nach rechts.
→ Die äußerste Child-Kette von Act 1 (letzte Sequence → letzte Scene → letzter Shot) wächst mit.
→ Act 1 wächst auf den neuen Child-Hull.
→ Act 2 und folgende Acts rücken als ganze Subtrees nach rechts.
→ Überschreitet das neue Ende das Projektende, wächst projectDurationFrames still mit (elastisch, kein Dialog).
Es entsteht NIE ein Tail-Gap; die Lane bleibt packed.
12.6 Act per Drag & Drop umsortieren
User greift Act 2 in der Mitte (cursor-grab) und zieht ≥ 5px.
→ Alle Struktur-Lanes dimmen ab, Act 2 liftet (Schatten, leicht transparent) und folgt dem Cursor.
→ Geschwister bleiben stehen (frozen).
→ Sobald das Zentrum von Act 2 den Midpoint von Act 1 kreuzt, erscheint ein weißer Insert-Slot am Lane-Start über allen vier Lanes.
→ User lässt los (pointerup): Act 2 wird vor Act 1 eingefügt, Lane wird packed ab Frame 0 repackt, ein Commit.
→ Lässt der User los, ohne dass ein Slot sichtbar ist: Snap-back, keine Änderung, Hinweis-Toast.
→ Der nachlaufende Click wird verschluckt — die Timeline-View bleibt aktiv (kein Sprung in die Dropdown-View).
12.7 Sequence in anderen Act ziehen (Reparent)
User zieht Sequence 1b (aus Act 1) über Act 2.
→ Insert-Slot spannt die volle Breite von Act 2 (Reparent-Modus).
→ pointerup: Sequence wird mit identischer Dauer in Act 2 eingefügt (an der Drop-Position), Act 1 und Act 2 fitten ihre Hulls neu, Nachbarn ripplen, ein Commit.
→ Scene → fremde Sequence verhält sich identisch eine Ebene tiefer.
→ Escape, pointercancel oder Fenster-Blur während des Drags: Abbruch ohne Änderung.
13. Akzeptanzkriterien
13.1 Architektur
Erfüllt nur, wenn:
1. Es gibt TimelineTree als kanonisches Strukturmodell.
2. Engine nutzt startFrame/endFrame oder quantisierte startSec/endSec.
3. Layout liest nicht mehr raw metadata.pct_from/pct_to.
4. Act/Sequence/Scene/Shot benutzen denselben Preview-Pfad.
5. Kein Act-Sonderfall existiert.
6. VET enthält keine 1000-Zeilen-Trim-Engine mehr.
7. React-State wird während pointermove nicht aktualisiert.
8. Persistenz ist von Engine getrennt.
9. DOM-Preview ist von Engine getrennt.
10. Tests definieren die Fachlogik.
13.2 Funktional
Erfüllt nur, wenn:
1. Shot länger → Scene/Sequence/Act wachsen korrekt und rechte Siblings ripplen.
2. Shot kürzer → Parent-Kette schrumpft korrekt und rechte Siblings rücken zurück.
3. Scene länger → Sequences/Acts propagieren korrekt.
4. Sequence länger → Acts propagieren korrekt.
5. Act länger → nachfolgende Acts ripplen.
6. Parent wird nie kleiner als Child-Hull.
7. Locked Item blockiert Ripple.
8. Magnetic Snap greift vor Ripple.
9. Preview entspricht nach pointerup exakt dem persisted Render.
10. Nach Reload sieht die Timeline identisch aus.
11. Body-Drag (Mitte) ist reiner Reorder/Reparent — ändert nie eine Duration und rollt nie in den Vorgänger.
12. Act 1 (erstes Root-Sibling) startet nach jeder Operation bei Frame 0.
13. Commit von Drag & Drop passiert ausschließlich auf pointerup; während pointermove ändert sich keine Wahrheit.
14. Nach Drag/Trim löst der nachlaufende Click keine Navigation aus (Timeline-View bleibt aktiv).
15. Escape, pointercancel und Fenster-Blur brechen jede aktive Session ohne Commit ab.
13.3 Performance
Erfüllt nur, wenn:
1. pointermove macht keine API-Calls.
2. pointermove macht keine React-State-Updates.
3. pointermove liest keine raw pct metadata.
4. pointermove berechnet immer vom frozen dragStartTree.
5. rAF bündelt DOM-Preview.
6. Preview updatet nur changedIds.
7. Act-Trim ist genauso smooth wie Scene-/Shot-Trim.
13.4 Datenintegrität
Erfüllt nur, wenn nach jeder Operation gilt:
Keine doppelte ID.
Keine Zyklen.
Keine negativen Durations.
Keine unerlaubten Overlaps.
Keine impliziten Gaps ohne Gap-Item.
Children liegen innerhalb Parent.
Parent-Hull stimmt mit Children überein.
Root-Acts sind sortiert und nicht überlappend.
13.5 Persistenz
Erfüllt nur, wenn:
1. Commit erzeugt vollständige TreePatches.
2. Patches enthalten startFrame/endFrame oder startSec/endSec.
3. Legacy pct_from/pct_to wird nur aus Tree abgeleitet.
4. Persistenzfehler führen zu Revert oder Refetch.
5. Teilfehler werden nicht als Erfolg behandelt.
6. Nach Reload ist Preview-Ergebnis stabil erhalten.
14. Tests
Implementiere Tests vor oder parallel zur Engine.
14.1 timeline-tree/buildTree.test.ts
Muss testen:
- Acts werden dedupliziert.
- Overlapping legacy pct wird repariert.
- Sequences hängen unter Act.
- Scenes hängen unter Sequence.
- Shots hängen unter Scene.
- childrenOf ist korrekt sortiert.
- start/end werden quantisiert.
- keine raw pct als Runtime-Wahrheit.
14.2 ripple-engine/hierarchical.test.ts
Muss testen:
1. Scene right ripple grows Sequence and Act.
2. Scene right shrink shrinks Sequence and Act.
3. Shot right ripple propagates to Scene/Sequence/Act.
4. Sequence right ripple propagates to Act.
5. Act right ripple moves following Acts.
6. Locked following sibling blocks operation.
7. Min duration clamp.
8. Child hull clamp.
9. Snap before ripple.
10. No cumulative drift across repeated previews from same dragStartTree.
11. Left trim behavior explicitly tested.
12. Parent cannot shrink below child hull.
13. changedIds contains only changed items.
14. Packed invariant holds after operation.
14.3 preview.test.ts
Muss testen:
- Act preview uses transform.
- Sequence preview uses transform.
- Scene preview uses transform.
- Shot preview uses transform.
- No left-based live preview.
- Only changedIds are updated.
- null container is no-op.
14.4 useStructureTrimSession.test.ts
Muss testen:
- startTrim freezes tree.
- moveTrim computes from frozen tree, not previous preview.
- moveTrim schedules rAF.
- moveTrim does not call setState.
- endTrim calls onCommit once.
- cancelTrim restores snapshot.
- failed commit calls revert/refetch path.
14.5 persist.test.ts
Muss testen:
- TreePatch generation for Act/Sequence/Scene/Shot.
- Topological patch order.
- Legacy pct derived correctly from parent shell.
- Partial API failure triggers failed result.
14.6 ripple-engine/hierarchical-move.test.ts (Body-Drag)
Muss testen:
1. Reorder rechts: Midpoint des Nachbarn gekreuzt → Positionen tauschen, Lane packed.
2. Reorder links: analog, erstes Sibling bleibt am Lane-Start.
3. Kein Midpoint gekreuzt → No-op: changedIds = ∅, keine Position verändert (kein Roll auf Body-Drag).
4. Erster/letzter Block über den Rand hinaus → No-op.
5. Multi-Midpoint (letzter Block ganz nach vorn) → korrektes Multi-Reorder in einem Schritt.
6. Locked dragged item → blocked ("locked"); locked betroffenes Sibling → blocked ("locked_ripple").
7. Reparent Sequence → fremder Act: parentId/orderIndex neu, durationFrames identisch, beide Act-Hulls gefittet, Invarianten halten.
8. Reparent Scene → fremde Sequence: analog inkl. Propagation bis Root.
9. resolveStructureMoveOperation wählt Reparent vor Reorder anhand dropFrame.
14.7 ripple-engine/structure-move-drop-zone.test.ts (Insert-Slot)
Muss testen:
1. Kein Midpoint gekreuzt → wouldChange=false (Slot hidden).
2. Reorder über vorderen Nachbarn → Junction-Band am Lane-Start (startFrame === endFrame).
3. Reorder über hinteren Nachbarn → Junction-Band am Ende des Nachbarn.
4. Sequence über fremdem Act → mode="reparent", Slot = volle Act-Spanne.
5. Einzelkind-Lane → Slot null.
14.8 ripple-engine/act-trim-capcut.test.ts (CapCut-Align)
Muss testen:
1. Act-2 links-grow: Act-1 schrumpft von rechts, Act-1.startFrame bleibt 0, changedIds > 0.
2. Act-2 links-shrink: Junction folgt, Act-1 bleibt bei 0, keine Lücke.
3. Links-grow über Vorgänger-Minimum → Clamp auf minSubtreeDuration.
4. Rechts-grow am letzten Act → projectDurationFrames wächst elastisch.
5. Kaskadierendes Child-Shrink von der gezogenen Kante.
14.9 Integrations-/Regressionstests (UI-Schicht)
- preview-react-reconcile: Nach Commit hinterlässt die Preview keine transform-Reste; selektiver Reset lässt unveränderte Siblings intakt.
- vet-structure-trim-layout-freeze: Während aktiver Session friert das Row-Layout ein; React-Re-Render zerstört die DOM-Preview nicht.
- vet-structure-trim-active: Trim-Session aktiviert/deaktiviert sauber (Guards, keine Doppel-Commits).
- useStructureTrimSession: failed commit → revert/refetch; commit genau einmal.
15. Migrationsstrategie
Keine halbe Übergangslösung als Endzustand.
Trotzdem darf die Umsetzung technisch in sicheren Schritten erfolgen.
Phase 1: Neue Engine additiv
Erstelle:
timeline-tree/types.ts
timeline-tree/buildTree.ts
timeline-tree/invariants.ts
timeline-tree/diff.ts
ripple-engine/snap.ts
ripple-engine/hierarchical.ts
ripple-engine/preview.ts
ripple-engine/persist.ts
hooks/useStructureTrimSession.ts
Alte Dateien in Phase 1 nicht löschen.
Phase 2: Tests grün
Alle neuen Tests müssen grün sein.
Keine Integration in VET ohne grüne Engine-Tests.
Phase 3: VET auf neuen Hook umstellen
Entferne aus VET:
handleTrimClipMouseDown für Structure-Items
handleTrimClipMove für Structure-Items
handleTrimClipEnd für Structure-Items
actTrimLayoutTick
liveActPctByActTrim
bumpActTrimReactPreviewFromRefs
buildFullActPctPreviewMapForTrim als Preview-Quelle
applyClipTimingPreviewToDOM mit Act-Sonderfall
applyShotTrimPreviewToDOM falls durch neue Preview ersetzt
debug-fetch im Hot Path
VET darf nur noch:
TimelineTree bauen
Rows rendern
Container refs liefern
startTrim/moveTrim/endTrim verbinden
onCommit ausführen
Phase 4: Persistenz stabilisieren
Wenn API noch pct braucht:
TreePatch → Legacy pct im persist layer ableiten.
Aber:
Layout darf nicht aus pct lesen.
Phase 5: Alte Module entfernen
Erst nach grünen Integrationstests entfernen:
timeline-trim-parent-sync.ts
timeline-parent-ripple.ts
timeline-structure-outer-trim.ts
timeline-structure-preserve-global.ts
timeline-structure-trim-pct.ts
nicht mehr benötigte Teile aus timeline-parent-expand-only.ts
nicht mehr benötigte Teile aus timeline-film-geometry.ts
nicht mehr benötigte Teile aus timeline-act-layout.ts
nicht mehr benötigte Teile aus timeline-blocks.ts
Kein Big-Bang-Delete vor erfolgreicher Integration.
16. Was vermieden werden muss
Nicht tun:
- Noch eine weitere pct-basierte Helper-Funktion bauen.
- Act wieder als Sonderfall behandeln.
- Parent-Dauer manuell im DOM setzen.
- Ripple über CSS lösen.
- pointermove mit setState koppeln.
- Preview aus vorherigem Preview-Zustand berechnen.
- Parent-Sync wieder als separate Patch-Funktion neben Engine bauen.
- Roll und Ripple vermischen.
- Sequences/Scenes aus raw metadata.pct_from/pct_to rendern.
- Debug fetch/log ingestion im Drag-Hot-Path lassen.
- Alte Dateien löschen, bevor neue Engine getestet integriert ist.
- Persistenzfehler ignorieren.
- Teilweise gespeicherte Timeline als Erfolg behandeln.
17. Beispiel: vollständige Solloperation
Input:
Project: 0–200

Act A: 0–100
  Sequence S1: 0–50
    Scene C1: 0–20
      Shot H1: 0–10
      Shot H2: 10–20
    Scene C2: 20–50
  Sequence S2: 50–100

Act B: 100–200
User zieht rechte Kante von Shot H1 von 10 auf 15.
Expected:
Shot H1: 0–15
Shot H2: 15–25

Scene C1: 0–25
Scene C2: 25–55

Sequence S1: 0–55
Sequence S2: 55–105

Act A: 0–105
Act B: 105–205
Changed IDs:
H1
H2
C1
C2
S1
S2
A
B
Nicht changed:
unbeteiligte Items links vom Editpunkt
unbeteiligte Items in anderen Parent-Branches
18. Definition of Done
Die Umsetzung ist erst abgeschlossen, wenn:
1. Structure-Trim läuft vollständig über TimelineTree.
2. Act/Sequence/Scene/Shot haben denselben Preview-Pfad.
3. Hierarchical Ripple funktioniert für grow und shrink.
4. Magnetic Snap funktioniert scope-aware.
5. Parent Auto-Fit funktioniert über alle Ebenen.
6. No React state during pointermove.
7. No API during pointermove.
8. No raw pct layout source.
9. Persistenz ist robust gegen Teilfehler.
10. Nach Reload bleibt Layout identisch.
11. Alte konkurrierende Engine-Dateien sind entfernt oder vollständig entkoppelt.
12. Tests decken Engine, Tree, Preview, Persistenz und Hook ab.
13. VET enthält keine monolithische Structure-Trim-Engine mehr.
14. Keine Act-Sonderlogik mehr.
19. Reihenfolge der Umsetzung
Implementiere exakt in dieser Reihenfolge:
1. TimelineTree types.
2. buildTimelineTree.
3. validateTimelineTree / invariants.
4. diffTreeToPatches.
5. snap helpers.
6. hierarchical ripple engine.
7. engine tests.
8. DOM preview.
9. preview tests.
10. persist layer.
11. persist tests.
12. useStructureTrimSession.
13. hook tests.
14. VET Integration hinter Feature Flag.
15. Manuelle User-Journey-Tests.
16. Entfernen alter Structure-Trim-Pfade.
17. Entfernen alter ungenutzter Module.
18. Final regression test.
Feature Flag für Integration:
const USE_HIERARCHICAL_STRUCTURE_RIPPLE = true;
Feature Flag ist nur für sichere Integration erlaubt, nicht als dauerhafte Übergangslösung.
20. Kurze technische Diagnose, die dieser Umbau behebt
Der aktuelle Zustand ist fehleranfällig, weil:
Act ist ein Sonderpfad.
Static Render und Live Preview nutzen unterschiedliche Geometrien.
pct_from/pct_to ist zu stark Layout-Wahrheit.
Parent-Sync ist deaktiviert.
Der aktuelle Structure-Trim ist überwiegend Roll/Pair, nicht Bubble-Ripple.
VET enthält zu viel Domain-Logik.
Diese Umsetzung behebt das durch:
eine einzige Tree-Wahrheit,
eine einzige Ripple-Engine,
eine einzige Preview-Schicht,
eine klare Persistenzschicht,
eine klare User-Operation pro Drag.
Implementiere nicht weniger als das.




Keine normale CapCut-Timeline und auch keinen simplen Parent/Child-Container.
Du willst dieses Modell:
Project Timeline
  Act Lane
    Act 1
    Act 2
    Act 3

  Sequence Lane
    Sequence 1.1 inside Act 1
    Sequence 1.2 inside Act 1
    Sequence 2.1 inside Act 2

  Scene Lane
    Scene 1.1.1 inside Sequence 1.1
    Scene 1.1.2 inside Sequence 1.1

  Shot Lane
    Shot 1.1.1.1 inside Scene 1.1.1
Und jede Ebene soll zwei Dinge gleichzeitig können:
1. Ripple innerhalb der eigenen Lane.
2. Parent-Container wächst/schrumpft mit, wenn Childs mehr oder weniger Raum brauchen.
Das ist hierarchischer lane-local ripple mit parent auto-fit.
Das ist nicht exakt CapCut. Das ist CapCut-ähnliche Drag-Physik plus ein eigenes verschachteltes Story-Container-Modell.
Was du eigentlich bauen willst
Ebene 1: Acts ripplen gegen Acts
[Act 1][Act 2][Act 3]
Wenn Act 1 länger wird:
[Act 1----][Act 2][Act 3]
          ↑ Act 2 und Act 3 rücken nach rechts
Das ist Act-lane ripple.
Ebene 2: Sequences ripplen innerhalb ihres Acts
Act 1:
[Seq 1][Seq 2][Seq 3]
Wenn Seq 1 länger wird:
Act 1:
[Seq 1----][Seq 2][Seq 3]
Jetzt muss Act 1 mitwachsen:
Act 1 duration += delta
Act 2 start += delta
Act 3 start += delta
Das ist der entscheidende Punkt.
Sequence-Ripple ist lokal in Act 1, aber die daraus entstehende Act-Vergrößerung ripplet danach auf der Act-Lane weiter.
Ebene 3: Scenes ripplen innerhalb ihrer Sequence
Sequence 1:
[Scene 1][Scene 2][Scene 3]
Wenn Scene 1 länger wird:
Scene 2 und Scene 3 rücken innerhalb Sequence 1 nach rechts.
Sequence 1 wird länger.
Nachfolgende Sequences im selben Act rücken nach rechts.
Act wird länger.
Nachfolgende Acts rücken nach rechts.
Das ist Bubble-Ripple.
Ebene 4: Shots ripplen innerhalb ihrer Scene
Shot länger
→ nachfolgende Shots in Scene rücken
→ Scene wächst
→ nachfolgende Scenes rücken
→ Sequence wächst
→ nachfolgende Sequences rücken
→ Act wächst
→ nachfolgende Acts rücken
Das ist dein Zielmodell.
Das Problem
Dein aktueller Code macht das nicht.
Der aktuelle Code macht laut Analyse größtenteils Roll / Pair-Redistribution, nicht hierarchisches Ripple. Bei Roll wird eine Grenze zwischen zwei Nachbarn verschoben: einer wird größer, der andere kleiner. Die Gesamtlänge des Parents bleibt gleich. Außerdem ist timeline-trim-parent-sync.ts aktuell ein No-op; Parent-Patches sind also fachlich deaktiviert.
Das bedeutet:
Du erwartest:
Child wächst → Parent wächst → nächste Siblings rücken.

Der Code macht:
Boundary bewegt sich → Nachbar schrumpft/expandiert → Parent bleibt gleich.
Das ist der Grundkonflikt.
Warum es bisher immer kaputt wird
Weil drei verschiedene Konzepte vermischt wurden:
1. Roll
[Scene A][Scene B]
Boundary nach rechts:
[Scene A----][B]
Parent bleibt gleich.
2. Ripple
[Scene A][Scene B][Scene C]
Scene A länger:
[Scene A----][Scene B][Scene C]
Parent wird länger oder der Inhalt rechts rückt.
3. Parent Auto-Fit
Parent duration = max(child.end) - min(child.start)
Parent wird aus Childs berechnet.
Dein Ziel braucht Ripple + Parent Auto-Fit + Propagation nach oben.
Der aktuelle Code hat aber:
Roll/Pair-Logik aktiv
Parent-Sync deaktiviert
Expand-only Module teilweise vorhanden
Preserve/Reproject Module teilweise vorhanden, aber nicht konsequent aktiv
Act-Preview als Sonderpfad
pct_from/pct_to als Layout-Wahrheit
Deshalb kann die KI das nicht sauber reparieren, indem sie „ein bisschen Ripple“ ergänzt. Das Zielmodell ist im Code nicht eindeutig.
Die richtige Bezeichnung für dein Ziel
Nenne es nicht einfach „CapCut Ripple“.
Nenne es:
Hierarchical Ripple Timeline
oder genauer:
Nested lane-local ripple with ancestor auto-fit propagation
Auf Deutsch:
Verschachtelte Timeline mit lane-lokalem Ripple und automatischer Parent-Propagation.
Das ist die präziseste Beschreibung.
Die wichtigste Regel
Jede Trim-Operation braucht einen Scope.
Beispiel: Shot wird länger.
Operation:
resize Shot 1 by +10s

Scope 1:
Ripple alle Shots rechts davon innerhalb derselben Scene.

Dann:
Scene contentEnd wächst um +10s.

Scope 2:
Ripple alle Scenes rechts davon innerhalb derselben Sequence.

Dann:
Sequence contentEnd wächst um +10s.

Scope 3:
Ripple alle Sequences rechts davon innerhalb desselben Act.

Dann:
Act contentEnd wächst um +10s.

Scope 4:
Ripple alle Acts rechts davon innerhalb des Projekts.
Das ist eine Kaskade.
Nicht ein einziger DOM-Drag.
Wie die Daten dafür aussehen müssen
Du brauchst als Wahrheit:
type TimelineItem = {
  id: string;
  type: "act" | "sequence" | "scene" | "shot";
  parentId: string | null;
  startSec: number;
  endSec: number;
  durationSec: number;
  orderIndex: number;
  locked?: boolean;
};
Nicht primär:
metadata: {
  pct_from: number;
  pct_to: number;
}
pct_from/pct_to kann man später daraus ableiten. Aber der Ripple muss in Sekunden/Frames rechnen.
Der Kernalgorithmus
Bei jeder Längenänderung:
resizeItem(itemId, newEndSec)

1. delta = newEndSec - oldEndSec

2. Item verlängern/verkürzen

3. Alle Siblings rechts vom alten Ende im selben Parent um delta verschieben

4. Parent neu fitten:
   parent.start = min(children.start)
   parent.end = max(children.end)

5. parentDelta = newParentEnd - oldParentEnd

6. Wenn parentDelta != 0:
   Wiederhole Ripple auf Parent-Ebene

7. Bis Projektwurzel erreicht ist
Das ist das, was bei dir fehlt.
Beispiel konkret
Vorher:
Act 1:      0–100
  Seq 1:    0–50
    Scene 1: 0–20
    Scene 2: 20–50
  Seq 2:    50–100

Act 2:      100–200
Scene 1 wird um +10 verlängert:
Scene 1: 0–30
Scene 2: 30–60
Sequence 1 muss wachsen:
Seq 1: 0–60
Seq 2: 60–110
Act 1 muss wachsen:
Act 1: 0–110
Act 2: 110–210
Das ist dein gewünschtes Verhalten.
Was beim Kürzen passiert
Kürzen ist schwieriger.
Beispiel:
Scene 1: 0–30
Scene 2: 30–60
Scene 1 wird um -10 gekürzt:
Scene 1: 0–20
Scene 2: 20–50
Sequence 1 kann jetzt kürzer werden:
Seq 1: 0–50
Dann rückt Seq 2 nach links:
Seq 2: 50–100
Act 1 kann kürzer werden:
Act 1: 0–100
Act 2 rückt zurück
Aber nur, wenn keine anderen Childs den Parent noch ausfüllen.
Deshalb brauchst du:
Parent.end = max(child.end)
Nicht blind:
Parent.end += delta
Sonst schrumpft der Parent falsch, obwohl innen noch Childs liegen.
Magnetic Snap ist ein eigenes Thema
Magnetic Snap ist nicht Ripple.
Magnetic Snap bedeutet nur:
Wenn Boundary nah an anderer Boundary ist,
setze Boundary exakt auf diese Kante.
Beispiel:
newEndSec = 49.92
Snap Edge = 50.00
Snap Threshold = 0.15s
→ newEndSec = 50.00
Das passiert vor dem Ripple.
Richtige Reihenfolge:
Pointer bewegt sich
→ berechne gewünschte Zeit
→ snappe Zeit an magnetische Kanten
→ validiere gegen Child-Hulls / Min-Duration
→ führe Ripple-Operation aus
→ preview per transform
Was das konkrete Problem in Scriptony ist
Problem 1: Parent-Sync ist deaktiviert
Die Analyse zeigt: timeline-trim-parent-sync.ts gibt überall NO_PARENT_PATCHES zurück. Damit kann dein gewünschtes Parent-Mitwachsen nicht funktionieren.
Problem 2: Aktueller Structure-Trim ist Roll, nicht Bubble-Ripple
Act/Sequence/Scene/Shot machen laut Analyse überwiegend Roll oder Pair-Redistribution. Das heißt: Ein Nachbar absorbiert das Delta, statt dass der Parent wächst und nachfolgende Container rücken.
Problem 3: Prozentmodell verhindert saubere Propagation
Wenn Sequence-Pct relativ zum Act ist und der Act wächst, ändern sich die globalen Positionen der Sequences, obwohl du vielleicht nur eine lokale Änderung wolltest.
Deshalb muss die Operation intern in Sekunden/Frames laufen.
Problem 4: Act-Preview ist ein Sonderpfad
Acts werden nicht wie andere Elemente über rAF + transform previewed, sondern über React-State und left/width. Das erklärt das Ruckeln, unabhängig von der Ripple-Logik.
Problem 5: Es gibt keine zentrale Operation Engine
Aktuell steckt zu viel in VideoEditorTimeline.tsx. Die Analyse nennt eine monolithische Datei mit ca. 8200 Zeilen und einem riesigen handleTrimClipMove.
Dein Zielmodell braucht aber eine saubere Engine:
trim item
→ compute snapped boundary
→ apply local ripple
→ fit parent
→ propagate parent delta
→ return patches
Der harte Punkt
Du willst zwei Dinge kombinieren, die in klassischen Editoren meist getrennt sind:
1. CapCut-artiges Timeline-Feeling
2. Verschachtelte dramaturgische Container, die automatisch mitwachsen
Das geht. Aber dann darfst du nicht CapCut 1:1 kopieren.
Du brauchst:
CapCut UI-Physik
+
eigene hierarchische Ripple-Engine
Zielverhalten präzise formuliert
Das sollte deine Ziel-Spezifikation sein:
Scriptony Structure Timeline verwendet eine hierarchische Ripple-Engine.

Jede Ebene hat eine eigene Lane:
Act, Sequence, Scene, Shot.

Jedes Element hat startSec/endSec in einer globalen Projektzeit.
Parent/Child-Zugehörigkeit wird über parentId modelliert.

Wenn ein Element verlängert oder verkürzt wird:
1. Es ripplen alle rechten Geschwister innerhalb desselben Parents.
2. Der Parent passt seine Dauer an den neuen Child-Hull an.
3. Wenn sich der Parent verändert, ripplen dessen rechte Geschwister innerhalb seines Parents.
4. Dieser Vorgang propagiert bis zur Project-Root.
5. Magnetic Snap wird vor der Ripple-Berechnung auf die bewegte Boundary angewendet.
6. Preview läuft ausschließlich über rAF + DOM transform.
7. Persistenz passiert einmal auf pointerup.
Das ist exakt das, worauf du hinaus willst.
Was du der Coding-KI sagen musst
Nicht:
Mach Ripple wie CapCut.
Sondern:
Implementiere eine hierarchische Ripple-Engine mit lane-local ripple und ancestor auto-fit propagation.

Default-Verhalten:
- Trim auf Act ripplet nachfolgende Acts.
- Trim auf Sequence ripplet nachfolgende Sequences im selben Act.
- Wenn der Act dadurch größer/kleiner wird, ripplen nachfolgende Acts.
- Trim auf Scene ripplet nachfolgende Scenes in derselben Sequence.
- Wenn die Sequence dadurch größer/kleiner wird, ripplen nachfolgende Sequences im selben Act und danach ggf. Acts.
- Trim auf Shot ripplet nachfolgende Shots in derselben Scene und propagiert danach nach oben.
- Parent-Dauer wird aus Child-Hull berechnet, nicht manuell per DOM gesetzt.
- Magnetic Snap wird vor der Ripple-Operation angewandt.
- Preview darf niemals React-State pro pointermove auslösen.
Enddiagnose
Du willst ein legitimes, aber anspruchsvolleres Modell als CapCut.
Das aktuelle Problem ist nicht, dass deine Idee falsch ist.
Das Problem ist:
Der aktuelle Code implementiert nicht dein gewünschtes Modell.
Er implementiert Roll/Pair-Verhalten mit deaktiviertem Parent-Sync,
während du hierarchisches Ripple mit Parent Auto-Fit erwartest.
Deshalb fühlt es sich falsch an, obwohl einzelne Teile technisch „funktionieren“.
Der erste technische Fix bleibt Smoothness:
Act-Preview auf rAF + transform bringen.
Der erste fachliche Fix ist aber:
Roll/Pair als Default entfernen oder als separaten Modus behandeln.
Stattdessen eine echte hierarchical ripple operation engine einführen.
