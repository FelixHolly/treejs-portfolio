import { AdditiveBlending, Scene, Vector3 } from "three";
import { Dust, DUST, dustLevel } from "./dust";
import { ROTUNDA } from "./layout";

const DARK = 0.3;
const FRAME = 0.1;

describe("dustLevel", () => {
  it("comes up with the lights", () => {
    expect(dustLevel(0, 0)).toBe(0);
    expect(dustLevel(0.5, 0)).toBe(0.5);
    expect(dustLevel(1, 0)).toBe(1);
  });

  it("holds for the first seconds, then fades to nothing by eight seconds after the lights have risen", () => {
    expect(dustLevel(1, DUST.fadesFrom)).toBe(1);
    expect(dustLevel(1, 6)).toBeGreaterThan(0);
    expect(dustLevel(1, 6)).toBeLessThan(dustLevel(1, 5));
    expect(DUST.gone).toBe(8);
    expect(dustLevel(1, DUST.gone)).toBe(0);
    expect(dustLevel(1, 20)).toBe(0);
  });
});

describe("Dust", () => {
  /** Runs frames at one statue level until `seconds` have passed, and reports whether the last one still needed more. */
  function run(dust: Dust, seconds: number, lionLevel: number, progress = 0, allowed = true): boolean {
    let needsFrames = false;
    for (let passed = 0; passed < seconds - 1e-9; passed += FRAME) needsFrames = dust.update(FRAME, progress, lionLevel, allowed);
    return needsFrames;
  }

  function level(dust: Dust): number {
    return dust.objects[0].material.uniforms["level"].value;
  }

  it("is one cloud of a few dozen points, added to the light and drawn without any image", () => {
    const dust = new Dust(true);
    const [points] = dust.objects;

    expect(dust.objects.length).toBe(1);
    expect(points.isPoints).toBeTrue();
    expect(points.geometry.getAttribute("position").count).toBe(DUST.motes);
    expect(DUST.motes).toBeGreaterThanOrEqual(24);
    expect(DUST.motes).toBeLessThanOrEqual(60);
    expect(points.material.blending).toBe(AdditiveBlending);
    expect(points.material.depthWrite).toBeFalse();
    expect(Object.keys(points.material.uniforms).sort()).toEqual(["halfHeight", "level", "time", "tint"]);
  });

  it("hangs every mote inside the key light's beam, above the floor and round the statue", () => {
    const position = new Dust(true).objects[0].geometry.getAttribute("position");
    const lamp = new Vector3(ROTUNDA.x - 4.4, 6.6, -3.6);
    const axis = new Vector3(ROTUNDA.x, 2.5, 0).sub(lamp).normalize();

    for (let index = 0; index < position.count; index++) {
      const mote = new Vector3().fromBufferAttribute(position, index);
      expect(mote.clone().sub(lamp).angleTo(axis)).withContext(`mote ${index}`).toBeLessThan(0.44);
      expect(mote.y).toBeGreaterThan(0.4);
      expect(mote.distanceTo(new Vector3(ROTUNDA.x, 2.5, 0))).toBeLessThan(4.5);
    }
  });

  it("scatters the motes the same way every time", () => {
    const first = new Dust(true).objects[0].geometry.getAttribute("position").array;
    const second = new Dust(true).objects[0].geometry.getAttribute("position").array;

    expect(Array.from(first)).toEqual(Array.from(second));
  });

  it("waits, asking for no frames, until the statue's lights begin to rise", () => {
    const dust = new Dust(true);

    expect(run(dust, 1, DARK)).toBeFalse();
    expect(level(dust)).toBe(0);
    expect(dust.settled).toBeFalse();
  });

  it("comes up with the lights and keeps asking for frames while it drifts", () => {
    const dust = new Dust(true);
    dust.update(FRAME, 0, DARK, true);

    expect(dust.update(FRAME, 0, 0.65, true)).toBeTrue();
    expect(level(dust)).toBeCloseTo(0.5, 5);
    expect(run(dust, 1, 1)).toBeTrue();
    expect(level(dust)).toBe(1);
  });

  it("moves: its clock runs on while it drifts", () => {
    const dust = new Dust(true);
    dust.update(FRAME, 0, DARK, true);
    run(dust, 2, 1);

    expect(dust.objects[0].material.uniforms["time"].value).toBeCloseTo(2, 5);
  });

  it("has faded and been taken down eight seconds after the lights finished rising, and asks for nothing more", () => {
    const scene = new Scene();
    const dust = new Dust(true);
    scene.add(...dust.objects);
    const [points] = dust.objects;
    const freed = jasmine.createSpy("freed");
    points.geometry.addEventListener("dispose", freed);
    points.material.addEventListener("dispose", freed);
    dust.update(FRAME, 0, DARK, true);

    expect(run(dust, 6, 1)).toBeTrue();
    expect(level(dust)).toBeLessThan(0.5);
    expect(run(dust, 2.1, 1)).toBeFalse();

    expect(dust.settled).toBeTrue();
    expect(dust.objects).toEqual([]);
    expect(scene.children).toEqual([]);
    expect(freed).toHaveBeenCalledTimes(2);
    expect(dust.update(FRAME, 0, 1, true)).toBeFalse();
  });

  it("fades quickly as soon as the visitor walks on", () => {
    const dust = new Dust(true);
    dust.update(FRAME, 0, DARK, true);
    run(dust, 1, 1);

    expect(dust.update(FRAME, 0.2, 1, true)).toBeTrue();
    expect(level(dust)).toBeLessThan(1);
    expect(run(dust, DUST.leaving, 1, 0.6)).toBeFalse();
    expect(dust.settled).toBeTrue();
  });

  it("keeps fading once the visitor has set off, even if they step straight back", () => {
    const dust = new Dust(true);
    dust.update(FRAME, 0, DARK, true);
    run(dust, 1, 1);
    dust.update(FRAME, 0.2, 1, true);

    expect(run(dust, DUST.leaving, 1, 0)).toBeFalse();
    expect(dust.settled).toBeTrue();
  });

  it("never starts again on a return to the entrance", () => {
    const dust = new Dust(true);
    dust.update(FRAME, 0, DARK, true);
    run(dust, 9, 1);

    expect(run(dust, 3, 1, 4)).toBeFalse();
    expect(run(dust, 3, 1, 0)).toBeFalse();
    expect(dust.objects).toEqual([]);
  });

  it("never starts for a visitor who arrives somewhere other than the entrance", () => {
    const dust = new Dust(true);

    expect(dust.update(FRAME, 4, DARK, true)).toBeFalse();
    expect(dust.settled).toBeTrue();
    expect(run(dust, 2, 1, 0)).toBeFalse();
  });

  it("is not made at all under reduced motion, at a lower quality tier or on a second look", () => {
    const dust = new Dust(false);

    expect(dust.objects).toEqual([]);
    expect(dust.settled).toBeTrue();
    expect(run(dust, 1, 1)).toBeFalse();
  });

  it("never starts when quality has already stepped down by the time the lights rise", () => {
    const dust = new Dust(true);
    dust.update(FRAME, 0, DARK, true);

    expect(dust.update(FRAME, 0, 0.6, false)).toBeFalse();
    expect(dust.settled).toBeTrue();
  });

  it("goes as soon as quality steps down while it drifts", () => {
    const dust = new Dust(true);
    dust.update(FRAME, 0, DARK, true);
    run(dust, 1, 1);

    expect(run(dust, DUST.leaving + FRAME, 1, 0, false)).toBeFalse();
    expect(dust.settled).toBeTrue();
  });
});
