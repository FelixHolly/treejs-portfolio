export interface SceneWork {
  slug: string;
  kind: "commission" | "study" | "self-portrait";
  images: { src: string; portrait: boolean }[];
  film?: string;
}

export interface GalleryViewOptions {
  works: readonly SceneWork[];
  frieze: readonly string[];
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
  /** Called once if the first frames average under 30 fps. */
  onSlow(): void;
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
  /** Glide towards a position on the route, measured in stops (2.5 is halfway between stops 2 and 3). */
  setProgress(progress: number): void;
  jumpTo(progress: number): void;
  /** Mouse position in -1..1 on both axes, for the look-around offset. */
  setPointer(x: number, y: number): void;
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
