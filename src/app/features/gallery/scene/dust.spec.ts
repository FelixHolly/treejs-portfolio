import { AdditiveBlending, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { Dust, DUST, dustLevel, DustMoment, dustPresence, FALL } from "./dust";
import { ROTUNDA } from "./layout";

const DARK = 0.3;
const FRAME = 0.1;

describe("dustLevel", () => {
  const lit: DustMoment = { rise: 1, progress: 0, presence: 1, reducedMotion: false, allowed: true };

  it("comes up with the lights", () => {
    expect(dustLevel({ ...lit, rise: 0 })).toBe(0);
    expect(dustLevel({ ...lit, rise: 0.5 })).toBe(0.5);
    expect(dustLevel(lit)).toBe(1);
    expect(dustLevel({ ...lit, rise: 1.4 })).toBe(1);
  });

  it("is full at the entrance and thins evenly to nothing by two fifths of the way to Room I", () => {
    expect(DUST.thinsBy).toBe(0.4);
    expect(dustLevel({ ...lit, progress: 0.04 })).toBeCloseTo(0.9, 6);
    expect(dustLevel({ ...lit, progress: 0.1 })).toBeCloseTo(0.75, 6);
    expect(dustLevel({ ...lit, progress: 0.2 })).toBeCloseTo(0.5, 6);
    expect(dustLevel({ ...lit, progress: 0.3 })).toBeCloseTo(0.25, 6);
    expect(dustLevel({ ...lit, progress: 0.4 })).toBe(0);
    expect(dustLevel({ ...lit, progress: 0.45 })).toBe(0);
    expect(dustLevel({ ...lit, progress: 6 })).toBe(0);
  });

  it("is the same on the way back as on the way out", () => {
    for (const progress of [0.3, 0.2, 0.1, 0]) {
      expect(dustLevel({ ...lit, progress })).toBeCloseTo(1 - progress / 0.4, 6);
    }
  });

  it("follows how awake the dust is", () => {
    expect(dustLevel({ ...lit, presence: 0 })).toBe(0);
    expect(dustLevel({ ...lit, presence: 0.5, progress: 0.2 })).toBeCloseTo(0.25, 6);
  });

  it("is nothing under reduced motion and once quality has stepped down", () => {
    expect(dustLevel({ ...lit, reducedMotion: true })).toBe(0);
    expect(dustLevel({ ...lit, allowed: false })).toBe(0);
  });
});

describe("dustPresence", () => {
  /** The presence after `seconds` more of a visitor already idle for `idle` seconds, in frames. */
  function after(presence: number, idle: number, seconds: number): number {
    for (let passed = 0; passed < seconds - 1e-9; passed += FRAME) presence = dustPresence(presence, (idle += FRAME), FRAME);
    return presence;
  }

  it("stays whole for a minute without the visitor doing anything", () => {
    expect(DUST.idleAfter).toBe(60);
    expect(after(1, 0, 59.8)).toBe(1);
  });

  it("then settles over about four seconds", () => {
    expect(after(1, 60, 2)).toBeCloseTo(0.5, 1);
    expect(after(1, 60, 3.8)).toBeGreaterThan(0);
    expect(after(1, 60, 4.2)).toBe(0);
    expect(after(0, 200, 5)).toBe(0);
  });

  it("comes back over about a second and a half once the visitor stirs", () => {
    expect(after(0, 0, 0.7)).toBeCloseTo(0.5, 1);
    expect(after(0, 0, 1.3)).toBeLessThan(1);
    expect(after(0, 0, 1.6)).toBe(1);
  });

  it("turns round from wherever it had got to, without a jump", () => {
    const half = after(1, 60, 2);

    expect(dustPresence(half, 0, FRAME)).toBeCloseTo(half + FRAME / DUST.wakes, 6);
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

  /** A cloud whose lights have risen, with the visitor at the entrance. */
  function drifting(): Dust {
    const dust = new Dust(false);
    dust.update(FRAME, 0, DARK, true);
    run(dust, 1, 1);
    return dust;
  }

  it("is one cloud of a few dozen points, added to the light and drawn without any image", () => {
    const dust = new Dust(false);
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
    const position = new Dust(false).objects[0].geometry.getAttribute("position");
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
    const first = new Dust(false).objects[0].geometry.getAttribute("position").array;
    const second = new Dust(false).objects[0].geometry.getAttribute("position").array;

    expect(Array.from(first)).toEqual(Array.from(second));
  });

  it("fades a mote out as the camera comes up to it, between two metres and sixty centimetres", () => {
    const { vertexShader } = new Dust(false).objects[0].material;

    expect(DUST.near).toBe(0.6);
    expect(DUST.clear).toBe(2);
    expect(vertexShader).toContain("smoothstep(0.60, 2.00, -seen.z)");
    expect(vertexShader).toMatch(/vLight = [^;]*clearOfCamera/);
  });

  it("lets a mote fall a short way and begin again at the top, so the cloud never sinks out of the beam however long the visitor stays", () => {
    const { vertexShader } = new Dust(false).objects[0].material;

    expect(FALL.drop).toBeLessThanOrEqual(1);
    expect(vertexShader).toContain(`float fallen = fract(t * ${(FALL.rate / FALL.drop).toFixed(5)});`);
    expect(vertexShader).toContain(`(0.5 - fallen) * ${FALL.drop.toFixed(2)}`);
    expect(vertexShader).not.toMatch(/drifted = [^;]*time/);
  });

  it("keeps every mote clear of the floor through the whole of its fall", () => {
    const position = new Dust(false).objects[0].geometry.getAttribute("position");

    for (let index = 0; index < position.count; index++) {
      expect(position.getY(index) - FALL.drop / 2).withContext(`mote ${index}`).toBeGreaterThan(0.4);
    }
  });

  it("dims a mote at the foot of its fall and at the top, so it is never seen to jump from one to the other", () => {
    const { vertexShader } = new Dust(false).objects[0].material;

    expect(vertexShader).toContain("float midFall = smoothstep(0.0, 0.1, fallen) * (1.0 - smoothstep(0.9, 1.0, fallen));");
    expect(vertexShader).toMatch(/vLight = [^;]*midFall/);
  });

  it("compiles and draws every mote", () => {
    if (!document.createElement("canvas").getContext("webgl2")) pending("needs WebGL");
    const renderer = new WebGLRenderer({ canvas: document.createElement("canvas") });
    renderer.setSize(16, 16, false);
    const failed = jasmine.createSpy("shader error");
    renderer.debug.onShaderError = failed;
    const scene = new Scene();
    scene.add(...drifting().objects);
    const camera = new PerspectiveCamera(50, 1, 0.1, 50);
    camera.position.set(ROTUNDA.x - 9, 3, 0);
    camera.lookAt(ROTUNDA.x, 3, 0);

    renderer.render(scene, camera);

    expect(failed).not.toHaveBeenCalled();
    expect(renderer.info.render.points).toBe(DUST.motes);
    renderer.dispose();
    renderer.forceContextLoss();
  });

  it("waits, asking for no frames and drawing nothing, until the statue's lights begin to rise", () => {
    const dust = new Dust(false);

    expect(run(dust, 1, DARK)).toBeFalse();
    expect(level(dust)).toBe(0);
    expect(dust.objects[0].visible).toBeFalse();
  });

  it("comes up with the lights and keeps asking for frames while it drifts", () => {
    const dust = new Dust(false);
    dust.update(FRAME, 0, DARK, true);

    expect(dust.update(FRAME, 0, 0.65, true)).toBeTrue();
    expect(level(dust)).toBeCloseTo(0.5, 5);
    expect(run(dust, 1, 1)).toBeTrue();
    expect(level(dust)).toBe(1);
    expect(dust.objects[0].visible).toBeTrue();
  });

  it("moves: its clock runs on while it drifts", () => {
    const dust = drifting();
    run(dust, 1, 1);

    expect(dust.objects[0].material.uniforms["time"].value).toBeCloseTo(2, 5);
  });

  it("is still drifting, whole, long after the eight seconds it used to last", () => {
    const dust = drifting();

    expect(run(dust, 40, 1)).toBeTrue();
    expect(level(dust)).toBe(1);
  });

  it("thins as the visitor walks towards Room I, is gone and asks for nothing from two fifths of the way", () => {
    const dust = drifting();

    expect(dust.update(FRAME, 0.1, 1, true)).toBeTrue();
    expect(level(dust)).toBeCloseTo(0.75, 5);
    expect(dust.update(FRAME, 0.25, 1, true)).toBeTrue();
    expect(level(dust)).toBeCloseTo(0.375, 5);
    expect(dust.update(FRAME, 0.45, 1, true)).toBeFalse();
    expect(dust.objects[0].visible).toBeFalse();
    expect(run(dust, 5, 1, 4)).toBeFalse();
  });

  it("is there again, as it was, when the visitor walks back to the entrance", () => {
    const dust = drifting();
    run(dust, 300, 1, 5);

    expect(dust.update(FRAME, 0.3, 1, true)).toBeTrue();
    expect(level(dust)).toBeCloseTo(0.25, 5);
    expect(dust.update(FRAME, 0, 1, true)).toBeTrue();
    expect(level(dust)).toBe(1);
    expect(dust.objects[0].visible).toBeTrue();
  });

  it("comes up for a visitor who arrived somewhere else and walks to the entrance later", () => {
    const dust = new Dust(false);
    dust.update(FRAME, 4, DARK, true);

    expect(run(dust, 3, 1, 4)).toBeFalse();
    expect(dust.update(FRAME, 0, 1, true)).toBeTrue();
    expect(level(dust)).toBe(1);
  });

  it("settles after a minute without the visitor stirring, and then asks for no more frames", () => {
    const dust = drifting();

    expect(run(dust, 58, 1)).toBeTrue();
    expect(level(dust)).toBe(1);
    expect(run(dust, 3, 1)).toBeTrue();
    expect(level(dust)).toBeLessThan(1);
    expect(level(dust)).toBeGreaterThan(0);
    expect(run(dust, 3, 1)).toBeFalse();
    expect(level(dust)).toBe(0);
    expect(dust.objects[0].visible).toBeFalse();
    expect(run(dust, 30, 1)).toBeFalse();
  });

  it("never settles while the visitor keeps stirring", () => {
    const dust = drifting();
    for (let minute = 0; minute < 5; minute++) {
      run(dust, 50, 1);
      dust.stir();
    }

    expect(run(dust, 50, 1)).toBeTrue();
    expect(level(dust)).toBe(1);
  });

  it("comes back over about a second and a half when a settled visitor stirs", () => {
    const dust = drifting();
    run(dust, 70, 1);
    dust.stir();

    expect(dust.update(FRAME, 0, 1, true)).toBeTrue();
    expect(level(dust)).toBeLessThan(0.2);
    run(dust, 0.6, 1);
    expect(level(dust)).toBeCloseTo(0.47, 1);
    expect(run(dust, 1, 1)).toBeTrue();
    expect(level(dust)).toBe(1);
  });

  it("does not count the minute while the visitor is elsewhere", () => {
    const dust = drifting();
    run(dust, 600, 1, 5);

    expect(run(dust, 30, 1)).toBeTrue();
    expect(level(dust)).toBe(1);
  });

  it("is not made at all under reduced motion", () => {
    const dust = new Dust(true);

    expect(dust.objects).toEqual([]);
    expect(run(dust, 1, 1)).toBeFalse();
    expect(() => dust.stir()).not.toThrow();
    expect(() => dust.dispose()).not.toThrow();
  });

  it("is off, drawing nothing and asking for nothing, once quality has stepped down", () => {
    const dust = drifting();

    expect(dust.update(FRAME, 0, 1, false)).toBeFalse();
    expect(dust.objects[0].visible).toBeFalse();
    expect(run(dust, 5, 1, 0, false)).toBeFalse();
  });

  it("never starts when quality has already stepped down by the time the lights rise", () => {
    const dust = new Dust(false);
    dust.update(FRAME, 0, DARK, false);

    expect(run(dust, 3, 1, 0, false)).toBeFalse();
    expect(dust.objects[0].visible).toBeFalse();
  });

  it("lives as long as the scene and frees its points when that is disposed", () => {
    const scene = new Scene();
    const dust = drifting();
    scene.add(...dust.objects);
    const freed = jasmine.createSpy("freed");
    dust.objects[0].geometry.addEventListener("dispose", freed);
    dust.objects[0].material.addEventListener("dispose", freed);
    run(dust, 80, 1);
    run(dust, 5, 1, 6);

    expect(scene.children.length).toBe(1);
    expect(freed).not.toHaveBeenCalled();
    dust.dispose();
    expect(freed).toHaveBeenCalledTimes(2);
  });
});
