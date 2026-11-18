import { InjectionToken } from "@angular/core";
import { GallerySceneFactory } from "./scene/gallery-view";

/** Loads three.js and the scene only when the gallery is actually shown; tests swap in a fake. */
export const GALLERY_SCENE_FACTORY = new InjectionToken<GallerySceneFactory>("GALLERY_SCENE_FACTORY", {
  providedIn: "root",
  factory: () => async (canvas, options) => {
    const { GalleryScene } = await import("./scene/gallery-scene");
    return new GalleryScene(canvas, options);
  },
});
