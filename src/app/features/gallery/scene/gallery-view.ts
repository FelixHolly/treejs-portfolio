export interface SceneWork {
  slug: string;
  kind: "commission" | "study" | "self-portrait";
  images: { src: string; portrait: boolean }[];
  film?: string;
}

export interface GalleryViewOptions {
  works: readonly SceneWork[];
  /** Names lettered on the board behind the visitors' book. */
  visitors: readonly string[];
  /** The picture in the first frame of Room I. */
  portrait: string;
  /** One plaque on Room I's wall per area, lettered with its tools. */
  skills: readonly { area: string; tools: readonly string[] }[];
  reducedMotion: boolean;
  /** False when nothing may play by itself: reduced motion, or a visitor saving data. */
  films: boolean;
  assets: { dracoPath: string; lionModel: string };
  /** Called once if the film cannot be played, so the page can withdraw its control. */
  onFilmLost(): void;
  /** Called once if the scene is still too slow to watch after giving up all the quality it can. */
  onSlow(): void;
  /** Called with the stop of the piece the mouse has come to point at, and with null once it points at none. */
  onPointed(stop: number | null): void;
  /** Called with the stop of a piece the visitor clicked; the page decides what that does. */
  onChosen(stop: number): void;
}

/** Where the page's own text sits over the scene, so the camera can frame each piece clear of it. */
export interface PageFraming {
  /** The part of the width a side label covers (0 to 1); 0 when labels lie over the scene. */
  labelShare: number;
  /** Top and bottom of the band the entrance text leaves free for the statue, as shares of the height. */
  statueBand: readonly [top: number, bottom: number];
}

/** The statue's band until the page has measured its entrance text. */
export const OPEN_BAND: PageFraming["statueBand"] = [0.33, 0.82];

/** What the page needs from the 3D scene; keeps three.js out of the page's own chunk. */
export interface GalleryView {
  /**
   * Glide towards a position on the route, measured in stops (2.5 is halfway between stops 2 and 3).
   * `bound` is the stop a walk the page began is headed for, when that lies further on.
   */
  setProgress(progress: number, bound?: number): void;
  jumpTo(progress: number): void;
  /** Mouse position in -1..1 on both axes, for the look-around offset. */
  setPointer(x: number, y: number): void;
  /** The mouse over the bare scene, in -1..1 across and down the canvas: the piece there, if any, is reported and lit. */
  pointAt(x: number, y: number): void;
  /** The mouse has left the bare scene, for the page's own text or for good. */
  pointAway(): void;
  /** A click on the bare scene at that place; a piece there is reported as chosen. */
  click(x: number, y: number): void;
  /** Call when the canvas changes size or the page's text moves. */
  resize(framing: PageFraming): void;
  setPaused(paused: boolean): void;
  /** Holds or releases the film in a work's frame; the scene alone decides when a released film plays. */
  setFilmHeld(held: boolean): void;
  /** Sends the envelope on the writing desk into the letterbox, once the visitor's letter has gone. */
  post(): void;
  dispose(): void;
}

export type GallerySceneFactory = (canvas: HTMLCanvasElement, options: GalleryViewOptions) => Promise<GalleryView>;
