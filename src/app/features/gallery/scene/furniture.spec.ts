import { Box3, Group, Mesh, MeshBasicMaterial, Object3D, ShaderMaterial, Vector3 } from "three";
import { createPalette, Palette } from "./building";
import { DESK_TOP, lectern, letterbox, writingDesk } from "./furniture";
import { DESK, DOOR_XS, END_WALL_X, HANG_Z, LECTERN, LETTERBOX, WALL_THICKNESS } from "./layout";
import { Post } from "./post";

/** Half the envelope's width, thickness (seal included) and depth, as `exhibits.ts` builds it. */
const ENVELOPE = new Vector3(0.115, 0.007, 0.08);

function meshes(object: Object3D): Mesh[] {
  const found: Mesh[] = [];
  object.updateMatrixWorld(true);
  object.traverse((child) => {
    if ((child as Mesh).isMesh) found.push(child as Mesh);
  });
  return found;
}

function triangles(object: Object3D): number {
  return meshes(object).reduce((sum, mesh) => {
    const { index } = mesh.geometry;
    return sum + (index ? index.count : mesh.geometry.getAttribute("position").count) / 3;
  }, 0);
}

/** Light and shadow are painted on planes with the glow shader; everything else is the piece itself. */
const painted = (mesh: Mesh) => mesh.material instanceof ShaderMaterial;
function box(object: Object3D): Box3 {
  object.updateWorldMatrix(true, true);
  return new Box3().setFromObject(object, true);
}

function solidBounds(object: Object3D): Box3 {
  const bounds = new Box3();
  for (const mesh of meshes(object)) if (!painted(mesh)) bounds.union(box(mesh));
  return bounds;
}

/** Every vertex of a mesh, in the world. */
function vertices(mesh: Mesh): Vector3[] {
  const position = mesh.geometry.getAttribute("position");
  return Array.from({ length: position.count }, (_, index) => new Vector3().fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld));
}

