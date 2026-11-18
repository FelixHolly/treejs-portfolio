import { AdditiveBlending, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { glow, RotundaAtmosphere } from "./atmosphere";
import { DOOR_XS, ROTUNDA } from "./layout";

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
    for (const progress of [0.8, 1, 3.5, 7]) {
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
