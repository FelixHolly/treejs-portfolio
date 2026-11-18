export interface SceneWork {
  slug: string;
  kind: "commission" | "study";
  images: { src: string; portrait: boolean }[];
}

export interface GalleryViewOptions {
  works: readonly SceneWork[];
  frieze: readonly string[];
  reducedMotion: boolean;
  assets: { dracoPath: string; lionModel: string };
  /** Called once if the first frames average under 30 fps. */
  onSlow(): void;
}

/** What the page needs from the 3D scene; keeps three.js out of the page's own chunk. */
export interface GalleryView {
  /** Glide towards a position on the route, measured in stops (2.5 is halfway between stops 2 and 3). */
  setProgress(progress: number): void;
  jumpTo(progress: number): void;
  /** Mouse position in -1..1 on both axes, for the look-around offset. */
  setPointer(x: number, y: number): void;
  /** Call when the canvas changes size; `labelShare` is the part of its width a side label covers (0 to 1). */
  resize(labelShare: number): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

export type GallerySceneFactory = (canvas: HTMLCanvasElement, options: GalleryViewOptions) => Promise<GalleryView>;
