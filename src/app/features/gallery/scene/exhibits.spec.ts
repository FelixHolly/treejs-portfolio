import { AdditiveBlending, Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { createPalette, Palette } from "./building";
import { framedPicture, pictureLight } from "./exhibits";
import { FrameSlot, HANG_Z, pieceSlots, portraitSlot } from "./layout";

const COMMISSION = pieceSlots([
  { slug: "a", kind: "commission", images: [1, 2, 3].map((n) => ({ src: `a${n}`, portrait: false })) },
  { slug: "b", kind: "study", images: [{ src: "b1", portrait: true }] },
]);
const [MAIN, COMPANION] = COMMISSION[0].frames;
const STUDY = COMMISSION[1].frames[0];
const PORTRAIT = portraitSlot("portrait.webp");

function meshes(object: Object3D): Mesh[] {
  const found: Mesh[] = [];
  object.updateMatrixWorld(true);
  object.traverse((child) => {
    if ((child as Mesh).isMesh) found.push(child as Mesh);
  });
  return found;
}

function box(object: Object3D): Box3 {
  object.updateWorldMatrix(true, true);
  return new Box3().setFromObject(object, true);
}

describe("framedPicture", () => {
  let palette: Palette;
  const plain = new MeshLambertMaterial();
  const bars = (slot: FrameSlot) =>
    framedPicture(slot, palette, plain)
      .group.children.slice(0, 4)
      .map((bar) => ((bar as Mesh).geometry as BoxGeometry).parameters);

  beforeEach(() => {
    palette = createPalette();
  });

  it("frames a large gilded picture, a small one and a study, each with its own mouldings", () => {
    const sizes = (slot: FrameSlot, bar: number) => [bars(slot)[bar].width, bars(slot)[bar].height, bars(slot)[bar].depth];
    const expected: [FrameSlot, number, number[]][] = [
      [MAIN, 0, [2.82, 0.09, 0.07]],
      [MAIN, 2, [0.09, 1.74, 0.07]],
      [COMPANION, 0, [1.42, 0.06, 0.07]],
      [STUDY, 0, [0.93, 0.035, 0.07]],
    ];

    for (const [slot, bar, size] of expected) {
      sizes(slot, bar).forEach((value, axis) => expect(value).withContext(`${slot.src} bar ${bar}`).toBeCloseTo(size[axis], 6));
    }
  });

  it("hangs it at its slot, a mat behind the picture, with no lamp of its own", () => {
    const { group, picture } = framedPicture(MAIN, palette, plain);
    const mat = group.children[4] as Mesh<PlaneGeometry>;

    expect(group.position.x).toBe(MAIN.x);
    expect(group.position.y).toBe(MAIN.y);
    expect(group.position.z).toBeGreaterThan(HANG_Z);
    expect(group.children.length).toBe(6);
    expect(mat.material).toBe(palette.bone);
    expect(mat.position.z).toBeLessThan(picture.position.z);
    expect(picture.geometry.parameters.width).toBe(MAIN.width);
  });
});

describe("pictureLight", () => {
  let palette: Palette;
  const plain = new MeshLambertMaterial();

  /** A frame with its lamp on, as the scene hangs it. */
  function lit(slot: FrameSlot): { frame: Group; light: Group; picture: Mesh; mat: Mesh; frameBox: Box3 } {
    const { group, picture } = framedPicture(slot, palette, plain);
    const frameBox = box(group);
    const light = pictureLight(slot, palette);
    group.add(light);
    group.updateMatrixWorld(true);
    return { frame: group, light, picture, mat: group.children[4] as Mesh, frameBox };
  }

  const wash = (light: Group) => light.getObjectByName("wash") as Mesh<PlaneGeometry, ShaderMaterial>;
  const brass = (light: Group) => meshes(light).filter((mesh) => mesh.material === palette.gold);
  /** The hood is the longest brass part. */
  const hood = (light: Group) =>
    brass(light).reduce((longest, mesh) => (box(mesh).getSize(new Vector3()).x > box(longest).getSize(new Vector3()).x ? mesh : longest));

  beforeEach(() => {
    palette = createPalette();
  });

  it("arches over the frame: its hood above the top moulding, out in front of the picture and centred on it", () => {
    for (const slot of [MAIN, COMPANION, PORTRAIT]) {
      const { light, frameBox } = lit(slot);
      const over = box(hood(light));

      expect(over.min.y).withContext(slot.src).toBeGreaterThan(frameBox.max.y + 0.05);
      expect(over.max.y).withContext(slot.src).toBeLessThan(frameBox.max.y + 0.2);
      expect(over.min.z).withContext(slot.src).toBeGreaterThan(frameBox.max.z + 0.05);
      expect(over.getCenter(new Vector3()).x).withContext(slot.src).toBeCloseTo(slot.x, 4);
      expect(Math.min(...brass(light).map((mesh) => box(mesh).min.y))).withContext(slot.src).toBeLessThan(frameBox.max.y);
    }
  });

  it("is slim, and sized to its frame: under half as long, and never longer than a real one is made", () => {
    const length = (slot: FrameSlot) => box(hood(lit(slot).light)).getSize(new Vector3());
    const width = (slot: FrameSlot) => lit(slot).frameBox.getSize(new Vector3()).x;

    for (const slot of [MAIN, COMPANION, PORTRAIT]) {
      expect(length(slot).x).withContext(slot.src).toBeLessThan(width(slot) / 2);
      expect(length(slot).x).withContext(slot.src).toBeGreaterThan(width(slot) / 3);
      expect(length(slot).y).withContext(slot.src).toBeLessThan(0.08);
    }
    expect(length(MAIN).x).toBeGreaterThan(length(PORTRAIT).x * 1.8);
    expect(length(MAIN).x).toBeLessThanOrEqual(1.25);
  });

  it("carries a long hood on two arms and a short one on one", () => {
    const arms = (slot: FrameSlot) => meshes(lit(slot).light).filter((mesh) => mesh.geometry.type === "TubeGeometry").length;

    expect(arms(MAIN)).toBe(2);
    expect(arms(COMPANION)).toBe(1);
    expect(arms(PORTRAIT)).toBe(1);
  });

  it("glows under its hood without tone mapping, so it reads as the brightest thing by the frame", () => {
    const glowing = meshes(lit(PORTRAIT).light).filter((mesh) => mesh.material instanceof MeshBasicMaterial);

    expect(glowing.length).toBe(2);
    for (const mesh of glowing) expect((mesh.material as MeshBasicMaterial).toneMapped).toBeFalse();
  });

  it("paints its light on the mat alone: a glow as large as the mat, lying between the mat and the picture", () => {
    for (const slot of [MAIN, PORTRAIT]) {
      const { light, mat, picture } = lit(slot);
      const painted = wash(light);
      const depth = (mesh: Mesh) => mesh.getWorldPosition(new Vector3()).z;

      expect(painted.material.blending).toBe(AdditiveBlending);
      expect(painted.material.depthWrite).toBeFalse();
      expect(painted.geometry.parameters).toEqual(jasmine.objectContaining((mat.geometry as PlaneGeometry).parameters));
      expect(depth(painted)).withContext(slot.src).toBeGreaterThan(depth(mat) + 0.002);
      expect(depth(painted)).withContext(slot.src).toBeLessThan(depth(picture) - 0.002);
    }
  });

  it("makes that light strongest under the lamp, gone before the foot of the mat and faint at its top corners", () => {
    const uv = wash(lit(MAIN).light).geometry.getAttribute("uv");
    const position = wash(lit(MAIN).light).geometry.getAttribute("position");
    /** The glow shader's own falloff: 1 at the middle of the unit square, 0 at half a unit from it. */
    const level = (index: number) => Math.pow(1 - Math.min(Math.hypot(uv.getX(index) - 0.5, uv.getY(index) - 0.5) * 2, 1), 2);
    const corners = Array.from({ length: position.count }, (_, index) => ({ top: position.getY(index) > 0, level: level(index) }));
    const topMiddle = Math.pow(1 - Math.abs((uv.getY(0) + uv.getY(1)) / 2 - 0.5) * 2, 2);

    expect(topMiddle).toBeCloseTo(1, 6);
    for (const corner of corners.filter((entry) => entry.top)) {
      expect(corner.level).toBeGreaterThan(0.05);
      expect(corner.level).toBeLessThan(0.35);
    }
    for (const corner of corners.filter((entry) => !entry.top)) expect(corner.level).toBe(0);
  });

  it("adds no real light and stays a small thing to draw", () => {
    const { light } = lit(MAIN);
    let lights = 0;
    light.traverse((child) => {
      if ((child as Object3D & { isLight?: boolean }).isLight) lights += 1;
    });
    const triangles = meshes(light).reduce((sum, mesh) => {
      const { index } = mesh.geometry;
      return sum + (index ? index.count : mesh.geometry.getAttribute("position").count) / 3;
    }, 0);

    expect(lights).toBe(0);
    expect(triangles).toBeLessThan(500);
  });
});
