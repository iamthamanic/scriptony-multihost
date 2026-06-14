/**
 * Swallow trailing click/pointerup after timeline drag/trim so release over
 * tabs, music/SFX lanes, or shots does not navigate (Dropdown view / openShot).
 * Location: src/lib/suppress-trailing-pointer-activation.ts
 */

const DEFAULT_SUPPRESS_MS = 300;

let suppressedUntilMs = 0;

export function isTrailingPointerActivationSuppressed(): boolean {
  return Date.now() < suppressedUntilMs;
}

/** One-shot capture-phase block for click + pointerup (CapCut-style gesture end). */
export function suppressTrailingPointerActivation(
  ms: number = DEFAULT_SUPPRESS_MS,
): void {
  suppressedUntilMs = Date.now() + ms;

  const swallow = (ev: Event) => {
    ev.stopPropagation();
    ev.preventDefault();
  };

  const cleanup = () => {
    window.removeEventListener("click", swallow, { capture: true });
    window.removeEventListener("pointerup", swallow, { capture: true });
  };

  window.addEventListener("click", swallow, { capture: true });
  window.addEventListener("pointerup", swallow, { capture: true });
  window.setTimeout(cleanup, ms);
}
