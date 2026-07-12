# Understand Anything (Scriptony)

[Understand Anything](https://github.com/Egonex-AI/Understand-Anything) erzeugt aus Code einen **Knowledge Graph** (`.understand-anything/knowledge-graph.json`) plus interaktives Dashboard — ergänzt LightRAG (`scripts/rag-start.sh`), ersetzt es nicht.

## Einmal-Setup

```bash
bash scripts/understand-anything-setup.sh
```

Danach **Cursor neu starten** (Skills aus `.agents/skills/` laden).

Optional zusätzlich: **Cursor Settings → Plugins** → `https://github.com/Egonex-AI/Understand-Anything` hinzufügen.

## Timeline-Scope (Empfehlung für Structure Playback)

Zwei getrennte Läufe (Plugin analysiert jeweils ein Wurzelverzeichnis):

```text
/understand src/hooks/timeline --language de
/understand src/components/structure/timeline --language de
/understand-dashboard
/understand-chat Wie fließt Play/Pause vom Button zum Playhead?
/understand-diff
```

Konfiguration: `.understand-anything/config.json` (`language: de`, Timeline-Pfade unter `scopes`).

## Git

Committen (optional, fürs Team):

- `.understand-anything/knowledge-graph.json`
- `.understand-anything/config.json`

Nicht committen:

- `.understand-anything/intermediate/`
- `.understand-anything/diff-overlay.json`

Bei Graph > ~10 MB: [git-lfs](https://git-lfs.com/) für `*.json` in `.understand-anything/`.

## Update

```bash
bash scripts/understand-anything-setup.sh
```

Upstream pull + Core-Rebuild + Skill-Symlinks.

## Verhältnis zu LightRAG

| Tool | Stärke |
|------|--------|
| **LightRAG** | Semantische Queries über die ganze Codebase (`mcp__lightrag__query`) |
| **Understand Anything** | Struktur-Graph, Tours, Diff-Impact, Dashboard |
