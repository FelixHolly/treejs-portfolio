import { Color, Texture, Vector2 } from "three";
import { hangPortrait, PORTRAIT_TONE, portraitMaterial } from "./portrait";

describe("the portrait's toning", () => {
  it("mutes the photograph without draining it, warms it, and darkens only towards its edge", () => {
    expect(PORTRAIT_TONE.saturation).toBeGreaterThan(0.4);
    expect(PORTRAIT_TONE.saturation).toBeLessThan(0.85);
    expect(PORTRAIT_TONE.warmth).toBeGreaterThan(0);
    expect(PORTRAIT_TONE.warmth).toBeLessThanOrEqual(1);
    expect(PORTRAIT_TONE.edge).toBeGreaterThan(0.2);
    expect(PORTRAIT_TONE.edge).toBeLessThan(0.7);
    expect(PORTRAIT_TONE.edgeFrom).toBeGreaterThan(0.3);
    expect(PORTRAIT_TONE.edgeFrom).toBeLessThan(1);
  });

  it("tints with a warm light: more red than green, more green than blue", () => {
    const tint = new Color(PORTRAIT_TONE.tint);

    expect(tint.r).toBeGreaterThan(tint.g);
    expect(tint.g).toBeGreaterThan(tint.b);
  });

  it("hangs no brighter than the works' pictures, so it sits in the room's light", () => {
    // The works hang under a multiplier of 0xdedede, which is this much in linear light
    const works = new Color(0xdedede).r;

    expect(PORTRAIT_TONE.level).toBeLessThanOrEqual(works + 0.01);
    expect(PORTRAIT_TONE.level).toBeGreaterThan(0.5);
  });
});

describe("portraitMaterial", () => {
  it("hands every toning value to its shader, and reads each of them there", () => {
    const material = portraitMaterial();
    const { saturation, warmth, level, edge, edgeFrom } = PORTRAIT_TONE;

    expect(material.uniforms["saturation"].value).toBe(saturation);
    expect(material.uniforms["warmth"].value).toBe(warmth);
    expect(material.uniforms["level"].value).toBe(level);
    expect(material.uniforms["edge"].value).toBe(edge);
    expect(material.uniforms["edgeFrom"].value).toBe(edgeFrom);
    expect((material.uniforms["tint"].value as Color).getHex()).toBe(PORTRAIT_TONE.tint);
    for (const name of Object.keys(material.uniforms)) {
      expect(material.vertexShader + material.fragmentShader).withContext(name).toContain(`${name};`);
    }
    material.dispose();
  });

  it("is a dark empty frame until its picture arrives", () => {
    const material = portraitMaterial();

    expect(material.uniforms["map"].value).toBeNull();
    expect(material.uniforms["hung"].value).toBe(0);
    expect((material.uniforms["unhung"].value as Color).getHex()).toBe(0x1b1b1f);
    material.dispose();
  });

  it("writes its colour for the screen, as the other pictures do", () => {
    const material = portraitMaterial();

    expect(material.fragmentShader).toContain("#include <colorspace_fragment>");
    expect(material.fragmentShader).not.toContain("tonemapping_fragment");
    material.dispose();
  });
});

describe("hangPortrait", () => {
  it("shows the picture whole when it has the frame's proportions", () => {
    const material = portraitMaterial();
    const picture = new Texture();

    hangPortrait(material, picture, 4 / 5, 1200 / 1500);

    expect(material.uniforms["map"].value).toBe(picture);
    expect(material.uniforms["hung"].value).toBe(1);
    expect((material.uniforms["crop"].value as Vector2).toArray()).toEqual([1, 1]);
    expect((material.uniforms["cropFrom"].value as Vector2).toArray()).toEqual([0, 0]);
    material.dispose();
  });

  it("crops a wider photograph evenly from both sides", () => {
    const material = portraitMaterial();

    hangPortrait(material, new Texture(), 4 / 5, 1.6);

    const crop = material.uniforms["crop"].value as Vector2;
    const from = material.uniforms["cropFrom"].value as Vector2;
    expect(crop.x).toBeCloseTo(0.5, 6);
    expect(crop.y).toBe(1);
    expect(from.x).toBeCloseTo(0.25, 6);
    expect(from.y).toBe(0);
    material.dispose();
  });

  it("crops a taller photograph from the bottom, keeping the head", () => {
    const material = portraitMaterial();

    hangPortrait(material, new Texture(), 4 / 5, 0.4);

    const crop = material.uniforms["crop"].value as Vector2;
    const from = material.uniforms["cropFrom"].value as Vector2;
    expect(crop.x).toBe(1);
    expect(crop.y).toBeCloseTo(0.5, 6);
    expect(from.y).toBeCloseTo(0.5, 6);
    material.dispose();
  });
});
