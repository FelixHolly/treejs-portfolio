import { DestroyRef, DOCUMENT, inject, Injectable } from "@angular/core";

export type GlideOutcome = "arrived" | "interrupted";

/** Desktop Chrome times its own smooth scroll by the square root of the distance; the glide keeps that pace in every browser. */
const MS_PER_ROOT_PIXEL = 16.7;
/** A hop of a few pixels must still read as a movement, and Chrome lets no scroll, however long, run past a second and a half. */
const SHORTEST_MS = 250;
const LONGEST_MS = 1500;
/** Chrome's curve as a CSS cubic-bezier, fitted to within 2% of what it was measured to do: a short run-up, a long settling. */
const PACE = [0.4, 0, 0, 1] as const;
/** Where a visitor's own scroll begins: each takes the page back from a glide at once, but for a mouse pressed on a control. */
const TAKEOVER = ["wheel", "touchstart", "touchmove", "pointerdown"] as const;

export function glideDuration(pixels: number): number {
  return Math.min(Math.max(MS_PER_ROOT_PIXEL * Math.sqrt(Math.abs(pixels)), SHORTEST_MS), LONGEST_MS);
}

/** The share of the way covered after a share of the time, both 0 to 1. */
export function glideEase(share: number): number {
  const [x1, y1, x2, y2] = PACE;
  const along = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  // The curve gives time and way for a parameter of its own, found by halving: time only ever grows with it
  let low = 0;
  let high = 1;
  for (let pass = 0; pass < 24; pass++) {
    const middle = (low + high) / 2;
    if (along(x1, x2, middle) < share) low = middle;
    else high = middle;
  }
  return along(y1, y2, (low + high) / 2);
}

/**
 * Moves the window's scroll position to a target over a set time, frame by frame, so every browser shows
 * the same movement: Mobile Safari ends its own smooth scroll in a third of a second whatever the distance.
 */
@Injectable({ providedIn: "root" })
export class ScrollGlide {
  private readonly window = inject(DOCUMENT).defaultView;
  private end?: (outcome: GlideOutcome) => void;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());
  }

  /** True from the call that begins a glide until it has arrived or been interrupted. */
  get active(): boolean {
    return this.end !== undefined;
  }

  /**
   * Glides to wherever `target` points, asked again every frame; replaces a glide under way. `onStep` is told each position as it
   * is set. A key handler below the window that begins a glide must prevent the key's default, or that key ends it as a takeover.
   */
  to(target: () => number, onStep?: (top: number) => void): Promise<GlideOutcome> {
    const window = this.window;
    const from = window?.scrollY ?? 0;
    this.cancel();
    if (!window) return Promise.resolve("interrupted");

    return new Promise((resolve) => {
      const root = window.document.documentElement;
      const snapping = root.style.scrollSnapType;
      // A snap point would pull every step taken near it back to itself
      root.style.scrollSnapType = "none";

      // Past the page's end the browser would stop the glide short, at full speed. The window's two heights
      // can differ, by a scrollbar or a phone's toolbar; the smaller never puts that end too early
      const aim = () => {
        const reach = root.scrollHeight - Math.min(window.innerHeight, root.clientHeight);
        return Math.max(Math.min(target(), reach), 0);
      };
      let began: number | undefined;
      let duration = 0;
      let frame = 0;

      const end = (outcome: GlideOutcome) => {
        this.end = undefined;
        window.cancelAnimationFrame(frame);
        for (const type of TAKEOVER) window.removeEventListener(type, interrupt, true);
        window.removeEventListener("keydown", onKey);
        root.style.scrollSnapType = snapping;
        resolve(outcome);
      };
      // A mouse pressed on a link or a button is working that control; any other press, and every touch, may begin a scroll
      const interrupt = (event: Event) => {
        const pressed = event instanceof PointerEvent && event.pointerType === "mouse" ? event.target : null;
        if (!(pressed instanceof Element && pressed.closest("a, button"))) end("interrupted");
      };
      // A key the page handled itself is no takeover: one held down, or pressed again, would halt the very walk it asks for
      const onKey = (event: Event) => {
        if (!event.defaultPrevented) end("interrupted");
      };
      const step = (now: number) => {
        let share = 1;
        try {
          const to = aim();
          began ??= now;
          duration ||= glideDuration(to - from);
          share = Math.min((now - began) / duration, 1);
          const way = from + (to - from) * glideEase(share);
          // A fraction the window rounds off in its report could read as a step back; rounding towards the start never oversteps
          const top = share === 1 ? to : to > from ? Math.max(Math.floor(way), from) : Math.min(Math.ceil(way), from);
          // Said outright: where a stylesheet makes scrolling smooth, the default would animate every step again
          window.scrollTo({ top, behavior: "instant" });
          onStep?.(top);
        } catch (error) {
          // A caller whose step fails must not be left with a page held by a glide that will never end
          if (this.end === end) end("interrupted");
          throw error;
        }
        if (this.end !== end) return;
        if (share < 1) frame = window.requestAnimationFrame(step);
        else end("arrived");
      };

      this.end = end;
      // In the capture phase: a takeover is seen first, whatever the page then does with the event
      for (const type of TAKEOVER) window.addEventListener(type, interrupt, { capture: true, passive: true });
      // In the bubble phase, after the page's own listeners: by then it has said whether the key was its own
      window.addEventListener("keydown", onKey);
      frame = window.requestAnimationFrame(step);
    });
  }

  cancel(): void {
    this.end?.("interrupted");
  }
}