describe("the gallery's furniture", () => {
  let palette: Palette;
  const reader = { x: LECTERN.x + 1.7, z: 0.2 };
  const writer = { x: DESK.x + 1.8, z: 0.4 };

  beforeEach(() => {
    palette = createPalette();
  });

  describe("the lectern", () => {
    let piece: Group;

    beforeEach(() => {
      piece = lectern(palette, reader);
    });

    it("stands on the floor where the layout puts it, inside Room III and clear of its walls", () => {
      const bounds = solidBounds(piece);

      expect(piece.position.x).toBe(LECTERN.x);
      expect(piece.position.z).toBe(LECTERN.z);
      expect(bounds.min.y).toBeCloseTo(0, 3);
      expect(bounds.min.x).toBeGreaterThan(DOOR_XS[2] + WALL_THICKNESS / 2 + 1);
      expect(bounds.max.x).toBeLessThan(DOOR_XS[3] - WALL_THICKNESS / 2 - 1);
      expect(bounds.min.z).toBeGreaterThan(HANG_Z + 0.05);
    });

    it("is of a height to read at, and stays under the board of names above it", () => {
      const top = solidBounds(piece).max.y;

      expect(top).toBeGreaterThan(1.1);
      expect(top).toBeLessThan(1.45);
    });

    it("turns to face the visitor standing at its stop", () => {
      const facing = new Vector3(0, 0, 1).applyQuaternion(piece.quaternion);
      const wanted = new Vector3(reader.x - LECTERN.x, 0, reader.z - LECTERN.z).normalize();

      expect(facing.distanceTo(wanted)).toBeLessThan(1e-6);
    });

    it("holds the book open on a top that slopes down towards the reader", () => {
      const pages = meshes(piece).filter((mesh) => mesh.material === palette.page);
      const towards = new Vector3(reader.x - LECTERN.x, 0, reader.z - LECTERN.z).normalize();
      const points = pages.flatMap(vertices).sort((a, b) => a.dot(towards) - b.dot(towards));
      const height = (sample: Vector3[]) => sample.reduce((sum, point) => sum + point.y, 0) / sample.length;
      const quarter = Math.floor(points.length / 4);

      expect(pages.length).toBe(2);
      expect(height(points.slice(-quarter))).toBeLessThan(height(points.slice(0, quarter)) - 0.08);
    });

    it("is made of grained walnut, with a column turned on a lathe", () => {
      const parts = meshes(piece);

      expect(parts.filter((mesh) => mesh.material === palette.walnut).length).toBeGreaterThan(6);
      expect(parts.some((mesh) => mesh.material === palette.wood)).toBeFalse();
      expect(parts.some((mesh) => mesh.geometry.type === "LatheGeometry" && mesh.material === palette.walnut)).toBeTrue();
    });
  });

  describe("the writing desk", () => {
    let piece: Group;
    const top = () => piece.getObjectByName("desk-top") as Mesh;

    beforeEach(() => {
      piece = writingDesk(palette, writer);
    });

    it("stands on the floor where the layout puts it, inside Room IV and clear of the wall behind it", () => {
      const bounds = solidBounds(piece);

      expect(piece.position.x).toBe(DESK.x);
      expect(piece.position.z).toBe(DESK.z);
      expect(bounds.min.y).toBeCloseTo(0, 3);
      expect(bounds.min.x).toBeGreaterThan(DOOR_XS[3] + WALL_THICKNESS / 2 + 1);
      expect(bounds.max.x).toBeLessThan(END_WALL_X - WALL_THICKNESS / 2 - 1);
      expect(bounds.min.z).toBeGreaterThan(HANG_Z + 0.05);
    });

    it("turns to face the visitor standing at its stop", () => {
      const facing = new Vector3(0, 0, 1).applyQuaternion(piece.quaternion);
      const wanted = new Vector3(writer.x - DESK.x, 0, writer.z - DESK.z).normalize();

      expect(facing.distanceTo(wanted)).toBeLessThan(1e-6);
    });

    it("keeps its top level, at the height and of the size the envelope's flight was set for", () => {
      top().geometry.computeBoundingBox();
      const size = (top().geometry.boundingBox as Box3).getSize(new Vector3());

      expect(box(top()).max.y).toBeCloseTo(DESK_TOP, 4);
      expect(DESK_TOP).toBeCloseTo(0.795, 6);
      expect(size.x).toBeCloseTo(1.5, 3);
      expect(size.z).toBeCloseTo(0.78, 3);
      expect(top().rotation.x).toBe(0);
      expect(top().rotation.z).toBe(0);
    });

    it("carries the envelope on its top: lying on the wood or the papers, never sunk in or hovering", () => {
      const post = new Post(palette, piece);
      const rest = piece.worldToLocal(post.envelope.position.clone());
      const underside = post.envelope.position.y - 0.003;

      expect(underside).toBeGreaterThanOrEqual(DESK_TOP);
      expect(underside).toBeLessThan(DESK_TOP + 0.004);
      expect(Math.abs(rest.x) + ENVELOPE.x).toBeLessThan(0.75);
      expect(Math.abs(rest.z) + ENVELOPE.z).toBeLessThan(0.39);
    });

    it("leaves the envelope's place and its way up clear of the lamp and the inkwell", () => {
      const standing = meshes(piece).filter((mesh) => !painted(mesh) && box(mesh).max.y > DESK_TOP + 0.03);
      const post = new Post(palette, piece);
      post.send(0, false);

      expect(standing.length).toBeGreaterThan(5);
      for (let now = 0; post.update(now); now += 25) {
        const envelope = new Box3().setFromCenterAndSize(post.envelope.position, ENVELOPE.clone().multiplyScalar(2));
        for (const mesh of standing) expect(envelope.intersectsBox(box(mesh))).withContext(`at ${now} ms`).toBeFalse();
      }
    });

    it("stands on four legs that taper to brass feet", () => {
      const legs = meshes(piece).filter((mesh) => mesh.material === palette.walnut && box(mesh).getSize(new Vector3()).y > 0.5);
      const feet = meshes(piece).filter((mesh) => mesh.material === palette.gold && box(mesh).min.y < 0.001);

      expect(legs.length).toBe(4);
      expect(feet.length).toBe(4);
      for (const leg of legs) {
        const points = vertices(leg);
        const { min, max } = box(leg);
        const spread = (near: number) => Math.max(...points.filter((point) => Math.abs(point.y - near) < 0.01).map((point) => point.distanceTo(new Vector3(leg.getWorldPosition(new Vector3()).x, point.y, leg.getWorldPosition(new Vector3()).z))));
        expect(spread(max.y)).toBeGreaterThan(spread(min.y) * 1.3);
      }
    });

    it("lights its lamp from inside the shade, with paint instead of a lamp the renderer must pay for", () => {
      const lit = meshes(piece).filter((mesh) => mesh.material instanceof MeshBasicMaterial && !mesh.material.toneMapped);
      let lights = 0;
      piece.traverse((child) => {
        if ((child as Object3D & { isLight?: boolean }).isLight) lights += 1;
      });

      expect(lit.some((mesh) => (mesh.material as MeshBasicMaterial).map !== null)).toBeTrue();
      expect(lit.length).toBeGreaterThanOrEqual(3);
      expect(lights).toBe(0);
      expect(meshes(piece).filter(painted).length).toBe(2);
    });
  });

  describe("the letterbox", () => {
    let piece: Group;
    const front = HANG_Z + LETTERBOX.depth;
    const slotY = LETTERBOX.y + LETTERBOX.slotRise;
    const slot = () =>
      meshes(piece).find((mesh) => mesh.material === palette.dark && Math.abs(box(mesh).getCenter(new Vector3()).y - slotY) < 0.002) as Mesh;
    const flap = () => piece.children.find((child) => child instanceof Group) as Group;

    beforeEach(() => {
      piece = letterbox(palette);
    });

    it("hangs on the wall over the desk, its body the size the layout gives it", () => {
      const bounds = solidBounds(piece);
      const body = meshes(piece).find((mesh) => {
        const size = box(mesh).getSize(new Vector3());
        return Math.abs(size.x - LETTERBOX.width) < 1e-3 && Math.abs(size.y - LETTERBOX.height) < 1e-3;
      });

      expect(bounds.min.z).toBeCloseTo(HANG_Z, 4);
      expect((bounds.min.x + bounds.max.x) / 2).toBeCloseTo(LETTERBOX.x, 3);
      expect(body).toBeDefined();
      expect(box(body as Mesh).max.z).toBeCloseTo(front, 4);
      expect(box(body as Mesh).getCenter(new Vector3()).y).toBeCloseTo(LETTERBOX.y, 4);
    });

    it("has a peaked top that stays under the height the layout allows over the desk", () => {
      const bounds = solidBounds(piece);

      expect(bounds.max.y).toBeGreaterThan(LETTERBOX.y + LETTERBOX.height / 2 + 0.08);
      expect(bounds.max.y).toBeLessThan(2.6);
      expect(bounds.min.y).toBeGreaterThan(1.3);
    });

    it("opens its slot where the envelope is aimed, wide and tall enough to take it", () => {
      const opening = box(slot());
      const size = opening.getSize(new Vector3());

      expect(opening.getCenter(new Vector3()).x).toBeCloseTo(LETTERBOX.x, 4);
      expect(opening.getCenter(new Vector3()).y).toBeCloseTo(slotY, 4);
      expect(opening.max.z).toBeGreaterThan(front);
      expect(size.x).toBeGreaterThan(ENVELOPE.x * 2 + 0.1);
      expect(size.y).toBeGreaterThan(ENVELOPE.y * 2 + 0.01);
    });

    it("holds its flap open above the slot, hinged on the box and standing out from it", () => {
      const awning = box(flap());

      expect(flap().rotation.x).toBeGreaterThan(0.2);
      expect(awning.min.y).toBeGreaterThan(slotY + ENVELOPE.y + 0.004);
      expect(awning.max.y).toBeLessThan(LETTERBOX.y + LETTERBOX.height / 2);
      expect(awning.max.z).toBeGreaterThan(front + 0.05);
      expect(awning.min.z).toBeLessThan(front + 0.02);
    });

    it("takes the envelope from the desk into the slot, under the flap and without touching it", () => {
      const desk = writingDesk(palette, writer);
      const post = new Post(palette, desk);
      const opening = box(slot());
      const awning = box(flap());
      let entered = false;
      post.send(0, false);

      for (let now = 0; post.update(now); now += 10) {
        const { x, y, z } = post.envelope.position;
        const envelope = new Box3().setFromCenterAndSize(post.envelope.position, ENVELOPE.clone().multiplyScalar(2));
        expect(envelope.intersectsBox(awning)).withContext(`at ${now} ms`).toBeFalse();
        if (z - ENVELOPE.z < front) {
          entered = true;
          expect(x - ENVELOPE.x).toBeGreaterThan(opening.min.x);
          expect(x + ENVELOPE.x).toBeLessThan(opening.max.x);
          expect(y).toBeGreaterThan(opening.min.y);
          expect(y).toBeLessThan(opening.max.y);
        }
      }
      expect(entered).toBeTrue();
      expect(post.envelope.visible).toBeFalse();
    });

    it("keeps the band its lettering is engraved on flat and bare", () => {
      const band = new Box3(
        new Vector3(LETTERBOX.x - 0.25, LETTERBOX.y - 0.04, front - 0.01),
        new Vector3(LETTERBOX.x + 0.25, LETTERBOX.y + 0.08, front + 0.5),
      );

      for (const mesh of meshes(piece)) {
        const bounds = box(mesh);
        if (bounds.intersectsBox(band)) expect(bounds.max.z).toBeLessThanOrEqual(front + 1e-6);
      }
    });

    it("has a framed door with a lock under the lettering", () => {
      const below = meshes(piece).filter((mesh) => {
        const bounds = box(mesh);
        return bounds.max.y < LETTERBOX.y - 0.04 && bounds.min.y > LETTERBOX.y - LETTERBOX.height / 2 && bounds.max.z > front + 0.001;
      });

      expect(below.filter((mesh) => mesh.material === palette.gold).length).toBeGreaterThanOrEqual(5);
      expect(below.filter((mesh) => mesh.material === palette.dark).length).toBeGreaterThanOrEqual(2);
    });
  });

  it("is built within its budget of triangles, every part a mesh the scene's clean-up will find", () => {
    const pieces = { lectern: lectern(palette, reader), desk: writingDesk(palette, writer), letterbox: letterbox(palette) };
    const counts = { lectern: triangles(pieces.lectern), desk: triangles(pieces.desk), letterbox: triangles(pieces.letterbox) };

    expect(counts.lectern).toBeLessThan(2000);
    expect(counts.desk).toBeLessThan(3000);
    expect(counts.letterbox).toBeLessThan(1800);
    expect(counts.lectern + counts.desk + counts.letterbox).toBeLessThan(6000);
    for (const piece of Object.values(pieces)) {
      piece.traverse((child) => expect((child as Mesh).isMesh || child instanceof Group).toBeTrue());
    }
  });
});
