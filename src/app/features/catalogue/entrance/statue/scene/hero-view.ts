/** What the entrance needs from its live statue; keeps three.js out of the catalogue's own chunk. */
export interface HeroView {
  /** The mouse in -1..1 across and down the window. */
  setPointer(x: number, y: number): void;
  /** How far the statue has scrolled away, 0 to 1. */
  setScroll(share: number): void;
  /** Call when the canvas changes size. Dust drifts only below `ceiling`, a share of the way down the canvas, 0 to 1. */
  resize(ceiling: number): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

export interface HeroViewOptions {
  assets: { dracoPath: string; lionModel: string };
  /** Called once, after the first frame with the statue in it has been drawn. */
  onReady(): void;
  /** Called once if the scene cannot go on: the statue did not load, the graphics context went, or frames stayed too slow. */
  onLost(): void;
}

export type HeroSceneFactory = (canvas: HTMLCanvasElement, options: HeroViewOptions) => Promise<HeroView>;

/** The walk round the statue, in radians: for the mouse at the window's edge, and for the statue scrolled wholly away. */
export const TURN = { pointer: 0.1, scroll: 0.3 } as const;
/** How far the eye rises or sinks with the mouse at the window's top or bottom, in metres. */
export const LIFT = 0.22;
/** The light left on the statue once it has scrolled away, and the stretch of the scroll over which it goes. */
const SHADOW = { level: 0.1, from: 0.12, to: 0.85 } as const;

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/** `reach` is how far the page must scroll for the statue to be gone; a bounce above the top counts as the top. */
export function scrollShare(scrollY: number, reach: number): number {
  return reach > 0 ? clamp(scrollY / reach, 0, 1) : 0;
}

/** The camera's place on its arc round the statue, in radians: towards the mouse, and on round as the page scrolls. */
export function turnFor(pointerX: number, scroll: number): number {
  return clamp(pointerX, -1, 1) * TURN.pointer + clamp(scroll, 0, 1) * TURN.scroll;
}

/** How far the eye rises, in metres: it sinks as the mouse rises, so the statue seems to lift its head towards it. */
export function liftFor(pointerY: number): number {
  return clamp(pointerY, -1, 1) * LIFT;
}

/** The light on the statue, 1 to `SHADOW.level`: it recedes into shadow as the visitor scrolls on. */
export function levelFor(scroll: number): number {
  const gone = clamp((scroll - SHADOW.from) / (SHADOW.to - SHADOW.from), 0, 1);
  return 1 - (1 - SHADOW.level) * gone * gone * (3 - 2 * gone);
}
