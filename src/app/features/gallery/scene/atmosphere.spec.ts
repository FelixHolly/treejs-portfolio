import { AdditiveBlending, Box3, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { glow, PointedLight, RotundaAtmosphere } from "./atmosphere";
import { DOOR_XS, HANG_Z, ROTUNDA } from "./layout";
import { PieceTarget } from "./picking";

describe("glow", () => {
  it("adds light on top of the scene without hiding what is behind it", () => {
    const material = glow("pool", 0.5);

    expect(material.blending).toBe(AdditiveBlending);
    expect(material.transparent).toBeTrue();
    expect(material.depthWrite).toBeFalse();
    expect(material.uniforms["strength"].value).toBe(0.5);
  });

  it("starts dark unless given a strength", () => {
    expect(glow("pool").uniforms["strength"].value).toBe(0);
  });

  it("works out its falloff in the shader instead of reading it from an image", () => {
    const material = glow("pool");

    expect(Object.keys(material.uniforms).sort()).toEqual(["rising", "strength", "tint"]);
    expect(material.fragmentShader).toContain("colorspace_fragment");
  });

  it("tells the shader whether the light fades from its middle or up from the floor", () => {
    expect(glow("pool").uniforms["rising"].value).toBe(0);
    expect(glow("rising").uniforms["rising"].value).toBe(1);
  });

  it("gives every glow its own strength", () => {
    const first = glow("pool", 0.2);
    const second = glow("pool", 0.9);

    first.uniforms["strength"].value = 0;

    expect(second.uniforms["strength"].value).toBe(0.9);
  });
});

describe("RotundaAtmosphere", () => {
  type Glow = Mesh<PlaneGeometry, ShaderMaterial>;
  let atmosphere: RotundaAtmosphere;

  const strengths = () => atmosphere.objects.map((object) => (object as Glow).material.uniforms["strength"].value as number);

  beforeEach(() => {
    atmosphere = new RotundaAtmosphere();
  });

  it("is a halo, a lit doorway and a spill of light on the floor", () => {
    expect(atmosphere.objects.length).toBe(3);
    expect(strengths()).toEqual([0, 0, 0]);
  });

  it("lights all three at the entrance once the lights are up", () => {
    atmosphere.update(0, 1);

    for (const strength of strengths()) expect(strength).toBeGreaterThan(0.1);
  });

  it("raises the halo with the statue's lights and leaves the way on lit throughout", () => {
    atmosphere.update(0, 0.3);
    const [dimHalo, dimDoor, dimSpill] = strengths();
    atmosphere.update(0, 1);
    const [halo, door, spill] = strengths();

    expect(dimHalo).toBeCloseTo(halo * 0.3, 6);
    expect(dimDoor).toBe(door);
    expect(dimSpill).toBe(spill);
  });

  it("puts the halo out before the visitor walks through where it hangs", () => {
    atmosphere.update(0.2, 1);
    expect(strengths()[0]).toBeGreaterThan(0);

    atmosphere.update(0.45, 1);
    expect(strengths()[0]).toBe(0);
    expect(strengths()[1]).toBeGreaterThan(0);
  });

  it("is dark from Room I onwards", () => {
    for (const progress of [0.6, 1, 3.5, 7]) {
      atmosphere.update(progress, 1);
      expect(strengths()).withContext(`progress ${progress}`).toEqual([0, 0, 0]);
    }
  });

  it("hangs the halo behind the statue, inside the hall's curved wall", () => {
    const halo = atmosphere.objects[0] as Glow;
    const halfWidth = halo.geometry.parameters.width / 2;

    expect(halo.position.z).toBe(0);
    expect(halo.position.x).toBeGreaterThan(ROTUNDA.x + 2);
    expect(Math.hypot(halo.position.x - ROTUNDA.x, halfWidth)).toBeLessThan(ROTUNDA.radius);
  });

  it("stands the doorway's glow in the first door", () => {
    expect(atmosphere.objects[1].position.x).toBe(DOOR_XS[0]);
  });
});

describe("PointedLight", () => {
  type Glow = Mesh<PlaneGeometry, ShaderMaterial>;
  const wallPiece = (stop: number, x: number): PieceTarget => ({
    stop,
    box: new Box3(new Vector3(x - 0.5, 1, HANG_Z), new Vector3(x + 0.5, 2, HANG_Z + 0.1)),
  });
  const statue: PieceTarget = { stop: 0, round: true, box: new Box3(new Vector3(-3.5, 1, -1), new Vector3(-1.5, 3.7, 1)) };
  let light: PointedLight;
  const pool = (index: number) => light.objects[index] as Glow;
  const strength = (index: number) => pool(index).material.uniforms["strength"].value as number;

  beforeEach(() => {
    light = new PointedLight([statue, wallPiece(4, 24), wallPiece(4, 27), wallPiece(5, 35)]);
  });

  it("is one pool of painted light for each stop, however many shapes the stop has", () => {
    expect(light.objects.length).toBe(3);
    for (const object of light.objects) expect((object as Glow).material.blending).toBe(AdditiveBlending);
  });

  it("draws nothing until a piece is pointed at", () => {
    expect(light.objects.every((object) => !object.visible)).toBeTrue();
    expect(light.update(0.016)).toBeFalse();
    expect(light.objects.every((object) => !object.visible)).toBeTrue();
  });

  it("hangs a wall piece's pool just in front of it, spread a little past everything the stop shows", () => {
    const { width, height } = pool(1).geometry.parameters;

    expect(pool(1).position.x).toBeCloseTo(25.5, 6);
    expect(pool(1).position.y).toBeCloseTo(1.5, 6);
    expect(pool(1).position.z).toBeGreaterThan(HANG_Z + 0.1);
    expect(pool(1).position.z).toBeLessThan(HANG_Z + 0.2);
    expect(width).toBeGreaterThan(4);
    expect(width).toBeLessThan(4 * 1.6);
    expect(height).toBeGreaterThan(1);
  });

  it("stands the statue's pool between it and the arriving visitor, facing them", () => {
    expect(pool(0).position.x).toBeLessThan(-3.5);
    expect(pool(0).position.z).toBe(0);
    expect(Math.abs(pool(0).rotation.y)).toBeCloseTo(Math.PI / 2, 6);
  });

  it("brightens only the pointed piece, gently, in about 150 milliseconds", () => {
    light.point(4);

    expect(light.update(0.075)).toBeTrue();
    expect(pool(1).visible).toBeTrue();
    const halfway = strength(1);
    expect(light.update(0.075)).toBeFalse();

    expect(halfway).toBeGreaterThan(0);
    expect(strength(1)).toBeGreaterThan(halfway);
    expect(strength(1)).toBeLessThanOrEqual(0.2);
    expect(pool(0).visible).toBeFalse();
    expect(pool(2).visible).toBeFalse();
  });

  it("dims it again when the pointer leaves, and stops drawing it", () => {
    light.point(4);
    light.update(0.2);
    light.point(null);

    expect(light.update(0.075)).toBeTrue();
    expect(pool(1).visible).toBeTrue();
    expect(light.update(0.1)).toBeFalse();
    expect(pool(1).visible).toBeFalse();
    expect(strength(1)).toBe(0);
  });

  it("ignores a stop it has no pool for", () => {
    light.point(9);

    expect(() => light.update(0.2)).not.toThrow();
    expect(light.objects.every((object) => !object.visible)).toBeTrue();
  });
});
