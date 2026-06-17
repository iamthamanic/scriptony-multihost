# T72 — Timeline lib boundary

**Status:** done  
**Typ:** implementation

## Ziel

`src/lib/**` importiert keine React-Komponenten. Timeline-Typen leben in `src/lib/`.

## Änderungen

- [`src/lib/book-timeline-data.ts`](../src/lib/book-timeline-data.ts) — `BookTimelineData`
- [`src/lib/timeline-map.ts`](../src/lib/timeline-map.ts) — imports from lib only
- [`src/lib/api-adapter/timeline-bundle.ts`](../src/lib/api-adapter/timeline-bundle.ts) — same
- [`BookDropdownView.tsx`](../src/components/book/BookDropdownView.tsx) — imports `BookTimelineData` from lib (dead re-export removed T76)
- [`.dependency-cruiser.json`](../.dependency-cruiser.json) — rule `lib-not-components`

## Gate

```bash
npm run typecheck
npx depcruise src/lib --config .dependency-cruiser.json
```
