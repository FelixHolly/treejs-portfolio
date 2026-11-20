import { InjectionToken } from "@angular/core";
import { HeroSceneFactory } from "./scene/hero-view";

/** Loads three.js and the statue's scene only when the entrance comes alive; tests swap in a fake. */
export const HERO_SCENE_FACTORY = new InjectionToken<HeroSceneFactory>("HERO_SCENE_FACTORY", {
  providedIn: "root",
  factory: () => async (canvas, options) => {
    const { HeroScene } = await import("./scene/hero-scene");
    return new HeroScene(canvas, options);
  },
});
