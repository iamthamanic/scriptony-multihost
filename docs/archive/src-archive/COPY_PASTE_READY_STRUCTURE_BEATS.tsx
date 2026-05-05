/**
 * 🎬 READY-TO-PASTE CODE für ProjectsPage.tsx
 * 
 * 1. Kopiere den Import oben in die Datei
 * 2. Kopiere den Section-Code in die Project-Detail-View
 */

// ═══════════════════════════════════════════════════════════════════
// SCHRITT 1: Import (füge das bei den anderen Imports hinzu)
// ═══════════════════════════════════════════════════════════════════

import { StructureBeatsSection } from '../StructureBeatsSection';


// ═══════════════════════════════════════════════════════════════════
// SCHRITT 2: Section Code (füge das in die Project-Detail-View ein)
// ═══════════════════════════════════════════════════════════════════

// Suche nach {project && ( oder nach der Stelle wo FilmDropdown verwendet wird
// Dann ERSETZE die aktuelle "Structure & Beats" Section oder FilmDropdown durch:

<StructureBeatsSection
  projectId={project.id}
  className="mb-6"
/>


// ═══════════════════════════════════════════════════════════════════
// VOLLSTÄNDIGES BEISPIEL (Kontext zeigt wo es hingehört)
// ═══════════════════════════════════════════════════════════════════

{project && (
  <div className="p-6 space-y-6">
    
    {/* Projekt-Info (bestehend) */}
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{project.title}</h1>
        <Button variant="ghost" onClick={() => setSelectedProject(null)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
      </div>
      {/* ... Cover, Logline, Duration, Genres ... */}
    </section>

    {/* ⭐⭐⭐ NEU: Structure & Beats mit Beat-Rail ⭐⭐⭐ */}
    <StructureBeatsSection
      projectId={project.id}
      className="mb-6"
    />

    {/* Charaktere (bestehend) */}
    <Collapsible>
      <div className="flex items-center justify-between mb-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Charaktere ({charactersState.length})
              <ChevronDown className="h-4 w-4" />
            </h2>
          </Button>
        </CollapsibleTrigger>
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={() => setShowNewCharacter(true)}
          className="h-8 bg-[rgba(110,89,165,1)] text-[rgba(255,255,255,1)]"
        >
          <Plus className="size-3.5 mr-1.5" />
          Neu
        </Button>
      </div>
      <CollapsibleContent>
        {/* ... Charaktere Liste ... */}
      </CollapsibleContent>
    </Collapsible>

    {/* Inspiration (bestehend) */}
    <Collapsible>
      <div className="flex items-center justify-between mb-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Inspiration ({inspirations.length})
              <ChevronDown className="h-4 w-4" />
            </h2>
          </Button>
        </CollapsibleTrigger>
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={() => setShowAddInspirationDialog(true)}
          className="h-8 bg-[rgba(110,89,165,1)] text-[rgba(255,255,255,1)]"
        >
          <Plus className="size-3.5 mr-1.5" />
          Neu
        </Button>
      </div>
      <CollapsibleContent>
        {/* ... Inspiration Grid ... */}
      </CollapsibleContent>
    </Collapsible>

  </div>
)}


// ═══════════════════════════════════════════════════════════════════
// ALTERNATIVE: Wenn FilmDropdown direkt verwendet wird
// ═══════════════════════════════════════════════════════════════════

// Falls du irgendwo sowas siehst:

<FilmDropdown
  projectId={project.id}
  initialData={timelineData}
  onDataChange={handleTimelineChange}
/>

// ERSETZE ES DURCH:

<StructureBeatsSection
  projectId={project.id}
  initialData={timelineData}
  onDataChange={handleTimelineChange}
  className="mb-6"
/>


// ═══════════════════════════════════════════════════════════════════
// WAS SICH ÄNDERT:
// ═══════════════════════════════════════════════════════════════════

// VORHER:
// - Nur Acts/Sequences/Scenes/Shots (Dropdown)
// - Keine Beat-Rail

// NACHHER:
// - ⭐ Lila Beat-Rail (80px links)
// - ⭐ Beat-Bands in der Rail (klickbar, editierbar)
// - ⭐ Acts/Sequences/Scenes/Shots (Dropdown, wie vorher)
// - ⭐ Dropdown/Timeline Toggle
// - ⭐ "+ Act hinzufügen" Button


// ═══════════════════════════════════════════════════════════════════
// VISUELLE BESTÄTIGUNG (du solltest das sehen):
// ═══════════════════════════════════════════════════════════════════

/*
┌──────────────────────────────────────────────────────────────┐
│  Structure & Beats    [∧]  [Dropdown][Timeline]  [+Act]      │
├────┬─────────────────────────────────────────────────────────┤
│    │                                                          │
│ 0% │  [🎬] > Akt 1 - Einleitung              [⋮]            │
│    │                                                          │
│    │  [🎬] > Akt I - Einführung              [⋮]            │
│[STC│                                                          │
│25%]│  [🎬] > Akt III - Auflösung             [⋮]            │
│    │                                                          │
│    │                                                          │
│[STC│                                                          │
│50%]│                                                          │
│    │                                                          │
│    │                                                          │
│75% │                                                          │
│    │                                                          │
│100%│                                                          │
└────┴─────────────────────────────────────────────────────────┘

Links: 80px lila Beat-Rail mit [STC 25%] etc.
Rechts: Acts/Sequences/Scenes/Shots wie gewohnt
*/


// ═══════════════════════════════════════════════════════════════════
// FERTIG! 🎉
// ═══════════════════════════════════════════════════════════════════

// Nach dem Copy-Paste solltest du die Beat-Rail sofort sehen!
// Klick auf einen lila Beat-Band → expandiert → Edit-Form
// Container collapse/expand → Beats passen sich automatisch an
