import { AdditiveBlending, Vector3 } from "three";
import { motePresence, MOTES, Motes, PaintedLight, SHAFT } from "./hero-atmosphere";

const FRAME = 0.1;

describe("motePresence", () => {
  /** The presence after `seconds` more of a visitor already idle for `idle` seconds, in frames. */
  function after(presence: number, idle: number, seconds: number): number {
    for (let passed = 0; passed < seconds - 1e-9; passed += FRAME) presence = motePresence(presence, (idle += FRAME), FRAME);
    return presence;
  }

  it("wakes over a second and a half", () => {
    expect(after(0, 0, 0.7)).toBeCloseTo(0.47, 1);
    expect(after(0, 0, 1.6)).toBe(1);
  });

  it("stays whole for a minute without the visitor doing anything", () => {
    expect(MOTES.idleAfter).toBe(60);
    expect(after(1, 0, 59.8)).toBe(1);
  });

  it("then settles over about four seconds, and stays settled", () => {
    expect(after(1, 60, 2)).toBeCloseTo(0.5, 1);
    expect(after(1, 60, 4.2)).toBe(0);
    expect(after(0, 80, 5)).toBe(0);
  });
});

describe("Motes", () => {
  let motes: Motes;

  const uniform = (name: string) => motes.points.material.uniforms[name].value as number;
  /** Lets `seconds` pass in frames; true if the dust still needed frames at the end. */
  function run(seconds: number, level = 1): boolean {
    let drifting = false;
    for (let passed = 0; passed < seconds - 1e-9; passed += FRAME) drifting = motes.update(FRAME, level);
    return drifting;
  }

  beforeEach(() => (motes = new Motes()));

  it("is light added to the picture, never something that hides the statue", () => {
    const { material } = motes.points;

    expect(material.blending).toBe(AdditiveBlending);
    expect(material.depthWrite).toBeFalse();
    expect(motes.points.geometry.getAttribute("mote").count).toBe(MOTES.motes);
  });

  it("is not there before the first frame, then comes up gently", () => {
    expect(motes.points.visible).toBeFalse();

    expect(run(0.3)).toBeTrue();
    expect(motes.points.visible).toBeTrue();
    expect(uniform("level")).toBeCloseTo(0.2, 6);

    run(1.5);
    expect(uniform("level")).toBe(1);
  });

  it("is as bright as the statue is lit", () => {
    run(2);

    motes.update(FRAME, 0.4);

    expect(uniform("level")).toBeCloseTo(0.4, 6);
  });

  it("is not drawn on a statue gone dark, yet keeps asking for frames so that it is there when the light returns", () => {
    run(2);

    expect(motes.update(FRAME, 0)).toBeTrue();
    expect(motes.points.visible).toBeFalse();
  });

  it("settles after a minute of stillness and asks for no more frames", () => {
    expect(run(MOTES.idleAfter - 1)).toBeTrue();

    expect(run(MOTES.settles + 2)).toBeFalse();
    expect(motes.points.visible).toBeFalse();
    expect(uniform("level")).toBe(0);
  });

  it("stays awake for as long as the visitor keeps stirring, and wakes when they stir again", () => {
    for (let minute = 0; minute < 3; minute++) {
      run(50);
      motes.stir();
    }
    expect(run(1)).toBeTrue();
    expect(uniform("level")).toBe(1);

    run(MOTES.idleAfter + MOTES.settles + 1);
    expect(motes.points.visible).toBeFalse();

    motes.stir();
    expect(run(0.2)).toBeTrue();
    expect(motes.points.visible).toBeTrue();
  });

  it("sinks through a column that ends above the plinth and begins above the statue's head", () => {
    const top = motes.points.material.uniforms["top"].value as Vector3;
    const fall = motes.points.material.uniforms["fall"].value as Vector3;

    expect(top.y).toBeGreaterThan(3.7);
    expect(top.y + fall.y).toBeGreaterThan(1);
    expect(fall.y).toBeLessThan(0);
  });

  it("keeps below the ceiling the page gives it, measured down the picture", () => {
    expect(uniform("ceiling")).toBe(1);

    motes.setCeiling(0.25);
    expect(uniform("ceiling")).toBe(0.5);

    motes.setCeiling(0.5);
    expect(uniform("ceiling")).toBe(0);
  });
});

describe("PaintedLight", () => {
  it("paints a glow and a shaft, both dark until the statue is lit", () => {
    const light = new PaintedLight();

    expect(light.objects.length).toBe(2);
    for (const { material } of light.objects) {
      expect(material.blending).toBe(AdditiveBlending);
      expect(material.depthWrite).toBeFalse();
      expect(material.uniforms["strength"].value).toBe(0);
    }
  });

  it("follows the statue's light up and down", () => {
    const light = new PaintedLight();
    const strengths = () => light.objects.map(({ material }) => material.uniforms["strength"].value as number);

    light.setLevel(1);
    const [halo, shaft] = strengths();
    expect(halo).toBeGreaterThan(shaft);
    expect(shaft).toBe(SHAFT.strength);

    light.setLevel(0.5);
    expect(strengths()).toEqual([halo / 2, shaft / 2]);

    light.setLevel(0);
    expect(strengths()).toEqual([0, 0]);
  });

  it("hangs both behind the statue, facing the visitor, the shaft slanting in from their upper left", () => {
    const [halo, shaft] = new PaintedLight().objects;
    const facing = (object: typeof halo) => new Vector3(0, 0, 1).applyQuaternion(object.quaternion);
    const along = new Vector3(0, 1, 0).applyQuaternion(shaft.quaternion);

    expect(halo.position.x).toBeGreaterThan(1);
    expect(shaft.position.x).toBeGreaterThan(1);
    expect(facing(halo).x).toBeCloseTo(-1, 6);
    expect(facing(shaft).x).toBeCloseTo(-1, 6);
    expect(along.y).toBeGreaterThan(0.5);
    expect(along.z).toBeLessThan(-0.5);
  });
});
