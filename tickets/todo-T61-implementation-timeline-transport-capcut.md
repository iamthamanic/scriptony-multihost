# Ticket T61 — Timeline Transport (CapCut / TheStuu-like)

**Status:** at-work  
**Type:** implementation  
**Epic:** T55 Structure Timeline

## Goal

Single authoritative transport for Structure Timeline: one clock, one CSS playhead (`--playhead-left-px`), unified play/pause/stop in toolbar + preview, strategy-based playback (book / audio / film).

## Scope

- `useTimelineTransport` (replaces playhead ref loop)
- `resolveTimelineTransportGuard`
- Toolbar + Preview transport controls
- Book onTick-only word sync (no second RAF)
- Audio sync on transport tick; stop clears HTMLAudio players

## Out of scope

- Native/Tauri audio engine transport (separate epic)

## Acceptance

See `docs/STRUCTURE_TIMELINE.md` § Transport authority.

## Related

- Epic T55 (`docs/STRUCTURE_TIMELINE.md`)
- Reference: TheStuu `transport.play` / `--playhead-left-px`
